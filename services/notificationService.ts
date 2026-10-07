import { Platform } from 'react-native';

let Notifications: any = null;
let isNotificationsAvailable = false;

try {
  // Carrega dinamicamente para evitar crash no Expo Go Android (SDK 53+)
  Notifications = require('expo-notifications');
  if (Notifications && typeof Notifications.setNotificationHandler === 'function') {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    isNotificationsAvailable = true;
  }
} catch {
  // Expo Go Android a partir do SDK 53 não suporta expo-notifications sem dev build
  isNotificationsAvailable = false;
}

/**
 * Solicita permissões de notificação local ao usuário
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web' || !isNotificationsAvailable || !Notifications) {
    return false;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return false;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('finnan_reminders', {
        name: 'Lembretes Financeiros Finnan',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#10B981',
      });
    }

    return true;
  } catch (error) {
    console.warn('Erro ao configurar permissões de notificação:', error);
    return false;
  }
}

export interface ScheduleReminderParams {
  title: string;
  body: string;
  date: Date;
}

/**
 * Agenda uma notificação local para uma data específica
 */
export async function scheduleLocalReminder({
  title,
  body,
  date,
}: ScheduleReminderParams): Promise<string | null> {
  if (Platform.OS === 'web' || !isNotificationsAvailable || !Notifications) {
    return null;
  }

  try {
    const now = new Date();
    if (date.getTime() <= now.getTime()) {
      return null;
    }

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        data: { targetDate: date.toISOString() },
      },
      trigger: {
        date,
        channelId: Platform.OS === 'android' ? 'finnan_reminders' : undefined,
      } as any,
    });

    return id;
  } catch (error) {
    console.warn('Erro ao agendar notificação:', error);
    return null;
  }
}

/**
 * Agenda notificações automáticas para uma etapa/parcela:
 * - 3 dias antes
 * - No dia do vencimento às 09:00
 */
export async function scheduleStepReminders(
  stepTitle: string,
  dueDateStr: string,
  amount: number,
  recipientName: string
): Promise<string[]> {
  const ids: string[] = [];
  if (!isNotificationsAvailable || !Notifications) return ids;

  const [year, month, day] = dueDateStr.split('-').map(Number);
  if (!year || !month || !day) return ids;

  const dueDay = new Date(year, month - 1, day, 9, 0, 0);
  const threeDaysBefore = new Date(year, month - 1, day - 3, 9, 0, 0);

  const formattedValue = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount);

  // 1. Alerta 3 dias antes
  const idThreeDays = await scheduleLocalReminder({
    title: `⏰ Lembrete: ${stepTitle} em 3 dias`,
    body: `Parcela de ${formattedValue} para ${recipientName || 'favorecido'} vence em breve.`,
    date: threeDaysBefore,
  });
  if (idThreeDays) ids.push(idThreeDays);

  // 2. Alerta no dia do vencimento
  const idDayOf = await scheduleLocalReminder({
    title: `🚨 Vencimento Hoje: ${stepTitle}`,
    body: `Não esqueça de pagar ${formattedValue} para ${recipientName || 'favorecido'}.`,
    date: dueDay,
  });
  if (idDayOf) ids.push(idDayOf);

  return ids;
}

/**
 * Cancela notificações agendadas
 */
export async function cancelNotification(notificationId: string): Promise<void> {
  if (Platform.OS === 'web' || !notificationId || !isNotificationsAvailable || !Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.warn('Erro ao cancelar notificação:', error);
  }
}
