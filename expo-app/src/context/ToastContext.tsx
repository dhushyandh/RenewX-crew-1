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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export type ToastType = 'success' | 'detecting' | 'warning' | 'error' | 'info' | 'manual';

export interface ToastOptions {
  message: string;
  title?: string;
  type?: ToastType;
  duration?: number;
  position?: 'bottom' | 'top';
  action?: {
    label: string;
    onPress: () => void;
  };
}

export interface ToastContextValue {
  show: (options: ToastOptions | string) => void;
  success: (message: string, title?: string, options?: Partial<ToastOptions>) => void;
  error: (message: string, title?: string, options?: Partial<ToastOptions>) => void;
  warning: (message: string, title?: string, options?: Partial<ToastOptions>) => void;
  info: (message: string, title?: string, options?: Partial<ToastOptions>) => void;
  detecting: (message?: string, title?: string, options?: Partial<ToastOptions>) => void;
  permission: (message?: string, title?: string, options?: Partial<ToastOptions>) => void;
  manual: (message: string, title?: string, options?: Partial<ToastOptions>) => void;
  hide: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TOAST_THEMES: Record<
  ToastType,
  {
    accentColor: string;
    circleBg: string;
    defaultTitle: string;
    renderIcon: () => React.ReactNode;
  }
> = {
  success: {
    accentColor: '#10B981',
    circleBg: '#ECFDF5',
    defaultTitle: 'Success',
    renderIcon: () => <Ionicons name="checkmark" size={24} color="#10B981" />,
  },
  detecting: {
    accentColor: '#EAB308',
    circleBg: '#FEF9C3',
    defaultTitle: 'Detecting Location...',
    renderIcon: () => (
      <View style={styles.detectingSpinnerContainer}>
        <ActivityIndicator size="small" color="#EAB308" />
      </View>
    ),
  },
  warning: {
    accentColor: '#F59E0B',
    circleBg: '#FFF7ED',
    defaultTitle: 'Warning',
    renderIcon: () => <Ionicons name="warning-outline" size={22} color="#F59E0B" />,
  },
  error: {
    accentColor: '#EF4444',
    circleBg: '#FEF2F2',
    defaultTitle: 'Error',
    renderIcon: () => <Ionicons name="close" size={22} color="#EF4444" />,
  },
  manual: {
    accentColor: '#10B981',
    circleBg: '#ECFDF5',
    defaultTitle: 'Location Saved',
    renderIcon: () => (
      <View style={styles.solidSuccessCircle}>
        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
      </View>
    ),
  },
  info: {
    accentColor: '#3B82F6',
    circleBg: '#EFF6FF',
    defaultTitle: 'Notice',
    renderIcon: () => (
      <View style={styles.solidInfoCircle}>
        <Ionicons name="information" size={16} color="#FFFFFF" />
      </View>
    ),
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

  // Default toast position is bottom (above tab bar as in design mockup)
  const position = currentToast?.position || 'bottom';
  const initialTranslate = position === 'bottom' ? 80 : -80;

  // Animation values
  const translateY = useRef(new Animated.Value(initialTranslate)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.94)).current;

  const timerRef = useRef<any>(null);

  const hide = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const exitTranslate = position === 'bottom' ? 80 : -80;

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: exitTranslate,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.92,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentToast(null);
    });
  }, [opacity, position, scale, translateY]);

  const show = useCallback(
    (opts: ToastOptions | string) => {
      const normalized: ToastOptions =
        typeof opts === 'string'
          ? { message: opts, type: 'info', position: 'bottom' }
          : { position: 'bottom', ...opts };

      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      const toastPosition = normalized.position || 'bottom';
      translateY.setValue(toastPosition === 'bottom' ? 80 : -80);
      opacity.setValue(0);
      scale.setValue(0.94);

      setCurrentToast(normalized);

      // Spring into view
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

      const duration = normalized.duration || 3800;

      timerRef.current = setTimeout(() => {
        hide();
      }, duration);
    },
    [hide, opacity, scale, translateY]
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

  const detecting = useCallback(
    (
      message: string = 'Please wait, this may take a few seconds.',
      title: string = 'Detecting your location...',
      options?: Partial<ToastOptions>
    ) => {
      show({ message, title, type: 'detecting', duration: 3000, ...options });
    },
    [show]
  );

  const permission = useCallback(
    (
      message: string = 'Allow location access to detect your district and pincode.',
      title: string = 'Location permission required',
      options?: Partial<ToastOptions>
    ) => {
      show({ message, title, type: 'warning', ...options });
    },
    [show]
  );

  const manual = useCallback(
    (message: string, title: string = 'Location saved', options?: Partial<ToastOptions>) => {
      show({ message, title, type: 'manual', ...options });
    },
    [show]
  );

  // Swipe gesture to dismiss
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 6,
      onPanResponderMove: (_, gestureState) => {
        if (position === 'bottom' && gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        } else if (position === 'top' && gestureState.dy < 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (position === 'bottom') {
          if (gestureState.dy > 25 || gestureState.vy > 0.4) {
            hide();
          } else {
            Animated.spring(translateY, {
              toValue: 0,
              friction: 7,
              useNativeDriver: true,
            }).start();
          }
        } else {
          if (gestureState.dy < -25 || gestureState.vy < -0.4) {
            hide();
          } else {
            Animated.spring(translateY, {
              toValue: 0,
              friction: 7,
              useNativeDriver: true,
            }).start();
          }
        }
      },
    })
  ).current;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

