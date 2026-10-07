import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { useFinanceStore } from '@/stores/financeStore';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { IncomeDate, BankAccount, Debt } from '@/types/finance';
import { requestNotificationPermissions } from '@/services/notificationService';

export function OnboardingModal({ visible }: { visible: boolean }) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme];

  const { setNewPin, isBiometricsAvailable } = useAuthStore();
  const { completeOnboarding } = useFinanceStore();

  const [step, setStep] = useState<1 | 2>(1);

  // Passo 1: Segurança
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [enableBiometrics, setEnableBiometrics] = useState(false);
  const [securityError, setSecurityError] = useState('');

  // Passo 2: Setup Financeiro
  const [monthlyIncomeStr, setMonthlyIncomeStr] = useState('');
  const [incomeDates, setIncomeDates] = useState<IncomeDate[]>([
    { day: 15, percentage: 40 },
    { day: 30, percentage: 60 },
  ]);
  const [banks, setBanks] = useState<BankAccount[]>([
    { id: '1', name: 'Nubank', type: 'corrente' },
  ]);
  const [newBankName, setNewBankName] = useState('');
  const [debts, setDebts] = useState<Debt[]>([]);
  const [newDebtTitle, setNewDebtTitle] = useState('');
  const [newDebtAmountStr, setNewDebtAmountStr] = useState('');

  const handleNextToStep2 = () => {
    if (pin.length !== 8) {
      setSecurityError('O PIN deve conter exatamente 8 dígitos numéricos.');
      return;
    }
    if (pin !== confirmPin) {
      setSecurityError('Os PINs digitados não coincidem.');
      return;
    }
    setSecurityError('');
    setStep(2);
  };

  const handleAddIncomeDate = () => {
    if (incomeDates.length >= 4) {
      Alert.alert('Limite', 'Você pode adicionar no máximo 4 datas de recebimento.');
      return;
    }
    const defaultPercentage = Math.floor(100 / (incomeDates.length + 1));
    setIncomeDates([...incomeDates, { day: 5, percentage: defaultPercentage }]);
  };

  const handleUpdateIncomeDate = (index: number, field: 'day' | 'percentage', value: number) => {
    const updated = [...incomeDates];
    updated[index] = { ...updated[index], [field]: value };
    setIncomeDates(updated);
  };

  const handleRemoveIncomeDate = (index: number) => {
    if (incomeDates.length <= 1) {
      Alert.alert('Atenção', 'Você deve manter ao menos uma data de recebimento.');
      return;
    }
    setIncomeDates(incomeDates.filter((_, i) => i !== index));
  };

  const handleAddBank = () => {
    if (!newBankName.trim()) return;
    setBanks([
      ...banks,
      {
        id: `bank_${Date.now()}`,
        name: newBankName.trim(),
        type: 'corrente',
      },
    ]);
    setNewBankName('');
  };

  const handleRemoveBank = (id: string) => {
    setBanks(banks.filter((b) => b.id !== id));
  };

  const handleAddDebt = () => {
    const amount = parseFloat(newDebtAmountStr.replace(',', '.'));
    if (!newDebtTitle.trim() || isNaN(amount) || amount <= 0) {
      Alert.alert('Dados inválidos', 'Informe a descrição e o valor da dívida.');
      return;
    }
    setDebts([
      ...debts,
      {
        id: `debt_${Date.now()}`,
        title: newDebtTitle.trim(),
        totalAmount: amount,
        remainingAmount: amount,
      },
    ]);
    setNewDebtTitle('');
    setNewDebtAmountStr('');
  };

  const handleRemoveDebt = (id: string) => {
    setDebts(debts.filter((d) => d.id !== id));
  };

  const handleFinishOnboarding = async () => {
    const totalPercentage = incomeDates.reduce((acc, curr) => acc + curr.percentage, 0);
    if (totalPercentage !== 100) {
      Alert.alert(
        'Soma das Porcentagens',
        `A soma das porcentagens de recebimento deve ser 100% (atualmente está em ${totalPercentage}%).`
      );
      return;
    }

    const income = parseFloat(monthlyIncomeStr.replace(',', '.')) || 0;

    // Salva PIN seguro
    await setNewPin(pin, enableBiometrics);

    // Salva perfil financeiro
    await completeOnboarding({
      monthlyIncome: income,
      incomeDates,
      banks,
      debts,
    });

    // Pede permissão para notificações locais
    await requestNotificationPermissions();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: theme.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.badge, { backgroundColor: '#10B98120' }]}>
              <Text style={styles.badgeText}>Passo {step} de 2</Text>
            </View>
            <Text style={[styles.title, { color: theme.text }]}>
              {step === 1 ? 'Segurança e Acesso' : 'Setup Financeiro Inicial'}
            </Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              {step === 1
                ? 'Todos os seus dados são criptografados e salvos unicamente no seu aparelho.'
                : 'Configure sua renda e fluxo de recebimento para calcular os splits automáticos.'}
            </Text>
          </View>

          {step === 1 ? (
            /* PASSO 1: PIN E BIOMETRIA */
            <View style={styles.cardSection}>
              <Text style={[styles.label, { color: theme.text }]}>Crie um PIN de 8 dígitos *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                placeholder="Ex: 12345678"
                placeholderTextColor={theme.textSecondary}
                keyboardType="numeric"
                maxLength={8}
                secureTextEntry
                value={pin}
                onChangeText={setPin}
              />

              <Text style={[styles.label, { color: theme.text }]}>Confirme seu PIN de 8 dígitos *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                placeholder="Repita os 8 dígitos"
                placeholderTextColor={theme.textSecondary}
                keyboardType="numeric"
                maxLength={8}
                secureTextEntry
                value={confirmPin}
                onChangeText={setConfirmPin}
              />

              {securityError ? <Text style={styles.errorText}>{securityError}</Text> : null}

              {isBiometricsAvailable && (
                <View style={[styles.switchRow, { borderColor: theme.border }]}>
                  <View style={styles.switchInfo}>
                    <Ionicons name="finger-print-outline" size={24} color={Colors.primary} />
                    <View style={{ marginLeft: 12 }}>
                      <Text style={[styles.switchTitle, { color: theme.text }]}>Biometria / FaceID</Text>
                      <Text style={[styles.switchSubtitle, { color: theme.textSecondary }]}>
                        Desbloquear sem precisar digitar o PIN
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={enableBiometrics}
                    onValueChange={setEnableBiometrics}
                    trackColor={{ false: theme.border, true: Colors.primary }}
                  />
                </View>
              )}

              <TouchableOpacity style={styles.primaryButton} onPress={handleNextToStep2} activeOpacity={0.8}>
                <Text style={styles.primaryButtonText}>Avançar para o Setup Financeiro</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFF" style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            </View>
          ) : (
            /* PASSO 2: SETUP FINANCEIRO */
            <View style={styles.cardSection}>
              {/* Renda Mensal */}
              <Text style={[styles.label, { color: theme.text }]}>Renda Total Mensal (R$)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                placeholder="Ex: 5000.00"
                placeholderTextColor={theme.textSecondary}
                keyboardType="decimal-pad"
                value={monthlyIncomeStr}
                onChangeText={setMonthlyIncomeStr}
              />

              {/* Datas de Recebimento e Splits */}
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.label, { color: theme.text, marginBottom: 0 }]}>
                  Datas de Recebimento & Proporção (%)
                </Text>
                <TouchableOpacity onPress={handleAddIncomeDate} style={styles.smallAddButton}>
                  <Ionicons name="add" size={16} color={Colors.primary} />
                  <Text style={styles.smallAddText}>Adicionar Data</Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.helperText, { color: theme.textSecondary }]}>
                Informe os dias em que você recebe dinheiro no mês e a % dividida entre eles.
              </Text>

              {incomeDates.map((item, index) => (
                <View key={index} style={[styles.incomeRow, { borderColor: theme.border }]}>
                  <View style={styles.incomeCol}>
                    <Text style={[styles.subLabel, { color: theme.textSecondary }]}>Dia do Mês</Text>
                    <TextInput
                      style={[styles.smallInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                      placeholder="Dia"
                      placeholderTextColor={theme.textSecondary}
                      keyboardType="number-pad"
                      maxLength={2}
                      value={String(item.day)}
                      onChangeText={(val) => handleUpdateIncomeDate(index, 'day', parseInt(val) || 1)}
                    />
                  </View>
                  <View style={styles.incomeCol}>
                    <Text style={[styles.subLabel, { color: theme.textSecondary }]}>Proporção (%)</Text>
                    <TextInput
                      style={[styles.smallInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                      placeholder="%"
                      placeholderTextColor={theme.textSecondary}
                      keyboardType="number-pad"
                      maxLength={3}
                      value={String(item.percentage)}
                      onChangeText={(val) => handleUpdateIncomeDate(index, 'percentage', parseInt(val) || 0)}
                    />
                  </View>
                  <TouchableOpacity onPress={() => handleRemoveIncomeDate(index)} style={styles.deleteIconBtn}>
                    <Ionicons name="trash-outline" size={20} color={Colors.danger} />
                  </TouchableOpacity>
                </View>
              ))}

              {/* Bancos Utilizados */}
              <Text style={[styles.label, { color: theme.text, marginTop: 16 }]}>Bancos / Contas</Text>
              <View style={styles.addInlineRow}>
                <TextInput
                  style={[styles.inlineInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                  placeholder="Nome do Banco (ex: Itaú, Nubank)"
                  placeholderTextColor={theme.textSecondary}
                  value={newBankName}
                  onChangeText={setNewBankName}
                />
                <TouchableOpacity style={styles.inlineAddBtn} onPress={handleAddBank}>
                  <Text style={styles.inlineAddBtnText}>Adicionar</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.tagsContainer}>
                {banks.map((bank) => (
                  <View key={bank.id} style={[styles.tag, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                    <Ionicons name="business-outline" size={14} color={Colors.primary} style={{ marginRight: 6 }} />
                    <Text style={[styles.tagText, { color: theme.text }]}>{bank.name}</Text>
                    <TouchableOpacity onPress={() => handleRemoveBank(bank.id)}>
                      <Ionicons name="close-circle" size={16} color={theme.textSecondary} style={{ marginLeft: 6 }} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              {/* Dívidas Atuais Conhecidas */}
              <Text style={[styles.label, { color: theme.text, marginTop: 16 }]}>Dívidas Atuais Conhecidas (Opcional)</Text>
              <View style={styles.debtForm}>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                  placeholder="Nome da Dívida (ex: Cartão de Crédito)"
                  placeholderTextColor={theme.textSecondary}
                  value={newDebtTitle}
                  onChangeText={setNewDebtTitle}
                />
                <View style={styles.addInlineRow}>
                  <TextInput
                    style={[styles.inlineInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                    placeholder="Valor total (R$)"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="decimal-pad"
                    value={newDebtAmountStr}
                    onChangeText={setNewDebtAmountStr}
                  />
                  <TouchableOpacity style={styles.inlineAddBtn} onPress={handleAddDebt}>
                    <Text style={styles.inlineAddBtnText}>+ Dívida</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {debts.map((debt) => (
                <View key={debt.id} style={[styles.debtItem, { borderColor: theme.border, backgroundColor: theme.cardBackground }]}>
                  <View>
                    <Text style={[styles.debtTitle, { color: theme.text }]}>{debt.title}</Text>
                    <Text style={[styles.debtAmount, { color: Colors.danger }]}>
                      R$ {debt.totalAmount.toFixed(2)}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => handleRemoveDebt(debt.id)}>
                    <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                  </TouchableOpacity>
                </View>
              ))}

              {/* Ações Finais */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.secondaryButton, { borderColor: theme.border }]}
                  onPress={() => setStep(1)}
                >
                  <Ionicons name="arrow-back" size={18} color={theme.text} style={{ marginRight: 6 }} />
                  <Text style={[styles.secondaryButtonText, { color: theme.text }]}>Voltar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.primaryButton, { flex: 1, marginLeft: 12 }]}
                  onPress={handleFinishOnboarding}
                >
                  <Text style={styles.primaryButtonText}>Concluir & Acessar</Text>
                  <Ionicons name="checkmark-done" size={20} color="#FFF" style={{ marginLeft: 8 }} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    marginBottom: 12,
  },
  badgeText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 16,
    lineHeight: 20,
  },
  cardSection: {
    marginTop: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },
  subLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  helperText: {
    fontSize: 12,
    marginBottom: 10,
  },
  input: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 12,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginVertical: 16,
  },
  switchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  switchTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  switchSubtitle: {
    fontSize: 12,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 13,
    marginBottom: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 4,
  },
  smallAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  smallAddText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },
  incomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  incomeCol: {
    flex: 1,
  },
  smallInput: {
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  deleteIconBtn: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
  },
  addInlineRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  inlineInput: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  inlineAddBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inlineAddBtnText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500',
  },
  debtForm: {
    marginBottom: 8,
  },
  debtItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  debtTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  debtAmount: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    height: 52,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
