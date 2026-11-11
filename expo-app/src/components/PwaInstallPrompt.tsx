import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Image,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { renewxColors, renewxShadows, renewxTextStyle } from '@/design-system';

const PWA_DISMISSED_KEY = '@renewx_pwa_install_dismissed_at';
const COOLDOWN_DAYS = 5;

export default function PwaInstallPrompt() {
  // Only render on web
  if (Platform.OS !== 'web') {
    return null;
  }

  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIosSafari, setIsIosSafari] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const slideAnim = React.useRef(new Animated.Value(60)).current;

  // Check if app is already running in standalone PWA mode
  const isStandalone = () => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')
    );
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (isStandalone()) {
      return;
    }

    const checkDismissStatus = async () => {
      try {
        const lastDismissed = await AsyncStorage.getItem(PWA_DISMISSED_KEY);
        if (lastDismissed) {
          const daysSince =
            (Date.now() - parseInt(lastDismissed, 10)) / (1000 * 60 * 60 * 24);
          if (daysSince < COOLDOWN_DAYS) {
            return;
          }
        }

        // Detect iOS Safari
        const ua = window.navigator.userAgent.toLowerCase();
        const isIos = /iphone|ipad|ipod/.test(ua);
        const isSafari = /safari/.test(ua) && !/chrome|crios|fxios/.test(ua);

        if (isIos && isSafari) {
          setIsIosSafari(true);
          setVisible(true);
          Animated.spring(slideAnim, {
            toValue: 0,
            friction: 7,
            useNativeDriver: true,
          }).start();
        }
      } catch {
        // ignore
      }
    };

    checkDismissStatus();

    // Standard Chromium / Android beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 7,
        useNativeDriver: true,
      }).start();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // App was successfully installed
    const handleAppInstalled = () => {
      console.log('[PWA] RenewX was installed to home screen.');
      setVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [slideAnim]);

  const handleInstallPress = async () => {
    if (isIosSafari) {
      setShowIosGuide(!showIosGuide);
      return;
    }

    if (!deferredPrompt) return;

    try {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      console.log('[PWA] User choice:', choice?.outcome);
      if (choice?.outcome === 'accepted') {
        setVisible(false);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.warn('[PWA] Install prompt error:', err);
    }
  };

  const handleDismiss = async () => {
    try {
      await AsyncStorage.setItem(PWA_DISMISSED_KEY, Date.now().toString());
    } catch {
      // ignore
    }
    Animated.timing(slideAnim, {
      toValue: 80,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setVisible(false));
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.bannerContainer,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.bannerCard}>
        {/* App Icon */}
        <View style={styles.iconWrapper}>
          <Image
            source={{ uri: '/icons/icon-192.png' }}
            style={styles.appIcon}
          />
        </View>

        {/* Text Content */}
        <View style={styles.textContainer}>
          <View style={styles.titleBadgeRow}>
            <Text style={styles.bannerTitle}>Install RenewX App</Text>
            <View style={styles.pwaBadge}>
              <Text style={styles.pwaBadgeText}>PWA</Text>
            </View>
          </View>
          <Text style={styles.bannerSubtitle} numberOfLines={1}>
            {isIosSafari
              ? 'Add to Home Screen for fast, fullscreen app experience'
              : 'Faster loading, works offline & instant deal alerts'}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            onPress={handleInstallPress}
            style={styles.installButton}
            activeOpacity={0.85}
          >
            <Text style={styles.installButtonText}>
              {isIosSafari ? 'How to Add' : 'Install'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDismiss}
            style={styles.dismissButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={17} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      </View>

      {/* iOS Safari Instruction Tooltip */}
      {showIosGuide && isIosSafari && (
        <View style={styles.iosGuideBox}>
          <Text style={styles.iosGuideTitle}>How to install on iOS:</Text>
          <Text style={styles.iosGuideStep}>
            1. Tap the <Text style={styles.iosGuideBold}>Share</Text> icon (
            <Ionicons name="share-outline" size={13} color={renewxColors.black} />) at the bottom of Safari.
          </Text>
          <Text style={styles.iosGuideStep}>
            2. Scroll down and tap <Text style={styles.iosGuideBold}>'Add to Home Screen'</Text> (
            <Ionicons name="add-circle-outline" size={13} color={renewxColors.black} />).
          </Text>
          <Text style={styles.iosGuideStep}>
            3. Tap <Text style={styles.iosGuideBold}>'Add'</Text> at the top right corner.
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    position: 'absolute',
    bottom: 14,
    left: 12,
    right: 12,
    zIndex: 99999,
    alignItems: 'center',
  },
  bannerCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: renewxColors.black,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...(renewxShadows.floating as object),
    borderWidth: 1,
    borderColor: '#334155',
  },
  iconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: renewxColors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  appIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
  },
  textContainer: {
    flex: 1,
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bannerTitle: {
    fontSize: 13.5,
    ...renewxTextStyle('extraBold'),
    color: renewxColors.white,
    letterSpacing: -0.2,
  },
  pwaBadge: {
    backgroundColor: 'rgba(255, 196, 0, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: renewxColors.yellow,
  },
  pwaBadgeText: {
    fontSize: 9.5,
    ...renewxTextStyle('black'),
    color: renewxColors.yellow,
  },
  bannerSubtitle: {
    fontSize: 11.5,
    ...renewxTextStyle('regular'),
    color: '#CBD5E1',
    marginTop: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  installButton: {
    backgroundColor: renewxColors.yellow,
    paddingHorizontal: 12,
    paddingVertical: 6.5,
    borderRadius: 10,
  },
  installButtonText: {
    fontSize: 12,
    ...renewxTextStyle('extraBold'),
    color: renewxColors.black,
  },
  dismissButton: {
    padding: 4,
  },
  iosGuideBox: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: renewxColors.surface,
    borderRadius: 14,
    padding: 12,
    marginTop: 6,
    borderWidth: 1,
    borderColor: renewxColors.border,
    ...(renewxShadows.elevated as object),
  },
  iosGuideTitle: {
    fontSize: 12.5,
    ...renewxTextStyle('extraBold'),
    color: renewxColors.black,
    marginBottom: 6,
  },
  iosGuideStep: {
    fontSize: 12,
    ...renewxTextStyle('regular'),
    color: renewxColors.textSecondary,
    marginBottom: 4,
    lineHeight: 17,
  },
  iosGuideBold: {
    ...renewxTextStyle('extraBold'),
    color: renewxColors.black,
  },
});
