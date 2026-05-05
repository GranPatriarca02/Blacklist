import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { a11y, colors, radius, spacing, typography } from '@/theme';

interface ListItemProps {
  title: string;
  subtitle?: string;
  /** Texto auxiliar a la derecha (ej. valor actual). */
  trailing?: string;
  onPress?: () => void;
  accessibilityHint?: string;
  /** Mostrar el chevron ›. */
  showChevron?: boolean;
  leftAccessory?: ReactNode;
}

/**
 * Fila genérica de listas (ajustes, detalles, etc.).
 *
 * - Si `onPress` se pasa, es una row interactiva con role="button".
 * - Si no, es una row informativa con role="text".
 */
export function ListItem({
  title,
  subtitle,
  trailing,
  onPress,
  accessibilityHint,
  showChevron,
  leftAccessory,
}: ListItemProps) {
  const a11yLabel = [title, trailing, subtitle].filter(Boolean).join('. ');

  const content = (
    <View style={styles.row}>
      {leftAccessory ? <View style={styles.left}>{leftAccessory}</View> : null}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text> : null}
      </View>
      {trailing ? (
        <Text style={styles.trailing} numberOfLines={1}>{trailing}</Text>
      ) : null}
      {showChevron ? (
        <Text
          style={styles.chevron}
          allowFontScaling={false}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          ›
        </Text>
      ) : null}
    </View>
  );

  if (!onPress) {
    return (
      <View accessibilityLabel={a11yLabel} accessible style={styles.container}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      hitSlop={a11y.hitSlop}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [styles.container, pressed && { opacity: 0.7 }]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: a11y.minTouchTarget,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  left: {
    marginRight: spacing.md,
  },
  body: { flex: 1 },
  title: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  subtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  trailing: {
    ...typography.body,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  chevron: {
    fontSize: 24,
    color: colors.textMuted,
    marginLeft: spacing.sm,
  },
});
