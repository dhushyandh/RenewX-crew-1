import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '@/services/api';

const WEB_PUSH_STORAGE_KEY = '@renewx_web_push_enabled';

/**
 * Converts a base64 string to a Uint8Array for PushManager subscription.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Checks if the current browser environment supports Service Workers and the Push API.
 */
export function isWebPushSupported(): boolean {
  if (Platform.OS !== 'web') return false;
  if (typeof window === 'undefined') return false;
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Gets the current Notification permission status on web.
 */
export function getWebNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isWebPushSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Registers the service worker /sw.js at root scope.
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isWebPushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    console.log('[WebPush] Service Worker registered with scope:', reg.scope);
    return reg;
  } catch (error) {
    console.warn('[WebPush] Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Subscribes the current web browser to push notifications.
 * Requests permission if undetermined, then retrieves VAPID key and registers with backend.
 */
export async function subscribeToWebPush(): Promise<boolean> {
  if (!isWebPushSupported()) return false;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('[WebPush] Notification permission was not granted:', permission);
      await AsyncStorage.setItem(WEB_PUSH_STORAGE_KEY, 'false');
      return false;
    }

    await AsyncStorage.setItem(WEB_PUSH_STORAGE_KEY, 'true');
    await AsyncStorage.setItem('@renewx_notif_permission_granted', 'true');

    // Register service worker and server push in background non-blocking
    (async () => {
      try {
        await registerServiceWorker();
        const registration = await navigator.serviceWorker.ready;
        if (!registration) return;

        const keyRes = await api.notifications.getWebPushPublicKey();
        const publicKey = (keyRes as any)?.data?.publicKey || (keyRes as any)?.publicKey;
        if (!publicKey) return;

        const applicationServerKey = urlBase64ToUint8Array(publicKey);
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey as any,
          });
        }
        const subJson = subscription.toJSON();
        await api.notifications.subscribeWebPush(subJson);
        console.log('[WebPush] Successfully subscribed browser to RenewX push notifications');
      } catch (subErr) {
        console.warn('[WebPush] Background server push subscription failed:', subErr);
      }
    })();

    return true;
  } catch (error) {
    console.error('[WebPush] Failed to request web notification permission:', error);
    return false;
  }
}

/**
 * Unsubscribes the current browser from push notifications.
 */
export async function unsubscribeFromWebPush(): Promise<boolean> {
  if (!isWebPushSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      try {
        await api.notifications.unsubscribeWebPush(endpoint);
      } catch (err) {
        console.warn('[WebPush] Backend unregister error:', err);
      }
    }
    await AsyncStorage.setItem(WEB_PUSH_STORAGE_KEY, 'false');
    console.log('[WebPush] Successfully unsubscribed from web push notifications');
    return true;
  } catch (error) {
    console.warn('[WebPush] Error during unsubscribe:', error);
    return false;
  }
}

/**
 * Checks if web push is currently active and subscribed for this browser.
 */
export async function isWebPushSubscribed(): Promise<boolean> {
  if (!isWebPushSupported()) return false;
  if (Notification.permission !== 'granted') return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
}
