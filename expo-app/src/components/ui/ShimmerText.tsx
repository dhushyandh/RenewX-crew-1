import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Text,
  StyleSheet,
  Platform,
  type TextStyle,
  type StyleProp,
} from 'react-native';

export type ShimmerVariant =
  | 'gold'
  | 'gold-badge'
  | 'green'
  | 'green-badge'
  | 'whatsapp'
  | 'whatsapp-badge'
  | 'blue'
  | 'silver'
  | 'light';

export interface ShimmerTextProps {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
  shimmerColor?: string;
  baseColor?: string;
  duration?: number;
  numberOfLines?: number;
  variant?: ShimmerVariant;
  containerStyle?: any; // For backward compatibility
}

// Inject CSS keyframe once on Web for ultra-smooth 60fps text gradient sweep
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const styleId = 'renewx-true-text-shimmer-styles';
  if (!document.getElementById(styleId)) {
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.innerHTML = `
      @keyframes renewxTextSheenSweep {
        0% { background-position: -200% center; }
        100% { background-position: 200% center; }
      }
      .renewx-text-shimmer-gold {
        background: linear-gradient(90deg, #0F172A 0%, #0F172A 26%, #B45309 46%, #F59E0B 52%, #B45309 58%, #0F172A 78%, #0F172A 100%) !important;
        background-size: 240% 100% !important;
        -webkit-background-clip: text !important;
        -webkit-text-fill-color: transparent !important;
        animation: renewxTextSheenSweep 4.6s ease-in-out infinite !important;
        display: inline-block;
      }
      .renewx-text-shimmer-gold-badge {
        background: linear-gradient(90deg, #78350F 0%, #78350F 26%, #D97706 46%, #FBBF24 52%, #D97706 58%, #78350F 78%, #78350F 100%) !important;
        background-size: 240% 100% !important;
        -webkit-background-clip: text !important;
        -webkit-text-fill-color: transparent !important;
        animation: renewxTextSheenSweep 4.2s ease-in-out infinite !important;
        display: inline-block;
      }
      .renewx-text-shimmer-green {
        background: linear-gradient(90deg, #064E3B 0%, #064E3B 26%, #047857 46%, #10B981 52%, #047857 58%, #064E3B 78%, #064E3B 100%) !important;
        background-size: 240% 100% !important;
        -webkit-background-clip: text !important;
        -webkit-text-fill-color: transparent !important;
        animation: renewxTextSheenSweep 4.6s ease-in-out infinite !important;
        display: inline-block;
      }
      .renewx-text-shimmer-green-badge {
        background: linear-gradient(90deg, #065F46 0%, #065F46 26%, #059669 46%, #34D399 52%, #059669 58%, #065F46 78%, #065F46 100%) !important;
        background-size: 240% 100% !important;
        -webkit-background-clip: text !important;
        -webkit-text-fill-color: transparent !important;
        animation: renewxTextSheenSweep 4.2s ease-in-out infinite !important;
        display: inline-block;
      }
      .renewx-text-shimmer-whatsapp {
        background: linear-gradient(90deg, #14532D 0%, #14532D 26%, #166534 46%, #25D366 52%, #166534 58%, #14532D 78%, #14532D 100%) !important;
        background-size: 240% 100% !important;
        -webkit-background-clip: text !important;
        -webkit-text-fill-color: transparent !important;
        animation: renewxTextSheenSweep 4.6s ease-in-out infinite !important;
        display: inline-block;
      }
      .renewx-text-shimmer-whatsapp-badge {
        background: linear-gradient(90deg, #14532D 0%, #14532D 26%, #16A34A 46%, #22C55E 52%, #16A34A 58%, #14532D 78%, #14532D 100%) !important;
        background-size: 240% 100% !important;
        -webkit-background-clip: text !important;
        -webkit-text-fill-color: transparent !important;
        animation: renewxTextSheenSweep 4.2s ease-in-out infinite !important;
        display: inline-block;
      }
      .renewx-text-shimmer-blue {
        background: linear-gradient(90deg, #0F172A 0%, #0F172A 26%, #0284C7 46%, #38BDF8 52%, #0284C7 58%, #0F172A 78%, #0F172A 100%) !important;
        background-size: 240% 100% !important;
        -webkit-background-clip: text !important;
        -webkit-text-fill-color: transparent !important;
        animation: renewxTextSheenSweep 4.6s ease-in-out infinite !important;
        display: inline-block;
      }
      .renewx-text-shimmer-silver {
        background: linear-gradient(90deg, #0F172A 0%, #0F172A 26%, #475569 46%, #94A3B8 52%, #475569 58%, #0F172A 78%, #0F172A 100%) !important;
        background-size: 240% 100% !important;
        -webkit-background-clip: text !important;
        -webkit-text-fill-color: transparent !important;
        animation: renewxTextSheenSweep 4.6s ease-in-out infinite !important;
        display: inline-block;
      }
      .renewx-text-shimmer-light {
        background: linear-gradient(90deg, #FFFFFF 0%, #FFFFFF 26%, #FEF08A 46%, #FBBF24 52%, #FEF08A 58%, #FFFFFF 78%, #FFFFFF 100%) !important;
        background-size: 240% 100% !important;
        -webkit-background-clip: text !important;
        -webkit-text-fill-color: transparent !important;
        animation: renewxTextSheenSweep 4.6s ease-in-out infinite !important;
        display: inline-block;
      }
    `;
    document.head.appendChild(styleEl);
  }
}

