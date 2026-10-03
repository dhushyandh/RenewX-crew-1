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
      <StatusBar barStyle="dark-content" backgroundColor="#DCFCE7" />

      {/* ============================================================== */}
      {/* TOP HEADER & SEARCH / CATEGORIES BAR (MINT GREEN)              */}
      {/* ============================================================== */}
      <View style={[styles.headerContainer, { paddingTop: safeTop + 4 }]}>
        {/* Search Bar Row */}
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color="#374151" style={styles.searchIcon} />
            <Text style={styles.searchPlaceholder} numberOfLines={1}>
              Search 'rice'
            </Text>
            <Ionicons name="mic-outline" size={19} color="#374151" />
          </View>

          <TouchableOpacity style={styles.headerIconBtn} activeOpacity={0.75}>
            <Ionicons name="create-outline" size={21} color="#1F2937" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.headerIconBtn} activeOpacity={0.75}>
            <Ionicons name="heart-outline" size={21} color="#1F2937" />
          </TouchableOpacity>
        </View>

        {/* Categories Bar Row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {/* Tab 1: All (Active white tab) */}
          <View style={styles.categoryTabActive}>
            <Ionicons name="storefront-outline" size={17} color="#111827" />
            <Text style={styles.categoryTextActive}>All</Text>
          </View>

          {/* Tab 2: Fresh */}
          <View style={styles.categoryTab}>
            <Ionicons name="leaf-outline" size={17} color="#374151" />
            <Text style={styles.categoryText}>Fresh</Text>
          </View>

          {/* Tab 3: Navaratri / Deals with "Shop now" badge */}
          <View style={styles.categoryTabWithBadge}>
            <View style={styles.shopNowBadge}>
              <Text style={styles.shopNowBadgeText}>Shop now</Text>
            </View>
            <Ionicons name="flame-outline" size={17} color="#374151" />
            <Text style={styles.categoryText}>Navaratri</Text>
          </View>

          {/* Tab 4: Electronics */}
          <View style={styles.categoryTab}>
            <Ionicons name="headset-outline" size={17} color="#374151" />
            <Text style={styles.categoryText}>Electronics</Text>
          </View>

          {/* Tab 5: bbCafe */}
          <View style={styles.categoryTab}>
            <Ionicons name="cafe-outline" size={17} color="#374151" />
            <Text style={styles.categoryText}>bbCafe</Text>
          </View>

          {/* Tab 6: Monsoon */}
          <View style={styles.categoryTab}>
            <Ionicons name="rainy-outline" size={17} color="#374151" />
            <Text style={styles.categoryText}>Monsoon</Text>
          </View>
        </ScrollView>
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
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#BBF7D0',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  searchBar: {
    flex: 1,
    height: 44,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    fontWeight: '400',
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    backgroundColor: '#FFFFFF',
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },

  /* Categories Bar */
  categoryScroll: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 2,
    gap: 6,
  },
  categoryTabActive: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 54,
  },
  categoryTextActive: {
    fontSize: 11,
    fontWeight: '700',
    color: '#111827',
    marginTop: 2,
  },
  categoryTab: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 56,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#374151',
    marginTop: 2,
  },
  categoryTabWithBadge: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 62,
    position: 'relative',
  },
  shopNowBadge: {
    position: 'absolute',
    top: -6,
    backgroundColor: '#000000',
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 8,
    zIndex: 10,
  },
  shopNowBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
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
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 26,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 290,
    marginBottom: 26,
  },

  /* Reload Button */
  reloadBtn: {
    backgroundColor: '#007A4D',
    paddingVertical: 12,
    paddingHorizontal: 36,
    borderRadius: 6,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007A4D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
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
  },
});