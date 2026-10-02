import { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/App';
import { useAuth } from '@/context/AuthContext';
import { useWishlist } from '@/context/WishlistContext';
import { useToast } from '@/context/ToastContext';
import { api } from '@/services/api';
import HomeHeader from '@/components/HomeHeader';
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
  const { user, isAdmin, signOut } = useAuth();
  const { totalWishlistItems } = useWishlist();
  const toast = useToast();

  const [orderStats, setOrderStats] = useState({
    total: 0,
    inTransit: 0,
    delivered: 0,
    cancelled: 0,
  });
  const [sellCount, setSellCount] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      api.orders.getAll(),
      api.tradeIn.getMyRequests(),
    ]).then(([orderRes, sellRes]) => {
      if (!active) return;
      if (orderRes.status === 'fulfilled' && Array.isArray(orderRes.value)) {
        let inTransit = 0;
        let delivered = 0;
        let cancelled = 0;
        orderRes.value.forEach((o: any) => {
          const s = String(o.status || '').toLowerCase();
          if (s === 'delivered') delivered++;
          else if (s === 'cancelled') cancelled++;
          else inTransit++;
        });
        setOrderStats({
          total: orderRes.value.length,
          inTransit,
          delivered,
          cancelled,
        });
      }
      if (sellRes.status === 'fulfilled' && Array.isArray(sellRes.value)) {
        setSellCount(sellRes.value.length);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully.');
      navigation.navigate('Auth' as any);
    } catch {
      toast.error('Failed to sign out');
    }
  };

  const displayName = user?.full_name || (user?.email ? user.email.split('@')[0] : 'Guest User');
  const displayEmail = user?.email || 'Not signed in';
  const displayPhone = user?.phone || 'No phone added';
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
      {/* 1. TOP HEADER */}
      <HomeHeader
        onSearch={() => navigation.navigate('Search')}
        cartCount={0}
        onCart={() => navigation.navigate('Cart')}
        isAdmin={isAdmin}
        onAdmin={() => navigation.navigate('Admin', { screen: 'dashboard' })}
        onLogout={signOut}
        onAccount={() => {}}
        onSell={() => (navigation as any).navigate('Sell')}
        onWishlist={() => navigation.navigate('Wishlist')}
        onNotifications={() => navigation.navigate('Notifications')}
        userAddress={user?.address || undefined}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
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
        </View>

        {/* 3. RENEWX PLUS BANNER */}
        <View style={styles.plusBannerCard}>
          <View style={styles.plusCrownCircle}>
            <Ionicons name="ribbon" size={20} color="#B45309" />
          </View>

          <View style={styles.plusInfoCol}>
            <Text style={styles.plusTitle}>RenewX Plus</Text>
            <Text style={styles.plusSubtitle}>
              More savings. Faster support. Exclusive offers.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.plusExploreBtn}
            onPress={() => toast.info('RenewX Plus membership is active for your account!')}
            activeOpacity={0.85}
          >
            <Text style={styles.plusExploreText}>Explore</Text>
            <Ionicons name="chevron-forward" size={13} color="#000000" />
          </TouchableOpacity>
        </View>

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
            <Text style={styles.tileTitle}>Favorites</Text>
            <Text style={styles.tileSub}>
              {totalWishlistItems} {totalWishlistItems === 1 ? 'item' : 'items'}
            </Text>
          </TouchableOpacity>

          {/* Tile 2: Addresses */}
          <TouchableOpacity
            style={styles.quickTile}
            onPress={() => navigation.navigate('EditProfile')}
            activeOpacity={0.8}
          >
            <View style={[styles.tileIconCircle, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="location" size={18} color="#2563EB" />
            </View>
            <Text style={styles.tileTitle}>Addresses</Text>
            <Text style={styles.tileSub}>{user?.address ? '1 saved' : '0 saved'}</Text>
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
            <Text style={styles.tileTitle}>Trade-in / Sell</Text>
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
            <Text style={styles.tileTitle}>Notifications</Text>
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
              <Text style={styles.menuItemSub}>Name, email, phone number</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
          </TouchableOpacity>

          {/* Item 2: Manage Addresses */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => toast.info('Delivery addresses configured for Bangalore')}
            activeOpacity={0.75}
          >
            <View style={[styles.menuIconCircle, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="location-outline" size={18} color="#059669" />
            </View>
            <View style={styles.menuItemTextCol}>
              <Text style={styles.menuItemTitle}>Manage Addresses</Text>
              <Text style={styles.menuItemSub}>Home, work or other addresses</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
          </TouchableOpacity>

          {/* Item 3: Payment Methods */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => toast.info('Cards, UPI and COD enabled')}
            activeOpacity={0.75}
          >
            <View style={[styles.menuIconCircle, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="card-outline" size={18} color="#1D4ED8" />
            </View>
            <View style={styles.menuItemTextCol}>
              <Text style={styles.menuItemTitle}>Payment Methods</Text>
              <Text style={styles.menuItemSub}>Cards, UPI and more</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
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
              <Text style={styles.menuItemTitle}>Track Orders & Sell Requests</Text>
              <Text style={styles.menuItemSub}>Track live by Order ID or Sell Request ID</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
          </TouchableOpacity>

          {/* Item 5: My Refurbish / Sell Requests */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => (navigation as any).navigate('MySellRequests')}
            activeOpacity={0.75}
          >
            <View style={[styles.menuIconCircle, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="pricetag-outline" size={18} color="#D97706" />
            </View>
            <View style={styles.menuItemTextCol}>
              <Text style={styles.menuItemTitle}>My Sell Requests</Text>
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
              <Text style={styles.menuItemTitle}>Notifications</Text>
              <Text style={styles.menuItemSub}>Order updates, offers and alerts</Text>
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
              <Text style={styles.menuItemTitle}>Help & Support</Text>
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
              <Text style={styles.menuItemTitle}>Settings</Text>
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
              <Text style={[styles.menuItemTitle, { color: '#B91C1C' }]}>Log Out</Text>
              <Text style={styles.menuItemSub}>Sign out from your account</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
          </TouchableOpacity>
        </View>
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

  /* 3. PLUS BANNER */
  plusBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FEF08A',
    padding: 12,
  },
  plusCrownCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusInfoCol: {
    flex: 1,
  },
  plusTitle: {
    fontFamily: renewxFontFamily.extraBold,
    fontSize: 13.5,
    fontWeight: '900',
    color: '#0F172A',
  },
  plusSubtitle: {
    marginTop: 2,
    fontFamily: renewxFontFamily.regular,
    fontSize: 10,
    color: '#64748B',
  },
  plusExploreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FDE047',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  plusExploreText: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 11,
    fontWeight: '800',
    color: '#000000',
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
