import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { renewxColors, renewxFontFamily, renewxSpacing, renewxTypography } from '@/design-system';

type Props = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export default function RenewXSectionHeader({
  title,
  subtitle,
  actionLabel = 'View all',
  onAction,
}: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      {onAction ? (
        <TouchableOpacity
          onPress={onAction}
          activeOpacity={0.72}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text style={styles.action}>{actionLabel}  ›</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: renewxSpacing.md,
  },
  copy: {
    flex: 1,
  },
  title: {
    fontFamily: renewxFontFamily.bold,
    fontSize: renewxTypography.h2.fontSize,
    lineHeight: renewxTypography.h2.lineHeight,
    color: renewxColors.black,
    letterSpacing: renewxTypography.h2.letterSpacing,
  },
  subtitle: {
    marginTop: 4,
    fontFamily: renewxFontFamily.regular,
    fontSize: renewxTypography.caption.fontSize,
    lineHeight: renewxTypography.caption.lineHeight,
    color: renewxColors.textSecondary,
  },
  action: {
    fontFamily: renewxFontFamily.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: renewxColors.greenDark,
  },
});
