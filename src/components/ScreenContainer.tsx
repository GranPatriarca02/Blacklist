import React, { type ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '@/theme';

interface ScreenContainerProps {
  children: ReactNode;
  style?: ViewStyle;
  /**
   * Etiqueta accesible que describe la pantalla completa.
   * El lector de pantalla la anuncia al entrar.
   */
  accessibilityLabel?: string;
}

/**
 * Wrapper estándar para todas las pantallas de Blacklist.
 *
 * Beneficios:
 *  - Aplica fondo dark consistente (no se ve "flash" blanco al navegar).
 *  - Respeta safe-area en iPhone con notch / Android edge-to-edge.
 *  - Marca la región como `accessibilityRole="none"` por defecto para que
 *    los hijos lleven sus propios roles semánticos.
 */
export function ScreenContainer({
  children,
  style,
  accessibilityLabel,
}: ScreenContainerProps) {
  return (
    <SafeAreaView
      style={styles.safe}
      edges={['top', 'left', 'right']}
      accessibilityLabel={accessibilityLabel}
    >
      <View style={[styles.content, style]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
});
