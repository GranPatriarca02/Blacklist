/**
 * Escala de espaciado en múltiplos de 4 (sistema 4-pt).
 * Mantener consistencia evita "magic numbers" en estilos.
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

/**
 * Tamaño mínimo accesible para targets táctiles.
 * Apple HIG: 44pt — Material: 48dp. Usamos 48 para cubrir ambos.
 */
export const a11y = {
  minTouchTarget: 48,
  hitSlop: { top: 8, bottom: 8, left: 8, right: 8 },
} as const;

export const radius = {
  sm: 6,
  md: 12,
  lg: 20,
  pill: 999,
} as const;
