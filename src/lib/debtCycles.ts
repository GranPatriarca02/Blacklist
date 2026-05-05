import type { Debt, Frequency, NewDebtInput, PaymentRecord } from '@/types/debt';
import { createId } from './id';

/**
 * Lógica pura de ciclos de deuda. Sin React, sin storage. Fácil de testear.
 *
 * Reglas:
 *  1. `markPaid` siempre escribe un PaymentRecord, nunca pierde historial.
 *  2. `reconcile` reabre rutinarias cuyo próximo vencimiento ya pasó —
 *     útil al abrir la app después de varios días sin usarla.
 *  3. `nextDueDate` calcula cuándo se reabre la siguiente vez.
 */

/** Suma una frecuencia a una fecha ISO y devuelve la nueva fecha ISO. */
export function addFrequency(iso: string, frequency: Frequency): string {
  const d = new Date(iso);
  if (frequency === 'weekly') {
    d.setDate(d.getDate() + 7);
  } else {
    // Sumar 1 mes preservando día (con manejo automático del overflow JS).
    d.setMonth(d.getMonth() + 1);
  }
  return d.toISOString();
}

/** Próxima fecha de reapertura para una rutinaria pagada. */
export function nextDueDate(debt: Debt): string | null {
  if (debt.kind !== 'routine' || !debt.frequency) return null;
  return addFrequency(debt.cycleStartedAt, debt.frequency);
}

/**
 * Crea una deuda nueva con todos los campos derivados ya rellenos.
 */
export function createDebt(input: NewDebtInput, now: Date = new Date()): Debt {
  const iso = now.toISOString();
  if (input.kind === 'routine' && !input.frequency) {
    throw new Error('Routine debts require a frequency');
  }
  return {
    id: createId(),
    kind: input.kind,
    debtorName: input.debtorName.trim(),
    amount: input.amount,
    currency: input.currency,
    description: input.description?.trim() || undefined,
    frequency: input.kind === 'routine' ? input.frequency : undefined,
    createdAt: iso,
    cycleStartedAt: iso,
    cyclePaidAt: null,
    payments: [],
  };
}

/**
 * Marca el ciclo actual como pagado. Para rutinarias, también dispara
 * la reconciliación por si el siguiente vencimiento ya pasó.
 */
export function markPaid(debt: Debt, paidAmount?: number, now: Date = new Date()): Debt {
  if (debt.cyclePaidAt) return debt; // ya pagado

  const payment: PaymentRecord = {
    id: createId(),
    paidAt: now.toISOString(),
    amount: paidAmount ?? debt.amount,
    cycleStartedAt: debt.cycleStartedAt,
  };

  const updated: Debt = {
    ...debt,
    cyclePaidAt: now.toISOString(),
    payments: [...debt.payments, payment],
  };

  return reconcile(updated, now);
}

/**
 * Reconciliación: si una rutinaria está pagada y su próxima fecha ya pasó,
 * avanza el ciclo automáticamente. Itera por seguridad si la app estuvo
 * cerrada mucho tiempo (limite duro de 1000 iteraciones).
 *
 * Devuelve la deuda en su estado "actual real". Idempotente.
 */
export function reconcile(debt: Debt, now: Date = new Date()): Debt {
  if (debt.kind !== 'routine' || !debt.frequency || !debt.cyclePaidAt) {
    return debt;
  }

  let cycleStart = debt.cycleStartedAt;
  let paid: string | null = debt.cyclePaidAt;
  const nowMs = now.getTime();
  let safety = 0;

  while (paid && safety++ < 1000) {
    const next = addFrequency(cycleStart, debt.frequency);
    if (nowMs < new Date(next).getTime()) break;
    cycleStart = next;
    paid = null;
  }

  if (cycleStart === debt.cycleStartedAt && paid === debt.cyclePaidAt) {
    return debt; // sin cambios
  }
  return { ...debt, cycleStartedAt: cycleStart, cyclePaidAt: paid };
}

/** Aplica reconcile() a una colección. */
export function reconcileAll(debts: Debt[], now: Date = new Date()): Debt[] {
  let changed = false;
  const next = debts.map(d => {
    const r = reconcile(d, now);
    if (r !== d) changed = true;
    return r;
  });
  return changed ? next : debts;
}

/** Total adeudado (suma de ciclos pendientes). */
export function totalOwed(debts: Debt[]): number {
  return debts.reduce((acc, d) => (d.cyclePaidAt ? acc : acc + d.amount), 0);
}
