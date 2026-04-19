// expo-notifications is NOT supported in Expo Go (SDK 53+).
// All functions are stubbed here. They will be implemented when building a dev build.

export async function registerForPushNotificationsAsync(): Promise<void> {
  return;
}

export async function scheduleClassNotification(
  _subject: string,
  _timeStr: string,
  _room: string
): Promise<void> {
  return;
}

export async function cancelAllNotifications(): Promise<void> {
  return;
}
