import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';
import type { Debt, DebtEditInput, NewDebtInput } from '@/types/debt';
import {
  createDebt,
  makePartialPayment,
  markPaid,
  migrateDebt,
  reconcileAll,
} from '@/lib/debtCycles';
import { loadDebts, saveDebts } from '@/lib/storage';
import {
  cancelScheduled,
  syncDebtNotification,
} from '@/lib/notifications';

/**
 * Estado global de deudas con sincronización automática de notificaciones.
 *
 * Patrón:
 *  1. Reducer 100% sincrónico con efectos secundarios fuera (en el provider).
 *  2. Tras cada acción, re-sincronizamos la notificación de la deuda afectada.
 *  3. Re-sincronización masiva al hidratar (la app pudo estar cerrada días).
 */

interface State {
  loaded: boolean;
  debts: Debt[];
}

type Action =
  | { type: 'HYDRATE'; debts: Debt[] }
  | { type: 'ADD'; debt: Debt }
  | { type: 'REPLACE'; debt: Debt }
  | { type: 'REMOVE'; id: string }
  | { type: 'RECONCILE' }
  | { type: 'SET_ALL'; debts: Debt[] };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'HYDRATE':
      return { loaded: true, debts: reconcileAll(action.debts.map(migrateDebt)) };
    case 'ADD':
      return { ...state, debts: [action.debt, ...state.debts] };
    case 'REPLACE':
      return {
        ...state,
        debts: state.debts.map(d => (d.id === action.debt.id ? action.debt : d)),
      };
    case 'REMOVE':
      return { ...state, debts: state.debts.filter(d => d.id !== action.id) };
    case 'RECONCILE':
      return { ...state, debts: reconcileAll(state.debts) };
    case 'SET_ALL':
      return { ...state, debts: action.debts };
    default:
      return state;
  }
}

interface DebtsContextValue {
  loaded: boolean;
  debts: Debt[];
  addDebt: (input: NewDebtInput) => Debt;
  payDebt: (id: string, amount?: number) => void;
  partialPayDebt: (id: string, amountCents: number) => void;
  removeDebt: (id: string) => void;
  /** Edita campos de detalle de una deuda existente. */
  editDebt: (id: string, patch: DebtEditInput) => void;
  /** Cambia la divisa de TODAS las deudas (y sus notificaciones). */
  changeAllCurrency: (newCurrency: string) => void;
}

const DebtsContext = createContext<DebtsContextValue | null>(null);

