import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Background } from '@/components/Background';
import { DebtCard } from '@/components/DebtCard';
import { EmptyState } from '@/components/EmptyState';
import { FAB } from '@/components/FAB';
import {
  FilterBar,
  type DebtSortMode,
  type DebtStatusFilter,
  type DebtTypeFilter,
  type SortDirection,
} from '@/components/FilterBar';
import { IconButton } from '@/components/IconButton';
import { Title } from '@/components/Title';
import { useDebts } from '@/state/DebtsContext';
import { useSettings } from '@/state/SettingsContext';
import { totalOwed } from '@/lib/debtCycles';
import { formatCurrency } from '@/lib/format';
import { a11y, colors, radius, spacing, typography } from '@/theme';
import type { Debt } from '@/types/debt';

export default function HomeScreen() {
  const { loaded, debts } = useDebts();
  const { settings } = useSettings();

  // ─── Estado de filtros ────────────────────────────────────────────────
  // Tipos: multi-selección (OR). Vacío = todos los tipos.
  const [types, setTypes] = useState<DebtTypeFilter[]>([]);
  // Estado: mutuamente excluyente (pending/paid/null). null = ambos.
  const [status, setStatus] = useState<DebtStatusFilter | null>(null);
  // Orden: modo + dirección, independientes.
  const [sortMode, setSortMode] = useState<DebtSortMode>('time');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  const onTypeToggle = useCallback((t: DebtTypeFilter) => {
    setTypes(prev =>
      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t],
    );
  }, []);

  const onStatusToggle = useCallback((s: DebtStatusFilter) => {
    setStatus(prev => (prev === s ? null : s));
  }, []);

  const onClearFilters = useCallback(() => {
    setTypes([]);
    setStatus(null);
  }, []);

  const onSortModeToggle = useCallback(() => {
    setSortMode(prev => (prev === 'amount' ? 'time' : 'amount'));
  }, []);

  const onSortDirToggle = useCallback(() => {
    setSortDir(prev => (prev === 'desc' ? 'asc' : 'desc'));
  }, []);

  // ─── Datos derivados ──────────────────────────────────────────────────
  const total = useMemo(() => totalOwed(debts), [debts]);
  const pendingCount = useMemo(
    () => debts.filter(d => !d.cyclePaidAt).length,
    [debts],
  );

  /**
   * Conteos por chip. Cada chip muestra cuántas deudas hay para su criterio
   * **aislado** (sin importar las otras selecciones), de modo que el usuario
   * puede prever cuánto añadiría/excluiría al combinar filtros.
   */
  const counts = useMemo(
    () => ({
      all: debts.length,
      pending: debts.filter(d => !d.cyclePaidAt).length,
      paid: debts.filter(d => !!d.cyclePaidAt).length,
      unique: debts.filter(d => d.kind === 'unique').length,
      routine: debts.filter(d => d.kind === 'routine').length,
      group: debts.filter(d => d.kind === 'group').length,
    }),
    [debts],
  );

  /**
   * Filtra y ordena.
   *
   * Filtro:
   *  - tipos: si hay selección, deuda debe pertenecer a alguno (OR).
   *  - estado: si hay selección, deuda debe coincidir; null = ambos.
   *
   * Orden: respeta totalmente la elección del usuario (ya no se fuerzan
   * pagadas al fondo: el filtro de estado y el sort lo deciden).
   *
   *  - 'amount': por `debt.amount` (total, da una idea del tamaño absoluto).
   *  - 'time'  : por "tiempo sin pagar" — para pendientes = now - inicio,
   *    para pagadas = pagada - inicio (cuánto duró sin saldarse).
   */
  const visible = useMemo(() => {
    const filtered = debts.filter(d => matchesFilter(d, types, status));

    const dirMul = sortDir === 'desc' ? -1 : 1;
    const now = Date.now();

    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortMode === 'amount') {
        cmp = a.amount - b.amount;
      } else {
        cmp = elapsedMs(a, now) - elapsedMs(b, now);
      }
      if (cmp === 0) {
        // Tie-breaker estable: el más antiguo primero.
        cmp =
          new Date(a.cycleStartedAt).getTime() -
          new Date(b.cycleStartedAt).getTime();
      }
      return dirMul * cmp;
    });
  }, [debts, types, status, sortMode, sortDir]);

  return (
    <Background>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Title isScreenTitle>Blacklist 💀$</Title>
            <IconButton
              onPress={() => router.push('/settings')}
              accessibilityLabel="Abrir ajustes"
              accessibilityHint="Cambia divisa y otras preferencias"
              glyph="⚙"
            />
          </View>

          <Pressable
            onPress={() => router.push('/total')}
            hitSlop={a11y.hitSlop}
            accessibilityRole="button"
            accessibilityLabel={
              pendingCount === 0
                ? 'Resumen: no tienes deudas pendientes. Toca para configurar la notificación del total'
                : `Resumen: te deben ${formatCurrency(total, settings.currency)} en total entre ${pendingCount} deuda${pendingCount === 1 ? '' : 's'}. Toca para ver desglose mensual y notificación`
            }
            accessibilityHint="Abre el desglose mensual y la configuración de la notificación del total"
            style={({ pressed }) => [styles.summary, pressed && { opacity: 0.85 }]}
          >
            <View style={styles.summaryLeft}>
              <Text style={styles.summaryLabel}>Te deben</Text>
              <Text style={styles.summaryValue}>{formatCurrency(total, settings.currency)}</Text>
            </View>
            <View style={styles.summaryMid}>
              <Text style={styles.summaryLabel}>Pendientes</Text>
              <Text style={styles.summaryValue}>{pendingCount}</Text>
            </View>
            <View style={styles.summaryRight}>
              <Text
                style={styles.bellEmoji}
                allowFontScaling={false}
                accessibilityElementsHidden
                importantForAccessibility="no"
              >
                {settings.totalNotificationsEnabled ? '🔔' : '🔕'}
              </Text>
              <Text
                style={styles.chevron}
                allowFontScaling={false}
                accessibilityElementsHidden
                importantForAccessibility="no"
              >
                ›
              </Text>
            </View>
          </Pressable>
        </View>

        {loaded && debts.length > 0 && (
          <FilterBar
            types={types}
            onTypeToggle={onTypeToggle}
            status={status}
            onStatusToggle={onStatusToggle}
            onClear={onClearFilters}
            sortMode={sortMode}
            onSortModeToggle={onSortModeToggle}
            sortDir={sortDir}
            onSortDirToggle={onSortDirToggle}
            counts={counts}
          />
        )}

        {!loaded ? (
          <View style={styles.loading}>
            <Text style={styles.loadingText}>Cargando…</Text>
          </View>
        ) : debts.length === 0 ? (
          <EmptyState
            emoji="📒"
            title="Aún no hay deudas registradas"
            hint="Toca el botón + para agregar tu primera deuda."
          />
        ) : visible.length === 0 ? (
          <EmptyState
            emoji="🔍"
            title="Sin resultados para este filtro"
            hint="Prueba con otra combinación o pulsa Todas para limpiar."
          />
        ) : (
          <FlatList
            data={visible}
            keyExtractor={d => d.id}
            renderItem={({ item }) => <DebtCard debt={item} />}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}

        <FAB
          onPress={() => router.push('/add-debt')}
          accessibilityLabel="Agregar nueva deuda"
          accessibilityHint="Abre el formulario para registrar una deuda única o rutinaria"
          glyph="+"
        />
      </SafeAreaView>
    </Background>
  );
}

