import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { renewxColors, renewxFontFamily, renewxRadius } from '@/design-system';

type Tone = 'green' | 'yellow' | 'neutral' | 'error' | 'info';

type Props = {
  label: string;
  tone?: Tone;
  style?: StyleProp<ViewStyle>;
};

const tones: Record<Tone, { backgroundColor: string; color: string }> = {
  green: { backgroundColor: renewxColors.greenLight, color: renewxColors.greenDark },
  yellow: { backgroundColor: renewxColors.yellowLight, color: '#8A6500' },
  neutral: { backgroundColor: renewxColors.surfaceMuted, color: renewxColors.textSecondary },
  error: { backgroundColor: '#FEECEC', color: renewxColors.error },
  info: { backgroundColor: '#EAF2FF', color: renewxColors.info },
};

export default function RenewXBadge({ label, tone = 'neutral', style }: Props) {
  const palette = tones[tone];

  return (
    <View style={[styles.base, { backgroundColor: palette.backgroundColor }, style]}>
      <Text style={[styles.text, { color: palette.color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    minHeight: 28,
    paddingHorizontal: 10,
    borderRadius: renewxRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: renewxFontFamily.semibold,
    fontSize: 12,
    lineHeight: 16,
  },
});
