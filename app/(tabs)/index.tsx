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
import * as Clipboard from 'expo-clipboard';
import { useFinanceStore } from '@/stores/financeStore';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { formatCurrencyBRL, formatDateBR } from '@/services/splitCalculator';
import { DonutChart, DonutSlice } from '@/components/DonutChart';
import { PaymentDetailModal, PaymentItemDetail } from '@/components/PaymentDetailModal';
import { PaymentMethod, Debt } from '@/types/finance';

export default function DashboardScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme];

  const { profile, plannings, toggleInstallmentPaid, toggleDirectInstallmentPaid } = useFinanceStore();

  const [selectedMonthOffset, setSelectedMonthOffset] = useState(0); // 0 = mês atual, 1 = próximo, -1 = anterior
  const [copiedPixId, setCopiedPixId] = useState<string | null>(null);
  const [selectedItemForDetail, setSelectedItemForDetail] = useState<PaymentItemDetail | null>(null);

  // Mapeia bancos por ID para exibição rápida
  const banksMap = new Map(profile.banks.map((b) => [b.id, b.name]));

  // Data do mês selecionado
  const now = new Date();
  const targetDate = new Date(now.getFullYear(), now.getMonth() + selectedMonthOffset, 1);
  const targetYear = targetDate.getFullYear();
  const targetMonth = targetDate.getMonth();
  const targetYearMonth = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`;

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const currentMonthLabel = `${monthNames[targetMonth]} de ${targetYear}`;
  const isCurrentMonth = selectedMonthOffset === 0;

  // Função auxiliar para calcular o valor da parcela mensal de uma dívida
  const getDebtMonthlyAmount = (d: Debt): number => {
    if (d.monthlyPayment && d.monthlyPayment > 0) {
      return d.monthlyPayment;
    }
    if (d.installmentsCount && d.installmentsCount > 0) {
      return (d.remainingAmount || d.totalAmount) / d.installmentsCount;
    }
    return d.remainingAmount || d.totalAmount || 0;
  };

  // Compila todas as parcelas de planejamentos (diretos + com etapas)
  const allInstallments: PaymentItemDetail[] = [];

  for (const plan of plannings) {
    if (plan.type === 'direct') {
      for (const inst of plan.directInstallments || []) {
        allInstallments.push({
          id: inst.id,
          planId: plan.id,
          isDirect: true,
          planTitle: plan.title,
          stepTitle: plan.title,
          category: plan.category,
          color: plan.color,
          amount: inst.amount,
          dueDate: inst.dueDate,
          incomeDay: inst.incomeDay,
          recipientName: plan.recipientName,
          pixKey: plan.pixKey,
          pixKeyType: plan.pixKeyType,
          bankName: plan.bankAccountId ? banksMap.get(plan.bankAccountId) : undefined,
          paymentMethod: plan.paymentMethod,
          isPaid: inst.isPaid,
          paidAt: inst.paidAt,
        });
      }
    } else {
      for (const step of plan.steps || []) {
        for (const inst of step.installments || []) {
          allInstallments.push({
            id: inst.id,
            planId: plan.id,
            stepId: step.id,
            isDirect: false,
            planTitle: plan.title,
            stepTitle: step.title,
            category: plan.category,
            color: plan.color,
            amount: inst.amount,
            dueDate: inst.dueDate,
            incomeDay: inst.incomeDay,
            recipientName: step.recipientName,
            pixKey: step.pixKey,
            pixKeyType: step.pixKeyType,
            bankName: step.bankAccountId ? banksMap.get(step.bankAccountId) : undefined,
            paymentMethod: step.paymentMethod,
            isPaid: inst.isPaid,
            paidAt: inst.paidAt,
          });
        }
      }
    }
  }

  // Filtra APENAS as parcelas pertencentes ao mês ativo/selecionado
  const monthInstallments = allInstallments.filter((inst) =>
    inst.dueDate.startsWith(targetYearMonth)
  );

  // Parcelas do mês pendentes ordenadas por vencimento
  const pendingInstallments = monthInstallments
    .filter((inst) => !inst.isPaid)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const paidInstallments = monthInstallments.filter((inst) => inst.isPaid);

  // Totais de planejamentos no mês
  const totalPlannedPending = pendingInstallments.reduce((sum, inst) => sum + inst.amount, 0);
  const totalPlannedPaid = paidInstallments.reduce((sum, inst) => sum + inst.amount, 0);

  // Parcelas de Dívidas legadas (se houver alguma que ainda não esteja em plannings)
  const legacyDebts = profile.debts.filter(
    (d) => d.isIncludedInMonthlyPlanning !== false && !plannings.some((p) => p.title === d.title)
  );
  const monthlyDebtsCommitted = legacyDebts.reduce((sum, d) => sum + getDebtMonthlyAmount(d), 0);

  // Total Comprometido no Mês: parcelas pendentes de planejamentos (incluindo dívidas planejadas) + legadas
  const totalCommittedMonth = totalPlannedPending + monthlyDebtsCommitted;
  const totalIncome = profile.monthlyIncome || 0;
  // Saldo Livre = Renda Mensal - Gastos Comprometidos no Mês (ex: 4300 - 500 = 3800)
  const remainingFreeBalance = Math.max(0, totalIncome - totalCommittedMonth);

  // Dados para o Gráfico de Rosca por Categoria no Mês
  const categoryTotals = new Map<string, { amount: number; color: string }>();

  // Cores por categoria padrão
  const categoryColors: Record<string, string> = {
    'Contas Fixas': '#3B82F6',
    'Metas e Sonhos': '#10B981',
    'Dívidas': '#EF4444',
    'Lazer e Viagens': '#EC4899',
    'Educação': '#8B5CF6',
    'Outros': '#F59E0B',
  };

  for (const inst of pendingInstallments) {
    const cat = inst.category || 'Outros';
    const current = categoryTotals.get(cat) || {
      amount: 0,
      color: inst.color || categoryColors[cat] || '#10B981',
    };
    categoryTotals.set(cat, {
      amount: current.amount + inst.amount,
      color: current.color,
    });
  }

  if (monthlyDebtsCommitted > 0) {
    const debtCat = 'Dívidas';
    const current = categoryTotals.get(debtCat) || { amount: 0, color: '#EF4444' };
    categoryTotals.set(debtCat, {
      amount: current.amount + monthlyDebtsCommitted,
      color: '#EF4444',
    });
  }

  const donutSlices: DonutSlice[] = Array.from(categoryTotals.entries()).map(([label, data]) => ({
    key: label,
    label,
    amount: data.amount,
    color: data.color,
  }));

  const handleCopyPix = async (pixKey: string, id: string) => {
    if (!pixKey) {
      Alert.alert('Chave PIX', 'Nenhuma chave PIX informada.');
      return;
    }
    await Clipboard.setStringAsync(pixKey);
    setCopiedPixId(id);
    setTimeout(() => setCopiedPixId(null), 2500);
  };

  const handleTogglePaidFromDetail = async (item: PaymentItemDetail) => {
    if (item.isDirect) {
      await toggleDirectInstallmentPaid(item.planId, item.id);
    } else if (item.stepId) {
      await toggleInstallmentPaid(item.planId, item.stepId, item.id);
    }
  };

  const paymentIconMap: Record<string, string> = {
    pix: 'flash',
    credito: 'card',
    debito: 'card-outline',
    boleto: 'barcode-outline',
    dinheiro: 'cash-outline',
    outro: 'ellipsis-horizontal',
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* SELETOR DE MÊS ATIVO */}
      <View style={[styles.monthSelectorBar, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
        <TouchableOpacity
          style={styles.monthNavBtn}
          onPress={() => setSelectedMonthOffset((prev) => prev - 1)}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={20} color={theme.text} />
        </TouchableOpacity>

        <View style={{ alignItems: 'center' }}>
          <Text style={[styles.monthSelectorTitle, { color: theme.text }]}>
            {currentMonthLabel}
          </Text>
          {!isCurrentMonth && (
            <TouchableOpacity onPress={() => setSelectedMonthOffset(0)}>
              <Text style={[styles.backToCurrentText, { color: Colors.primary }]}>
                • Voltar para o Mês Atual
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.monthNavBtn}
          onPress={() => setSelectedMonthOffset((prev) => prev + 1)}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-forward" size={20} color={theme.text} />
        </TouchableOpacity>
      </View>

      {/* Top Header Card */}
      <View style={[styles.headerCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.welcomeText, { color: theme.textSecondary }]}>Visão do Mês</Text>
            <Text style={[styles.appTitle, { color: theme.text }]}>Fluxo & Comprometimento</Text>
          </View>
        </View>

        {/* Saldo Livre em Destaque */}
        <View style={styles.balanceHighlight}>
          <Text style={[styles.balanceLabel, { color: theme.textSecondary }]}>Saldo Livre Restante</Text>
          <Text style={[styles.balanceAmount, { color: Colors.primary }]}>
            {formatCurrencyBRL(remainingFreeBalance)}
          </Text>
          <Text style={[styles.balanceCalcFormula, { color: theme.textSecondary }]}>
            Renda ({formatCurrencyBRL(totalIncome)}) - Comprometido ({formatCurrencyBRL(totalCommittedMonth)})
          </Text>
        </View>

        {/* Métricas */}
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
              {formatCurrencyBRL(totalCommittedMonth)}
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

      {/* GRÁFICO DE ROSCA DOS GASTOS COMPROMETIDOS DO MÊS */}
      <View style={[styles.chartCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="pie-chart-outline" size={18} color={Colors.primary} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Gastos Comprometidos do Mês
          </Text>
        </View>

        {donutSlices.length > 0 ? (
          <DonutChart slices={donutSlices} totalIncome={totalIncome} />
        ) : (
          <View style={styles.emptyChartBox}>
            <Ionicons name="checkmark-done-circle-outline" size={36} color={Colors.primary} />
            <Text style={[styles.emptyChartText, { color: theme.textSecondary }]}>
              Nenhum gasto pendente comprometido no momento.
            </Text>
          </View>
        )}
      </View>

      {/* PRÓXIMOS PAGAMENTOS (SEM BOTÃO DIRETO DE MARCAR COMO PAGO, APENAS AO ABRIR DETALHES) */}
      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="time-outline" size={18} color={Colors.primary} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Próximos Pagamentos ({pendingInstallments.length})
          </Text>
        </View>

        {pendingInstallments.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <Ionicons name="checkmark-circle-outline" size={36} color={Colors.primary} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Tudo quitado!</Text>
            <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
              Não há parcelas pendentes para as próximas datas.
            </Text>
          </View>
        ) : (
          pendingInstallments.slice(0, 6).map((inst) => (
            <TouchableOpacity
              key={inst.id}
              style={[
                styles.installmentCard,
                { backgroundColor: theme.cardBackground, borderColor: theme.border },
              ]}
              onPress={() => setSelectedItemForDetail(inst)}
              activeOpacity={0.75}
            >
              <View style={styles.instCardHeader}>
                <View style={{ flex: 1 }}>
                  <View style={styles.tagRow}>
                    <View style={[styles.planTag, { backgroundColor: inst.color || Colors.primary }]}>
                      <Text style={styles.planTagText}>{inst.planTitle}</Text>
                    </View>
                    <Text style={[styles.dateText, { color: theme.textSecondary }]}>
                      Vence em {formatDateBR(inst.dueDate)} (dia {inst.incomeDay})
                    </Text>
                  </View>
                  <Text style={[styles.stepTitle, { color: theme.text }]}>{inst.stepTitle}</Text>

                  {/* Badges de Banco e Método */}
                  <View style={styles.metaBadgesRow}>
                    {inst.bankName ? (
                      <View style={[styles.metaBadge, { backgroundColor: theme.inputBg }]}>
                        <Ionicons name="business-outline" size={11} color={theme.textSecondary} />
                        <Text style={[styles.metaBadgeText, { color: theme.textSecondary }]}>
                          {inst.bankName}
                        </Text>
                      </View>
                    ) : null}
                    {inst.paymentMethod ? (
                      <View style={[styles.metaBadge, { backgroundColor: theme.inputBg }]}>
                        <Ionicons
                          name={(paymentIconMap[inst.paymentMethod] as any) || 'cash-outline'}
                          size={11}
                          color={theme.textSecondary}
                        />
                        <Text style={[styles.metaBadgeText, { color: theme.textSecondary }]}>
                          {inst.paymentMethod}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.amountText, { color: theme.text }]}>
                    {formatCurrencyBRL(inst.amount)}
                  </Text>
                </View>
              </View>

              {/* Barra inferior com Atalho de PIX e Ver Detalhes */}
              <View style={[styles.instActionsRow, { borderTopColor: theme.border }]}>
                {inst.pixKey ? (
                  <TouchableOpacity
                    style={[styles.actionBtn, copiedPixId === inst.id && styles.actionBtnActive]}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleCopyPix(inst.pixKey || '', inst.id);
                    }}
                  >
                    <Ionicons
                      name={copiedPixId === inst.id ? 'checkmark' : 'copy-outline'}
                      size={14}
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

                <View style={styles.viewDetailBtn}>
                  <Text style={[styles.viewDetailText, { color: Colors.primary }]}>
                    Mais Informações
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Modal de Detalhes com Botão de Marcar como Pago */}
      <PaymentDetailModal
        visible={selectedItemForDetail !== null}
        item={selectedItemForDetail}
        onClose={() => setSelectedItemForDetail(null)}
        onTogglePaid={handleTogglePaidFromDetail}
      />
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
  monthSelectorBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  monthNavBtn: {
    padding: 8,
    borderRadius: 10,
  },
  monthSelectorTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  backToCurrentText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  headerCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  welcomeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  appTitle: {
    fontSize: 19,
    fontWeight: '700',
  },
  balanceHighlight: {
    marginBottom: 18,
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
  balanceCalcFormula: {
    fontSize: 12,
    marginTop: 4,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 14,
    borderTopWidth: 0.5,
    borderTopColor: '#8882',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivider: {
    width: 1,
    height: 26,
    backgroundColor: '#8883',
  },
  metricLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  chartCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 20,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyChartBox: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyChartText: {
    fontSize: 13,
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
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
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 12,
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
  metaBadgesRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  metaBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'capitalize',
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
    fontSize: 11,
    fontWeight: '600',
  },
  viewDetailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewDetailText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
