import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const PIN_KEY = 'finnan_security_pin';
const BIOMETRICS_KEY = 'finnan_biometrics_active';
const FINANCE_DATA_KEY = 'finnan_financial_store_v1';

// Armazenamento Seguro (PIN e Biometria)
export const SecureStorage = {
  async getPin(): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem(PIN_KEY);
      }
      return await SecureStore.getItemAsync(PIN_KEY);
    } catch {
      return null;
    }
  },

  async setPin(pin: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(PIN_KEY, pin);
      } else {
        await SecureStore.setItemAsync(PIN_KEY, pin);
      }
    } catch (e) {
      console.error('Erro ao salvar PIN seguro:', e);
    }
  },

  async getBiometricsEnabled(): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem(BIOMETRICS_KEY) === 'true';
      }
      const val = await SecureStore.getItemAsync(BIOMETRICS_KEY);
      return val === 'true';
    } catch {
      return false;
    }
  },

  async setBiometricsEnabled(enabled: boolean): Promise<void> {
    try {
      const strVal = enabled ? 'true' : 'false';
      if (Platform.OS === 'web') {
        localStorage.setItem(BIOMETRICS_KEY, strVal);
      } else {
        await SecureStore.setItemAsync(BIOMETRICS_KEY, strVal);
      }
    } catch (e) {
      console.error('Erro ao salvar configuração de biometria:', e);
    }
  },

  async clearAuth(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(PIN_KEY);
        localStorage.removeItem(BIOMETRICS_KEY);
      } else {
        await SecureStore.deleteItemAsync(PIN_KEY);
        await SecureStore.deleteItemAsync(BIOMETRICS_KEY);
      }
    } catch (e) {
      console.error('Erro ao limpar auth:', e);
    }
  },
};

// Armazenamento Geral (AsyncStorage)
export const FinanceStorage = {
  async loadData<T>(fallback: T): Promise<T> {
    try {
      const data = await AsyncStorage.getItem(FINANCE_DATA_KEY);
      if (!data) return fallback;
      return JSON.parse(data) as T;
    } catch (e) {
      console.warn('Erro ao carregar dados financeiros:', e);
      return fallback;
    }
  },

  async saveData<T>(data: T): Promise<void> {
    try {
      await AsyncStorage.setItem(FINANCE_DATA_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Erro ao persistir dados financeiros:', e);
    }
  },

  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.removeItem(FINANCE_DATA_KEY);
    } catch (e) {
      console.error('Erro ao resetar dados financeiros:', e);
    }
  },
};
