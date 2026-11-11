import React from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { renewxColors, renewxTextStyle } from '@/design-system';

interface RenewXLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  style?: StyleProp<ViewStyle>;
  alignCenter?: boolean;
}

export default function RenewXLogo({
  size = 'md',
  showTagline = true,
  style,
  alignCenter = false,
}: RenewXLogoProps) {
  const isSm = size === 'sm';
  const isLg = size === 'lg';

  const brandFontSize = isSm ? 18 : isLg ? 26 : 22;
  const taglineFontSize = isSm ? 7.5 : isLg ? 10 : 8.5;

  return (
    <View style={[styles.container, alignCenter && styles.centerContainer, style]}>
      <View style={styles.logoRow}>
        <Text
          style={[
            styles.renewText,
            { fontSize: brandFontSize },
          ]}
        >
          Renew
        </Text>
        <Text
          style={[
            styles.xText,
            { fontSize: brandFontSize },
          ]}
        >
          X
        </Text>
      </View>
      {showTagline && (
        <Text
          style={[
            styles.tagline,
            { fontSize: taglineFontSize },
          ]}
        >
          Buy Pre-Owned | Sell | Upgrade
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
  },
  centerContainer: {
    alignItems: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  renewText: {
    ...renewxTextStyle('black'),
    fontStyle: 'italic',
    color: renewxColors.black,
    letterSpacing: -0.6,
  },
  xText: {
    ...renewxTextStyle('black'),
    fontStyle: 'italic',
    color: renewxColors.gold,
    marginLeft: 1,
  },
  tagline: {
    ...renewxTextStyle('semibold'),
    color: renewxColors.textSecondary,
    letterSpacing: 0.2,
    marginTop: -2,
  },
});
