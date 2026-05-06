import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Background } from '@/components/Background';
import { BellToggle } from '@/components/BellToggle';
import { Button } from '@/components/Button';
import { Checkbox } from '@/components/Checkbox';
import { IconButton } from '@/components/IconButton';
import { Input } from '@/components/Input';
import { MemberPaymentModal } from '@/components/MemberPaymentModal';
import { TimeField } from '@/components/TimeField';
import { useDebts } from '@/state/DebtsContext';
import { useSettings } from '@/state/SettingsContext';
import { nextDueDate, splitEqual, sumMembers } from '@/lib/debtCycles';
import { createId } from '@/lib/id';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatElapsed,
} from '@/lib/format';
import { ensurePermissions } from '@/lib/notifications';
import { useElapsed } from '@/hooks/useElapsed';
import { a11y, colors, radius, spacing, typography } from '@/theme';
import type { GroupMember, WeekDay } from '@/types/debt';

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
  const { payDebt, partialPayDebt, removeDebt, editDebt, payGroupMembers } = useDebts();
  const { settings } = useSettings();

  const isGroup = debt.kind === 'group';
  const [groupModalOpen, setGroupModalOpen] = useState(false);

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

  // amountCents debe declararse aquí (antes de los callbacks de grupo) para
  // evitar Temporal Dead Zone si los callbacks lo cierran.
  const amountCents = useMemo<number | null>(() => {
    const cleaned = amountText.replace(/[^0-9.,]/g, '').replace(',', '.');
    if (!cleaned) return null;
    const n = parseFloat(cleaned);
    if (Number.isNaN(n) || n <= 0) return null;
    return Math.round(n * 100);
  }, [amountText]);

  // ─── Estado grupal ──────────────────────────────────────────────────────
  // Trabajamos con copia local para edición. Se sincroniza al guardar.
  const [members, setMembers] = useState<GroupMember[]>(debt.members ?? []);
  const [customSplit, setCustomSplit] = useState<boolean>(debt.customSplit ?? false);
  // Texto del input de cantidad por miembro (solo aplica si customSplit)
  const [memberAmountText, setMemberAmountText] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    (debt.members ?? []).forEach(m => {
      init[m.id] = (m.amount / 100).toFixed(2);
    });
    return init;
  });

  const includeMe = useMemo(() => members.some(m => m.isMe), [members]);

  // Re-sync local cuando cambia el debt remoto (otro usuario marca como pagado)
  React.useEffect(() => {
    if (!isGroup) return;
    setMembers(debt.members ?? []);
    setCustomSplit(debt.customSplit ?? false);
    const next: Record<string, string> = {};
    (debt.members ?? []).forEach(m => {
      next[m.id] = (m.amount / 100).toFixed(2);
    });
    setMemberAmountText(next);
  }, [debt.members, debt.customSplit, isGroup]);

  /** Toggle "Yo": añade o quita miembro isMe=true y re-divide si no es custom. */
  const handleToggleMe = useCallback(() => {
    setMembers(prev => {
      let next: GroupMember[];
      if (prev.some(m => m.isMe)) {
        next = prev.filter(m => !m.isMe);
      } else {
        next = [
          { id: createId(), name: 'Yo', amount: 0, paidAt: null, isMe: true },
          ...prev,
        ];
      }
      // Re-dividir si no es custom
      if (!customSplit) {
        const total = amountCents ?? debt.amount;
        next = splitEqual(next, total);
      }
      // Actualizar texto
      const newText: Record<string, string> = {};
      next.forEach(m => {
        newText[m.id] = (m.amount / 100).toFixed(2);
      });
      setMemberAmountText(newText);
      return next;
    });
  }, [customSplit, debt.amount]);

  /** Cambia un texto de cantidad de miembro (solo en customSplit). */
  const handleMemberAmountChange = useCallback((memberId: string, value: string) => {
    setMemberAmountText(prev => ({ ...prev, [memberId]: value }));
    // Actualizar también el miembro en members (parsear)
    const cleaned = value.replace(/[^0-9.,]/g, '').replace(',', '.');
    const n = parseFloat(cleaned);
    const cents = Number.isNaN(n) ? 0 : Math.round(n * 100);
    setMembers(prev => prev.map(m => (m.id === memberId ? { ...m, amount: cents } : m)));
  }, []);

  /** Activar/desactivar custom split. Al desactivar, re-dividir equitativamente. */
  const handleToggleCustomSplit = useCallback(() => {
    setCustomSplit(prev => {
      const next = !prev;
      if (!next) {
        // Volver a equitativo
        setMembers(curr => {
          const total = amountCents ?? debt.amount;
          const equal = splitEqual(curr, total);
          const newText: Record<string, string> = {};
          equal.forEach(m => {
            newText[m.id] = (m.amount / 100).toFixed(2);
          });
          setMemberAmountText(newText);
          return equal;
        });
      }
      return next;
    });
  }, [debt.amount]);

  const isPending = debt.cyclePaidAt === null;
  const elapsedMs = useElapsed(debt.cycleStartedAt, isPending);

  const reopensAt = useMemo(
    () => (debt.kind === 'routine' && debt.cyclePaidAt ? nextDueDate(debt) : null),
    [debt],
  );

  const kindLabel = useMemo(() => {
    if (debt.kind === 'unique') return 'Única';
    if (debt.kind === 'group' && debt.members) {
      const paid = debt.members.filter(m => m.paidAt).length;
      return `Grupal · ${paid}/${debt.members.length} pagados`;
    }
    return debt.frequency === 'weekly' ? 'Rutinaria · semanal' : 'Rutinaria · mensual';
  }, [debt]);

  // Para grupales, comparamos members + customSplit con el debt remoto
  const groupDirty = useMemo(() => {
    if (!isGroup) return false;
    const orig = debt.members ?? [];
    if (members.length !== orig.length) return true;
    if (customSplit !== (debt.customSplit ?? false)) return true;
    for (let i = 0; i < members.length; i++) {
      const a = members[i];
      const b = orig.find(o => o.id === a.id);
      if (!b) return true;
      if (a.name !== b.name || a.amount !== b.amount || a.isMe !== b.isMe) return true;
    }
    return false;
  }, [isGroup, members, customSplit, debt.members, debt.customSplit]);

  const dirty =
    debtorName !== debt.debtorName ||
    amountCents !== debt.amount ||
    description !== (debt.description ?? '') ||
    (debt.kind === 'unique' && dueDateText !== (debt.dueDate ? debt.dueDate.slice(0, 10) : '')) ||
    hour !== debt.notifyHour ||
    minute !== debt.notifyMinute ||
    (debt.kind === 'routine' && debt.frequency === 'monthly' && reactivateDay !== (debt.reactivateDay ?? 1)) ||
    (debt.kind === 'routine' && debt.frequency === 'weekly' && reactivateWeekDay !== (debt.reactivateWeekDay ?? 1)) ||
    groupDirty;

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

    // ─── Caso especial: deuda grupal ─────────────────────────────────────
    if (isGroup) {
      let finalMembers = members;
      let finalAmount = amountCents;

      if (!customSplit) {
        // División equitativa: re-distribuir el total entre miembros
        finalMembers = splitEqual(members, finalAmount);
        commitGroupSave(finalAmount, finalMembers);
        return;
      }

      // División personalizada: validar que la suma cuadre con el total
      const sum = sumMembers(members);
      if (sum === amountCents) {
        commitGroupSave(finalAmount, finalMembers);
        return;
      }

      // No cuadra: preguntar al usuario qué hacer
      const sumStr = formatCurrency(sum, debt.currency);
      const totalStr = formatCurrency(amountCents, debt.currency);
      Alert.alert(
        'La división no cuadra',
        `La suma de las divisiones (${sumStr}) no coincide con el total (${totalStr}).\n\n¿Qué quieres hacer?`,
        [
          { text: 'Volver a editar', style: 'cancel' },
          {
            text: `Ajustar total a ${sumStr}`,
            onPress: () => {
              setAmountText((sum / 100).toFixed(2));
              commitGroupSave(sum, members);
            },
          },
        ],
      );
      return;
    }

    // ─── Caso estándar: unique / routine ─────────────────────────────────
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

    function commitGroupSave(amount: number, mems: GroupMember[]) {
      editDebt(debt.id, {
        debtorName,
        amount,
        description,
        notifyHour: hour,
        notifyMinute: minute,
        members: mems,
        customSplit,
      });
      Alert.alert('Guardado', 'Los cambios grupales se aplicaron correctamente.');
    }
  }, [debt.id, debt.kind, debt.frequency, debt.currency, debtorName, amountCents, description, dueDateText, hour, minute, reactivateDay, reactivateWeekDay, editDebt, isGroup, members, customSplit]);

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

            {/* Pago parcial — no aplica a grupales (cada miembro paga individual) */}
            {isPending && !isGroup ? (
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

            {/* ─── Sección Grupal: miembros + custom split ─────────────── */}
            {isGroup ? (
              <>
                <Text style={styles.sectionTitle} accessibilityRole="header">
                  Miembros
                </Text>
                <Text style={styles.sectionHint}>
                  La deuda se cierra cuando todos pagan. Toca el botón de cada miembro para registrar su pago.
                </Text>

                <View style={styles.groupBox}>
                  <Checkbox
                    checked={includeMe}
                    onToggle={() => { /* no-op: locked tras crear */ }}
                    disabled
                    label={includeMe ? 'Te incluyes en la división (Yo)' : 'No estás incluido en la división'}
                    hint="Esta elección se fijó al crear la deuda y no puede modificarse."
                  />
                </View>

                <View style={styles.groupBox}>
                  <Checkbox
                    checked={customSplit}
                    onToggle={handleToggleCustomSplit}
                    label="División personalizada"
                    hint="Si lo activas, podrás cambiar cuánto debe cada uno"
                  />
                </View>

                {members.map((m) => (
                  <View
                    key={m.id}
                    style={styles.memberRow}
                    accessible
                    accessibilityLabel={`${m.isMe ? 'Yo' : m.name}, ${formatCurrency(m.amount, debt.currency)}, ${m.paidAt ? 'pagado' : 'pendiente'}`}
                  >
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName} numberOfLines={1}>
                        {m.isMe ? '👤 Yo' : m.name}
                      </Text>
                      {customSplit ? (
                        <View style={styles.memberAmountInputWrap}>
                          <Text style={styles.memberPrefix}>{settings.currency}</Text>
                          <TextInput
                            value={memberAmountText[m.id] ?? ''}
                            onChangeText={(v) => handleMemberAmountChange(m.id, v)}
                            keyboardType="decimal-pad"
                            placeholder="0.00"
                            placeholderTextColor={colors.textMuted}
                            selectionColor={colors.focusRing}
                            style={styles.memberAmountInput}
                            accessibilityLabel={`Cantidad para ${m.name}`}
                          />
                        </View>
                      ) : (
                        <Text style={styles.memberAmount}>
                          {formatCurrency(m.amount, debt.currency)}
                        </Text>
                      )}
                    </View>

                    {/* Status only (sin botón). Los pagos se hacen vía la modal. */}
                    <View
                      style={[
                        styles.memberStatusBadge,
                        m.paidAt ? styles.memberStatusPaid : styles.memberStatusPending,
                      ]}
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                    >
                      <Text
                        style={[
                          styles.memberStatusText,
                          { color: m.paidAt ? '#000' : colors.textSecondary },
                        ]}
                      >
                        {m.paidAt ? '✓ Pagado' : 'Pendiente'}
                      </Text>
                    </View>
                  </View>
                ))}

                {customSplit ? (
                  <Text style={styles.sumHint}>
                    Suma actual: {formatCurrency(sumMembers(members), debt.currency)} ·
                    {' '}Total: {formatCurrency(amountCents ?? debt.amount, debt.currency)}
                  </Text>
                ) : null}

                <View style={{ height: spacing.lg }} />
              </>
            ) : null}

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
            {isPending && !isGroup ? (
              <Button
                label="Marcar como pagada"
                onPress={handlePay}
                fullWidth
              />
            ) : null}
            {isPending && isGroup ? (
              <>
                <Button
                  label="Pagar"
                  onPress={() => setGroupModalOpen(true)}
                  disabled={dirty}
                  fullWidth
                  accessibilityHint={
                    dirty
                      ? 'Guarda los cambios primero para poder pagar'
                      : 'Abre la lista para seleccionar quiénes pagan'
                  }
                />
                {dirty ? (
                  <Text style={styles.payAllBtnDisabledHint}>
                    ⚠ Guarda los cambios primero para habilitar el pago.
                  </Text>
                ) : null}
              </>
            ) : null}
            <View style={{ height: spacing.sm }} />
            <Button
              label="Eliminar deuda"
              onPress={handleDelete}
              variant="danger"
              fullWidth
              accessibilityHint="Elimina permanentemente la deuda y su historial"
            />

            {/* Modal de pago grupal */}
            {isGroup && debt.members ? (
              <MemberPaymentModal
                visible={groupModalOpen}
                members={debt.members}
                currency={debt.currency}
                debtTitle={debt.debtorName}
                onClose={() => setGroupModalOpen(false)}
                onConfirm={(ids) => {
                  payGroupMembers(debt.id, ids);
                  setGroupModalOpen(false);
                }}
              />
            ) : null}
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
  groupBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    minHeight: 64,
  },
  memberInfo: { flex: 1 },
  memberName: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  memberAmount: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  memberAmountInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    height: 36,
  },
  memberPrefix: {
    ...typography.caption,
    color: colors.textMuted,
    marginRight: spacing.xs,
  },
  memberAmountInput: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  memberStatusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
    marginLeft: spacing.sm,
    minWidth: 88,
    alignItems: 'center',
  },
  memberStatusPaid: {
    backgroundColor: colors.paid,
  },
  memberStatusPending: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  memberStatusText: {
    ...typography.caption,
    fontWeight: '800',
  },
  payAllBtnDisabledHint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: -spacing.xs,
    marginBottom: spacing.sm,
  },
  sumHint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
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
