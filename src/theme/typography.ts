import type { TextStyle } from 'react-native';

/**
 * Tipografía con jerarquía clara.
 *
 * Accesibilidad:
 *  - Tamaño base 16 (mínimo recomendado para body).
 *  - `lineHeight` >= 1.4× del fontSize para mejor legibilidad.
 *  - Soportamos `allowFontScaling` por defecto en RN, así que estos
 *    son tamaños "base" que el usuario puede agrandar desde su SO.
 */
export const typography = {
  display: {
    fontSize: 40,
    lineHeight: 48,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '700',
  },
  heading: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600',
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
} satisfies Record<string, TextStyle>;

export type TypographyToken = keyof typeof typography;
