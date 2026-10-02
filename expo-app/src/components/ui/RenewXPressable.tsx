import React, { useRef } from 'react';
import { Animated, Pressable, type PressableProps, type ViewStyle, type StyleProp } from 'react-native';
import { renewxMotion } from '@/design-system';

type Props = Omit<PressableProps, 'style'> & {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  scale?: number;
};

export default function RenewXPressable({
  children,
  style,
  scale = renewxMotion.pressScale,
  onPressIn,
  onPressOut,
  ...props
}: Props) {
  const value = useRef(new Animated.Value(1)).current;

  const animateTo = (toValue: number) => {
    Animated.spring(value, {
      toValue,
      useNativeDriver: true,
      speed: 28,
      bounciness: 4,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: value }] }}>
      <Pressable
        {...props}
        onPressIn={(event) => {
          animateTo(scale);
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          animateTo(1);
          onPressOut?.(event);
        }}
        style={style}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
