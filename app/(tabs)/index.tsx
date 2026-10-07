import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useFinanceStore } from '@/stores/financeStore';
import { useAuthStore } from '@/stores/authStore';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { formatCurrencyBRL, formatDateBR } from '@/services/splitCalculator';

export default function DashboardScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme];

  const { profile, plannings, toggleInstallmentPaid } = useFinanceStore();
  const { lock } = useAuthStore();

  const [copiedPixId, setCopiedPixId] = useState<string | null>(null);

  // Calcula todas as parcelas pendentes ordenadas por data
  const allInstallments = plannings.flatMap((plan) =>
    plan.steps.flatMap((step) =>
      step.installments.map((inst) => ({
        ...inst,
        planTitle: plan.title,
        planColor: plan.color,
        stepTitle: step.title,
        recipientName: step.recipientName,
        pixKey: step.pixKey,
        pixKeyType: step.pixKeyType,
        planId: plan.id,
      }))
    )
  );

  const pendingInstallments = allInstallments
    .filter((inst) => !inst.isPaid)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const paidInstallments = allInstallments.filter((inst) => inst.isPaid);

  // Totais
  const totalPlannedPending = pendingInstallments.reduce((sum, inst) => sum + inst.amount, 0);
  const totalPlannedPaid = paidInstallments.reduce((sum, inst) => sum + inst.amount, 0);
  const totalIncome = profile.monthlyIncome || 0;
  const remainingFreeBalance = Math.max(0, totalIncome - totalPlannedPending);

  const totalDebts = profile.debts.reduce((sum, d) => sum + d.totalAmount, 0);

  const handleCopyPix = async (pixKey: string, id: string) => {
    if (!pixKey) {
      Alert.alert('Chave PIX', 'Nenhuma chave PIX informada para este pagamento.');
      return;
    }
    await Clipboard.setStringAsync(pixKey);
    setCopiedPixId(id);
    setTimeout(() => setCopiedPixId(null), 2500);
  };

  const handleTogglePaid = async (planId: string, stepId: string, instId: string) => {
    await toggleInstallmentPaid(planId, stepId, instId);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Header Card */}
      <View style={[styles.headerCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.welcomeText, { color: theme.textSecondary }]}>Visão Financeira</Text>
            <Text style={[styles.appTitle, { color: theme.text }]}>Fluxo de Caixa Local</Text>
          </View>
          <TouchableOpacity
            style={[styles.lockButton, { backgroundColor: theme.inputBg }]}
            onPress={lock}
            activeOpacity={0.7}
          >
            <Ionicons name="lock-closed" size={18} color={Colors.primary} />
            <Text style={[styles.lockBtnText, { color: Colors.primary }]}>Bloquear</Text>
          </TouchableOpacity>
        </View>

        {/* Saldo Livre em Destaque */}
        <View style={styles.balanceHighlight}>
          <Text style={[styles.balanceLabel, { color: theme.textSecondary }]}>Saldo Livre Projetado</Text>
          <Text style={[styles.balanceAmount, { color: Colors.primary }]}>
            {formatCurrencyBRL(remainingFreeBalance)}
          </Text>
        </View>

        {/* Linha de Métricas */}
        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Renda Mensal</Text>
            <Text style={[styles.metricValue, { color: theme.text }]}>
              {formatCurrencyBRL(totalIncome)}
            </Text>
          </View>

          <View style={styles.metricDivider} />

          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Comprometido</Text>
            <Text style={[styles.metricValue, { color: Colors.warning }]}>
              {formatCurrencyBRL(totalPlannedPending)}
            </Text>
          </View>

          <View style={styles.metricDivider} />

          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Já Pago</Text>
            <Text style={[styles.metricValue, { color: Colors.success }]}>
              {formatCurrencyBRL(totalPlannedPaid)}
            </Text>
          </View>
        </View>
      </View>

      {/* Datas de Recebimento Configuradas */}
      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Seu Ciclo de Recebimento</Text>
        </View>
        <View style={styles.incomeDatesWrap}>
          {profile.incomeDates.map((d, idx) => (
            <View
              key={idx}
              style={[
                styles.incomeChip,
                { backgroundColor: theme.cardBackground, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.incomeDayText, { color: theme.text }]}>Dia {d.day}</Text>
              <View style={[styles.incomePercentBadge, { backgroundColor: '#10B98120' }]}>
                <Text style={styles.incomePercentText}>{d.percentage}% da renda</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Próximos Pagamentos / Splits */}
      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="time-outline" size={18} color={Colors.primary} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Próximos Pagamentos ({pendingInstallments.length})
          </Text>
        </View>

        {pendingInstallments.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <Ionicons name="checkmark-done-circle-outline" size={40} color={Colors.primary} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Tudo em dia!</Text>
            <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
              Nenhuma parcela pendente encontrada nos seus planejamentos.
            </Text>
          </View>
        ) : (
          pendingInstallments.slice(0, 6).map((inst) => (
            <View
              key={inst.id}
              style={[
                styles.installmentCard,
                { backgroundColor: theme.cardBackground, borderColor: theme.border },
              ]}
            >
              <View style={styles.instCardHeader}>
                <View style={{ flex: 1 }}>
                  <View style={styles.tagRow}>
                    <View style={[styles.planTag, { backgroundColor: inst.planColor || Colors.primary }]}>
                      <Text style={styles.planTagText}>{inst.planTitle}</Text>
                    </View>
                    <Text style={[styles.dateText, { color: theme.textSecondary }]}>
                      Vence em {formatDateBR(inst.dueDate)}
                    </Text>
                  </View>
                  <Text style={[styles.stepTitle, { color: theme.text }]}>{inst.stepTitle}</Text>
                  {inst.recipientName ? (
                    <Text style={[styles.recipientText, { color: theme.textSecondary }]}>
                      Favorecido: {inst.recipientName}
                    </Text>
                  ) : null}
                </View>

                <Text style={[styles.amountText, { color: theme.text }]}>
                  {formatCurrencyBRL(inst.amount)}
                </Text>
              </View>

              {/* Botões de Ação da Parcela */}
              <View style={[styles.instActionsRow, { borderTopColor: theme.border }]}>
                {inst.pixKey ? (
                  <TouchableOpacity
                    style={[styles.actionBtn, copiedPixId === inst.id && styles.actionBtnActive]}
                    onPress={() => handleCopyPix(inst.pixKey, inst.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={copiedPixId === inst.id ? 'checkmark' : 'copy-outline'}
                      size={15}
                      color={copiedPixId === inst.id ? '#10B981' : theme.textSecondary}
                    />
                    <Text
                      style={[
                        styles.actionBtnText,
                        { color: copiedPixId === inst.id ? '#10B981' : theme.textSecondary },
                      ]}
                    >
                      {copiedPixId === inst.id ? 'PIX Copiado!' : 'Copiar PIX'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View />
                )}

                <TouchableOpacity
                  style={[styles.payBtn, { backgroundColor: '#10B98120' }]}
                  onPress={() => handleTogglePaid(inst.planId, inst.stepId, inst.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
                  <Text style={styles.payBtnText}>Marcar como Pago</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Dívidas & Bancos Rápidos */}
      <View style={styles.section}>
        <View style={styles.twoColsWrap}>
          {/* Card Bancos */}
          <View style={[styles.subCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <View style={styles.subCardHeader}>
              <Ionicons name="card-outline" size={18} color={Colors.primary} />
              <Text style={[styles.subCardTitle, { color: theme.text }]}>Contas</Text>
            </View>
            <Text style={[styles.subCardValue, { color: theme.text }]}>
              {profile.banks.length} cadastrada(s)
            </Text>
            <Text style={[styles.subCardDesc, { color: theme.textSecondary }]}>
              {profile.banks.map((b) => b.name).join(', ') || 'Nenhum banco'}
            </Text>
          </View>

          {/* Card Dívidas */}
          <View style={[styles.subCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <View style={styles.subCardHeader}>
              <Ionicons name="alert-circle-outline" size={18} color={Colors.danger} />
              <Text style={[styles.subCardTitle, { color: theme.text }]}>Dívidas</Text>
            </View>
            <Text style={[styles.subCardValue, { color: Colors.danger }]}>
              {formatCurrencyBRL(totalDebts)}
            </Text>
            <Text style={[styles.subCardDesc, { color: theme.textSecondary }]}>
              {profile.debts.length} dívida(s) conhecida(s)
            </Text>
          </View>
        </View>
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
    paddingBottom: 36,
  },
  headerCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  welcomeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  appTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  lockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  lockBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  balanceHighlight: {
    marginBottom: 20,
  },
  balanceLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 0.5,
    borderTopColor: '#8882',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#8883',
  },
  metricLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  incomeDatesWrap: {
    flexDirection: 'row',
    gap: 10,
  },
  incomeChip: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
  },
  incomeDayText: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  incomePercentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  incomePercentText: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '600',
  },
  emptyBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
  installmentCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  instCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  planTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  planTagText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  dateText: {
    fontSize: 11,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  recipientText: {
    fontSize: 12,
    marginTop: 2,
  },
  amountText: {
    fontSize: 16,
    fontWeight: '700',
  },
  instActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 0.5,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  actionBtnActive: {
    backgroundColor: '#10B98115',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  payBtnText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  twoColsWrap: {
    flexDirection: 'row',
    gap: 12,
  },
  subCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  subCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  subCardTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  subCardValue: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  subCardDesc: {
    fontSize: 11,
  },
});
