import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Dimensions,
  Platform,
  RefreshControl,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/App';
import type { Product } from '@/types';
import { api } from '@/services/api';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useLocation } from '@/context/LocationContext';
import { useNotifications } from '@/context/NotificationContext';
import { useToast } from '@/context/ToastContext';
import { mapProductRow } from '@/lib/productMapper';
import { useSafeHeaderTop } from '@/lib/useSafeHeaderTop';
import { renewxFontFamily, renewxColors } from '@/design-system';
import { CATEGORY_THIRD_PARTY_IMAGES } from '@/data/categories';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// 1. Horizontal Category Selector Items with High-Res Cutouts
const CATEGORY_ITEMS = [
  {
    id: 'Smartphones',
    label: 'Smartphones',
    image: 'https://pngimg.com/uploads/iphone_14/iphone_14_PNG48.png',
  },
  {
    id: 'Laptops',
    label: 'Laptops',
    image: 'https://pngimg.com/uploads/macbook/macbook_PNG8.png',
  },
  {
    id: 'Tablets',
    label: 'Tablets',
    image: 'https://pngimg.com/uploads/tablet/tablet_PNG8567.png',
  },
  {
    id: 'Smartwatches',
    label: 'Smartwatches',
    image: 'https://pngimg.com/uploads/apple_watch/apple_watch_PNG52.png',
  },
  {
    id: 'Earbuds',
    label: 'Earbuds',
    image: 'https://pngimg.com/uploads/airPods/airPods_PNG11.png',
  },
  {
    id: 'Accessories',
    label: 'Accessories',
    image: 'https://pngimg.com/uploads/usb_cable/usb_cable_PNG64.png',
  },
  {
    id: 'Cameras',
    label: 'Cameras',
    image: 'https://pngimg.com/uploads/photo_camera/photo_camera_PNG101644.png',
  },
  {
    id: 'Vehicles',
    label: 'Vehicles',
    image: 'https://pngimg.com/uploads/tesla_car/tesla_car_PNG46.png',
  },
];

