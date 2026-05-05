import React, { useEffect, useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Background } from '@/components/Background';
import { BellToggle } from '@/components/BellToggle';
import { IconButton } from '@/components/IconButton';
import { TimeField } from '@/components/TimeField';
import { useDebts } from '@/state/DebtsContext';
import { useSettings } from '@/state/SettingsContext';
import { paymentsByMonth, totalOwed, type MonthlyBucket } from '@/lib/debtCycles';
import { formatCurrency } from '@/lib/format';
import { ensurePermissions, syncTotalNotification } from '@/lib/notifications';
import { colors, radius, spacing, typography } from '@/theme';

export default function TotalScreen() {
  const { debts } = useDebts();
  const { settings, update } = useSettings();

  const total = useMemo(() => totalOwed(debts), [debts]);
  const pendingCount = useMemo(() => debts.filter(d => !d.cyclePaidAt).length, [debts]);

  const monthly: MonthlyBucket[] = useMemo(
    () => paymentsByMonth(debts, 6),
    [debts],
  );
  const maxBucket = useMemo(
    () => Math.max(1, ...monthly.map(b => b.total)),
    [monthly],
  );

  // Re-sincroniza notificación del total cuando cambian deudas o settings.
  useEffect(() => {
    void syncTotalNotification(debts, settings).then(newId => {
      if (newId !== settings.totalNotificationId) {
        update({ totalNotificationId: newId ?? undefined });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    debts,
    settings.totalNotificationsEnabled,
    settings.totalNotifyHour,
    settings.totalNotifyMinute,
  ]);

  const handleToggleBell = async () => {
    if (!settings.totalNotificationsEnabled) {
      const granted = await ensurePermissions();
      if (!granted) {
        Alert.alert(
          'Permiso necesario',
          'Activa las notificaciones de Blacklist en los ajustes del sistema para recibir el resumen.',
        );
        return;
      }
    }
    update({ totalNotificationsEnabled: !settings.totalNotificationsEnabled });
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
          <Text style={styles.headerTitle} accessibilityRole="header">Total</Text>
          <BellToggle
            enabled={settings.totalNotificationsEnabled}
            onToggle={handleToggleBell}
            contextLabel="el total"
          />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.bigBox}>
            <Text style={styles.bigLabel}>Te deben en total</Text>
            <Text style={styles.bigValue}>
              {formatCurrency(total, settings.currency)}
            </Text>
            <Text style={styles.bigSub}>
              {pendingCount === 0
                ? 'Cero deudas pendientes ahora mismo'
                : `${pendingCount} deuda${pendingCount === 1 ? '' : 's'} pendiente${pendingCount === 1 ? '' : 's'}`}
            </Text>
          </View>

          <Text style={styles.sectionTitle} accessibilityRole="header">
            Recordatorio diario
          </Text>
          <Text style={styles.sectionHint}>
            Recibirás un resumen del total cada día a la hora elegida. Si no te
            debe nadie, te enviaremos un mensaje motivacional.
          </Text>

          <TimeField
            label="Hora del recordatorio"
            hour={settings.totalNotifyHour}
            minute={settings.totalNotifyMinute}
            onChange={(h, m) => update({ totalNotifyHour: h, totalNotifyMinute: m })}
            disabled={!settings.totalNotificationsEnabled}
          />

          <Text style={styles.sectionTitle} accessibilityRole="header">
            Desglose mensual
          </Text>
          <Text style={styles.sectionHint}>
            Cobros registrados en los últimos 6 meses.
          </Text>

          <View style={styles.chart}>
            {monthly.map(bucket => {
              const percent = bucket.total / maxBucket;
              const a11y = bucket.count === 0
                ? `${bucket.label}: sin pagos registrados`
                : `${bucket.label}: ${formatCurrency(bucket.total, settings.currency)} en ${bucket.count} pago${bucket.count === 1 ? '' : 's'}`;
              return (
                <View
                  key={bucket.yearMonth}
                  style={styles.row}
                  accessible
                  accessibilityLabel={a11y}
                >
                  <Text style={styles.rowLabel}>{bucket.label}</Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: `${Math.max(2, percent * 100)}%`,
                          backgroundColor: bucket.total === 0 ? colors.border : colors.paid,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.rowAmount}>
                    {bucket.total === 0
                      ? '—'
                      : formatCurrency(bucket.total, settings.currency)}
                  </Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
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
  bigBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  bigLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  bigValue: {
    ...typography.display,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
    marginTop: spacing.xs,
  },
  bigSub: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  sectionTitle: {
    ...typography.heading,
    color: colors.textPrimary,
    marginTop: spacing.xl,
    marginBottom: spacing.xs,
  },
  sectionHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  chart: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  rowLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    width: 80,
  },
  barTrack: {
    flex: 1,
    height: 10,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.pill,
    marginHorizontal: spacing.sm,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  rowAmount: {
    ...typography.caption,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
    minWidth: 80,
    textAlign: 'right',
  },
});
