import React, { useEffect, useRef } from 'react';
import { Animated, ActivityIndicator, StyleSheet, View } from 'react-native';

interface AnimatedSplashScreenProps {
  onFinish?: () => void;
  isReady?: boolean;
  minDurationMs?: number;
}

export default function AnimatedSplashScreen({
  onFinish,
  isReady = true,
}: AnimatedSplashScreenProps) {
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isReady) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        onFinish?.();
      });
    }
  }, [isReady, onFinish]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.overlay,
        {
          opacity: fadeAnim,
        },
      ]}
    >
      <ActivityIndicator size="large" color="#EAB308" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    zIndex: 999999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

