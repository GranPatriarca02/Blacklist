import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { a11y, colors, radius, spacing, typography } from '@/theme';

export interface Segment<T extends string> {
  value: T;
  label: string;
  /** Texto adicional para lector de pantalla. */
  accessibilityHint?: string;
}

interface SegmentedControlProps<T extends string> {
  segments: ReadonlyArray<Segment<T>>;
  value: T;
  onChange: (next: T) => void;
  /** Etiqueta accesible del grupo (ej. "Tipo de deuda"). */
  accessibilityLabel: string;
}

/**
 * Control segmentado tipo "tabs" reutilizable.
 *
 * - `accessibilityRole="tablist"` en el contenedor; cada segmento es "tab".
 * - `accessibilityState.selected` indica al lector cuál está activo.
 * - Touch target garantizado >= 48dp.
 */
export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  accessibilityLabel,
}: SegmentedControlProps<T>) {
  return (
    <View
      style={styles.container}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
    >
      {segments.map(seg => {
        const selected = seg.value === value;
        return (
          <Pressable
            key={seg.value}
            onPress={() => onChange(seg.value)}
            hitSlop={a11y.hitSlop}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={seg.label}
            accessibilityHint={seg.accessibilityHint}
            style={({ pressed }) => [
              styles.segment,
              selected && styles.segmentSelected,
              pressed && !selected && { opacity: 0.7 },
            ]}
          >
            <Text
              style={[styles.label, selected && styles.labelSelected]}
              numberOfLines={1}
            >
              {seg.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segment: {
    flex: 1,
    minHeight: a11y.minTouchTarget - 8,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  segmentSelected: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.brandMuted,
  },
  label: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  labelSelected: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
});
