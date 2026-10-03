import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Easing,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AnimatedOrderSuccessTickProps {
  size?: number;
  autoPlay?: boolean;
  showParticles?: boolean;
  onAnimationComplete?: () => void;
  onPress?: () => void;
}

/**
 * AnimatedOrderSuccessTick
 * A celebratory, spring-physics animated green checkmark that executes a
 * "zoom-in to zoom-out" (pop-in with overshoot then settling bounce) animation
 * with expanding radiant ripple rings and floating confetti particles.
 */
export default function AnimatedOrderSuccessTick({
  size = 88,
  autoPlay = true,
  showParticles = true,
  onAnimationComplete,
  onPress,
}: AnimatedOrderSuccessTickProps) {
  // Main circle scale & opacity
  const circleScale = useRef(new Animated.Value(0.1)).current;
  const circleOpacity = useRef(new Animated.Value(0)).current;

  // Inner tick icon scale & opacity
  const tickScale = useRef(new Animated.Value(0.1)).current;
  const tickOpacity = useRef(new Animated.Value(0)).current;

  // Expanding ripple rings
  const ring1Scale = useRef(new Animated.Value(0.7)).current;
  const ring1Opacity = useRef(new Animated.Value(0.75)).current;
  const ring2Scale = useRef(new Animated.Value(0.6)).current;
  const ring2Opacity = useRef(new Animated.Value(0.5)).current;

  // Confetti particles explosion
  const particlesProgress = useRef(new Animated.Value(0)).current;
  const particlesOpacity = useRef(new Animated.Value(0)).current;

  const triggerAnimation = () => {
    // Reset values
    circleScale.setValue(0.1);
    circleOpacity.setValue(0);
    tickScale.setValue(0.1);
    tickOpacity.setValue(0);
    ring1Scale.setValue(0.7);
    ring1Opacity.setValue(0.75);
    ring2Scale.setValue(0.6);
    ring2Opacity.setValue(0.5);
    particlesProgress.setValue(0);
    particlesOpacity.setValue(0);

    Animated.parallel([
      // 1. Circle: Rapid zoom in (to 1.28x) then zoom out / spring back to resting 1.0x
      Animated.sequence([
        Animated.parallel([
          Animated.timing(circleOpacity, {
            toValue: 1,
            duration: 120,
            useNativeDriver: true,
          }),
          Animated.timing(circleScale, {
            toValue: 1.28,
            duration: 280,
            easing: Easing.out(Easing.back(1.6)),
            useNativeDriver: true,
          }),
        ]),
        Animated.spring(circleScale, {
          toValue: 1.0,
          friction: 4.5,
          tension: 70,
          useNativeDriver: true,
        }),
      ]),

      // 2. Inner Tick Checkmark: Pops in right as the circle zooms in
      Animated.sequence([
        Animated.delay(130),
        Animated.parallel([
          Animated.timing(tickOpacity, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.spring(tickScale, {
            toValue: 1.22,
            friction: 3.5,
            tension: 85,
            useNativeDriver: true,
          }),
        ]),
        Animated.spring(tickScale, {
          toValue: 1.0,
          friction: 5,
          tension: 60,
          useNativeDriver: true,
        }),
      ]),

      // 3. First Radiant Halo Ring: Expands outward
      Animated.sequence([
        Animated.delay(90),
        Animated.parallel([
          Animated.timing(ring1Scale, {
            toValue: 1.65,
            duration: 700,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(ring1Opacity, {
            toValue: 0,
            duration: 700,
            useNativeDriver: true,
          }),
        ]),
      ]),

      // 4. Second Radiant Halo Ring (delayed ripple)
      Animated.sequence([
        Animated.delay(200),
        Animated.parallel([
          Animated.timing(ring2Scale, {
            toValue: 1.45,
            duration: 650,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(ring2Opacity, {
            toValue: 0,
            duration: 650,
            useNativeDriver: true,
          }),
        ]),
      ]),

      // 5. Confetti Burst
      Animated.sequence([
        Animated.delay(160),
        Animated.parallel([
          Animated.timing(particlesOpacity, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(particlesProgress, {
            toValue: 1,
            duration: 800,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(particlesOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      onAnimationComplete?.();
    });
  };

  useEffect(() => {
    if (autoPlay) {
      triggerAnimation();
    }
  }, [autoPlay]);

  const tickIconSize = Math.round(size * 0.54);
  const ringSize = Math.round(size * 1.15);

  // Confetti particles configuration (bursting angles & colors)
  const particles = [
    { angle: -45, distance: 58, color: '#3B82F6', size: 8, shape: 'square' },
    { angle: -20, distance: 72, color: '#10B981', size: 9, shape: 'circle' },
    { angle: 15, distance: 64, color: '#F59E0B', size: 8, shape: 'rect' },
    { angle: 45, distance: 75, color: '#EC4899', size: 7, shape: 'circle' },
    { angle: 70, distance: 62, color: '#10B981', size: 10, shape: 'rect' },
    { angle: 125, distance: 68, color: '#8B5CF6', size: 8, shape: 'circle' },
    { angle: 155, distance: 74, color: '#F59E0B', size: 9, shape: 'rect' },
    { angle: -140, distance: 66, color: '#10B981', size: 8, shape: 'square' },
    { angle: -105, distance: 70, color: '#3B82F6', size: 7, shape: 'circle' },
    { angle: -75, distance: 65, color: '#EC4899', size: 9, shape: 'rect' },
  ];

  return (
    <View style={[styles.outerContainer, { width: size * 2, height: size * 2 }]}>
      {/* Confetti Particles */}
      {showParticles &&
        particles.map((p, idx) => {
          const rad = (p.angle * Math.PI) / 180;
          const translateX = particlesProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [0, Math.cos(rad) * p.distance],
          });
          const translateY = particlesProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [0, Math.sin(rad) * p.distance + 8], // slight downward gravity
          });
          const rotate = particlesProgress.interpolate({
            inputRange: [0, 1],
            outputRange: ['0deg', `${p.angle * 2.5}deg`],
          });
          const scale = particlesProgress.interpolate({
            inputRange: [0, 0.3, 1],
            outputRange: [0.2, 1.1, 0.8],
          });

          return (
            <Animated.View
              key={idx}
              pointerEvents="none"
              style={[
                styles.particle,
                {
                  width: p.size,
                  height: p.shape === 'rect' ? p.size * 0.55 : p.size,
                  borderRadius: p.shape === 'circle' ? p.size / 2 : 2,
                  backgroundColor: p.color,
                  opacity: particlesOpacity,
                  transform: [
                    { translateX },
                    { translateY },
                    { rotate },
                    { scale },
                  ],
                },
              ]}
            />
          );
        })}

      {/* Radiant Halo Ring 1 */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.haloRing,
          {
            width: ringSize,
            height: ringSize,
            borderRadius: ringSize / 2,
            borderColor: '#16A34A',
            opacity: ring1Opacity,
            transform: [{ scale: ring1Scale }],
          },
        ]}
      />

      {/* Radiant Halo Ring 2 */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.haloRing,
          {
            width: ringSize,
            height: ringSize,
            borderRadius: ringSize / 2,
            borderColor: '#22C55E',
            opacity: ring2Opacity,
            transform: [{ scale: ring2Scale }],
          },
        ]}
      />

      {/* Main Emerald Green Circle with Zoom-in to Zoom-out Spring */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => {
          triggerAnimation();
          onPress?.();
        }}
        disabled={!onPress}
      >
        <Animated.View
          style={[
            styles.greenCircle,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              opacity: circleOpacity,
              transform: [{ scale: circleScale }],
            },
          ]}
        >
          {/* Inner ambient shine/bevel */}
          <View
            style={[
              styles.innerShine,
              {
                width: size * 0.9,
                height: size * 0.45,
                borderRadius: size * 0.45,
              },
            ]}
          />

          {/* Animated White Tick Checkmark */}
          <Animated.View
            style={{
              opacity: tickOpacity,
              transform: [{ scale: tickScale }],
            }}
          >
            <Ionicons name="checkmark" size={tickIconSize} color="#FFFFFF" />
          </Animated.View>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  haloRing: {
    position: 'absolute',
    borderWidth: 3.5,
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
  },
  greenCircle: {
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#16A34A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.38,
        shadowRadius: 14,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 8px 24px rgba(22, 163, 74, 0.38)',
      },
    }),
  },
  innerShine: {
    position: 'absolute',
    top: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    transform: [{ scaleX: 0.95 }],
  },
  particle: {
    position: 'absolute',
  },
});
