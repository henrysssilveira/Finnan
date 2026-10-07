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
import { Step, RecurrenceType } from '@/types/finance';
import { useFinanceStore } from '@/stores/financeStore';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import {
  generateSplitInstallments,
  formatCurrencyBRL,
  formatDateBR,
  formatDateISO,
} from '@/services/splitCalculator';

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
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceInterval, setRecurrenceInterval] = useState<RecurrenceType>('monthly');

  // Data Limite
  const [deadlineStr, setDeadlineStr] = useState(''); // YYYY-MM-DD

  useEffect(() => {
    if (stepToEdit) {
      setTitle(stepToEdit.title);
      setDescription(stepToEdit.description);
      setTotalAmountStr(String(stepToEdit.totalAmount));
      setRecipientName(stepToEdit.recipientName);
      setPixKey(stepToEdit.pixKey);
      setPixKeyType(stepToEdit.pixKeyType);
      setIsRecurring(stepToEdit.isRecurring);
      setRecurrenceInterval(stepToEdit.recurrenceInterval || 'monthly');
      setDeadlineStr(stepToEdit.deadlineDate);
    } else {
      // Padrão: 2 meses à frente
      const defaultDate = new Date();
      defaultDate.setMonth(defaultDate.getMonth() + 2);
      setTitle('');
      setDescription('');
      setTotalAmountStr('');
      setRecipientName('');
      setPixKey('');
      setPixKeyType('cpf');
      setIsRecurring(false);
      setRecurrenceInterval('monthly');
      setDeadlineStr(formatDateISO(defaultDate));
    }
  }, [stepToEdit, visible]);

  const parsedTotal = parseFloat(totalAmountStr.replace(',', '.')) || 0;

  // Pré-visualização determinística das parcelas geradas
  const previewInstallments = parsedTotal > 0 && deadlineStr
    ? generateSplitInstallments({
        stepId: 'preview',
        totalAmount: parsedTotal,
        deadlineDate: deadlineStr,
        incomeDates: profile.incomeDates,
      })
    : [];

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Campo Obrigatório', 'Informe o título da etapa.');
      return;
    }
    if (parsedTotal <= 0) {
      Alert.alert('Valor Inválido', 'Informe um valor total maior que zero.');
      return;
    }
    if (!deadlineStr || !deadlineStr.includes('-')) {
      Alert.alert('Data Inválida', 'Informe uma data limite válida (formato YYYY-MM-DD).');
      return;
    }

    if (stepToEdit) {
      await updateStep(planId, stepToEdit.id, {
        title: title.trim(),
        description: description.trim(),
        totalAmount: parsedTotal,
        recipientName: recipientName.trim(),
        pixKey: pixKey.trim(),
        pixKeyType,
        isRecurring,
        recurrenceInterval: isRecurring ? recurrenceInterval : 'none',
        deadlineDate: deadlineStr,
      });
    } else {
      await addStep(planId, {
        title: title.trim(),
        description: description.trim(),
        totalAmount: parsedTotal,
        recipientName: recipientName.trim(),
        pixKey: pixKey.trim(),
        pixKeyType,
        isRecurring,
        recurrenceInterval: isRecurring ? recurrenceInterval : 'none',
        deadlineDate: deadlineStr,
        customSplit: profile.incomeDates,
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
                {stepToEdit ? 'Editar Etapa / Meta' : 'Nova Etapa / Meta'}
              </Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Planejamento e divisão determinística de pagamentos
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
              placeholder="Ex: Pagamento Pedreiro, Compra de Materiais"
              placeholderTextColor={theme.textSecondary}
              value={title}
              onChangeText={setTitle}
            />

            <Text style={[styles.label, { color: theme.text }]}>Descrição Detalhada</Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border },
              ]}
              placeholder="Descreva itens, notas ou referências..."
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={2}
              value={description}
              onChangeText={setDescription}
            />

            {/* Valor Total e Data Limite */}
            <View style={styles.twoCols}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: theme.text }]}>Valor Total (R$) *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                  placeholder="0.00"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="decimal-pad"
                  value={totalAmountStr}
                  onChangeText={setTotalAmountStr}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: theme.text }]}>Data Limite *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                  placeholder="AAAA-MM-DD"
                  placeholderTextColor={theme.textSecondary}
                  value={deadlineStr}
                  onChangeText={setDeadlineStr}
                />
              </View>
            </View>

            {/* Favorecido e Chave PIX */}
            <Text style={[styles.label, { color: theme.text }]}>Favorecido (Nome de quem vai receber)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
              placeholder="Ex: João da Silva / Loja de Tintas"
              placeholderTextColor={theme.textSecondary}
              value={recipientName}
              onChangeText={setRecipientName}
            />

            <Text style={[styles.label, { color: theme.text }]}>Tipo de Chave PIX</Text>
            <View style={styles.pixTypeRow}>
              {PIX_TYPES.map((pt) => {
                const isSelected = pixKeyType === pt.value;
                return (
                  <TouchableOpacity
                    key={pt.value}
                    style={[
                      styles.pixTypeChip,
                      {
                        backgroundColor: isSelected ? Colors.primary : theme.inputBg,
                        borderColor: isSelected ? Colors.primary : theme.border,
                      },
                    ]}
                    onPress={() => setPixKeyType(pt.value)}
                  >
                    <Text
                      style={[
                        styles.pixTypeText,
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
                  Se for uma despesa contínua (ex: mensalidade)
                </Text>
              </View>
              <Switch
                value={isRecurring}
                onValueChange={setIsRecurring}
                trackColor={{ false: theme.border, true: Colors.primary }}
              />
            </View>

            {/* Split e Projeção Determinística de Parcelas */}
            {previewInstallments.length > 0 && (
              <View style={[styles.previewSection, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                <View style={styles.previewHeader}>
                  <Ionicons name="calculator-outline" size={18} color={Colors.primary} />
                  <Text style={[styles.previewTitle, { color: theme.text }]}>
                    Split Sequencial Calculado ({previewInstallments.length} parcelas)
                  </Text>
                </View>
                <Text style={[styles.previewDesc, { color: theme.textSecondary }]}>
                  Distribuído automaticamente conforme os dias de recebimento do seu perfil:
                </Text>

                {previewInstallments.map((inst, idx) => (
                  <View key={idx} style={[styles.installmentRow, { borderColor: theme.border }]}>
                    <View style={styles.installmentLeft}>
                      <View style={[styles.badgeNumber, { backgroundColor: '#10B98125' }]}>
                        <Text style={styles.badgeNumberText}>#{idx + 1}</Text>
                      </View>
                      <View style={{ marginLeft: 8 }}>
                        <Text style={[styles.instDate, { color: theme.text }]}>
                          Vence: {formatDateBR(inst.dueDate)}
                        </Text>
                        <Text style={[styles.instSub, { color: theme.textSecondary }]}>
                          Recebimento dia {inst.incomeDay}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.instAmount, { color: Colors.primary }]}>
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
    fontSize: 20,
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
    height: 64,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  twoCols: {
    flexDirection: 'row',
    gap: 12,
  },
  pixTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pixTypeChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  pixTypeText: {
    fontSize: 12,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginVertical: 14,
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
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginTop: 12,
    marginBottom: 8,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  previewDesc: {
    fontSize: 12,
    marginTop: 4,
    marginBottom: 10,
  },
  installmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
  },
  installmentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeNumberText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  instDate: {
    fontSize: 13,
    fontWeight: '600',
  },
  instSub: {
    fontSize: 11,
  },
  instAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    height: 50,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
