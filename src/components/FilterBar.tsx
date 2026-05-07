import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { a11y, colors, radius, spacing, typography } from '@/theme';

/** Filtros por **tipo** de deuda. Multi-selección (OR). */
export type DebtTypeFilter = 'unique' | 'routine' | 'group';

/**
 * Filtros por **estado**. Mutuamente excluyentes:
 * - 'pending' → solo no pagadas
 * - 'paid'    → solo pagadas
 * - null      → ambas (no se aplica filtro de estado)
 */
export type DebtStatusFilter = 'pending' | 'paid';

/** Modos de ordenamiento. */
export type DebtSortMode = 'amount' | 'time';

/** Dirección del orden. */
export type SortDirection = 'asc' | 'desc';

/** Conteos opcionales para los badges. Cualquier omisión se trata como 0. */
export interface FilterCounts {
  all?: number;
  pending?: number;
  paid?: number;
  unique?: number;
  routine?: number;
  group?: number;
}

interface FilterBarProps {
  /** Tipos seleccionados (vacío = todos los tipos). */
  types: ReadonlyArray<DebtTypeFilter>;
  /** Toggle un tipo (añade si no está, lo quita si ya está). */
  onTypeToggle: (t: DebtTypeFilter) => void;
  /** Estado seleccionado o null si ambos. */
  status: DebtStatusFilter | null;
  /** Toggle estado: si era el mismo → null, si era el otro → cambia, si era null → activa. */
  onStatusToggle: (s: DebtStatusFilter) => void;
  /** Limpia todos los filtros (deja todo a "Todas"). */
  onClear: () => void;

  sortMode: DebtSortMode;
  onSortModeToggle: () => void;
  sortDir: SortDirection;
  onSortDirToggle: () => void;

  counts?: FilterCounts;
}

/** Definición declarativa de cada chip. */
type ChipDef =
  | { kind: 'reset'; label: 'Todas'; hint: string }
  | { kind: 'status'; value: DebtStatusFilter; label: string; hint: string }
  | { kind: 'type'; value: DebtTypeFilter; label: string; hint: string };

const CHIPS: ReadonlyArray<ChipDef> = [
  {
    kind: 'reset',
    label: 'Todas',
    hint: 'Quitar todos los filtros',
  },
  {
    kind: 'status',
    value: 'pending',
    label: 'Pendientes',
    hint: 'Mostrar solo deudas sin pagar (excluye Pagadas)',
  },
  {
    kind: 'type',
    value: 'unique',
    label: 'Únicas',
    hint: 'Incluir deudas únicas',
  },
  {
    kind: 'type',
    value: 'routine',
    label: 'Rutinarias',
    hint: 'Incluir deudas rutinarias (semanales o mensuales)',
  },
  {
    kind: 'type',
    value: 'group',
    label: 'Grupales',
    hint: 'Incluir deudas grupales',
  },
  {
    kind: 'status',
    value: 'paid',
    label: 'Pagadas',
    hint: 'Mostrar solo deudas saldadas (excluye Pendientes)',
  },
];

/**
 * Barra de filtros + ordenamiento para Home.
 *
 * Modelo:
 *  - Tipos (`unique`/`routine`/`group`): multi-selección (OR). Vacío = todos.
 *  - Estado (`pending`/`paid`): mutex (solo uno o ninguno). Ninguno = ambos.
 *  - Chip "Todas": botón de reset que vacía la selección.
 *
 * Layout:
 *  - Una sola fila: ScrollView horizontal de chips + cluster fijo de
 *    botones (modo de orden + dirección) anclado a la derecha.
 *  - Los chips scrollean **por detrás** del cluster: el cluster tiene
 *    `colors.surface` opaco para enmascarar lo que pasa por debajo.
 *
 * Accesibilidad:
 *  - Chips: `accessibilityRole="tab"` con `selected`.
 *  - Botones de orden: anuncian el modo / dirección actual y siguiente.
 */
