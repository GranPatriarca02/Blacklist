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

export interface PaymentRecord {
  id: string;
  /** Fecha en la que se marcó el pago (ISO 8601). */
  paidAt: string;
  /** Cantidad pagada en centavos. */
  amount: number;
  /** A qué ciclo correspondió este pago. */
  cycleStartedAt: string;
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
}

/** Payload para editar una deuda existente. Solo campos editables. */
export interface DebtEditInput {
  description?: string;
  dueDate?: string | null;     // null = limpiar
  notifyHour?: number;
  notifyMinute?: number;
  notificationsEnabled?: boolean;
}
