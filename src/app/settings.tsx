import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Background } from '@/components/Background';
import { CurrencyPickerModal } from '@/components/CurrencyPickerModal';
import { IconButton } from '@/components/IconButton';
import { ListItem } from '@/components/ListItem';
import { useSettings } from '@/state/SettingsContext';
import { useDebts } from '@/state/DebtsContext';
import { getCurrency } from '@/lib/currencies';
import { getStorageKind } from '@/lib/storage';
import { isAvailable as notifAvailable } from '@/lib/notifications';
import { colors, spacing, typography } from '@/theme';

export default function SettingsScreen() {
  const { settings, update } = useSettings();
  const { changeAllCurrency } = useDebts();
  const [pickerOpen, setPickerOpen] = useState(false);

  const current = getCurrency(settings.currency);
  const storageKind = getStorageKind();
  const notifsOK = notifAvailable();

  const handleCurrencySelect = (code: string) => {
    update({ currency: code });
    changeAllCurrency(code);
  };

  return (
    <Background>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.headerBar}>
          <IconButton
            onPress={() => router.back()}
            accessibilityLabel="Volver"
            glyph="‹"
          />
          <Text style={styles.headerTitle} accessibilityRole="header">Ajustes</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionLabel} accessibilityRole="header">
            Generales
          </Text>
          <ListItem
            title="Divisa"
            subtitle={current.name}
            trailing={`${current.flag}  ${current.code}`}
            onPress={() => setPickerOpen(true)}
            accessibilityHint="Abre el selector de divisa. Cambiará la divisa de todas las deudas."
            showChevron
          />

          <Text style={styles.sectionLabel} accessibilityRole="header">
            Diagnóstico
          </Text>
          <ListItem
            title="Persistencia"
            subtitle={
              storageKind === 'async-storage'
                ? 'AsyncStorage activo: tus deudas se guardan al cerrar la app'
                : 'Memoria temporal: los datos se perderán al cerrar. Rebuild nativo necesario.'
            }
            trailing={storageKind === 'async-storage' ? 'OK' : '⚠'}
          />
          <ListItem
            title="Notificaciones"
            subtitle={
              notifsOK
                ? 'Módulo nativo disponible'
                : 'expo-notifications no detectado. Las campanas estarán inactivas hasta el próximo rebuild.'
            }
            trailing={notifsOK ? 'OK' : '⚠'}
          />

          <Text style={styles.sectionLabel} accessibilityRole="header">
            Próximamente
          </Text>
          <ListItem
            title="Tema"
            subtitle="Dark mode permanente por ahora"
          />
          <ListItem
            title="Exportar a CSV"
            subtitle="Compartir tu historial de deudas"
          />
          <ListItem
            title="Sincronización en la nube"
            subtitle="Tus datos viajarán contigo entre dispositivos"
          />

          <View style={{ height: spacing.xl }} />
          <Text style={styles.footer}>Blacklist 💀$ · v1.0</Text>
        </ScrollView>

        <CurrencyPickerModal
          visible={pickerOpen}
          selected={settings.currency}
          onSelect={handleCurrencySelect}
          onClose={() => setPickerOpen(false)}
        />
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
  sectionLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  footer: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
