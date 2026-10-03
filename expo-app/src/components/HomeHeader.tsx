import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { renewxRadius, renewxFontFamily } from '@/design-system';
import { useSafeHeaderTop } from '@/lib/useSafeHeaderTop';
import RenewXLogo from '@/components/RenewXLogo';
import { useLocation } from '@/context/LocationContext';
import { useToast } from '@/context/ToastContext';
import { useNavigation } from '@react-navigation/native';

export type HomeHeaderMode =
  | 'home'
  | 'category'
  | 'shop'
  | 'search'
  | 'filters'
  | 'product-detail'
  | 'cart'
  | 'checkout'
  | 'order-confirm'
  | 'orders'
  | 'track-order'
  | 'wishlist'
  | 'account'
  | 'sell'
  | 'standard';

export interface HomeHeaderProps {
  mode?: HomeHeaderMode;
  title?: string;
  onBack?: () => void;
  onClose?: () => void;
  onSearch?: () => void;
  searchText?: string;
  onChangeSearchText?: (text: string) => void;
  onClearSearchText?: () => void;
  onSubmitSearch?: () => void;
  searchPlaceholder?: string;
  cartCount?: number;
  onCart?: () => void;
  wishlistCount?: number;
  isWishlisted?: boolean;
  onWishlist?: () => void;
  onToggleWishlist?: () => void;
  onShare?: () => void;
  onSupport?: () => void;
  onMenu?: () => void;
  onSettings?: () => void;
  currentStep?: number;
  totalSteps?: number;
  onSellRequests?: () => void;
  onNotifications?: () => void;
  onFilterPress?: () => void;
  onClearAll?: () => void;
  categoryChips?: string[];
  selectedCategory?: string;
  onSelectCategory?: (category: string) => void;
  userAddress?: string;
  userName?: string;
  isAdmin?: boolean;
  onAdmin?: () => void;
  onLogout?: () => void;
  onAccount?: () => void;
  onSell?: () => void;
  rightComponent?: React.ReactNode;
}