const WEB_GRADIENTS: Record<ShimmerVariant, string> = {
  gold: 'linear-gradient(90deg, #0F172A 0%, #0F172A 26%, #B45309 46%, #F59E0B 52%, #B45309 58%, #0F172A 78%, #0F172A 100%)',
  'gold-badge': 'linear-gradient(90deg, #78350F 0%, #78350F 26%, #D97706 46%, #FBBF24 52%, #D97706 58%, #78350F 78%, #78350F 100%)',
  green: 'linear-gradient(90deg, #064E3B 0%, #064E3B 26%, #047857 46%, #10B981 52%, #047857 58%, #064E3B 78%, #064E3B 100%)',
  'green-badge': 'linear-gradient(90deg, #065F46 0%, #065F46 26%, #059669 46%, #34D399 52%, #059669 58%, #065F46 78%, #065F46 100%)',
  whatsapp: 'linear-gradient(90deg, #14532D 0%, #14532D 26%, #166534 46%, #25D366 52%, #166534 58%, #14532D 78%, #14532D 100%)',
  'whatsapp-badge': 'linear-gradient(90deg, #14532D 0%, #14532D 26%, #16A34A 46%, #22C55E 52%, #16A34A 58%, #14532D 78%, #14532D 100%)',
  blue: 'linear-gradient(90deg, #0F172A 0%, #0F172A 26%, #0284C7 46%, #38BDF8 52%, #0284C7 58%, #0F172A 78%, #0F172A 100%)',
  silver: 'linear-gradient(90deg, #0F172A 0%, #0F172A 26%, #475569 46%, #94A3B8 52%, #475569 58%, #0F172A 78%, #0F172A 100%)',
  light: 'linear-gradient(90deg, #FFFFFF 0%, #FFFFFF 26%, #FEF08A 46%, #FBBF24 52%, #FEF08A 58%, #FFFFFF 78%, #FFFFFF 100%)',
};

const NATIVE_SHIMMER_COLORS: Record<ShimmerVariant, { base: string; peak: string; mid: string }> = {
  gold: { base: '#0F172A', mid: '#B45309', peak: '#F59E0B' },
  'gold-badge': { base: '#78350F', mid: '#D97706', peak: '#FBBF24' },
  green: { base: '#064E3B', mid: '#047857', peak: '#10B981' },
  'green-badge': { base: '#065F46', mid: '#059669', peak: '#34D399' },
  whatsapp: { base: '#14532D', mid: '#166534', peak: '#25D366' },
  'whatsapp-badge': { base: '#14532D', mid: '#16A34A', peak: '#22C55E' },
  blue: { base: '#0F172A', mid: '#0284C7', peak: '#38BDF8' },
  silver: { base: '#0F172A', mid: '#475569', peak: '#94A3B8' },
  light: { base: '#FFFFFF', mid: '#FEF08A', peak: '#FBBF24' },
};

/**
 * ShimmerText adds a continuous luxury light wave across text glyphs themselves.
 * NEVER creates a rectangular box background overlay.
 * Uses -webkit-background-clip: text on Web, and Animated.Text color interpolation on Mobile.
 * Configured with slow, elegant, harmonious transitions.
 */
export default function ShimmerText({
  children,
  style,
  shimmerColor,
  baseColor,
  duration = 6600,
  numberOfLines,
  variant = 'gold',
}: ShimmerTextProps) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS === 'web') return; // Zero JS overhead on Web - CSS GPU keyframes handle rendering
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: duration / 2,
          useNativeDriver: false,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: duration / 2,
          useNativeDriver: false,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim, duration]);

  const palette = NATIVE_SHIMMER_COLORS[variant] || NATIVE_SHIMMER_COLORS.gold;
  const resolvedBase = baseColor || palette.base;
  const resolvedPeak = shimmerColor || palette.peak;

  // Animated color across the text letters for mobile with smooth slow transition
  const interpolatedColor = anim.interpolate({
    inputRange: [0, 0.42, 0.58, 1],
    outputRange: [resolvedBase, palette.mid, resolvedPeak, resolvedBase],
  });

  const interpolatedOpacity = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.95, 1, 0.95],
  });

  if (Platform.OS === 'web') {
    const webClassName = `renewx-text-shimmer-${variant}`;
    const gradient = WEB_GRADIENTS[variant] || WEB_GRADIENTS.gold;

    return (
      <Text
        numberOfLines={numberOfLines}
        style={[
          styles.baseText,
          style,
          {
            backgroundImage: gradient,
            backgroundSize: '240% 100%',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            animation: `renewxTextSheenSweep ${duration}ms ease-in-out infinite`,
            display: 'inline-block',
          } as any,
        ]}
        {...({ className: webClassName } as any)}
      >
        {children}
      </Text>
    );
  }

  // Native iOS / Android: Direct text glyph color interpolation
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
