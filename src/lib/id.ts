/**
 * Generador de IDs sin dependencias externas.
 *
 * Para una app local sin sincronización servidor, un timestamp + entropía
 * aleatoria es más que suficiente: 0 colisiones esperables a escala humana.
 *
 * Si en el futuro agregamos sync (Firebase, Supabase, etc.) cambiar a UUIDv4
 * o ULID importando solo desde aquí.
 */
export function createId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `${ts}-${rand}`;
}
