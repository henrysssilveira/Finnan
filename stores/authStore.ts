import { create } from 'zustand';
import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';
import { SecureStorage } from './storage';

interface AuthStoreState {
  isInitialized: boolean;
  isLocked: boolean;
  hasPin: boolean;
  biometricsEnabled: boolean;
  isBiometricsAvailable: boolean;

  init: () => Promise<void>;
  unlockWithPin: (pin: string) => Promise<boolean>;
  unlockWithBiometrics: () => Promise<boolean>;
  setNewPin: (pin: string, enableBiometrics?: boolean) => Promise<boolean>;
  toggleBiometrics: (enable: boolean) => Promise<boolean>;
  lock: () => void;
  resetSecurity: () => Promise<void>;
}

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  isInitialized: false,
  isLocked: true,
  hasPin: false,
  biometricsEnabled: false,
  isBiometricsAvailable: false,

  init: async () => {
    try {
      const pin = await SecureStorage.getPin();
      const biometricsEnabled = await SecureStorage.getBiometricsEnabled();

      let isBiometricsAvailable = false;
      if (Platform.OS !== 'web') {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        isBiometricsAvailable = hasHardware && isEnrolled;
      }

      const hasPin = Boolean(pin && pin.length === 8);

      set({
        isInitialized: true,
        hasPin,
        isLocked: hasPin, // Se tiver PIN, já inicia bloqueado exigindo senha/biometria
        biometricsEnabled: Boolean(biometricsEnabled && isBiometricsAvailable),
        isBiometricsAvailable,
      });

      // Se biometria estiver ativa e o app estiver bloqueado, tenta desbloquear automaticamente
      if (hasPin && biometricsEnabled && isBiometricsAvailable) {
        await get().unlockWithBiometrics();
      }
    } catch (e) {
      console.warn('Erro ao inicializar AuthStore:', e);
      set({ isInitialized: true, isLocked: false });
    }
  },

  unlockWithPin: async (pin: string) => {
    const savedPin = await SecureStorage.getPin();
    if (savedPin && savedPin === pin) {
      set({ isLocked: false });
      return true;
    }
    return false;
  },

  unlockWithBiometrics: async () => {
    if (Platform.OS === 'web') return false;
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Desbloquear Finnan com Biometria',
        cancelLabel: 'Digitar PIN',
        fallbackLabel: 'Usar PIN de 8 dígitos',
        disableDeviceFallback: false,
      });

      if (result.success) {
        set({ isLocked: false });
        return true;
      }
    } catch (e) {
      console.warn('Erro na autenticação biométrica:', e);
    }
    return false;
  },

  setNewPin: async (pin: string, enableBiometrics = false) => {
    if (pin.length !== 8) return false;
    await SecureStorage.setPin(pin);
    if (enableBiometrics && get().isBiometricsAvailable) {
      await SecureStorage.setBiometricsEnabled(true);
      set({ biometricsEnabled: true });
    }
    set({ hasPin: true, isLocked: false });
    return true;
  },

  toggleBiometrics: async (enable: boolean) => {
    if (enable && !get().isBiometricsAvailable) return false;
    await SecureStorage.setBiometricsEnabled(enable);
    set({ biometricsEnabled: enable });
    return true;
  },

  lock: () => {
    if (get().hasPin) {
      set({ isLocked: true });
    }
  },

  resetSecurity: async () => {
    await SecureStorage.clearAuth();
    set({
      hasPin: false,
      isLocked: false,
      biometricsEnabled: false,
    });
  },
}));
