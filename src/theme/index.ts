/**
 * Barrel del sistema de diseño.
 * Importar siempre desde "@/theme" para mantener un único punto de verdad.
 *
 *   import { colors, spacing, typography } from '@/theme';
 */
export { colors } from './colors';
export type { ColorToken } from './colors';

export { spacing, radius, a11y } from './spacing';

export { typography } from './typography';
export type { TypographyToken } from './typography';

export const theme = {
  // Re-exportado como objeto único por si en el futuro
  // se conecta a un ThemeProvider (styled-components, restyle, etc).
  dark: true,
} as const;