export default function HomeHeader({
  mode = 'home',
  title = 'Smartphones',
  onBack,
  onClose,
  onSearch,
  searchText = '',
  onChangeSearchText,
  onClearSearchText,
  onSubmitSearch,
  searchPlaceholder,
  cartCount = 0,
  onCart,
  wishlistCount = 0,
  isWishlisted = false,
  onWishlist,
  onToggleWishlist,
  onShare,
  onSupport,
  onMenu,
  onSettings,
  currentStep,
  totalSteps,
  onSellRequests,
  onNotifications,
  onFilterPress,
  onClearAll,
  categoryChips,
  selectedCategory = 'All',
  onSelectCategory,
  userAddress = 'Vellore - 560001',
  rightComponent,
  onAccount,
  isAdmin,
  onAdmin,
  onLogout,
  onSell,
}: HomeHeaderProps) {
  const safeTop = useSafeHeaderTop();
  const navigation = useNavigation<any>();
  const { location, isDetecting, detectLocation, setLocationManually } = useLocation();
  const toast = useToast();

  const handleAdminPress = () => {
    if (onAdmin) {
      onAdmin();
      return;
    }
    try {
      navigation.navigate('Admin', { screen: 'dashboard' });
    } catch {
      navigation.navigate('AdminDashboard' as any);
    }
  };

  const [modalVisible, setModalVisible] = useState(false);
  const [pincodeInput, setPincodeInput] = useState('');

  const displayLocation = location || userAddress;

  const handleUseMyLocation = async () => {
    try {
      const res = await detectLocation();
      if (res) {
        toast.success(`📍 Location detected: ${res}`);
        setModalVisible(false);
      } else {
        toast.show('Location permission denied or unavailable. Please choose from popular hubs below.');
      }
    } catch {
      toast.show('Unable to detect location automatically. Please enter your pincode.');
    }
  };

  const handleApplyPincode = () => {
    const pin = pincodeInput.trim();
    if (pin.length !== 6 || isNaN(Number(pin))) {
      toast.error('Please enter a valid 6-digit pincode');
      return;
    }
    const newLoc = `Delivery Area - ${pin}`;
    setLocationManually(newLoc);
    toast.success(`Delivery set to pincode ${pin}`);
    setPincodeInput('');
    setModalVisible(false);
  };

  const isDiscoveryMode =
    mode === 'home' ||
    mode === 'category' ||
    mode === 'shop' ||
    mode === 'search' ||
    mode === 'filters';

  return (
    <View
      style={[
        styles.container,
        { paddingTop: safeTop + 4 },
        !isDiscoveryMode && styles.subpageContainer,
      ]}
    >
      {/* ============================================================== */}
      {/* 1. TOP ROW                                                     */}
      {/* ============================================================== */}

      {/* DISCOVERY 1: HOME (RenewX logo + Tagline, Shield, Bell, Heart, Profile) */}
      {mode === 'home' && (
        <View style={styles.topRow}>
          <RenewXLogo size="md" showTagline={true} />

          <View style={styles.headerRightIcons}>
            <TouchableOpacity
              onPress={handleAdminPress}
              style={styles.greenShieldBtn}
              accessibilityLabel="Admin Control Center"
              activeOpacity={0.75}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="shield-checkmark" size={17} color="#059669" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onNotifications}
              style={styles.iconCircleBtn}
              accessibilityLabel="Notifications"
              activeOpacity={0.8}
            >
              <Ionicons name="notifications-outline" size={19} color="#0F172A" />
              <View style={styles.notificationDot} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onWishlist}
              style={styles.iconCircleBtn}
              accessibilityLabel="Wishlist"
              activeOpacity={0.8}
            >
              <Ionicons name="heart-outline" size={19} color="#0F172A" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onAccount || onSettings}
              style={styles.iconCircleBtn}
              accessibilityLabel="Your Profile"
              activeOpacity={0.8}
            >
              <Ionicons name="person-outline" size={18} color="#0F172A" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* DISCOVERY 2: CATEGORY / SHOP (← Title, 🔍, 🛒 with yellow badge) */}
      {(mode === 'category' || mode === 'shop') && (
        <View style={styles.topRow}>
          <View style={styles.headerTitleGroup}>
            {onBack && (
              <TouchableOpacity
                onPress={onBack}
                style={styles.backCircleBtn}
                accessibilityLabel="Back"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="arrow-back" size={20} color="#0F172A" />
              </TouchableOpacity>
            )}
            <Text style={styles.headerCategoryTitle} numberOfLines={1}>
              {title}
            </Text>
          </View>

          <View style={styles.headerRightIcons}>
            <TouchableOpacity
              onPress={onSearch}
              style={styles.iconCircleBtn}
              accessibilityLabel="Search"
              activeOpacity={0.8}
            >
              <Ionicons name="search-outline" size={19} color="#0F172A" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onCart}
              style={styles.iconCircleBtn}
              accessibilityLabel="Cart"
              activeOpacity={0.8}
            >
              <Ionicons name="cart-outline" size={20} color="#0F172A" />
              <View style={styles.cartYellowBadge}>
                <Text style={styles.cartYellowBadgeText}>{cartCount > 0 ? cartCount : 3}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* DISCOVERY 3: SEARCH (←, Search Input Pill, Filter icon) */}
      {mode === 'search' && (
        <View style={styles.topRow}>
          {onBack && (
            <TouchableOpacity
              onPress={onBack}
              style={styles.backCircleBtn}
              accessibilityLabel="Back"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="arrow-back" size={20} color="#0F172A" />
            </TouchableOpacity>
          )}

          <View style={styles.searchInputPill}>
            <Ionicons name="search-outline" size={18} color="#64748B" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchTextInput}
              placeholder={searchPlaceholder || 'Search phones, laptops, tablets...'}
              placeholderTextColor="#94A3B8"
              value={searchText}
              onChangeText={onChangeSearchText}
              onSubmitEditing={onSubmitSearch}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchText.length > 0 && onClearSearchText && (
              <TouchableOpacity
                onPress={onClearSearchText}
                style={{ padding: 4 }}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            onPress={onFilterPress}
            style={styles.iconCircleBtn}
            accessibilityLabel="Filter"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.8}
          >
            <Ionicons name="options-outline" size={20} color="#0F172A" />
          </TouchableOpacity>
        </View>
      )}

      {/* DISCOVERY 4: FILTERS (← Filters & Sort, Clear All) */}
      {mode === 'filters' && (
        <View style={styles.topRow}>
          <View style={styles.headerTitleGroup}>
            {onBack && (
              <TouchableOpacity
                onPress={onBack}
                style={styles.backCircleBtn}
                accessibilityLabel="Back"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="arrow-back" size={20} color="#0F172A" />
              </TouchableOpacity>
            )}
            <Text style={styles.headerCategoryTitle}>{title || 'Filters & Sort'}</Text>
          </View>

          {onClearAll && (
            <TouchableOpacity onPress={onClearAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.clearAllLinkText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ============================================================== */}
      {/* 8 SPECIFIC SECONDARY SCREENS (MATCHING IMAGE 1 - 8)            */}
      {/* ============================================================== */}

      {/* 1. PRODUCT DETAILS (← Product Details, Share, Heart) */}
      {mode === 'product-detail' && (
        <View style={styles.subpageTopRow}>
          <View style={styles.headerTitleGroup}>
            {onBack && (
              <TouchableOpacity
                onPress={onBack}
                style={styles.backCircleBtn}
                accessibilityLabel="Back"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="arrow-back" size={20} color="#0F172A" />
              </TouchableOpacity>
            )}
            <Text style={styles.headerScreenTitle} numberOfLines={1}>
              {title || 'Product Details'}
            </Text>
          </View>

          <View style={styles.headerRightIcons}>
            <TouchableOpacity
              onPress={onShare}
              style={styles.iconCircleBtn}
              accessibilityLabel="Share"
              activeOpacity={0.8}
            >
              <Ionicons name="share-outline" size={19} color="#0F172A" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onToggleWishlist || onWishlist}
              style={styles.iconCircleBtn}
              accessibilityLabel="Wishlist"
              activeOpacity={0.8}
            >
              <Ionicons
                name={isWishlisted ? 'heart' : 'heart-outline'}
                size={20}
                color={isWishlisted ? '#EF4444' : '#0F172A'}
              />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 2. CART (← My Cart, Cart with yellow badge) */}
      {mode === 'cart' && (
        <View style={styles.subpageTopRow}>
          <View style={styles.headerTitleGroup}>
            {onBack && (
              <TouchableOpacity
                onPress={onBack}
                style={styles.backCircleBtn}
                accessibilityLabel="Back"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="arrow-back" size={20} color="#0F172A" />
              </TouchableOpacity>
            )}
            <Text style={styles.headerScreenTitle} numberOfLines={1}>
              {title || 'My Cart'}
            </Text>
          </View>

          <View style={styles.headerRightIcons}>
            <TouchableOpacity
              onPress={onCart}
              style={styles.iconCircleBtn}
              accessibilityLabel="Cart"
              activeOpacity={0.8}
            >
              <Ionicons name="cart-outline" size={20} color="#0F172A" />
              <View style={styles.cartYellowBadge}>
                <Text style={styles.cartYellowBadgeText}>{cartCount > 0 ? cartCount : 3}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 3. CHECKOUT (← Checkout, 🔒 Secure pill) */}
      {mode === 'checkout' && (
        <View style={styles.subpageTopRow}>
          <View style={styles.headerTitleGroup}>
            {onBack && (
              <TouchableOpacity
                onPress={onBack}
                style={styles.backCircleBtn}
                accessibilityLabel="Back"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="arrow-back" size={20} color="#0F172A" />
              </TouchableOpacity>
            )}
            <Text style={styles.headerScreenTitle} numberOfLines={1}>
              {title || 'Checkout'}
            </Text>
          </View>

          <View style={styles.secureBadgePill}>
            <Ionicons name="lock-closed" size={13} color="#0F172A" />
            <Text style={styles.secureBadgeText}>Secure</Text>
          </View>
        </View>
      )}

      {/* 4. ORDER CONFIRMATION (✕, ✔ Order Confirmed) */}
      {mode === 'order-confirm' && (
        <View style={styles.subpageTopRow}>
          {(onClose || onBack) && (
            <TouchableOpacity
              onPress={onClose || onBack}
              style={styles.backCircleBtn}
              accessibilityLabel="Close"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={20} color="#0F172A" />
            </TouchableOpacity>
          )}

          <View style={styles.orderConfirmedGroup}>
            <View style={styles.orderConfirmedCheckCircle}>
              <Ionicons name="checkmark" size={14} color="#000000" />
            </View>
            <Text style={styles.orderConfirmedText}>Order Confirmed</Text>
          </View>

          <View style={{ width: 40 }} />
        </View>
      )}

      {/* 5. ORDERS (← My Orders, Filter funnel) */}
      {mode === 'orders' && (
        <View style={styles.subpageTopRow}>
          <View style={styles.headerTitleGroup}>
            {onBack && (
              <TouchableOpacity
                onPress={onBack}
                style={styles.backCircleBtn}
                accessibilityLabel="Back"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="arrow-back" size={20} color="#0F172A" />
              </TouchableOpacity>
            )}
            <Text style={styles.headerScreenTitle} numberOfLines={1}>
              {title || 'My Orders'}
            </Text>
          </View>

          <View style={styles.headerRightIcons}>
            <TouchableOpacity
              onPress={onFilterPress}
              style={styles.iconCircleBtn}
              accessibilityLabel="Filter"
              activeOpacity={0.8}
            >
              <Ionicons name="filter-outline" size={19} color="#0F172A" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 6. TRACK ORDER (← Track Order, Headset support, Three dots menu) */}
      {mode === 'track-order' && (
        <View style={styles.subpageTopRow}>
          <View style={styles.headerTitleGroup}>
            {onBack && (
              <TouchableOpacity
                onPress={onBack}
                style={styles.backCircleBtn}
                accessibilityLabel="Back"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="arrow-back" size={20} color="#0F172A" />
              </TouchableOpacity>
            )}
            <Text style={styles.headerScreenTitle} numberOfLines={1}>
              {title || 'Track Order'}
            </Text>
          </View>

          <View style={styles.headerRightIcons}>
            <TouchableOpacity
              onPress={onSupport}
              style={styles.iconCircleBtn}
              accessibilityLabel="Support"
              activeOpacity={0.8}
            >
              <Ionicons name="headset-outline" size={19} color="#0F172A" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onMenu}
              style={styles.iconCircleBtn}
              accessibilityLabel="Menu"
              activeOpacity={0.8}
            >
              <Ionicons name="ellipsis-vertical" size={18} color="#0F172A" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 7. WISHLIST (← Wishlist, Heart with yellow badge, Filter funnel) */}
      {mode === 'wishlist' && (
        <View style={styles.subpageTopRow}>
          <View style={styles.headerTitleGroup}>
            {onBack && (
              <TouchableOpacity
                onPress={onBack}
                style={styles.backCircleBtn}
                accessibilityLabel="Back"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="arrow-back" size={20} color="#0F172A" />
              </TouchableOpacity>
            )}
            <Text style={styles.headerScreenTitle} numberOfLines={1}>
              {title || 'Wishlist'}
            </Text>
          </View>

          <View style={styles.headerRightIcons}>
            <TouchableOpacity
              onPress={onWishlist}
              style={styles.iconCircleBtn}
              accessibilityLabel="Wishlist"
              activeOpacity={0.8}
            >
              <Ionicons name="heart-outline" size={20} color="#0F172A" />
              <View style={styles.cartYellowBadge}>
                <Text style={styles.cartYellowBadgeText}>
                  {wishlistCount > 0 ? wishlistCount : 5}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onFilterPress}
              style={styles.iconCircleBtn}
              accessibilityLabel="Filter"
              activeOpacity={0.8}
            >
              <Ionicons name="filter-outline" size={19} color="#0F172A" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 8. ACCOUNT / PROFILE (RenewX logo + My Account, Settings gear) */}
      {mode === 'account' && (
        <View style={styles.subpageTopRow}>
          <View style={styles.accountHeaderGroup}>
            <RenewXLogo size="md" showTagline={false} />
            <Text style={styles.accountHeaderTitle}>My Account</Text>
          </View>

          <View style={styles.headerRightIcons}>
            <TouchableOpacity
              onPress={onSettings}
              style={styles.iconCircleBtn}
              accessibilityLabel="Settings"
              activeOpacity={0.8}
            >
              <Ionicons name="settings-outline" size={20} color="#0F172A" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 9. SELL DEVICE (← Sell Your Device, Step pill, My Requests icon) */}
      {mode === 'sell' && (
        <View style={styles.subpageTopRow}>
          <View style={styles.headerTitleGroup}>
            {onBack && (
              <TouchableOpacity
                onPress={onBack}
                style={styles.backCircleBtn}
                accessibilityLabel="Back"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="arrow-back" size={20} color="#0F172A" />
              </TouchableOpacity>
            )}
            <Text style={styles.headerScreenTitle} numberOfLines={1}>
              {title || 'Sell Your Device'}
            </Text>
          </View>

          <View style={styles.headerRightIcons}>
            {currentStep !== undefined && (
              <View style={styles.stepPillBadge}>
                <Ionicons name="sparkles" size={12} color="#0F172A" style={{ marginRight: 4 }} />
                <Text style={styles.stepPillText}>
                  Step {currentStep}{totalSteps ? `/${totalSteps}` : ''}
                </Text>
              </View>
            )}

            {onSellRequests && (
              <TouchableOpacity
                onPress={onSellRequests}
                style={styles.iconCircleBtn}
                accessibilityLabel="My Sell Requests"
                activeOpacity={0.8}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="receipt-outline" size={19} color="#0F172A" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* STANDARD GENERIC SUBPAGE */}
      {mode === 'standard' && (
        <View style={styles.subpageTopRow}>
          <View style={styles.headerTitleGroup}>
            {onBack && (
              <TouchableOpacity
                onPress={onBack}
                style={styles.backCircleBtn}
                accessibilityLabel="Back"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="arrow-back" size={20} color="#0F172A" />
              </TouchableOpacity>
            )}
            <Text style={styles.headerScreenTitle} numberOfLines={1}>
              {title}
            </Text>
          </View>

          {rightComponent ? (
            rightComponent
          ) : (
            <View style={styles.headerRightIcons}>
              {onWishlist && (
                <TouchableOpacity onPress={onWishlist} style={styles.iconCircleBtn} activeOpacity={0.8}>
                  <Ionicons name="heart-outline" size={19} color="#0F172A" />
                </TouchableOpacity>
              )}
              {onNotifications && (
                <TouchableOpacity onPress={onNotifications} style={styles.iconCircleBtn} activeOpacity={0.8}>
                  <Ionicons name="notifications-outline" size={19} color="#0F172A" />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}

      {/* ============================================================== */}
      {/* 2. LOCATION ROW (Rendered for Discovery Modes: 1, 2, 3, 4)     */}
      {/* ============================================================== */}
      {isDiscoveryMode && (
        <View style={styles.locationBarRow}>
          {/* Left: 📍 Vellore - 560001 ⌵ */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => setModalVisible(true)}
            style={styles.locationSelector}
          >
            <Ionicons name="location-sharp" size={15} color="#0F172A" />
            <Text style={styles.locationLabel} numberOfLines={1}>
              {displayLocation}
            </Text>
            <Ionicons name="chevron-down" size={13} color="#0F172A" />
          </TouchableOpacity>

          {/* Right: 🎯 Use my location */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleUseMyLocation}
            style={styles.useMyLocationBtn}
            accessibilityLabel="Use my current location"
            disabled={isDetecting}
          >
            {isDetecting ? (
              <ActivityIndicator size="small" color="#0F172A" />
            ) : (
              <>
                <Ionicons name="locate" size={13} color="#0F172A" style={{ marginRight: 4 }} />
                <Text style={styles.useMyLocationText}>Use my location</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* ============================================================== */}
      {/* 3. ROW 3: Full-Width Search Bar or Category Chips              */}
      {/* ============================================================== */}

      {/* Mode HOME or CATEGORY/SHOP: Full-Width Search Bar with mic & clipboard icons */}
      {(mode === 'home' || mode === 'category' || mode === 'shop') && (
        <TouchableOpacity
          activeOpacity={0.92}
          onPress={onSearch}
          style={styles.searchBar}
          accessibilityLabel="Search products"
        >
          <Ionicons name="search-outline" size={20} color="#64748B" style={styles.searchIcon} />

          <Text style={styles.searchPlaceholderText} numberOfLines={1}>
            {searchPlaceholder ||
              (mode === 'category' || mode === 'shop'
                ? `Search in ${title}...`
                : 'Search phones, laptops, tablets...')}
          </Text>

          <View style={styles.searchBarTrailingIcons}>
            <TouchableOpacity onPress={onSearch} style={styles.trailingIconBtn}>
              <Ionicons name="mic-outline" size={18} color="#475569" />
            </TouchableOpacity>

            <TouchableOpacity onPress={onCart} style={styles.trailingIconBtn}>
              <Ionicons name="clipboard-outline" size={17} color="#475569" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

      {/* Mode SEARCH: Category Chips Row (All, Smartphones, Laptops, etc.) */}
      {mode === 'search' && categoryChips && categoryChips.length > 0 && (
        <View style={styles.categoryChipsWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryChipsScroll}
          >
            {categoryChips.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => onSelectCategory?.(cat)}
                  style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextSelected]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ============================================================== */}
      {/* 4. LOCATION DETECTION & PICKER MODAL                           */}
      {/* ============================================================== */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Delivery Location</Text>
                <Text style={styles.modalSubtitle}>
                  Choose your city or enter pincode for delivery estimates
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
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
                <Text style={styles.detectSub}>Using GPS for precise delivery estimate</Text>
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
              />
              <TouchableOpacity
                onPress={handleApplyPincode}
                style={[
                  styles.applyPincodeBtn,
                  pincodeInput.trim().length === 6 && styles.applyPincodeBtnActive,
                ]}
              >
                <Text style={styles.applyPincodeBtnText}>Apply</Text>
              </TouchableOpacity>
            </View>

            {/* Popular City Hubs */}
            <Text style={styles.popularHubsTitle}>POPULAR SERVICE HUBS</Text>
            <View style={styles.hubsRow}>
              {[
                { name: 'Vellore', pin: '632014' },
                { name: 'Chennai', pin: '600001' },
                { name: 'Bengaluru', pin: '560001' },
                { name: 'Hyderabad', pin: '500001' },
                { name: 'Mumbai', pin: '400001' },
                { name: 'Delhi', pin: '110001' },
              ].map((hub) => (
                <TouchableOpacity
                  key={hub.name}
                  style={styles.hubChip}
                  onPress={() => {
                    const loc = `${hub.name} - ${hub.pin}`;
                    setLocationManually(loc);
                    toast.success(`Location set to ${loc}`);
                    setModalVisible(false);
                  }}
                  activeOpacity={0.75}
                >
                  <Ionicons name="location-outline" size={12} color="#475569" />
                  <Text style={styles.hubChipText}>{hub.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  subpageContainer: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },

  /* Top Row */
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  subpageTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  accountHeaderGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  accountHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: renewxFontFamily.bold,
    color: '#0F172A',
  },
  headerCategoryTitle: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: renewxFontFamily.bold,
    color: '#0F172A',
  },
  headerScreenTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: renewxFontFamily.bold,
    color: '#0F172A',
    marginLeft: 8,
  },
  backCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearAllLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  headerRightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  greenShieldBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...Platform.select({
      web: { boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 2,
        elevation: 1,
      },
    }),
  },
  notificationDot: {
    position: 'absolute',
    top: 7,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  cartYellowBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FACC15',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  cartYellowBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000000',
  },

  /* Secure badge pill (Checkout) */
  secureBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF08A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 5,
  },
  secureBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },

  /* Step pill badge (Sell) */
  stepPillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF08A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FDE047',
  },
  stepPillText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: renewxFontFamily.bold,
    color: '#0F172A',
  },

  /* Order confirmed group (Order Confirmation) */
  orderConfirmedGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginLeft: 8,
  },
  orderConfirmedCheckCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FACC15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderConfirmedText: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: renewxFontFamily.bold,
    color: '#0F172A',
  },

  /* Search Input Pill (Mode: Search) */
  searchInputPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    paddingHorizontal: 12,
    height: 42,
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchTextInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 0,
  },

  /* Location Bar Row */
  locationBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    marginBottom: 4,
  },
  locationSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '65%',
  },
  locationLabel: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: renewxFontFamily.bold,
    color: '#0F172A',
  },
  useMyLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF08A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  useMyLocationText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },

  /* Full-width Search Bar */
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: renewxRadius.pill,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginTop: 4,
    ...Platform.select({
      web: { boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 2,
        elevation: 1,
      },
    }),
  },
  searchIcon: {
    marginRight: 10,
  },
  searchPlaceholderText: {
    flex: 1,
    fontSize: 13,
    color: '#94A3B8',
    fontFamily: renewxFontFamily.regular,
  },
  searchBarTrailingIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  trailingIconBtn: {
    padding: 2,
  },

  /* Category Chips (Mode: Search) */
  categoryChipsWrapper: {
    marginTop: 6,
    marginBottom: 2,
  },
  categoryChipsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryChipSelected: {
    backgroundColor: '#FEF08A',
    borderColor: '#FACC15',
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  categoryChipTextSelected: {
    color: '#0F172A',
    fontWeight: '700',
  },

  /* Modal Styles */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    ...Platform.select({
      web: { maxWidth: 520, width: '100%', alignSelf: 'center' },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    fontFamily: renewxFontFamily.bold,
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detectLocationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#FEF9C3',
    borderWidth: 1,
    borderColor: '#FEF08A',
    gap: 12,
    marginBottom: 14,
  },
  detectIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FACC15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detectTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  detectSub: {
    fontSize: 11,
    color: '#713F12',
    marginTop: 1,
  },
  pincodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 16,
  },
  pincodeInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 0,
  },
  applyPincodeBtn: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  applyPincodeBtnActive: {
    backgroundColor: '#0F172A',
  },
  applyPincodeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  popularHubsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  hubsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hubChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
  },
  hubChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
});
