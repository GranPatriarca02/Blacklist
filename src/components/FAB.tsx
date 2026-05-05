import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { a11y, colors, radius, typography } from '@/theme';

interface FABProps {
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
  /** Carácter o glyph a mostrar (ej "+"). */
  glyph?: string;
}

/**
 * Floating Action Button.
 *
 * - 64x64 (excede el mínimo de 48 para mejor target en pulgar).
 * - Sombra sutil con elevation Android + shadow iOS.
 * - Texto del glyph ignorado por accesibilidad (lo decimos en label).
 */
export function FAB({ onPress, accessibilityLabel, accessibilityHint, glyph = '+' }: FABProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={a11y.hitSlop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [styles.fab, pressed && { transform: [{ scale: 0.96 }] }]}
    >
      <Text
        style={styles.glyph}
        accessibilityElementsHidden
        importantForAccessibility="no"
        allowFontScaling={false}
      >
        {glyph}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  glyph: {
    ...typography.title,
    color: '#000',
    fontWeight: '900',
    lineHeight: 36,
  },
});
