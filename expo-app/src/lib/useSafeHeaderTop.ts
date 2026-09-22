import { Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Returns a standardized top inset for headers and action bars.
 * Ensures headers never touch or overlap:
 * - Web browser window frame (desktop & mobile web)
 * - Android status bar & punch-hole camera cutouts
 * - iOS dynamic island & notches
 */
export function useSafeHeaderTop(extraOffset = 0): number {
  const insets = useSafeAreaInsets();

  if (Platform.OS === 'web') {
    // On web, insets.top is typically 0; provide clean, comfortable margin from the browser top
    return Math.max(insets.top, 22) + extraOffset;
  }

  if (Platform.OS === 'android') {
    // On Android, ensure it clears translucent status bar and camera punch-holes
    const androidStatusBar = StatusBar.currentHeight ?? 24;
    return Math.max(insets.top, androidStatusBar) + 8 + extraOffset;
  }

  // iOS (Notch / Dynamic Island)
  return Math.max(insets.top, 44) + 6 + extraOffset;
}
