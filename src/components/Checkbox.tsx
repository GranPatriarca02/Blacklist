import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { a11y, colors, radius, spacing, typography } from '@/theme';

interface CheckboxProps {
  checked: boolean;
  onToggle: () => void;
  label: string;
  /** Texto auxiliar. */
  hint?: string;
  disabled?: boolean;
}

/**
 * Checkbox accesible con touch target >= 48dp.
 *
 * - `accessibilityRole="checkbox"` con `checked` en accessibilityState.
 * - El label se incluye en accessibilityLabel del Pressable padre, no como
 *   elemento separado, para que el toque en cualquier parte funcione.
 */
export function Checkbox({ checked, onToggle, label, hint, disabled }: CheckboxProps) {
  return (
    <Pressable
      onPress={disabled ? undefined : onToggle}
      hitSlop={a11y.hitSlop}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={label}
      accessibilityHint={hint}
      style={({ pressed }) => [
        styles.row,
        disabled && styles.disabled,
        pressed && !disabled && { opacity: 0.7 },
      ]}
    >
      <View style={[styles.box, checked && styles.boxChecked]}>
        {checked ? (
          <Text
            style={styles.check}
            accessibilityElementsHidden
            importantForAccessibility="no"
            allowFontScaling={false}
          >
            ✓
          </Text>
        ) : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: a11y.minTouchTarget,
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  disabled: { opacity: 0.4 },
  box: {
    width: 26,
    height: 26,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.textSecondary,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: {
    backgroundColor: colors.paid,
    borderColor: colors.paid,
  },
  check: {
    color: '#000',
    fontWeight: '900',
    fontSize: 18,
    lineHeight: 20,
  },
  label: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
});
