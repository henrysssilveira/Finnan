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
import { Step, RecurrenceType, PaymentMethod, PaymentMode, IncomeDate } from '@/types/finance';
import { useFinanceStore } from '@/stores/financeStore';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import {
  generateSplitInstallments,
  formatCurrencyBRL,
  formatDateBR,
  formatDateISO,
} from '@/services/splitCalculator';
import { DatePickerButton } from '@/components/DatePickerButton';

interface StepModalProps {
  visible: boolean;
  onClose: () => void;
  planId: string;
  stepToEdit?: Step | null;
}

const PIX_TYPES = [
  { label: 'CPF', value: 'cpf' },
  { label: 'E-mail', value: 'email' },
  { label: 'Telefone', value: 'telefone' },
  { label: 'CNPJ', value: 'cnpj' },
  { label: 'Aleatória', value: 'aleatoria' },
] as const;

const PAYMENT_METHODS: { label: string; value: PaymentMethod; icon: string }[] = [
  { label: 'PIX', value: 'pix', icon: 'flash-outline' },
  { label: 'Crédito', value: 'credito', icon: 'card' },
  { label: 'Débito', value: 'debito', icon: 'card-outline' },
  { label: 'Boleto', value: 'boleto', icon: 'barcode-outline' },
  { label: 'Dinheiro', value: 'dinheiro', icon: 'cash-outline' },
  { label: 'Outro', value: 'outro', icon: 'ellipsis-horizontal' },
];

