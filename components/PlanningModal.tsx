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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Planning, PaymentMethod, PaymentMode, IncomeDate } from '@/types/finance';
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

interface PlanningModalProps {
  visible: boolean;
  onClose: () => void;
  planningToEdit?: Planning | null;
  defaultCategory?: string;
  defaultColor?: string;
}

const CATEGORIES = [
  { label: 'Contas Fixas', icon: 'home-outline' },
  { label: 'Metas e Sonhos', icon: 'trophy-outline' },
  { label: 'Dívidas', icon: 'warning-outline' },
  { label: 'Lazer e Viagens', icon: 'airplane-outline' },
  { label: 'Educação', icon: 'book-outline' },
  { label: 'Outros', icon: 'grid-outline' },
];

const COLOR_OPTIONS = [
  '#10B981', // Verde Finnan
  '#3B82F6', // Azul
  '#8B5CF6', // Roxo
  '#EC4899', // Rosa
  '#F59E0B', // Âmbar
  '#06B6D4', // Ciano
  '#64748B', // Grafite
];

const PAYMENT_METHODS: { label: string; value: PaymentMethod; icon: string }[] = [
  { label: 'PIX', value: 'pix', icon: 'flash-outline' },
  { label: 'Crédito', value: 'credito', icon: 'card' },
  { label: 'Débito', value: 'debito', icon: 'card-outline' },
  { label: 'Boleto', value: 'boleto', icon: 'barcode-outline' },
  { label: 'Dinheiro', value: 'dinheiro', icon: 'cash-outline' },
  { label: 'Outro', value: 'outro', icon: 'ellipsis-horizontal' },
];

