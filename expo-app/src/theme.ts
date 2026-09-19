export const colors = {
  primary: '#ffc400',
  primaryDark: '#e0ac00',
  primaryLight: '#fff8d8',
  secondary: '#111827',
  accent: '#ffc400',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  background: '#f8f7f2',
  surface: '#ffffff',
  text: '#111827',
  textSecondary: '#4b5563',
  textMuted: '#9ca3af',
  border: '#e6e2d8',
  borderLight: '#f0ede6',
  white: '#ffffff',
  black: '#0a0a0a',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
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
  black: '900' as const,
};

export const conditionColors: Record<string, { bg: string; text: string }> = {
  'Like New': { bg: '#d1fae5', text: '#047857' },
  Excellent: { bg: '#ccfbf1', text: '#0f766e' },
  Good: { bg: '#dbeafe', text: '#1d4ed8' },
  Fair: { bg: '#fef3c7', text: '#b45309' },
};
