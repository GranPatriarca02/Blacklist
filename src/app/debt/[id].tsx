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
import { useSettings } from '@/state/SettingsContext';
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
import type { WeekDay } from '@/types/debt';

const WEEK_DAYS: { value: WeekDay; label: string }[] = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
];

const MONTH_DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

/**
 * Detalle + edición de una deuda.
 *
 * Edita: nombre, cantidad, descripción, hora de notificación,
 *        fecha prevista de pago (solo únicas), día de reactivación (rutinarias).
 * Acciones: pago completo, pago parcial, eliminar.
 */
export default function DebtDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { debts } = useDebts();
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
  const { payDebt, partialPayDebt, removeDebt, editDebt } = useDebts();
  const { settings } = useSettings();

  const [debtorName, setDebtorName] = useState(debt.debtorName);
  const [amountText, setAmountText] = useState(String(debt.amount / 100));
  const [description, setDescription] = useState(debt.description ?? '');
  const [dueDateText, setDueDateText] = useState(
    debt.dueDate ? debt.dueDate.slice(0, 10) : '',
  );
  const [hour, setHour] = useState(debt.notifyHour);
  const [minute, setMinute] = useState(debt.notifyMinute);
  const [dueError, setDueError] = useState<string | undefined>(undefined);
  const [nameError, setNameError] = useState<string | undefined>(undefined);
  const [amountError, setAmountError] = useState<string | undefined>(undefined);

  // Reactivation fields
  const [reactivateDay, setReactivateDay] = useState(debt.reactivateDay ?? 1);
  const [reactivateWeekDay, setReactivateWeekDay] = useState<WeekDay>(debt.reactivateWeekDay ?? 1);

  // Partial payment
  const [partialText, setPartialText] = useState('');
  const [partialError, setPartialError] = useState<string | undefined>(undefined);

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

  const amountCents = useMemo<number | null>(() => {
    const cleaned = amountText.replace(/[^0-9.,]/g, '').replace(',', '.');
    if (!cleaned) return null;
    const n = parseFloat(cleaned);
    if (Number.isNaN(n) || n <= 0) return null;
    return Math.round(n * 100);
  }, [amountText]);

  const dirty =
    debtorName !== debt.debtorName ||
    amountCents !== debt.amount ||
    description !== (debt.description ?? '') ||
    (debt.kind === 'unique' && dueDateText !== (debt.dueDate ? debt.dueDate.slice(0, 10) : '')) ||
    hour !== debt.notifyHour ||
    minute !== debt.notifyMinute ||
    (debt.kind === 'routine' && debt.frequency === 'monthly' && reactivateDay !== (debt.reactivateDay ?? 1)) ||
    (debt.kind === 'routine' && debt.frequency === 'weekly' && reactivateWeekDay !== (debt.reactivateWeekDay ?? 1));

  const handleSave = useCallback(() => {
    let hasErrors = false;

    // Validate name
    if (!debtorName.trim()) {
      setNameError('El nombre no puede estar vacío');
      hasErrors = true;
    } else {
      setNameError(undefined);
    }

    // Validate amount
    if (amountCents === null) {
      setAmountError('Ingresa una cantidad mayor a 0');
      hasErrors = true;
    } else {
      setAmountError(undefined);
    }

    // Validación de fecha prevista (solo para deudas únicas).
    let dueDate: string | null = null;
    if (debt.kind === 'unique' && dueDateText.trim()) {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dueDateText.trim());
      if (!m) {
        setDueError('Formato esperado: AAAA-MM-DD (ej. 2026-06-15)');
        hasErrors = true;
      } else {
        const d = new Date(`${dueDateText.trim()}T12:00:00`);
        if (Number.isNaN(d.getTime())) {
          setDueError('Fecha inválida');
          hasErrors = true;
        } else {
          dueDate = d.toISOString();
          setDueError(undefined);
        }
      }
    } else {
      setDueError(undefined);
    }

    if (hasErrors || amountCents === null) return;

    editDebt(debt.id, {
      debtorName,
      amount: amountCents,
      description,
      ...(debt.kind === 'unique' ? { dueDate } : {}),
      notifyHour: hour,
      notifyMinute: minute,
      ...(debt.kind === 'routine' && debt.frequency === 'monthly' ? { reactivateDay } : {}),
      ...(debt.kind === 'routine' && debt.frequency === 'weekly' ? { reactivateWeekDay } : {}),
    });
    Alert.alert('Guardado', 'Los cambios se aplicaron correctamente.');
  }, [debt.id, debt.kind, debt.frequency, debtorName, amountCents, description, dueDateText, hour, minute, reactivateDay, reactivateWeekDay, editDebt]);

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

  const handlePartialPay = useCallback(() => {
    const cleaned = partialText.replace(/[^0-9.,]/g, '').replace(',', '.');
    const n = parseFloat(cleaned);
    if (!cleaned || Number.isNaN(n) || n <= 0) {
      setPartialError('Ingresa una cantidad mayor a 0');
      return;
    }
    const cents = Math.round(n * 100);
    if (cents > debt.amount) {
      setPartialError(`Máximo: ${formatCurrency(debt.amount, debt.currency)}`);
      return;
    }
    setPartialError(undefined);
    Alert.alert(
      'Pago parcial',
      `¿Registrar pago parcial de ${formatCurrency(cents, debt.currency)} de ${debt.debtorName}?\n\nLa deuda pasará de ${formatCurrency(debt.amount, debt.currency)} a ${formatCurrency(debt.amount - cents, debt.currency)}.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Registrar',
          onPress: () => {
            partialPayDebt(debt.id, cents);
            setPartialText('');
          },
        },
      ],
    );
  }, [debt, partialText, partialPayDebt]);

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

            {/* Pago parcial */}
            {isPending ? (
              <>
                <Text style={styles.sectionTitle} accessibilityRole="header">
                  Pago parcial
                </Text>
                <Text style={styles.sectionHint}>
                  Registra un abono sin cerrar la deuda. La cantidad se restará del monto pendiente.
                </Text>
                <View style={styles.partialRow}>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Cantidad a abonar"
                      placeholder="0.00"
                      value={partialText}
                      onChangeText={setPartialText}
                      keyboardType="decimal-pad"
                      maxLength={12}
                      error={partialError}
                    />
                  </View>
                  <View style={{ width: spacing.sm }} />
                  <Button
                    label="Abonar"
                    onPress={handlePartialPay}
                    accessibilityHint="Registra un pago parcial de la deuda"
                  />
                </View>
              </>
            ) : null}

            {/* Form edición */}
            <Text style={styles.sectionTitle} accessibilityRole="header">
              Editar detalles
            </Text>

            <Input
              label="Nombre"
              placeholder="Nombre del deudor"
              value={debtorName}
              onChangeText={setDebtorName}
              autoCapitalize="words"
              maxLength={60}
              error={nameError}
            />

            <Input
              label={`Cantidad (${settings.currency})`}
              placeholder="0.00"
              value={amountText}
              onChangeText={setAmountText}
              keyboardType="decimal-pad"
              maxLength={12}
              error={amountError}
              hint="Introduce la cantidad en la unidad principal (no centavos)"
            />

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

            {/* Fecha prevista de pago — solo para deudas únicas */}
            {debt.kind === 'unique' ? (
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
            ) : null}

            {/* Reactivation day for routine debts */}
            {debt.kind === 'routine' && debt.frequency === 'monthly' ? (
              <>
                <Text style={styles.fieldLabel}>Día de reactivación mensual</Text>
                <Text style={styles.sectionHint}>
                  Día del mes en que se reabrirá la deuda. Si el mes no tiene ese día (ej: 31 en febrero), se usará el último día del mes.
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.dayScroll}
                  contentContainerStyle={styles.dayScrollContent}
                >
                  {MONTH_DAYS.map(day => (
                    <Pressable
                      key={day}
                      onPress={() => setReactivateDay(day)}
                      style={[
                        styles.dayChip,
                        reactivateDay === day && styles.dayChipActive,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Día ${day}`}
                      accessibilityState={{ selected: reactivateDay === day }}
                    >
                      <Text
                        style={[
                          styles.dayChipText,
                          reactivateDay === day && styles.dayChipTextActive,
                        ]}
                      >
                        {day}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            ) : null}

            {debt.kind === 'routine' && debt.frequency === 'weekly' ? (
              <>
                <Text style={styles.fieldLabel}>Día de reactivación semanal</Text>
                <Text style={styles.sectionHint}>
                  Día de la semana en que se reabrirá la deuda.
                </Text>
                <View style={styles.weekDayRow}>
                  {WEEK_DAYS.map(wd => (
                    <Pressable
                      key={wd.value}
                      onPress={() => setReactivateWeekDay(wd.value)}
                      style={[
                        styles.weekDayChip,
                        reactivateWeekDay === wd.value && styles.dayChipActive,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={wd.label}
                      accessibilityState={{ selected: reactivateWeekDay === wd.value }}
                    >
                      <Text
                        style={[
                          styles.dayChipText,
                          reactivateWeekDay === wd.value && styles.dayChipTextActive,
                        ]}
                      >
                        {wd.label.slice(0, 3)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}

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
                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyDate}>{formatDateTime(p.paidAt)}</Text>
                      {p.isPartial ? (
                        <Text style={styles.partialBadge}>Pago parcial</Text>
                      ) : null}
                    </View>
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
  sectionHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.md,
    marginTop: -spacing.xs,
  },
  fieldLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  disabledHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  partialRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  dayScroll: {
    marginBottom: spacing.md,
  },
  dayScrollContent: {
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  dayChip: {
    minWidth: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  dayChipActive: {
    backgroundColor: colors.paid,
    borderColor: colors.paid,
  },
  dayChipText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  dayChipTextActive: {
    color: '#000',
    fontWeight: '800',
  },
  weekDayRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  weekDayChip: {
    paddingHorizontal: spacing.md,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  partialBadge: {
    ...typography.caption,
    color: colors.routine,
    fontWeight: '700',
    marginTop: 2,
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
