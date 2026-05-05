import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';

import { colors } from '@/theme';
import { DebtsProvider } from '@/state/DebtsContext';

/**
 * Mantén el splash visible mientras la JS cargue. Llamar lo más pronto posible
 * (a nivel de módulo, no dentro del componente) garantiza que se ejecute antes
 * del primer render. Si esto falla por cualquier motivo, no rompe la app.
 */
SplashScreen.preventAutoHideAsync().catch(() => {
  /* Ignora — algunos entornos (web, Snack) no soportan splash */
});

/**
 * Root Layout — se renderiza una sola vez al iniciar la app.
 *
 * Capas (de fuera hacia dentro):
 *  1. GestureHandlerRootView   → requerido por React Navigation v7.
 *  2. SafeAreaProvider         → permite SafeAreaView en pantallas hijas.
 *  3. DebtsProvider            → estado global de deudas (AsyncStorage hidratado).
 *  4. Stack                    → router. La pantalla `add-debt` se abre como modal.
 *
 * IMPORTANTE: NO bloqueamos el render esperando assets (eso causaba pantalla
 * negra perma si `useAssets` no resolvía). El fondo se carga perezosamente
 * dentro de <Background/>; mientras tanto verás el color sólido `#121212`.
 */
export default function RootLayout() {
  useEffect(() => {
    // Tras el primer paint, ocultamos el splash. Pequeño delay para evitar
    // parpadeo entre splash y primer frame del UI.
    const t = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 50);
    return () => clearTimeout(t);
  }, []);

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
