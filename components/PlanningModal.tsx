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
import { Planning } from '@/types/finance';
import { useFinanceStore } from '@/stores/financeStore';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

interface PlanningModalProps {
  visible: boolean;
  onClose: () => void;
  planningToEdit?: Planning | null;
}

const CATEGORIES = [
  { label: 'Custos Fixos', icon: 'home-outline' },
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

export function PlanningModal({ visible, onClose, planningToEdit }: PlanningModalProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme];
  const { addPlanning, updatePlanning } = useFinanceStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0].label);
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);

  useEffect(() => {
    if (planningToEdit) {
      setTitle(planningToEdit.title);
      setDescription(planningToEdit.description);
      setCategory(planningToEdit.category);
      setSelectedColor(planningToEdit.color || COLOR_OPTIONS[0]);
    } else {
      setTitle('');
      setDescription('');
      setCategory(CATEGORIES[0].label);
      setSelectedColor(COLOR_OPTIONS[0]);
    }
  }, [planningToEdit, visible]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Campo Obrigatório', 'Informe o título do planejamento.');
      return;
    }

    if (planningToEdit) {
      await updatePlanning(planningToEdit.id, {
        title: title.trim(),
        description: description.trim(),
        category,
        color: selectedColor,
      });
    } else {
      await addPlanning({
        title: title.trim(),
        description: description.trim(),
        category,
        color: selectedColor,
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
                {planningToEdit ? 'Editar Planejamento' : 'Novo Planejamento'}
              </Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Crie um contêiner para agrupar despesas e etapas
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {/* Título */}
            <Text style={[styles.label, { color: theme.text }]}>Título do Planejamento *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
              placeholder="Ex: Reforma da Casa, Viagem de Férias"
              placeholderTextColor={theme.textSecondary}
              value={title}
              onChangeText={setTitle}
            />

            {/* Descrição */}
            <Text style={[styles.label, { color: theme.text }]}>Descrição (Opcional)</Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border },
              ]}
              placeholder="Detalhes ou observações deste plano..."
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={3}
              value={description}
              onChangeText={setDescription}
            />

            {/* Categoria */}
            <Text style={[styles.label, { color: theme.text }]}>Categoria</Text>
            <View style={styles.categoriesWrap}>
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.label;
                return (
                  <TouchableOpacity
                    key={cat.label}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: isSelected ? Colors.primary : theme.inputBg,
                        borderColor: isSelected ? Colors.primary : theme.border,
                      },
                    ]}
                    onPress={() => setCategory(cat.label)}
                  >
                    <Ionicons
                      name={cat.icon as any}
                      size={15}
                      color={isSelected ? '#FFF' : theme.textSecondary}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.categoryText,
                        { color: isSelected ? '#FFF' : theme.text, fontWeight: isSelected ? '700' : '500' },
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Cor de Identificação */}
            <Text style={[styles.label, { color: theme.text }]}>Cor de Destaque</Text>
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
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 36,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
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
    paddingBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  textArea: {
    height: 80,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  categoriesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 13,
  },
  colorsRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 4,
  },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
