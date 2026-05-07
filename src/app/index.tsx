import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Background } from '@/components/Background';
import { DebtCard } from '@/components/DebtCard';
import { EmptyState } from '@/components/EmptyState';
import { FAB } from '@/components/FAB';
import { FilterBar, type DebtFilter, type DebtSort } from '@/components/FilterBar';
import { IconButton } from '@/components/IconButton';
import { Title } from '@/components/Title';
import { useDebts } from '@/state/DebtsContext';
import { useSettings } from '@/state/SettingsContext';
import { outstandingForDebt, totalOwed } from '@/lib/debtCycles';
import { formatCurrency } from '@/lib/format';
import { a11y, colors, radius, spacing, typography } from '@/theme';
import type { Debt } from '@/types/debt';

export default function HomeScreen() {
  const { loaded, debts } = useDebts();
  const { settings } = useSettings();

  const [filter, setFilter] = useState<DebtFilter>('all');
  const [sort, setSort] = useState<DebtSort>('time');

  const total = useMemo(() => totalOwed(debts), [debts]);
  const pendingCount = useMemo(() => debts.filter(d => !d.cyclePaidAt).length, [debts]);

  /**
   * Conteos por filtro para mostrar como badge.
   * Coherente con la lógica de filtrado de `filtered`.
   */
  const counts = useMemo<Partial<Record<DebtFilter, number>>>(() => ({
    all: debts.length,
    pending: debts.filter(d => !d.cyclePaidAt).length,
    unique: debts.filter(d => d.kind === 'unique').length,
    routine: debts.filter(d => d.kind === 'routine').length,
    group: debts.filter(d => d.kind === 'group').length,
    paid: debts.filter(d => !!d.cyclePaidAt).length,
  }), [debts]);

  /**
   * Aplicar filtro + orden.
   *
   * Filtros por tipo (unique/routine/group): no excluyen pagadas; muestran
   * todas las deudas de ese tipo y dejan el orden general (pendientes arriba)
   * gestionado por el comparador de abajo.
   *
   * Orden:
   *  - 'amount': por saldo pendiente descendente (mayor deuda primero).
   *    Las pagadas (saldo 0) caen al fondo.
   *  - 'time'  : pendientes ordenadas por antigüedad descendente
   *    (más tiempo sin pagar primero); pagadas al fondo, ordenadas por
   *    `cyclePaidAt` reciente primero.
   */
  const filtered = useMemo(() => {
    const base = debts.filter(d => matchesFilter(d, filter));
    const sorted = [...base].sort((a, b) => {
      const aPaid = !!a.cyclePaidAt;
      const bPaid = !!b.cyclePaidAt;
      if (aPaid !== bPaid) return aPaid ? 1 : -1;

      if (sort === 'amount') {
        const diff = outstandingForDebt(b) - outstandingForDebt(a);
        if (diff !== 0) return diff;
        // Tie-breaker: la más antigua primero
        return new Date(a.cycleStartedAt).getTime() - new Date(b.cycleStartedAt).getTime();
      }

      // sort === 'time'
      if (aPaid && bPaid) {
        // Pagadas: la más recientemente pagada arriba
        return (
          new Date(b.cyclePaidAt!).getTime() - new Date(a.cyclePaidAt!).getTime()
        );
      }
      // Pendientes: la que lleva más tiempo abierta primero
      return new Date(a.cycleStartedAt).getTime() - new Date(b.cycleStartedAt).getTime();
    });
    return sorted;
  }, [debts, filter, sort]);

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
            filter={filter}
            onFilterChange={setFilter}
            sort={sort}
            onSortChange={setSort}
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
        ) : filtered.length === 0 ? (
          <EmptyState
            emoji="🔍"
            title="Sin resultados para este filtro"
            hint="Prueba con otra pestaña o crea una nueva deuda."
          />
        ) : (
          <FlatList
            data={filtered}
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

/** Helper puro: predicado de filtrado por categoría. */
function matchesFilter(d: Debt, f: DebtFilter): boolean {
  switch (f) {
    case 'all':
      return true;
    case 'pending':
      return !d.cyclePaidAt;
    case 'paid':
      return !!d.cyclePaidAt;
    case 'unique':
      return d.kind === 'unique';
    case 'routine':
      return d.kind === 'routine';
    case 'group':
      return d.kind === 'group';
  }
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
