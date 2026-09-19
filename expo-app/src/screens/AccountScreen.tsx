import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/App';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { user, isAdmin, signOut } = useAuth();

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Account & Profile</Text>
        <Text style={styles.headerSubtitle}>Manage your orders, devices and preferences</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
      >
        {/* User Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={styles.userName} numberOfLines={1}>
                {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'RenewX Member'}
              </Text>
              {isAdmin && (
                <View style={styles.adminBadge}>
                  <Ionicons name="shield-checkmark" size={10} color="#000000" />
                  <Text style={styles.adminBadgeText}>ADMIN</Text>
                </View>
              )}
            </View>
            <Text style={styles.userEmail} numberOfLines={1}>
              {user?.email}
            </Text>
            <View style={styles.verifiedRow}>
              <Ionicons name="checkmark-circle" size={12} color="#059669" />
              <Text style={styles.verifiedText}>Verified Member • Premium 1-Yr Warranty</Text>
            </View>
          </View>
        </View>

        {/* Admin Panel Quick Jump */}
        {isAdmin && (
          <TouchableOpacity
            style={styles.adminActionCard}
            onPress={() => navigation.navigate('Admin')}
            activeOpacity={0.85}
          >
            <View style={styles.adminIconBox}>
              <Ionicons name="shield" size={20} color="#000000" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.adminCardTitle}>Admin Control Center</Text>
              <Text style={styles.adminCardSub}>
                Manage products, inventory, users & roles
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#000000" />
          </TouchableOpacity>
        )}

        {/* Quick Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>3</Text>
            <Text style={styles.statLabel}>Orders Placed</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>₹38,500</Text>
            <Text style={styles.statLabel}>Trade-in Value</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>12 Mo</Text>
            <Text style={styles.statLabel}>Warranty Active</Text>
          </View>
        </View>

        {/* Account Menu Items */}
        <View style={styles.menuSection}>
          <Text style={styles.menuHeader}>Orders & Devices</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Track' } as any)}
          >
            <View style={styles.menuIconCircle}>
              <Ionicons name="cube-outline" size={18} color="#374151" />
            </View>
            <Text style={styles.menuTitle}>My Orders & Invoices</Text>
            <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Sell' } as any)}
          >
            <View style={styles.menuIconCircle}>
              <Ionicons name="cash-outline" size={18} color="#374151" />
            </View>
            <Text style={styles.menuTitle}>My Sell / Trade-in Requests</Text>
            <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => Alert.alert('Warranty', 'All your purchases come with 12 months comprehensive warranty.')}
          >
            <View style={styles.menuIconCircle}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#374151" />
            </View>
            <Text style={styles.menuTitle}>Warranty Certificates</Text>
            <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        {/* Support & Concierge */}
        <View style={styles.menuSection}>
          <Text style={styles.menuHeader}>Support & Concierge</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => Linking.openURL('https://wa.me/919876543210?text=Hello%20RenewX%20Support')}
          >
            <View style={[styles.menuIconCircle, { backgroundColor: '#dcfce7' }]}>
              <Ionicons name="logo-whatsapp" size={18} color="#15803d" />
            </View>
            <Text style={styles.menuTitle}>WhatsApp VIP Concierge</Text>
            <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => Linking.openURL('tel:+919876543210')}
          >
            <View style={[styles.menuIconCircle, { backgroundColor: '#f1f5f9' }]}>
              <Ionicons name="call-outline" size={18} color="#0f172a" />
            </View>
            <Text style={styles.menuTitle}>Customer Helpline (Toll-free)</Text>
            <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={18} color="#ef4444" />
          <Text style={styles.signOutText}>Sign Out of Account</Text>
        </TouchableOpacity>

        <Text style={styles.versionFooter}>RenewX Native Mobile App • Version 2.4.0</Text>
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
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ebe7dd',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e8e4da',
    marginBottom: 14,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#ffc400',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#000000',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#ffc400',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  adminBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#000000',
  },
  userEmail: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  verifiedText: {
    fontSize: 10,
    color: '#059669',
    fontWeight: '600',
  },
  adminActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffc400',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  adminIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000000',
  },
  adminCardSub: {
    fontSize: 11,
    color: '#334155',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e8e4da',
  },
  statNumber: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
  },
  statLabel: {
    fontSize: 10,
    color: '#6b7280',
    fontWeight: '600',
    marginTop: 2,
  },
  menuSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#e8e4da',
    marginBottom: 16,
  },
  menuHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 6,
    paddingTop: 10,
    paddingBottom: 6,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  menuIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fee2e2',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  signOutText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#b91c1c',
  },
  versionFooter: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 20,
  },
});
