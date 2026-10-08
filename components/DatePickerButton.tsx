import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { formatDateBR, formatDateISO } from '@/services/splitCalculator';

interface DatePickerButtonProps {
  label?: string;
  value: string; // 'YYYY-MM-DD'
  onChange: (dateISO: string) => void;
  minimumDate?: Date;
  maximumDate?: Date;
}

/**
 * Botão que exibe a data formatada em pt-BR e abre o seletor de calendário nativo ao tocar.
 * Compatível com Expo Go (usa @react-native-community/datetimepicker).
 */
export function DatePickerButton({ label, value, onChange, minimumDate, maximumDate }: DatePickerButtonProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme];
  const [showPicker, setShowPicker] = useState(false);

  // Converte 'YYYY-MM-DD' → Date local (sem desvio de UTC)
  const parseLocalDate = (iso: string): Date => {
    const parts = iso.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0]);
      const m = parseInt(parts[1]) - 1;
      const d = parseInt(parts[2]);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        return new Date(y, m, d);
      }
    }
    return new Date();
  };

  const currentDate = parseLocalDate(value);

  const handleChange = (_event: DateTimePickerEvent, selected?: Date) => {
    // No Android o picker fecha automaticamente após seleção
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (selected) {
      onChange(formatDateISO(selected));
    }
  };

  const displayLabel = value ? formatDateBR(value) : 'Selecionar data';

  return (
    <View>
      <TouchableOpacity
        style={[
          styles.btn,
          { backgroundColor: theme.inputBg, borderColor: theme.border },
        ]}
        onPress={() => setShowPicker(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
        <Text style={[styles.btnText, { color: value ? theme.text : theme.textSecondary }]}>
          {displayLabel}
        </Text>
        <Ionicons name="chevron-down" size={14} color={theme.textSecondary} />
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={currentDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={handleChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  btnText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
});
