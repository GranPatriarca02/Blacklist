/**
 * Formateo de moneda y duraciones para la capa de presentación.
 * Mantener esta lógica fuera de los componentes facilita testear y cambiar i18n.
 */

/** Convierte centavos a string formateado con símbolo (ej: 12550 -> "$125.50"). */
export function formatCurrency(amountCents: number, currency = 'USD', locale = 'es'): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amountCents / 100);
  } catch {
    // Fallback si Intl no soporta esa moneda en el dispositivo
    return `${(amountCents / 100).toFixed(2)} ${currency}`;
  }
}

/**
 * Formatea milisegundos transcurridos como string compacto humano.
 * Ej: 1234ms -> "1s", 90s -> "1m 30s", 3700s -> "1h 1m", 90000s -> "1d 1h"
 *
 * Diseñado para mostrar el "contador vivo" de cuánto tiempo lleva una deuda.
 */
export function formatElapsed(ms: number): string {
  if (ms < 0) ms = 0;
  const sec = Math.floor(ms / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);

  if (day > 0) return `${day}d ${hr % 24}h`;
  if (hr > 0) return `${hr}h ${min % 60}m`;
  if (min > 0) return `${min}m ${sec % 60}s`;
  return `${sec}s`;
}

/**
 * Versión accesible: cadena leída por VoiceOver/TalkBack.
 * "2 días, 3 horas" en vez de "2d 3h" (que el lector deletrearía).
 */
export function formatElapsedAccessible(ms: number): string {
  if (ms < 0) ms = 0;
  const sec = Math.floor(ms / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);

  if (day > 0) return `${day} ${day === 1 ? 'día' : 'días'} y ${hr % 24} horas`;
  if (hr > 0) return `${hr} ${hr === 1 ? 'hora' : 'horas'} y ${min % 60} minutos`;
  if (min > 0) return `${min} ${min === 1 ? 'minuto' : 'minutos'} y ${sec % 60} segundos`;
  return `${sec} segundos`;
}

/** Fecha legible corta: "5 may 2026, 14:32". */
export function formatDateTime(iso: string, locale = 'es'): string {
  const d = new Date(iso);
  return d.toLocaleString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Solo fecha: "5 may 2026". */
export function formatDate(iso: string, locale = 'es'): string {
  return new Date(iso).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
