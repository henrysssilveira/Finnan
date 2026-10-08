import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Debt, PaymentMethod } from '@/types/finance';
import { useFinanceStore } from '@/stores/financeStore';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

interface DebtModalProps {
  visible: boolean;
  onClose: () => void;
  debtToEdit?: Debt | null;
}

const PAYMENT_METHODS: { label: string; value: PaymentMethod; icon: string }[] = [
  { label: 'Boleto', value: 'boleto', icon: 'barcode-outline' },
  { label: 'PIX', value: 'pix', icon: 'flash-outline' },
  { label: 'Débito', value: 'debito', icon: 'card-outline' },
  { label: 'Crédito', value: 'credito', icon: 'card' },
  { label: 'Outro', value: 'outro', icon: 'cash-outline' },
];

export function DebtModal({ visible, onClose, debtToEdit }: DebtModalProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme];
  const { profile, addDebt, updateDebt } = useFinanceStore();

  const [title, setTitle] = useState('');
  const [creditor, setCreditor] = useState('');
  const [totalAmountStr, setTotalAmountStr] = useState('');
  const [remainingAmountStr, setRemainingAmountStr] = useState('');
  const [installmentsCountStr, setInstallmentsCountStr] = useState('');
  const [monthlyPaymentStr, setMonthlyPaymentStr] = useState('');
  const [dueDateStr, setDueDateStr] = useState('');
  const [selectedBankId, setSelectedBankId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('boleto');
  const [includeInMonthly, setIncludeInMonthly] = useState(true);

  useEffect(() => {
    if (debtToEdit) {
      setTitle(debtToEdit.title);
      setCreditor(debtToEdit.creditor || '');
      setTotalAmountStr(String(debtToEdit.totalAmount || ''));
      setRemainingAmountStr(String(debtToEdit.remainingAmount ?? debtToEdit.totalAmount ?? ''));
      setInstallmentsCountStr(debtToEdit.installmentsCount ? String(debtToEdit.installmentsCount) : '');
      setMonthlyPaymentStr(debtToEdit.monthlyPayment ? String(debtToEdit.monthlyPayment) : '');
      setDueDateStr(debtToEdit.dueDate || '');
      setSelectedBankId(debtToEdit.bankAccountId || (profile.banks[0]?.id || ''));
      setPaymentMethod(debtToEdit.paymentMethod || 'boleto');
      setIncludeInMonthly(debtToEdit.isIncludedInMonthlyPlanning !== false);
    } else {
      setTitle('');
      setCreditor('');
      setTotalAmountStr('');
      setRemainingAmountStr('');
      setInstallmentsCountStr('');
      setMonthlyPaymentStr('');
      setDueDateStr('10');
      setSelectedBankId(profile.banks[0]?.id || '');
      setPaymentMethod('boleto');
      setIncludeInMonthly(true);
    }
  }, [debtToEdit, visible, profile.banks]);

  // Se digitar total e parcelas, sugere valor mensal
  const handleCalculateMonthly = (total: number, installments: number) => {
    if (total > 0 && installments > 0) {
      const calculated = (total / installments).toFixed(2);
      setMonthlyPaymentStr(calculated);
    }
  };

  const handleSave = async () => {
    const total = parseFloat(totalAmountStr.replace(',', '.')) || 0;
    if (!title.trim() || total <= 0) {
      Alert.alert('Dados Inválidos', 'Informe a descrição e o valor total da dívida.');
      return;
    }

    const remaining = remainingAmountStr ? parseFloat(remainingAmountStr.replace(',', '.')) : total;
    const installmentsCount = parseInt(installmentsCountStr) || undefined;
    const monthlyPayment = parseFloat(monthlyPaymentStr.replace(',', '.')) || undefined;

    if (debtToEdit) {
      await updateDebt(debtToEdit.id, {
        title: title.trim(),
        creditor: creditor.trim(),
        totalAmount: total,
        remainingAmount: remaining,
        installmentsCount,
        monthlyPayment,
        dueDate: dueDateStr.trim(),
        bankAccountId: selectedBankId,
        paymentMethod,
        isIncludedInMonthlyPlanning: includeInMonthly,
      });
    } else {
      await addDebt({
        title: title.trim(),
        creditor: creditor.trim(),
        totalAmount: total,
        remainingAmount: remaining,
        installmentsCount,
        monthlyPayment,
        dueDate: dueDateStr.trim(),
        bankAccountId: selectedBankId,
        paymentMethod,
        isIncludedInMonthlyPlanning: includeInMonthly,
      });
    }

    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.modalCard, { backgroundColor: theme.cardBackground }]}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: theme.text }]}>
                {debtToEdit ? 'Planejar & Editar Dívida' : 'Nova Dívida & Planejamento'}
              </Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Configure o valor, amortização e conta para quitação
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {/* Título e Credor */}
            <Text style={[styles.label, { color: theme.text }]}>Nome da Dívida *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
              placeholder="Ex: Empréstimo Caixa, Financiamento Carro"
              placeholderTextColor={theme.textSecondary}
              value={title}
              onChangeText={setTitle}
            />

            <Text style={[styles.label, { color: theme.text }]}>Credor / Instituição</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
              placeholder="Ex: Santander, Banco do Brasil, Construtora"
              placeholderTextColor={theme.textSecondary}
              value={creditor}
              onChangeText={setCreditor}
            />

            {/* Valores */}
            <View style={styles.twoCols}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: theme.text }]}>Valor Total (R$) *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                  placeholder="0.00"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="decimal-pad"
                  value={totalAmountStr}
                  onChangeText={(val) => {
                    setTotalAmountStr(val);
                    const t = parseFloat(val.replace(',', '.')) || 0;
                    const inst = parseInt(installmentsCountStr) || 0;
                    handleCalculateMonthly(t, inst);
                  }}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: theme.text }]}>Saldo Restante (R$)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                  placeholder="0.00"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="decimal-pad"
                  value={remainingAmountStr}
                  onChangeText={setRemainingAmountStr}
                />
              </View>
            </View>

            {/* Parcelas e Valor Mensal */}
            <View style={styles.twoCols}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: theme.text }]}>Nº Parcelas</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                  placeholder="Ex: 12"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="number-pad"
                  value={installmentsCountStr}
                  onChangeText={(val) => {
                    setInstallmentsCountStr(val);
                    const t = parseFloat(totalAmountStr.replace(',', '.')) || 0;
                    const inst = parseInt(val) || 0;
                    handleCalculateMonthly(t, inst);
                  }}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: theme.text }]}>Parcela Mensal (R$)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                  placeholder="0.00"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="decimal-pad"
                  value={monthlyPaymentStr}
                  onChangeText={setMonthlyPaymentStr}
                />
              </View>
            </View>

            {/* Dia do Vencimento */}
            <Text style={[styles.label, { color: theme.text }]}>Dia de Vencimento do Mês</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
              placeholder="Ex: 10 ou 20"
              placeholderTextColor={theme.textSecondary}
              keyboardType="number-pad"
              maxLength={2}
              value={dueDateStr}
              onChangeText={setDueDateStr}
            />

            {/* Conta Bancária Pagadora */}
            {profile.banks.length > 0 && (
              <>
                <Text style={[styles.label, { color: theme.text }]}>Pagar com qual Conta / Banco?</Text>
                <View style={styles.chipsRow}>
                  {profile.banks.map((b) => {
                    const isSelected = selectedBankId === b.id;
                    return (
                      <TouchableOpacity
                        key={b.id}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: isSelected ? Colors.primary : theme.inputBg,
                            borderColor: isSelected ? Colors.primary : theme.border,
                          },
                        ]}
                        onPress={() => setSelectedBankId(b.id)}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            { color: isSelected ? '#FFF' : theme.text, fontWeight: isSelected ? '700' : '500' },
                          ]}
                        >
                          {b.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            {/* Forma de Pagamento */}
            <Text style={[styles.label, { color: theme.text }]}>Forma de Pagamento</Text>
            <View style={styles.chipsRow}>
              {PAYMENT_METHODS.map((pm) => {
                const isSelected = paymentMethod === pm.value;
                return (
                  <TouchableOpacity
                    key={pm.value}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isSelected ? Colors.primary : theme.inputBg,
                        borderColor: isSelected ? Colors.primary : theme.border,
                      },
                    ]}
                    onPress={() => setPaymentMethod(pm.value)}
                  >
                    <Ionicons
                      name={pm.icon as any}
                      size={14}
                      color={isSelected ? '#FFF' : theme.textSecondary}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[
                        styles.chipText,
                        { color: isSelected ? '#FFF' : theme.text, fontWeight: isSelected ? '700' : '500' },
                      ]}
                    >
                      {pm.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Switch Incluir no Comprometido Mensal */}
            <View style={[styles.switchRow, { borderColor: theme.border }]}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={[styles.switchTitle, { color: theme.text }]}>
                  Incluir no Comprometido do Mês
                </Text>
                <Text style={[styles.switchSub, { color: theme.textSecondary }]}>
                  Soma a parcela mensal no gráfico de gastos e saldo livre
                </Text>
              </View>
              <Switch
                value={includeInMonthly}
                onValueChange={setIncludeInMonthly}
                trackColor={{ false: theme.border, true: Colors.primary }}
              />
            </View>

            {/* Botão Salvar */}
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
              <Text style={styles.saveBtnText}>
                {debtToEdit ? 'Salvar Alterações da Dívida' : 'Planejar & Cadastrar Dívida'}
              </Text>
              <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 32,
    maxHeight: '92%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  scroll: {
    paddingBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  twoCols: {
    flexDirection: 'row',
    gap: 12,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
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
  switchTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  switchSub: {
    fontSize: 12,
    marginTop: 2,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    height: 50,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