export function FilterBar({
  types,
  onTypeToggle,
  status,
  onStatusToggle,
  onClear,
  sortMode,
  onSortModeToggle,
  sortDir,
  onSortDirToggle,
  counts,
}: FilterBarProps) {
  const hasAnyFilter = types.length > 0 || status !== null;

  const isChipSelected = (chip: ChipDef): boolean => {
    if (chip.kind === 'reset') return !hasAnyFilter;
    if (chip.kind === 'status') return status === chip.value;
    return types.includes(chip.value);
  };

  const onChipPress = (chip: ChipDef) => {
    if (chip.kind === 'reset') return onClear();
    if (chip.kind === 'status') return onStatusToggle(chip.value);
    return onTypeToggle(chip.value);
  };

  const chipCount = (chip: ChipDef): number | undefined => {
    if (!counts) return undefined;
    if (chip.kind === 'reset') return counts.all;
    if (chip.kind === 'status') return counts[chip.value];
    return counts[chip.value];
  };

  const sortModeIcon = sortMode === 'amount' ? '$' : '⏱';
  const sortDirIcon = sortDir === 'desc' ? '↓' : '↑';

  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}
          accessibilityRole="tablist"
          accessibilityLabel="Filtrar deudas"
        >
          {CHIPS.map(chip => {
            const selected = isChipSelected(chip);
            const count = chipCount(chip);
            const key =
              chip.kind === 'reset' ? 'reset' : `${chip.kind}:${chip.value}`;
            return (
              <Pressable
                key={key}
                onPress={() => onChipPress(chip)}
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

        {/*
          Cluster de botones de orden anclado a la derecha.
          Solid bg + borde para enmascarar los chips que scrollean detrás.
        */}
        <View style={styles.actions}>
          <Pressable
            onPress={onSortModeToggle}
            hitSlop={a11y.hitSlop}
            accessibilityRole="button"
            accessibilityLabel={
              sortMode === 'amount' ? 'Ordenar por cantidad' : 'Ordenar por tiempo sin pagar'
            }
            accessibilityHint={
              sortMode === 'amount'
                ? 'Toca para ordenar por tiempo sin pagar'
                : 'Toca para ordenar por cantidad'
            }
            style={({ pressed }) => [
              styles.iconBtn,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={styles.iconText} allowFontScaling={false}>
              {sortModeIcon}
            </Text>
          </Pressable>

          <View style={styles.divider} />

          <Pressable
            onPress={onSortDirToggle}
            hitSlop={a11y.hitSlop}
            accessibilityRole="button"
            accessibilityLabel={
              sortDir === 'desc' ? 'Orden descendente' : 'Orden ascendente'
            }
            accessibilityHint={
              sortDir === 'desc'
                ? 'Toca para cambiar a orden ascendente'
                : 'Toca para cambiar a orden descendente'
            }
            style={({ pressed }) => [
              styles.iconBtn,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={styles.iconText} allowFontScaling={false}>
              {sortDirIcon}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/** Ancho aprox del cluster de botones (2 botones + divider + paddings). */
const ACTIONS_WIDTH = 92;

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  row: {
    position: 'relative',
    minHeight: 44,
    justifyContent: 'center',
  },
  tabsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    // Espacio reservado para que el último chip pueda scrollearse
    // por debajo del cluster sin quedar oculto permanentemente.
    paddingRight: ACTIONS_WIDTH + spacing.sm,
    paddingVertical: spacing.xs,
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
  // Cluster de los dos botones de orden — bg sólido para enmascarar
  // los chips que pasen por detrás durante el scroll.
  actions: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.brandMuted,
    paddingHorizontal: spacing.xs,
    marginVertical: spacing.xs,
  },
  iconBtn: {
    minWidth: 36,
    minHeight: 36,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 18,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    marginVertical: spacing.xs,
    backgroundColor: colors.border,
  },
});
            accessibilityRole="button"
            accessibilityLabel={
              sortMode === 'amount' ? 'Ordenar por cantidad' : 'Ordenar por tiempo sin pagar'
            }
            accessibilityHint={
              sortMode === 'amount'
                ? 'Toca para ordenar por tiempo sin pagar'
                : 'Toca para ordenar por cantidad'
            }
            style={({ pressed }) => [
              styles.iconBtn,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={styles.iconText} allowFontScaling={false}>
              {sortModeIcon}
            </Text>
          </Pressable>

          <View style={styles.divider} />

          <Pressable
            onPress={onSortDirToggle}
            hitSlop={a11y.hitSlop}
            accessibilityRole="button"
            accessibilityLabel={
              sortDir === 'desc' ? 'Orden descendente' : 'Orden ascendente'
            }
            accessibilityHint={
              sortDir === 'desc'
                ? 'Toca para cambiar a orden ascendente'
                : 'Toca para cambiar a orden descendente'
            }
            style={({ pressed }) => [
              styles.iconBtn,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={styles.iconText} allowFontScaling={false}>
              {sortDirIcon}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/** Ancho aprox del cluster de botones (2 botones + divider + paddings). */
const ACTIONS_WIDTH = 92;

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  row: {
    position: 'relative',
    minHeight: 44,
    justifyContent: 'center',
  },
  tabsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingRight: ACTIONS_WIDTH + spacing.sm,
    paddingVertical: spacing.xs,
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
  actions: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.brandMuted,
    paddingHorizontal: spacing.xs,
    marginVertical: spacing.xs,
  },
  iconBtn: {
    minWidth: 36,
    minHeight: 36,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 18,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    marginVertical: spacing.xs,
    backgroundColor: colors.border,
  },
});
'center',
  },
  iconText: {
    fontSize: 18,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    marginVertical: spacing.xs,
    backgroundColor: colors.border,
  },
});
