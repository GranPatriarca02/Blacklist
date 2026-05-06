/**
 * Modelo de dominio: Blacklist.
 *
 * Decisiones clave:
 *  - Dinero en *centavos* (entero) para evitar errores de coma flotante.
 *  - Fechas como ISO-8601 string (serializable, ordenable lexicográficamente).
 *  - "Cycle" es la unidad básica de una deuda rutinaria.
 *  - `payments[]` nunca se borra; auditoría completa.
 *  - Notificaciones: cada deuda tiene su propio toggle, hora, y un id Expo
 *    que usamos para cancelar al desactivar.
 *  - Grupales: una sola deuda con N miembros, cada uno con su propio
 *    `amount` y `paidAt`. La deuda se cierra cuando todos los miembros pagan.
 */

export type DebtKind = 'unique' | 'routine' | 'group';

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
  /** Para grupales: id del miembro que pagó. */
  memberId?: string;
  /** Para grupales: nombre del miembro al momento del pago. */
  memberName?: string;
}

/** Miembro de una deuda grupal. */
export interface GroupMember {
  id: string;
  /** Nombre visible. Para "Yo" usamos literalmente "Yo". */
  name: string;
  /** Cantidad que debe esta persona en centavos. */
  amount: number;
  /** ISO cuando esta persona pagó. null = pendiente. */
  paidAt: string | null;
  /** true si es la fila "Yo" (el usuario incluido en la división). */
  isMe: boolean;
}

export interface Debt {
  id: string;
  kind: DebtKind;
  /**
   * Para `unique`/`routine`: nombre de la persona que te debe.
   * Para `group`: título de la deuda (ej. "Cena", "Renta").
   */
  debtorName: string;
  /** Cantidad TOTAL en centavos (para grupales = suma de members). */
  amount: number;
  currency: string;
  description?: string;
  frequency?: Frequency;

  createdAt: string;
  cycleStartedAt: string;
  cyclePaidAt: string | null;
  payments: PaymentRecord[];

  // ─── Detalles editables ───────────────────────────────────────────────
  /** Solo para unique. ISO date. */
  dueDate?: string;

  // ─── Rutinaria: día de reactivación ───────────────────────────────────
  reactivateDay?: number;
  reactivateWeekDay?: WeekDay;

  // ─── Grupal ───────────────────────────────────────────────────────────
  /** Lista de deudores. Solo presente si kind === 'group'. */
  members?: GroupMember[];
  /**
   * Si true, el usuario personalizó las cantidades por miembro.
   * Si false, la división es equitativa (auto-recalculada al cambiar miembros).
   */
  customSplit?: boolean;

  // ─── Notificaciones ───────────────────────────────────────────────────
  notificationsEnabled: boolean;
  notifyHour: number;
  notifyMinute: number;
  notificationId?: string;
}

/** Payload mínimo para crear una deuda nueva. */
export interface NewDebtInput {
  kind: DebtKind;
  /** Nombre del deudor (unique/routine) o título (group). */
  debtorName: string;
  /** Total en centavos. Para group puede ser 0 si los amounts vienen ya repartidos. */
  amount: number;
  currency: string;
  description?: string;
  frequency?: Frequency;
  reactivateDay?: number;
  reactivateWeekDay?: WeekDay;

  /** Para group: nombres de los deudores. "Yo" entra como `isMe: true`. */
  members?: { name: string; isMe: boolean }[];
}

/** Payload para editar una deuda existente. Solo campos editables. */
export interface DebtEditInput {
  debtorName?: string;
  amount?: number;       // centavos
  description?: string;
  dueDate?: string | null;
  notifyHour?: number;
  notifyMinute?: number;
  notificationsEnabled?: boolean;
  reactivateDay?: number;
  reactivateWeekDay?: WeekDay;

  /** Para group: reemplaza la lista completa de miembros. */
  members?: GroupMember[];
  /** Para group: si la división es personalizada o equitativa. */
  customSplit?: boolean;
}
