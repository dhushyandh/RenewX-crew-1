import React, { useCallback, useEffect, useState } from 'react';
import {
  AppState,
  AppStateStatus,
  Image,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import {
  getNotificationPermissionStatus,
  requestNotificationPermission,
} from '@/services/pushNotifications';

const PROMPT_DISMISSED_KEY = '@renewx_notif_permission_dismissed_at';
const COOLDOWN_HOURS = 24;

export default function NotificationPermissionPrompt() {
  const [visible, setVisible] = useState(false);
  const [canAskAgain, setCanAskAgain] = useState(true);

  const checkPermission = useCallback(async () => {
    if (Platform.OS === 'web') return;

    try {
      const status = await getNotificationPermissionStatus();
      if (status.granted) {
        setVisible(false);
        return;
      }

      setCanAskAgain(status.canAskAgain);

      // Check if user dismissed the prompt recently
      const dismissedAtStr = await AsyncStorage.getItem(PROMPT_DISMISSED_KEY);
      if (dismissedAtStr) {
        const dismissedAt = Number(dismissedAtStr);
        const hoursPassed = (Date.now() - dismissedAt) / (1000 * 60 * 60);
        if (hoursPassed < COOLDOWN_HOURS) {
          return;
        }
      }

      // Show prompt if notifications are not enabled
      setVisible(true);
    } catch {
      // Ignore errors in permission checking
    }
  }, []);

  useEffect(() => {
    // Initial check on launch
    const timer = setTimeout(checkPermission, 1500);

    // Re-check when user comes back from phone Settings
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        checkPermission();
      }
    });

    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, [checkPermission]);

  const handleAllow = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      await AsyncStorage.removeItem(PROMPT_DISMISSED_KEY);
      setVisible(false);
    } else {
      // User tapped or settings opened; dismiss modal
      setVisible(false);
    }
  };

  const handleDismiss = async () => {
    await AsyncStorage.setItem(PROMPT_DISMISSED_KEY, Date.now().toString());
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={handleDismiss}
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={20} color="#64748b" />
          </TouchableOpacity>

          <View style={styles.iconContainer}>
            <Image
              source={require('@/assets/notification-icon.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <View style={styles.badgeIcon}>
              <Ionicons name="notifications" size={14} color="#fff" />
            </View>
          </View>

          <Text style={styles.title}>Enable Notifications</Text>
          <Text style={styles.subtitle}>
            Stay updated with live tracking, delivery alerts, and instant valuations for your RenewX orders.
          </Text>

          <View style={styles.perksList}>
            <View style={styles.perkItem}>
              <View style={[styles.perkDot, { backgroundColor: '#2563eb' }]}>
                <Ionicons name="car-outline" size={13} color="#fff" />
              </View>
              <Text style={styles.perkText}>Real-time shipment & out-for-delivery alerts</Text>
            </View>
            <View style={styles.perkItem}>
              <View style={[styles.perkDot, { backgroundColor: '#059669' }]}>
                <Ionicons name="cash-outline" size={13} color="#fff" />
              </View>
              <Text style={styles.perkText}>Instant sell-request quotes & pickup schedule</Text>
            </View>
            <View style={styles.perkItem}>
              <View style={[styles.perkDot, { backgroundColor: '#7c3aed' }]}>
                <Ionicons name="shield-checkmark-outline" size={13} color="#fff" />
              </View>
              <Text style={styles.perkText}>Crucial account and security notices</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleAllow}
            activeOpacity={0.85}
          >
            <Ionicons name="notifications-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.primaryBtnText}>
              {canAskAgain ? 'Allow Notifications' : 'Open Phone Settings'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={handleDismiss}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryBtnText}>Maybe Later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    zIndex: 9999,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10,
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    position: 'relative',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#f0fdf4',
    borderWidth: 2,
    borderColor: '#bbf7d0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoImage: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  badgeIcon: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#059669',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
  },
  perksList: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 12,
    marginBottom: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  perkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  perkDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  perkText: {
    flex: 1,
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
    lineHeight: 16,
  },
  primaryBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 10,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  secondaryBtnText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
});
