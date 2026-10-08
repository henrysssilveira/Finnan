import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useRef } from 'react';
import { AppState, AppStateStatus, View, ActivityIndicator } from 'react-native';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useColorScheme } from '@/components/useColorScheme';
import { useAuthStore } from '@/stores/authStore';
import { useFinanceStore } from '@/stores/financeStore';
import { LockScreen } from '@/components/LockScreen';
import { OnboardingModal } from '@/components/OnboardingModal';
import Colors from '@/constants/Colors';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  const { init: initAuth, isInitialized: isAuthReady, hasPin, isLocked, lock, unlockWithBiometrics, biometricsEnabled, isBiometricsAvailable } =
    useAuthStore();
  const { load: loadFinance, isLoaded: isFinanceReady, profile } = useFinanceStore();

  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (error) console.warn('Erro ao carregar fontes:', error);
  }, [error]);

  // Inicializa dados de autenticação e financeiro
  useEffect(() => {
    Promise.all([initAuth(), loadFinance()]).then(() => {
      if (loaded) {
        SplashScreen.hideAsync().catch(() => {});
      }
    });
  }, [loaded]);

  // Listener para bloquear o app SEMPRE que for restaurado do segundo plano
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App retornou ao primeiro plano
        if (hasPin) {
          lock();
          if (biometricsEnabled && isBiometricsAvailable) {
            unlockWithBiometrics();
          }
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [hasPin, biometricsEnabled, isBiometricsAvailable]);

  if (!loaded || !isAuthReady || !isFinanceReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0B0F19' }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const showOnboarding = !hasPin || !profile.onboardingCompleted;

  return (
    <RootLayoutNav
      showLockScreen={hasPin && isLocked && !showOnboarding}
      showOnboarding={showOnboarding}
    />
  );
}

function RootLayoutNav({
  showLockScreen,
  showOnboarding,
}: {
  showLockScreen: boolean;
  showOnboarding: boolean;
}) {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <View style={{ flex: 1 }}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>

        {/* Modal de Primeiro Acesso / Onboarding */}
        <OnboardingModal visible={showOnboarding} />

        {/* Camada de Bloqueio de Segurança */}
        {showLockScreen && <LockScreen />}
      </View>
    </ThemeProvider>
  );
}
