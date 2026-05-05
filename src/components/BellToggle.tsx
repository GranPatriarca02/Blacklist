import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { a11y, colors, radius } from '@/theme';

interface BellToggleProps {
  enabled: boolean;
  onToggle: () => void;
  /** Etiqueta accesible específica de contexto (ej. "Carlos"). */
  contextLabel?: string;
  /** Tamaño compacto para listas, normal para detalle. */
  size?: 'sm' | 'md';
}

/**
 * Botón de campana para activar/desactivar notificaciones.
 *
 * - Touch target >= 44dp incluso en versión `sm`.
 * - `accessibilityRole="switch"` con `accessibilityState.checked` para
 *   que el lector anuncie correctamente "activado/desactivado".
 * - Glyph (campana / campana tachada) ignorado por accesibilidad.
 */
export function BellToggle({ enabled, onToggle, contextLabel, size = 'md' }: BellToggleProps) {
  const dim = size === 'sm' ? 40 : 48;
  const glyph = enabled ? '🔔' : '🔕';
  const status = enabled ? 'activadas' : 'desactivadas';
  const label = contextLabel
    ? `Notificaciones de ${contextLabel}: ${status}`
    : `Notificaciones ${status}`;

  return (
    <Pressable
      onPress={onToggle}
      hitSlop={a11y.hitSlop}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: enabled }}
      accessibilityHint="Toca para alternar"
      style={({ pressed }) => [
        styles.btn,
        { width: dim, height: dim },
        enabled && styles.enabled,
        pressed && { opacity: 0.6 },
      ]}
    >
      <Text
        style={[styles.glyph, size === 'sm' && { fontSize: 18 }]}
        accessibilityElementsHidden
        importantForAccessibility="no"
        allowFontScaling={false}
      >
        {glyph}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enabled: {
    backgroundColor: colors.routineBg,
    borderColor: colors.routine,
  },
  glyph: {
    fontSize: 22,
  },
});
