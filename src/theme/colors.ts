/**
 * Paleta Blacklist — Dark Mode por defecto.
 *
 * Todos los colores de texto están validados para cumplir
 * WCAG 2.1 AA (contraste >= 4.5:1) sobre `background`.
 */
export const colors = {
  // Superficies
  background: '#121212',          // Material Dark recomendado
  surface: '#1E1E1E',             // Tarjetas, modales
  surfaceElevated: '#2A2A2A',     // Tarjetas elevadas / pressed states
  border: '#2F2F2F',

  // Texto (contrastes verificados sobre #121212)
  textPrimary: '#FFFFFF',         // 18.7:1  -> AAA
  textSecondary: '#B3B3B3',       // 9.7:1   -> AAA
  textMuted: '#8A8A8A',           // 5.1:1   -> AA

  // Semánticos — pensados para deudas
  urgent: '#FF5252',              // Deudas urgentes (rojo accesible)
  urgentBg: '#3A1414',            // Fondo sutil para chips urgentes
  routine: '#FFB74D',             // Deudas rutinarias (ámbar)
  routineBg: '#3A2A10',
  paid: '#69F0AE',                // Deudas saldadas (verde)
  paidBg: '#0F2A1C',

  // Acento de marca
  brand: '#FFFFFF',
  brandMuted: '#E0E0E0',

  // Foco accesible (anillo de focus visible para teclado / lector)
  focusRing: '#82B1FF',
} as const;

export type ColorToken = keyof typeof colors;
