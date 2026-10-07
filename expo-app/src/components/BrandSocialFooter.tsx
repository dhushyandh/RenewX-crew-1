import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

interface BrandSocialFooterProps {
  showLegalLinks?: boolean;
  showLogOut?: boolean;
  onLogout?: () => void;
  version?: string;
  style?: any;
}

export default function BrandSocialFooter({
  showLegalLinks = false,
  showLogOut = false,
  onLogout,
  version = 'v 1.0.0',
  style,
}: BrandSocialFooterProps) {
  let navigation: any = null;
  try {
    navigation = useNavigation<any>();
  } catch {
    // May be rendered outside NavigationContainer in OfflineScreen / ConnectionStatusBanner
  }

  // Continuous shimmer wave animation
  const shimmerValue = useRef(new Animated.Value(0)).current;
  const sweepTranslate = useRef(new Animated.Value(-120)).current;

  useEffect(() => {
    // Shimmer opacity & color pulse
    const pulseAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerValue, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: false,
        }),
        Animated.timing(shimmerValue, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: false,
        }),
      ])
    );

    // Shimmer shine bar sweep across
    const sweepAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(sweepTranslate, {
          toValue: 220,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.delay(1000),
      ])
    );

    pulseAnim.start();
    sweepAnim.start();

    return () => {
      pulseAnim.stop();
      sweepAnim.stop();
    };
  }, [shimmerValue, sweepTranslate]);

  const shimmerColor = shimmerValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['#475569', '#059669', '#475569'],
  });

  const shimmerOpacity = shimmerValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.75, 1, 0.75],
  });

  const handleOpenSocial = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  return (
    <View style={[styles.container, style]}>
      {/* Optional Legal Links (Terms & Conditions, Privacy Policy) */}
      {showLegalLinks && (
        <View style={styles.legalSection}>
          <TouchableOpacity
            style={styles.legalRow}
            onPress={() => {
              try {
                navigation?.navigate('AboutRenewX', { tab: 'terms' });
              } catch {}
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.legalText}>Terms & Conditions</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.legalRow}
            onPress={() => {
              try {
                navigation?.navigate('AboutRenewX', { tab: 'privacy' });
              } catch {}
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.legalText}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Optional Log Out Button */}
      {showLogOut && onLogout && (
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={onLogout}
          activeOpacity={0.75}
        >
          <Text style={styles.logoutText}>Log Out</Text>
          <Ionicons name="exit-outline" size={18} color="#059669" style={{ marginLeft: 6 }} />
        </TouchableOpacity>
      )}

      {/* Social Media Icons (WhatsApp, Instagram, X) */}
      <View style={styles.socialRow}>
        {/* 1. WhatsApp */}
        <TouchableOpacity
          style={[styles.socialIconCircle, styles.whatsappCircle]}
          onPress={() => handleOpenSocial('https://chat.whatsapp.com/FyyALPUCzl2KvmRHnz2aaA?mode=gi_t')}
          activeOpacity={0.8}
          accessibilityLabel="WhatsApp Community"
        >
          <Ionicons name="logo-whatsapp" size={21} color="#FFFFFF" />
        </TouchableOpacity>

        {/* 2. Instagram */}
        <TouchableOpacity
          style={[styles.socialIconCircle, styles.instagramCircle]}
          onPress={() => handleOpenSocial('https://www.instagram.com/renewx_crew/')}
          activeOpacity={0.8}
          accessibilityLabel="Instagram"
        >
          <Ionicons name="logo-instagram" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        {/* 3. X (Twitter) */}
        <TouchableOpacity
          style={[styles.socialIconCircle, styles.xCircle]}
          onPress={() => handleOpenSocial('https://x.com')}
          activeOpacity={0.8}
          accessibilityLabel="X"
        >
          <Text style={styles.xText}>𝕏</Text>
        </TouchableOpacity>
      </View>

      {/* Powered By Section with Shimmer Effect */}
      <View style={styles.poweredByWrapper}>
        <TouchableOpacity
          style={styles.poweredByRow}
          onPress={() => Linking.openURL('https://dhushyandh.in').catch(() => {})}
          activeOpacity={0.8}
          accessibilityLabel="Powered by Dhushyandh - Open Website"
        >
          <Image
            source={{ uri: 'https://dhushyandh.in/favicon.png' }}
            style={styles.poweredByLogo}
            resizeMode="contain"
          />

          <View style={styles.shimmerContainer}>
            <Animated.Text
              style={[
                styles.poweredByTitle,
                { color: shimmerColor, opacity: shimmerOpacity },
              ]}
            >
              Powered by
            </Animated.Text>

            <Animated.Text
              style={[
                styles.brandName,
                { color: shimmerColor, opacity: shimmerOpacity },
              ]}
            >
              Dhushyandh
            </Animated.Text>

            {/* Shimmer glistening light bar */}
            <View style={styles.shineTrack}>
              <Animated.View
                style={[
                  styles.shineBar,
                  {
                    transform: [{ translateX: sweepTranslate }],
                  },
                ]}
              />
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* App Version */}
      <Text style={styles.versionText}>{version}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    width: '100%',
  },

  /* Legal Links */
  legalSection: {
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 16,
  },
  legalRow: {
    paddingVertical: 4,
  },
  legalText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#64748B',
  },

  /* Log Out Link */
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginBottom: 22,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#059669',
  },

  /* Social Icons */
  socialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 22,
  },
  socialIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  whatsappCircle: {
    backgroundColor: '#25D366',
  },
  instagramCircle: {
    backgroundColor: '#E1306C',
  },
  xCircle: {
    backgroundColor: '#0F172A',
  },
  xText: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },

  /* Powered By Box */
  poweredByWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  poweredByRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 24,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  poweredByLogo: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  shimmerContainer: {
    position: 'relative',
    overflow: 'hidden',
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  poweredByTitle: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  brandName: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  shineTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  shineBar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 45,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    transform: [{ skewX: '-20deg' }],
  },

  /* Version */
  versionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#94A3B8',
    letterSpacing: 0.3,
  },
});
