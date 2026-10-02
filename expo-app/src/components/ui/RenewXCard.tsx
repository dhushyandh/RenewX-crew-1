import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { renewxColors, renewxRadius, renewxShadows } from '@/design-system';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
  padded?: boolean;
};

export default function RenewXCard({
  children,
  style,
  elevated = false,
  padded = true,
}: Props) {
  return (
    <View
      style={[
        styles.card,
        elevated ? renewxShadows.elevated : renewxShadows.card,
        padded && styles.padded,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: renewxColors.surface,
    borderRadius: renewxRadius.lg,
    borderWidth: 1,
    borderColor: renewxColors.border,
  },
  padded: {
    padding: 16,
  },
});