export function StepModal({ visible, onClose, planId, stepToEdit }: StepModalProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme];
  const { profile, addStep, updateStep } = useFinanceStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [totalAmountStr, setTotalAmountStr] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState<'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria'>('cpf');
  const [bankAccountId, setBankAccountId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('split');
  const [singleDueDate, setSingleDueDate] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceInterval, setRecurrenceInterval] = useState<RecurrenceType>('monthly');
  const [deadlineStr, setDeadlineStr] = useState('');
  const [customSplits, setCustomSplits] = useState<IncomeDate[]>([]);

  useEffect(() => {
    if (stepToEdit) {
      setTitle(stepToEdit.title);
      setDescription(stepToEdit.description);
      setTotalAmountStr(String(stepToEdit.totalAmount));
      setRecipientName(stepToEdit.recipientName);
      setPixKey(stepToEdit.pixKey);
      setPixKeyType(stepToEdit.pixKeyType);
      setBankAccountId(stepToEdit.bankAccountId || (profile.banks[0]?.id || ''));
      setPaymentMethod(stepToEdit.paymentMethod || 'pix');
      setPaymentMode(stepToEdit.paymentMode || 'split');
      setSingleDueDate(stepToEdit.singleDueDate || formatDateISO(new Date()));
      setIsRecurring(stepToEdit.isRecurring);
      setRecurrenceInterval(stepToEdit.recurrenceInterval || 'monthly');
      setDeadlineStr(stepToEdit.deadlineDate);
      setCustomSplits(stepToEdit.customSplit?.length ? stepToEdit.customSplit : profile.incomeDates);
    } else {
      const defaultDate = new Date();
      defaultDate.setMonth(defaultDate.getMonth() + 2);

      setTitle('');
      setDescription('');
      setTotalAmountStr('');
      setRecipientName('');
      setPixKey('');
      setPixKeyType('cpf');
      setBankAccountId(profile.banks[0]?.id || '');
      setPaymentMethod('pix');
      setPaymentMode('split');
      setSingleDueDate(formatDateISO(new Date()));
      setIsRecurring(false);
      setRecurrenceInterval('monthly');
      setDeadlineStr(formatDateISO(defaultDate));
      setCustomSplits(profile.incomeDates.length > 0 ? profile.incomeDates : [{ day: 15, percentage: 100 }]);
    }
  }, [stepToEdit, visible, profile.banks, profile.incomeDates]);

  const parsedTotal = parseFloat(totalAmountStr.replace(',', '.')) || 0;

  const previewInstallments = parsedTotal > 0
    ? generateSplitInstallments({
        stepId: 'preview_step',
        totalAmount: parsedTotal,
        paymentMode,
        singleDueDate,
        deadlineDate: deadlineStr,
        incomeDates: customSplits,
      })
    : [];

  const handleUpdateSplitPercent = (index: number, percentVal: number) => {
    const updated = [...customSplits];
    updated[index] = { ...updated[index], percentage: percentVal };
    setCustomSplits(updated);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Campo Obrigatório', 'Informe o título da etapa.');
      return;
    }
    if (parsedTotal <= 0) {
      Alert.alert('Valor Inválido', 'Informe um valor total maior que zero.');
      return;
    }

    if (paymentMode === 'split') {
      const totalSplitPercent = customSplits.reduce((acc, c) => acc + c.percentage, 0);
      if (totalSplitPercent !== 100) {
        Alert.alert(
          'Divisão de Split',
          `A soma das porcentagens do split deve ser 100% (atualmente está em ${totalSplitPercent}%).`
        );
        return;
      }
    }

    const payload: Partial<Step> = {
      title: title.trim(),
      description: description.trim(),
      totalAmount: parsedTotal,
      recipientName: recipientName.trim(),
      pixKey: pixKey.trim(),
      pixKeyType,
      bankAccountId,
      paymentMethod,
      paymentMode,
      singleDueDate,
      isRecurring,
      recurrenceInterval: isRecurring ? recurrenceInterval : 'none',
      deadlineDate: deadlineStr,
      customSplit: customSplits,
    };

    if (stepToEdit) {
      await updateStep(planId, stepToEdit.id, payload);
    } else {
      await addStep(planId, payload as any);
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
                {stepToEdit ? 'Editar Etapa / Meta' : 'Nova Etapa / Meta'}
              </Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Planejamento e divisão de pagamentos
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {/* Título e Descrição */}
            <Text style={[styles.label, { color: theme.text }]}>Título da Etapa *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
              placeholder="Ex: Compra de Material, Mão de Obra"
              placeholderTextColor={theme.textSecondary}
              value={title}
              onChangeText={setTitle}
            />

            <Text style={[styles.label, { color: theme.text }]}>Descrição</Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border },
              ]}
              placeholder="Notas ou referências adicionais..."
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={2}
              value={description}
              onChangeText={setDescription}
            />

            {/* Valor Total */}
            <Text style={[styles.label, { color: theme.text }]}>Valor Total (R$) *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
              placeholder="0.00"
              placeholderTextColor={theme.textSecondary}
              keyboardType="decimal-pad"
              value={totalAmountStr}
              onChangeText={setTotalAmountStr}
            />

            {/* Conta Bancária Pagadora */}
            {profile.banks.length > 0 && (
              <>
                <Text style={[styles.label, { color: theme.text }]}>Pagar com qual Conta / Banco?</Text>
                <View style={styles.chipsRow}>
                  {profile.banks.map((b) => {
                    const isSelected = bankAccountId === b.id;
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
                        onPress={() => setBankAccountId(b.id)}
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

            {/* Como será pago: À Vista vs Split */}
            <Text style={[styles.label, { color: theme.text }]}>Como será pago?</Text>
            <View style={styles.typeSelectorRow}>
              <TouchableOpacity
                style={[
                  styles.typeSelectorBtn,
                  {
                    backgroundColor: paymentMode === 'single' ? Colors.primary : theme.inputBg,
                    borderColor: paymentMode === 'single' ? Colors.primary : theme.border,
                  },
                ]}
                onPress={() => setPaymentMode('single')}
              >
                <Ionicons
                  name="cash-outline"
                  size={16}
                  color={paymentMode === 'single' ? '#FFF' : theme.text}
                />
                <Text
                  style={[
                    styles.typeSelectorText,
                    { color: paymentMode === 'single' ? '#FFF' : theme.text },
                  ]}
                >
                  À Vista / Único
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeSelectorBtn,
                  {
                    backgroundColor: paymentMode === 'split' ? Colors.primary : theme.inputBg,
                    borderColor: paymentMode === 'split' ? Colors.primary : theme.border,
                  },
                ]}
                onPress={() => setPaymentMode('split')}
              >
                <Ionicons
                  name="cut-outline"
                  size={16}
                  color={paymentMode === 'split' ? '#FFF' : theme.text}
                />
                <Text
                  style={[
                    styles.typeSelectorText,
                    { color: paymentMode === 'split' ? '#FFF' : theme.text },
                  ]}
                >
                  Dividido / Split
                </Text>
              </TouchableOpacity>
            </View>

            {/* Datas */}
            {paymentMode === 'single' ? (
              <View>
                <Text style={[styles.label, { color: theme.text }]}>Data de Vencimento</Text>
                <DatePickerButton
                  value={singleDueDate}
                  onChange={setSingleDueDate}
                />
              </View>
            ) : (
              <View>
                <Text style={[styles.label, { color: theme.text }]}>Data Limite Final</Text>
                <DatePickerButton
                  value={deadlineStr}
                  onChange={setDeadlineStr}
                />

                {/* Porcentagens customizáveis de split */}
                <Text style={[styles.label, { color: theme.text, marginTop: 12 }]}>
                  Configurar Porcentagem (%) por Data de Recebimento
                </Text>
                {customSplits.map((item, idx) => (
                  <View key={idx} style={[styles.splitConfigRow, { borderColor: theme.border }]}>
                    <Text style={[styles.splitConfigLabel, { color: theme.text }]}>
                      Recebimento dia {item.day}:
                    </Text>
                    <TextInput
                      style={[styles.splitConfigInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                      keyboardType="number-pad"
                      maxLength={3}
                      value={String(item.percentage)}
                      onChangeText={(v) => handleUpdateSplitPercent(idx, parseInt(v) || 0)}
                    />
                    <Text style={{ color: theme.textSecondary }}>%</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Favorecido e PIX */}
            <Text style={[styles.label, { color: theme.text }]}>Favorecido (Nome de quem vai receber)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
              placeholder="Ex: Carlos Mecânico"
              placeholderTextColor={theme.textSecondary}
              value={recipientName}
              onChangeText={setRecipientName}
            />

            <Text style={[styles.label, { color: theme.text }]}>Tipo de Chave PIX</Text>
            <View style={styles.chipsRow}>
              {PIX_TYPES.map((pt) => {
                const isSelected = pixKeyType === pt.value;
                return (
                  <TouchableOpacity
                    key={pt.value}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isSelected ? Colors.primary : theme.inputBg,
                        borderColor: isSelected ? Colors.primary : theme.border,
                      },
                    ]}
                    onPress={() => setPixKeyType(pt.value)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: isSelected ? '#FFF' : theme.text, fontWeight: isSelected ? '700' : '500' },
                      ]}
                    >
                      {pt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.label, { color: theme.text }]}>Chave PIX</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
              placeholder="Digite a chave PIX"
              placeholderTextColor={theme.textSecondary}
              value={pixKey}
              onChangeText={setPixKey}
            />

            {/* Recorrência */}
            <View style={[styles.switchRow, { borderColor: theme.border }]}>
              <View>
                <Text style={[styles.switchTitle, { color: theme.text }]}>Pagamento Recorrente?</Text>
                <Text style={[styles.switchSubtitle, { color: theme.textSecondary }]}>
                  Se for despesa contínua mensal
                </Text>
              </View>
              <Switch
                value={isRecurring}
                onValueChange={setIsRecurring}
                trackColor={{ false: theme.border, true: Colors.primary }}
              />
            </View>

            {/* Split Projeção */}
            {previewInstallments.length > 0 && (
              <View style={[styles.previewSection, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                <Text style={[styles.previewTitle, { color: theme.text }]}>
                  Parcelas Calculadas ({previewInstallments.length}):
                </Text>
                {previewInstallments.map((inst, idx) => (
                  <View key={idx} style={styles.previewRow}>
                    <Text style={[styles.previewDate, { color: theme.text }]}>
                      {formatDateBR(inst.dueDate)} (dia {inst.incomeDay})
                    </Text>
                    <Text style={[styles.previewAmount, { color: Colors.primary }]}>
                      {formatCurrencyBRL(inst.amount)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Botão Salvar */}
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
              <Text style={styles.saveBtnText}>
                {stepToEdit ? 'Salvar Etapa' : 'Adicionar Etapa'}
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
  textArea: {
    height: 56,
    paddingTop: 8,
    textAlignVertical: 'top',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6,
  },
  typeSelectorBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  typeSelectorText: {
    fontSize: 12,
    fontWeight: '700',
  },
  splitConfigRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 10,
    padding: 8,
    marginBottom: 6,
  },
  splitConfigLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  splitConfigInput: {
    width: 60,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginVertical: 12,
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  switchSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  previewSection: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginTop: 12,
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  previewDate: {
    fontSize: 12,
  },
  previewAmount: {
    fontSize: 13,
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    height: 50,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
