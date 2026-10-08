import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { G, Circle } from 'react-native-svg';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { formatCurrencyBRL } from '@/services/splitCalculator';

export interface DonutSlice {
  key: string;
  label: string;
  amount: number;
  color: string;
}

interface DonutChartProps {
  slices: DonutSlice[];
  totalIncome: number;
  size?: number;
  strokeWidth?: number;
}

export function DonutChart({
  slices,
  totalIncome,
  size = 180,
  strokeWidth = 22,
}: DonutChartProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme];

  const totalAmount = slices.reduce((sum, s) => sum + s.amount, 0);
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  // Percentual da renda comprometida
  const incomePercent = totalIncome > 0
    ? Math.min(100, Math.round((totalAmount / totalIncome) * 100))
    : 0;

  // Calcula segmentos
  let accumulatedPercent = 0;
  const segments = slices.map((slice) => {
    const percent = totalAmount > 0 ? (slice.amount / totalAmount) * 100 : 0;
    const strokeDasharray = `${(percent / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
    accumulatedPercent += percent;

    return {
      ...slice,
      percent,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  return (
    <View style={styles.container}>
      <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <G rotation="-90" origin={`${center}, ${center}`}>
            {/* Círculo de fundo cinza */}
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke={theme.border}
              strokeWidth={strokeWidth}
              fill="transparent"
            />

            {/* Segmentos coloridos */}
            {segments.map((seg, idx) => (
              <Circle
                key={idx}
                cx={center}
                cy={center}
                r={radius}
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeDasharray={seg.strokeDasharray}
                strokeDashoffset={seg.strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            ))}
          </G>
        </Svg>

        {/* Texto no centro da rosca */}
        <View style={styles.centerTextContainer}>
          <Text style={[styles.centerPercent, { color: theme.text }]}>
            {incomePercent}%
          </Text>
          <Text style={[styles.centerSub, { color: theme.textSecondary }]}>
            da renda
          </Text>
          <Text style={[styles.centerAmount, { color: Colors.warning }]}>
            {formatCurrencyBRL(totalAmount)}
          </Text>
        </View>
      </View>

      {/* Legenda do Gráfico */}
      <View style={styles.legendContainer}>
        {slices.map((slice, index) => {
          const slicePercent = totalAmount > 0 ? Math.round((slice.amount / totalAmount) * 100) : 0;
          return (
            <View key={index} style={styles.legendRow}>
              <View style={styles.legendLeft}>
                <View style={[styles.legendDot, { backgroundColor: slice.color }]} />
                <Text style={[styles.legendLabel, { color: theme.text }]} numberOfLines={1}>
                  {slice.label}
                </Text>
              </View>
              <View style={styles.legendRight}>
                <Text style={[styles.legendValue, { color: theme.text }]}>
                  {formatCurrencyBRL(slice.amount)}
                </Text>
                <Text style={[styles.legendPercent, { color: theme.textSecondary }]}>
                  {slicePercent}%
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  centerTextContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerPercent: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  centerSub: {
    fontSize: 10,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  centerAmount: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  legendContainer: {
    width: '100%',
    marginTop: 18,
    gap: 8,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  legendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  legendRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  legendPercent: {
    fontSize: 12,
    width: 32,
    textAlign: 'right',
  },
});
