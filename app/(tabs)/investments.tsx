import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

const UPCOMING_FEATURES = [
  {
    icon: 'pie-chart-outline',
    title: 'Consolidação de Ativos',
    desc: 'Visão unificada de Renda Fixa, Ações, FIIs e Criptoativos com privacidade local.',
  },
  {
    icon: 'cash-outline',
    title: 'Monitor de Proventos',
    desc: 'Previsão de dividendos e juros sobre capital para somar ao seu fluxo de caixa.',
  },
  {
    icon: 'trending-up-outline',
    title: 'Metas Patrimoniais',
    desc: 'Defina metas de aposentadoria e independência financeira conectadas aos seus planejamentos.',
  },
  {
    icon: 'lock-closed-outline',
    title: 'Armazenamento Offline Seguro',
    desc: 'Sem conexão com servidores de terceiros ou Open Finance obrigatório.',
  },
];

export default function InvestmentsScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme];

  const [isNotified, setIsNotified] = useState(false);

  const handleNotifyMe = () => {
    setIsNotified(true);
    Alert.alert(
      'Notificação Ativada',
      'Você será avisado quando o módulo de Investimentos for disponibilizado!'
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.heroCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: '#10B98120' }]}>
            <Ionicons name="construct-outline" size={14} color={Colors.primary} />
            <Text style={styles.badgeText}>Módulo em Construção</Text>
          </View>
        </View>

        <View style={[styles.iconContainer, { backgroundColor: '#10B98115' }]}>
          <Ionicons name="trending-up" size={54} color={Colors.primary} />
        </View>

        <Text style={[styles.heroTitle, { color: theme.text }]}>Investimentos Finnan</Text>
        <Text style={[styles.heroSubtitle, { color: theme.textSecondary }]}>
          Estamos preparando uma experiência completa de controle patrimonial para você conectar seus aportes diretamente às suas metas de fluxo de caixa.
        </Text>

        <TouchableOpacity
          style={[
            styles.notifyButton,
            { backgroundColor: isNotified ? '#10B98120' : Colors.primary },
          ]}
          onPress={handleNotifyMe}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isNotified ? 'notifications' : 'notifications-outline'}
            size={18}
            color={isNotified ? Colors.primary : '#FFF'}
          />
          <Text
            style={[
              styles.notifyButtonText,
              { color: isNotified ? Colors.primary : '#FFF' },
            ]}
          >
            {isNotified ? 'Lembrete Ativado' : 'Avisar-me no Lançamento'}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.sectionHeading, { color: theme.text }]}>
        O que está por vir nesta aba:
      </Text>

      <View style={styles.featuresList}>
        {UPCOMING_FEATURES.map((item, index) => (
          <View
            key={index}
            style={[styles.featureCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
          >
            <View style={[styles.featureIconBox, { backgroundColor: theme.inputBg }]}>
              <Ionicons name={item.icon as any} size={22} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.featureTitle, { color: theme.text }]}>{item.title}</Text>
              <Text style={[styles.featureDesc, { color: theme.textSecondary }]}>
                {item.desc}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  heroCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  badgeRow: {
    marginBottom: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  iconContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  notifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  notifyButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  featuresList: {
    gap: 12,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  featureIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
});
