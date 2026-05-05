/**
 * Modelo de dominio: Blacklist.
 *
 * Decisiones clave:
 *  - Dinero en *centavos* (entero) para evitar errores de coma flotante.
 *  - Fechas como ISO-8601 string (serializable, ordenable lexicográficamente).
 *  - "Cycle" es la unidad básica de una deuda rutinaria: un periodo entre
 *    creación / último pago y el siguiente vencimiento.
 *  - `payments[]` nunca se borra; auditoría completa.
 *  - Notificaciones: cada deuda tiene su propio toggle, hora, y un id Expo
 *    que usamos para cancelar al desactivar.
 */

export type DebtKind = 'unique' | 'routine';

export type Frequency = 'weekly' | 'monthly';

/** 0 = domingo, 1 = lunes, …, 6 = sábado (estándar JS Date.getDay()). */
export type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface PaymentRecord {
  id: string;
  /** Fecha en la que se marcó el pago (ISO 8601). */
  paidAt: string;
  /** Cantidad pagada en centavos. */
  amount: number;
  /** A qué ciclo correspondió este pago. */
  cycleStartedAt: string;
  /** true si fue un pago parcial (no cerró el ciclo). */
  isPartial?: boolean;
}

export interface Debt {
  id: string;
  kind: DebtKind;
  debtorName: string;
  amount: number;        // centavos
  currency: string;      // ISO 4217
  description?: string;
  frequency?: Frequency; // solo para routine

  createdAt: string;
  cycleStartedAt: string;
  cyclePaidAt: string | null;
  payments: PaymentRecord[];

  // ─── Detalles editables (paso 2 de la vida de la deuda) ───────────────
  /** Fecha prevista de pago (opcional). ISO date. Solo informativa. */
  dueDate?: string;

  // ─── Rutinaria: día de reactivación ────────────────────────────────────
  /** Día del mes (1-31) para reactivar deudas mensuales. Default: 1. */
  reactivateDay?: number;
  /** Día de la semana (0-6, 0=dom, 1=lun) para reactivar deudas semanales. Default: 1 (lunes). */
  reactivateWeekDay?: WeekDay;

  // ─── Notificaciones ───────────────────────────────────────────────────
  /** Si el usuario activó la campana en esta deuda. */
  notificationsEnabled: boolean;
  /** Hora local diaria de la notificación (0-23). */
  notifyHour: number;
  /** Minuto local diario (0-59). */
  notifyMinute: number;
  /** Id Expo de la notificación programada (si está activa). */
  notificationId?: string;
}

/** Payload mínimo para crear una deuda nueva (rapidez). */
export interface NewDebtInput {
  kind: DebtKind;
  debtorName: string;
  amount: number;
  currency: string;
  description?: string;
  frequency?: Frequency;
  reactivateDay?: number;
  reactivateWeekDay?: WeekDay;
}

/** Payload para editar una deuda existente. Solo campos editables. */
export interface DebtEditInput {
  debtorName?: string;
  amount?: number;       // centavos
  description?: string;
  dueDate?: string | null;     // null = limpiar
  notifyHour?: number;
  notifyMinute?: number;
  notificationsEnabled?: boolean;
  reactivateDay?: number;
  reactivateWeekDay?: WeekDay;
}
