import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Background } from '@/components/Background';
import { BellToggle } from '@/components/BellToggle';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { Input } from '@/components/Input';
import { TimeField } from '@/components/TimeField';
import { useDebts } from '@/state/DebtsContext';
import { nextDueDate } from '@/lib/debtCycles';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatElapsed,
} from '@/lib/format';
import { ensurePermissions } from '@/lib/notifications';
import { useElapsed } from '@/hooks/useElapsed';
import { a11y, colors, radius, spacing, typography } from '@/theme';

/**
 * Detalle + edición de una deuda.
 *
 * Diseño: el form está siempre presente. Cualquier cambio se aplica al pulsar
 * "Guardar cambios". Esto evita confusiones del usuario sobre qué se guardó.
 *
 * Edita: descripción, fecha prevista de pago, hora de notificación.
 * Toggle: campana de notificaciones.
 * Acciones: marcar pagada, eliminar.
 */
export default function DebtDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { debts, payDebt, removeDebt, editDebt } = useDebts();
  const debt = debts.find(d => d.id === id);

  if (!debt) {
    return (
      <Background>
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
          <View style={styles.notFound}>
            <Text style={styles.notFoundEmoji}>👻</Text>
            <Text style={styles.notFoundTitle}>Deuda no encontrada</Text>
            <Text style={styles.notFoundHint}>Quizá fue eliminada.</Text>
            <View style={{ height: spacing.lg }} />
            <Button label="Volver" onPress={() => router.back()} />
          </View>
        </SafeAreaView>
      </Background>
    );
  }

  return <DebtDetail debt={debt} />;
}

