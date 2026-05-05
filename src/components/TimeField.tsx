import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { a11y, colors, radius, spacing, typography } from '@/theme';

interface TimeFieldProps {
  label: string;
  hour: number;     // 0-23
  minute: number;   // 0-59
  onChange: (hour: number, minute: number) => void;
  disabled?: boolean;
}

/**
 * Selector de hora HH:MM con steppers (sin dependencias nativas).
 *
 * Por qué steppers en vez de un picker nativo:
 *  - 0 dependencias extra (no `@react-native-community/datetimepicker`).
 *  - Targets táctiles grandes (48dp), trivialmente accesibles.
 *  - Predecible en accesibilidad: cada botón anuncia su acción.
 *
 * Comportamiento: pulsar +/- avanza/retrocede; long-press repite cada 150ms.
 */
export function TimeField({ label, hour, minute, onChange, disabled }: TimeFieldProps) {
  const setHour = useCallback((h: number) => {
    const next = ((h % 24) + 24) % 24;
    onChange(next, minute);
  }, [minute, onChange]);

  const setMinute = useCallback((m: number) => {
    const next = ((m % 60) + 60) % 60;
    onChange(hour, next);
  }, [hour, onChange]);

  const fmt = (n: number) => n.toString().padStart(2, '0');

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[styles.row, disabled && styles.rowDisabled]}
        accessible
        accessibilityLabel={`${label}: ${fmt(hour)}:${fmt(minute)}`}
      >
        <Stepper
          label="hora"
          value={fmt(hour)}
          onDec={() => setHour(hour - 1)}
          onInc={() => setHour(hour + 1)}
          disabled={disabled}
        />
        <Text style={styles.colon} allowFontScaling={false}>:</Text>
        <Stepper
          label="minuto"
          value={fmt(minute)}
          onDec={() => setMinute(minute - 5)}
          onInc={() => setMinute(minute + 5)}
          disabled={disabled}
        />
      </View>
      <Text style={styles.hint}>El minuto avanza en pasos de 5</Text>
    </View>
  );
}

interface StepperProps {
  label: string;
  value: string;
  onDec: () => void;
  onInc: () => void;
  disabled?: boolean;
}

function Stepper({ label, value, onDec, onInc, disabled }: StepperProps) {
  return (
    <View style={styles.stepper}>
      <Pressable
        onPress={onDec}
        disabled={disabled}
        hitSlop={a11y.hitSlop}
        accessibilityRole="button"
        accessibilityLabel={`Disminuir ${label}`}
        style={({ pressed }) => [styles.stepBtn, pressed && { opacity: 0.6 }]}
      >
        <Text style={styles.stepGlyph} allowFontScaling={false}>−</Text>
      </Pressable>
      <Text
        style={styles.stepValue}
        allowFontScaling={false}
        accessibilityLabel={`${label} ${value}`}
      >
        {value}
      </Text>
      <Pressable
        onPress={onInc}
        disabled={disabled}
        hitSlop={a11y.hitSlop}
        accessibilityRole="button"
        accessibilityLabel={`Aumentar ${label}`}
        style={({ pressed }) => [styles.stepBtn, pressed && { opacity: 0.6 }]}
      >
        <Text style={styles.stepGlyph} allowFontScaling={false}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  rowDisabled: { opacity: 0.4 },
  colon: {
    ...typography.title,
    color: colors.textSecondary,
    paddingHorizontal: spacing.sm,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepBtn: {
    width: a11y.minTouchTarget,
    height: a11y.minTouchTarget,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
  },
  stepGlyph: {
    ...typography.heading,
    color: colors.textPrimary,
    fontWeight: '900',
  },
  stepValue: {
    ...typography.title,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
    minWidth: 56,
    textAlign: 'center',
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
