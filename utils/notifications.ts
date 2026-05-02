import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import Constants, { ExecutionEnvironment } from 'expo-constants';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Configure how notifications behave when the app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const STICKY_NOTIFICATION_ID = 'next-class-sticky';

export async function setupNotificationChannels() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('sticky-class', {
      name: 'Next Class (Sticky)',
      importance: Notifications.AndroidImportance.LOW, // Low importance so it doesn't vibrate constantly
      vibrationPattern: [0, 0, 0, 0],
      lightColor: '#4C0099',
    });
  }
}

export async function updateStickyClassNotification(subject: string, timeStr: string, room: string, triggerDate?: Date): Promise<void> {
  if (isExpoGo) return; // Prevent errors in Expo Go
  
  await setupNotificationChannels();
  
  if (!subject) {
    // If there is no next class, dismiss the sticky notification
    await Notifications.dismissNotificationAsync(STICKY_NOTIFICATION_ID);
    return;
  }

  // Request permissions if not already granted
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    const { status: newStatus } = await Notifications.requestPermissionsAsync();
    if (newStatus !== 'granted') return;
  }

  // Determine trigger: immediate or at a specific date
  const trigger = triggerDate && triggerDate > new Date() ? triggerDate : null;

  // Schedule or update the sticky notification
  await Notifications.scheduleNotificationAsync({
    identifier: STICKY_NOTIFICATION_ID,
    content: {
      title: `Next Class: ${timeStr}`,
      body: `${subject} • Room: ${room}`,
      autoDismiss: false,
      sticky: true, // This makes it a persistent notification on Android
      data: { route: 'timetable' },
      color: '#007AFF', // Standard app accent
    },
    trigger: trigger, 
  });
}

export async function registerForPushNotificationsAsync(): Promise<void> {
  if (isExpoGo) return;
  const { status } = await Notifications.requestPermissionsAsync();
  console.log('Notification permissions:', status);
}

export async function scheduleClassNotification(subject: string, timeStr: string, room: string): Promise<void> {
  // Legacy stub, replaced by updateStickyClassNotification
  return;
}

export async function cancelAllNotifications(): Promise<void> {
  if (isExpoGo) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}
