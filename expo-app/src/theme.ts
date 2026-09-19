export const colors = {
  primary: '#059669',
  primaryDark: '#047857',
  primaryLight: '#d1fae5',
  secondary: '#0d9488',
  accent: '#06b6d4',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  background: '#f9fafb',
  surface: '#ffffff',
  text: '#111827',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',
  border: '#e5e7eb',
  borderLight: '#f3f4f6',
  white: '#ffffff',
  black: '#000000',
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
  hero: 34,
};

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const conditionColors: Record<string, { bg: string; text: string }> = {
  'Like New': { bg: '#d1fae5', text: '#047857' },
  Excellent: { bg: '#ccfbf1', text: '#0f766e' },
  Good: { bg: '#dbeafe', text: '#1d4ed8' },
  Fair: { bg: '#fef3c7', text: '#b45309' },
};
