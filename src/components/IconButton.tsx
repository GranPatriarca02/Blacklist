import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { a11y, colors, radius } from '@/theme';

interface IconButtonProps {
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
  /** Glyph o emoji decorativo. */
  glyph?: string;
  /** Alternativa a glyph: cualquier nodo (ej. <Text>). */
  children?: ReactNode;
  variant?: 'default' | 'transparent';
}

/**
 * Botón circular para iconos en headers / barras de acciones.
 * Touch target 44x44 garantizado.
 */
export function IconButton({
  onPress,
  accessibilityLabel,
  accessibilityHint,
  glyph,
  children,
  variant = 'default',
}: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={a11y.hitSlop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        styles.btn,
        variant === 'default' && styles.bgDefault,
        pressed && { opacity: 0.6 },
      ]}
    >
      {children ?? (
        <Text
          style={styles.glyph}
          accessibilityElementsHidden
          importantForAccessibility="no"
          allowFontScaling={false}
        >
          {glyph}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bgDefault: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  glyph: {
    fontSize: 20,
    color: colors.textPrimary,
  },
});
