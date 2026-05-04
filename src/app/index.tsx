import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { Title } from '@/components/Title';
import { colors, spacing, typography } from '@/theme';

/**
 * Pantalla Home (ruta `/`).
 *
 * Estado actual: vacía intencionalmente — solo muestra branding.
 * Próximos pasos del producto:
 *   - Lista de deudas (urgentes / rutinarias) en tabs.
 *   - FAB "Agregar deuda" con accesibilidad táctil >= 48dp.
 *   - Resumen de saldo total adeudado.
 */
export default function HomeScreen() {
  return (
    <ScreenContainer accessibilityLabel="Pantalla principal de Blacklist">
      <View style={styles.header}>
        <Title isScreenTitle>Blacklist 💀$</Title>
        <Text
          style={styles.subtitle}
          accessibilityRole="text"
          accessibilityLabel="Registra quién te debe y nunca pierdas la cuenta"
        >
          Registra quién te debe. Nunca pierdas la cuenta.
        </Text>
      </View>

      <View
        style={styles.placeholder}
        accessible
        accessibilityRole="summary"
        accessibilityLabel="Aún no tienes deudas registradas. Pronto podrás agregar deudas urgentes y rutinarias."
      >
        <Text style={styles.placeholderEmoji}>📒</Text>
        <Text style={styles.placeholderText}>
          Aún no hay deudas registradas.
        </Text>
        <Text style={styles.placeholderHint}>
          Próximamente: agrega deudas urgentes y rutinarias.
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.xl,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  placeholderEmoji: {
    fontSize: 56,
    marginBottom: spacing.md,
  },
  placeholderText: {
    ...typography.heading,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  placeholderHint: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