function resolveToastText(
  rawTitle?: string,
  rawMessage?: string,
  type: ToastType = 'info',
  themeDefaultTitle: string = 'Notice'
): { title: string; subtitle: string } {
  const title = (rawTitle || '').trim();
  const message = (rawMessage || '').trim();

  // 1. Explicit title was provided by caller
  if (title) {
    const subtitle = message.toLowerCase() === title.toLowerCase() ? '' : message;
    return { title, subtitle };
  }

  // 2. Message has newline separator (e.g. "Title\nSubtitle")
  if (message.includes('\n')) {
    const [first, ...rest] = message.split('\n');
    return { title: first.trim(), subtitle: rest.join('\n').trim() };
  }

  const lower = message.toLowerCase();

  // 3. Cart actions
  if (lower.includes('cart')) {
    if (lower.includes('removed')) return { title: 'Removed from Cart', subtitle: message };
    return { title: 'Added to Cart', subtitle: message };
  }

  // 4. Wishlist actions
  if (lower.includes('wishlist')) {
    if (lower.includes('removed')) return { title: 'Removed from Wishlist', subtitle: message };
    return { title: 'Saved to Wishlist', subtitle: message };
  }

  // 5. Auth / Sign In / Sign Out / Password
  if (lower.includes('sign out') || lower.includes('signed out') || lower.includes('logged out')) {
    return { title: 'Signed Out', subtitle: message };
  }
  if (lower.includes('signed in') || lower.includes('logged in') || lower.includes('welcome')) {
    return { title: 'Welcome', subtitle: message };
  }
  if (lower.includes('password')) {
    return { title: 'Password', subtitle: message };
  }
  if (lower.includes('profile')) {
    return { title: 'Profile Updated', subtitle: message };
  }

  // 6. Orders / Invoices
  if (lower.includes('order')) {
    if (lower.includes('placed') || lower.includes('confirmed')) return { title: 'Order Confirmed', subtitle: message };
    if (lower.includes('cancelled')) return { title: 'Order Cancelled', subtitle: message };
    return { title: 'Order Update', subtitle: message };
  }
  if (lower.includes('invoice')) {
    return { title: 'Tax Invoice', subtitle: message };
  }

  // 7. Clipboard
  if (lower.includes('copied') || lower.includes('clipboard')) {
    return { title: 'Copied to Clipboard', subtitle: message };
  }

  // 8. Location actions (ONLY if message explicitly mentions location/pincode/gps/address)
  if (lower.includes('location') || lower.includes('pincode') || lower.includes('address') || lower.includes('gps')) {
    if (lower.includes('saved')) return { title: 'Location Saved', subtitle: message };
    if (lower.includes('permission')) return { title: 'Location Permission', subtitle: message };
    if (lower.includes('detecting')) return { title: 'Detecting Location...', subtitle: message };
    return { title: 'Location', subtitle: message };
  }

  // 9. General fallback from theme
  return { title: themeDefaultTitle, subtitle: message };
}

  const toastType = currentToast?.type || 'info';
  const theme = TOAST_THEMES[toastType] || TOAST_THEMES.info;

  // Intelligent title and subtitle resolution
  const { title: displayTitle, subtitle: displaySubtitle } = resolveToastText(
    currentToast?.title,
    currentToast?.message,
    toastType,
    theme.defaultTitle
  );

  // Position offsets
  const bottomOffset = Math.max(insets.bottom || 12, 12) + 76;
  const topOffset = insets.top > 0 ? insets.top + 10 : Platform.OS === 'ios' ? 50 : 24;

  return (
    <ToastContext.Provider
      value={{
        show,
        success,
        error,
        warning,
        info,
        detecting,
        permission,
        manual,
        hide,
      }}
    >
      {children}

      {currentToast && (
        <Animated.View
          {...panResponder.panHandlers}
          pointerEvents="box-none"
          style={[
            styles.toastWrapper,
            position === 'bottom' ? { bottom: bottomOffset } : { top: topOffset },
            {
              opacity,
              transform: [{ translateY }, { scale }],
            },
          ]}
        >
          <View style={styles.toastCard}>
            {/* Left curved colored accent bar matching user screenshot */}
            <View style={[styles.leftAccentBar, { backgroundColor: theme.accentColor }]} />

            {/* Icon Circle */}
            <View style={[styles.iconCircle, { backgroundColor: theme.circleBg }]}>
              {theme.renderIcon()}
            </View>

            {/* Message Body */}
            <View style={styles.textContainer}>
              <Text style={styles.titleText} numberOfLines={1}>
                {displayTitle}
              </Text>
              {displaySubtitle ? (
                <Text style={styles.subtitleText} numberOfLines={2}>
                  {displaySubtitle}
                </Text>
              ) : null}
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

            {/* Right Close "✕" Button */}
            <TouchableOpacity
              onPress={hide}
              style={styles.closeBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={17} color="#94A3B8" />
            </TouchableOpacity>
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
    zIndex: 999999,
    alignItems: 'center',
    alignSelf: 'center',
  },
  toastCard: {
    width: '100%',
    maxWidth: Math.min(SCREEN_WIDTH - 24, 460),
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    paddingVertical: 14,
    paddingHorizontal: 16,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 22,
    elevation: 10,
  },
  leftAccentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
    borderTopLeftRadius: 22,
    borderBottomLeftRadius: 22,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
    marginRight: 12,
    flexShrink: 0,
  },
  solidSuccessCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  solidInfoCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detectingSpinnerContainer: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 6,
  },
  titleText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: Platform.select({ web: "'Outfit', sans-serif", default: 'Outfit_700Bold' }),
    letterSpacing: -0.2,
  },
  subtitleText: {
    fontSize: 12.5,
    color: '#64748B',
    lineHeight: 17,
    marginTop: 2,
    fontFamily: Platform.select({ web: "'Outfit', sans-serif", default: 'Outfit_400Regular' }),
  },
  closeBtn: {
    padding: 6,
    marginLeft: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    marginLeft: 8,
    marginRight: 4,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Platform.select({ web: "'Outfit', sans-serif", default: 'Outfit_700Bold' }),
  },
});
