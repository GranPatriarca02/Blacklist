import React from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAssets } from 'expo-asset';

import { colors } from '@/theme';
import { DebtsProvider } from '@/state/DebtsContext';

// Assets a precargar antes de pintar la primera pantalla.
// Evita el "flash" de carga de la imagen de fondo en pantallas frías.
const FONDO = require('../../assets/fondo.jpg');

/**
 * Root Layout — se renderiza una sola vez al iniciar la app.
 *
 * Capas (de fuera hacia dentro):
 *  1. GestureHandlerRootView   → requerido por React Navigation v7.
 *  2. SafeAreaProvider         → permite SafeAreaView en pantallas hijas.
 *  3. DebtsProvider            → estado global de deudas (AsyncStorage hidratado).
 *  4. Stack                    → router de Expo Router. Modales registrados aquí.
 */
export default function RootLayout() {
  // Pre-carga del fondo para evitar parpadeo al abrir la app.
  const [assets] = useAssets([FONDO]);

  // Mientras los assets cargan, mostramos la pantalla negra (no spinner)
  // — coherente con el tema oscuro y evita layout shift.
  if (!assets) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaProvider>
        <DebtsProvider>
          <StatusBar style="light" backgroundColor={colors.background} />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
              animation: 'fade',
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen
              name="add-debt"
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
                gestureEnabled: true,
              }}
            />
          </Stack>
        </DebtsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
