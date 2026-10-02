import { Platform } from 'react-native';

/**
 * RenewX design system — Phase 1.
 *
 * Keep visual decisions here so screens do not invent their own colors,
 * spacing, radii, shadows, or motion values.
 */
export const renewxColors = {
  green: '#168A4A',
  greenDark: '#0B6B3A',
  greenDeep: '#07552E',
  greenLight: '#E7F8EC',
  greenSoft: '#F4FCF6',

  // Zepto / Quick-commerce Lush Mint & Emerald Palette
  mint: '#E8F7ED',
  mintLight: '#F0FDF4',
  mintDark: '#064E2E',
  mintBorder: '#D4EBDC',
  emerald: '#0C7A43',
  cream: '#FFFDF5',
  gold: '#F59E0B',

  yellow: '#FFC400',
  yellowDark: '#D9A600',
  yellowLight: '#FFF4C2',
  yellowSoft: '#FFFBEA',

  black: '#111111',
  text: '#252525',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',

  background: '#F7F8F6',
  surface: '#FFFFFF',
  surfaceMuted: '#F1F4F1',

  border: '#E5E7EB',
  borderStrong: '#D1D5DB',

  success: '#168A4A',
  warning: '#D97706',
  error: '#DC2626',
  info: '#2563EB',

  white: '#FFFFFF',
  blackPure: '#000000',
  transparent: 'transparent',
} as const;

export const renewxSpacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
} as const;

export const renewxRadius = {
  xs: 8,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  xxl: 28,
  pill: 999,
} as const;

export const renewxTypography = {
  display: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800' as const,
    letterSpacing: -0.8,
  },
  h1: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700' as const,
    letterSpacing: -0.25,
  },
  h3: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700' as const,
  },
  body: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '400' as const,
  },
  bodyMedium: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '500' as const,
  },
  bodySemibold: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600' as const,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400' as const,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600' as const,
    letterSpacing: 0.2,
  },
  price: {
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '800' as const,
    letterSpacing: -0.35,
  },
} as const;

/**
 * Outfit is already bundled in RenewX. The typography roles above are
 * deliberately centralized so Poppins/Inter can be introduced later
 * without changing screen-level styles.
 */
export const renewxFontFamily = {
  regular: Platform.select({
    web: 'Outfit, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    default: 'Outfit_400Regular',
  }),
  medium: Platform.select({
    web: 'Outfit, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    default: 'Outfit_500Medium',
  }),
  semibold: Platform.select({
    web: 'Outfit, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    default: 'Outfit_600SemiBold',
  }),
  bold: Platform.select({
    web: 'Outfit, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    default: 'Outfit_700Bold',
  }),
  extraBold: Platform.select({
    web: 'Outfit, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    default: 'Outfit_800ExtraBold',
  }),
} as const;

export const renewxShadows = {
  card: Platform.select({
    ios: {
      shadowColor: '#111111',
      shadowOpacity: 0.06,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 5 },
    },
    android: { elevation: 2 },
    web: { boxShadow: '0 5px 18px rgba(17, 17, 17, 0.06)' },
  }),
  elevated: Platform.select({
    ios: {
      shadowColor: '#111111',
      shadowOpacity: 0.10,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 8 },
    },
    android: { elevation: 5 },
    web: { boxShadow: '0 10px 28px rgba(17, 17, 17, 0.10)' },
  }),
  floating: Platform.select({
    ios: {
      shadowColor: '#111111',
      shadowOpacity: 0.12,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 10 },
    },
    android: { elevation: 8 },
    web: { boxShadow: '0 14px 34px rgba(17, 17, 17, 0.12)' },
  }),
} as const;

export const renewxMotion = {
  fast: 140,
  normal: 220,
  emphasized: 320,
  entrance: 420,
  pressScale: 0.97,
} as const;

export const renewxZIndex = {
  base: 0,
  content: 10,
  sticky: 50,
  floating: 100,
  modal: 500,
  toast: 1000,
} as const;
