import React from 'react';
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
import { groupedByContinent, type CurrencyDef } from '@/lib/currencies';

interface CurrencyPickerModalProps {
  visible: boolean;
  selected: string;
  onSelect: (code: string) => void;
  onClose: () => void;
}

/**
 * Modal full-screen con divisas agrupadas por continente.
 */
export function CurrencyPickerModal({
  visible,
  selected,
  onSelect,
  onClose,
}: CurrencyPickerModalProps) {
  const groups = groupedByContinent();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.headerBar}>
          <Pressable
            onPress={onClose}
            hitSlop={a11y.hitSlop}
            accessibilityRole="button"
            accessibilityLabel="Cerrar selector de divisa"
            style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}
          >
            <Text style={styles.closeGlyph} allowFontScaling={false}>✕</Text>
          </Pressable>
          <Text style={styles.headerTitle} accessibilityRole="header">
            Elige tu divisa
          </Text>
          <View style={styles.closeBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {groups.map(g => (
            <View key={g.continent} style={styles.section}>
              <Text style={styles.sectionLabel} accessibilityRole="header">
                {g.continent}
              </Text>
              {g.items.map(c => (
                <CurrencyRow
                  key={c.code}
                  currency={c}
                  selected={c.code === selected}
                  onSelect={() => {
                    onSelect(c.code);
                    onClose();
                  }}
                />
              ))}
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function CurrencyRow({
  currency,
  selected,
  onSelect,
}: {
  currency: CurrencyDef;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <Pressable
      onPress={onSelect}
      hitSlop={a11y.hitSlop}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${currency.name}, código ${currency.code}, símbolo ${currency.symbol}`}
      style={({ pressed }) => [
        styles.row,
        selected && styles.rowSelected,
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text
        style={styles.flag}
        accessibilityElementsHidden
        importantForAccessibility="no"
        allowFontScaling={false}
      >
        {currency.flag}
      </Text>
      <View style={styles.rowBody}>
        <Text style={styles.rowName}>{currency.name}</Text>
        <Text style={styles.rowMeta}>{currency.code} · {currency.symbol}</Text>
      </View>
      {selected ? (
        <Text
          style={styles.check}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          ✓
        </Text>
      ) : null}
    </Pressable>
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
  content: {
    padding: spacing.lg,
  },
  section: { marginBottom: spacing.lg },
  sectionLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    minHeight: a11y.minTouchTarget,
  },
  rowSelected: {
    borderColor: colors.brandMuted,
    backgroundColor: colors.surfaceElevated,
  },
  flag: { fontSize: 28, marginRight: spacing.md },
  rowBody: { flex: 1 },
  rowName: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  rowMeta: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  check: {
    fontSize: 22,
    color: colors.paid,
    marginLeft: spacing.sm,
    fontWeight: '900',
  },
});
