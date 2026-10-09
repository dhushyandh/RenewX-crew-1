import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  TextInput,
  Dimensions,
  Platform,
  ActivityIndicator,
  Modal,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeHeaderTop } from '@/lib/useSafeHeaderTop';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useLocation } from '@/context/LocationContext';
import { useNotifications } from '@/context/NotificationContext';
import { useToast } from '@/context/ToastContext';
import { api } from '@/services/api';
import { mapProductRow } from '@/lib/productMapper';
import type { Product } from '@/types';
import RenewXLogo from '@/components/RenewXLogo';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Category Tiles with icons matching Picture 2
const CATEGORY_TILES = [
  { id: 'Smartphones', label: 'Smartphones', icon: 'phone-portrait-outline' as const },
  { id: 'Laptops', label: 'Laptops', icon: 'laptop-outline' as const },
  { id: 'Tablets', label: 'Tablets', icon: 'tablet-portrait-outline' as const },
  { id: 'Smartwatches', label: 'Smartwatches', icon: 'watch-outline' as const },
  { id: 'Earbuds', label: 'Earbuds', icon: 'headset-outline' as const },
  { id: 'Accessories', label: 'Accessories', icon: 'sparkles-outline' as const },
  { id: 'Cameras', label: 'Cameras', icon: 'camera-outline' as const },
  { id: 'Gaming', label: 'Gaming', icon: 'game-controller-outline' as const },
];

