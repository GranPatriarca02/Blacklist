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
import type { Debt, NewDebtInput } from '@/types/debt';
import { createDebt, markPaid, reconcileAll } from '@/lib/debtCycles';
import { loadDebts, saveDebts } from '@/lib/storage';

/**
 * Estado global de deudas.
 *
 * Patrón: Context + useReducer (sin librerías externas).
 * - `loaded` evita parpadeo al arrancar (no renderizamos lista vacía
 *    si todavía no terminamos de leer AsyncStorage).
 * - Tras cada acción persistimos a disco con un debounce mínimo.
 * - `reconcileAll` corre al cargar y al añadir/pagar para mantener
 *   las rutinarias siempre en su estado lógico correcto.
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
  | { type: 'RECONCILE' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'HYDRATE':
      return { loaded: true, debts: reconcileAll(action.debts) };
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
    default:
      return state;
  }
}

interface DebtsContextValue {
  loaded: boolean;
  debts: Debt[];
  addDebt: (input: NewDebtInput) => Debt;
  payDebt: (id: string, amount?: number) => void;
  removeDebt: (id: string) => void;
}

const DebtsContext = createContext<DebtsContextValue | null>(null);

export function DebtsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { loaded: false, debts: [] });
  const isFirstLoad = useRef(true);

  // Hidratar desde AsyncStorage al montar
  useEffect(() => {
    let mounted = true;
    loadDebts().then(debts => {
      if (mounted) dispatch({ type: 'HYDRATE', debts });
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Persistir cada vez que cambien las deudas (excepto en la hidratación inicial)
  useEffect(() => {
    if (!state.loaded) return;
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
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
    },
    [state.debts],
  );

  const removeDebt = useCallback((id: string) => {
    dispatch({ type: 'REMOVE', id });
  }, []);

  const value = useMemo<DebtsContextValue>(
    () => ({
      loaded: state.loaded,
      debts: state.debts,
      addDebt,
      payDebt,
      removeDebt,
    }),
    [state.loaded, state.debts, addDebt, payDebt, removeDebt],
  );

  return <DebtsContext.Provider value={value}>{children}</DebtsContext.Provider>;
}

export function useDebts(): DebtsContextValue {
  const ctx = useContext(DebtsContext);
  if (!ctx) {
    throw new Error('useDebts() debe usarse dentro de <DebtsProvider>');
  }
  return ctx;
}
