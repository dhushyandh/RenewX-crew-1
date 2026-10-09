import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  AppStateStatus,
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
import BrandSocialFooter from '@/components/BrandSocialFooter';
import RenewXLogo from '@/components/RenewXLogo';

interface OfflineScreenProps {
  onRetrySuccess?: () => void;
}

export default function OfflineScreen({ onRetrySuccess }: OfflineScreenProps) {
  const safeTop = useSafeHeaderTop();
  const [checking, setChecking] = useState(false);

  /**
   * Check whether the server/internet is reachable.
   */
  const checkConnection = useCallback(async () => {
    if (checking) return false;

    setChecking(true);
    try {
      // In web, check navigator.onLine first
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && !navigator.onLine) {
        setChecking(false);
        return false;
      }

      const result = await api.health();
      if (result?.status === 'healthy') {
        onRetrySuccess?.();
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      setChecking(false);
    }
  }, [checking, onRetrySuccess]);

  /**
   * When user taps "Reload":
   * 1. Test health check.
   * 2. If on web, perform window.location.reload() to refresh the screen if needed.
   */
  const handleReload = async () => {
    const isOnline = await checkConnection();
    if (isOnline) {
      onRetrySuccess?.();
      return;
    }

    // If still offline on web, reload the page to refresh network stack
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  /**
   * Auto retry periodically and when app becomes active
   */
  useEffect(() => {
    const interval = setInterval(() => {
      checkConnection();
    }, 15000);

    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        checkConnection();
      }
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [checkConnection]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ============================================================== */}
      {/* TOP HEADER: RENEWX BRAND HEADER WITH OFFLINE STATUS CHIP       */}
      {/* ============================================================== */}
      <View style={[styles.headerContainer, { paddingTop: safeTop + 8 }]}>
        <View style={styles.headerRow}>
          <RenewXLogo size="md" showTagline />
          <View style={styles.offlineStatusChip}>
            <View style={styles.offlinePulseDot} />
            <Text style={styles.offlineStatusText}>Offline</Text>
          </View>
        </View>
      </View>

      {/* ============================================================== */}
      {/* MAIN BODY: ARCH NO-INTERNET ILLUSTRATION & RELOAD BUTTON       */}
      {/* ============================================================== */}
      <ScrollView
        style={styles.bodyScroll}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Arch Illustration Frame */}
        <View style={styles.archContainer}>
          {/* Subtle soft clouds */}
          <View style={styles.cloudOne} />
          <View style={styles.cloudTwo} />
          <View style={styles.cloudThree} />
          <View style={styles.cloudFour} />

          {/* Suspension Wires */}
          <View style={styles.leftWire} />
          <View style={styles.rightWire} />

          {/* Cute Perched Bird */}
          <View style={styles.birdWrapper}>
            <View style={styles.birdBody} />
            <View style={styles.birdHead} />
            <View style={styles.birdBeak} />
            <View style={styles.birdTail} />
          </View>

          {/* Hanging Signboard Tile */}
          <View style={styles.signboardTile}>
            {/* Wi-Fi with Slash */}
            <View style={styles.wifiWrapper}>
              <Ionicons name="wifi" size={28} color="#475569" />
              <View style={styles.wifiSlashBar} />
              <View style={styles.wifiDot} />
            </View>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>No internet connection</Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          Please check your internet connection or reload the{'\n'}screen
        </Text>

        {/* Reload Button */}
        <TouchableOpacity
          style={styles.reloadBtn}
          onPress={handleReload}
          disabled={checking}
          activeOpacity={0.85}
        >
          {checking ? (
            <View style={styles.reloadingRow}>
              <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.reloadBtnText}>Reloading...</Text>
            </View>
          ) : (
            <Text style={styles.reloadBtnText}>Reload</Text>
          )}
        </TouchableOpacity>

        {/* Social media icons, Powered by Dhushyandh with shimmer, and v 1.0.0 */}
        <BrandSocialFooter
          version="v 1.0.0"
          style={{ marginTop: 28, marginBottom: 20 }}
        />
      </ScrollView>
    </View>
  );
}

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
    backgroundColor: '#FFFFFF',
    zIndex: 99999,
  },

  /* Header Container */
  headerContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  offlineStatusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 6,
  },
  offlinePulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#EF4444',
  },
  offlineStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B91C1C',
    letterSpacing: 0.3,
  },

  /* Body Content */
  bodyScroll: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  bodyContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
  },

  /* Arch Illustration */
  archContainer: {
    width: 146,
    height: 162,
    borderTopLeftRadius: 73,
    borderTopRightRadius: 73,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    backgroundColor: '#EFF2F5',
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
  },

  /* Clouds */
  cloudOne: {
    position: 'absolute',
    top: 36,
    left: -8,
    width: 44,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#DFE3E8',
  },
  cloudTwo: {
    position: 'absolute',
    top: 46,
    right: -6,
    width: 44,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#DFE3E8',
  },
  cloudThree: {
    position: 'absolute',
    bottom: 20,
    right: -12,
    width: 56,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#DFE3E8',
  },
  cloudFour: {
    position: 'absolute',
    bottom: -6,
    left: 16,
    width: 62,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DFE3E8',
  },

  /* Suspension Wires */
  leftWire: {
    position: 'absolute',
    top: 0,
    left: 51,
    width: 1.5,
    height: 52,
    backgroundColor: '#CBD5E1',
  },
  rightWire: {
    position: 'absolute',
    top: 0,
    right: 51,
    width: 1.5,
    height: 52,
    backgroundColor: '#CBD5E1',
  },

  /* Perched Bird */
  birdWrapper: {
    position: 'absolute',
    top: 42,
    left: 52,
    width: 18,
    height: 12,
    zIndex: 10,
  },
  birdBody: {
    position: 'absolute',
    left: 2,
    top: 3,
    width: 11,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#94A3B8',
  },
  birdHead: {
    position: 'absolute',
    right: 2,
    top: 0,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#94A3B8',
  },
  birdBeak: {
    position: 'absolute',
    right: 0,
    top: 2,
    width: 3,
    height: 2,
    backgroundColor: '#94A3B8',
    borderTopRightRadius: 1,
  },
  birdTail: {
    position: 'absolute',
    left: 0,
    top: 5,
    width: 4,
    height: 2,
    backgroundColor: '#94A3B8',
  },

  /* Hanging Signboard Tile */
  signboardTile: {
    position: 'absolute',
    top: 52,
    width: 66,
    height: 58,
    backgroundColor: '#D6DCE2',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 5, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 5,
    elevation: 5,
  },
  wifiWrapper: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  wifiSlashBar: {
    position: 'absolute',
    width: 2.5,
    height: 36,
    backgroundColor: '#475569',
    transform: [{ rotate: '45deg' }],
  },
  wifiDot: {
    position: 'absolute',
    bottom: 0,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#475569',
  },

  /* Typography */
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 26,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 300,
    marginBottom: 26,
  },

  /* Reload Button */
  reloadBtn: {
    backgroundColor: '#0F172A',
    paddingVertical: 13,
    paddingHorizontal: 36,
    borderRadius: 12,
    minWidth: 140,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  reloadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reloadBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});