export default function AllProductsScreen() {
  const safeTop = useSafeHeaderTop();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<any>();

  const { addToCart, totalItems: cartCount } = useCart();
  const { isInWishlist, toggleWishlist, totalWishlistItems } = useWishlist();
  const { location, area, pincode, detectLocation, setShowLocationModal, isDetecting } = useLocation();
  const { unreadCount } = useNotifications();
  const toast = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter States
  const [searchQuery, setSearchQuery] = useState(route.params?.search || '');
  const [selectedCategory, setSelectedCategory] = useState<string>(route.params?.category || 'Smartphones');
  const [selectedSort, setSelectedSort] = useState<string>('recommended');
  const [selectedCondition, setSelectedCondition] = useState<string>('all');
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>(route.params?.brand || 'all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Modal Sheet States
  const [activeModal, setActiveModal] = useState<'sort' | 'condition' | 'price' | 'brand' | 'trust' | null>(null);

  // Fetch live backend products
  const loadProducts = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const data = await api.products.getAll({ limit: 100 });
      const rows = Array.isArray(data) ? data : [];
      const mapped = rows.map(mapProductRow);
      setProducts(mapped);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadProducts(true);
  }, [loadProducts]);

  // Dynamic filter matching logic
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = p.name?.toLowerCase().includes(q);
        const matchesBrand = p.brand?.toLowerCase().includes(q);
        const matchesCat = p.category?.toLowerCase().includes(q);
        const matchesSpecs = Array.isArray(p.specs) && p.specs.some((s) => s.toLowerCase().includes(q));
        if (!matchesName && !matchesBrand && !matchesCat && !matchesSpecs) return false;
      }

      // Category filter
      if (selectedCategory && selectedCategory !== 'All') {
        const cat = selectedCategory.toLowerCase();
        const pCat = (p.category || '').toLowerCase();
        const pName = (p.name || '').toLowerCase();

        if (cat === 'smartphones') {
          if (!pCat.includes('phone') && !pCat.includes('smart') && !pName.includes('iphone') && !pName.includes('galaxy')) {
            return false;
          }
        } else if (cat === 'laptops') {
          if (!pCat.includes('laptop') && !pCat.includes('mac') && !pName.includes('macbook') && !pName.includes('surface')) {
            return false;
          }
        } else if (cat === 'tablets') {
          if (!pCat.includes('tab') && !pCat.includes('pad') && !pName.includes('ipad')) {
            return false;
          }
        } else if (cat === 'smartwatches') {
          if (!pCat.includes('watch') && !pCat.includes('wear') && !pName.includes('watch') && !pName.includes('colorfit')) {
            return false;
          }
        } else if (cat === 'earbuds') {
          if (!pCat.includes('audio') && !pCat.includes('ear') && !pCat.includes('head') && !pName.includes('airpod') && !pName.includes('buds')) {
            return false;
          }
        } else if (cat === 'cameras') {
          if (!pCat.includes('camera') && !pCat.includes('dslr') && !pName.includes('alpha') && !pName.includes('sony a7')) {
            return false;
          }
        } else if (cat === 'vehicles') {
          if (!pCat.includes('vehic') && !pCat.includes('car') && !pCat.includes('bike') && !pName.includes('ather') && !pName.includes('tesla')) {
            return false;
          }
        } else if (cat === 'accessories') {
          if (!pCat.includes('access') && !pCat.includes('cable') && !pCat.includes('charger')) {
            return false;
          }
        }
      }

      // Condition filter
      if (selectedCondition !== 'all') {
        const cond = (p.condition || '').toLowerCase();
        if (selectedCondition === 'likenew' && !cond.includes('like')) return false;
        if (selectedCondition === 'excellent' && !cond.includes('excel')) return false;
        if (selectedCondition === 'good' && !cond.includes('good')) return false;
        if (selectedCondition === 'fair' && !cond.includes('fair')) return false;
      }

      // Price filter
      if (selectedPriceRange !== 'all') {
        const price = Number(p.price || 0);
        if (selectedPriceRange === 'under10k' && price >= 10000) return false;
        if (selectedPriceRange === '10k-30k' && (price < 10000 || price > 30000)) return false;
        if (selectedPriceRange === '30k-60k' && (price < 30000 || price > 60000)) return false;
        if (selectedPriceRange === 'above60k' && price <= 60000) return false;
      }

      // Brand filter
      if (selectedBrand !== 'all') {
        const brand = (p.brand || '').toLowerCase();
        if (!brand.includes(selectedBrand.toLowerCase())) return false;
      }

      return true;
    }).sort((a, b) => {
      const pA = Number(a.price || 0);
      const pB = Number(b.price || 0);
      if (selectedSort === 'price-asc') return pA - pB;
      if (selectedSort === 'price-desc') return pB - pA;
      if (selectedSort === 'discount') {
        const discA = a.originalPrice ? (a.originalPrice - pA) / a.originalPrice : 0;
        const discB = b.originalPrice ? (b.originalPrice - pB) / b.originalPrice : 0;
        return discB - discA;
      }
      return 0; // recommended
    });
  }, [products, searchQuery, selectedCategory, selectedCondition, selectedPriceRange, selectedBrand, selectedSort]);

  // Helper to extract clean badge label
  const getProductBadge = (p: Product) => {
    const orig = Number(p.originalPrice || 0);
    const cur = Number(p.price || 0);
    if (orig > cur && cur > 0) {
      const pct = Math.round(((orig - cur) / orig) * 100);
      if (pct > 0) return `${pct}% OFF`;
    }
    if ((p as any).badge) return (p as any).badge;
    if (p.name.toLowerCase().includes('noise')) return 'New';
    if (p.name.toLowerCase().includes('surface')) return 'Popular';
    return null;
  };

  // Helper for subtitle specs display (e.g. "128GB • Excellent")
  const getSpecsSubtitle = (p: Product) => {
    let storage = '';
    if (Array.isArray(p.specs)) {
      const found = p.specs.find((s) => s.toLowerCase().includes('storage'));
      if (found) storage = found.replace(/storage\s*:\s*/i, '').trim();
    }
    const condition = p.condition || 'Excellent';
    return storage ? `${storage} • ${condition}` : condition;
  };

  // Handle Add To Cart with instant feedback
  const handleAddToCart = (p: Product, e?: any) => {
    if (e && e.stopPropagation) e.stopPropagation();
    addToCart(p);
    toast.success(`Added ${p.name} to cart!`);
  };

  // Handle Wishlist Toggle
  const handleToggleWishlist = (p: Product, e?: any) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const wasIn = isInWishlist(String(p.id));
    toggleWishlist(p);
    toast.info(wasIn ? 'Removed from wishlist' : 'Added to wishlist');
  };

  // Location display text
  const locationLabel = useMemo(() => {
    if (pincode && area) return `${area} - ${pincode}`;
    if (pincode) return `Pincode ${pincode}`;
    if (location) return location.slice(0, 20);
    return 'Vellore - 632012';
  }, [location, area, pincode]);

  return (
    <View style={[styles.rootContainer, { paddingTop: safeTop }]}>
      {/* 1. TOP HEADER ROW */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}
          activeOpacity={0.8}
        >
          <View style={styles.logoRow}>
            <Text style={styles.renewText}>Renew</Text>
            <Text style={styles.xText}>X</Text>
          </View>
          <Text style={styles.taglineText}>Buy Pre-Owned | Sell | Upgrade</Text>
        </TouchableOpacity>

        {/* Right Header Action Icons */}
        <View style={styles.topRightActions}>
          {/* Shield / Safety Guarantee Pill Button */}
          <TouchableOpacity
            style={styles.safetyCircleBtn}
            onPress={() => setActiveModal('trust')}
            activeOpacity={0.8}
            accessibilityLabel="RenewX Certification Guarantee"
          >
            <Ionicons name="shield-checkmark" size={17} color="#168A4A" />
          </TouchableOpacity>

          {/* Notifications Bell with Badge */}
          <TouchableOpacity
            style={styles.circleActionBtn}
            onPress={() => navigation.navigate('Notifications')}
            activeOpacity={0.8}
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={20} color="#0F172A" />
            <View style={styles.redBadgeWrap}>
              <Text style={styles.redBadgeText}>{unreadCount > 0 ? unreadCount : '24'}</Text>
            </View>
          </TouchableOpacity>

          {/* Wishlist Heart Button */}
          <TouchableOpacity
            style={styles.circleActionBtn}
            onPress={() => navigation.navigate('Wishlist')}
            activeOpacity={0.8}
            accessibilityLabel="Wishlist"
          >
            <Ionicons
              name={totalWishlistItems > 0 ? 'heart' : 'heart-outline'}
              size={20}
              color={totalWishlistItems > 0 ? '#EF4444' : '#0F172A'}
            />
          </TouchableOpacity>

          {/* User Account / Profile Button */}
          <TouchableOpacity
            style={styles.circleActionBtn}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Account' })}
            activeOpacity={0.8}
            accessibilityLabel="Account Profile"
          >
            <Ionicons name="person-outline" size={20} color="#0F172A" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. LOCATION ROW */}
      <View style={styles.locationBarRow}>
        {/* Left: Location Pin Dropdown */}
        <TouchableOpacity
          style={styles.locationPinPill}
          onPress={() => setShowLocationModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="location" size={16} color="#168A4A" />
          <Text style={styles.locationPinText} numberOfLines={1}>{locationLabel}</Text>
          <Ionicons name="chevron-down" size={14} color="#0F172A" />
        </TouchableOpacity>

        {/* Right: "Use my location" button */}
        <TouchableOpacity
          style={styles.useLocationBtn}
          onPress={async () => {
            const loc = await detectLocation();
            if (loc) toast.success(`Location detected: ${loc}`);
          }}
          activeOpacity={0.85}
          disabled={isDetecting}
        >
          {isDetecting ? (
            <ActivityIndicator size="small" color="#B45309" />
          ) : (
            <Ionicons name="locate-outline" size={15} color="#0F172A" />
          )}
          <Text style={styles.useLocationText}>Use my location</Text>
        </TouchableOpacity>
      </View>

      {/* MAIN SCROLLABLE CONTENT */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[renewxColors.green]}
            tintColor={renewxColors.green}
          />
        }
      >
        {/* 3. ALL PRODUCTS TITLE & INVENTORY COUNTER */}
        <View style={styles.titleSection}>
          <Text style={styles.screenTitle}>All Products</Text>
          <Text style={styles.devicesCountSubtitle}>
            {loading ? 'Loading devices...' : `${filteredProducts.length} devices available`}
          </Text>
        </View>

        {/* 4. SEARCH INPUT BAR */}
        <View style={styles.searchBarWrap}>
          <Ionicons name="search" size={18} color="#64748B" style={{ marginLeft: 4 }} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search RenewX (iPhone, Mac, iPad...)"
            placeholderTextColor="#64748B"
            style={styles.searchInput}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={styles.searchVoiceBtn}
            onPress={() => toast.info('Voice search activated')}
            activeOpacity={0.7}
          >
            <Ionicons name="mic-outline" size={20} color="#0F172A" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.searchCartBtn}
            onPress={() => navigation.navigate('Cart')}
            activeOpacity={0.7}
          >
            <Ionicons name="cart-outline" size={20} color="#0F172A" />
            {cartCount > 0 && (
              <View style={styles.searchCartBadge}>
                <Text style={styles.searchCartBadgeText}>{cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* 5. HORIZONTAL CUTOUT CATEGORIES STRIP */}
        <View style={styles.categoryStripSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScrollTrack}
          >
            {CATEGORY_ITEMS.map((cat) => {
              const isSelected = selectedCategory.toLowerCase() === cat.id.toLowerCase();
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryCard,
                    isSelected && styles.categoryCardSelected,
                  ]}
                  onPress={() => {
                    // Toggle selection or select
                    if (isSelected) {
                      setSelectedCategory('All');
                    } else {
                      setSelectedCategory(cat.id);
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.categoryImageWrap}>
                    <Image
                      source={{ uri: cat.image }}
                      style={styles.categoryCutoutImg}
                      resizeMode="contain"
                    />
                  </View>
                  <Text
                    style={[
                      styles.categoryLabelText,
                      isSelected && styles.categoryLabelSelected,
                    ]}
                    numberOfLines={1}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* 6. FILTER & VIEW TOGGLE ROW */}
        <View style={styles.filtersBarRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPillsTrack}>
            {/* Sort by */}
            <TouchableOpacity
              style={[styles.filterDropdownPill, selectedSort !== 'recommended' && styles.filterDropdownPillActive]}
              onPress={() => setActiveModal('sort')}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterDropdownText, selectedSort !== 'recommended' && styles.filterDropdownTextActive]}>
                {selectedSort === 'price-asc'
                  ? 'Price: Low'
                  : selectedSort === 'price-desc'
                  ? 'Price: High'
                  : selectedSort === 'discount'
                  ? 'Discount'
                  : 'Sort by'}
              </Text>
              <Ionicons name="chevron-down" size={13} color="#0F172A" />
            </TouchableOpacity>

            {/* Condition */}
            <TouchableOpacity
              style={[styles.filterDropdownPill, selectedCondition !== 'all' && styles.filterDropdownPillActive]}
              onPress={() => setActiveModal('condition')}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterDropdownText, selectedCondition !== 'all' && styles.filterDropdownTextActive]}>
                {selectedCondition === 'all'
                  ? 'Condition'
                  : selectedCondition === 'likenew'
                  ? 'Like New'
                  : selectedCondition.charAt(0).toUpperCase() + selectedCondition.slice(1)}
              </Text>
              <Ionicons name="chevron-down" size={13} color="#0F172A" />
            </TouchableOpacity>

            {/* Price */}
            <TouchableOpacity
              style={[styles.filterDropdownPill, selectedPriceRange !== 'all' && styles.filterDropdownPillActive]}
              onPress={() => setActiveModal('price')}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterDropdownText, selectedPriceRange !== 'all' && styles.filterDropdownTextActive]}>
                {selectedPriceRange === 'all'
                  ? 'Price'
                  : selectedPriceRange === 'under10k'
                  ? '< ₹10k'
                  : selectedPriceRange === '10k-30k'
                  ? '₹10k-30k'
                  : selectedPriceRange === '30k-60k'
                  ? '₹30k-60k'
                  : '> ₹60k'}
              </Text>
              <Ionicons name="chevron-down" size={13} color="#0F172A" />
            </TouchableOpacity>

            {/* Brand */}
            <TouchableOpacity
              style={[styles.filterDropdownPill, selectedBrand !== 'all' && styles.filterDropdownPillActive]}
              onPress={() => setActiveModal('brand')}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterDropdownText, selectedBrand !== 'all' && styles.filterDropdownTextActive]}>
                {selectedBrand === 'all' ? 'Brand' : selectedBrand}
              </Text>
              <Ionicons name="chevron-down" size={13} color="#0F172A" />
            </TouchableOpacity>
          </ScrollView>

          {/* Grid / List View Toggle Group */}
          <View style={styles.viewModeToggleGroup}>
            <TouchableOpacity
              style={[styles.viewModeBtn, viewMode === 'grid' && styles.viewModeBtnActive]}
              onPress={() => setViewMode('grid')}
              activeOpacity={0.8}
              accessibilityLabel="Grid View"
            >
              <Ionicons name="grid" size={16} color="#0F172A" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewModeBtn, viewMode === 'list' && styles.viewModeBtnActive]}
              onPress={() => setViewMode('list')}
              activeOpacity={0.8}
              accessibilityLabel="List View"
            >
              <Ionicons name="list-outline" size={18} color="#0F172A" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 7. PRODUCTS GRID / LIST */}
        {loading && !refreshing ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={renewxColors.green} />
            <Text style={styles.loadingText}>Loading verified inventory...</Text>
          </View>
        ) : filteredProducts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={48} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No matching devices</Text>
            <Text style={styles.emptySubtitle}>Try adjusting your category or filter selections.</Text>
            <TouchableOpacity
              style={styles.resetFiltersBtn}
              onPress={() => {
                setSearchQuery('');
                setSelectedCategory('All');
                setSelectedCondition('all');
                setSelectedPriceRange('all');
                setSelectedBrand('all');
                setSelectedSort('recommended');
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.resetFiltersBtnText}>Reset All Filters</Text>
            </TouchableOpacity>
          </View>
        ) : viewMode === 'grid' ? (
          /* 2-COLUMN GRID VIEW - EXACT SCREENSHOT DESIGN */
          <View style={styles.gridContainer}>
            {filteredProducts.map((p) => {
              const badgeLabel = getProductBadge(p);
              const isWish = isInWishlist(String(p.id));
              const specsSub = getSpecsSubtitle(p);
              const hasDiscount = p.originalPrice && p.originalPrice > p.price;
              const imgUri = p.image || (Array.isArray(p.images) && p.images[0]) || '';

              return (
                <TouchableOpacity
                  key={p.id}
                  style={styles.productCard}
                  onPress={() => navigation.navigate('ProductDetail', { id: String(p.id), product: p })}
                  activeOpacity={0.9}
                >
                  {/* Top Badges Row */}
                  <View style={styles.cardHeaderRow}>
                    {badgeLabel ? (
                      <View
                        style={[
                          styles.badgePill,
                          badgeLabel === 'New'
                            ? styles.badgePillNew
                            : badgeLabel === 'Popular'
                            ? styles.badgePillPopular
                            : styles.badgePillDiscount,
                        ]}
                      >
                        <Text
                          style={[
                            styles.badgeText,
                            badgeLabel === 'New'
                              ? styles.badgeTextNew
                              : badgeLabel === 'Popular'
                              ? styles.badgeTextPopular
                              : styles.badgeTextDiscount,
                          ]}
                        >
                          {badgeLabel}
                        </Text>
                      </View>
                    ) : (
                      <View />
                    )}

                    {/* Wishlist Heart */}
                    <TouchableOpacity
                      onPress={(e) => handleToggleWishlist(p, e)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={styles.wishlistIconWrap}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={isWish ? 'heart' : 'heart-outline'}
                        size={18}
                        color={isWish ? '#EF4444' : '#0F172A'}
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Product Cutout Image */}
                  <View style={styles.productImageWrap}>
                    {imgUri ? (
                      <Image source={{ uri: imgUri }} style={styles.productImg} resizeMode="contain" />
                    ) : (
                      <Ionicons name="phone-portrait-outline" size={48} color="#94A3B8" />
                    )}
                  </View>

                  {/* Title & Specs */}
                  <Text style={styles.productTitle} numberOfLines={1}>
                    {p.name}
                  </Text>
                  <Text style={styles.productSpecs} numberOfLines={1}>
                    {specsSub}
                  </Text>

                  {/* Price Row & Yellow Cart Action */}
                  <View style={styles.priceCartRow}>
                    <View style={styles.priceCol}>
                      {p.is_best_price || (p as any).isBestPrice || p.price === 0 ? (
                        <View style={{ flexDirection: 'column', gap: 2 }}>
                          <Text style={{ fontSize: 13, fontWeight: '800', color: '#047857' }}>Best Price</Text>
                          <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#92400E', backgroundColor: '#FEF3C7', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4, alignSelf: 'flex-start' }}>COD Only</Text>
                        </View>
                      ) : (
                        <>
                          <Text style={styles.priceCurrent}>₹{Number(p.price).toLocaleString('en-IN')}</Text>
                          {hasDiscount ? (
                            <Text style={styles.priceMrp}>₹{Number(p.originalPrice).toLocaleString('en-IN')}</Text>
                          ) : null}
                        </>
                      )}
                    </View>

                    {/* Yellow Circular Cart Button */}
                    <TouchableOpacity
                      style={styles.yellowCartBtn}
                      onPress={(e) => handleAddToCart(p, e)}
                      activeOpacity={0.8}
                      accessibilityLabel={`Add ${p.name} to cart`}
                    >
                      <Ionicons name="cart-outline" size={18} color="#0F172A" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          /* LIST VIEW */
          <View style={styles.listContainer}>
            {filteredProducts.map((p) => {
              const badgeLabel = getProductBadge(p);
              const isWish = isInWishlist(String(p.id));
              const specsSub = getSpecsSubtitle(p);
              const hasDiscount = p.originalPrice && p.originalPrice > p.price;
              const imgUri = p.image || (Array.isArray(p.images) && p.images[0]) || '';

              return (
                <TouchableOpacity
                  key={p.id}
                  style={styles.productCardList}
                  onPress={() => navigation.navigate('ProductDetail', { id: String(p.id), product: p })}
                  activeOpacity={0.9}
                >
                  <View style={styles.listThumbWrap}>
                    {imgUri ? (
                      <Image source={{ uri: imgUri }} style={styles.listThumbImg} resizeMode="contain" />
                    ) : (
                      <Ionicons name="phone-portrait-outline" size={32} color="#94A3B8" />
                    )}
                    {badgeLabel && (
                      <View style={styles.listBadgePill}>
                        <Text style={styles.listBadgeText}>{badgeLabel}</Text>
                      </View>
                    )}
                  </View>

                  <View style={{ flex: 1, paddingVertical: 4 }}>
                    <Text style={styles.productTitle} numberOfLines={1}>
                      {p.name}
                    </Text>
                    <Text style={styles.productSpecs} numberOfLines={1}>
                      {specsSub}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <Text style={styles.priceCurrent}>₹{Number(p.price).toLocaleString('en-IN')}</Text>
                      {hasDiscount && (
                        <Text style={styles.priceMrp}>₹{Number(p.originalPrice).toLocaleString('en-IN')}</Text>
                      )}
                    </View>
                  </View>

                  <View style={{ alignItems: 'center', justifyContent: 'space-between', paddingLeft: 8 }}>
                    <TouchableOpacity
                      onPress={(e) => handleToggleWishlist(p, e)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={isWish ? 'heart' : 'heart-outline'}
                        size={18}
                        color={isWish ? '#EF4444' : '#0F172A'}
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.yellowCartBtn}
                      onPress={(e) => handleAddToCart(p, e)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="cart-outline" size={18} color="#0F172A" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* 8. BOTTOM NAVIGATION BAR (MATCHING SCREENSHOT) */}
      <View style={styles.bottomNavBar}>
        {/* Home */}
        <TouchableOpacity
          style={styles.bottomNavItem}
          onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}
          activeOpacity={0.8}
        >
          <View style={styles.homeActivePill}>
            <Ionicons name="home" size={18} color="#0F172A" />
            <Text style={styles.homeActiveText}>Home</Text>
          </View>
        </TouchableOpacity>

        {/* Categories */}
        <TouchableOpacity
          style={styles.bottomNavItem}
          onPress={() => navigation.navigate('Categories')}
          activeOpacity={0.8}
        >
          <Ionicons name="grid-outline" size={20} color="#0F172A" />
          <Text style={styles.bottomNavLabel}>Categories</Text>
        </TouchableOpacity>

        {/* Sell Center Elevated Button */}
        <TouchableOpacity
          style={styles.centerSellBtnWrap}
          onPress={() => navigation.navigate('MainTabs', { screen: 'Sell' })}
          activeOpacity={0.85}
        >
          <View style={styles.centerSellCircle}>
            <Ionicons name="pricetag" size={20} color="#0F172A" />
          </View>
          <Text style={styles.sellNavLabel}>Sell</Text>
        </TouchableOpacity>

        {/* Orders */}
        <TouchableOpacity
          style={styles.bottomNavItem}
          onPress={() => navigation.navigate('MainTabs', { screen: 'Track', params: { type: 'orders' } })}
          activeOpacity={0.8}
        >
          <Ionicons name="cube-outline" size={20} color="#0F172A" />
          <Text style={styles.bottomNavLabel}>Orders</Text>
        </TouchableOpacity>

        {/* Profile */}
        <TouchableOpacity
          style={styles.bottomNavItem}
          onPress={() => navigation.navigate('MainTabs', { screen: 'Account' })}
          activeOpacity={0.8}
        >
          <Ionicons name="person-outline" size={20} color="#0F172A" />
          <Text style={styles.bottomNavLabel}>Profile</Text>
        </TouchableOpacity>
      </View>

      {/* FILTER BOTTOM SHEET MODALS */}
      {/* 1. Sort Modal */}
      <Modal visible={activeModal === 'sort'} transparent animationType="fade" onRequestClose={() => setActiveModal(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setActiveModal(null)}>
          <View style={styles.modalSheetCard}>
            <View style={styles.modalSheetHeader}>
              <Text style={styles.modalSheetTitle}>Sort Devices</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <Ionicons name="close" size={20} color="#0F172A" />
              </TouchableOpacity>
            </View>
            {[
              { id: 'recommended', label: 'Recommended' },
              { id: 'price-asc', label: 'Price: Low to High' },
              { id: 'price-desc', label: 'Price: High to Low' },
              { id: 'discount', label: 'Biggest Discount' },
            ].map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={[styles.modalOptionRow, selectedSort === opt.id && styles.modalOptionRowSelected]}
                onPress={() => {
                  setSelectedSort(opt.id);
                  setActiveModal(null);
                }}
              >
                <Text style={[styles.modalOptionText, selectedSort === opt.id && styles.modalOptionTextSelected]}>
                  {opt.label}
                </Text>
                {selectedSort === opt.id && <Ionicons name="checkmark" size={18} color="#168A4A" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 2. Condition Modal */}
      <Modal visible={activeModal === 'condition'} transparent animationType="fade" onRequestClose={() => setActiveModal(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setActiveModal(null)}>
          <View style={styles.modalSheetCard}>
            <View style={styles.modalSheetHeader}>
              <Text style={styles.modalSheetTitle}>Filter by Condition</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <Ionicons name="close" size={20} color="#0F172A" />
              </TouchableOpacity>
            </View>
            {[
              { id: 'all', label: 'All Conditions' },
              { id: 'likenew', label: 'Like New (Pristine)' },
              { id: 'excellent', label: 'Excellent' },
              { id: 'good', label: 'Good' },
              { id: 'fair', label: 'Fair' },
            ].map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={[styles.modalOptionRow, selectedCondition === opt.id && styles.modalOptionRowSelected]}
                onPress={() => {
                  setSelectedCondition(opt.id);
                  setActiveModal(null);
                }}
              >
                <Text style={[styles.modalOptionText, selectedCondition === opt.id && styles.modalOptionTextSelected]}>
                  {opt.label}
                </Text>
                {selectedCondition === opt.id && <Ionicons name="checkmark" size={18} color="#168A4A" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 3. Price Modal */}
      <Modal visible={activeModal === 'price'} transparent animationType="fade" onRequestClose={() => setActiveModal(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setActiveModal(null)}>
          <View style={styles.modalSheetCard}>
            <View style={styles.modalSheetHeader}>
              <Text style={styles.modalSheetTitle}>Price Range</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <Ionicons name="close" size={20} color="#0F172A" />
              </TouchableOpacity>
            </View>
            {[
              { id: 'all', label: 'All Prices' },
              { id: 'under10k', label: 'Under ₹10,000' },
              { id: '10k-30k', label: '₹10,000 – ₹30,000' },
              { id: '30k-60k', label: '₹30,000 – ₹60,000' },
              { id: 'above60k', label: 'Above ₹60,000' },
            ].map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={[styles.modalOptionRow, selectedPriceRange === opt.id && styles.modalOptionRowSelected]}
                onPress={() => {
                  setSelectedPriceRange(opt.id);
                  setActiveModal(null);
                }}
              >
                <Text style={[styles.modalOptionText, selectedPriceRange === opt.id && styles.modalOptionTextSelected]}>
                  {opt.label}
                </Text>
                {selectedPriceRange === opt.id && <Ionicons name="checkmark" size={18} color="#168A4A" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 4. Brand Modal */}
      <Modal visible={activeModal === 'brand'} transparent animationType="fade" onRequestClose={() => setActiveModal(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setActiveModal(null)}>
          <View style={styles.modalSheetCard}>
            <View style={styles.modalSheetHeader}>
              <Text style={styles.modalSheetTitle}>Filter by Brand</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <Ionicons name="close" size={20} color="#0F172A" />
              </TouchableOpacity>
            </View>
            {['all', 'Apple', 'Samsung', 'Noise', 'Sony', 'Microsoft', 'Ather Energy'].map((brandName) => (
              <TouchableOpacity
                key={brandName}
                style={[styles.modalOptionRow, selectedBrand.toLowerCase() === brandName.toLowerCase() && styles.modalOptionRowSelected]}
                onPress={() => {
                  setSelectedBrand(brandName);
                  setActiveModal(null);
                }}
              >
                <Text style={[styles.modalOptionText, selectedBrand.toLowerCase() === brandName.toLowerCase() && styles.modalOptionTextSelected]}>
                  {brandName === 'all' ? 'All Brands' : brandName}
                </Text>
                {selectedBrand.toLowerCase() === brandName.toLowerCase() && <Ionicons name="checkmark" size={18} color="#168A4A" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 5. Trust & Quality Guarantee Modal */}
      <Modal visible={activeModal === 'trust'} transparent animationType="fade" onRequestClose={() => setActiveModal(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setActiveModal(null)}>
          <View style={styles.modalSheetCard}>
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                <Ionicons name="shield-checkmark" size={26} color="#168A4A" />
              </View>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A' }}>RenewX 32-Point Quality Certified</Text>
              <Text style={{ fontSize: 12, color: '#64748B', textAlign: 'center', marginTop: 4 }}>
                Every device in our inventory is rigorously tested and covered under comprehensive warranty.
              </Text>
            </View>
            <View style={{ gap: 8, marginVertical: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="checkmark-circle" size={18} color="#168A4A" />
                <Text style={{ fontSize: 13, color: '#0F172A', fontWeight: '600' }}>100% Functional & Genuine Components</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="checkmark-circle" size={18} color="#168A4A" />
                <Text style={{ fontSize: 13, color: '#0F172A', fontWeight: '600' }}>Up to 12 Months Replacement Warranty</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="checkmark-circle" size={18} color="#168A4A" />
                <Text style={{ fontSize: 13, color: '#0F172A', fontWeight: '600' }}>7-Day Easy Return / Replacement Policy</Text>
              </View>
            </View>
            <TouchableOpacity
              style={{ backgroundColor: '#168A4A', paddingVertical: 11, borderRadius: 12, alignItems: 'center', marginTop: 12 }}
              onPress={() => setActiveModal(null)}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>Got it</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  /* 1. TOP HEADER */
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
    backgroundColor: '#FFFFFF',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  renewText: {
    fontSize: 22,
    fontWeight: '900',
    fontStyle: 'italic',
    color: '#0A1128',
    letterSpacing: -0.5,
  },
  xText: {
    fontSize: 22,
    fontWeight: '900',
    fontStyle: 'italic',
    color: '#F59E0B',
    marginLeft: 1,
  },
  taglineText: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#476E8E',
    marginTop: -2,
    letterSpacing: 0.1,
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  safetyCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  redBadgeWrap: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#EF4444',
    paddingHorizontal: 4,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  redBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },

  /* 2. LOCATION ROW */
  locationBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  locationPinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 18,
    maxWidth: '56%',
  },
  locationPinText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  useLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FEF08A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
  },
  useLocationText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0F172A',
  },

  /* SCROLL CONTENT */
  scrollContent: {
    paddingBottom: 110,
  },

  /* 3. TITLE SECTION */
  titleSection: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  devicesCountSubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },

  /* 4. SEARCH BAR */
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 46,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 6,
  },
  searchVoiceBtn: {
    padding: 4,
  },
  searchCartBtn: {
    padding: 4,
    position: 'relative',
  },
  searchCartBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FACC15',
    width: 15,
    height: 15,
    borderRadius: 7.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchCartBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#0F172A',
  },

  /* 5. CATEGORY STRIP */
  categoryStripSection: {
    marginBottom: 12,
  },
  categoryScrollTrack: {
    paddingHorizontal: 16,
    gap: 10,
  },
  categoryCard: {
    width: 80,
    height: 94,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  categoryCardSelected: {
    backgroundColor: '#FEF9C3',
    borderColor: '#FACC15',
    borderWidth: 1.5,
  },
  categoryImageWrap: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  categoryCutoutImg: {
    width: '100%',
    height: '100%',
  },
  categoryLabelText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#334155',
    textAlign: 'center',
  },
  categoryLabelSelected: {
    fontWeight: '800',
    color: '#0F172A',
  },

  /* 6. FILTER & VIEW TOGGLE */
  filtersBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  filterPillsTrack: {
    gap: 7,
    paddingRight: 8,
  },
  filterDropdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  filterDropdownPillActive: {
    backgroundColor: '#FEF9C3',
    borderColor: '#FACC15',
  },
  filterDropdownText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  filterDropdownTextActive: {
    color: '#0F172A',
    fontWeight: '800',
  },
  viewModeToggleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  viewModeBtn: {
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  viewModeBtnActive: {
    backgroundColor: '#FACC15',
  },

  /* 7. PRODUCTS GRID */
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    gap: 12,
  },
  productCard: {
    width: (SCREEN_WIDTH - 44) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 4,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 22,
  },
  badgePill: {
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  badgePillDiscount: {
    backgroundColor: '#FEF9C3',
  },
  badgePillNew: {
    backgroundColor: '#FEF3C7',
  },
  badgePillPopular: {
    backgroundColor: '#FFEDD5',
  },
  badgeText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  badgeTextDiscount: {
    color: '#854D0E',
  },
  badgeTextNew: {
    color: '#B45309',
  },
  badgeTextPopular: {
    color: '#C2410C',
  },
  wishlistIconWrap: {
    padding: 2,
  },
  productImageWrap: {
    height: 124,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  productImg: {
    width: '92%',
    height: '92%',
  },
  productTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  productSpecs: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 8,
  },
  priceCartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
  priceCol: {
    justifyContent: 'center',
  },
  priceCurrent: {
    fontSize: 15.5,
    fontWeight: '900',
    color: '#0F172A',
  },
  priceMrp: {
    fontSize: 11.5,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
    marginTop: 0.5,
  },
  yellowCartBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FACC15',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#CA8A04',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },

  /* LIST VIEW STYLES */
  listContainer: {
    paddingHorizontal: 16,
    gap: 10,
  },
  productCardList: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 10,
    gap: 12,
  },
  listThumbWrap: {
    width: 76,
    height: 76,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  listThumbImg: {
    width: '88%',
    height: '88%',
  },
  listBadgePill: {
    position: 'absolute',
    bottom: 2,
    backgroundColor: '#FEF9C3',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  listBadgeText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#854D0E',
  },

  /* 8. BOTTOM NAVIGATION BAR */
  bottomNavBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 10,
  },
  bottomNavItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomNavLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#334155',
    marginTop: 2,
  },
  homeActivePill: {
    backgroundColor: '#FEF08A',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeActiveText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 1,
  },
  centerSellBtnWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -16,
  },
  centerSellCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FACC15',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  sellNavLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },

  /* LOADING & EMPTY STATES */
  loadingWrap: {
    paddingVertical: 50,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  resetFiltersBtn: {
    marginTop: 12,
    backgroundColor: '#168A4A',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
  },
  resetFiltersBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  /* MODAL SHEETS */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheetCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '75%',
  },
  modalSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 6,
  },
  modalSheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  modalOptionRowSelected: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  modalOptionText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#334155',
  },
  modalOptionTextSelected: {
    color: '#168A4A',
    fontWeight: '800',
  },
});
