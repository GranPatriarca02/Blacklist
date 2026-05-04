import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '@/theme';

import { useAssets } from 'expo-asset';

/**
 * Root Layout — se renderiza una sola vez al iniciar la app.
 *
 * Aquí montamos:
 *  1. SafeAreaProvider: necesario para SafeAreaView en pantallas hijas.
 *  2. GestureHandlerRootView: requerido por React Navigation v7 para gestos.
 *  3. StatusBar en modo "light": iconos claros sobre fondo oscuro.
 *  4. Stack navigator con tema dark unificado y headers ocultos por
 *     defecto (cada pantalla decide si los muestra).
 */
export default function RootLayout() {
  // Aquí puedes usar useAssets si necesitas precargar fuentes o imágenes adicionales.
  
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor={colors.background} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: 'fade',
          }}
        />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
