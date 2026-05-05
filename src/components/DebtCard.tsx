import React, { useCallback, useMemo } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { a11y, colors, radius, spacing, typography } from '@/theme';
import type { Debt } from '@/types/debt';
import { useElapsed } from '@/hooks/useElapsed';
import { useDebts } from '@/state/DebtsContext';
import { nextDueDate } from '@/lib/debtCycles';
import {
  formatCurrency,
  formatDate,
  formatElapsed,
  formatElapsedAccessible,
} from '@/lib/format';

interface DebtCardProps {
  debt: Debt;
}

/**
 * Tarjeta de deuda con contador vivo.
 *
 * Estados visuales:
 *  1. Pendiente (cyclePaidAt === null) → contador rojo/ámbar tic-tac.
 *  2. Pagada única → bloque verde "Pagada el X".
 *  3. Rutinaria pagada esperando próximo ciclo → "Reabre el [fecha]".
 */
export function DebtCard({ debt }: DebtCardProps) {
  const { payDebt, removeDebt } = useDebts();

  const isPending = debt.cyclePaidAt === null;
  const elapsedMs = useElapsed(debt.cycleStartedAt, isPending);

  const reopensAt = useMemo(
    () => (debt.kind === 'routine' && debt.cyclePaidAt ? nextDueDate(debt) : null),
    [debt],
  );

  const kindLabel = useMemo(() => {
    if (debt.kind === 'unique') return 'Única';
    return debt.frequency === 'weekly' ? 'Rutinaria · semanal' : 'Rutinaria · mensual';
  }, [debt]);

  const handlePay = useCallback(() => {
    Alert.alert(
      'Marcar como pagada',
      `¿Confirmas que ${debt.debtorName} pagó ${formatCurrency(debt.amount, debt.currency)}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sí, pagada', style: 'default', onPress: () => payDebt(debt.id) },
      ],
    );
  }, [debt, payDebt]);

  const handleLongPress = useCallback(() => {
    Alert.alert(
      'Eliminar deuda',
      `Eliminar permanentemente la deuda de ${debt.debtorName}. Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => removeDebt(debt.id) },
      ],
    );
  }, [debt, removeDebt]);

  // Etiqueta accesible compuesta para que el lector anuncie todo
  const a11yLabel = [
    `${debt.debtorName} te debe ${formatCurrency(debt.amount, debt.currency)}`,
    kindLabel,
    isPending
      ? `Lleva ${formatElapsedAccessible(elapsedMs)} sin pagar`
      : reopensAt
        ? `Pagada. Reabre el ${formatDate(reopensAt)}`
        : `Pagada el ${formatDate(debt.cyclePaidAt!)}`,
    debt.payments.length > 0 ? `${debt.payments.length} pagos en historial` : null,
  ]
    .filter(Boolean)
    .join('. ');

  return (
    <Pressable
      onLongPress={handleLongPress}
      hitSlop={a11y.hitSlop}
      accessible
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityHint="Mantén presionado para eliminar"
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.headerRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText} allowFontScaling={false}>
            {debt.debtorName.charAt(0).toUpperCase() || '?'}
          </Text>
        </View>

        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {debt.debtorName}
          </Text>
          <Text style={styles.amount}>{formatCurrency(debt.amount, debt.currency)}</Text>
        </View>

        <KindBadge kind={kindLabel} pending={isPending} />
      </View>

      {debt.description ? (
        <Text style={styles.description} numberOfLines={2}>
          {debt.description}
        </Text>
      ) : null}

      <View style={styles.statusRow}>
        {isPending ? (
          <View style={styles.counterBlock}>
            <Text style={styles.counterLabel}>Sin pagar desde</Text>
            <Text style={styles.counterValue}>{formatElapsed(elapsedMs)}</Text>
          </View>
        ) : reopensAt ? (
          <View style={styles.counterBlock}>
            <Text style={styles.counterLabel}>Reabre</Text>
            <Text style={[styles.counterValue, { color: colors.routine }]}>
              {formatDate(reopensAt)}
            </Text>
          </View>
        ) : (
          <View style={styles.counterBlock}>
            <Text style={styles.counterLabel}>Pagada</Text>
            <Text style={[styles.counterValue, { color: colors.paid }]}>
              {formatDate(debt.cyclePaidAt!)}
            </Text>
          </View>
        )}

        {isPending ? (
          <Pressable
            onPress={handlePay}
            hitSlop={a11y.hitSlop}
            accessibilityRole="button"
            accessibilityLabel={`Marcar deuda de ${debt.debtorName} como pagada`}
            accessibilityHint="Registra el pago y, si es rutinaria, programa el próximo ciclo"
            style={({ pressed }) => [styles.payBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.payBtnText}>Pagada</Text>
          </Pressable>
        ) : null}
      </View>

      {debt.payments.length > 0 ? (
        <Text
          style={styles.history}
          accessibilityLabel={`Historial: ${debt.payments.length} pagos registrados`}
        >
          📒 {debt.payments.length} pago{debt.payments.length === 1 ? '' : 's'} registrado
          {debt.payments.length === 1 ? '' : 's'}
        </Text>
      ) : null}
    </Pressable>
  );
}

function KindBadge({ kind, pending }: { kind: string; pending: boolean }) {
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: pending ? colors.urgentBg : colors.paidBg },
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <Text
        style={[
          styles.badgeText,
          { color: pending ? colors.urgent : colors.paid },
        ]}
        numberOfLines={1}
      >
        {kind}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarText: {
    ...typography.heading,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  info: { flex: 1 },
  name: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  amount: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  badgeText: {
    ...typography.caption,
    fontWeight: '700',
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  counterBlock: { flex: 1 },
  counterLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  counterValue: {
    ...typography.heading,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  payBtn: {
    minHeight: a11y.minTouchTarget,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.paid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payBtnText: {
    ...typography.body,
    color: '#000',
    fontWeight: '800',
  },
  history: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
});