export function PlanningModal({
  visible,
  onClose,
  planningToEdit,
  defaultCategory,
  defaultColor,
}: PlanningModalProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme];
  const { profile, addPlanning, updatePlanning } = useFinanceStore();

  const [planningType, setPlanningType] = useState<'direct' | 'container'>('direct');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(defaultCategory || CATEGORIES[0].label);
  const [selectedColor, setSelectedColor] = useState(defaultColor || COLOR_OPTIONS[0]);

  // Campos específicos de Despesa Direta
  const [totalAmountStr, setTotalAmountStr] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState<'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria'>('cpf');
  const [bankAccountId, setBankAccountId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(defaultCategory === 'Dívidas' ? 'boleto' : 'pix');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('split');
  const [singleDueDate, setSingleDueDate] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [customSplits, setCustomSplits] = useState<IncomeDate[]>([]);

  useEffect(() => {
    if (planningToEdit) {
      setPlanningType(planningToEdit.type || (planningToEdit.steps?.length ? 'container' : 'direct'));
      setTitle(planningToEdit.title);
      setDescription(planningToEdit.description);
      setCategory(planningToEdit.category);
      setSelectedColor(planningToEdit.color || COLOR_OPTIONS[0]);

      setTotalAmountStr(planningToEdit.totalAmount ? String(planningToEdit.totalAmount) : '');
      setRecipientName(planningToEdit.recipientName || '');
      setPixKey(planningToEdit.pixKey || '');
      setPixKeyType(planningToEdit.pixKeyType || 'cpf');
      setBankAccountId(planningToEdit.bankAccountId || (profile.banks[0]?.id || ''));
      setPaymentMethod(planningToEdit.paymentMethod || 'pix');
      setPaymentMode(planningToEdit.paymentMode || 'split');
      setSingleDueDate(planningToEdit.singleDueDate || formatDateISO(new Date()));
      setDeadlineDate(planningToEdit.deadlineDate || '');
      setCustomSplits(planningToEdit.customSplit?.length ? planningToEdit.customSplit : profile.incomeDates);
    } else {
      const defaultFutureDate = new Date();
      defaultFutureDate.setMonth(defaultFutureDate.getMonth() + 2);

      const initCat = defaultCategory || CATEGORIES[0].label;
      const initColor = defaultColor || (initCat === 'Dívidas' ? '#EF4444' : COLOR_OPTIONS[0]);

      setPlanningType('direct'); // Padrão simples: direto!
      setTitle('');
      setDescription('');
      setCategory(initCat);
      setSelectedColor(initColor);

      setTotalAmountStr('');
      setRecipientName('');
      setPixKey('');
      setPixKeyType('cpf');
      setBankAccountId(profile.banks[0]?.id || '');
      setPaymentMethod(initCat === 'Dívidas' ? 'boleto' : 'pix');
      setPaymentMode('split');
      setSingleDueDate(formatDateISO(new Date()));
      setDeadlineDate(formatDateISO(defaultFutureDate));
      setCustomSplits(profile.incomeDates.length > 0 ? profile.incomeDates : [{ day: 15, percentage: 100 }]);
    }
  }, [planningToEdit, visible, profile.banks, profile.incomeDates, defaultCategory, defaultColor]);

  const parsedTotal = parseFloat(totalAmountStr.replace(',', '.')) || 0;

  // Pré-visualização determinística de parcelas no modo direto
  const previewInstallments = planningType === 'direct' && parsedTotal > 0
    ? generateSplitInstallments({
        stepId: 'preview_plan',
        totalAmount: parsedTotal,
        paymentMode,
        singleDueDate,
        deadlineDate,
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
      Alert.alert('Campo Obrigatório', 'Informe o título do planejamento.');
      return;
    }

    if (planningType === 'direct') {
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
    }

    const payload: Partial<Planning> = {
      title: title.trim(),
      description: description.trim(),
      category,
      color: selectedColor,
      type: planningType,
    };

    if (planningType === 'direct') {
      payload.totalAmount = parsedTotal;
      payload.recipientName = recipientName.trim();
      payload.pixKey = pixKey.trim();
      payload.pixKeyType = pixKeyType;
      payload.bankAccountId = bankAccountId;
      payload.paymentMethod = paymentMethod;
      payload.paymentMode = paymentMode;
      payload.singleDueDate = singleDueDate;
      payload.deadlineDate = deadlineDate;
      payload.customSplit = customSplits;
    }

    if (planningToEdit) {
      await updatePlanning(planningToEdit.id, payload);
    } else {
      await addPlanning(payload as any);
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
                {planningToEdit ? 'Editar Planejamento' : 'Novo Planejamento'}
              </Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Configure valores, forma de pagamento, split e contas
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {/* Escolha do Modelo: Direto vs Contêiner com Etapas */}
            {!planningToEdit && (
              <View style={styles.typeSelectorRow}>
                <TouchableOpacity
                  style={[
                    styles.typeSelectorBtn,
                    {
                      backgroundColor: planningType === 'direct' ? Colors.primary : theme.inputBg,
                      borderColor: planningType === 'direct' ? Colors.primary : theme.border,
                    },
                  ]}
                  onPress={() => setPlanningType('direct')}
                >
                  <Ionicons
                    name="flash-outline"
                    size={16}
                    color={planningType === 'direct' ? '#FFF' : theme.text}
                  />
                  <Text
                    style={[
                      styles.typeSelectorText,
                      { color: planningType === 'direct' ? '#FFF' : theme.text },
                    ]}
                  >
                    Despesa Direta (Sem etapas)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typeSelectorBtn,
                    {
                      backgroundColor: planningType === 'container' ? Colors.primary : theme.inputBg,
                      borderColor: planningType === 'container' ? Colors.primary : theme.border,
                    },
                  ]}
                  onPress={() => setPlanningType('container')}
                >
                  <Ionicons
                    name="layers-outline"
                    size={16}
                    color={planningType === 'container' ? '#FFF' : theme.text}
                  />
                  <Text
                    style={[
                      styles.typeSelectorText,
                      { color: planningType === 'container' ? '#FFF' : theme.text },
                    ]}
                  >
                    Com Etapas
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Título e Descrição */}
            <Text style={[styles.label, { color: theme.text }]}>Título do Planejamento *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
              placeholder="Ex: Aluguel, Reforma da Casa, IPTU"
              placeholderTextColor={theme.textSecondary}
              value={title}
              onChangeText={setTitle}
            />

            <Text style={[styles.label, { color: theme.text }]}>Descrição (Opcional)</Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border },
              ]}
              placeholder="Anotações e detalhes adicionais..."
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={2}
              value={description}
              onChangeText={setDescription}
            />

            {/* Categoria */}
            <Text style={[styles.label, { color: theme.text }]}>Categoria</Text>
            <View style={styles.chipsRow}>
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.label;
                return (
                  <TouchableOpacity
                    key={cat.label}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isSelected ? Colors.primary : theme.inputBg,
                        borderColor: isSelected ? Colors.primary : theme.border,
                      },
                    ]}
                    onPress={() => setCategory(cat.label)}
                  >
                    <Ionicons
                      name={cat.icon as any}
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
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* SEÇÃO ESPECÍFICA PARA MODELO DIRETO (SEM ETAPAS) */}
            {planningType === 'direct' && (
              <>
                <View style={[styles.divider, { backgroundColor: theme.border }]} />

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

                {/* Conta / Banco Pagador */}
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

                {/* Datas de Pagamento */}
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
                      value={deadlineDate}
                      onChange={setDeadlineDate}
                    />

                    {/* Configuração de % do Split */}
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
                <Text style={[styles.label, { color: theme.text }]}>Favorecido (Quem recebe)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                  placeholder="Ex: João da Silva / Imobiliária"
                  placeholderTextColor={theme.textSecondary}
                  value={recipientName}
                  onChangeText={setRecipientName}
                />

                <Text style={[styles.label, { color: theme.text }]}>Chave PIX (Opcional)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                  placeholder="Chave PIX para pagamento rápido"
                  placeholderTextColor={theme.textSecondary}
                  value={pixKey}
                  onChangeText={setPixKey}
                />

                {/* Pré-visualização determinística das parcelas */}
                {previewInstallments.length > 0 && (
                  <View style={[styles.previewSection, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                    <Text style={[styles.previewTitle, { color: theme.text }]}>
                      Projeção Calculada ({previewInstallments.length} parcela{previewInstallments.length > 1 ? 's' : ''}):
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
              </>
            )}

            {/* Cor de Identificação */}
            <Text style={[styles.label, { color: theme.text, marginTop: 14 }]}>Cor de Destaque</Text>
            <View style={styles.colorsRow}>
              {COLOR_OPTIONS.map((c) => {
                const isSelected = selectedColor === c;
                return (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.colorCircle,
                      { backgroundColor: c },
                      isSelected && styles.selectedColorCircle,
                    ]}
                    onPress={() => setSelectedColor(c)}
                  >
                    {isSelected && <Ionicons name="checkmark" size={18} color="#FFF" />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Botão Salvar */}
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
              <Text style={styles.saveBtnText}>
                {planningToEdit ? 'Salvar Alterações' : 'Criar Planejamento'}
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
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
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
    height: 60,
    paddingTop: 10,
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
  divider: {
    height: 0.5,
    marginVertical: 12,
  },
  splitConfigRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
  },
  splitConfigLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  splitConfigInput: {
    width: 60,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
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
  colorsRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 4,
  },
  colorCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedColorCircle: {
    borderWidth: 3,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
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
    fontSize: 15,
    fontWeight: '600',
  },
});
