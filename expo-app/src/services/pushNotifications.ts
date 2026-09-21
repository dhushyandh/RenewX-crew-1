import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '@/services/api';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

const PUSH_TOKEN_STORAGE_KEY = '@renewx_push_token';

let registrationPromise: Promise<string | null> | null = null;

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'RenewX updates',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
    });
  }

  const permissions = await Notifications.getPermissionsAsync();
  let finalStatus = permissions.status;

  if (finalStatus !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[Notifications] Permission not granted for push notifications:', finalStatus);
    return null;
  }

  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ??
    Constants?.easConfig?.projectId;

  if (!projectId) {
    throw new Error('Expo EAS project ID is not configured');
  }

  try {
    const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenResult.data;
    console.log('[Notifications] Obtained Expo push token:', token);

    await api.users.registerPushToken(token);
    await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token);
    console.log('[Notifications] Successfully registered push token with RenewX server');
    return token;
  } catch (err) {
    console.error('[Notifications] Error obtaining or registering push token:', err);
    throw err;
  }
}

export function registerPushTokenInBackground(): void {
  if (registrationPromise) return;

  registrationPromise = registerForPushNotificationsAsync()
    .catch((error) => {
      console.warn('[Notifications] Push registration failed:', error);
      return null;
    })
    .finally(() => {
      registrationPromise = null;
    });
}

export async function getStoredPushTokenAsync(): Promise<string | null> {
  return AsyncStorage.getItem(PUSH_TOKEN_STORAGE_KEY);
}

export async function unregisterPushTokenAsync(token: string): Promise<void> {
  if (!token) return;
  try {
    await api.users.unregisterPushToken(token);
  } catch (error) {
    console.warn('[Notifications] Push token unregister failed:', error);
  } finally {
    await AsyncStorage.removeItem(PUSH_TOKEN_STORAGE_KEY);
  }
}
