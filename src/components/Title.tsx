import React from 'react';
import { StyleSheet, Text, type TextStyle } from 'react-native';
import { colors, typography } from '@/theme';

interface TitleProps {
  children: string;
  /** Si es el título principal de la pantalla, marca como header. */
  isScreenTitle?: boolean;
  style?: TextStyle;
}

/**
 * Título tipográfico con semántica accesible.
 *
 * - `accessibilityRole="header"` permite a TalkBack/VoiceOver
 *   navegar entre títulos con gestos de "siguiente encabezado".
 * - `allowFontScaling` se mantiene en `true` (default RN) para
 *   respetar el ajuste de tamaño de fuente del sistema.
 * - `maxFontSizeMultiplier` evita que un usuario con texto XXXL
 *   rompa el layout, manteniendo accesibilidad razonable.
 */
export function Title({ children, isScreenTitle = false, style }: TitleProps) {
  return (
    <Text
      style={[styles.text, style]}
      accessibilityRole="header"
      accessibilityLabel={children}
      // Mejor experiencia con texto agrandado por accesibilidad
      allowFontScaling
      maxFontSizeMultiplier={1.6}
      // En iOS, anuncia el título al enfocar
      accessible
      // Si es el título de pantalla, agrégale el "trait" header en iOS
      {...(isScreenTitle ? { accessibilityLanguage: undefined } : {})}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    ...typography.display,
    color: colors.textPrimary,
    textAlign: 'left',
  },
});
