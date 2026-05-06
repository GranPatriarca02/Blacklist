import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { a11y, colors, radius, spacing, typography } from '@/theme';
import { Checkbox } from './Checkbox';
import { Input } from './Input';
import { GROUP_MAX_TOTAL, GROUP_MIN_DEBTORS } from '@/lib/debtCycles';

export interface GroupFormResult {
  title: string;
  amountCents: number;
  description?: string;
  members: { name: string; isMe: boolean }[];
}

interface GroupFormProps {
  currencyCode: string;
  currencySymbol: string;
  currencyName: string;
  /** Callback cuando el form quiere validar/recolectar datos. */
  onResultChange?: (result: GroupFormResult | null) => void;
  /** Errores externos (post-submit). */
  externalErrors?: { title?: string; amount?: string; members?: string };
}

/**
 * Form de creación de deuda grupal.
 *
 * Reglas:
 *  - Mínimo 2 deudores (sin contar "Yo").
 *  - Máximo `GROUP_MAX_TOTAL` deudores incluyendo "Yo" (24).
 *  - Botón "+" sólo funciona si los deudores anteriores tienen nombre.
 *  - Botón "−" sólo si hay > 2 deudores.
 *
 * Comunicación con el padre vía `onResultChange`: el padre recibe el resultado
 * agregado (o null si inválido). Mantiene el form como componente puro.
 */