/**
 * Predicado puro de filtrado.
 * - `types` vacío → cualquier tipo pasa.
 * - `status` null → cualquier estado pasa.
 */
function matchesFilter(
  d: Debt,
  types: ReadonlyArray<DebtTypeFilter>,
  status: DebtStatusFilter | null,
): boolean {
  if (types.length > 0 && !types.includes(d.kind as DebtTypeFilter)) {
    return false;
  }
  if (status === 'pending' && d.cyclePaidAt) return false;
  if (status === 'paid' && !d.cyclePaidAt) return false;
  return true;
}

/**
 * Tiempo "sin pagar" en ms.
 * - Pendiente: ahora − cycleStartedAt.
 * - Pagada:    cyclePaidAt − cycleStartedAt (cuánto tardó en saldarse).
 */
function elapsedMs(d: Debt, now: number): number {
  const start = new Date(d.cycleStartedAt).getTime();
  const end = d.cyclePaidAt ? new Date(d.cyclePaidAt).getTime() : now;
  return end - start;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summary: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  summaryLeft: { flex: 1 },
  summaryMid: { alignItems: 'flex-end', marginRight: spacing.md },
  summaryRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  summaryValue: {
    ...typography.title,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  bellEmoji: {
    fontSize: 20,
    marginRight: spacing.xs,
  },
  chevron: {
    fontSize: 28,
    color: colors.textMuted,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textMuted,
  },
});
turn false;
  if (status === 'paid' && !d.cyclePaidAt) return false;
  return true;
}

/**
 * Tiempo "sin pagar" en ms.
 * - Pendiente: ahora − cycleStartedAt.
 * - Pagada:    cyclePaidAt − cycleStartedAt (cuánto tardó en saldarse).
 */
function elapsedMs(d: Debt, now: number): number {
  const start = new Date(d.cycleStartedAt).getTime();
  const end = d.cyclePaidAt ? new Date(d.cyclePaidAt).getTime() : now;
  return end - start;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summary: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  summaryLeft: { flex: 1 },
  summaryMid: { alignItems: 'flex-end', marginRight: spacing.md },
  summaryRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  summaryValue: {
    ...typography.title,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  bellEmoji: {
    fontSize: 20,
    marginRight: spacing.xs,
  },
  chevron: {
    fontSize: 28,
    color: colors.textMuted,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textMuted,
  },
});
