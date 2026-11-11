import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Platform,
  Dimensions,
  TextInput,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeHeaderTop } from '@/lib/useSafeHeaderTop';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useLocation } from '@/context/LocationContext';
import { useNotifications } from '@/context/NotificationContext';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import RenewXLogo from '@/components/RenewXLogo';
import { renewxColors, renewxShadows, renewxTextStyle } from '@/design-system';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface CategoryCardItem {
  id: string;
  title: string;
  deviceCount: string;
  image: any;
  isLocal: boolean;
  arrowBg: string;
  arrowColor: string;
  accentBorder?: boolean;
  bgTint?: string;
}

const CATEGORIES: CategoryCardItem[] = [
  {
    id: 'Smartphones',
    title: 'Smartphones',
    deviceCount: '250+ devices',
    image: { uri: 'https://pngimg.com/uploads/iphone_14/iphone_14_PNG21.png' },
    isLocal: false,
    arrowBg: renewxColors.yellowLight,
    arrowColor: renewxColors.black,
    accentBorder: true,
    bgTint: renewxColors.yellowSoft,
  },
  {
    id: 'Laptops',
    title: 'Laptops',
    deviceCount: '120+ devices',
    image: { uri: 'https://pngimg.com/uploads/macbook/macbook_PNG65.png' },
    isLocal: false,
    arrowBg: '#E0F2FE',
    arrowColor: '#0369A1',
  },
  {
    id: 'Tablets',
    title: 'Tablets',
    deviceCount: '80+ devices',
    image: { uri: 'https://pngimg.com/uploads/tablet/tablet_PNG8578.png' },
    isLocal: false,
    arrowBg: '#E0F2FE',
    arrowColor: '#0369A1',
  },
  {
    id: 'Smartwatches',
    title: 'Smartwatches',
    deviceCount: '60+ devices',
    image: { uri: 'https://pngimg.com/uploads/apple_watch/apple_watch_PNG18.png' },
    isLocal: false,
    arrowBg: '#FFE4E6',
    arrowColor: '#BE123C',
  },
  {
    id: 'Earbuds',
    title: 'Earbuds',
    deviceCount: '100+ devices',
    image: { uri: 'https://pngimg.com/uploads/airPods/airPods_PNG11.png' },
    isLocal: false,
    arrowBg: renewxColors.mint,
    arrowColor: renewxColors.emerald,
  },
  {
    id: 'Accessories',
    title: 'Accessories',
    deviceCount: '200+ devices',
    image: { uri: 'https://pngimg.com/uploads/usb_cable/usb_cable_PNG64.png' },
    isLocal: false,
    arrowBg: '#EDE9FE',
    arrowColor: '#6D28D9',
  },
  {
    id: 'Gaming',
    title: 'Gaming',
    deviceCount: '50+ devices',
    image: { uri: 'https://pngimg.com/uploads/gamepad/small/gamepad_PNG79.png' },
    isLocal: false,
    arrowBg: '#FFE4E6',
    arrowColor: '#BE123C',
  },
  {
    id: 'Cameras',
    title: 'Cameras',
    deviceCount: '40+ devices',
    image: { uri: 'https://pngimg.com/uploads/photo_camera/photo_camera_PNG101644.png' },
    isLocal: false,
    arrowBg: '#FEF3C7',
    arrowColor: '#B45309',
  },
];

