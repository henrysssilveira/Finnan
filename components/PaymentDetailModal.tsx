import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { formatCurrencyBRL, formatDateBR } from '@/services/splitCalculator';
import { PaymentMethod } from '@/types/finance';

export interface PaymentItemDetail {
  id: string; // installment id
  planId: string;
  stepId?: string;
  isDirect: boolean;
  planTitle: string;
  stepTitle: string;
  category: string;
  color: string;
  amount: number;
  dueDate: string;
  incomeDay: number;
  recipientName?: string;
  pixKey?: string;
  pixKeyType?: string;
  bankName?: string;
  paymentMethod?: PaymentMethod;
  isPaid: boolean;
  paidAt?: string;
}

interface PaymentDetailModalProps {
  visible: boolean;
  item: PaymentItemDetail | null;
  onClose: () => void;
  onTogglePaid: (item: PaymentItemDetail) => Promise<void>;
}

export function PaymentDetailModal({
  visible,
  item,
  onClose,
  onTogglePaid,
}: PaymentDetailModalProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme];

  const [copied, setCopied] = useState(false);

  if (!item) return null;

  const handleCopyPix = async () => {
    if (!item.pixKey) {
      Alert.alert('Chave PIX', 'Nenhuma chave PIX cadastrada para este item.');
      return;
    }
    await Clipboard.setStringAsync(item.pixKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleToggle = async () => {
    await onTogglePaid(item);
    onClose();
  };

  const paymentMethodLabels: Record<string, string> = {
    pix: 'PIX',
    credito: 'Cartão de Crédito',
    debito: 'Cartão de Débito',
    boleto: 'Boleto Bancário',
    dinheiro: 'Dinheiro',
    transferencia: 'Transferência / TED',
    outro: 'Outro',
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: theme.cardBackground }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <View style={[styles.planBadge, { backgroundColor: item.color || Colors.primary }]}>
                <Text style={styles.planBadgeText}>{item.planTitle}</Text>
              </View>
              <Text style={[styles.title, { color: theme.text }]}>{item.stepTitle}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {/* Destaque do Valor e Status */}
            <View style={[styles.amountBox, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
              <Text style={[styles.amountLabel, { color: theme.textSecondary }]}>Valor da Parcela</Text>
              <Text style={[styles.amountValue, { color: item.isPaid ? Colors.primary : theme.text }]}>
                {formatCurrencyBRL(item.amount)}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: item.isPaid ? '#10B98125' : '#F59E0B25' },
                ]}
              >
                <Ionicons
                  name={item.isPaid ? 'checkmark-circle' : 'time'}
                  size={14}
                  color={item.isPaid ? Colors.primary : Colors.warning}
                />
                <Text
                  style={[
                    styles.statusBadgeText,
                    { color: item.isPaid ? Colors.primary : Colors.warning },
                  ]}
                >
                  {item.isPaid ? 'Pago' : 'Pendente de Pagamento'}
                </Text>
              </View>
            </View>

            {/* Informações Detalhadas */}
            <View style={styles.detailsList}>
              {/* Vencimento e Ciclo */}
              <View style={[styles.detailRow, { borderColor: theme.border }]}>
                <View style={styles.detailIconBox}>
                  <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Vencimento</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>
                    {formatDateBR(item.dueDate)} (Ciclo do dia {item.incomeDay})
                  </Text>
                </View>
              </View>

              {/* Conta Bancária */}
              {item.bankName ? (
                <View style={[styles.detailRow, { borderColor: theme.border }]}>
                  <View style={styles.detailIconBox}>
                    <Ionicons name="business-outline" size={18} color={Colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Conta / Banco Pagador</Text>
                    <Text style={[styles.detailValue, { color: theme.text }]}>{item.bankName}</Text>
                  </View>
                </View>
              ) : null}

              {/* Forma de Pagamento */}
              {item.paymentMethod ? (
                <View style={[styles.detailRow, { borderColor: theme.border }]}>
                  <View style={styles.detailIconBox}>
                    <Ionicons name="card-outline" size={18} color={Colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Forma de Pagamento</Text>
                    <Text style={[styles.detailValue, { color: theme.text }]}>
                      {paymentMethodLabels[item.paymentMethod] || item.paymentMethod}
                    </Text>
                  </View>
                </View>
              ) : null}

              {/* Favorecido */}
              {item.recipientName ? (
                <View style={[styles.detailRow, { borderColor: theme.border }]}>
                  <View style={styles.detailIconBox}>
                    <Ionicons name="person-outline" size={18} color={Colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Favorecido</Text>
                    <Text style={[styles.detailValue, { color: theme.text }]}>{item.recipientName}</Text>
                  </View>
                </View>
              ) : null}

              {/* Chave PIX */}
              {item.pixKey ? (
                <View style={[styles.detailRow, { borderColor: theme.border }]}>
                  <View style={styles.detailIconBox}>
                    <Ionicons name="flash-outline" size={18} color={Colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                      Chave PIX ({item.pixKeyType || 'chave'})
                    </Text>
                    <Text style={[styles.detailValue, { color: theme.text }]} numberOfLines={1}>
                      {item.pixKey}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.copyBtn, copied && styles.copyBtnActive]}
                    onPress={handleCopyPix}
                  >
                    <Ionicons
                      name={copied ? 'checkmark' : 'copy-outline'}
                      size={15}
                      color={copied ? '#10B981' : theme.text}
                    />
                    <Text style={[styles.copyBtnText, { color: copied ? '#10B981' : theme.text }]}>
                      {copied ? 'Copiado!' : 'Copiar'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>

            {/* BOTÃO DE AÇÃO: MARCAR / DESMARCAR COMO PAGO */}
            <TouchableOpacity
              style={[
                styles.actionBtn,
                { backgroundColor: item.isPaid ? theme.inputBg : Colors.primary },
              ]}
              onPress={handleToggle}
              activeOpacity={0.8}
            >
              <Ionicons
                name={item.isPaid ? 'refresh-outline' : 'checkmark-circle-outline'}
                size={20}
                color={item.isPaid ? theme.text : '#FFF'}
                style={{ marginRight: 8 }}
              />
              <Text
                style={[
                  styles.actionBtnText,
                  { color: item.isPaid ? theme.text : '#FFF' },
                ]}
              >
                {item.isPaid ? 'Desmarcar Pagamento (Voltar para Pendente)' : 'Marcar Parcela como Paga'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 34,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  planBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  planBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  scroll: {
    paddingBottom: 16,
  },
  amountBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  amountLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  detailsList: {
    gap: 10,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  detailIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10B98115',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#8882',
  },
  copyBtnActive: {
    backgroundColor: '#10B98120',
  },
  copyBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionBtn: {
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
