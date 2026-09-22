import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  AppStateStatus,
  Image,
  Linking,
  Platform,
  SafeAreaView,
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

export default function OfflineScreen({ onRetrySuccess }: OfflineScreenProps) {
  const safeTop = useSafeHeaderTop();
  const [checking, setChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<string>('');
  const [retryFailed, setRetryFailed] = useState(false);

  const checkConnection = useCallback(async () => {
    setChecking(true);
    setRetryFailed(false);
    try {
      const result = await api.health();
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastChecked(now);

      if (result?.status === 'healthy') {
        if (onRetrySuccess) {
          onRetrySuccess();
        }
        return true;
      } else {
        setRetryFailed(true);
        return false;
      }
    } catch {
      setRetryFailed(true);
      return false;
    } finally {
      setChecking(false);
    }
  }, [onRetrySuccess]);

  useEffect(() => {
    setLastChecked(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

    // Auto-check periodically every 15 seconds
    const interval = setInterval(checkConnection, 15000);

    // Auto-check when returning to app
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        checkConnection();
      }
    });

    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [checkConnection]);

  const handleOpenSettings = () => {
    if (Platform.OS !== 'web') {
      Linking.openSettings().catch(() => undefined);
    } else if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <View style={[styles.container, { paddingTop: safeTop }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* Header with RenewX branding & status badge */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <Image
            source={require('@/assets/notification-icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.brandText}>
            Renew<Text style={styles.brandAccent}>X</Text>
          </Text>
        </View>

        <View style={styles.offlinePill}>
          <View style={styles.offlineDot} />
          <Text style={styles.offlinePillText}>Offline</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Main Offline Illustration / Icon */}
        <View style={styles.illustrationWrap}>
          <View style={styles.outerRing}>
            <View style={styles.middleRing}>
              <View style={styles.innerCircle}>
                <Ionicons name="cloud-offline-outline" size={48} color="#dc2626" />
              </View>
            </View>
          </View>
        </View>

        {/* Title & Description */}
        <Text style={styles.title}>You're Currently Offline</Text>
        <Text style={styles.subtitle}>
          We couldn't connect to RenewX. Please check your internet connection to continue browsing products, offers, and orders.
        </Text>

        {/* Diagnostic / Troubleshooting Tips Card */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsHeading}>Connection Details & Tips</Text>

          <View style={styles.tipRow}>
            <View style={[styles.tipIconBox, { backgroundColor: '#eff6ff' }]}>
              <Ionicons name="wifi-outline" size={16} color="#2563eb" />
            </View>
            <View style={styles.tipTextBox}>
              <Text style={styles.tipTitle}>Check Wi-Fi or Cellular Data</Text>
              <Text style={styles.tipDesc}>Verify that your internet router or mobile network has an active connection.</Text>
            </View>
          </View>

          <View style={styles.tipRow}>
            <View style={[styles.tipIconBox, { backgroundColor: '#fef3c7' }]}>
              <Ionicons name="airplane-outline" size={16} color="#d97706" />
            </View>
            <View style={styles.tipTextBox}>
              <Text style={styles.tipTitle}>Toggle Airplane Mode</Text>
              <Text style={styles.tipDesc}>Turning airplane mode on for 5 seconds and off can refresh your network link.</Text>
            </View>
          </View>

          <View style={styles.tipRow}>
            <View style={[styles.tipIconBox, { backgroundColor: '#f0fdf4' }]}>
              <Ionicons name="shield-checkmark-outline" size={16} color="#059669" />
            </View>
            <View style={styles.tipTextBox}>
              <Text style={styles.tipTitle}>Saved Data is Safe</Text>
              <Text style={styles.tipDesc}>Your cart items, trade-in requests, and saved session remain preserved locally.</Text>
            </View>
          </View>
        </View>

        {/* Feedback message if manual retry fails */}
        {retryFailed && (
          <View style={styles.failNotice}>
            <Ionicons name="alert-circle" size={16} color="#b91c1c" />
            <Text style={styles.failNoticeText}>
              Still unable to reach server. Please verify your connection and try again.
            </Text>
          </View>
        )}

        {/* Last Checked timestamp */}
        {lastChecked ? (
          <Text style={styles.timestampText}>Last verified at {lastChecked}</Text>
        ) : null}

        {/* Action Buttons */}
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={[styles.primaryBtn, checking && styles.btnDisabled]}
            onPress={checkConnection}
            disabled={checking}
            activeOpacity={0.85}
          >
            {checking ? (
              <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
            ) : (
              <Ionicons name="refresh-outline" size={18} color="#ffffff" style={{ marginRight: 6 }} />
            )}
            <Text style={styles.primaryBtnText}>
              {checking ? 'Checking Connection...' : 'Retry Connection'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={handleOpenSettings}
            activeOpacity={0.7}
          >
            <Ionicons
              name={Platform.OS === 'web' ? 'reload-outline' : 'settings-outline'}
              size={16}
              color="#475569"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.secondaryBtnText}>
              {Platform.OS === 'web' ? 'Reload App' : 'Open Network Settings'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    ...(Platform.OS === 'web' ? { position: 'fixed' as any } : {}),
    backgroundColor: '#f8fafc',
    zIndex: 99999,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logo: {
    width: 30,
    height: 30,
    borderRadius: 7,
  },
  brandText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  brandAccent: {
    color: '#059669',
  },
  offlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  offlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#dc2626',
  },
  offlinePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#dc2626',
    textTransform: 'uppercase',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  illustrationWrap: {
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(254, 226, 226, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  middleRing: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: '#64748b',
    textAlign: 'center',
    maxWidth: 320,
    marginBottom: 22,
  },
  tipsCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  tipsHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  tipIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipTextBox: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  tipDesc: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
    lineHeight: 15,
  },
  failNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    marginBottom: 12,
    maxWidth: 340,
  },
  failNoticeText: {
    fontSize: 11,
    color: '#b91c1c',
    fontWeight: '600',
    flex: 1,
  },
  timestampText: {
    fontSize: 10,
    color: '#94a3b8',
    marginBottom: 16,
    fontWeight: '500',
  },
  buttonGroup: {
    width: '100%',
    maxWidth: 360,
    gap: 10,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  secondaryBtnText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
  },
});
