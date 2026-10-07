import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, View, Text, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function ModalScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.iconCircle, { backgroundColor: '#10B98120' }]}>
          <Ionicons name="shield-checkmark" size={40} color={Colors.primary} />
        </View>

        <Text style={[styles.title, { color: theme.text }]}>Finnan Mobile</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Planejamento Financeiro com Split e Etapas
        </Text>

        <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Privacidade Total & Local-First</Text>
          <Text style={[styles.cardText, { color: theme.textSecondary }]}>
            • Todos os seus dados financeiros ficam armazenados estritamente na memória protegida do seu dispositivo.
          </Text>
          <Text style={[styles.cardText, { color: theme.textSecondary }]}>
            • Acesso protegido por PIN de 8 dígitos criptografado e biometria do hardware.
          </Text>
          <Text style={[styles.cardText, { color: theme.textSecondary }]}>
            • Cálculos matemáticos determinísticos de parcelamento e split por ciclos de recebimento sem intervenção de servidores externos.
          </Text>
          <Text style={[styles.cardText, { color: theme.textSecondary }]}>
            • Notificações e lembretes locais agendados internamente no aparelho.
          </Text>
        </View>

        <Text style={[styles.footerText, { color: theme.textSecondary }]}>
          Versão 1.0.0 • Feito para você planejar suas metas com tranquilidade.
        </Text>
      </ScrollView>

      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    alignItems: 'center',
    paddingTop: 40,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
    marginBottom: 24,
  },
  card: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  cardText: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 10,
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
  },
});
