/**
 * Mensajes para la notificación del total cuando NO hay deudas pendientes.
 *
 * Se rota uno distinto cada día calendario usando una semilla determinista
 * (día del año), así el usuario no recibe el mismo mensaje muchos días
 * seguidos pero tampoco depende de azar puro entre clientes.
 *
 * Estilo: inspiradores, graciosos y algunos relacionados con la Blacklist.
 */

export const DEBT_FREE_MESSAGES: ReadonlyArray<string> = [
  'Tu blacklist está vacía y tu conciencia tranquila. ¡Hoy es un buen día! 🎉',
  'Nadie te debe nada. ¿Será que eres demasiado generoso o demasiado temido? 😎',
  'La vida se disfruta más cuando tu blacklist está limpia 🧘‍♂️',
  'Cero deudas pendientes. Eres básicamente un banco con vacaciones 🏖️',
  'Sin morosos a la vista. Hoy puedes dormir como un bebé 😴',
  'Tu lista negra está más vacía que nevera de estudiante. ¡Pero eso es bueno! 🥳',
  'Nadie en la blacklist… por ahora. Disfruta la paz antes de la tormenta 💀',
];

/** Día del año (1..366) para una fecha local. */
function dayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - start.getTime();
  return Math.floor(diff / 86_400_000);
}

/** Devuelve el mensaje del día (estable dentro de las 24h). */
export function pickDebtFreeMessage(now: Date = new Date()): string {
  const idx = dayOfYear(now) % DEBT_FREE_MESSAGES.length;
  return DEBT_FREE_MESSAGES[idx];
}
