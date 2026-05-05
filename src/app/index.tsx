import React, { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Background } from '@/components/Background';
import { DebtCard } from '@/components/DebtCard';
import { EmptyState } from '@/components/EmptyState';
import { FAB } from '@/components/FAB';
import { Title } from '@/components/Title';
import { useDebts } from '@/state/DebtsContext';
import { totalOwed } from '@/lib/debtCycles';
import { formatCurrency } from '@/lib/format';
import { colors, spacing, typography } from '@/theme';

/**
 * Pantalla principal: lista de deudas + resumen + FAB para agregar.
 *
 * Orden:
 *  1. Pendientes primero (cyclePaidAt === null), más recientes arriba.
 *  2. Pagadas/en espera al final (rutinarias pagadas esperando próximo ciclo).
 */
export default function HomeScreen() {
  const { loaded, debts } = useDebts();

  const sorted = useMemo(() => {
    return [...debts].sort((a, b) => {
      // Pendientes primero
      if (!!a.cyclePaidAt !== !!b.cyclePaidAt) {
        return a.cyclePaidAt ? 1 : -1;
      }
      // Más antiguas (más tiempo sin pagar) primero entre pendientes
      return new Date(a.cycleStartedAt).getTime() - new Date(b.cycleStartedAt).getTime();
    });
  }, [debts]);

  const total = useMemo(() => totalOwed(debts), [debts]);
  const pendingCount = useMemo(
    () => debts.filter(d => !d.cyclePaidAt).length,
    [debts],
  );

  const handleAdd = () => router.push('/add-debt');

  return (
    <Background>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Title isScreenTitle>Blacklist 💀$</Title>
          <View
            style={styles.summary}
            accessible
            accessibilityRole="summary"
            accessibilityLabel={
              pendingCount === 0
                ? 'No tienes deudas pendientes'
                : `Te deben ${formatCurrency(total)} en total, distribuido en ${pendingCount} deuda${pendingCount === 1 ? '' : 's'}`
            }
          >
            <View>
              <Text style={styles.summaryLabel}>Te deben</Text>
              <Text style={styles.summaryValue}>{formatCurrency(total)}</Text>
            </View>
            <View style={styles.summaryRight}>
              <Text style={styles.summaryLabel}>Pendientes</Text>
              <Text style={styles.summaryValue}>{pendingCount}</Text>
            </View>
          </View>
        </View>

        {!loaded ? (
          <View style={styles.loading}>
            <Text style={styles.loadingText}>Cargando…</Text>
          </View>
        ) : sorted.length === 0 ? (
          <EmptyState
            emoji="📒"
            title="Aún no hay deudas registradas"
            hint="Toca el botón + para agregar tu primera deuda."
          />
        ) : (
          <FlatList
            data={sorted}
            keyExtractor={d => d.id}
            renderItem={({ item }) => <DebtCard debt={item} />}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}

        <FAB
          onPress={handleAdd}
          accessibilityLabel="Agregar nueva deuda"
          accessibilityHint="Abre el formulario para registrar una deuda única o rutinaria"
          glyph="+"
        />
      </SafeAreaView>
    </Background>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  summary: {
    marginTop: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  summaryRight: { alignItems: 'flex-end' },
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
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 120, // espacio para que el FAB no tape la última card
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
