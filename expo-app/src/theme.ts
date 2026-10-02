import { Platform } from 'react-native';
import {
  renewxColors,
  renewxSpacing,
  renewxRadius,
  renewxTypography,
  renewxFontFamily,
} from '@/design-system';

/**
 * Backwards-compatible theme exports.
 * New screens should import from '@/design-system' directly.
 */
export const colors = {
  primary: renewxColors.green,
  primaryDark: renewxColors.greenDark,
  primaryLight: renewxColors.greenLight,
  secondary: renewxColors.black,
  accent: renewxColors.yellow,
  success: renewxColors.success,
  warning: renewxColors.warning,
  error: renewxColors.error,
  info: renewxColors.info,
  background: renewxColors.background,
  surface: renewxColors.surface,
  text: renewxColors.text,
  textSecondary: renewxColors.textSecondary,
  textMuted: renewxColors.textMuted,
  border: renewxColors.border,
  borderLight: '#EEF1EE',
  white: renewxColors.white,
  black: renewxColors.black,
  yellow: renewxColors.yellow,
  green: renewxColors.green,
  greenLight: renewxColors.greenLight,
};

export const spacing = renewxSpacing;

export const radius = {
  sm: renewxRadius.sm,
  md: renewxRadius.md,
  lg: renewxRadius.lg,
  xl: renewxRadius.xl,
  xxl: renewxRadius.xxl,
  full: renewxRadius.pill,
};

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 22,
  xxl: 28,
  hero: 32,
};

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  black: '800' as const,
};

export const fontFamily = renewxFontFamily;

export const typography = renewxTypography;

export const conditionColors: Record<string, { bg: string; text: string }> = {
  'Like New': { bg: renewxColors.greenLight, text: renewxColors.greenDark },
  Excellent: { bg: '#E1F7F3', text: '#0F766E' },
  Good: { bg: '#EAF2FF', text: '#1D4ED8' },
  Fair: { bg: renewxColors.yellowLight, text: '#8A6500' },
};

export const shadows = {
  card: Platform.select({
    ios: {
      shadowColor: renewxColors.black,
      shadowOpacity: 0.06,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 5 },
    },
    android: { elevation: 2 },
    web: { boxShadow: '0 5px 18px rgba(17, 17, 17, 0.06)' },
  }),
  elevated: Platform.select({
    ios: {
      shadowColor: renewxColors.black,
      shadowOpacity: 0.10,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 8 },
    },
    android: { elevation: 5 },
    web: { boxShadow: '0 10px 28px rgba(17, 17, 17, 0.10)' },
  }),
};
