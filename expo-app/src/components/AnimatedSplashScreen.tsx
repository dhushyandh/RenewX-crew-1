import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const LOGO_IMG = require('@/assets/splash.png');
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface AnimatedSplashScreenProps {
  onFinish?: () => void;
  isReady?: boolean;
}

export default function AnimatedSplashScreen({
  onFinish,
  isReady = true,
}: AnimatedSplashScreenProps) {
  // Animation drivers
  const logoScale = useRef(new Animated.Value(0.78)).current;
  const logoTranslateY = useRef(new Animated.Value(14)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  // Ambient aura glow
  const auraScale = useRef(new Animated.Value(0.7)).current;
  const auraOpacity = useRef(new Animated.Value(0)).current;

  // Text & badge elements
  const textTranslateY = useRef(new Animated.Value(12)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  // Sleek progress hairline track
  const progressWidth = useRef(new Animated.Value(0)).current;
  const progressOpacity = useRef(new Animated.Value(0)).current;

  // Container fade out
  const containerOpacity = useRef(new Animated.Value(1)).current;

  const [hasEntered, setHasEntered] = useState(false);

  useEffect(() => {
    // Phase 1: Upgraded Cinematic LinkedIn Entrance
    Animated.parallel([
      // Logo Entrance
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 560,
        easing: Easing.bezier(0.16, 1, 0.3, 1), // Silky spring-like curve
        useNativeDriver: true,
      }),
      Animated.timing(logoTranslateY, {
        toValue: 0,
        duration: 560,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 440,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),

      // Ambient Aura Expansion
      Animated.sequence([
        Animated.timing(auraOpacity, {
          toValue: 0.5,
          duration: 350,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(auraOpacity, {
          toValue: 0.15,
          duration: 450,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(auraScale, {
        toValue: 1.35,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),

      // Typography Entrance (staggered slightly)
      Animated.timing(textTranslateY, {
        toValue: 0,
        duration: 500,
        delay: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 480,
        delay: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),

      // Progress bar fill
      Animated.timing(progressOpacity, {
        toValue: 1,
        duration: 300,
        delay: 240,
        useNativeDriver: false,
      }),
      Animated.timing(progressWidth, {
        toValue: 1,
        duration: 750,
        delay: 240,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start(() => {
      // Phase 2: Gentle micro breathing pulse (LinkedIn signature)
      Animated.loop(
        Animated.sequence([
          Animated.timing(logoScale, {
            toValue: 1.035,
            duration: 700,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(logoScale, {
            toValue: 1.0,
            duration: 700,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ).start();

      setHasEntered(true);
    });
  }, []);

  // Phase 3: Upgraded Cinematic Portal Exit (Anticipation Dip -> Zoom-through)
  useEffect(() => {
    if (!hasEntered || !isReady) return;

    const timer = setTimeout(() => {
      // Step A: Crisp 90ms anticipation dip
      Animated.timing(logoScale, {
        toValue: 0.95,
        duration: 100,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start(() => {
        // Step B: Expansive Hero Portal Zoom & Container Fade
        Animated.parallel([
          Animated.timing(logoScale, {
            toValue: 2.1,
            duration: 380,
            easing: Easing.bezier(0.4, 0, 0.2, 1),
            useNativeDriver: true,
          }),
          Animated.timing(logoOpacity, {
            toValue: 0,
            duration: 280,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(textOpacity, {
            toValue: 0,
            duration: 200,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(progressOpacity, {
            toValue: 0,
            duration: 180,
            useNativeDriver: false,
          }),
          Animated.timing(containerOpacity, {
            toValue: 0,
            duration: 380,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]).start(() => {
          if (onFinish) {
            onFinish();
          }
        });
      });
    }, 180);

    return () => clearTimeout(timer);
  }, [hasEntered, isReady]);

  const progressLineWidth = progressWidth.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.min(140, SCREEN_WIDTH * 0.35)],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        {
          opacity: containerOpacity,
        },
      ]}
    >
      <View style={styles.centerBox}>
        {/* Soft Ambient Radial Halo */}
        <Animated.View
          style={[
            styles.auraHalo,
            {
              opacity: auraOpacity,
              transform: [{ scale: auraScale }],
            },
          ]}
        />

        {/* Hero Logo with Silky Elevation */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [
                { translateY: logoTranslateY },
                { scale: logoScale },
              ],
            },
          ]}
        >
          <Image source={LOGO_IMG} style={styles.logoImage} resizeMode="contain" />
        </Animated.View>
      </View>

      {/* Brand Footer with Hairline Shimmer Progress */}
      <View style={styles.bottomBrandBox}>
        <Animated.View
          style={{
            alignItems: 'center',
            opacity: textOpacity,
            transform: [{ translateY: textTranslateY }],
          }}
        >
          <Text style={styles.brandTitle}>
            Renew<Text style={styles.brandAccent}>X</Text>
          </Text>
          <Text style={styles.brandSubtitle}>Certified Pre-Owned Electronics</Text>
        </Animated.View>

        {/* Sleek hairline loading indicator */}
        <Animated.View
          style={[
            styles.progressTrack,
            {
              opacity: progressOpacity,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.progressBar,
              {
                width: progressLineWidth,
              },
            ]}
          />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
    zIndex: 99999,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  auraHalo: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#ffc400',
    filter: Platform.OS === 'web' ? 'blur(28px)' : undefined,
  },
  logoContainer: {
    width: 104,
    height: 104,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
  },
  logoImage: {
    width: 90,
    height: 90,
  },
  bottomBrandBox: {
    paddingBottom: 48,
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.6,
  },
  brandAccent: {
    color: '#ffc400',
  },
  brandSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94a3b8',
    marginTop: 4,
    letterSpacing: 0.3,
  },
  progressTrack: {
    width: 140,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#f1f5f9',
    marginTop: 18,
    overflow: 'hidden',
    alignItems: 'flex-start',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#ffc400',
  },
});