export function DebtsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { loaded: false, debts: [] });
  const isFirst = useRef(true);

  // Hidratar desde AsyncStorage al montar
  useEffect(() => {
    let on = true;
    loadDebts().then(debts => {
      if (on) dispatch({ type: 'HYDRATE', debts });
    });
    return () => { on = false; };
  }, []);

  // Persistir cada cambio (excepto la hidratación inicial)
  useEffect(() => {
    if (!state.loaded) return;
    if (isFirst.current) {
      isFirst.current = false;
      // Al hidratar, re-sincroniza notificaciones de cada deuda activa
      // (los ids guardados pueden estar obsoletos tras un reinstalo).
      state.debts.forEach(d => {
        if (d.notificationsEnabled) {
          void syncDebtNotification(d).then(newId => {
            if (newId && newId !== d.notificationId) {
              dispatch({ type: 'REPLACE', debt: { ...d, notificationId: newId } });
            }
          });
        }
      });
      return;
    }
    saveDebts(state.debts);
  }, [state.loaded, state.debts]);

  const addDebt = useCallback((input: NewDebtInput): Debt => {
    const debt = createDebt(input);
    dispatch({ type: 'ADD', debt });
    return debt;
  }, []);

  const payDebt = useCallback(
    (id: string, amount?: number) => {
      const target = state.debts.find(d => d.id === id);
      if (!target) return;
      const updated = markPaid(target, amount);
      dispatch({ type: 'REPLACE', debt: updated });
      // Re-sync: si quedó pagada, la notificación se silencia hasta reapertura
      void syncDebtNotification(updated).then(newId => {
        if (newId !== updated.notificationId) {
          dispatch({ type: 'REPLACE', debt: { ...updated, notificationId: newId ?? undefined } });
        }
      });
    },
    [state.debts],
  );

  const partialPayDebt = useCallback(
    (id: string, amountCents: number) => {
      const target = state.debts.find(d => d.id === id);
      if (!target) return;
      const updated = makePartialPayment(target, amountCents);
      dispatch({ type: 'REPLACE', debt: updated });
      // Re-sync notification (amount changed, or debt fully paid)
      void syncDebtNotification(updated).then(newId => {
        if (newId !== updated.notificationId) {
          dispatch({ type: 'REPLACE', debt: { ...updated, notificationId: newId ?? undefined } });
        }
      });
    },
    [state.debts],
  );

  const removeDebt = useCallback(
    (id: string) => {
      const target = state.debts.find(d => d.id === id);
      if (target?.notificationId) {
        void cancelScheduled(target.notificationId);
      }
      dispatch({ type: 'REMOVE', id });
    },
    [state.debts],
  );

  const editDebt = useCallback(
    (id: string, patch: DebtEditInput) => {
      const target = state.debts.find(d => d.id === id);
      if (!target) return;

      // Aplicar patch (con normalización de dueDate null -> undefined para limpiar)
      const merged: Debt = {
        ...target,
        ...(patch.debtorName !== undefined ? { debtorName: patch.debtorName.trim() } : {}),
        ...(patch.amount !== undefined ? { amount: patch.amount } : {}),
        ...(patch.description !== undefined ? { description: patch.description.trim() || undefined } : {}),
        ...(patch.dueDate !== undefined ? { dueDate: patch.dueDate ?? undefined } : {}),
        ...(patch.notifyHour !== undefined ? { notifyHour: patch.notifyHour } : {}),
        ...(patch.notifyMinute !== undefined ? { notifyMinute: patch.notifyMinute } : {}),
        ...(patch.notificationsEnabled !== undefined ? { notificationsEnabled: patch.notificationsEnabled } : {}),
        ...(patch.reactivateDay !== undefined ? { reactivateDay: patch.reactivateDay } : {}),
        ...(patch.reactivateWeekDay !== undefined ? { reactivateWeekDay: patch.reactivateWeekDay } : {}),
      };

      dispatch({ type: 'REPLACE', debt: merged });

      // Re-programar la notif si cambió cualquier campo de notif
      const notifFieldsTouched =
        patch.notificationsEnabled !== undefined ||
        patch.notifyHour !== undefined ||
        patch.notifyMinute !== undefined ||
        patch.debtorName !== undefined ||
        patch.amount !== undefined;
      if (notifFieldsTouched) {
        void syncDebtNotification(merged).then(newId => {
          dispatch({ type: 'REPLACE', debt: { ...merged, notificationId: newId ?? undefined } });
        });
      }
    },
    [state.debts],
  );

  const changeAllCurrency = useCallback(
    (newCurrency: string) => {
      const updated = state.debts.map(d => ({ ...d, currency: newCurrency }));
      dispatch({ type: 'SET_ALL', debts: updated });
      // Re-sync all notifications with new currency
      updated.forEach(d => {
        if (d.notificationsEnabled) {
          void syncDebtNotification(d).then(newId => {
            if (newId !== d.notificationId) {
              dispatch({ type: 'REPLACE', debt: { ...d, notificationId: newId ?? undefined } });
            }
          });
        }
      });
    },
    [state.debts],
  );

  const value = useMemo<DebtsContextValue>(
    () => ({
      loaded: state.loaded,
      debts: state.debts,
      addDebt,
      payDebt,
      partialPayDebt,
      removeDebt,
      editDebt,
      changeAllCurrency,
    }),
    [state.loaded, state.debts, addDebt, payDebt, partialPayDebt, removeDebt, editDebt, changeAllCurrency],
  );

  return <DebtsContext.Provider value={value}>{children}</DebtsContext.Provider>;
}

export function useDebts(): DebtsContextValue {
  const ctx = useContext(DebtsContext);
  if (!ctx) throw new Error('useDebts() debe usarse dentro de <DebtsProvider>');
  return ctx;
}
