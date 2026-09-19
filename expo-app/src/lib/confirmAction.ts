import { Alert, Platform } from 'react-native';

/**
 * Universal cross-platform action confirmation helper.
 * On Web: uses window.confirm which reliably handles async/sync callbacks
 * On Native (iOS/Android): uses native Alert.alert with cancel and confirm buttons
 */
export function confirmAction(
  title: string,
  message: string,
  onConfirm: () => void | Promise<void>,
  confirmText: string = 'Delete'
): void {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
      const isConfirmed = window.confirm(`${title}\n\n${message}`);
      if (isConfirmed) {
        Promise.resolve(onConfirm()).catch((err) => {
          console.error('[confirmAction] Error during onConfirm execution:', err);
        });
      }
    } else {
      Promise.resolve(onConfirm()).catch((err) => {
        console.error('[confirmAction] Error during onConfirm execution:', err);
      });
    }
  } else {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: confirmText,
        style: confirmText.toLowerCase().includes('delete') ? 'destructive' : 'default',
        onPress: () => {
          Promise.resolve(onConfirm()).catch((err) => {
            console.error('[confirmAction] Error during onConfirm execution:', err);
          });
        },
      },
    ]);
  }
}
