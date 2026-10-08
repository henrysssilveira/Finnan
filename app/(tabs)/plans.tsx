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
import { Planning, Step } from '@/types/finance';
import { PlanningModal } from '@/components/PlanningModal';
import { StepModal } from '@/components/StepModal';
import { formatCurrencyBRL, formatDateBR } from '@/services/splitCalculator';

export default function PlansScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme];

  const {
    profile,
    plannings,
    deletePlanning,
    deleteStep,
    toggleInstallmentPaid,
    toggleDirectInstallmentPaid,
  } = useFinanceStore();

  const [isPlanModalVisible, setIsPlanModalVisible] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Planning | null>(null);

  const [isStepModalVisible, setIsStepModalVisible] = useState(false);
  const [selectedPlanIdForStep, setSelectedPlanIdForStep] = useState<string>('');
  const [editingStep, setEditingStep] = useState<Step | null>(null);

  const [expandedPlanIds, setExpandedPlanIds] = useState<Record<string, boolean>>({});
  const [copiedPixId, setCopiedPixId] = useState<string | null>(null);

  const banksMap = new Map(profile.banks.map((b) => [b.id, b.name]));

  const toggleExpandPlan = (planId: string) => {
    setExpandedPlanIds((prev) => ({
      ...prev,
      [planId]: !prev[planId],
    }));
  };

  const handleCreatePlan = () => {
    setEditingPlan(null);
    setIsPlanModalVisible(true);
  };

  const handleEditPlan = (plan: Planning) => {
    setEditingPlan(plan);
    setIsPlanModalVisible(true);
  };

  const handleDeletePlan = (plan: Planning) => {
    Alert.alert(
      'Excluir Planejamento',
      `Tem certeza que deseja excluir "${plan.title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => deletePlanning(plan.id),
        },
      ]
    );
  };

  const handleCreateStep = (planId: string) => {
    setSelectedPlanIdForStep(planId);
    setEditingStep(null);
    setIsStepModalVisible(true);
  };

  const handleEditStep = (planId: string, step: Step) => {
    setSelectedPlanIdForStep(planId);
    setEditingStep(step);
    setIsStepModalVisible(true);
  };

  const handleDeleteStep = (planId: string, step: Step) => {
    Alert.alert(
      'Excluir Etapa',
      `Deseja excluir a etapa "${step.title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => deleteStep(planId, step.id),
        },
      ]
    );
  };

  const handleCopyPix = async (pixKey: string, id: string) => {
    if (!pixKey) {
      Alert.alert('Chave PIX', 'Nenhuma chave PIX informada.');
      return;
    }
    await Clipboard.setStringAsync(pixKey);
    setCopiedPixId(id);
    setTimeout(() => setCopiedPixId(null), 2500);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header e Botão Criar Planejamento */}
        <View style={styles.topBar}>
          <View>
            <Text style={[styles.heading, { color: theme.text }]}>Planejamentos</Text>
            <Text style={[styles.subheading, { color: theme.textSecondary }]}>
              {plannings.length} item(ns) cadastrado(s)
            </Text>
          </View>
          <TouchableOpacity
            style={styles.newPlanButton}
            onPress={handleCreatePlan}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={20} color="#FFF" />
            <Text style={styles.newPlanButtonText}>Novo Plano</Text>
          </TouchableOpacity>
        </View>

        {plannings.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <Ionicons name="folder-open-outline" size={48} color={theme.textSecondary} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Nenhum planejamento ainda</Text>
            <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>
              Crie despesas diretas com splits configuráveis ou contêineres com etapas agrupadas.
            </Text>
            <TouchableOpacity style={styles.emptyActionBtn} onPress={handleCreatePlan}>
              <Text style={styles.emptyActionBtnText}>Criar Planejamento</Text>
            </TouchableOpacity>
          </View>
        ) : (
          plannings.map((plan) => {
            const isDirect = plan.type === 'direct';
            const isExpanded = expandedPlanIds[plan.id] !== false;

            // Totais
            let totalPlanAmount = 0;
            let totalPaidAmount = 0;

            if (isDirect) {
              totalPlanAmount = plan.totalAmount || 0;
              totalPaidAmount = (plan.directInstallments || [])
                .filter((i) => i.isPaid)
                .reduce((acc, curr) => acc + curr.amount, 0);
            } else {
              totalPlanAmount = (plan.steps || []).reduce((sum, s) => sum + s.totalAmount, 0);
              totalPaidAmount = (plan.steps || []).reduce(
                (sum, s) =>
                  sum +
                  s.installments
                    .filter((inst) => inst.isPaid)
                    .reduce((acc, curr) => acc + curr.amount, 0),
                0
              );
            }

            const progressPercent =
              totalPlanAmount > 0 ? Math.min(100, Math.round((totalPaidAmount / totalPlanAmount) * 100)) : 0;

            const bankName = plan.bankAccountId ? banksMap.get(plan.bankAccountId) : undefined;

            return (
              <View
                key={plan.id}
                style={[styles.planCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
              >
                {/* Header do Planejamento */}
                <TouchableOpacity
                  style={styles.planHeader}
                  onPress={() => toggleExpandPlan(plan.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.planHeaderLeft}>
                    <View style={[styles.colorStripe, { backgroundColor: plan.color || Colors.primary }]} />
                    <View style={{ flex: 1 }}>
                      <View style={styles.categoryBadgeRow}>
                        <Text style={[styles.categoryBadgeText, { color: plan.color || Colors.primary }]}>
                          {plan.category} • {isDirect ? 'Despesa Direta' : 'Com Etapas'}
                        </Text>
                      </View>
                      <Text style={[styles.planTitle, { color: theme.text }]}>{plan.title}</Text>
                      {plan.description ? (
                        <Text style={[styles.planDesc, { color: theme.textSecondary }]}>
                          {plan.description}
                        </Text>
                      ) : null}

                      {/* Metadados no Direto */}
                      {isDirect && (
                        <View style={styles.metaRow}>
                          {bankName && (
                            <View style={[styles.metaChip, { backgroundColor: theme.inputBg }]}>
                              <Ionicons name="business-outline" size={11} color={theme.textSecondary} />
                              <Text style={[styles.metaChipText, { color: theme.textSecondary }]}>{bankName}</Text>
                            </View>
                          )}
                          {plan.paymentMethod && (
                            <View style={[styles.metaChip, { backgroundColor: theme.inputBg }]}>
                              <Text style={[styles.metaChipText, { color: theme.textSecondary }]}>
                                {plan.paymentMethod}
                              </Text>
                            </View>
                          )}
                          <View style={[styles.metaChip, { backgroundColor: theme.inputBg }]}>
                            <Text style={[styles.metaChipText, { color: theme.textSecondary }]}>
                              {plan.paymentMode === 'single' ? 'À vista' : 'Split'}
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.planHeaderRight}>
                    <TouchableOpacity onPress={() => handleEditPlan(plan)} style={styles.iconAction}>
                      <Ionicons name="pencil-outline" size={18} color={theme.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeletePlan(plan)} style={styles.iconAction}>
                      <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                    </TouchableOpacity>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={theme.textSecondary}
                    />
                  </View>
                </TouchableOpacity>

                {/* Barra de Progresso */}
                <View style={styles.progressSection}>
                  <View style={styles.progressInfoRow}>
                    <Text style={[styles.progressLabel, { color: theme.textSecondary }]}>
                      Progresso ({progressPercent}%)
                    </Text>
                    <Text style={[styles.progressValues, { color: theme.text }]}>
                      {formatCurrencyBRL(totalPaidAmount)} de {formatCurrencyBRL(totalPlanAmount)}
                    </Text>
                  </View>
                  <View style={[styles.progressBarBg, { backgroundColor: theme.inputBg }]}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${progressPercent}%`,
                          backgroundColor: plan.color || Colors.primary,
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* CORPO DO CARD QUANDO EXPANDIDO */}
                {isExpanded && (
                  <View style={[styles.bodyContainer, { borderTopColor: theme.border }]}>
                    {/* CASO 1: DESPESA DIRETA (SEM ETAPAS) */}
                    {isDirect ? (
                      <View>
                        {/* Informações PIX / Favorecido */}
                        {(plan.recipientName || plan.pixKey) && (
                          <View style={[styles.pixBar, { backgroundColor: theme.inputBg }]}>
                            <View style={{ flex: 1 }}>
                              {plan.recipientName ? (
                                <Text style={[styles.pixRecipient, { color: theme.text }]}>
                                  Favorecido: {plan.recipientName}
                                </Text>
                              ) : null}
                              {plan.pixKey ? (
                                <Text style={[styles.pixKeyText, { color: theme.textSecondary }]}>
                                  PIX ({plan.pixKeyType}): {plan.pixKey}
                                </Text>
                              ) : null}
                            </View>
                            {plan.pixKey ? (
                              <TouchableOpacity
                                style={[
                                  styles.copyPixChip,
                                  copiedPixId === plan.id && styles.copyPixChipActive,
                                ]}
                                onPress={() => handleCopyPix(plan.pixKey || '', plan.id)}
                              >
                                <Ionicons
                                  name={copiedPixId === plan.id ? 'checkmark' : 'copy-outline'}
                                  size={13}
                                  color={copiedPixId === plan.id ? '#10B981' : theme.text}
                                />
                                <Text
                                  style={[
                                    styles.copyPixChipText,
                                    { color: copiedPixId === plan.id ? '#10B981' : theme.text },
                                  ]}
                                >
                                  {copiedPixId === plan.id ? 'Copiado!' : 'Copiar PIX'}
                                </Text>
                              </TouchableOpacity>
                            ) : null}
                          </View>
                        )}

                        {/* Parcelas do Planejamento Direto */}
                        <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
                          Parcelas do Pagamento ({(plan.directInstallments || []).length}):
                        </Text>

                        <View style={styles.installmentsGrid}>
                          {(plan.directInstallments || []).map((inst) => (
                            <View
                              key={inst.id}
                              style={[
                                styles.installmentItem,
                                {
                                  backgroundColor: inst.isPaid ? '#10B98115' : theme.cardBackground,
                                  borderColor: inst.isPaid ? Colors.primary : theme.border,
                                },
                              ]}
                            >
                              <View style={{ flex: 1 }}>
                                <View style={styles.instHeaderRow}>
                                  <Text style={[styles.instDate, { color: theme.text }]}>
                                    Vence: {formatDateBR(inst.dueDate)} (dia {inst.incomeDay})
                                  </Text>
                                  {inst.isPaid && <Text style={styles.paidBadge}>Pago</Text>}
                                </View>
                                <Text
                                  style={[
                                    styles.instAmount,
                                    { color: inst.isPaid ? Colors.primary : theme.text },
                                  ]}
                                >
                                  {formatCurrencyBRL(inst.amount)}
                                </Text>
                              </View>

                              <TouchableOpacity
                                style={[
                                  styles.checkBtn,
                                  {
                                    backgroundColor: inst.isPaid ? Colors.primary : 'transparent',
                                    borderColor: inst.isPaid ? Colors.primary : theme.border,
                                  },
                                ]}
                                onPress={() => toggleDirectInstallmentPaid(plan.id, inst.id)}
                              >
                                {inst.isPaid && <Ionicons name="checkmark" size={16} color="#FFF" />}
                              </TouchableOpacity>
                            </View>
                          ))}
                        </View>
                      </View>
                    ) : (
                      /* CASO 2: CONTÊINER COM ETAPAS */
                      <View>
                        <View style={styles.stepsHeader}>
                          <Text style={[styles.stepsHeaderTitle, { color: theme.text }]}>
                            Etapas & Metas ({plan.steps?.length || 0})
                          </Text>
                          <TouchableOpacity
                            style={styles.addStepBtn}
                            onPress={() => handleCreateStep(plan.id)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="add-circle" size={16} color={Colors.primary} />
                            <Text style={styles.addStepBtnText}>Nova Etapa</Text>
                          </TouchableOpacity>
                        </View>

                        {(!plan.steps || plan.steps.length === 0) ? (
                          <View style={[styles.noStepsBox, { backgroundColor: theme.inputBg }]}>
                            <Text style={[styles.noStepsText, { color: theme.textSecondary }]}>
                              Nenhuma etapa cadastrada neste planejamento ainda.
                            </Text>
                            <TouchableOpacity onPress={() => handleCreateStep(plan.id)}>
                              <Text style={styles.noStepsAction}>+ Adicionar primeira etapa</Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          plan.steps.map((step) => {
                            const stepBankName = step.bankAccountId ? banksMap.get(step.bankAccountId) : undefined;

                            return (
                              <View
                                key={step.id}
                                style={[
                                  styles.stepCard,
                                  { backgroundColor: theme.inputBg, borderColor: theme.border },
                                ]}
                              >
                                <View style={styles.stepHeader}>
                                  <View style={{ flex: 1 }}>
                                    <Text style={[styles.stepTitle, { color: theme.text }]}>
                                      {step.title}
                                    </Text>
                                    {step.description ? (
                                      <Text style={[styles.stepDesc, { color: theme.textSecondary }]}>
                                        {step.description}
                                      </Text>
                                    ) : null}

                                    {/* Badges de Conta e Método na Etapa */}
                                    <View style={styles.metaRow}>
                                      {stepBankName && (
                                        <View style={[styles.metaChip, { backgroundColor: theme.cardBackground }]}>
                                          <Ionicons name="business-outline" size={10} color={theme.textSecondary} />
                                          <Text style={[styles.metaChipText, { color: theme.textSecondary }]}>{stepBankName}</Text>
                                        </View>
                                      )}
                                      {step.paymentMethod && (
                                        <View style={[styles.metaChip, { backgroundColor: theme.cardBackground }]}>
                                          <Text style={[styles.metaChipText, { color: theme.textSecondary }]}>
                                            {step.paymentMethod}
                                          </Text>
                                        </View>
                                      )}
                                    </View>

                                    <Text style={[styles.stepDeadline, { color: theme.textSecondary }]}>
                                      Prazo final: {formatDateBR(step.deadlineDate)}
                                    </Text>
                                  </View>

                                  <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={[styles.stepTotalAmount, { color: theme.text }]}>
                                      {formatCurrencyBRL(step.totalAmount)}
                                    </Text>
                                    <View style={styles.stepActionsRow}>
                                      <TouchableOpacity
                                        onPress={() => handleEditStep(plan.id, step)}
                                        style={styles.smallIconBtn}
                                      >
                                        <Ionicons name="pencil" size={15} color={theme.textSecondary} />
                                      </TouchableOpacity>
                                      <TouchableOpacity
                                        onPress={() => handleDeleteStep(plan.id, step)}
                                        style={styles.smallIconBtn}
                                      >
                                        <Ionicons name="trash-outline" size={15} color={Colors.danger} />
                                      </TouchableOpacity>
                                    </View>
                                  </View>
                                </View>

                                {/* PIX na Etapa */}
                                {(step.recipientName || step.pixKey) && (
                                  <View style={[styles.pixBar, { backgroundColor: theme.cardBackground }]}>
                                    <View style={{ flex: 1 }}>
                                      {step.recipientName ? (
                                        <Text style={[styles.pixRecipient, { color: theme.text }]}>
                                          Favorecido: {step.recipientName}
                                        </Text>
                                      ) : null}
                                      {step.pixKey ? (
                                        <Text style={[styles.pixKeyText, { color: theme.textSecondary }]}>
                                          PIX ({step.pixKeyType}): {step.pixKey}
                                        </Text>
                                      ) : null}
                                    </View>
                                    {step.pixKey ? (
                                      <TouchableOpacity
                                        style={[
                                          styles.copyPixChip,
                                          copiedPixId === step.id && styles.copyPixChipActive,
                                        ]}
                                        onPress={() => handleCopyPix(step.pixKey, step.id)}
                                      >
                                        <Ionicons
                                          name={copiedPixId === step.id ? 'checkmark' : 'copy-outline'}
                                          size={13}
                                          color={copiedPixId === step.id ? '#10B981' : theme.text}
                                        />
                                        <Text
                                          style={[
                                            styles.copyPixChipText,
                                            { color: copiedPixId === step.id ? '#10B981' : theme.text },
                                          ]}
                                        >
                                          {copiedPixId === step.id ? 'Copiado!' : 'Copiar PIX'}
                                        </Text>
                                      </TouchableOpacity>
                                    ) : null}
                                  </View>
                                )}

                                {/* Parcelas da Etapa */}
                                <View style={styles.installmentsGrid}>
                                  {step.installments.map((inst) => (
                                    <View
                                      key={inst.id}
                                      style={[
                                        styles.installmentItem,
                                        {
                                          backgroundColor: inst.isPaid
                                            ? '#10B98115'
                                            : theme.cardBackground,
                                          borderColor: inst.isPaid ? Colors.primary : theme.border,
                                        },
                                      ]}
                                    >
                                      <View style={{ flex: 1 }}>
                                        <View style={styles.instHeaderRow}>
                                          <Text style={[styles.instDate, { color: theme.text }]}>
                                            {formatDateBR(inst.dueDate)} (dia {inst.incomeDay})
                                          </Text>
                                          {inst.isPaid && <Text style={styles.paidBadge}>Pago</Text>}
                                        </View>
                                        <Text
                                          style={[
                                            styles.instAmount,
                                            { color: inst.isPaid ? Colors.primary : theme.text },
                                          ]}
                                        >
                                          {formatCurrencyBRL(inst.amount)}
                                        </Text>
                                      </View>

                                      <TouchableOpacity
                                        style={[
                                          styles.checkBtn,
                                          {
                                            backgroundColor: inst.isPaid
                                              ? Colors.primary
                                              : 'transparent',
                                            borderColor: inst.isPaid
                                              ? Colors.primary
                                              : theme.border,
                                          },
                                        ]}
                                        onPress={() => toggleInstallmentPaid(plan.id, step.id, inst.id)}
                                      >
                                        {inst.isPaid && (
                                          <Ionicons name="checkmark" size={16} color="#FFF" />
                                        )}
                                      </TouchableOpacity>
                                    </View>
                                  ))}
                                </View>
                              </View>
                            );
                          })
                        )}
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Modal de Criação / Edição de Planejamento */}
      <PlanningModal
        visible={isPlanModalVisible}
        onClose={() => setIsPlanModalVisible(false)}
        planningToEdit={editingPlan}
      />

      {/* Modal de Criação / Edição de Etapa */}
      <StepModal
        visible={isStepModalVisible}
        onClose={() => setIsStepModalVisible(false)}
        planId={selectedPlanIdForStep}
        stepToEdit={editingStep}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
  },
  subheading: {
    fontSize: 13,
  },
  newPlanButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  newPlanButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyContainer: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
  },
  emptyDesc: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  emptyActionBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 18,
  },
  emptyActionBtnText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  planCard: {
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  planHeaderLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  colorStripe: {
    width: 4,
    borderRadius: 2,
    marginRight: 12,
  },
  categoryBadgeRow: {
    marginBottom: 4,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  planTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  planDesc: {
    fontSize: 13,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  metaChipText: {
    fontSize: 11,
    textTransform: 'capitalize',
  },
  planHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconAction: {
    padding: 4,
  },
  progressSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  progressInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
  },
  progressValues: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  bodyContainer: {
    borderTopWidth: 1,
    padding: 16,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  pixBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  pixRecipient: {
    fontSize: 12,
    fontWeight: '600',
  },
  pixKeyText: {
    fontSize: 11,
    marginTop: 2,
  },
  copyPixChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#8882',
  },
  copyPixChipActive: {
    backgroundColor: '#10B98120',
  },
  copyPixChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  installmentsGrid: {
    gap: 8,
  },
  installmentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  instHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  instDate: {
    fontSize: 12,
    fontWeight: '600',
  },
  paidBadge: {
    backgroundColor: '#10B981',
    color: '#FFF',
    fontSize: 9,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  instAmount: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  checkBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepsHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  addStepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addStepBtnText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  noStepsBox: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  noStepsText: {
    fontSize: 13,
    textAlign: 'center',
  },
  noStepsAction: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
  },
  stepCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  stepDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  stepDeadline: {
    fontSize: 11,
    marginTop: 4,
  },
  stepTotalAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  stepActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  smallIconBtn: {
    padding: 4,
  },
});
