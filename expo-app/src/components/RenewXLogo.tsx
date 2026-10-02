import React from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

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
          Buy Refurbished | Sell | Upgrade
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
    fontWeight: '900',
    fontStyle: 'italic',
    color: '#0A1128',
    letterSpacing: -0.5,
    textShadowColor: '#ffffff',
    textShadowOffset: { width: -1.5, height: 0 },
    textShadowRadius: 1,
  },
  xText: {
    fontWeight: '900',
    fontStyle: 'italic',
    color: '#F59E0B',
    marginLeft: 0.5,
  },
  tagline: {
    fontWeight: '700',
    color: '#476E8E',
    letterSpacing: 0.2,
    marginTop: -2,
  },
});
