import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { a11y, colors, radius, spacing, typography } from '@/theme';

/** Filtros disponibles para la lista de deudas en Home. */
export type DebtFilter =
  | 'all'
  | 'pending'
  | 'unique'
  | 'routine'
  | 'group'
  | 'paid';

/** Modos de ordenamiento. */
export type DebtSort = 'amount' | 'time';

interface FilterBarProps {
  filter: DebtFilter;
  onFilterChange: (next: DebtFilter) => void;
  sort: DebtSort;
  onSortChange: (next: DebtSort) => void;
  /** Conteos opcionales por filtro, mostrados como badge. */
  counts?: Partial<Record<DebtFilter, number>>;
}

interface FilterChip {
  value: DebtFilter;
  label: string;
  hint: string;
}

const FILTERS: ReadonlyArray<FilterChip> = [
  { value: 'all', label: 'Todas', hint: 'Mostrar todas las deudas' },
  { value: 'pending', label: 'Pendientes', hint: 'Solo deudas sin pagar' },
  { value: 'unique', label: 'Únicas', hint: 'Solo deudas únicas (one-shot)' },
  { value: 'routine', label: 'Rutinarias', hint: 'Solo deudas rutinarias (semanales o mensuales)' },
  { value: 'group', label: 'Grupales', hint: 'Solo deudas grupales' },
  { value: 'paid', label: 'Pagadas', hint: 'Solo deudas ya saldadas' },
];

/**
 * Barra de filtros + ordenamiento para Home.
 *
 * Fila 1: chips horizontales scrollables (tabs por tipo / estado).
 * Fila 2: botón compacto que alterna entre ordenar por cantidad y por tiempo.
 *
 * Accesibilidad:
 *  - Cada chip es `tab` con `accessibilityState.selected`.
 *  - Touch target >= 44dp.
 *  - El botón de orden anuncia el modo actual y el siguiente.
 */
export function FilterBar({
  filter,
  onFilterChange,
  sort,
  onSortChange,
  counts,
}: FilterBarProps) {
  const sortLabel = sort === 'amount' ? 'Cantidad' : 'Tiempo';
  const sortIcon = sort === 'amount' ? '€' : '⏱';
  const nextSortLabel = sort === 'amount' ? 'tiempo sin pagar' : 'cantidad';

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsRow}
        accessibilityRole="tablist"
        accessibilityLabel="Filtrar deudas"
      >
        {FILTERS.map(chip => {
          const selected = chip.value === filter;
          const count = counts?.[chip.value];
          return (
            <Pressable
              key={chip.value}
              onPress={() => onFilterChange(chip.value)}
              hitSlop={a11y.hitSlop}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={
                count !== undefined
                  ? `${chip.label}, ${count} deuda${count === 1 ? '' : 's'}`
                  : chip.label
              }
              accessibilityHint={chip.hint}
              style={({ pressed }) => [
                styles.chip,
                selected && styles.chipSelected,
                pressed && !selected && { opacity: 0.7 },
              ]}
            >
              <Text
                style={[styles.chipLabel, selected && styles.chipLabelSelected]}
                numberOfLines={1}
              >
                {chip.label}
              </Text>
              {count !== undefined && count > 0 && (
                <View
                  style={[styles.badge, selected && styles.badgeSelected]}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                >
                  <Text
                    style={[
                      styles.badgeText,
                      selected && styles.badgeTextSelected,
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.sortRow}>
        <Pressable
          onPress={() => onSortChange(sort === 'amount' ? 'time' : 'amount')}
          hitSlop={a11y.hitSlop}
          accessibilityRole="button"
          accessibilityLabel={`Ordenar por ${sortLabel.toLowerCase()}`}
          accessibilityHint={`Toca para ordenar por ${nextSortLabel}`}
          style={({ pressed }) => [
            styles.sortBtn,
            pressed && { opacity: 0.75 },
          ]}
        >
          <Text style={styles.sortIcon} allowFontScaling={false}>
            {sortIcon}
          </Text>
          <Text style={styles.sortText}>Ordenar: {sortLabel}</Text>
          <Text
            style={styles.sortSwap}
            allowFontScaling={false}
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            ⇄
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 36,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.brandMuted,
  },
  chipLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  chipLabelSelected: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  badge: {
    marginLeft: spacing.xs,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeSelected: {
    backgroundColor: colors.brandMuted,
  },
  badgeText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  badgeTextSelected: {
    color: colors.background,
  },
  sortRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 36,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sortIcon: {
    fontSize: 14,
    color: colors.textPrimary,
    marginRight: spacing.xs,
    fontWeight: '700',
  },
  sortText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  sortSwap: {
    fontSize: 14,
    color: colors.textMuted,
    marginLeft: spacing.xs,
  },
});
