import React, { useCallback, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import type { RootStackParamList } from '@/App';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { useSafeHeaderTop } from '@/lib/useSafeHeaderTop';
import { useLocation } from '@/context/LocationContext';
import RenewXLogo from '@/components/RenewXLogo';
import HomeHeader from '@/components/HomeHeader';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SettingsScreen() {
  const safeTop = useSafeHeaderTop();
  const navigation = useNavigation<NavigationProp>();
  const { user, signOut } = useAuth();
  const { totalItems } = useCart();
  const toast = useToast();

  // User display name & email
  const userName =
    (user as any)?.name ||
    user?.full_name ||
    (user?.email ? user.email.split('@')[0] : 'RenewX Member');
  const userEmail = user?.email || '';

  // Preferences toggles
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const { location, setLocationManually, detectLocation, isDetecting } = useLocation();

  // Modals state
  const [activeModal, setActiveModal] = useState<
    'language' | 'location' | 'address' | 'payment' | 'help' | 'contact' | 'terms' | null
  >(null);

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('MainTabs', { screen: 'Account' });
  }, [navigation]);

  const handleLogout = useCallback(() => {
    Alert.alert('Log Out', 'Are you sure you want to log out of your RenewX account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
            toast.show('Logged out successfully');
          } catch {
            toast.error('Failed to log out. Please try again.');
          }
        },
      },
    ]);
  }, [signOut, toast]);

  return (
    <View style={styles.screenContainer}>
      {/* 1. Top Bar */}
      <HomeHeader
        mode="standard"
        title="Settings"
        onBack={handleBack}
        onNotifications={() => navigation.navigate('Notifications')}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Title & Subtitle */}
        <View style={styles.titleSection}>
          <Text style={styles.pageTitle}>Settings</Text>
          <Text style={styles.pageSubtitle}>Manage your account and app preferences</Text>
        </View>

        {/* 3. User Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person-outline" size={24} color="#0F172A" />
          </View>

          <View style={styles.profileInfoCol}>
            <Text style={styles.profileName} numberOfLines={1}>
              {userName}
            </Text>
            <Text style={styles.profileEmail} numberOfLines={1}>
              {userEmail}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.editProfileBtn}
            onPress={() => navigation.navigate('EditProfile')}
            activeOpacity={0.8}
          >
            <Ionicons name="pencil-outline" size={13} color="#0F172A" />
            <Text style={styles.editProfileBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* 4. Section: Account */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeaderTitle}>Account</Text>

          <View style={styles.cardContainer}>
            {/* Personal Information */}
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => navigation.navigate('EditProfile')}
              activeOpacity={0.7}
            >
              <View style={styles.menuIconBox}>
                <Ionicons name="person-outline" size={20} color="#0F172A" />
              </View>
              <View style={styles.menuTextCol}>
                <Text style={styles.menuItemTitle}>Personal Information</Text>
                <Text style={styles.menuItemSubtitle}>Name, email, phone number</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Saved Addresses */}
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => navigation.navigate('ManageAddresses')}
              activeOpacity={0.7}
            >
              <View style={styles.menuIconBox}>
                <Ionicons name="location-outline" size={20} color="#0F172A" />
              </View>
              <View style={styles.menuTextCol}>
                <Text style={styles.menuItemTitle}>Saved Addresses</Text>
                <Text style={styles.menuItemSubtitle}>Manage your delivery addresses</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Payment Methods */}
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => setActiveModal('payment')}
              activeOpacity={0.7}
            >
              <View style={styles.menuIconBox}>
                <Ionicons name="card-outline" size={20} color="#0F172A" />
              </View>
              <View style={styles.menuTextCol}>
                <Text style={styles.menuItemTitle}>Payment Methods</Text>
                <Text style={styles.menuItemSubtitle}>Manage cards and UPI</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* My Orders */}
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => navigation.navigate('MainTabs', { screen: 'Track' })}
              activeOpacity={0.7}
            >
              <View style={styles.menuIconBox}>
                <Ionicons name="cube-outline" size={20} color="#0F172A" />
              </View>
              <View style={styles.menuTextCol}>
                <Text style={styles.menuItemTitle}>My Orders</Text>
                <Text style={styles.menuItemSubtitle}>View and track your orders</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* My Wishlist */}
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => navigation.navigate('Wishlist')}
              activeOpacity={0.7}
            >
              <View style={styles.menuIconBox}>
                <Ionicons name="heart-outline" size={20} color="#0F172A" />
              </View>
              <View style={styles.menuTextCol}>
                <Text style={styles.menuItemTitle}>My Wishlist</Text>
                <Text style={styles.menuItemSubtitle}>View your saved devices</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 5. Section: Preferences */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeaderTitle}>Preferences</Text>

          <View style={styles.cardContainer}>
            {/* Notifications */}
            <View style={styles.menuRow}>
              <View style={styles.menuIconBox}>
                <Ionicons name="notifications-outline" size={20} color="#0F172A" />
              </View>
              <View style={styles.menuTextCol}>
                <Text style={styles.menuItemTitle}>Notifications</Text>
                <Text style={styles.menuItemSubtitle}>Order updates, offers and more</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={(val) => {
                  setNotificationsEnabled(val);
                  toast.show(val ? 'Notifications enabled' : 'Notifications muted');
                }}
                trackColor={{ false: '#E2E8F0', true: '#FACC15' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.divider} />

            {/* Dark Mode */}
            <View style={styles.menuRow}>
              <View style={styles.menuIconBox}>
                <Ionicons name="moon-outline" size={20} color="#0F172A" />
              </View>
              <View style={styles.menuTextCol}>
                <Text style={styles.menuItemTitle}>Dark Mode</Text>
                <Text style={styles.menuItemSubtitle}>Switch between light and dark theme</Text>
              </View>
              <Switch
                value={darkModeEnabled}
                onValueChange={(val) => {
                  setDarkModeEnabled(val);
                  toast.show(val ? 'Dark mode enabled' : 'Light mode enabled');
                }}
                trackColor={{ false: '#E2E8F0', true: '#FACC15' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.divider} />

            {/* Language */}
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => setActiveModal('language')}
              activeOpacity={0.7}
            >
              <View style={styles.menuIconBox}>
                <Ionicons name="globe-outline" size={20} color="#0F172A" />
              </View>
              <View style={styles.menuTextCol}>
                <Text style={styles.menuItemTitle}>Language</Text>
                <Text style={styles.menuItemSubtitle}>Choose your preferred language</Text>
              </View>
              <View style={styles.menuRightInfoRow}>
                <Text style={styles.menuRightInfoText}>{selectedLanguage}</Text>
                <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
              </View>
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Location */}
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => setActiveModal('location')}
              activeOpacity={0.7}
            >
              <View style={styles.menuIconBox}>
                <Ionicons name="location-outline" size={20} color="#0F172A" />
              </View>
              <View style={styles.menuTextCol}>
                <Text style={styles.menuItemTitle}>Location</Text>
                <Text style={styles.menuItemSubtitle}>Set your default location</Text>
              </View>
              <View style={styles.menuRightInfoRow}>
                <Text style={styles.menuRightInfoText}>{location || 'Not set'}</Text>
                <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* 6. Section: About & Legal */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeaderTitle}>About & Legal</Text>

          <View style={styles.cardContainer}>
            {/* About RenewX */}
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => navigation.navigate('AboutRenewX', { tab: 'aboutUs' })}
              activeOpacity={0.7}
            >
              <View style={styles.menuIconBox}>
                <Ionicons name="information-circle-outline" size={20} color="#0F172A" />
              </View>
              <View style={styles.menuTextCol}>
                <Text style={styles.menuItemTitle}>About RenewX</Text>
                <Text style={styles.menuItemSubtitle}>Our story, mission & quality standards</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* How It Works */}
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => navigation.navigate('AboutRenewX', { tab: 'howItWorks' })}
              activeOpacity={0.7}
            >
              <View style={styles.menuIconBox}>
                <Ionicons name="sync-circle-outline" size={20} color="#0F172A" />
              </View>
              <View style={styles.menuTextCol}>
                <Text style={styles.menuItemTitle}>How It Works</Text>
                <Text style={styles.menuItemSubtitle}>Inspection, valuation & ordering guides</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Terms & Policies */}
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => navigation.navigate('AboutRenewX', { tab: 'terms' })}
              activeOpacity={0.7}
            >
              <View style={styles.menuIconBox}>
                <Ionicons name="document-text-outline" size={20} color="#0F172A" />
              </View>
              <View style={styles.menuTextCol}>
                <Text style={styles.menuItemTitle}>Terms & Policies</Text>
                <Text style={styles.menuItemSubtitle}>Terms of Service, As-Is Sales & Rules</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Privacy Policy */}
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => navigation.navigate('AboutRenewX', { tab: 'privacy' })}
              activeOpacity={0.7}
            >
              <View style={styles.menuIconBox}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#0F172A" />
              </View>
              <View style={styles.menuTextCol}>
                <Text style={styles.menuItemTitle}>Privacy Policy</Text>
                <Text style={styles.menuItemSubtitle}>Data protection & privacy practices</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Contact Support */}
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => navigation.navigate('AboutRenewX', { tab: 'contact' })}
              activeOpacity={0.7}
            >
              <View style={styles.menuIconBox}>
                <Ionicons name="chatbubble-ellipses-outline" size={20} color="#0F172A" />
              </View>
              <View style={styles.menuTextCol}>
                <Text style={styles.menuItemTitle}>Contact Support</Text>
                <Text style={styles.menuItemSubtitle}>Call, WhatsApp or Email our team</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 7. Log Out Card */}
        <TouchableOpacity
          style={styles.logoutCard}
          onPress={handleLogout}
          activeOpacity={0.85}
        >
          <View style={styles.logoutLeftRow}>
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <Text style={styles.logoutText}>Log Out</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#EF4444" />
        </TouchableOpacity>
      </ScrollView>

      {/* Info Modals */}
      <Modal
        visible={!!activeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveModal(null)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setActiveModal(null)}
        >
          <View style={styles.modalCard}>
            {activeModal === 'language' && (
              <>
                <Text style={styles.modalTitle}>Choose Language</Text>
                {['English', 'Hindi (हिंदी)', 'Kannada (ಕನ್ನಡ)', 'Tamil (தமிழ்)'].map((lang) => (
                  <TouchableOpacity
                    key={lang}
                    style={styles.modalOption}
                    onPress={() => {
                      setSelectedLanguage(lang.split(' ')[0]);
                      setActiveModal(null);
                      toast.show(`Language changed to ${lang.split(' ')[0]}`);
                    }}
                  >
                    <Text style={styles.modalOptionText}>{lang}</Text>
                    {selectedLanguage === lang.split(' ')[0] && (
                      <Ionicons name="checkmark" size={18} color="#F59E0B" />
                    )}
                  </TouchableOpacity>
                ))}
              </>
            )}

            {activeModal === 'location' && (
              <>
                <Text style={styles.modalTitle}>Select Delivery Location</Text>
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#FEF9C3',
                    borderWidth: 1,
                    borderColor: '#FACC15',
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 12,
                    gap: 10,
                  }}
                  onPress={async () => {
                    toast.detecting('Please wait, this may take a few seconds.', 'Detecting your location...');
                    const res = await detectLocation();
                    if (res) {
                      const formatted = res.replace(/\s*-\s*/g, ' • ');
                      toast.success(formatted, 'Location updated');
                      setActiveModal(null);
                    } else {
                      toast.permission('Allow location access to detect your district and pincode.', 'Location permission required');
                    }
                  }}
                  disabled={isDetecting}
                >
                  <Ionicons name="locate" size={20} color="#0F172A" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
                      {isDetecting ? 'Detecting GPS location...' : 'Use Current Location'}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#713F12' }}>
                      Auto-detect area and pincode
                    </Text>
                  </View>
                </TouchableOpacity>

                {[
                  'Bangalore - 560004',
                  'Indiranagar - 560038',
                  'Koramangala - 560034',
                  'Mumbai - 400001',
                  'Delhi NCR - 110001',
                  'Hyderabad - 500001',
                  'Chennai - 600001',
                  'Pune - 411001',
                ].map((loc) => (
                  <TouchableOpacity
                    key={loc}
                    style={styles.modalOption}
                    onPress={() => {
                      setLocationManually(loc);
                      setActiveModal(null);
                      const formatted = loc.replace(/\s*-\s*/g, ' • ');
                      toast.manual(formatted, 'Location saved');
                    }}
                  >
                    <Text style={styles.modalOptionText}>{loc}</Text>
                    {location === loc && (
                      <Ionicons name="checkmark" size={18} color="#F59E0B" />
                    )}
                  </TouchableOpacity>
                ))}
              </>
            )}

            {activeModal === 'address' && (
              <>
                <Text style={styles.modalTitle}>Saved Addresses</Text>
                <Text style={styles.modalBodyText}>
                  {user?.address
                    ? `Default: ${user.address}${user.pincode ? ` - ${user.pincode}` : ''}`
                    : 'No saved address found. You can set your delivery address in your profile.'}
                </Text>
                <TouchableOpacity
                  style={styles.modalPrimaryBtn}
                  onPress={() => {
                    setActiveModal(null);
                    navigation.navigate('ManageAddresses');
                  }}
                >
                  <Text style={styles.modalPrimaryBtnText}>Manage Addresses</Text>
                </TouchableOpacity>
              </>
            )}

            {activeModal === 'payment' && (
              <>
                <Text style={styles.modalTitle}>Payment Methods</Text>
                <Text style={styles.modalBodyText}>
                  UPI (GPay / PhonePe / Paytm), Credit & Debit Cards, NetBanking, and Cash on Delivery.
                </Text>
                <TouchableOpacity
                  style={styles.modalPrimaryBtn}
                  onPress={() => setActiveModal(null)}
                >
                  <Text style={styles.modalPrimaryBtnText}>Close</Text>
                </TouchableOpacity>
              </>
            )}

            {activeModal === 'help' && (
              <>
                <Text style={styles.modalTitle}>RenewX Help Center</Text>
                <Text style={styles.modalBodyText}>
                  All pre-owned devices pass rigorous functional testing before dispatch. Products are sold as-is with no warranty or return provided in our service.
                </Text>
                <TouchableOpacity
                  style={styles.modalPrimaryBtn}
                  onPress={() => setActiveModal(null)}
                >
                  <Text style={styles.modalPrimaryBtnText}>Got it</Text>
                </TouchableOpacity>
              </>
            )}

            {activeModal === 'contact' && (
              <>
                <Text style={styles.modalTitle}>Contact Support</Text>
                <Text style={styles.modalBodyText}>
                  Email: support@renewx.in{'\n'}Phone: +91 800-456-7890{'\n'}Hours: 9 AM - 9 PM IST (Mon-Sun)
                </Text>
                <TouchableOpacity
                  style={styles.modalPrimaryBtn}
                  onPress={() => setActiveModal(null)}
                >
                  <Text style={styles.modalPrimaryBtnText}>Close</Text>
                </TouchableOpacity>
              </>
            )}

            {activeModal === 'terms' && (
              <>
                <Text style={styles.modalTitle}>Terms & Policies</Text>
                <Text style={styles.modalBodyText}>
                  RenewX ensures complete transparent grading (Like New, Excellent, Good), encrypted checkout, and instant trade-in cash settlements.
                </Text>
                <TouchableOpacity
                  style={styles.modalPrimaryBtn}
                  onPress={() => setActiveModal(null)}
                >
                  <Text style={styles.modalPrimaryBtnText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 8. Bottom Navigation Bar matching Mockup */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.bottomTabItem}
          onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}
          activeOpacity={0.8}
        >
          <Ionicons name="home-outline" size={22} color="#64748B" />
          <Text style={styles.bottomTabLabel}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bottomTabItem}
          onPress={() => navigation.navigate('MainTabs', { screen: 'Shop' })}
          activeOpacity={0.8}
        >
          <Ionicons name="grid-outline" size={22} color="#64748B" />
          <Text style={styles.bottomTabLabel}>Categories</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bottomTabItem}
          onPress={() => navigation.navigate('MainTabs', { screen: 'Track' })}
          activeOpacity={0.8}
        >
          <Ionicons name="cube-outline" size={22} color="#64748B" />
          <Text style={styles.bottomTabLabel}>Orders</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bottomTabItem}
          onPress={() => navigation.navigate('Wishlist')}
          activeOpacity={0.8}
        >
          <Ionicons name="heart-outline" size={22} color="#64748B" />
          <Text style={styles.bottomTabLabel}>Wishlist</Text>
        </TouchableOpacity>

        {/* Active Profile Pill */}
        <View style={styles.bottomActiveTabPill}>
          <Ionicons name="person" size={19} color="#0F172A" />
          <Text style={styles.bottomActiveTabLabel}>Profile</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  /* Top Bar */
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 6,
    right: 7,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  cartBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FACC15',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  cartBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0F172A',
  },

  /* Content */
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 110,
  },
  titleSection: {
    marginBottom: 14,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },

  /* Profile Card */
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    padding: 14,
    marginBottom: 20,
    gap: 12,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEF08A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfoCol: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  profileEmail: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  editProfileBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },

  /* Section Blocks */
  sectionBlock: {
    marginBottom: 20,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  menuIconBox: {
    width: 32,
    alignItems: 'flex-start',
  },
  menuTextCol: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  menuItemSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginLeft: 46,
  },
  menuRightInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  menuRightInfoText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },

  /* Logout Card */
  logoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 16,
    padding: 16,
    marginTop: 4,
    marginBottom: 20,
  },
  logoutLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#EF4444',
  },

  /* Modals */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  modalBodyText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
    marginBottom: 16,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  modalOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  modalPrimaryBtn: {
    backgroundColor: '#FACC15',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalPrimaryBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },

  /* Bottom Navigation Bar */
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 78 : 64,
    paddingBottom: Platform.OS === 'ios' ? 18 : 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  bottomTabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  bottomTabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  bottomActiveTabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF08A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  bottomActiveTabLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
});
