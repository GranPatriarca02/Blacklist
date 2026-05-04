/**
 * Modelo de dominio: una deuda registrada en Blacklist.
 *
 * Diseño:
 *  - `id` es un UUID/string opaco generado al crear (no se reutiliza).
 *  - `amount` se guarda en la unidad mínima (centavos) para evitar
 *    errores de coma flotante. La capa de UI lo formatea.
 *  - `priority` separa deudas urgentes de rutinarias, requisito del producto.
 *  - Fechas como ISO-8601 string para serialización trivial.
 */
export type DebtPriority = 'urgent' | 'routine';

export type DebtStatus = 'pending' | 'paid';

export interface Debt {
  id: string;
  debtorName: string;          // Quién te debe
  amount: number;              // Centavos (ej: 12550 = $125.50)
  currency: string;            // ISO 4217 (ej: 'USD', 'MXN', 'COP')
  priority: DebtPriority;
  status: DebtStatus;
  note?: string;               // Concepto / contexto opcional
  createdAt: string;           // ISO date
  dueDate?: string;            // ISO date (opcional)
  paidAt?: string;             // ISO date (opcional)
}

/**
 * Payload para crear una deuda nueva (sin campos derivados).
 */
export type NewDebtInput = Omit<Debt, 'id' | 'status' | 'createdAt' | 'paidAt'>;
