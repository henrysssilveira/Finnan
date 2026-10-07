import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export function LockScreen() {
  const [pin, setPin] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme];

  const { unlockWithPin, unlockWithBiometrics, biometricsEnabled, isBiometricsAvailable } =
    useAuthStore();

  const handleKeyPress = async (digit: string) => {
    if (pin.length >= 8) return;
    const newPin = pin + digit;
    setPin(newPin);
    setErrorMessage('');

    if (newPin.length === 8) {
      const success = await unlockWithPin(newPin);
      if (!success) {
        if (Platform.OS !== 'web') {
          Vibration.vibrate(200);
        }
        setErrorMessage('PIN incorreto. Tente novamente.');
        setTimeout(() => setPin(''), 300);
      }
    }
  };

  const handleDelete = () => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
      setErrorMessage('');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <View style={[styles.iconCircle, { backgroundColor: '#10B98120' }]}>
          <Ionicons name="shield-checkmark" size={48} color={Colors.primary} />
        </View>
        <Text style={[styles.title, { color: theme.text }]}>Finnan</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Digite seu PIN de 8 dígitos para acessar
        </Text>
      </View>

      {/* Indicadores de PIN */}
      <View style={styles.dotsContainer}>
        {Array.from({ length: 8 }).map((_, index) => {
          const isFilled = index < pin.length;
          return (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  borderColor: isFilled ? Colors.primary : theme.border,
                  backgroundColor: isFilled ? Colors.primary : 'transparent',
                },
              ]}
            />
          );
        })}
      </View>

      {errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : (
        <View style={styles.errorPlaceholder} />
      )}

      {/* Teclado Numérico */}
      <View style={styles.keypad}>
        {[
          ['1', '2', '3'],
          ['4', '5', '6'],
          ['7', '8', '9'],
        ].map((row, rIdx) => (
          <View key={rIdx} style={styles.row}>
            {row.map((digit) => (
              <TouchableOpacity
                key={digit}
                style={[styles.key, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
                onPress={() => handleKeyPress(digit)}
                activeOpacity={0.7}
              >
                <Text style={[styles.keyText, { color: theme.text }]}>{digit}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        {/* Linha final: Biometria, 0, Apagar */}
        <View style={styles.row}>
          {biometricsEnabled && isBiometricsAvailable ? (
            <TouchableOpacity
              style={[styles.key, styles.specialKey, { borderColor: 'transparent' }]}
              onPress={() => unlockWithBiometrics()}
              activeOpacity={0.7}
            >
              <Ionicons name="finger-print-outline" size={32} color={Colors.primary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.keyPlaceholder} />
          )}

          <TouchableOpacity
            style={[styles.key, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
            onPress={() => handleKeyPress('0')}
            activeOpacity={0.7}
          >
            <Text style={[styles.keyText, { color: theme.text }]}>0</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.key, styles.specialKey, { borderColor: 'transparent' }]}
            onPress={handleDelete}
            activeOpacity={0.7}
          >
            <Ionicons name="backspace-outline" size={28} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    zIndex: 999999,
    justifyContent: 'space-between',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginVertical: 10,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  errorText: {
    color: Colors.danger,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
    height: 20,
  },
  errorPlaceholder: {
    height: 20,
  },
  keypad: {
    alignItems: 'center',
    gap: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 24,
  },
  key: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  specialKey: {
    backgroundColor: 'transparent',
    elevation: 0,
    shadowOpacity: 0,
  },
  keyPlaceholder: {
    width: 72,
    height: 72,
  },
  keyText: {
    fontSize: 28,
    fontWeight: '600',
  },
});
