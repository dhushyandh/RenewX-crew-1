import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  PanResponder,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  message: string;
  title?: string;
  type?: ToastType;
  duration?: number;
  action?: {
    label: string;
    onPress: () => void;
  };
}

interface ToastContextValue {
  show: (options: ToastOptions | string) => void;
  success: (message: string, title?: string, options?: Partial<ToastOptions>) => void;
  error: (message: string, title?: string, options?: Partial<ToastOptions>) => void;
  warning: (message: string, title?: string, options?: Partial<ToastOptions>) => void;
  info: (message: string, title?: string, options?: Partial<ToastOptions>) => void;
  hide: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TOAST_THEMES: Record<
  ToastType,
  {
    icon: keyof typeof Ionicons.glyphMap;
    accentColor: string;
    bgColor: string;
    borderColor: string;
    glowColor: string;
    iconBg: string;
    defaultTitle: string;
  }
> = {
  success: {
    icon: 'checkmark-circle',
    accentColor: '#10b981',
    bgColor: '#091512',
    borderColor: 'rgba(16, 185, 129, 0.35)',
    glowColor: 'rgba(16, 185, 129, 0.18)',
    iconBg: 'rgba(16, 185, 129, 0.2)',
    defaultTitle: 'Success',
  },
  error: {
    icon: 'alert-circle',
    accentColor: '#ef4444',
    bgColor: '#160b0c',
    borderColor: 'rgba(239, 68, 68, 0.35)',
    glowColor: 'rgba(239, 68, 68, 0.18)',
    iconBg: 'rgba(239, 68, 68, 0.2)',
    defaultTitle: 'Action Failed',
  },
  warning: {
    icon: 'warning',
    accentColor: '#f59e0b',
    bgColor: '#171206',
    borderColor: 'rgba(245, 158, 11, 0.35)',
    glowColor: 'rgba(245, 158, 11, 0.18)',
    iconBg: 'rgba(245, 158, 11, 0.2)',
    defaultTitle: 'Attention Required',
  },
  info: {
    icon: 'information-circle',
    accentColor: '#0ea5e9',
    bgColor: '#08141d',
    borderColor: 'rgba(14, 165, 233, 0.35)',
    glowColor: 'rgba(14, 165, 233, 0.18)',
    iconBg: 'rgba(14, 165, 233, 0.2)',
    defaultTitle: 'Notice',
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const contextInsets = useContext(SafeAreaInsetsContext);
  const insets = contextInsets ?? {
    top: Platform.OS === 'ios' ? 48 : Platform.OS === 'android' ? 28 : 16,
    bottom: Platform.OS === 'ios' ? 34 : 16,
    left: 0,
    right: 0,
  };
  const [currentToast, setCurrentToast] = useState<ToastOptions | null>(null);

  // Animation values
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const hide = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.9,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentToast(null);
      progressAnim.setValue(1);
    });
  }, [opacity, progressAnim, scale, translateY]);

  const show = useCallback(
    (opts: ToastOptions | string) => {
      const normalized: ToastOptions = typeof opts === 'string' ? { message: opts } : opts;

      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      setCurrentToast(normalized);
      progressAnim.setValue(1);

      // Spring in
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 7,
          tension: 60,
          useNativeDriver: true,
        }),
      ]).start();

      const duration = normalized.duration || 3600;

      // Progress bar animation
      Animated.timing(progressAnim, {
        toValue: 0,
        duration,
        useNativeDriver: false,
      }).start();

      timerRef.current = setTimeout(() => {
        hide();
      }, duration);
    },
    [hide, opacity, progressAnim, scale, translateY]
  );

  const success = useCallback(
    (message: string, title?: string, options?: Partial<ToastOptions>) => {
      show({ message, title, type: 'success', ...options });
    },
    [show]
  );

  const error = useCallback(
    (message: string, title?: string, options?: Partial<ToastOptions>) => {
      show({ message, title, type: 'error', ...options });
    },
    [show]
  );

  const warning = useCallback(
    (message: string, title?: string, options?: Partial<ToastOptions>) => {
      show({ message, title, type: 'warning', ...options });
    },
    [show]
  );

  const info = useCallback(
    (message: string, title?: string, options?: Partial<ToastOptions>) => {
      show({ message, title, type: 'info', ...options });
    },
    [show]
  );

  // Swipe up to dismiss gesture
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 6,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy < 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -25 || gestureState.vy < -0.4) {
          hide();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            friction: 7,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const theme = currentToast ? TOAST_THEMES[currentToast.type || 'info'] : TOAST_THEMES.info;
  const title = currentToast?.title || theme.defaultTitle;
  const topOffset = insets.top > 0 ? insets.top + 8 : (Platform.OS === 'ios' ? 44 : 20);

  return (
    <ToastContext.Provider value={{ show, success, error, warning, info, hide }}>
      {children}

      {currentToast && (
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.toastWrapper,
            {
              top: topOffset,
              opacity,
              transform: [{ translateY }, { scale }],
            },
          ]}
        >
          <View
            style={[
              styles.toastCard,
              {
                backgroundColor: theme.bgColor,
                borderColor: theme.borderColor,
                shadowColor: theme.accentColor,
              },
            ]}
          >
            {/* Left Accent Glow Line */}
            <View style={[styles.leftGlowBar, { backgroundColor: theme.accentColor }]} />

            {/* Icon Avatar */}
            <View style={[styles.iconBox, { backgroundColor: theme.iconBg }]}>
              <Ionicons name={theme.icon} size={22} color={theme.accentColor} />
            </View>

            {/* Message Body */}
            <View style={styles.textContainer}>
              {title ? (
                <Text style={[styles.titleText, { color: '#ffffff' }]} numberOfLines={1}>
                  {title}
                </Text>
              ) : null}
              <Text style={styles.messageText} numberOfLines={3}>
                {currentToast.message}
              </Text>
            </View>

            {/* Optional Action Button */}
            {currentToast.action && (
              <TouchableOpacity
                onPress={() => {
                  currentToast.action?.onPress();
                  hide();
                }}
                style={[styles.actionBtn, { borderColor: theme.accentColor }]}
                activeOpacity={0.8}
              >
                <Text style={[styles.actionBtnText, { color: theme.accentColor }]}>
                  {currentToast.action.label}
                </Text>
              </TouchableOpacity>
            )}

            {/* Close Button */}
            <TouchableOpacity onPress={hide} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={16} color="#94a3b8" />
            </TouchableOpacity>

            {/* Animated Bottom Countdown Progress Bar */}
            <View style={styles.progressBarBackground}>
              <Animated.View
                style={[
                  styles.progressBarFill,
                  {
                    backgroundColor: theme.accentColor,
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  toastWrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 99999,
    alignItems: 'center',
    maxWidth: SCREEN_WIDTH - 32,
    alignSelf: 'center',
  },
  toastCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 12,
    paddingHorizontal: 14,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },
  leftGlowBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginLeft: 2,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 6,
  },
  titleText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  messageText: {
    fontSize: 12,
    color: '#cbd5e1',
    fontWeight: '500',
    lineHeight: 16,
  },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 6,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
    borderRadius: 6,
    marginLeft: 2,
  },
  progressBarBackground: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  progressBarFill: {
    height: '100%',
  },
});
