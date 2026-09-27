import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  AppStateStatus,
  Image,
  Linking,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { api } from '@/services/api';
import { useSafeHeaderTop } from '@/lib/useSafeHeaderTop';

interface OfflineScreenProps {
  onRetrySuccess?: () => void;
}

const COLORS = {
  white: '#FFFFFF',
  black: '#111111',
  yellow: '#FFC400',
  yellowLight: '#FFF8D6',
  yellowSoft: '#FFF3B8',

  gray50: '#FAFAFA',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',

  red: '#DC2626',
  redLight: '#FEF2F2',
  redBorder: '#FECACA',
};

export default function OfflineScreen({
  onRetrySuccess,
}: OfflineScreenProps) {
  const safeTop = useSafeHeaderTop();

  const [checking, setChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState('');
  const [retryFailed, setRetryFailed] = useState(false);

  /**
   * Check whether the RenewX backend is reachable.
   */
  const checkConnection = useCallback(async () => {
    if (checking) {
      return false;
    }

    setChecking(true);
    setRetryFailed(false);

    try {
      const result = await api.health();

      const now = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      setLastChecked(now);

      if (result?.status === 'healthy') {
        onRetrySuccess?.();
        return true;
      }

      setRetryFailed(true);
      return false;
    } catch {
      setRetryFailed(true);
      return false;
    } finally {
      setChecking(false);
    }
  }, [checking, onRetrySuccess]);

  /**
   * Automatically retry:
   * - every 15 seconds
   * - when the app becomes active
   */
  useEffect(() => {
    setLastChecked(
      new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    );

    const interval = setInterval(() => {
      checkConnection();
    }, 15000);

    const subscription = AppState.addEventListener(
      'change',
      (state: AppStateStatus) => {
        if (state === 'active') {
          checkConnection();
        }
      },
    );

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [checkConnection]);

  /**
   * Open device network settings.
   * On web, reload the application.
   */
  const handleOpenSettings = () => {
    if (Platform.OS !== 'web') {
      Linking.openSettings().catch(() => {});
      return;
    }

    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: safeTop,
        },
      ]}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.white}
      />

      {/* =====================================================
          HEADER
      ====================================================== */}

      <View style={styles.header}>
        <Image
          source={require('@/assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        <View style={styles.offlineBadge}>
          <View style={styles.offlineDot} />

          <Text style={styles.offlineBadgeText}>
            OFFLINE
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ===================================================
            OFFLINE ILLUSTRATION
        ==================================================== */}

        <View style={styles.illustrationContainer}>
          {/* Soft yellow background */}
          <View style={styles.illustrationBackground} />

          {/* Decorative yellow circles */}
          <View style={styles.smallCircleOne} />
          <View style={styles.smallCircleTwo} />

          {/* Phone */}
          <View style={styles.phone}>
            <View style={styles.phoneSpeaker} />

            <View style={styles.phoneScreen}>
              <Ionicons
                name="wifi-outline"
                size={42}
                color={COLORS.black}
              />

              {/* Wi-Fi slash */}
              <View style={styles.wifiSlash} />
            </View>

            <View style={styles.phoneButton} />
          </View>

          {/* Offline badge */}
          <View style={styles.offlineIconBadge}>
            <Ionicons
              name="cloud-offline-outline"
              size={25}
              color={COLORS.black}
            />
          </View>
        </View>

        {/* ===================================================
            TITLE
        ==================================================== */}

        <Text style={styles.title}>
          You&apos;re Offline
        </Text>

        <Text style={styles.subtitle}>
          It looks like your internet connection
          is unavailable right now.
        </Text>

        <Text style={styles.description}>
          Check your connection and try again to
          continue using RenewX.
        </Text>

        {/* ===================================================
            RETRY ERROR
        ==================================================== */}

        {retryFailed && (
          <View style={styles.errorCard}>
            <View style={styles.errorIconContainer}>
              <Ionicons
                name="alert-circle-outline"
                size={19}
                color={COLORS.black}
              />
            </View>

            <View style={styles.errorContent}>
              <Text style={styles.errorTitle}>
                Still offline
              </Text>

              <Text style={styles.errorText}>
                We couldn&apos;t reach the RenewX server.
                Please check your internet connection.
              </Text>
            </View>
          </View>
        )}

        {/* ===================================================
            RETRY BUTTON
        ==================================================== */}

        <TouchableOpacity
          style={[
            styles.retryButton,
            checking && styles.retryButtonDisabled,
          ]}
          onPress={checkConnection}
          disabled={checking}
          activeOpacity={0.85}
        >
          {checking ? (
            <ActivityIndicator
              size="small"
              color={COLORS.black}
            />
          ) : (
            <Ionicons
              name="refresh-outline"
              size={20}
              color={COLORS.black}
            />
          )}

          <Text style={styles.retryButtonText}>
            {checking ? 'Checking...' : 'Try Again'}
          </Text>
        </TouchableOpacity>

        {/* ===================================================
            NETWORK SETTINGS
        ==================================================== */}

        <TouchableOpacity
          style={styles.settingsButton}
          onPress={handleOpenSettings}
          activeOpacity={0.7}
        >
          <Ionicons
            name={
              Platform.OS === 'web'
                ? 'reload-outline'
                : 'settings-outline'
            }
            size={17}
            color={COLORS.gray600}
          />

          <Text style={styles.settingsButtonText}>
            {Platform.OS === 'web'
              ? 'Reload App'
              : 'Open Network Settings'}
          </Text>
        </TouchableOpacity>

        {/* ===================================================
            LAST CHECKED
        ==================================================== */}

        {lastChecked ? (
          <Text style={styles.lastChecked}>
            Last checked at {lastChecked}
          </Text>
        ) : null}

        {/* ===================================================
            BRAND FOOTER
        ==================================================== */}

        <View style={styles.footer}>
          <View style={styles.footerAccent} />

          <Image
            source={require('@/assets/logo.png')}
            style={styles.footerLogo}
            resizeMode="contain"
          />

          <Text style={styles.footerTagline}>
            BUY  •  SELL  •  EXCHANGE
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

/* ============================================================
   STYLES
============================================================ */

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,

    ...(Platform.OS === 'web'
      ? {
          position: 'fixed' as any,
        }
      : {}),

    backgroundColor: COLORS.white,

    zIndex: 99999,
  },

  /* ==========================================================
     HEADER
  ========================================================== */

  header: {
    height: 68,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',

    paddingHorizontal: 20,

    backgroundColor: COLORS.white,

    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },

  logo: {
    width: 105,
    height: 48,
  },

  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',

    paddingHorizontal: 11,
    paddingVertical: 6,

    borderRadius: 20,

    backgroundColor: COLORS.yellowLight,

    borderWidth: 1,
    borderColor: COLORS.yellow,
  },

  offlineDot: {
    width: 7,
    height: 7,

    borderRadius: 4,

    backgroundColor: COLORS.black,

    marginRight: 6,
  },

  offlineBadgeText: {
    fontSize: 10,

    fontWeight: '900',

    color: COLORS.black,

    letterSpacing: 0.8,
  },

  /* ==========================================================
     CONTENT
  ========================================================== */

  scrollContent: {
    flexGrow: 1,

    alignItems: 'center',

    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 35,
  },

  /* ==========================================================
     ILLUSTRATION
  ========================================================== */

  illustrationContainer: {
    width: 230,
    height: 190,

    alignItems: 'center',
    justifyContent: 'center',

    position: 'relative',

    marginBottom: 20,
  },

  illustrationBackground: {
    position: 'absolute',

    width: 165,
    height: 165,

    borderRadius: 83,

    backgroundColor: COLORS.yellowLight,
  },

  smallCircleOne: {
    position: 'absolute',

    width: 12,
    height: 12,

    borderRadius: 6,

    backgroundColor: COLORS.yellow,

    left: 38,
    top: 45,
  },

  smallCircleTwo: {
    position: 'absolute',

    width: 8,
    height: 8,

    borderRadius: 4,

    backgroundColor: COLORS.black,

    right: 38,
    top: 75,
  },

  phone: {
    width: 86,
    height: 132,

    borderRadius: 17,

    backgroundColor: COLORS.black,

    alignItems: 'center',

    paddingTop: 9,

    transform: [
      {
        rotate: '-6deg',
      },
    ],

    shadowColor: COLORS.black,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.18,
    shadowRadius: 12,

    elevation: 8,

    zIndex: 3,
  },

  phoneSpeaker: {
    width: 28,
    height: 4,

    borderRadius: 3,

    backgroundColor: COLORS.gray400,

    marginBottom: 7,
  },

  phoneScreen: {
    width: 68,
    height: 94,

    backgroundColor: COLORS.white,

    alignItems: 'center',
    justifyContent: 'center',

    position: 'relative',
  },

  wifiSlash: {
    position: 'absolute',

    width: 58,
    height: 5,

    borderRadius: 5,

    backgroundColor: COLORS.yellow,

    transform: [
      {
        rotate: '-45deg',
      },
    ],
  },

  phoneButton: {
    width: 12,
    height: 12,

    borderRadius: 6,

    backgroundColor: COLORS.white,

    marginTop: 5,
  },

  offlineIconBadge: {
    position: 'absolute',

    right: 30,
    bottom: 18,

    width: 54,
    height: 54,

    borderRadius: 27,

    backgroundColor: COLORS.yellow,

    alignItems: 'center',
    justifyContent: 'center',

    borderWidth: 4,
    borderColor: COLORS.white,

    zIndex: 5,

    shadowColor: COLORS.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.14,
    shadowRadius: 8,

    elevation: 5,
  },

  /* ==========================================================
     TEXT
  ========================================================== */

  title: {
    fontSize: 28,

    lineHeight: 34,

    fontWeight: '900',

    color: COLORS.black,

    textAlign: 'center',

    letterSpacing: -0.8,

    marginBottom: 9,
  },

  subtitle: {
    maxWidth: 330,

    fontSize: 15,

    lineHeight: 22,

    fontWeight: '600',

    color: COLORS.gray600,

    textAlign: 'center',

    marginBottom: 5,
  },

  description: {
    maxWidth: 330,

    fontSize: 13,

    lineHeight: 19,

    color: COLORS.gray500,

    textAlign: 'center',

    marginBottom: 22,
  },

  /* ==========================================================
     ERROR
  ========================================================== */

  errorCard: {
    width: '100%',
    maxWidth: 360,

    flexDirection: 'row',

    padding: 13,

    marginBottom: 14,

    borderRadius: 14,

    backgroundColor: COLORS.redLight,

    borderWidth: 1,
    borderColor: COLORS.redBorder,
  },

  errorIconContainer: {
    width: 34,
    height: 34,

    borderRadius: 17,

    backgroundColor: COLORS.white,

    alignItems: 'center',
    justifyContent: 'center',

    marginRight: 10,
  },

  errorContent: {
    flex: 1,
  },

  errorTitle: {
    fontSize: 13,

    fontWeight: '800',

    color: COLORS.black,

    marginBottom: 2,
  },

  errorText: {
    fontSize: 11,

    lineHeight: 16,

    color: COLORS.gray500,
  },

  /* ==========================================================
     RETRY BUTTON
  ========================================================== */

  retryButton: {
    width: '100%',
    maxWidth: 360,

    height: 54,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: COLORS.yellow,

    borderRadius: 15,

    shadowColor: COLORS.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 8,

    elevation: 4,
  },

  retryButtonDisabled: {
    opacity: 0.65,
  },

  retryButtonText: {
    marginLeft: 8,

    fontSize: 15,

    fontWeight: '900',

    color: COLORS.black,
  },

  /* ==========================================================
     SETTINGS BUTTON
  ========================================================== */

  settingsButton: {
    width: '100%',
    maxWidth: 360,

    height: 48,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    marginTop: 10,

    borderRadius: 14,

    backgroundColor: COLORS.gray50,

    borderWidth: 1,
    borderColor: COLORS.gray200,
  },

  settingsButtonText: {
    marginLeft: 7,

    fontSize: 13,

    fontWeight: '700',

    color: COLORS.gray600,
  },

  /* ==========================================================
     LAST CHECKED
  ========================================================== */

  lastChecked: {
    marginTop: 12,

    fontSize: 10,

    color: COLORS.gray400,

    fontWeight: '500',
  },

  /* ==========================================================
     FOOTER
  ========================================================== */

  footer: {
    alignItems: 'center',

    marginTop: 28,
  },

  footerAccent: {
    width: 42,
    height: 3,

    borderRadius: 3,

    backgroundColor: COLORS.yellow,

    marginBottom: 12,
  },

  footerLogo: {
    width: 100,
    height: 42,
  },

  footerTagline: {
    marginTop: 4,

    fontSize: 8,

    letterSpacing: 1.8,

    fontWeight: '800',

    color: COLORS.gray400,
  },
});