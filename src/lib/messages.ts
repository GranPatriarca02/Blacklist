/**
 * Mensajes para la notificación del total cuando NO hay deudas pendientes.
 *
 * Se rota uno distinto cada día calendario usando una semilla determinista
 * (día del año), así el usuario no recibe el mismo mensaje muchos días
 * seguidos pero tampoco depende de azar puro entre clientes.
 */

export const DEBT_FREE_MESSAGES: ReadonlyArray<string> = [
  'Hoy nadie te debe nada. Disfruta el día sin presiones 🌞',
  'Cuentas claras, mente tranquila. Aprovecha tu día ☕',
  'Cero saldo pendiente. ¡Eso sí es libertad!',
  'Tu lista negra está vacía. Disfruta sin preocupaciones',
  'Nada que cobrar hoy. Buen día para ti ✌️',
  'Tus finanzas están al día. Que tengas un gran día',
  'Hoy no hay nadie en la lista negra. Tómatelo con calma',
  'Sin deudas, sin estrés. A disfrutar 🌿',
  'Bolsillo en paz, día feliz. Aprovecha la calma',
  'Día limpio: nadie te debe ni un centavo. ¡Vamos!',
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
