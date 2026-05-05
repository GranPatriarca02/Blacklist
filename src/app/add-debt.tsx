import React, { useCallback, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Background } from '@/components/Background';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { SegmentedControl, type Segment } from '@/components/SegmentedControl';
import { useDebts } from '@/state/DebtsContext';
import { useSettings } from '@/state/SettingsContext';
import { getCurrency } from '@/lib/currencies';
import type { DebtKind, Frequency, NewDebtInput } from '@/types/debt';
import { a11y, colors, spacing, typography } from '@/theme';

const KIND_SEGMENTS: ReadonlyArray<Segment<DebtKind>> = [
  {
    value: 'unique',
    label: 'Única',
    accessibilityHint: 'Una sola deuda que se cierra al pagarla',
  },
  {
    value: 'routine',
    label: 'Rutinaria',
    accessibilityHint: 'Deuda recurrente que se reabre cada periodo',
  },
];

const FREQ_SEGMENTS: ReadonlyArray<Segment<Frequency>> = [
  { value: 'weekly',  label: 'Semanal' },
  { value: 'monthly', label: 'Mensual' },
];

interface FormErrors {
  debtorName?: string;
  amount?: string;
}

export default function AddDebtModal() {
  const { addDebt } = useDebts();
  const { settings } = useSettings();
  const currentCurrency = getCurrency(settings.currency);

  const [kind, setKind] = useState<DebtKind>('unique');
  const [frequency, setFrequency] = useState<Frequency>('monthly');
  const [debtorName, setDebtorName] = useState('');
  const [amountText, setAmountText] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  /** Convierte "12.50" / "12,50" / "12" a centavos. Devuelve null si inválido. */
  const amountCents = useMemo<number | null>(() => {
    const cleaned = amountText.replace(/[^0-9.,]/g, '').replace(',', '.');
    if (!cleaned) return null;
    const n = parseFloat(cleaned);
    if (Number.isNaN(n) || n <= 0) return null;
    return Math.round(n * 100);
  }, [amountText]);

  const validate = useCallback((): FormErrors => {
    const e: FormErrors = {};
    if (!debtorName.trim()) e.debtorName = 'Escribe el nombre de quien te debe';
    if (amountCents === null) e.amount = 'Ingresa una cantidad mayor a 0';
    return e;
  }, [debtorName, amountCents]);

  const handleSave = useCallback(() => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0 || amountCents === null) return;

    const input: NewDebtInput = {
      kind,
      debtorName: debtorName.trim(),
      amount: amountCents,
      currency: settings.currency,
      description: description.trim() || undefined,
      frequency: kind === 'routine' ? frequency : undefined,
    };

    addDebt(input);
    router.back();
  }, [kind, frequency, debtorName, amountCents, description, validate, addDebt]);

  const handleCancel = useCallback(() => {
    router.back();
  }, []);

  return (
    <Background>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.headerBar}>
          <Pressable
            onPress={handleCancel}
            hitSlop={a11y.hitSlop}
            accessibilityRole="button"
            accessibilityLabel="Cancelar y cerrar"
            style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}
          >
            <Text style={styles.closeGlyph} allowFontScaling={false}>✕</Text>
          </Pressable>
          <Text style={styles.headerTitle} accessibilityRole="header">
            Nueva deuda
          </Text>
          <View style={styles.closeBtn} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.fieldLabel}>Tipo de deuda</Text>
            <SegmentedControl
              segments={KIND_SEGMENTS}
              value={kind}
              onChange={setKind}
              accessibilityLabel="Tipo de deuda: única o rutinaria"
            />

            <View style={{ height: spacing.lg }} />

            <Input
              label="Nombre"
              placeholder="Ej. Carlos"
              value={debtorName}
              onChangeText={setDebtorName}
              autoCapitalize="words"
              autoComplete="name"
              maxLength={60}
              error={errors.debtorName}
              hint="Persona que te debe"
            />

            <Input
              label={`Cantidad (${currentCurrency.code})`}
              placeholder="0.00"
              value={amountText}
              onChangeText={setAmountText}
              keyboardType="decimal-pad"
              prefix={currentCurrency.symbol}
              maxLength={12}
              error={errors.amount}
              hint={`Divisa: ${currentCurrency.name}. Cambia en ajustes si quieres otra.`}
            />

            <Input
              label="Descripción"
              placeholder="Concepto, contexto o nota…"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              maxLength={200}
              optional
              hint="Opcional, hasta 200 caracteres"
            />

            {kind === 'routine' ? (
              <View style={styles.freqBlock}>
                <Text style={styles.fieldLabel}>Frecuencia</Text>
                <SegmentedControl
                  segments={FREQ_SEGMENTS}
                  value={frequency}
                  onChange={setFrequency}
                  accessibilityLabel="Frecuencia de la deuda rutinaria"
                />
                <Text style={styles.freqHint}>
                  Al marcarla pagada, se reabrirá automáticamente cada {frequency === 'weekly' ? 'semana' : 'mes'}.
                </Text>
              </View>
            ) : null}

            <View style={{ height: spacing.xl }} />

            <Button
              label="Guardar deuda"
              onPress={handleSave}
              fullWidth
              accessibilityHint="Crea la deuda y vuelve a la pantalla principal"
            />
            <View style={{ height: spacing.sm }} />
            <Button
              label="Cancelar"
              variant="ghost"
              onPress={handleCancel}
              fullWidth
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
  closeBtn: {
    width: a11y.minTouchTarget,
    height: a11y.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeGlyph: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  headerTitle: {
    ...typography.heading,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  fieldLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  freqBlock: { marginTop: spacing.md },
  freqHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
});
