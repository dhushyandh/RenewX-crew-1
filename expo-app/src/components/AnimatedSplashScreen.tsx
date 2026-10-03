import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Platform,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';

const SPLASH_POSTER = require('../../assets/image.png');

interface AnimatedSplashScreenProps {
  onFinish?: () => void;
  isReady?: boolean;
  minDurationMs?: number;
}

export default function AnimatedSplashScreen({
  onFinish,
  isReady = true,
  minDurationMs = 1200,
}: AnimatedSplashScreenProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  // Screen entrance & exit animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.98)).current;
  const [minTimePassed, setMinTimePassed] = useState(false);

  // 1. Entrance animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 450,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    const minTimer = setTimeout(() => {
      setMinTimePassed(true);
    }, minDurationMs);

    return () => clearTimeout(minTimer);
  }, []);

  // 2. Graceful exit transition when app is ready and minimum display time elapsed
  useEffect(() => {
    if (minTimePassed && isReady) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 350,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1.02,
          duration: 350,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(() => {
        onFinish?.();
      });
    }
  }, [minTimePassed, isReady]);

  // Responsive desktop / mobile frame handling
  const isDesktop = Platform.OS === 'web' && windowWidth > 540;
  const containerWidth = isDesktop ? Math.min(430, windowWidth * 0.9) : windowWidth;
  const containerHeight = isDesktop ? Math.min(880, windowHeight * 0.94) : windowHeight;

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
      <Animated.View
        style={[
          styles.cardContainer,
          isDesktop && styles.desktopCard,
          {
            width: containerWidth,
            height: containerHeight,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Image
          source={SPLASH_POSTER}
          style={styles.splashImage}
          resizeMode={isDesktop ? 'contain' : 'cover'}
        />
      </Animated.View>
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
  cardContainer: {
    position: 'relative',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  desktopCard: {
    borderRadius: 28,
    ...Platform.select({
      web: {
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.12)',
      },
      default: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 12,
      },
    }),
  },
  splashImage: {
    width: '100%',
    height: '100%',
  },
});
