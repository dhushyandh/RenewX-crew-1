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
    circleColor: string;
    iconColor: string;
    defaultTitle: string;
  }
> = {
  success: {
    icon: 'checkmark-sharp',
    circleColor: '#10b981',
    iconColor: '#ffffff',
    defaultTitle: 'Success',
  },
  error: {
    icon: 'close-sharp',
    circleColor: '#ff4d4f',
    iconColor: '#ffffff',
    defaultTitle: 'Error',
  },
  warning: {
    icon: 'alert-sharp',
    circleColor: '#f59e0b',
    iconColor: '#ffffff',
    defaultTitle: 'Warning',
  },
  info: {
    icon: 'information-sharp',
    circleColor: '#3b82f6',
    iconColor: '#ffffff',
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
  const title = currentToast?.title;
  const topOffset = insets.top > 0 ? insets.top + 10 : (Platform.OS === 'ios' ? 50 : 24);

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
          <TouchableOpacity
            activeOpacity={0.94}
            onPress={hide}
            style={styles.toastCard}
          >
            {/* Left Circular Badge matching Screenshot */}
            <View style={[styles.iconCircle, { backgroundColor: theme.circleColor }]}>
              <Ionicons name={theme.icon} size={15} color={theme.iconColor} />
            </View>

            {/* Message Body */}
            <View style={styles.textContainer}>
              {title &&
              title.toLowerCase() !== currentToast.type &&
              title.toLowerCase() !== theme.defaultTitle.toLowerCase() &&
              title !== currentToast.message ? (
                <Text style={styles.titleText} numberOfLines={1}>
                  {title}
                </Text>
              ) : null}
              <Text style={styles.messageText} numberOfLines={2}>
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
                style={[styles.actionBtn, { borderColor: theme.circleColor }]}
                activeOpacity={0.8}
              >
                <Text style={[styles.actionBtnText, { color: theme.circleColor }]}>
                  {currentToast.action.label}
                </Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
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
    zIndex: 999999,
    alignItems: 'center',
    alignSelf: 'center',
    pointerEvents: 'box-none',
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    maxWidth: Math.min(SCREEN_WIDTH - 32, 540),
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  textContainer: {
    flexShrink: 1,
    justifyContent: 'center',
    marginRight: 2,
  },
  titleText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
    fontFamily: Platform.select({ web: "'Outfit', sans-serif", default: 'Outfit_700Bold' }),
    marginBottom: 2,
  },
  messageText: {
    fontSize: 15,
    color: '#1f2937',
    fontWeight: '600',
    fontFamily: Platform.select({ web: "'Outfit', sans-serif", default: 'Outfit_500Medium' }),
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    marginLeft: 8,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Platform.select({ web: "'Outfit', sans-serif", default: 'Outfit_700Bold' }),
  },
});
