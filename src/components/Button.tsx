import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { a11y, colors, radius, spacing, typography } from '@/theme';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  label: string;
  variant?: Variant;
  loading?: boolean;
  /** Acción accesible: descripción de qué hace el botón al activarse. */
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
}

/**
 * Botón accesible:
 *  - Touch target garantizado >= 48dp (a11y.minTouchTarget).
 *  - `accessibilityRole="button"`, `accessibilityState` con disabled/busy.
 *  - Feedback visual al presionar (`opacity` + cambio de fondo).
 *  - `hitSlop` extra para usuarios con motricidad reducida.
 */
export function Button({
  label,
  variant = 'primary',
  loading,
  disabled,
  accessibilityHint,
  style,
  fullWidth,
  leftIcon,
  ...rest
}: ButtonProps) {
  const isInactive = disabled || loading;
  const palette = VARIANT[variant];

  return (
    <Pressable
      {...rest}
      disabled={isInactive}
      hitSlop={a11y.hitSlop}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!isInactive, busy: !!loading }}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: palette.bg, borderColor: palette.border },
        fullWidth && styles.fullWidth,
        pressed && !isInactive && { opacity: 0.75 },
        isInactive && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.text} />
      ) : (
        <View style={styles.content}>
          {leftIcon ? <View style={styles.icon}>{leftIcon}</View> : null}
          <Text style={[styles.label, { color: palette.text }]} numberOfLines={1}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const VARIANT: Record<Variant, { bg: string; border: string; text: string }> = {
  primary:   { bg: colors.brand,         border: colors.brand,         text: '#000000' },
  secondary: { bg: colors.surfaceElevated, border: colors.border,      text: colors.textPrimary },
  danger:    { bg: colors.urgent,        border: colors.urgent,        text: '#000000' },
  ghost:     { bg: 'transparent',        border: 'transparent',        text: colors.textPrimary },
};

const styles = StyleSheet.create({
  base: {
    minHeight: a11y.minTouchTarget,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: { alignSelf: 'stretch' },
  disabled: { opacity: 0.4 },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  icon: {},
  label: { ...typography.body, fontWeight: '700' },
});