export default function CategoriesScreen() {
  const safeTop = useSafeHeaderTop();
  const navigation = useNavigation<any>();
  const { totalItems } = useCart();
  const { totalWishlistItems } = useWishlist();
  const { location, area, pincode, detectLocation, setLocationManually, isDetecting } = useLocation();
  const { unreadCount } = useNotifications();
  const { user } = useAuth();
  const toast = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [showLocModal, setShowLocModal] = useState(false);
  const [pincodeInput, setPincodeInput] = useState('');

  const displayLocation = location || (area && pincode ? `${area} - ${pincode}` : 'Vellore - 632012');

  const handleUseMyLocation = async () => {
    try {
      toast.detecting('Detecting your location...', 'Please wait');
      const res = await detectLocation();
      if (res) {
        toast.success(res.replace(/\s*-\s*/g, ' • '), 'Location updated');
        setShowLocModal(false);
      } else {
        toast.permission('Allow location permission to auto-detect your delivery address.', 'Permission required');
        setShowLocModal(true);
      }
    } catch {
      toast.error('Could not detect location. Please enter pincode.');
      setShowLocModal(true);
    }
  };

  const handleApplyPincode = (overridePin?: string) => {
    const pin = (overridePin || pincodeInput).trim();
    if (pin.length !== 6 || isNaN(Number(pin))) {
      toast.error('Please enter a valid 6-digit pincode');
      return;
    }
    const newLoc = `Delivery Area - ${pin}`;
    setLocationManually(newLoc, { pincode: pin });
    toast.success(`Delivery Area • ${pin}`, 'Location saved');
    setPincodeInput('');
    setShowLocModal(false);
  };

  const handleQuickSelectCity = (city: string, pin: string) => {
    const newLoc = `${city} - ${pin}`;
    setLocationManually(newLoc, { city, district: city, pincode: pin });
    toast.success(`${city} • ${pin}`, 'Location saved');
    setShowLocModal(false);
  };

  const handleCategoryPress = (catId: string) => {
    try {
      navigation.navigate('Shop', {
        category: catId,
        _t: Date.now(),
      });
    } catch {
      navigation.navigate('MainTabs', {
        screen: 'Shop',
        params: { category: catId, _t: Date.now() },
      });
    }

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        const nextUrl = `/shop?category=${encodeURIComponent(catId)}`;
        window.history.pushState({}, '', nextUrl);
      } catch {}
    }
  };

  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      try {
        navigation.navigate('Shop', {
          search: searchQuery.trim(),
          _t: Date.now(),
        });
      } catch {
        navigation.navigate('MainTabs', {
          screen: 'Shop',
          params: { search: searchQuery.trim(), _t: Date.now() },
        });
      }

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        try {
          const nextUrl = `/shop?search=${encodeURIComponent(searchQuery.trim())}`;
          window.history.pushState({}, '', nextUrl);
        } catch {}
      }
    } else {
      navigation.navigate('Search');
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. TOP HEADER ROW */}
      <View style={[styles.headerContainer, { paddingTop: Math.max(safeTop, 12) + 6 }]}>
        <View style={styles.topRow}>
          <RenewXLogo size="md" showTagline={true} />

          <View style={styles.topRightIcons}>
            {/* Green Shield Button */}
            <TouchableOpacity
              style={styles.greenShieldBtn}
              activeOpacity={0.8}
              onPress={() => toast.info('Certified Pre-Owned Platform', 'RenewX Verified')}
              accessibilityLabel="RenewX Verified Shield"
            >
              <Ionicons name="shield-checkmark" size={17} color={renewxColors.emerald} />
            </TouchableOpacity>

            {/* Notification Bell with Unread Badge */}
            <TouchableOpacity
              style={styles.circleIconBtn}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Notifications')}
              accessibilityLabel="Notifications"
            >
              <Ionicons name="notifications-outline" size={19} color={renewxColors.black} />
              {unreadCount > 0 && (
                <View style={styles.redBadge}>
                  <Text style={styles.redBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Wishlist Heart */}
            <TouchableOpacity
              style={styles.circleIconBtn}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Wishlist')}
              accessibilityLabel="Wishlist"
            >
              <Ionicons name="heart-outline" size={19} color={renewxColors.black} />
              {totalWishlistItems > 0 && (
                <View style={styles.yellowCountBadge}>
                  <Text style={styles.yellowCountBadgeText}>{totalWishlistItems}</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Account / Profile Circle */}
            <TouchableOpacity
              style={styles.circleIconBtn}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('MainTabs', { screen: 'Account' })}
              accessibilityLabel="Profile"
            >
              <Ionicons name="person-outline" size={18} color={renewxColors.black} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. LOCATION ROW */}
        <View style={styles.locationRow}>
          <TouchableOpacity
            style={styles.locationPill}
            onPress={() => setShowLocModal(true)}
            activeOpacity={0.8}
            accessibilityLabel="Change delivery location"
          >
            <Ionicons name="location-sharp" size={15} color={renewxColors.emerald} style={{ marginRight: 5 }} />
            <Text style={styles.locationText} numberOfLines={1}>
              {displayLocation}
            </Text>
            <Ionicons name="chevron-down" size={13} color={renewxColors.black} style={{ marginLeft: 3 }} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.useLocationBtn}
            activeOpacity={0.85}
            disabled={isDetecting}
            onPress={handleUseMyLocation}
            accessibilityLabel="Use current location"
          >
            {isDetecting ? (
              <ActivityIndicator size="small" color="#0F172A" style={{ marginRight: 6 }} />
            ) : (
              <Ionicons name="locate" size={14} color="#0F172A" style={{ marginRight: 5 }} />
            )}
            <Text style={styles.useLocationText}>Use my location</Text>
          </TouchableOpacity>
        </View>

        {/* 3. SEARCH BAR */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={19} color="#64748B" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search categories, products, brands..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
          />
          <TouchableOpacity
            onPress={() => toast.info('Voice search activated')}
            style={styles.searchActionBtn}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
          >
            <Ionicons name="mic-outline" size={20} color="#0F172A" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('Cart')}
            style={styles.searchActionBtn}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
          >
            <Ionicons name="cart-outline" size={20} color="#0F172A" />
            {totalItems > 0 && (
              <View style={styles.cartIconBadge}>
                <Text style={styles.cartIconBadgeText}>{totalItems}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* 4. MAIN SCROLLABLE CONTENT */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.titleText}>Categories</Text>
          <Text style={styles.subtitleText}>Find the right device for your needs</Text>
        </View>

        {/* 8 Category Cards 2-Column Grid */}
        <View style={styles.gridContainer}>
          {CATEGORIES.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.categoryCard,
                item.accentBorder && styles.cardAccentBorder,
                item.bgTint ? { backgroundColor: item.bgTint } : null,
              ]}
              activeOpacity={0.88}
              onPress={() => handleCategoryPress(item.id)}
            >
              {/* Left Column of Card: Title, Device Count, Arrow Button */}
              <View style={styles.cardLeftCol}>
                <View>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardCount}>{item.deviceCount}</Text>
                </View>

                <View style={[styles.arrowCircle, { backgroundColor: item.arrowBg }]}>
                  <Ionicons name="arrow-forward" size={14} color={item.arrowColor} />
                </View>
              </View>

              {/* Right Column of Card: Product Image */}
              <View style={styles.cardImageContainer}>
                <Image
                  source={item.image}
                  style={styles.cardImage}
                  resizeMode="contain"
                />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* 5. LOCATION DETECTION & PICKER MODAL */}
      <Modal
        visible={showLocModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLocModal(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowLocModal(false)}
        >
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Delivery Location</Text>
                <Text style={styles.modalSubtitle}>
                  Enter pincode or use GPS for delivery & pickup estimates
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowLocModal(false)}
                style={styles.modalCloseBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* GPS Auto-Detect */}
            <TouchableOpacity
              style={styles.detectLocationCard}
              onPress={handleUseMyLocation}
              activeOpacity={0.85}
              disabled={isDetecting}
            >
              <View style={styles.detectIconCircle}>
                {isDetecting ? (
                  <ActivityIndicator size="small" color="#0F172A" />
                ) : (
                  <Ionicons name="navigate" size={18} color="#0F172A" />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detectTitle}>Use Current Location</Text>
                <Text style={styles.detectSub}>
                  {isDetecting ? 'Detecting via device GPS...' : 'Using GPS for accurate delivery estimate'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>

            {/* Pincode Input Box */}
            <View style={styles.pincodeBox}>
              <Ionicons name="keypad-outline" size={18} color="#64748B" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.pincodeInput}
                placeholder="Enter 6-digit Pincode"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                maxLength={6}
                value={pincodeInput}
                onChangeText={setPincodeInput}
                onSubmitEditing={() => handleApplyPincode()}
                returnKeyType="done"
              />
              <TouchableOpacity
                onPress={() => handleApplyPincode()}
                style={[
                  styles.applyPincodeBtn,
                  pincodeInput.trim().length === 6 && styles.applyPincodeBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.applyPincodeBtnText,
                    pincodeInput.trim().length === 6 && styles.applyPincodeBtnTextActive,
                  ]}
                >
                  Apply
                </Text>
              </TouchableOpacity>
            </View>

            {/* Saved Profile Address Quick-Select (if available) */}
            {Boolean(user?.address) && (
              <View style={styles.savedAddressQuickSection}>
                <Text style={styles.savedAddressQuickTitle}>SAVED PROFILE ADDRESS</Text>
                <TouchableOpacity
                  style={styles.savedAddressCard}
                  onPress={() => {
                    const formatted = user?.pincode ? `${user.address} - ${user.pincode}` : user.address;
                    setLocationManually(formatted, {
                      pincode: user?.pincode,
                      city: user?.city,
                    });
                    toast.success(user.address, 'Location updated');
                    setShowLocModal(false);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.savedAddressIconBox}>
                    <Ionicons name="home-outline" size={16} color="#0F172A" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.savedAddressText} numberOfLines={1}>
                      {user.address}
                    </Text>
                    {user?.pincode ? (
                      <Text style={styles.savedAddressPin}>Pincode: {user.pincode}</Text>
                    ) : null}
                  </View>
                  <Ionicons name="checkmark-circle" size={18} color="#059669" />
                </TouchableOpacity>
              </View>
            )}

          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: renewxColors.background,
  },
  headerContainer: {
    backgroundColor: renewxColors.surface,
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  topRightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  greenShieldBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: renewxColors.mint,
    borderWidth: 1,
    borderColor: renewxColors.mintBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  redBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: renewxColors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  redBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    ...renewxTextStyle('bold'),
  },
  yellowCountBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: renewxColors.yellow,
    borderRadius: 9,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  yellowCountBadgeText: {
    color: renewxColors.black,
    fontSize: 9.5,
    ...renewxTextStyle('extraBold'),
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
    width: '100%',
  },
  locationPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: renewxColors.surface,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 7,
    minHeight: 36,
  },
  locationText: {
    flex: 1,
    fontSize: 12.5,
    ...renewxTextStyle('bold'),
    color: renewxColors.black,
  },
  useLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: renewxColors.yellow,
    borderWidth: 1,
    borderColor: renewxColors.yellowDark,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    minHeight: 36,
    flexShrink: 0,
  },
  useLocationText: {
    fontSize: 12,
    ...renewxTextStyle('bold'),
    color: renewxColors.black,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: renewxColors.surface,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 25,
    paddingHorizontal: 14,
    height: 46,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    ...renewxTextStyle('medium'),
    color: renewxColors.black,
    paddingVertical: 0,
    outlineStyle: 'none' as any,
  },
  searchActionBtn: {
    paddingHorizontal: 6,
    position: 'relative',
  },
  cartIconBadge: {
    position: 'absolute',
    top: -4,
    right: 0,
    backgroundColor: renewxColors.error,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  cartIconBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    ...renewxTextStyle('extraBold'),
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 16,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  titleSection: {
    marginBottom: 16,
  },
  titleText: {
    fontSize: 26,
    ...renewxTextStyle('extraBold'),
    color: renewxColors.black,
    letterSpacing: -0.5,
  },
  subtitleText: {
    fontSize: 14,
    ...renewxTextStyle('regular'),
    color: renewxColors.textSecondary,
    marginTop: 4,
    lineHeight: 20,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: '48.5%',
    height: 142,
    backgroundColor: renewxColors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 13,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
    ...(renewxShadows.card as object),
  },
  cardAccentBorder: {
    borderColor: renewxColors.yellowDark,
    borderWidth: 1.5,
  },
  cardLeftCol: {
    flex: 1,
    justifyContent: 'space-between',
    zIndex: 2,
  },
  cardTitle: {
    fontSize: 15.5,
    ...renewxTextStyle('extraBold'),
    color: renewxColors.black,
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  cardCount: {
    fontSize: 12,
    ...renewxTextStyle('medium'),
    color: renewxColors.textSecondary,
    marginTop: 3,
  },
  arrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImageContainer: {
    width: '58%',
    height: '100%',
    position: 'absolute',
    right: 4,
    bottom: 4,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    zIndex: 1,
  },
  cardImage: {
    width: '100%',
    height: '92%',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 9999,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: renewxColors.surface,
    borderRadius: 22,
    padding: 20,
    ...(renewxShadows.floating as object),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    ...renewxTextStyle('extraBold'),
    color: renewxColors.black,
  },
  modalSubtitle: {
    fontSize: 12.5,
    ...renewxTextStyle('regular'),
    color: renewxColors.textSecondary,
    marginTop: 3,
    lineHeight: 18,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  detectLocationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: renewxColors.mintLight,
    borderWidth: 1.5,
    borderColor: renewxColors.mintBorder,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  detectIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: renewxColors.yellow,
    borderWidth: 1,
    borderColor: renewxColors.yellowDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  detectTitle: {
    fontSize: 14,
    ...renewxTextStyle('bold'),
    color: renewxColors.mintDark,
  },
  detectSub: {
    fontSize: 11.5,
    ...renewxTextStyle('medium'),
    color: renewxColors.emerald,
    marginTop: 2,
  },
  pincodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: renewxColors.background,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 16,
  },
  pincodeInput: {
    flex: 1,
    fontSize: 14,
    color: renewxColors.black,
    ...renewxTextStyle('semibold'),
  },
  applyPincodeBtn: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  applyPincodeBtnActive: {
    backgroundColor: renewxColors.yellow,
    borderWidth: 1,
    borderColor: renewxColors.yellowDark,
  },
  applyPincodeBtnText: {
    fontSize: 13,
    ...renewxTextStyle('bold'),
    color: renewxColors.textSecondary,
  },
  applyPincodeBtnTextActive: {
    color: renewxColors.black,
  },
  savedAddressQuickSection: {
    marginBottom: 14,
  },
  savedAddressQuickTitle: {
    fontSize: 11,
    ...renewxTextStyle('extraBold'),
    color: renewxColors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  savedAddressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: renewxColors.background,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 10,
    gap: 10,
  },
  savedAddressIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedAddressText: {
    fontSize: 13,
    ...renewxTextStyle('bold'),
    color: renewxColors.black,
  },
  savedAddressPin: {
    fontSize: 11.5,
    ...renewxTextStyle('medium'),
    color: renewxColors.textSecondary,
    marginTop: 2,
  },
  popularCitiesSection: {
    marginTop: 2,
  },
  popularCitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cityChipText: {
    fontSize: 12,
    ...renewxTextStyle('bold'),
    color: renewxColors.black,
    marginRight: 4,
  },
  cityChipPin: {
    fontSize: 10.5,
    color: renewxColors.textSecondary,
    ...renewxTextStyle('medium'),
  },
});
