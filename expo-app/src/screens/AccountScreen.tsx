import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Linking,
  Platform,
  Alert,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RootStackParamList } from '@/App';
import { useAuth } from '@/context/AuthContext';
import { useWishlist } from '@/context/WishlistContext';
import { useToast } from '@/context/ToastContext';
import { useLanguage } from '@/context/LanguageContext';
import { api } from '@/services/api';
import HomeHeader from '@/components/HomeHeader';
import BrandSocialFooter from '@/components/BrandSocialFooter';
import { Ionicons } from '@expo/vector-icons';
import {
  renewxColors,
  renewxFontFamily,
  renewxRadius,
  renewxSpacing,
} from '@/design-system';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
const SUPPORT_PHONE = '+919080168778';

export default function AccountScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, isAdmin, signOut, refreshUser } = useAuth();
  const { totalWishlistItems } = useWishlist();
  const { t } = useLanguage();
  const toast = useToast();
  const scrollRef = useRef<ScrollView>(null);

  const [orderStats, setOrderStats] = useState({
    total: 0,
    inTransit: 0,
    delivered: 0,
    cancelled: 0,
  });
  const [sellCount, setSellCount] = useState(0);
  const [addressCount, setAddressCount] = useState<number>(() => (user?.address ? 1 : 0));
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      await Promise.allSettled([
        refreshUser ? refreshUser() : Promise.resolve(),
        api.orders.getAll().then((orderRes: any) => {
          if (Array.isArray(orderRes)) {
            let inTransit = 0;
            let delivered = 0;
            let cancelled = 0;
            orderRes.forEach((o: any) => {
              const s = String(o.status || '').toLowerCase();
              if (s === 'delivered') delivered++;
              else if (s === 'cancelled') cancelled++;
              else inTransit++;
            });
            setOrderStats({
              total: orderRes.length,
              inTransit,
              delivered,
              cancelled,
            });
          }
        }),
        api.tradeIn.getMyRequests().then((sellRes: any) => {
          if (Array.isArray(sellRes)) {
            setSellCount(sellRes.length);
          }
        }),
        AsyncStorage.getItem('@renewx_saved_addresses').then((stored) => {
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setAddressCount(parsed.length);
                return;
              }
            } catch {}
          }
          setAddressCount(user?.address ? 1 : 0);
        }),
      ]);
    } catch {
      // ignore
    }
  }, [refreshUser, user?.address]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' as any });
      }
    }, [loadData])
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully.', 'Signed Out');
      navigation.navigate('Auth' as any);
    } catch {
      toast.error('Failed to sign out', 'Sign Out');
    }
  };

  const displayName = user?.full_name || (user?.email ? user.email.split('@')[0] : 'RenewX Member');
  const displayEmail = user?.email || '';
  const displayPhone = user?.phone || 'No phone added';
  const displayBio = user?.bio || '';
  const displayAddress =
    user?.address ||
    (user?.city ? `${user.city}${user?.state ? `, ${user.state}` : ''}${user?.pincode ? ` - ${user.pincode}` : ''}` : '') ||
    (user?.saved_addresses?.[0] ? `${user.saved_addresses[0].address_line1 || user.saved_addresses[0].address}, ${user.saved_addresses[0].city}` : '') ||
    '';
  const initials =
    user?.full_name
      ?.trim()
      .split(/\s+/)
      .map((w: string) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || (user?.email ? user.email.substring(0, 2).toUpperCase() : 'RX');

  return (
    <View style={styles.container}>
      {/* 1. TOP HEADER (Matching Reference Image 8: Account / Profile) */}
      <HomeHeader
        mode="account"
        title="My Account"
        onSettings={() => navigation.navigate('Settings')}
      />

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#FFC400"
            colors={['#FFC400', '#10B981']}
            progressBackgroundColor="#FFFFFF"
          />
        }
      >
        {/* 2. USER PROFILE HERO CARD */}
        <View style={styles.profileCard}>
          <View style={styles.profileCardRow}>
            {/* Avatar Circle with Camera badge */}
            <View style={styles.avatarWrapper}>
              <View style={styles.avatarCircle}>
                {user?.avatar_url ? (
                  <Image source={{ uri: user.avatar_url }} style={styles.avatarImg} />
                ) : (
                  <Text style={styles.avatarInitialsText}>{initials}</Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.cameraBadge}
                onPress={() => navigation.navigate('EditProfile')}
                activeOpacity={0.8}
              >
                <Ionicons name="camera" size={11} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* User Details */}
            <View style={styles.profileInfoCol}>
              <Text style={styles.userNameText} numberOfLines={1}>
                {displayName}
              </Text>
              <Text style={styles.userEmailText} numberOfLines={1}>
                {displayEmail}
              </Text>
              <Text style={styles.userPhoneText} numberOfLines={1}>
                {displayPhone}
              </Text>

              {/* Verified Pill */}
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={13} color="#059669" />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            </View>

            {/* Edit Profile Button */}
            <TouchableOpacity
              style={styles.editProfileBtn}
              onPress={() => navigation.navigate('EditProfile')}
              activeOpacity={0.8}
            >
              <Ionicons name="pencil" size={13} color="#0F172A" />
              <Text style={styles.editProfileBtnText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>

          {/* User Bio (Pulled directly from DB) */}
          {Boolean(displayBio) && (
            <View style={styles.profileBioContainer}>
              <Ionicons name="chatbox-ellipses-outline" size={12} color="#059669" />
              <Text style={styles.profileBioText} numberOfLines={2}>
                "{displayBio}"
              </Text>
            </View>
          )}

          {/* User Delivery Address (Pulled directly from DB) */}
          <View style={styles.profileAddressContainer}>
            <View style={styles.profileAddressLeft}>
              <Ionicons name="location-outline" size={14} color="#059669" />
              <Text style={styles.profileAddressText} numberOfLines={1}>
                {displayAddress || 'No primary delivery address saved in database'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('EditProfile')}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.profileAddressActionText}>
                {displayAddress ? 'Edit' : '+ Add'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 3. ADMIN PORTAL BANNER (Replaces RenewX Plus) */}
        {isAdmin && (
          <TouchableOpacity
            style={styles.adminBannerCard}
            onPress={() => navigation.navigate('Admin', { screen: 'dashboard' })}
            activeOpacity={0.88}
          >
            <View style={styles.adminShieldCircle}>
              <Ionicons name="shield-checkmark" size={20} color="#059669" />
            </View>

            <View style={styles.adminInfoCol}>
              <View style={styles.adminTitleBadgeRow}>
                <Text style={styles.adminTitle}>Admin Control Center</Text>
                <View style={styles.adminStatusTag}>
                  <Text style={styles.adminStatusTagText}>Portal</Text>
                </View>
              </View>
              <Text style={styles.adminSubtitle}>
                Manage inventory, products, orders & user permissions
              </Text>
            </View>

            <View style={styles.adminManageBtn}>
              <Text style={styles.adminManageText}>Open</Text>
              <Ionicons name="arrow-forward" size={13} color="#0F172A" />
            </View>
          </TouchableOpacity>
        )}

        {/* 4. MY ORDERS STATS ROW */}
        <View style={styles.ordersSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionMainTitle}>My Orders</Text>
            <TouchableOpacity
              style={styles.viewAllRow}
              onPress={() => (navigation as any).navigate('Track')}
              activeOpacity={0.7}
            >
              <Text style={styles.viewAllText}>View All</Text>
              <Ionicons name="arrow-forward" size={13} color="#0F172A" />
            </TouchableOpacity>
          </View>

          <View style={styles.statsRow}>
            {/* Stat 1: Total Orders */}
            <TouchableOpacity
              style={styles.statBox}
              onPress={() => (navigation as any).navigate('Track')}
              activeOpacity={0.8}
            >
              <View style={[styles.statIconCircle, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="cube-outline" size={18} color="#EF4444" />
              </View>
              <Text style={styles.statCountText}>{orderStats.total}</Text>
              <Text style={styles.statLabelText}>Total Orders</Text>
            </TouchableOpacity>

            {/* Stat 2: In Transit */}
            <TouchableOpacity
              style={styles.statBox}
              onPress={() => (navigation as any).navigate('Track')}
              activeOpacity={0.8}
            >
              <View style={[styles.statIconCircle, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="car-outline" size={18} color="#3B82F6" />
              </View>
              <Text style={styles.statCountText}>{orderStats.inTransit}</Text>
              <Text style={styles.statLabelText}>In Transit</Text>
            </TouchableOpacity>

            {/* Stat 3: Delivered */}
            <TouchableOpacity
              style={styles.statBox}
              onPress={() => (navigation as any).navigate('Track')}
              activeOpacity={0.8}
            >
              <View style={[styles.statIconCircle, { backgroundColor: '#DCFCE7' }]}>
                <Ionicons name="checkmark-circle-outline" size={18} color="#10B981" />
              </View>
              <Text style={styles.statCountText}>{orderStats.delivered}</Text>
              <Text style={styles.statLabelText}>Delivered</Text>
            </TouchableOpacity>

            {/* Stat 4: Cancelled */}
            <TouchableOpacity
              style={styles.statBox}
              onPress={() => (navigation as any).navigate('Track')}
              activeOpacity={0.8}
            >
              <View style={[styles.statIconCircle, { backgroundColor: '#FFEDD5' }]}>
                <Ionicons name="return-up-back-outline" size={18} color="#F97316" />
              </View>
              <Text style={styles.statCountText}>{orderStats.cancelled}</Text>
              <Text style={styles.statLabelText}>Cancelled</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Sell Request Tracking Banner */}
          <TouchableOpacity
            style={styles.sellTrackingCard}
            onPress={() => (navigation as any).navigate('MainTabs', { screen: 'Track', params: { type: 'sell_requests' } })}
            activeOpacity={0.85}
          >
            <View style={styles.sellTrackingIconCircle}>
              <Ionicons name="repeat" size={20} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.sellTrackingTitle}>Track Sell Requests</Text>
                <View style={styles.sellCountBadge}>
                  <Text style={styles.sellCountBadgeText}>{sellCount} Active</Text>
                </View>
              </View>
              <Text style={styles.sellTrackingSubtitle}>
                Valuation approval, doorstep pickup & instant payout
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#059669" />
          </TouchableOpacity>
        </View>

        {/* 5. 4 QUICK ACTION TILES (2x2) */}
        <View style={styles.quickTilesGrid}>
          {/* Tile 1: Favorites */}
          <TouchableOpacity
            style={styles.quickTile}
            onPress={() => navigation.navigate('Wishlist')}
            activeOpacity={0.8}
          >
            <View style={[styles.tileIconCircle, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="heart" size={18} color="#EF4444" />
            </View>
            <Text style={styles.tileTitle}>{t('account_wishlist', 'Favorites')}</Text>
            <Text style={styles.tileSub}>
              {totalWishlistItems} {totalWishlistItems === 1 ? 'item' : 'items'}
            </Text>
          </TouchableOpacity>

          {/* Tile 2: Addresses */}
          <TouchableOpacity
            style={styles.quickTile}
            onPress={() => navigation.navigate('ManageAddresses')}
            activeOpacity={0.8}
          >
            <View style={[styles.tileIconCircle, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="location" size={18} color="#2563EB" />
            </View>
            <Text style={styles.tileTitle}>{t('account_addresses', 'Addresses')}</Text>
            <Text style={styles.tileSub}>{addressCount} saved</Text>
          </TouchableOpacity>

          {/* Tile 3: Trade-in / Sell */}
          <TouchableOpacity
            style={styles.quickTile}
            onPress={() => (navigation as any).navigate('Sell')}
            activeOpacity={0.8}
          >
            <View style={[styles.tileIconCircle, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="pricetag" size={18} color="#D97706" />
            </View>
            <Text style={styles.tileTitle}>{t('tab_sell', 'Trade-in / Sell')}</Text>
            <Text style={styles.tileSub}>Instant quote</Text>
          </TouchableOpacity>

          {/* Tile 4: Alerts */}
          <TouchableOpacity
            style={styles.quickTile}
            onPress={() => navigation.navigate('Notifications')}
            activeOpacity={0.8}
          >
            <View style={[styles.tileIconCircle, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="notifications" size={18} color="#059669" />
            </View>
            <Text style={styles.tileTitle}>{t('settings_notifications', 'Notifications')}</Text>
            <Text style={styles.tileSub}>Latest alerts</Text>
          </TouchableOpacity>
        </View>

        {/* 6. ACCOUNT MENU LIST */}
        <View style={styles.menuListContainer}>
          {/* Item 1: Personal Information */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('EditProfile')}
            activeOpacity={0.75}
          >
            <View style={[styles.menuIconCircle, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="person-outline" size={18} color="#2563EB" />
            </View>
            <View style={styles.menuItemTextCol}>
              <Text style={styles.menuItemTitle}>Personal Information</Text>
              <Text style={styles.menuItemSub}>
                {user?.full_name ? `${user.full_name} • ` : ''}
                {user?.phone || 'Add phone'} • {displayAddress ? 'Address set' : 'Add address'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
          </TouchableOpacity>

          {/* Item 2: Manage Addresses */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('ManageAddresses')}
            activeOpacity={0.75}
          >
            <View style={[styles.menuIconCircle, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="location-outline" size={18} color="#059669" />
            </View>
            <View style={styles.menuItemTextCol}>
              <Text style={styles.menuItemTitle}>{t('settings_manage_addresses', 'Manage Addresses')}</Text>
              <Text style={styles.menuItemSub}>{t('settings_addresses_sub', 'Home, work or other addresses')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
          </TouchableOpacity>

          {/* Item 3: Join Our Community (WhatsApp) */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => Linking.openURL('https://chat.whatsapp.com/FyyALPUCzl2KvmRHnz2aaA?mode=gi_t').catch(() => {})}
            activeOpacity={0.75}
          >
            <View style={[styles.menuIconCircle, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="logo-whatsapp" size={19} color="#16A34A" />
            </View>
            <View style={styles.menuItemTextCol}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.menuItemTitle}>Join Our Community</Text>
                <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 6 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#15803D' }}>WhatsApp</Text>
                </View>
              </View>
              <Text style={styles.menuItemSub}>Exclusive deals, device updates & offers</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#16A34A" />
          </TouchableOpacity>

          {/* Item 4: Live Tracking Hub */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => (navigation as any).navigate('MainTabs', { screen: 'Track' })}
            activeOpacity={0.75}
          >
            <View style={[styles.menuIconCircle, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="navigate-outline" size={18} color="#059669" />
            </View>
            <View style={styles.menuItemTextCol}>
              <Text style={styles.menuItemTitle}>{t('order_tracking', 'Track Orders & Sell Requests')}</Text>
              <Text style={styles.menuItemSub}>Track live by Order ID or Sell Request ID</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
          </TouchableOpacity>

          {/* Item 5: My Sell Requests */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => (navigation as any).navigate('MySellRequests')}
            activeOpacity={0.75}
          >
            <View style={[styles.menuIconCircle, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="pricetag-outline" size={18} color="#D97706" />
            </View>
            <View style={styles.menuItemTextCol}>
              <Text style={styles.menuItemTitle}>{t('account_my_sell', 'My Sell Requests')}</Text>
              <Text style={styles.menuItemSub}>
                {sellCount > 0 ? `${sellCount} active requests • Check live status` : 'Track quotes, approvals & payouts'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
          </TouchableOpacity>

          {/* Item 5: Notifications */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Notifications')}
            activeOpacity={0.75}
          >
            <View style={[styles.menuIconCircle, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="notifications-outline" size={18} color="#EF4444" />
            </View>
            <View style={styles.menuItemTextCol}>
              <Text style={styles.menuItemTitle}>{t('settings_notifications', 'Notifications')}</Text>
              <Text style={styles.menuItemSub}>{t('settings_notifications_sub', 'Order updates, offers and alerts')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
          </TouchableOpacity>

          {/* Item 6: Help & Support */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => Linking.openURL(`tel:${SUPPORT_PHONE}`)}
            activeOpacity={0.75}
          >
            <View style={[styles.menuIconCircle, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="headset-outline" size={18} color="#059669" />
            </View>
            <View style={styles.menuItemTextCol}>
              <Text style={styles.menuItemTitle}>{t('settings_support_section', 'Help & Support')}</Text>
              <Text style={styles.menuItemSub}>FAQs, contact us</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
          </TouchableOpacity>

          {/* Item 7: Settings */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Settings')}
            activeOpacity={0.75}
          >
            <View style={[styles.menuIconCircle, { backgroundColor: '#F1F5F9' }]}>
              <Ionicons name="settings-outline" size={18} color="#475569" />
            </View>
            <View style={styles.menuItemTextCol}>
              <Text style={styles.menuItemTitle}>{t('settings_title', 'Settings')}</Text>
              <Text style={styles.menuItemSub}>App preferences, language, privacy</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
          </TouchableOpacity>

          {/* Item 8: Log Out */}
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomWidth: 0 }]}
            onPress={handleSignOut}
            activeOpacity={0.75}
          >
            <View style={[styles.menuIconCircle, { backgroundColor: '#F1F5F9' }]}>
              <Ionicons name="log-out-outline" size={18} color="#475569" />
            </View>
            <View style={styles.menuItemTextCol}>
              <Text style={[styles.menuItemTitle, { color: '#B91C1C' }]}>{t('settings_logout', 'Log Out')}</Text>
              <Text style={styles.menuItemSub}>Sign out from your account</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Brand Footer: Terms, Privacy, Log Out, Social Media, Powered by Dhushyandh with Shimmer & v 1.0.0 */}
        <BrandSocialFooter
          showLegalLinks={true}
          showLogOut={false}
          onLogout={handleSignOut}
          version="v 1.0.0"
          style={{ marginTop: 12, marginBottom: 24 }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    padding: renewxSpacing.md,
    paddingBottom: 120,
    gap: 14,
  },

  /* 2. PROFILE HERO CARD */
  profileCard: {
    backgroundColor: '#E8FBE8',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 14,
    ...Platform.select({
      web: { boxShadow: '0 4px 16px rgba(16, 185, 129, 0.08)' },
      default: { elevation: 2 },
    }),
  },
  profileCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#DCFCE7',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
  },
  avatarInitialsText: {
    fontFamily: renewxFontFamily.extraBold,
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#0F172A',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfoCol: {
    flex: 1,
    minWidth: 0,
  },
  userNameText: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  userEmailText: {
    marginTop: 2,
    fontFamily: renewxFontFamily.regular,
    fontSize: 11,
    color: '#475569',
  },
  userPhoneText: {
    marginTop: 1,
    fontFamily: renewxFontFamily.regular,
    fontSize: 11,
    color: '#475569',
  },
  verifiedBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 5,
  },
  verifiedText: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 9.5,
    color: '#059669',
    fontWeight: '700',
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  editProfileBtnText: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 10.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  profileBioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 10,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: 'rgba(16, 185, 129, 0.18)',
    paddingHorizontal: 2,
  },
  profileBioText: {
    flex: 1,
    fontFamily: renewxFontFamily.regular,
    fontSize: 11.5,
    color: '#065F46',
    fontStyle: 'italic',
    lineHeight: 16,
  },
  profileAddressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginTop: 10,
  },
  profileAddressLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 8,
  },
  profileAddressText: {
    flex: 1,
    fontFamily: renewxFontFamily.medium,
    fontSize: 11,
    color: '#334155',
  },
  profileAddressActionText: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },

  /* 3. ADMIN BANNER */
  adminBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 14,
    ...Platform.select({
      web: { boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)' },
      default: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 3,
      },
    }),
  },
  adminShieldCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminInfoCol: {
    flex: 1,
  },
  adminTitleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  adminTitle: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  adminStatusTag: {
    backgroundColor: '#FACC15',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  adminStatusTagText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.5,
  },
  adminSubtitle: {
    marginTop: 2,
    fontFamily: renewxFontFamily.regular,
    fontSize: 10.5,
    color: '#94A3B8',
  },
  adminManageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FACC15',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  adminManageText: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },

  /* 4. ORDERS SECTION */
  ordersSection: {
    backgroundColor: '#FFFFFF',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionMainTitle: {
    fontFamily: renewxFontFamily.extraBold,
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  viewAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    alignItems: 'center',
    gap: 4,
    ...Platform.select({
      web: { boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' },
      default: { elevation: 1 },
    }),
  },
  statIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCountText: {
    fontFamily: renewxFontFamily.extraBold,
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },
  statLabelText: {
    fontFamily: renewxFontFamily.medium,
    fontSize: 9,
    color: '#64748B',
    textAlign: 'center',
  },
  sellTrackingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 12,
    marginTop: 10,
  },
  sellTrackingIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellTrackingTitle: {
    fontFamily: renewxFontFamily.extraBold,
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
  },
  sellCountBadge: {
    backgroundColor: '#059669',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 8,
  },
  sellCountBadgeText: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  sellTrackingSubtitle: {
    fontFamily: renewxFontFamily.medium,
    fontSize: 10,
    color: '#047857',
    marginTop: 2,
  },

  /* 5. QUICK TILES (2x2) */
  quickTilesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickTile: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    alignItems: 'center',
    gap: 4,
    ...Platform.select({
      web: { boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)' },
      default: { elevation: 1 },
    }),
  },
  tileIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  tileTitle: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  tileSub: {
    fontFamily: renewxFontFamily.regular,
    fontSize: 9.5,
    color: '#64748B',
  },

  /* 6. ACCOUNT MENU LIST */
  menuListContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  menuIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemTextCol: {
    flex: 1,
  },
  menuItemTitle: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  menuItemSub: {
    marginTop: 2,
    fontFamily: renewxFontFamily.regular,
    fontSize: 9.5,
    color: '#64748B',
  },
});
