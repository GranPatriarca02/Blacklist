import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { a11y, colors, radius, spacing, typography } from '@/theme';
import { Button } from './Button';
import { Checkbox } from './Checkbox';
import type { GroupMember } from '@/types/debt';
import { formatCurrency } from '@/lib/format';

interface MemberPaymentModalProps {
  visible: boolean;
  members: ReadonlyArray<GroupMember>;
  currency: string;
  /** Título de la deuda (para el header del modal). */
  debtTitle: string;
  onConfirm: (selectedIds: string[]) => void;
  onClose: () => void;
}

/**
 * Modal full-screen con lista de miembros pendientes y multi-selección.
 *
 * - Solo muestra miembros pendientes (paidAt === null). Los ya pagados
 *   aparecen en el listado pero deshabilitados con badge "Pagado".
 * - Multi-select con Checkbox accesibles.
 * - "Confirmar" deshabilitado si no hay nada seleccionado.
 * - Al confirmar, llama `onConfirm(selectedIds[])` y cierra.
 */
export function MemberPaymentModal({
  visible,
  members,
  currency,
  debtTitle,
  onConfirm,
  onClose,
}: MemberPaymentModalProps) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  // Reset selección al abrir/cerrar
  useEffect(() => {
    if (!visible) setSelected(new Set());
  }, [visible]);

  const pendingMembers = useMemo(
    () => members.filter(m => !m.paidAt),
    [members],
  );
  const paidMembers = useMemo(
    () => members.filter(m => !!m.paidAt),
    [members],
  );

  const totalSelected = useMemo(() => {
    return members
      .filter(m => selected.has(m.id))
      .reduce((acc, m) => acc + m.amount, 0);
  }, [members, selected]);

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === pendingMembers.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pendingMembers.map(m => m.id)));
    }
  };

  const allSelected =
    pendingMembers.length > 0 && selected.size === pendingMembers.length;

  const handleConfirm = () => {
    if (selected.size === 0) return;
    onConfirm(Array.from(selected));
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.headerBar}>
          <Pressable
            onPress={onClose}
            hitSlop={a11y.hitSlop}
            accessibilityRole="button"
            accessibilityLabel="Cerrar selector de pago"
            style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}
          >
            <Text style={styles.closeGlyph} allowFontScaling={false}>✕</Text>
          </Pressable>
          <Text style={styles.headerTitle} accessibilityRole="header" numberOfLines={1}>
            ¿Quién paga?
          </Text>
          <View style={styles.closeBtn} />
        </View>

        <Text style={styles.subtitle} numberOfLines={1}>
          {debtTitle}
        </Text>

        <ScrollView contentContainerStyle={styles.content}>
          {pendingMembers.length === 0 ? (
            <View style={styles.allDone}>
              <Text style={styles.allDoneEmoji}>🎉</Text>
              <Text style={styles.allDoneTitle}>Todos pagaron</Text>
              <Text style={styles.allDoneHint}>
                No hay miembros pendientes en esta deuda.
              </Text>
            </View>
          ) : (
            <>
              <Pressable
                onPress={toggleAll}
                hitSlop={a11y.hitSlop}
                accessibilityRole="button"
                accessibilityLabel={allSelected ? 'Deseleccionar todos' : 'Seleccionar todos los pendientes'}
                style={({ pressed }) => [styles.selectAll, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.selectAllText}>
                  {allSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}
                </Text>
              </Pressable>

              {pendingMembers.map(m => {
                const isSelected = selected.has(m.id);
                return (
                  <View key={m.id} style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Checkbox
                        checked={isSelected}
                        onToggle={() => toggleOne(m.id)}
                        label={m.isMe ? '👤 Yo' : m.name}
                        hint={formatCurrency(m.amount, currency)}
                      />
                    </View>
                  </View>
                );
              })}
            </>
          )}

          {paidMembers.length > 0 ? (
            <View style={styles.paidSection}>
              <Text style={styles.paidLabel} accessibilityRole="header">
                Ya pagaron
              </Text>
              {paidMembers.map(m => (
                <View key={m.id} style={styles.paidRow}>
                  <Text style={styles.paidName}>
                    {m.isMe ? '👤 Yo' : m.name}
                  </Text>
                  <Text style={styles.paidAmount}>
                    ✓ {formatCurrency(m.amount, currency)}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </ScrollView>

        {pendingMembers.length > 0 ? (
          <View style={styles.footer}>
            <Text style={styles.footerSummary}>
              {selected.size === 0
                ? 'Selecciona al menos un miembro'
                : `${selected.size} seleccionado${selected.size === 1 ? '' : 's'} · ${formatCurrency(totalSelected, currency)}`}
            </Text>
            <Button
              label="Confirmar pagos"
              onPress={handleConfirm}
              disabled={selected.size === 0}
              fullWidth
              accessibilityHint="Marca a los miembros seleccionados como pagados"
            />
            <View style={{ height: spacing.xs }} />
            <Button label="Cancelar" variant="ghost" onPress={onClose} fullWidth />
          </View>
        ) : (
          <View style={styles.footer}>
            <Button label="Cerrar" onPress={onClose} fullWidth />
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
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
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  selectAll: {
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  selectAllText: {
    ...typography.caption,
    color: colors.brandMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
  },
  allDone: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  allDoneEmoji: { fontSize: 48, marginBottom: spacing.md },
  allDoneTitle: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  allDoneHint: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  paidSection: {
    marginTop: spacing.lg,
  },
  paidLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  paidRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.paidBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.paid,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  paidName: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  paidAmount: {
    ...typography.body,
    color: colors.paid,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  footerSummary: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
});
