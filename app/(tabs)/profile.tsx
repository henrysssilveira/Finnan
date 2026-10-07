import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFinanceStore } from '@/stores/financeStore';
import { useAuthStore } from '@/stores/authStore';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { IncomeDate, BankAccount, Debt } from '@/types/finance';

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme];

  const { profile, updateProfile, addBank, removeBank, addDebt, removeDebt, setIncomeDates, resetAll } =
    useFinanceStore();
  const {
    lock,
    biometricsEnabled,
    isBiometricsAvailable,
    toggleBiometrics,
    setNewPin,
    resetSecurity,
  } = useAuthStore();

  // Estados de edição de Renda
  const [isEditingIncome, setIsEditingIncome] = useState(false);
  const [tempIncomeStr, setTempIncomeStr] = useState(String(profile.monthlyIncome || ''));

  // Estados para datas de recebimento
  const [tempIncomeDates, setTempIncomeDates] = useState<IncomeDate[]>(profile.incomeDates);
  const [isEditingDates, setIsEditingDates] = useState(false);

  // Estados de novos bancos e dívidas
  const [newBankName, setNewBankName] = useState('');
  const [newDebtTitle, setNewDebtTitle] = useState('');
  const [newDebtAmountStr, setNewDebtAmountStr] = useState('');

  // Estados de PIN
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [newPinStr, setNewPinStr] = useState('');
  const [confirmPinStr, setConfirmPinStr] = useState('');

  // Salvar Renda
  const handleSaveIncome = async () => {
    const val = parseFloat(tempIncomeStr.replace(',', '.')) || 0;
    await updateProfile({ monthlyIncome: val });
    setIsEditingIncome(false);
  };

  // Salvar Datas de Recebimento
  const handleSaveDates = async () => {
    const totalPercentage = tempIncomeDates.reduce((acc, curr) => acc + curr.percentage, 0);
    if (totalPercentage !== 100) {
      Alert.alert(
        'Soma das Porcentagens',
        `A soma das porcentagens deve totalizar 100% (atualmente está em ${totalPercentage}%).`
      );
      return;
    }
    await setIncomeDates(tempIncomeDates);
    setIsEditingDates(false);
  };

  const handleAddDateRow = () => {
    if (tempIncomeDates.length >= 4) {
      Alert.alert('Limite', 'Máximo de 4 datas de recebimento.');
      return;
    }
    setTempIncomeDates([...tempIncomeDates, { day: 1, percentage: 0 }]);
  };

  const handleUpdateDateRow = (index: number, field: 'day' | 'percentage', value: number) => {
    const updated = [...tempIncomeDates];
    updated[index] = { ...updated[index], [field]: value };
    setTempIncomeDates(updated);
  };

  const handleRemoveDateRow = (index: number) => {
    if (tempIncomeDates.length <= 1) {
      Alert.alert('Atenção', 'Mantenha ao menos uma data de recebimento.');
      return;
    }
    setTempIncomeDates(tempIncomeDates.filter((_, i) => i !== index));
  };

  // Adicionar Banco
  const handleAddBank = async () => {
    if (!newBankName.trim()) return;
    await addBank({ name: newBankName.trim(), type: 'corrente' });
    setNewBankName('');
  };

  // Adicionar Dívida
  const handleAddDebt = async () => {
    const amount = parseFloat(newDebtAmountStr.replace(',', '.'));
    if (!newDebtTitle.trim() || isNaN(amount) || amount <= 0) {
      Alert.alert('Dados inválidos', 'Informe a descrição e o valor da dívida.');
      return;
    }
    await addDebt({
      title: newDebtTitle.trim(),
      totalAmount: amount,
      remainingAmount: amount,
    });
    setNewDebtTitle('');
    setNewDebtAmountStr('');
  };

  // Salvar Novo PIN de 8 dígitos
  const handleSaveNewPin = async () => {
    if (newPinStr.length !== 8) {
      Alert.alert('Erro', 'O novo PIN deve conter exatamente 8 dígitos.');
      return;
    }
    if (newPinStr !== confirmPinStr) {
      Alert.alert('Erro', 'A confirmação do PIN não confere.');
      return;
    }
    await setNewPin(newPinStr, biometricsEnabled);
    setIsChangingPin(false);
    setNewPinStr('');
    setConfirmPinStr('');
    Alert.alert('Sucesso', 'PIN de 8 dígitos atualizado com sucesso!');
  };

  // Reset de todos os dados locais
  const handleResetData = () => {
    Alert.alert(
      'Reset Completo de Dados',
      'ATENÇÃO: Isso apagará todas as informações locais, planejamentos e configurações de segurança deste aparelho. Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar Tudo',
          style: 'destructive',
          onPress: async () => {
            await resetAll();
            await resetSecurity();
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* SEÇÃO 1: RENDA E DATAS DE RECEBIMENTO */}
      <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <Ionicons name="wallet-outline" size={20} color={Colors.primary} />
          <Text style={[styles.cardTitle, { color: theme.text }]}>Renda & Ciclo Financeiro</Text>
        </View>

        {/* Renda Mensal */}
        <View style={styles.itemRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.itemLabel, { color: theme.textSecondary }]}>Renda Total Mensal</Text>
            {isEditingIncome ? (
              <TextInput
                style={[styles.inputInline, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                keyboardType="decimal-pad"
                value={tempIncomeStr}
                onChangeText={setTempIncomeStr}
                autoFocus
              />
            ) : (
              <Text style={[styles.itemValue, { color: theme.text }]}>
                R$ {profile.monthlyIncome?.toFixed(2) || '0,00'}
              </Text>
            )}
          </View>
          {isEditingIncome ? (
            <TouchableOpacity style={styles.saveSmallBtn} onPress={handleSaveIncome}>
              <Text style={styles.saveSmallBtnText}>Salvar</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setIsEditingIncome(true)} style={styles.editIconBtn}>
              <Ionicons name="pencil-outline" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Datas de Recebimento */}
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <View style={styles.datesHeaderRow}>
          <Text style={[styles.itemLabel, { color: theme.textSecondary }]}>Datas de Recebimento & Proporções</Text>
          {isEditingDates ? (
            <TouchableOpacity onPress={handleSaveDates} style={styles.saveSmallBtn}>
              <Text style={styles.saveSmallBtnText}>Salvar</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => {
                setTempIncomeDates(profile.incomeDates);
                setIsEditingDates(true);
              }}
              style={styles.editIconBtn}
            >
              <Ionicons name="pencil-outline" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {isEditingDates ? (
          <View style={{ marginTop: 8 }}>
            {tempIncomeDates.map((item, idx) => (
              <View key={idx} style={styles.dateEditRow}>
                <TextInput
                  style={[styles.smallNumInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                  placeholder="Dia"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="number-pad"
                  maxLength={2}
                  value={String(item.day)}
                  onChangeText={(val) => handleUpdateDateRow(idx, 'day', parseInt(val) || 1)}
                />
                <Text style={{ color: theme.textSecondary }}>dia /</Text>
                <TextInput
                  style={[styles.smallNumInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                  placeholder="%"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="number-pad"
                  maxLength={3}
                  value={String(item.percentage)}
                  onChangeText={(val) => handleUpdateDateRow(idx, 'percentage', parseInt(val) || 0)}
                />
                <Text style={{ color: theme.textSecondary }}>%</Text>
                <TouchableOpacity onPress={() => handleRemoveDateRow(idx)} style={{ padding: 4 }}>
                  <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.addDateLineBtn} onPress={handleAddDateRow}>
              <Ionicons name="add" size={16} color={Colors.primary} />
              <Text style={styles.addDateLineText}>+ Adicionar data</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.datesDisplayWrap}>
            {profile.incomeDates.map((d, i) => (
              <View
                key={i}
                style={[styles.dateChipView, { backgroundColor: theme.inputBg, borderColor: theme.border }]}
              >
                <Text style={[styles.dateChipText, { color: theme.text }]}>Dia {d.day}</Text>
                <Text style={[styles.dateChipPercent, { color: Colors.primary }]}>{d.percentage}%</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* SEÇÃO 2: BANCOS E CONTAS */}
      <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <Ionicons name="business-outline" size={20} color={Colors.primary} />
          <Text style={[styles.cardTitle, { color: theme.text }]}>Bancos & Contas Utilizadas</Text>
        </View>

        <View style={styles.addInlineRow}>
          <TextInput
            style={[styles.inputInline, { flex: 1, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
            placeholder="Nome da Conta ou Banco"
            placeholderTextColor={theme.textSecondary}
            value={newBankName}
            onChangeText={setNewBankName}
          />
          <TouchableOpacity style={styles.addBtnSmall} onPress={handleAddBank}>
            <Text style={styles.addBtnSmallText}>Adicionar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tagsContainer}>
          {profile.banks.map((bank) => (
            <View key={bank.id} style={[styles.bankTag, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
              <Text style={[styles.bankTagText, { color: theme.text }]}>{bank.name}</Text>
              <TouchableOpacity onPress={() => removeBank(bank.id)} style={{ marginLeft: 6 }}>
                <Ionicons name="close-circle" size={16} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
          ))}
          {profile.banks.length === 0 && (
            <Text style={[styles.emptyHint, { color: theme.textSecondary }]}>Nenhum banco adicionado.</Text>
          )}
        </View>
      </View>

      {/* SEÇÃO 3: DÍVIDAS ATUAIS CONHECIDAS */}
      <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <Ionicons name="alert-circle-outline" size={20} color={Colors.danger} />
          <Text style={[styles.cardTitle, { color: theme.text }]}>Dívidas Atuais Conhecidas</Text>
        </View>

        <View style={{ gap: 8, marginBottom: 12 }}>
          <TextInput
            style={[styles.inputInline, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
            placeholder="Título da dívida (ex: Financiamento)"
            placeholderTextColor={theme.textSecondary}
            value={newDebtTitle}
            onChangeText={setNewDebtTitle}
          />
          <View style={styles.addInlineRow}>
            <TextInput
              style={[styles.inputInline, { flex: 1, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
              placeholder="Valor total (R$)"
              placeholderTextColor={theme.textSecondary}
              keyboardType="decimal-pad"
              value={newDebtAmountStr}
              onChangeText={setNewDebtAmountStr}
            />
            <TouchableOpacity style={styles.addBtnSmall} onPress={handleAddDebt}>
              <Text style={styles.addBtnSmallText}>+ Dívida</Text>
            </TouchableOpacity>
          </View>
        </View>

        {profile.debts.map((d) => (
          <View key={d.id} style={[styles.debtRow, { borderColor: theme.border }]}>
            <View>
              <Text style={[styles.debtTitle, { color: theme.text }]}>{d.title}</Text>
              <Text style={[styles.debtValue, { color: Colors.danger }]}>
                R$ {d.totalAmount.toFixed(2)}
              </Text>
            </View>
            <TouchableOpacity onPress={() => removeDebt(d.id)}>
              <Ionicons name="trash-outline" size={18} color={Colors.danger} />
            </TouchableOpacity>
          </View>
        ))}
        {profile.debts.length === 0 && (
          <Text style={[styles.emptyHint, { color: theme.textSecondary }]}>Nenhuma dívida registrada.</Text>
        )}
      </View>

      {/* SEÇÃO 4: SEGURANÇA E PRIVACIDADE */}
      <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <Ionicons name="shield-checkmark-outline" size={20} color={Colors.primary} />
          <Text style={[styles.cardTitle, { color: theme.text }]}>Segurança & Privacidade</Text>
        </View>

        {/* Biometria */}
        {isBiometricsAvailable && (
          <View style={styles.switchRow}>
            <View>
              <Text style={[styles.switchLabel, { color: theme.text }]}>Desbloqueio por Biometria</Text>
              <Text style={[styles.switchDesc, { color: theme.textSecondary }]}>
                Usar impressão digital ou FaceID
              </Text>
            </View>
            <Switch
              value={biometricsEnabled}
              onValueChange={(val) => {
                toggleBiometrics(val);
              }}
              trackColor={{ false: theme.border, true: Colors.primary }}
            />
          </View>
        )}

        {/* Alterar PIN */}
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        {isChangingPin ? (
          <View style={{ gap: 8, marginTop: 4 }}>
            <Text style={[styles.itemLabel, { color: theme.textSecondary }]}>Novo PIN de 8 dígitos:</Text>
            <TextInput
              style={[styles.inputInline, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
              placeholder="Novo PIN (8 dígitos)"
              placeholderTextColor={theme.textSecondary}
              keyboardType="numeric"
              maxLength={8}
              secureTextEntry
              value={newPinStr}
              onChangeText={setNewPinStr}
            />
            <TextInput
              style={[styles.inputInline, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
              placeholder="Confirmar novo PIN"
              placeholderTextColor={theme.textSecondary}
              keyboardType="numeric"
              maxLength={8}
              secureTextEntry
              value={confirmPinStr}
              onChangeText={setConfirmPinStr}
            />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
              <TouchableOpacity
                style={[styles.secondarySmallBtn, { borderColor: theme.border }]}
                onPress={() => setIsChangingPin(false)}
              >
                <Text style={{ color: theme.text }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addBtnSmall} onPress={handleSaveNewPin}>
                <Text style={styles.addBtnSmallText}>Atualizar PIN</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => setIsChangingPin(true)}
            activeOpacity={0.7}
          >
            <View>
              <Text style={[styles.actionRowTitle, { color: theme.text }]}>Alterar PIN de 8 Dígitos</Text>
              <Text style={[styles.actionRowDesc, { color: theme.textSecondary }]}>
                Redefinir sua senha numérica local
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
          </TouchableOpacity>
        )}

        {/* Bloquear App Agora */}
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <TouchableOpacity style={styles.actionRow} onPress={lock} activeOpacity={0.7}>
          <View>
            <Text style={[styles.actionRowTitle, { color: theme.text }]}>Bloquear Aplicativo Agora</Text>
            <Text style={[styles.actionRowDesc, { color: theme.textSecondary }]}>
              Exige PIN ou biometria para reabrir
            </Text>
          </View>
          <Ionicons name="lock-closed-outline" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* SEÇÃO 5: ZONA DE PERIGO / RESET */}
      <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: '#EF444440' }]}>
        <View style={styles.cardHeader}>
          <Ionicons name="warning-outline" size={20} color={Colors.danger} />
          <Text style={[styles.cardTitle, { color: Colors.danger }]}>Zona de Perigo</Text>
        </View>
        <Text style={[styles.dangerDesc, { color: theme.textSecondary }]}>
          Apaga permanentemente todos os planejamentos, parcelas, contas e chaves de segurança salvas neste aparelho.
        </Text>
        <TouchableOpacity style={styles.resetButton} onPress={handleResetData} activeOpacity={0.8}>
          <Ionicons name="trash" size={18} color="#FFF" style={{ marginRight: 6 }} />
          <Text style={styles.resetButtonText}>Resetar Todos os Dados</Text>
        </TouchableOpacity>
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
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  itemValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  inputInline: {
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  saveSmallBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveSmallBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  secondarySmallBtn: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editIconBtn: {
    padding: 6,
  },
  divider: {
    height: 0.5,
    marginVertical: 14,
  },
  datesHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  datesDisplayWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dateChipView: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  dateChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  dateChipPercent: {
    fontSize: 12,
    fontWeight: '700',
  },
  dateEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  smallNumInput: {
    width: 60,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: 14,
  },
  addDateLineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  addDateLineText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  addInlineRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  addBtnSmall: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnSmallText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bankTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  bankTagText: {
    fontSize: 13,
    fontWeight: '500',
  },
  debtRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
  },
  debtTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  debtValue: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  emptyHint: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  switchDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionRowTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionRowDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  dangerDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  resetButton: {
    backgroundColor: Colors.danger,
    height: 46,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
