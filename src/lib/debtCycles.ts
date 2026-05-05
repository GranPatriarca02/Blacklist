import type { Debt, Frequency, NewDebtInput, PaymentRecord } from '@/types/debt';
import { createId } from './id';

/**
 * Lógica pura de ciclos de deuda. Sin React, sin storage. Fácil de testear.
 */

/**
 * Calcula la próxima fecha de reactivación para una rutinaria,
 * respetando el día configurado por el usuario.
 *
 * - Mensual: avanza al mismo `reactivateDay` del mes siguiente.
 *   Si el mes no tiene ese día (ej: 31 feb), usa el último día del mes.
 * - Semanal: avanza 7 días desde el inicio del ciclo, luego ajusta
 *   al `reactivateWeekDay` configurado (por defecto lunes).
 */
export function addFrequency(
  iso: string,
  frequency: Frequency,
  reactivateDay?: number,
  reactivateWeekDay?: number,
): string {
  const d = new Date(iso);
  if (frequency === 'weekly') {
    // Avanza 7 días base
    d.setDate(d.getDate() + 7);
    // Si hay un día de semana configurado, ajustar
    const targetDay = reactivateWeekDay ?? 1; // 1 = lunes por defecto
    const currentDay = d.getDay();
    const diff = targetDay - currentDay;
    // Ajustar al día de la semana más cercano hacia adelante (o mismo día)
    if (diff !== 0) {
      // Si diff es negativo, significa que el día ya pasó esta semana, ajustar
      d.setDate(d.getDate() + ((diff + 7) % 7 || 7));
      // Pero si eso nos pone demasiado lejos (>7 días del original+7),
      // volver atrás 7 días
      const originalPlus7 = new Date(iso);
      originalPlus7.setDate(originalPlus7.getDate() + 7);
      if (d.getTime() - originalPlus7.getTime() > 7 * 86_400_000) {
        d.setDate(d.getDate() - 7);
      }
    }
  } else {
    // Mensual
    const targetDay = reactivateDay ?? 1; // 1 por defecto
    const nextMonth = d.getMonth() + 1;
    const nextYear = d.getFullYear() + (nextMonth > 11 ? 1 : 0);
    const actualMonth = nextMonth % 12;
    // Obtener último día del mes destino
    const lastDay = new Date(nextYear, actualMonth + 1, 0).getDate();
    const safeDay = Math.min(targetDay, lastDay);
    d.setFullYear(nextYear, actualMonth, safeDay);
  }
  return d.toISOString();
}

/** Próxima fecha de reapertura para una rutinaria pagada. */
export function nextDueDate(debt: Debt): string | null {
  if (debt.kind !== 'routine' || !debt.frequency) return null;
  return addFrequency(
    debt.cycleStartedAt,
    debt.frequency,
    debt.reactivateDay,
    debt.reactivateWeekDay,
  );
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
    reactivateDay: input.reactivateDay,
    reactivateWeekDay: input.reactivateWeekDay,
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
    reactivateDay: d.reactivateDay,
    reactivateWeekDay: d.reactivateWeekDay,
    payments: Array.isArray(d.payments) ? d.payments : [],
  } as Debt;
}

/** Marca el ciclo actual como pagado (pago completo). */
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

/** Registra un pago parcial: resta la cantidad de la deuda sin cerrar el ciclo. */
export function makePartialPayment(debt: Debt, amountCents: number, now: Date = new Date()): Debt {
  if (debt.cyclePaidAt) return debt; // ya pagada
  if (amountCents <= 0) return debt;

  const payment: PaymentRecord = {
    id: createId(),
    paidAt: now.toISOString(),
    amount: amountCents,
    cycleStartedAt: debt.cycleStartedAt,
    isPartial: true,
  };

  const newAmount = Math.max(0, debt.amount - amountCents);

  // Si el pago parcial cubre toda la deuda, marcar como pagada
  if (newAmount === 0) {
    return {
      ...debt,
      amount: 0,
      cyclePaidAt: now.toISOString(),
      payments: [...debt.payments, payment],
    };
  }

  return {
    ...debt,
    amount: newAmount,
    payments: [...debt.payments, payment],
  };
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
    const next = addFrequency(cycleStart, debt.frequency, debt.reactivateDay, debt.reactivateWeekDay);
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
