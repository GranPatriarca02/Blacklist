import type { Debt, Frequency, NewDebtInput, PaymentRecord } from '@/types/debt';
import { createId } from './id';

/**
 * Lógica pura de ciclos de deuda. Sin React, sin storage. Fácil de testear.
 */

/** Suma una frecuencia a una fecha ISO y devuelve la nueva fecha ISO. */
export function addFrequency(iso: string, frequency: Frequency): string {
  const d = new Date(iso);
  if (frequency === 'weekly') {
    d.setDate(d.getDate() + 7);
  } else {
    d.setMonth(d.getMonth() + 1);
  }
  return d.toISOString();
}

/** Próxima fecha de reapertura para una rutinaria pagada. */
export function nextDueDate(debt: Debt): string | null {
  if (debt.kind !== 'routine' || !debt.frequency) return null;
  return addFrequency(debt.cycleStartedAt, debt.frequency);
}

/** Crea una deuda nueva con todos los campos derivados ya rellenos. */
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
    // Defaults razonables: notificaciones apagadas, hora 9:00
    notificationsEnabled: false,
    notifyHour: 9,
    notifyMinute: 0,
  };
}

/** Migra deudas viejas que no tenían los nuevos campos. Idempotente. */
export function migrateDebt(d: any): Debt {
  return {
    ...d,
    notificationsEnabled: typeof d.notificationsEnabled === 'boolean' ? d.notificationsEnabled : false,
    notifyHour: typeof d.notifyHour === 'number' ? d.notifyHour : 9,
    notifyMinute: typeof d.notifyMinute === 'number' ? d.notifyMinute : 0,
    notificationId: d.notificationId,
    dueDate: d.dueDate,
  } as Debt;
}

/** Marca el ciclo actual como pagado. */
export function markPaid(debt: Debt, paidAmount?: number, now: Date = new Date()): Debt {
  if (debt.cyclePaidAt) return debt;

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

/** Reconciliación: si una rutinaria está pagada y su próxima fecha ya pasó, avanza. */
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

  if (cycleStart === debt.cycleStartedAt && paid === debt.cyclePaidAt) return debt;
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

/**
 * Suma de pagos por mes en los últimos N meses.
 * Devuelve array ordenado del más antiguo al más reciente.
 * Cada elemento: { yearMonth: 'YYYY-MM', total, count }
 */
export interface MonthlyBucket {
  yearMonth: string;  // 'YYYY-MM'
  label: string;      // ej. 'may 2026'
  total: number;      // centavos
  count: number;
}

export function paymentsByMonth(debts: Debt[], months = 6, now: Date = new Date()): MonthlyBucket[] {
  const buckets = new Map<string, MonthlyBucket>();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('es', { month: 'short', year: 'numeric' });
    buckets.set(ym, { yearMonth: ym, label, total: 0, count: 0 });
  }
  for (const debt of debts) {
    for (const p of debt.payments) {
      const d = new Date(p.paidAt);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const b = buckets.get(ym);
      if (b) {
        b.total += p.amount;
        b.count += 1;
      }
    }
  }
  return Array.from(buckets.values());
}
