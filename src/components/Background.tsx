import React, { type ReactNode } from 'react';
import { ImageBackground, StyleSheet, View } from 'react-native';
import { colors } from '@/theme';

const FONDO = require('../../assets/fondo.jpg');

interface BackgroundProps {
  children: ReactNode;
  /** Opacidad del overlay oscuro encima de la imagen (0..1). */
  overlayOpacity?: number;
}

/**
 * Fondo global con la textura `fondo.jpg`.
 *
 * - Marcado como `accessibilityElementsHidden + importantForAccessibility="no"`
 *   para que VoiceOver/TalkBack no lo lea (es decoración pura).
 * - El overlay oscuro garantiza contraste de texto incluso sobre las zonas
 *   más claras de la textura.
 */
export function Background({ children, overlayOpacity = 0.78 }: BackgroundProps) {
  return (
    <ImageBackground
      source={FONDO}
      style={styles.bg}
      resizeMode="cover"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: colors.background, opacity: overlayOpacity },
        ]}
        pointerEvents="none"
      />
      <View style={styles.content}>{children}</View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
});
