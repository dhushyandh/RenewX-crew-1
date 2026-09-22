import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Linking, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/App';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { confirmAction } from '@/lib/confirmAction';
import { useSafeHeaderTop } from '@/lib/useSafeHeaderTop';
import { fontFamily } from '@/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
const SUPPORT_PHONE = '+919080168778';
const WHATSAPP_COMMUNITY_URL =
  'https://chat.whatsapp.com/FyyALPUCzl2KvmRHnz2aaA?mode=gi_t';

export default function AccountScreen() {
  const safeTop = useSafeHeaderTop();
  const navigation = useNavigation<NavigationProp>();
  const { user, isAdmin, signOut } = useAuth();
  const [sellCount, setSellCount] = useState(0);
  const [tradeInValue, setTradeInValue] = useState(0);

  useEffect(() => {
    let active = true;
    api.tradeIn.getMyRequests().then((requests) => {
      if (!active) return;
      setSellCount(requests.length);
      setTradeInValue(requests.reduce((sum: number, item: any) => sum + Number(item.approved_amount ?? item.valuation_amount ?? 0), 0));
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  const handleSignOut = () => {
    confirmAction(
      'Sign Out',
      'Are you sure you want to sign out?',
      async () => {
        await signOut();
      },
      'Sign Out'
    );
  };

  return (
    <View style={[styles.container, { paddingTop: safeTop }]}>
      {/* Sleek Top Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Account</Text>
            <Text style={styles.headerSubtitle}>Manage orders, trade-ins & settings</Text>
          </View>
          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={styles.statusPillText}>Active</Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
      >
        {/* Luxury Hero Profile Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroGlow} />
          <View style={styles.heroTopRow}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatarCircle}>
                {user?.avatar_url ? (
                  <Image source={{ uri: user.avatar_url }} style={styles.avatarImg} resizeMode="cover" />
                ) : (
                  <Text style={styles.avatarText}>
                    {(user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U').toUpperCase()}
                  </Text>
                )}
              </View>
              <View style={styles.onlineBadge} />
            </View>

            <View style={styles.heroInfo}>
              <View style={styles.nameBadgeRow}>
                <Text style={styles.userName} numberOfLines={1}>
                  {user?.full_name || (user as any)?.user_metadata?.full_name || user?.email?.split('@')[0] || 'RenewX Member'}
                </Text>
              </View>
              <Text style={styles.userEmail} numberOfLines={1}>
                {user?.email}
              </Text>
              {user?.phone ? (
                <Text style={styles.userPhone} numberOfLines={1}>
                  {user.phone}{user?.city ? ` • ${user.city}` : ''}
                </Text>
              ) : null}
              <View style={styles.badgeRow}>
                {isAdmin ? (
                  <View style={styles.adminBadge}>
                    <Ionicons name="shield-checkmark" size={11} color="#000000" />
                    <Text style={styles.adminBadgeText}>ADMINISTRATOR</Text>
                  </View>
                ) : (
                  <View style={styles.memberBadge}>
                    <Ionicons name="sparkles" size={11} color="#10b981" />
                    <Text style={styles.memberBadgeText}>VERIFIED MEMBER</Text>
                  </View>
                )}
              </View>
            </View>

            <TouchableOpacity
              style={styles.editProfileBtn}
              onPress={() => navigation.navigate('EditProfile')}
              activeOpacity={0.8}
            >
              <Ionicons name="create-outline" size={16} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Admin Quick Banner */}
        {isAdmin && (
          <TouchableOpacity
            style={styles.adminBanner}
            onPress={() => navigation.navigate('Admin')}
            activeOpacity={0.88}
          >
            <View style={styles.adminBannerIcon}>
              <Ionicons name="shield-half" size={20} color="#000000" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.adminBannerTitle}>Admin Control Center</Text>
              <Text style={styles.adminBannerSub}>Manage inventory, trade-ins, orders & users</Text>
            </View>
            <View style={styles.adminBannerArrow}>
              <Ionicons name="arrow-forward" size={14} color="#000000" />
            </View>
          </TouchableOpacity>
        )}

        {/* Quick Stats Grid */}
        <View style={styles.statsCard}>
          <TouchableOpacity
            style={styles.statCell}
            onPress={() => navigation.navigate('MySellRequests')}
            activeOpacity={0.75}
          >
            <View style={styles.statIconBox}>
              <Ionicons name="repeat-outline" size={18} color="#f59e0b" />
            </View>
            <View>
              <Text style={styles.statNumber}>{sellCount}</Text>
              <Text style={styles.statLabel}>Trade-in Requests</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.statDivider} />

          <View style={styles.statCell}>
            <View style={styles.statIconBox}>
              <Ionicons name="wallet-outline" size={18} color="#10b981" />
            </View>
            <View>
              <Text style={styles.statNumber}>₹{tradeInValue.toLocaleString('en-IN')}</Text>
              <Text style={styles.statLabel}>Estimated Valuation</Text>
            </View>
          </View>
        </View>

        {/* Group 1: Activity & Orders */}
        <Text style={styles.groupHeading}>Activity & Orders</Text>
        <View style={styles.cardGroup}>
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Track' } as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconWrap, { backgroundColor: '#eff6ff' }]}>
              <Ionicons name="cube" size={18} color="#2563eb" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>My Orders & Invoices</Text>
              <Text style={styles.menuSub}>Live tracking, delivery status & history</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
          </TouchableOpacity>

          <View style={styles.rowSeparator} />

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => navigation.navigate('MySellRequests')}
            activeOpacity={0.7}
          >
            <View style={[styles.iconWrap, { backgroundColor: '#fef3c7' }]}>
              <Ionicons name="cash" size={18} color="#d97706" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>My Sell / Trade-in Requests</Text>
              <Text style={styles.menuSub}>Device valuations, pickup & payouts</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
          </TouchableOpacity>
        </View>

        {/* Group 2: Support & Community */}
        <Text style={styles.groupHeading}>Support & Community</Text>
        <View style={styles.cardGroup}>
          <TouchableOpacity
            style={styles.menuRow}
            onPress={async () => {
              try {
                await Linking.openURL(WHATSAPP_COMMUNITY_URL);
              } catch {
                Alert.alert('WhatsApp Community', 'Unable to open WhatsApp.');
              }
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.iconWrap, { backgroundColor: '#dcfce7' }]}>
              <Ionicons name="logo-whatsapp" size={18} color="#16a34a" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>WhatsApp Community</Text>
              <Text style={styles.menuSub}>Join members, deals & direct support</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
          </TouchableOpacity>

          <View style={styles.rowSeparator} />

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => Linking.openURL(`tel:${SUPPORT_PHONE}`).catch(() =>
              Alert.alert('Customer Helpline', 'Unable to open phone dialer.')
            )}
            activeOpacity={0.7}
          >
            <View style={[styles.iconWrap, { backgroundColor: '#f1f5f9' }]}>
              <Ionicons name="call" size={18} color="#0f172a" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Customer Helpline</Text>
              <Text style={styles.menuSub}>+91 90801 68778 (Mon–Sat)</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
          </TouchableOpacity>

          <View style={styles.rowSeparator} />

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => navigation.navigate('Notifications')}
            activeOpacity={0.7}
          >
            <View style={[styles.iconWrap, { backgroundColor: '#fae8ff' }]}>
              <Ionicons name="notifications" size={18} color="#a855f7" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Notifications</Text>
              <Text style={styles.menuSub}>Order updates and special arrival alerts</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
          </TouchableOpacity>
        </View>

        {/* Group 3: Account & Security */}
        <Text style={styles.groupHeading}>Security & Preferences</Text>
        <View style={styles.cardGroup}>
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => navigation.navigate('EditProfile')}
            activeOpacity={0.7}
          >
            <View style={[styles.iconWrap, { backgroundColor: '#ecfdf5' }]}>
              <Ionicons name="person" size={18} color="#059669" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Edit Personal Details</Text>
              <Text style={styles.menuSub}>Full name, profile image & email</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
          </TouchableOpacity>

          <View style={styles.rowSeparator} />

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => navigation.navigate('Security' as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconWrap, { backgroundColor: '#f0fdf4' }]}>
              <Ionicons name="shield-checkmark" size={18} color="#16a34a" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Password & Security</Text>
              <Text style={styles.menuSub}>Change password & security credentials</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
          </TouchableOpacity>

          <View style={styles.rowSeparator} />

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => navigation.navigate('Settings')}
            activeOpacity={0.7}
          >
            <View style={[styles.iconWrap, { backgroundColor: '#f1f5f9' }]}>
              <Ionicons name="settings-sharp" size={18} color="#475569" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>App Settings</Text>
              <Text style={styles.menuSub}>Preferences, cache & system diagnostics</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
          </TouchableOpacity>
        </View>

        {/* Sign Out Card */}
        <TouchableOpacity style={styles.signOutCard} onPress={handleSignOut} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={19} color="#dc2626" />
          <Text style={styles.signOutCardText}>Sign Out of Account</Text>
        </TouchableOpacity>

        {/* Discreet Footer */}
        <View style={styles.footerContainer}>
          <Text style={styles.footerBrand}>RenewX Crew Mobile</Text>
          <Text style={styles.footerVersion}>Version 2.4.0 • Certified Tested Tech</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f7f2',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#ebe7dd',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 24,
    color: '#0f172a',
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  statusPillText: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: '#047857',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  heroCard: {
    backgroundColor: '#0f172a',
    borderRadius: 22,
    padding: 20,
    marginBottom: 14,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  heroGlow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 196, 0, 0.12)',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ffc400',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontFamily: fontFamily.bold,
    fontSize: 22,
    color: '#000000',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#0f172a',
  },
  heroInfo: {
    flex: 1,
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    fontFamily: fontFamily.bold,
    fontSize: 17,
    color: '#ffffff',
    letterSpacing: -0.2,
  },
  userEmail: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
    marginBottom: 8,
  },
  userPhone: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: '#cbd5e1',
    marginTop: -4,
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffc400',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  adminBadgeText: {
    fontFamily: fontFamily.bold,
    fontSize: 9,
    color: '#000000',
    letterSpacing: 0.5,
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  memberBadgeText: {
    fontFamily: fontFamily.semibold,
    fontSize: 9,
    color: '#34d399',
    letterSpacing: 0.5,
  },
  editProfileBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffc400',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  adminBannerIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminBannerTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: '#000000',
  },
  adminBannerSub: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: '#334155',
    marginTop: 1,
  },
  adminBannerArrow: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e8e4da',
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  statCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 8,
  },
  statIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    color: '#0f172a',
  },
  statLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#f1f5f9',
  },
  groupHeading: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginLeft: 6,
    marginBottom: 8,
  },
  cardGroup: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e8e4da',
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 13,
  },
  rowSeparator: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginLeft: 46,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 14,
    color: '#0f172a',
  },
  menuSub: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
  signOutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 4,
  },
  signOutCardText: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: '#dc2626',
  },
  footerContainer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 10,
  },
  footerBrand: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    color: '#64748b',
  },
  footerVersion: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
});