export default function ShopScreen() {
  const safeTop = useSafeHeaderTop();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const { addToCart, totalItems } = useCart();
  const { isInWishlist, toggleWishlist, totalWishlistItems } = useWishlist();
  const { location, area, pincode, detectLocation, setShowLocationModal, isDetecting } = useLocation();
  const { unreadCount } = useNotifications();
  const toast = useToast();

  const [searchQuery, setSearchQuery] = useState(route.params?.search || '');
  const [selectedCategory, setSelectedCategory] = useState<string>(route.params?.category || 'Smartphones');
  const [selectedSort, setSelectedSort] = useState<'recommended' | 'price_low' | 'price_high' | 'rating' | 'newest'>('recommended');
  const [selectedCondition, setSelectedCondition] = useState<string>('All');
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>('All');
  const [selectedBrand, setSelectedBrand] = useState<string>('All');
  const [isGridView, setIsGridView] = useState(true);

  // Filter Modals
  const [activeModal, setActiveModal] = useState<'sort' | 'condition' | 'price' | 'brand' | 'filter' | null>(null);

  // Products from backend
  const [backendProducts, setBackendProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Sync category & search from route params & browser URL query string
  useEffect(() => {
    if (route.params?.category) {
      setSelectedCategory(route.params.category);
    } else if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const urlCat = searchParams.get('category');
        if (urlCat) {
          setSelectedCategory(urlCat);
        }
      } catch {}
    }

    if (route.params?.search) {
      setSearchQuery(route.params.search);
    } else if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const urlSearch = searchParams.get('search');
        if (urlSearch) {
          setSearchQuery(urlSearch);
        }
      } catch {}
    }
  }, [route.params?.category, route.params?.search, route.params?._t]);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.products.getAll({ limit: 100 });
      if (Array.isArray(data)) {
        setBackendProducts(data.map(mapProductRow));
      } else {
        setBackendProducts([]);
      }
    } catch {
      setBackendProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  };

  // Live products directly from backend
  const allProducts = backendProducts;

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    return allProducts.filter((product) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = product.name?.toLowerCase().includes(q);
        const brandMatch = product.brand?.toLowerCase().includes(q);
        const catMatch = product.category?.toLowerCase().includes(q);
        if (!nameMatch && !brandMatch && !catMatch) return false;
      }

      // 2. Category
      if (selectedCategory && selectedCategory !== 'All') {
        const cat = selectedCategory.toLowerCase();
        const pCat = (product.category || '').toLowerCase();
        const pName = (product.name || '').toLowerCase();

        if (cat === 'smartphones') {
          if (!pCat.includes('phone') && !pCat.includes('mobile') && !pCat.includes('smart') && !pName.includes('iphone') && !pName.includes('galaxy') && !pName.includes('pixel')) {
            return false;
          }
        } else if (cat === 'laptops') {
          if (!pCat.includes('laptop') && !pCat.includes('mac') && !pCat.includes('computer') && !pName.includes('macbook') && !pName.includes('laptop') && !pName.includes('surface')) {
            return false;
          }
        } else if (cat === 'tablets') {
          if (!pCat.includes('tab') && !pCat.includes('pad') && !pName.includes('ipad') && !pName.includes('tab')) {
            return false;
          }
        } else if (cat === 'smartwatches') {
          if (!pCat.includes('watch') && !pName.includes('watch') && !pName.includes('fit')) {
            return false;
          }
        } else if (cat === 'earbuds') {
          if (!pCat.includes('audio') && !pCat.includes('ear') && !pCat.includes('headphone') && !pName.includes('airpod') && !pName.includes('buds')) {
            return false;
          }
        } else if (cat === 'accessories') {
          if (!pCat.includes('access') && !pCat.includes('cable') && !pCat.includes('charger') && !pName.includes('charger') && !pName.includes('cable')) {
            return false;
          }
        } else if (!pCat.includes(cat) && !pName.includes(cat)) {
          return false;
        }
      }

      // 3. Condition
      if (selectedCondition !== 'All') {
        const cond = (product.condition || '').toLowerCase();
        if (!cond.includes(selectedCondition.toLowerCase())) return false;
      }

      // 4. Price
      if (selectedPriceRange !== 'All') {
        const p = product.price;
        if (selectedPriceRange === 'under_10k' && p >= 10000) return false;
        if (selectedPriceRange === '10k_30k' && (p < 10000 || p > 30000)) return false;
        if (selectedPriceRange === '30k_60k' && (p < 30000 || p > 60000)) return false;
        if (selectedPriceRange === 'above_60k' && p <= 60000) return false;
      }

      // 5. Brand
      if (selectedBrand !== 'All') {
        const b = (product.brand || '').toLowerCase();
        if (!b.includes(selectedBrand.toLowerCase())) return false;
      }

      return true;
    }).sort((a, b) => {
      if (selectedSort === 'price_low') return a.price - b.price;
      if (selectedSort === 'price_high') return b.price - a.price;
      if (selectedSort === 'rating') return (b.rating || 0) - (a.rating || 0);
      return 0;
    });
  }, [allProducts, searchQuery, selectedCategory, selectedCondition, selectedPriceRange, selectedBrand, selectedSort]);

  const displayLocation = location || (area && pincode ? `${area} - ${pincode}` : 'Vellore - 632012');

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    try {
      navigation.navigate('MainTabs', { screen: 'Categories' });
    } catch {
      navigation.navigate('Categories');
    }
  };

  const handleAddToCart = (item: Product, e: any) => {
    e?.stopPropagation?.();
    addToCart(item);
    toast.success(item.name, 'Added to Cart');
  };

  const handleToggleWishlist = (item: Product, e: any) => {
    e?.stopPropagation?.();
    const isNow = toggleWishlist(item);
    if (isNow) {
      toast.success(item.name, 'Added to Wishlist');
    } else {
      toast.info(item.name, 'Removed from Wishlist');
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. TOP HEADER ROW */}
      <View style={[styles.headerContainer, { paddingTop: Math.max(safeTop, 12) + 6 }]}>
        <View style={styles.subpageTopRow}>
          <View style={styles.headerTitleGroup}>
            <TouchableOpacity
              onPress={handleBack}
              style={styles.backCircleBtn}
              accessibilityLabel="Back"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={20} color="#0F172A" />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.headerScreenTitle} numberOfLines={1}>
                {selectedCategory && selectedCategory !== 'All' ? selectedCategory : 'Shop'}
              </Text>
              <Text style={styles.headerSubtitleText} numberOfLines={1}>
                {filteredProducts.length} certified devices
              </Text>
            </View>
          </View>

          <View style={styles.headerRightIcons}>
            {/* Wishlist Button with yellow badge */}
            <TouchableOpacity
              style={styles.circleIconBtn}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Wishlist')}
              accessibilityLabel="Wishlist"
            >
              <Ionicons name="heart-outline" size={19} color="#0F172A" />
              {totalWishlistItems > 0 && (
                <View style={styles.yellowCountBadge}>
                  <Text style={styles.yellowCountBadgeText}>{totalWishlistItems}</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Cart Button with yellow badge */}
            <TouchableOpacity
              style={styles.circleIconBtn}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Cart')}
              accessibilityLabel="Cart"
            >
              <Ionicons name="cart-outline" size={19} color="#0F172A" />
              {totalItems > 0 && (
                <View style={styles.yellowCountBadge}>
                  <Text style={styles.yellowCountBadgeText}>{totalItems}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* MAIN SCROLLABLE CONTENT */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FEF08A"
            colors={['#FACC15', '#16A34A']}
          />
        }
      >
        {/* 2. SEARCH BAR */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={19} color="#64748B" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search RenewX (iPhone, Mac, iPad...)"
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" style={{ marginRight: 6 }} />
            </TouchableOpacity>
          ) : null}
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

        {/* 5. HORIZONTAL CATEGORY SELECTOR TILES */}
        <View style={styles.categoryTilesSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryTilesScroll}
          >
            {CATEGORY_TILES.map((cat) => {
              const isSelected = selectedCategory.toLowerCase() === cat.id.toLowerCase();
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryTile,
                    isSelected && styles.categoryTileSelected,
                  ]}
                  activeOpacity={0.85}
                  onPress={() => {
                    const next = isSelected ? 'All' : cat.id;
                    setSelectedCategory(next);
                    if (Platform.OS === 'web' && typeof window !== 'undefined') {
                      try {
                        const nextUrl = next === 'All' ? '/shop' : `/shop?category=${encodeURIComponent(next)}`;
                        window.history.replaceState({}, '', nextUrl);
                      } catch {}
                    }
                  }}
                >
                  <Ionicons
                    name={cat.icon}
                    size={22}
                    color="#0F172A"
                    style={{ marginBottom: 4 }}
                  />
                  <Text
                    style={[
                      styles.categoryTileText,
                      isSelected && styles.categoryTileTextSelected,
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

        {/* 6. FILTER & SORT PILLS ROW */}
        <View style={styles.filterPillsRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterPillsScroll}
          >
            {/* Sort by */}
            <TouchableOpacity
              style={[styles.dropdownPill, selectedSort !== 'recommended' && styles.dropdownPillActive]}
              activeOpacity={0.8}
              onPress={() => setActiveModal('sort')}
            >
              <Ionicons name="swap-vertical-outline" size={13} color="#0F172A" style={{ marginRight: 4 }} />
              <Text style={styles.dropdownPillText}>
                {selectedSort === 'recommended' ? 'Sort by' : selectedSort === 'price_low' ? 'Price: Low' : selectedSort === 'price_high' ? 'Price: High' : 'Rating'}
              </Text>
              <Ionicons name="chevron-down" size={12} color="#0F172A" style={{ marginLeft: 3 }} />
            </TouchableOpacity>

            {/* Condition */}
            <TouchableOpacity
              style={[styles.dropdownPill, selectedCondition !== 'All' && styles.dropdownPillActive]}
              activeOpacity={0.8}
              onPress={() => setActiveModal('condition')}
            >
              <Ionicons name="options-outline" size={13} color="#0F172A" style={{ marginRight: 4 }} />
              <Text style={styles.dropdownPillText}>
                {selectedCondition === 'All' ? 'Condition' : selectedCondition}
              </Text>
              <Ionicons name="chevron-down" size={12} color="#0F172A" style={{ marginLeft: 3 }} />
            </TouchableOpacity>

            {/* Price */}
            <TouchableOpacity
              style={[styles.dropdownPill, selectedPriceRange !== 'All' && styles.dropdownPillActive]}
              activeOpacity={0.8}
              onPress={() => setActiveModal('price')}
            >
              <Text style={[styles.dropdownPillText, { marginRight: 2 }]}>₹</Text>
              <Text style={styles.dropdownPillText}>Price</Text>
              <Ionicons name="chevron-down" size={12} color="#0F172A" style={{ marginLeft: 3 }} />
            </TouchableOpacity>

            {/* Brand */}
            <TouchableOpacity
              style={[styles.dropdownPill, selectedBrand !== 'All' && styles.dropdownPillActive]}
              activeOpacity={0.8}
              onPress={() => setActiveModal('brand')}
            >
              <Ionicons name="pricetag-outline" size={13} color="#0F172A" style={{ marginRight: 4 }} />
              <Text style={styles.dropdownPillText}>
                {selectedBrand === 'All' ? 'Brand' : selectedBrand}
              </Text>
              <Ionicons name="chevron-down" size={12} color="#0F172A" style={{ marginLeft: 3 }} />
            </TouchableOpacity>

            {/* View Switch: Grid / List */}
            <View style={styles.viewSwitchGroup}>
              <TouchableOpacity
                style={[styles.viewSwitchBtn, isGridView && styles.viewSwitchBtnActive]}
                onPress={() => setIsGridView(true)}
              >
                <Ionicons name="grid" size={15} color={isGridView ? '#0F172A' : '#94A3B8'} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.viewSwitchBtn, !isGridView && styles.viewSwitchBtnActive]}
                onPress={() => setIsGridView(false)}
              >
                <Ionicons name="list" size={17} color={!isGridView ? '#0F172A' : '#94A3B8'} />
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>

        {/* 7. RESULTS COUNT & FILTER BUTTON */}
        <View style={styles.resultsBar}>
          <Text style={styles.resultsCountText}>
            {filteredProducts.length} devices
          </Text>

          <TouchableOpacity
            style={styles.filterToggleBtn}
            activeOpacity={0.8}
            onPress={() => setActiveModal('filter')}
          >
            <Text style={styles.filterToggleText}>Filter</Text>
            <Ionicons name="funnel-outline" size={14} color="#0F172A" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </View>

        {/* 8. PRODUCT CARDS GRID */}
        {filteredProducts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No devices found</Text>
            <Text style={styles.emptySubtitle}>Try adjusting your filters or search keywords.</Text>
            <TouchableOpacity
              style={styles.resetFiltersBtn}
              onPress={() => {
                setSelectedCategory('All');
                setSelectedCondition('All');
                setSelectedPriceRange('All');
                setSelectedBrand('All');
                setSearchQuery('');
              }}
            >
              <Text style={styles.resetFiltersText}>Reset all filters</Text>
            </TouchableOpacity>
          </View>
        ) : isGridView ? (
          <View style={styles.gridContainer}>
            {filteredProducts.map((item: any, idx) => {
              const isWish = isInWishlist(item.id);
              const origPrice = item.originalPrice || Math.round(item.price * 1.25);
              const discountText = item.badge || `${Math.round(((origPrice - item.price) / origPrice) * 100)}% OFF`;
              const badgeType = item.badgeType || (idx === 3 ? 'new' : idx === 5 ? 'popular' : 'discount');

              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.productCard}
                  activeOpacity={0.9}
                  onPress={() => navigation.navigate('ProductDetail', { id: item.id, product: item })}
                >
                  {/* Top: Badge + Wishlist */}
                  <View style={styles.cardHeader}>
                    {badgeType === 'new' ? (
                      <View style={styles.badgeNew}>
                        <Text style={styles.badgeNewText}>New</Text>
                      </View>
                    ) : badgeType === 'popular' ? (
                      <View style={styles.badgePopular}>
                        <Text style={styles.badgePopularText}>Popular</Text>
                      </View>
                    ) : (
                      <View style={styles.badgeDiscount}>
                        <Text style={styles.badgeDiscountText}>{discountText}</Text>
                      </View>
                    )}

                    <TouchableOpacity
                      onPress={(e) => handleToggleWishlist(item, e)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons
                        name={isWish ? 'heart' : 'heart-outline'}
                        size={18}
                        color={isWish ? '#EF4444' : '#0F172A'}
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Product Image */}
                  <View style={styles.imageWrapper}>
                    <Image
                      source={{ uri: item.image || item.imageUrl }}
                      style={styles.productImage}
                      resizeMode="contain"
                    />
                  </View>

                  {/* Title & Specs */}
                  <Text style={styles.productTitle} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.productSpecs} numberOfLines={1}>
                    {item.specsText || `${item.condition || 'Excellent'}`}
                  </Text>

                  {/* Bottom: Price + Cart Button */}
                  <View style={styles.cardFooter}>
                    <View style={styles.priceColumn}>
                      {item.is_best_price || item.isBestPrice || item.price === 0 ? (
                        <View style={{ flexDirection: 'column', gap: 2 }}>
                          <Text style={{ fontSize: 13, fontWeight: '800', color: '#047857' }}>Best Price</Text>
                          <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#92400E', backgroundColor: '#FEF3C7', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4, alignSelf: 'flex-start' }}>COD Only</Text>
                        </View>
                      ) : (
                        <>
                          <Text style={styles.priceText}>
                            ₹{item.price?.toLocaleString('en-IN')}
                          </Text>
                          {origPrice > item.price && (
                            <Text style={styles.originalPriceText}>
                              ₹{origPrice?.toLocaleString('en-IN')}
                            </Text>
                          )}
                        </>
                      )}
                    </View>

                    <TouchableOpacity
                      style={styles.cardCartBtn}
                      activeOpacity={0.85}
                      onPress={(e) => handleAddToCart(item, e)}
                    >
                      <Ionicons name="cart-outline" size={17} color="#0F172A" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          /* List View */
          <View style={styles.listContainer}>
            {filteredProducts.map((item: any) => {
              const isWish = isInWishlist(item.id);
              const origPrice = item.originalPrice || Math.round(item.price * 1.25);
              const isBestPrice = item.is_best_price || item.isBestPrice || item.price === 0;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.listCard}
                  activeOpacity={0.9}
                  onPress={() => navigation.navigate('ProductDetail', { id: item.id, product: item })}
                >
                  <Image
                    source={{ uri: item.image || item.imageUrl }}
                    style={styles.listImage}
                    resizeMode="contain"
                  />
                  <View style={styles.listContent}>
                    <Text style={styles.productTitle} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.productSpecs}>{item.specsText || item.condition}</Text>
                    <View style={styles.listPriceRow}>
                      {isBestPrice ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 13, fontWeight: '800', color: '#047857' }}>Best Price</Text>
                          <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#92400E', backgroundColor: '#FEF3C7', paddingHorizontal: 5, paddingVertical: 1.5, borderRadius: 4 }}>COD Only</Text>
                        </View>
                      ) : (
                        <>
                          <Text style={styles.priceText}>₹{item.price?.toLocaleString('en-IN')}</Text>
                          {origPrice > item.price && (
                            <Text style={styles.originalPriceText}>₹{origPrice?.toLocaleString('en-IN')}</Text>
                          )}
                        </>
                      )}
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.cardCartBtn}
                    onPress={(e) => handleAddToCart(item, e)}
                  >
                    <Ionicons name="cart-outline" size={17} color="#0F172A" />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* FILTER / SORT MODAL */}
      <Modal
        visible={activeModal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveModal(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setActiveModal(null)}
        >
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.modalSheetHeader}>
              <Text style={styles.modalSheetTitle}>
                {activeModal === 'sort' && 'Sort Options'}
                {activeModal === 'condition' && 'Device Condition'}
                {activeModal === 'price' && 'Price Range'}
                {activeModal === 'brand' && 'Brands'}
                {activeModal === 'filter' && 'Filters'}
              </Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <Ionicons name="close" size={22} color="#0F172A" />
              </TouchableOpacity>
            </View>

            {/* Sort Options */}
            {activeModal === 'sort' && (
              <View style={styles.modalOptionsList}>
                {[
                  { id: 'recommended', label: 'Recommended' },
                  { id: 'price_low', label: 'Price: Low to High' },
                  { id: 'price_high', label: 'Price: High to Low' },
                  { id: 'rating', label: 'Customer Rating' },
                ].map((opt) => (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.modalOptionItem, selectedSort === opt.id && styles.modalOptionSelected]}
                    onPress={() => {
                      setSelectedSort(opt.id as any);
                      setActiveModal(null);
                    }}
                  >
                    <Text style={[styles.modalOptionText, selectedSort === opt.id && styles.modalOptionTextSelected]}>
                      {opt.label}
                    </Text>
                    {selectedSort === opt.id && <Ionicons name="checkmark" size={18} color="#0F172A" />}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Condition Options */}
            {activeModal === 'condition' && (
              <View style={styles.modalOptionsList}>
                {['All', 'Excellent', 'Like New', 'Good', 'Fair'].map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.modalOptionItem, selectedCondition === c && styles.modalOptionSelected]}
                    onPress={() => {
                      setSelectedCondition(c);
                      setActiveModal(null);
                    }}
                  >
                    <Text style={[styles.modalOptionText, selectedCondition === c && styles.modalOptionTextSelected]}>
                      {c === 'All' ? 'All Conditions' : `${c} Condition`}
                    </Text>
                    {selectedCondition === c && <Ionicons name="checkmark" size={18} color="#0F172A" />}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Price Options */}
            {activeModal === 'price' && (
              <View style={styles.modalOptionsList}>
                {[
                  { id: 'All', label: 'All Prices' },
                  { id: 'under_10k', label: 'Under ₹10,000' },
                  { id: '10k_30k', label: '₹10,000 - ₹30,000' },
                  { id: '30k_60k', label: '₹30,000 - ₹60,000' },
                  { id: 'above_60k', label: 'Above ₹60,000' },
                ].map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.modalOptionItem, selectedPriceRange === p.id && styles.modalOptionSelected]}
                    onPress={() => {
                      setSelectedPriceRange(p.id);
                      setActiveModal(null);
                    }}
                  >
                    <Text style={[styles.modalOptionText, selectedPriceRange === p.id && styles.modalOptionTextSelected]}>
                      {p.label}
                    </Text>
                    {selectedPriceRange === p.id && <Ionicons name="checkmark" size={18} color="#0F172A" />}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Brand Options */}
            {activeModal === 'brand' && (
              <View style={styles.modalOptionsList}>
                {['All', 'Apple', 'Samsung', 'OnePlus', 'Xiaomi', 'Noise', 'Microsoft', 'Anker'].map((b) => (
                  <TouchableOpacity
                    key={b}
                    style={[styles.modalOptionItem, selectedBrand === b && styles.modalOptionSelected]}
                    onPress={() => {
                      setSelectedBrand(b);
                      setActiveModal(null);
                    }}
                  >
                    <Text style={[styles.modalOptionText, selectedBrand === b && styles.modalOptionTextSelected]}>
                      {b}
                    </Text>
                    {selectedBrand === b && <Ionicons name="checkmark" size={18} color="#0F172A" />}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Combined Filter Options */}
            {activeModal === 'filter' && (
              <View style={{ gap: 14 }}>
                <Text style={{ fontSize: 13, color: '#64748B' }}>Quick filter by brand or condition</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {['Apple', 'Samsung', 'OnePlus', 'Noise', 'Excellent', 'Under ₹30,000'].map((f) => (
                    <TouchableOpacity
                      key={f}
                      style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F1F5F9' }}
                      onPress={() => {
                        if (f === 'Under ₹30,000') setSelectedPriceRange('10k_30k');
                        else if (f === 'Excellent') setSelectedCondition('Excellent');
                        else setSelectedBrand(f);
                        setActiveModal(null);
                      }}
                    >
                      <Text style={{ fontSize: 13, color: '#0F172A', fontWeight: '600' }}>{f}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  style={{ backgroundColor: '#FEF08A', paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 10 }}
                  onPress={() => setActiveModal(null)}
                >
                  <Text style={{ fontWeight: '700', color: '#0F172A' }}>Apply</Text>
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
    backgroundColor: '#FAFAFA',
  },
  headerContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
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
    flex: 1,
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
  headerScreenTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitleText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  headerRightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  yellowCountBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FEF08A',
    borderRadius: 9,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FACC15',
  },
  yellowCountBadgeText: {
    color: '#0F172A',
    fontSize: 9,
    fontWeight: '800',
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 14,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  titleSection: {
    marginBottom: 12,
  },
  titleText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  subtitleText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#64748B',
    marginTop: 3,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 25,
    paddingHorizontal: 14,
    height: 46,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#0F172A',
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
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 15,
    height: 15,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  cartIconBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  categoryTilesSection: {
    marginBottom: 16,
  },
  categoryTilesScroll: {
    gap: 10,
    paddingRight: 8,
  },
  categoryTile: {
    width: 68,
    height: 68,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  categoryTileSelected: {
    backgroundColor: '#FEF08A',
    borderColor: '#FDE047',
  },
  categoryTileText: {
    fontSize: 10.5,
    fontWeight: '500',
    color: '#334155',
    textAlign: 'center',
  },
  categoryTileTextSelected: {
    fontWeight: '700',
    color: '#0F172A',
  },
  filterPillsRow: {
    marginBottom: 14,
  },
  filterPillsScroll: {
    alignItems: 'center',
    gap: 8,
    paddingRight: 8,
  },
  dropdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  dropdownPillActive: {
    backgroundColor: '#FEF08A',
    borderColor: '#FACC15',
  },
  dropdownPillText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#0F172A',
  },
  viewSwitchGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    padding: 3,
    marginLeft: 6,
  },
  viewSwitchBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewSwitchBtnActive: {
    backgroundColor: '#FEF08A',
  },
  resultsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  resultsCountText: {
    fontSize: 13.5,
    fontWeight: '500',
    color: '#64748B',
  },
  filterToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  filterToggleText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  productCard: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 10,
    marginBottom: 12,
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  badgeDiscount: {
    backgroundColor: '#FEF08A',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeDiscountText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0F172A',
  },
  badgeNew: {
    backgroundColor: '#FEF3C7',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeNewText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
  },
  badgePopular: {
    backgroundColor: '#FFEDD5',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgePopularText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#C2410C',
  },
  imageWrapper: {
    width: '100%',
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  productImage: {
    width: '90%',
    height: '90%',
  },
  productTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 4,
  },
  productSpecs: {
    fontSize: 12,
    fontWeight: '400',
    color: '#64748B',
    marginTop: 2,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
  priceColumn: {
    flexDirection: 'column',
  },
  priceText: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  originalPriceText: {
    fontSize: 11.5,
    fontWeight: '400',
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  cardCartBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF08A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContainer: {
    gap: 12,
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  listImage: {
    width: 70,
    height: 70,
    marginRight: 12,
  },
  listContent: {
    flex: 1,
  },
  listPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
  resetFiltersBtn: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FEF08A',
  },
  resetFiltersText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '60%',
  },
  modalSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalSheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalOptionsList: {
    gap: 6,
  },
  modalOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  modalOptionSelected: {
    backgroundColor: '#FEF08A',
  },
  modalOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
  },
  modalOptionTextSelected: {
    fontWeight: '700',
  },
});
