import React, { forwardRef } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string;
  hint?: string;
  /** Si es opcional, lo indicamos visualmente y al lector de pantalla. */
  optional?: boolean;
  prefix?: string;
}

/**
 * Input con label arriba, mensaje de error y descripción accesible compuesta.
 *
 * - El label real es un <Text> con `accessibilityRole="text"` aparte; el
 *   `accessibilityLabel` del TextInput se construye combinando label+hint+error
 *   para que el lector de pantalla anuncie todo de una vez al enfocar.
 * - El borde rojo en error se complementa con texto explicativo (no nos
 *   apoyamos solo en color: requisito WCAG 1.4.1).
 */
export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, hint, optional, prefix, value, ...rest },
  ref,
) {
  const a11yLabel = [
    label,
    optional ? '(opcional)' : null,
    hint,
    error ? `Error: ${error}` : null,
  ]
    .filter(Boolean)
    .join('. ');

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>
        {label}
        {optional && <Text style={styles.optional}>  ·  opcional</Text>}
      </Text>

      <View style={[styles.inputBox, !!error && styles.inputBoxError]}>
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <TextInput
          ref={ref}
          value={value}
          {...rest}
          style={styles.input}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.focusRing}
          accessibilityLabel={a11yLabel}
          accessibilityHint={hint}
          accessibilityState={{ selected: !!value }}
        />
      </View>

      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  optional: {
    color: colors.textMuted,
    textTransform: 'none',
    letterSpacing: 0,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    minHeight: 52,
  },
  inputBoxError: { borderColor: colors.urgent },
  prefix: {
    ...typography.body,
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    paddingVertical: spacing.sm,
  },
  error: {
    ...typography.caption,
    color: colors.urgent,
    marginTop: spacing.xs,
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