export function GroupForm({
  currencyCode,
  currencySymbol,
  currencyName,
  onResultChange,
  externalErrors,
}: GroupFormProps) {
  const [title, setTitle] = useState('');
  const [amountText, setAmountText] = useState('');
  const [description, setDescription] = useState('');
  const [includeMe, setIncludeMe] = useState(true);
  const [debtorNames, setDebtorNames] = useState<string[]>(['', '']);

  const amountCents = useMemo<number | null>(() => {
    const cleaned = amountText.replace(/[^0-9.,]/g, '').replace(',', '.');
    if (!cleaned) return null;
    const n = parseFloat(cleaned);
    if (Number.isNaN(n) || n <= 0) return null;
    return Math.round(n * 100);
  }, [amountText]);

  const totalSlots = debtorNames.length + (includeMe ? 1 : 0);
  const lastIsFilled = debtorNames[debtorNames.length - 1]?.trim().length > 0;
  const canAddMore = lastIsFilled && totalSlots < GROUP_MAX_TOTAL;
  const canRemove = debtorNames.length > GROUP_MIN_DEBTORS;

  // Reportar resultado al padre cuando algo cambia
  React.useEffect(() => {
    const trimmedNames = debtorNames.map(n => n.trim());
    const allFilled = trimmedNames.every(n => n.length > 0);
    if (
      !title.trim() ||
      amountCents === null ||
      !allFilled ||
      trimmedNames.length < GROUP_MIN_DEBTORS
    ) {
      onResultChange?.(null);
      return;
    }
    const members = trimmedNames.map(name => ({ name, isMe: false }));
    if (includeMe) members.unshift({ name: 'Yo', isMe: true });
    onResultChange?.({
      title: title.trim(),
      amountCents,
      description: description.trim() || undefined,
      members,
    });
  }, [title, amountCents, description, includeMe, debtorNames, onResultChange]);

  const handleAdd = useCallback(() => {
    if (totalSlots >= GROUP_MAX_TOTAL) {
      Alert.alert(
        'Máximo alcanzado',
        `No puedes añadir más de ${GROUP_MAX_TOTAL} deudores en una deuda grupal (incluyéndote a ti).`,
      );
      return;
    }
    if (!lastIsFilled) {
      Alert.alert(
        'Completa los nombres anteriores',
        'Escribe el nombre del último deudor antes de añadir otro.',
      );
      return;
    }
    setDebtorNames(prev => [...prev, '']);
  }, [totalSlots, lastIsFilled]);

  const handleRemove = useCallback(() => {
    if (!canRemove) return;
    setDebtorNames(prev => prev.slice(0, -1));
  }, [canRemove]);

  const updateName = useCallback((idx: number, value: string) => {
    setDebtorNames(prev => prev.map((n, i) => (i === idx ? value : n)));
  }, []);

  return (
    <View>
      <Input
        label="Título"
        placeholder="Ej. Cena del viernes"
        value={title}
        onChangeText={setTitle}
        autoCapitalize="sentences"
        maxLength={60}
        error={externalErrors?.title}
        hint="Concepto del gasto compartido"
      />

      <Input
        label={`Cantidad total (${currencyCode})`}
        placeholder="0.00"
        value={amountText}
        onChangeText={setAmountText}
        keyboardType="decimal-pad"
        prefix={currencySymbol}
        maxLength={12}
        error={externalErrors?.amount}
        hint={`Divisa: ${currencyName}. Se dividirá equitativamente.`}
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
      />

      <View style={styles.meBlock}>
        <Checkbox
          checked={includeMe}
          onToggle={() => setIncludeMe(v => !v)}
          label="Yo"
          hint="Inclúyeme en la división de la deuda"
        />
      </View>

      <Text style={styles.fieldLabel}>Deudores</Text>
      <Text style={styles.hint}>
        Mínimo {GROUP_MIN_DEBTORS} deudores. Total máximo {GROUP_MAX_TOTAL} (contándote a ti).
        {' '}Total actual: {totalSlots}.
      </Text>

      {debtorNames.map((name, idx) => (
        <View key={idx} style={styles.debtorRow}>
          <Text style={styles.debtorNumber} allowFontScaling={false}>
            {idx + 1}.
          </Text>
          <TextInput
            value={name}
            onChangeText={(v) => updateName(idx, v)}
            placeholder={`Nombre del deudor ${idx + 1}`}
            placeholderTextColor={colors.textMuted}
            selectionColor={colors.focusRing}
            style={styles.debtorInput}
            autoCapitalize="words"
            maxLength={40}
            accessibilityLabel={`Nombre del deudor ${idx + 1}`}
          />
        </View>
      ))}

      {externalErrors?.members ? (
        <Text style={styles.errorText} accessibilityLiveRegion="polite">
          {externalErrors.members}
        </Text>
      ) : null}

      <View style={styles.btnRow}>
        <Pressable
          onPress={handleRemove}
          hitSlop={a11y.hitSlop}
          disabled={!canRemove}
          accessibilityRole="button"
          accessibilityLabel="Quitar último deudor"
          accessibilityState={{ disabled: !canRemove }}
          style={({ pressed }) => [
            styles.iconBtn,
            !canRemove && styles.iconBtnDisabled,
            pressed && canRemove && { opacity: 0.6 },
          ]}
        >
          <Text style={styles.iconBtnGlyph} allowFontScaling={false}>−</Text>
        </Pressable>
        <Pressable
          onPress={handleAdd}
          hitSlop={a11y.hitSlop}
          disabled={!canAddMore}
          accessibilityRole="button"
          accessibilityLabel="Añadir otro deudor"
          accessibilityState={{ disabled: !canAddMore }}
          accessibilityHint={
            !lastIsFilled
              ? 'Completa el último nombre primero'
              : totalSlots >= GROUP_MAX_TOTAL
                ? `Máximo ${GROUP_MAX_TOTAL} alcanzado`
                : undefined
          }
          style={({ pressed }) => [
            styles.iconBtn,
            !canAddMore && styles.iconBtnDisabled,
            pressed && canAddMore && { opacity: 0.6 },
          ]}
        >
          <Text style={styles.iconBtnGlyph} allowFontScaling={false}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  meBlock: {
    marginVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fieldLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  debtorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    minHeight: 52,
    marginBottom: spacing.sm,
  },
  debtorNumber: {
    ...typography.body,
    color: colors.textMuted,
    width: 28,
  },
  debtorInput: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    paddingVertical: spacing.sm,
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  iconBtn: {
    width: a11y.minTouchTarget,
    height: a11y.minTouchTarget,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnDisabled: { opacity: 0.3 },
  iconBtnGlyph: {
    ...typography.title,
    color: colors.textPrimary,
    fontWeight: '900',
    lineHeight: 32,
  },
  errorText: {
    ...typography.caption,
    color: colors.urgent,
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
  },
});
