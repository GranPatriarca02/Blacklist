import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';

import { colors } from '@/theme';
import { DebtsProvider } from '@/state/DebtsContext';
import { SettingsProvider } from '@/state/SettingsContext';

SplashScreen.preventAutoHideAsync().catch(() => { /* ignorable */ });

/**
 * Root Layout — montado una sola vez al iniciar.
 *
 * Capas:
 *  1. GestureHandlerRootView   → necesario para gestos de React Navigation v7.
 *  2. SafeAreaProvider          → permite SafeAreaView en pantallas hijas.
 *  3. SettingsProvider          → divisa, hora notificación total, etc.
 *  4. DebtsProvider             → estado global de deudas + notificaciones.
 *  5. Stack                     → router. Modales y rutas anidadas se registran aquí.
 *
 * Rutas registradas:
 *  - `/`                  → Home (lista + FAB)
 *  - `/add-debt`          → modal Slide-up para crear deuda
 *  - `/debt/[id]`         → detalle/edición de una deuda
 *  - `/settings`          → ajustes (divisa, diagnóstico)
 *  - `/total`             → desglose mensual y notificación del total
 */
export default function RootLayout() {
  useEffect(() => {
    const t = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaProvider>
        <SettingsProvider>
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
              <Stack.Screen
                name="debt/[id]"
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="settings"
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="total"
                options={{ animation: 'slide_from_right' }}
              />
            </Stack>
          </DebtsProvider>
        </SettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
