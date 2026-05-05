/**
 * Modelo de dominio: Blacklist.
 *
 * Decisiones clave:
 *  - Dinero en *centavos* (entero) para evitar errores de coma flotante.
 *  - Fechas como ISO-8601 string (serializable, ordenable lexicográficamente).
 *  - "Cycle" es la unidad básica de una deuda rutinaria: un periodo entre
 *    creación / último pago y el siguiente vencimiento. Para deudas únicas
 *    solo existe un único ciclo (createdAt -> paidAt o pendiente).
 *  - El historial de pagos se mantiene en `payments[]` y nunca se borra,
 *    así puedes auditar cuántas veces te ha pagado alguien una rutinaria.
 */

export type DebtKind = 'unique' | 'routine';

export type Frequency = 'weekly' | 'monthly';

export interface PaymentRecord {
  id: string;
  /** Fecha en la que se marcó el pago (ISO 8601). */
  paidAt: string;
  /** Cantidad pagada en centavos (puede diferir de la deuda original). */
  amount: number;
  /** A qué ciclo correspondió este pago. */
  cycleStartedAt: string;
}

export interface Debt {
  id: string;
  kind: DebtKind;
  /** Quién te debe. */
  debtorName: string;
  /** Cantidad en centavos (12550 = $125.50). */
  amount: number;
  /** ISO 4217 (USD, MXN, COP, EUR…). */
  currency: string;
  /** Concepto / descripción libre, opcional. */
  description?: string;
  /** Solo para `kind: 'routine'`. */
  frequency?: Frequency;

  /** ISO de creación (no cambia jamás). */
  createdAt: string;

  /** Inicio del ciclo actual. Para únicas == createdAt. Para rutinarias avanza tras cada pago. */
  cycleStartedAt: string;

  /**
   * Si está pagado el ciclo actual:
   *  - `unique`: la deuda queda cerrada (estado terminal).
   *  - `routine`: queda en pausa; cuando el próximo vencimiento llega,
   *    el reconciliador la reabre automáticamente.
   * `null` => contador corriendo.
   */
  cyclePaidAt: string | null;

  /** Historial de todos los pagos (más reciente al final). */
  payments: PaymentRecord[];
}

/** Payload mínimo para crear una deuda nueva. */
export interface NewDebtInput {
  kind: DebtKind;
  debtorName: string;
  amount: number;        // centavos
  currency: string;
  description?: string;
  frequency?: Frequency; // requerido si kind === 'routine'
}