function DebtDetail({ debt }: { debt: ReturnType<typeof useDebts>['debts'][number] }) {
  const { payDebt, removeDebt, editDebt } = useDebts();

  const [description, setDescription] = useState(debt.description ?? '');
  const [dueDateText, setDueDateText] = useState(
    debt.dueDate ? debt.dueDate.slice(0, 10) : '',
  );
  const [hour, setHour] = useState(debt.notifyHour);
  const [minute, setMinute] = useState(debt.notifyMinute);
  const [dueError, setDueError] = useState<string | undefined>(undefined);

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

  const dirty =
    description !== (debt.description ?? '') ||
    dueDateText !== (debt.dueDate ? debt.dueDate.slice(0, 10) : '') ||
    hour !== debt.notifyHour ||
    minute !== debt.notifyMinute;

  const handleSave = useCallback(() => {
    // Validación de fecha (formato YYYY-MM-DD opcional).
    let dueDate: string | null = null;
    if (dueDateText.trim()) {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dueDateText.trim());
      if (!m) {
        setDueError('Formato esperado: AAAA-MM-DD (ej. 2026-06-15)');
        return;
      }
      const d = new Date(`${dueDateText.trim()}T12:00:00`);
      if (Number.isNaN(d.getTime())) {
        setDueError('Fecha inválida');
        return;
      }
      dueDate = d.toISOString();
    }
    setDueError(undefined);

    editDebt(debt.id, {
      description,
      dueDate,
      notifyHour: hour,
      notifyMinute: minute,
    });
    Alert.alert('Guardado', 'Los cambios se aplicaron correctamente.');
  }, [debt.id, description, dueDateText, hour, minute, editDebt]);

  const handleToggleBell = useCallback(async () => {
    if (!debt.notificationsEnabled) {
      const granted = await ensurePermissions();
      if (!granted) {
        Alert.alert(
          'Permiso necesario',
          'Para recibir recordatorios, activa las notificaciones de Blacklist en los ajustes del sistema.',
        );
        return;
      }
    }
    editDebt(debt.id, { notificationsEnabled: !debt.notificationsEnabled });
  }, [debt, editDebt]);

  const handlePay = useCallback(() => {
    Alert.alert(
      'Marcar como pagada',
      `¿${debt.debtorName} pagó ${formatCurrency(debt.amount, debt.currency)}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sí, pagada', onPress: () => payDebt(debt.id) },
      ],
    );
  }, [debt, payDebt]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Eliminar deuda',
      `Eliminar permanentemente la deuda de ${debt.debtorName}.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            removeDebt(debt.id);
            router.back();
          },
        },
      ],
    );
  }, [debt, removeDebt]);

  return (
    <Background>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.headerBar}>
          <IconButton
            onPress={() => router.back()}
            accessibilityLabel="Volver"
            glyph="‹"
          />
          <Text style={styles.headerTitle} accessibilityRole="header">Detalle</Text>
          <BellToggle
            enabled={debt.notificationsEnabled}
            onToggle={handleToggleBell}
            contextLabel={debt.debtorName}
          />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            {/* Cabecera */}
            <Text style={styles.bigName} accessibilityRole="header">
              {debt.debtorName}
            </Text>
            <Text style={styles.bigAmount}>
              {formatCurrency(debt.amount, debt.currency)}
            </Text>

            {/* Status */}
            <View style={styles.statusBox}>
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>Tipo</Text>
                <Text style={styles.statusValue}>{kindLabel}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>
                  {isPending ? 'Sin pagar desde' : reopensAt ? 'Reabre' : 'Pagada el'}
                </Text>
                <Text style={styles.statusValue}>
                  {isPending
                    ? formatElapsed(elapsedMs)
                    : reopensAt
                      ? formatDate(reopensAt)
                      : formatDate(debt.cyclePaidAt!)}
                </Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Creada</Text>
              <Text style={styles.metaValue}>{formatDateTime(debt.createdAt)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Ciclo actual</Text>
              <Text style={styles.metaValue}>{formatDateTime(debt.cycleStartedAt)}</Text>
            </View>

            {/* Form */}
            <Text style={styles.sectionTitle} accessibilityRole="header">
              Editar detalles
            </Text>

            <Input
              label="Descripción"
              placeholder="Concepto, contexto…"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              maxLength={200}
              optional
            />

            <Input
              label="Fecha prevista de pago"
              placeholder="AAAA-MM-DD"
              value={dueDateText}
              onChangeText={setDueDateText}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
              optional
              error={dueError}
              hint="Formato: AAAA-MM-DD (ej. 2026-06-15)"
            />

            <TimeField
              label="Hora del recordatorio diario"
              hour={hour}
              minute={minute}
              onChange={(h, m) => { setHour(h); setMinute(m); }}
              disabled={!debt.notificationsEnabled}
            />
            {!debt.notificationsEnabled ? (
              <Text style={styles.disabledHint}>
                Activa la campana arriba para programar el recordatorio.
              </Text>
            ) : null}

            <View style={{ height: spacing.lg }} />

            <Button
              label={dirty ? 'Guardar cambios' : 'Sin cambios'}
              onPress={handleSave}
              disabled={!dirty}
              fullWidth
            />

            <View style={{ height: spacing.lg }} />

            {/* Historial */}
            {debt.payments.length > 0 ? (
              <>
                <Text style={styles.sectionTitle} accessibilityRole="header">
                  Historial de pagos
                </Text>
                {debt.payments.map(p => (
                  <View key={p.id} style={styles.historyItem}>
                    <Text style={styles.historyDate}>{formatDateTime(p.paidAt)}</Text>
                    <Text style={styles.historyAmount}>
                      {formatCurrency(p.amount, debt.currency)}
                    </Text>
                  </View>
                ))}
                <View style={{ height: spacing.lg }} />
              </>
            ) : null}

            {/* Acciones */}
            {isPending ? (
              <Button
                label="Marcar como pagada"
                onPress={handlePay}
                fullWidth
              />
            ) : null}
            <View style={{ height: spacing.sm }} />
            <Button
              label="Eliminar deuda"
              onPress={handleDelete}
              variant="danger"
              fullWidth
              accessibilityHint="Elimina permanentemente la deuda y su historial"
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Background>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    ...typography.heading,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  bigName: {
    ...typography.title,
    color: colors.textPrimary,
  },
  bigAmount: {
    ...typography.display,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
    marginTop: spacing.xs,
  },
  statusBox: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  statusItem: { flex: 1 },
  divider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  statusLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  statusValue: {
    ...typography.heading,
    color: colors.textPrimary,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    marginTop: spacing.sm,
  },
  metaLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  metaValue: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  sectionTitle: {
    ...typography.heading,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  disabledHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  historyDate: {
    ...typography.body,
    color: colors.textSecondary,
  },
  historyAmount: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  notFoundEmoji: { fontSize: 56, marginBottom: spacing.md },
  notFoundTitle: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  notFoundHint: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
});
