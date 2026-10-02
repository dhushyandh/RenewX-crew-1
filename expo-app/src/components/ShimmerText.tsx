import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Text,
  StyleSheet,
  Platform,
  type TextStyle,
  type StyleProp,
} from 'react-native';

interface ShimmerTextProps {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
  shimmerColor?: string;
  baseColor?: string;
  duration?: number;
  numberOfLines?: number;
  variant?: 'gold' | 'silver' | 'green' | 'blue' | 'light';
}

// Inject CSS keyframe once on Web for ultra-smooth 60fps gradient wave
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const styleId = 'renewx-shimmer-text-style';
  if (!document.getElementById(styleId)) {
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.innerHTML = `
      @keyframes renewxShimmerSweep {
        0% { background-position: -200% center; }
        100% { background-position: 200% center; }
      }
      .renewx-shimmer-gold {
        background: linear-gradient(90deg, #0F172A 0%, #0F172A 25%, #F59E0B 50%, #FEF08A 60%, #F59E0B 70%, #0F172A 85%, #0F172A 100%);
        background-size: 250% 100%;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        animation: renewxShimmerSweep 3s linear infinite;
        display: inline-block;
      }
      .renewx-shimmer-green {
        background: linear-gradient(90deg, #064E3B 0%, #064E3B 25%, #10B981 50%, #A7F3D0 60%, #10B981 70%, #064E3B 85%, #064E3B 100%);
        background-size: 250% 100%;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        animation: renewxShimmerSweep 2.8s linear infinite;
        display: inline-block;
      }
      .renewx-shimmer-blue {
        background: linear-gradient(90deg, #0F172A 0%, #1E3A8A 25%, #3B82F6 50%, #93C5FD 60%, #3B82F6 70%, #0F172A 85%, #0F172A 100%);
        background-size: 250% 100%;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        animation: renewxShimmerSweep 3.2s linear infinite;
        display: inline-block;
      }
      .renewx-shimmer-silver {
        background: linear-gradient(90deg, #0F172A 0%, #334155 25%, #94A3B8 50%, #FFFFFF 60%, #94A3B8 70%, #0F172A 85%, #0F172A 100%);
        background-size: 250% 100%;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        animation: renewxShimmerSweep 3s linear infinite;
        display: inline-block;
      }
      .renewx-shimmer-light {
        background: linear-gradient(90deg, #FFFFFF 0%, #FFFFFF 25%, #FEF08A 50%, #FBBF24 60%, #FFFFFF 85%, #FFFFFF 100%);
        background-size: 250% 100%;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        animation: renewxShimmerSweep 2.8s linear infinite;
        display: inline-block;
      }
    `;
    document.head.appendChild(styleEl);
  }
}

export default function ShimmerText({
  children,
  style,
  shimmerColor = '#F59E0B',
  baseColor = '#0F172A',
  duration = 2600,
  numberOfLines,
  variant = 'gold',
}: ShimmerTextProps) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: duration,
          useNativeDriver: false,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: duration,
          useNativeDriver: false,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim, duration]);

  // Color interpolation for Native (iOS / Android)
  const interpolatedColor = anim.interpolate({
    inputRange: [0, 0.45, 0.55, 1],
    outputRange: [
      baseColor,
      shimmerColor,
      variant === 'green'
        ? '#059669'
        : variant === 'blue'
        ? '#2563EB'
        : variant === 'light'
        ? '#FEF08A'
        : '#FBBF24',
      baseColor,
    ],
  });

  const interpolatedOpacity = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.95, 1, 0.95],
  });

  if (Platform.OS === 'web') {
    const webClassName =
      variant === 'green'
        ? 'renewx-shimmer-green'
        : variant === 'blue'
        ? 'renewx-shimmer-blue'
        : variant === 'silver'
        ? 'renewx-shimmer-silver'
        : variant === 'light'
        ? 'renewx-shimmer-light'
        : 'renewx-shimmer-gold';

    return (
      <Text
        numberOfLines={numberOfLines}
        style={[styles.baseText, style]}
        {...({ className: webClassName } as any)}
      >
        {children}
      </Text>
    );
  }

  return (
    <Animated.Text
      numberOfLines={numberOfLines}
      style={[
        styles.baseText,
        style,
        {
          color: interpolatedColor,
          opacity: interpolatedOpacity,
        },
      ]}
    >
      {children}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  baseText: {
    letterSpacing: -0.2,
  },
});
