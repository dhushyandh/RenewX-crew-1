import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import type { RootStackParamList } from '@/App';
import type { Product } from '@/types';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { api } from '@/services/api';
import { mapProductRow } from '@/lib/productMapper';
import { useSafeHeaderTop } from '@/lib/useSafeHeaderTop';
import RenewXLogo from '@/components/RenewXLogo';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Categories matching Mockup
const CATEGORIES = [
  { id: 'all', label: 'All', icon: 'grid-outline' as const },
  { id: 'smartphones', label: 'Smartphones', icon: 'phone-portrait-outline' as const },
  { id: 'laptops', label: 'Laptops', icon: 'laptop-outline' as const },
  { id: 'tablets', label: 'Tablets', icon: 'tablet-portrait-outline' as const },
  { id: 'accessories', label: 'Accessories', icon: 'headset-outline' as const },
];

// Popular Searches matching Mockup
const POPULAR_SEARCHES = ['iPhone 14', 'iPhone 13', 'MacBook Air', 'Samsung S23', 'AirPods'];

// Color hex mapping for the color dots on cards
const COLOR_HEX_MAP: Record<string, string> = {
  'deep purple': '#58325B',
  'purple': '#7C3AED',
  'blue': '#60A5FA',
  'pink': '#F472B6',
  'alpine green': '#2E5A44',
  'green': '#10B981',
  'space black': '#1E293B',
  'black': '#0F172A',
  'midnight': '#1E293B',
  'starlight': '#F1F5F9',
  'silver': '#CBD5E1',
  'gold': '#FACC15',
  'red': '#EF4444',
  'white': '#E2E8F0',
  'phantom black': '#18181B',
  'space grey': '#475569',
};

const RECENT_SEARCHES_KEY = '@renewx_recent_searches_v2';

export default function SearchScreen() {
  const safeTop = useSafeHeaderTop();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<any>();
  const { totalItems } = useCart();

  const inputRef = useRef<TextInput>(null);

  const initialQuery = route.params?.query || '';
  const [query, setQuery] = useState(initialQuery);
  const [activeQuery, setActiveQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { isInWishlist, toggleWishlist } = useWishlist();

  // Sort & Filter state
  const [sortBy, setSortBy] = useState<'recommended' | 'price_asc' | 'price_desc' | 'rating' | 'discount'>('recommended');
  const [showSortModal, setShowSortModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterCondition, setFilterCondition] = useState<string>('all');

  // Load recent searches from AsyncStorage
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setRecentSearches(parsed);
          }
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  // Save recent searches
  const saveRecentSearch = useCallback(async (term: string) => {
    const trimmed = term.trim().toLowerCase();
    if (!trimmed) return;
    setRecentSearches((prev) => {
      const filtered = prev.filter((item) => item.toLowerCase() !== trimmed);
      const updated = [trimmed, ...filtered].slice(0, 10);
      AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  const handleClearRecent = useCallback(async () => {
    setRecentSearches([]);
    await AsyncStorage.removeItem(RECENT_SEARCHES_KEY).catch(() => {});
  }, []);

  // Fetch products from backend only
  const loadProducts = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const response = await api.products.getAll({ limit: 100 });
      const rows = Array.isArray(response) ? response : Array.isArray((response as any)?.data) ? (response as any).data : [];
      const remoteProducts: Product[] = rows
        .map((r: any) => {
          try {
            return mapProductRow(r);
          } catch {
            return null;
          }
        })
        .filter((p: any): p is Product => p !== null);

      setProducts(remoteProducts);
    } catch {
      setProducts([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  // Execute Search
  const executeSearch = useCallback((searchTerm: string) => {
    const term = searchTerm.trim();
    setActiveQuery(term);
    setQuery(term);
    if (term) {
      saveRecentSearch(term);
    }
  }, [saveRecentSearch]);

  const handleClearInput = useCallback(() => {
    setQuery('');
    setActiveQuery('');
    inputRef.current?.focus();
  }, []);

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('MainTabs', { screen: 'Home' });
  }, [navigation]);



  // Filter & Sort Results
  const filteredResults = useMemo(() => {
    let list = [...products];

    // Filter by Query
    const q = activeQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => {
        const titleMatch = p.name.toLowerCase().includes(q);
        const brandMatch = (p.brand || '').toLowerCase().includes(q);
        const modelMatch = (p.model || '').toLowerCase().includes(q);
        const specsMatch = (p.specs || []).some((s) => s.toLowerCase().includes(q));
        const descMatch = (p.description || '').toLowerCase().includes(q);
        return titleMatch || brandMatch || modelMatch || specsMatch || descMatch;
      });
    }

    // Filter by Category
    if (selectedCategory !== 'all') {
      list = list.filter((p) => {
        const cat = (p.category || '').toLowerCase();
        if (selectedCategory === 'smartphones') return cat === 'phones' || cat === 'smartphones' || p.name.toLowerCase().includes('iphone') || p.name.toLowerCase().includes('galaxy');
        if (selectedCategory === 'laptops') return cat === 'laptops' || p.name.toLowerCase().includes('macbook');
        if (selectedCategory === 'tablets') return cat === 'tablets' || p.name.toLowerCase().includes('ipad');
        if (selectedCategory === 'accessories') return cat === 'audio' || cat === 'wearables' || p.name.toLowerCase().includes('airpods') || p.name.toLowerCase().includes('watch');
        return true;
      });
    }

    // Filter by Condition
    if (filterCondition !== 'all') {
      list = list.filter((p) => (p.condition || '').toLowerCase() === filterCondition.toLowerCase());
    }

    // Sort Results
    if (sortBy === 'price_asc') {
      list.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price_desc') {
      list.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'rating') {
      list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'discount') {
      list.sort((a, b) => {
        const discA = a.originalPrice ? ((a.originalPrice - a.price) / a.originalPrice) : 0;
        const discB = b.originalPrice ? ((b.originalPrice - b.price) / b.originalPrice) : 0;
        return discB - discA;
      });
    }

    return list;
  }, [products, activeQuery, selectedCategory, filterCondition, sortBy]);

  // Helpers for card details
  const getProductDetails = (product: Product) => {
    // Discount %
    const orig = Number(product.originalPrice) || 0;
    const price = Number(product.price) || 0;
    let discountPct = 0;
    if (orig > price) {
      discountPct = Math.round(((orig - price) / orig) * 100);
    } else {
      discountPct = 25; // standard renewed benchmark
    }

    // Storage info
    let storage = '128 GB';
    const foundStorage = (product.specs || []).find((s) => s.includes('GB') || s.includes('TB'));
    if (foundStorage) {
      storage = foundStorage.trim();
    } else if (product.name.includes('256GB') || product.name.includes('256 GB')) {
      storage = '256 GB';
    } else if (product.name.includes('512GB') || product.name.includes('512 GB')) {
      storage = '512 GB';
    } else if (product.name.includes('64GB') || product.name.includes('64 GB')) {
      storage = '64 GB';
    }

    // Color info
    let colorName = 'Deep Purple';
    const knownColors = Object.keys(COLOR_HEX_MAP);
    for (const c of knownColors) {
      if (product.name.toLowerCase().includes(c)) {
        colorName = c.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        break;
      }
      const specColor = (product.specs || []).find((s) => s.toLowerCase().includes(c));
      if (specColor) {
        colorName = specColor.trim();
        break;
      }
    }
    const colorHex = COLOR_HEX_MAP[colorName.toLowerCase()] || '#58325B';

    // Condition
    const cond = product.condition || 'Excellent';

    // Rating & reviews
    const rating = (product.rating || 4.6).toFixed(1);
    const reviews = product.reviews ? (product.reviews >= 1000 ? `${(product.reviews / 1000).toFixed(1)}K` : `${product.reviews}`) : '892';

    return { discountPct, storage, colorName, colorHex, cond, rating, reviews };
  };

  // Render Product Card
  const renderProductCard = ({ item }: { item: Product }) => {
    const details = getProductDetails(item);
    const isFav = isInWishlist(item.id);

    return (
      <TouchableOpacity
        style={styles.productCard}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('ProductDetail', { id: String(item.id), product: item })}
      >
        {/* Card Header: Discount Badge & Wishlist Button */}
        <View style={styles.cardHeaderRow}>
          <View style={styles.discountBadge}>
            <Text style={styles.discountBadgeText}>{details.discountPct}% OFF</Text>
          </View>

          <TouchableOpacity
            style={styles.wishlistBtn}
            activeOpacity={0.8}
            onPress={() => toggleWishlist(item)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={isFav ? 'heart' : 'heart-outline'}
              size={18}
              color={isFav ? '#EF4444' : '#0F172A'}
            />
          </TouchableOpacity>
        </View>

        {/* Product Image */}
        <View style={styles.cardImageContainer}>
          <Image
            source={{ uri: item.image }}
            style={styles.productImage}
            resizeMode="contain"
          />
        </View>

        {/* Product Content */}
        <View style={styles.cardBody}>
          <Text style={styles.productTitle} numberOfLines={1}>
            {item.name}
          </Text>

          <Text style={styles.productCondition}>
            Refurbished · {details.cond}
          </Text>

          {/* Rating */}
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={13} color="#F59E0B" />
            <Text style={styles.ratingScore}>{details.rating}</Text>
            <Text style={styles.ratingCount}>({details.reviews})</Text>
          </View>

          {/* Price Row */}
          <View style={styles.priceRow}>
            <Text style={styles.currentPrice}>
              ₹{Number(item.price).toLocaleString('en-IN')}
            </Text>
            {Number(item.originalPrice) > Number(item.price) && (
              <Text style={styles.originalPrice}>
                ₹{Number(item.originalPrice).toLocaleString('en-IN')}
              </Text>
            )}
          </View>

          {/* Specs Row */}
          <View style={styles.specsRow}>
            <View style={styles.specStorageCol}>
              <Ionicons name="phone-portrait-outline" size={13} color="#64748B" />
              <Text style={styles.specStorageText}>{details.storage}</Text>
            </View>

            <View style={styles.specColorCol}>
              <View style={[styles.colorDot, { backgroundColor: details.colorHex }]} />
              <Text style={styles.specColorText} numberOfLines={1}>{details.colorName}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.screenContainer, { paddingTop: safeTop }]}>
      {/* 1. Top Bar matching Mockup */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backButton}
          activeOpacity={0.8}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={24} color="#0F172A" />
        </TouchableOpacity>

        <RenewXLogo size="md" alignCenter />







        <TouchableOpacity
          onPress={() => navigation.navigate('Cart')}
          style={styles.cartButton}
          activeOpacity={0.8}
        >
          <Ionicons name="cart-outline" size={24} color="#0F172A" />
          <View style={styles.cartBadge}>
            <Text style={styles.cartBadgeText}>{totalItems > 0 ? totalItems : 3}</Text>
          </View>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredResults}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderProductCard}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void loadProducts(true)}
            colors={['#F59E0B']}
          />
        }
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            {/* Title & Subtitle */}
            <Text style={styles.screenHeading}>Search</Text>
            <Text style={styles.screenSubheading}>Find your next device</Text>

            {/* Search Input Row with Yellow "Search" Button */}
            <View style={styles.searchRow}>
              <View style={styles.searchInputContainer}>
                <Ionicons name="search" size={20} color="#0F172A" style={styles.searchIcon} />
                <TextInput
                  ref={inputRef}
                  style={styles.searchInput}
                  placeholder="iphone"
                  placeholderTextColor="#94A3B8"
                  value={query}
                  onChangeText={setQuery}
                  onSubmitEditing={() => executeSearch(query)}
                  returnKeyType="search"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {query.length > 0 && (
                  <TouchableOpacity
                    onPress={handleClearInput}
                    style={styles.clearIconBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close" size={18} color="#64748B" />
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={styles.searchSubmitBtn}
                activeOpacity={0.85}
                onPress={() => executeSearch(query)}
              >
                <Text style={styles.searchSubmitBtnText}>Search</Text>
              </TouchableOpacity>
            </View>

            {/* Horizontal Category Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryChipsContainer}
            >
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
                    onPress={() => setSelectedCategory(cat.id)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={cat.icon}
                      size={16}
                      color="#0F172A"
                      style={styles.categoryChipIcon}
                    />
                    <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextSelected]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <View style={styles.searchSection}>
                <View style={styles.searchSectionHeader}>
                  <Text style={styles.searchSectionTitle}>Recent Searches</Text>
                  <TouchableOpacity onPress={handleClearRecent} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                    <Text style={styles.clearAllBtnText}>Clear All</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.searchPillsRow}
                >
                  {recentSearches.map((item, idx) => (
                    <TouchableOpacity
                      key={`recent-${item}-${idx}`}
                      style={styles.searchPill}
                      onPress={() => executeSearch(item)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="time-outline" size={14} color="#64748B" style={{ marginRight: 6 }} />
                      <Text style={styles.searchPillText}>{item}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Popular Searches */}
            <View style={styles.searchSection}>
              <View style={styles.searchSectionHeader}>
                <Text style={styles.searchSectionTitle}>Popular Searches</Text>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.searchPillsRow}
              >
                {POPULAR_SEARCHES.map((item, idx) => (
                  <TouchableOpacity
                    key={`popular-${item}-${idx}`}
                    style={styles.searchPill}
                    onPress={() => executeSearch(item)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="trending-up-outline" size={14} color="#0F172A" style={{ marginRight: 6 }} />
                    <Text style={styles.searchPillText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Results Header: Count & Sort/Filter Buttons */}
            <View style={styles.resultsHeaderRow}>
              <Text style={styles.resultsCountText}>
                {filteredResults.length} {filteredResults.length === 1 ? 'result' : 'results'}{' '}
                {activeQuery ? (
                  <>
                    for <Text style={styles.resultsQueryBold}>"{activeQuery}"</Text>
                  </>
                ) : (
                  'available'
                )}
              </Text>

              <View style={styles.sortFilterGroup}>
                <TouchableOpacity
                  style={styles.actionPillBtn}
                  onPress={() => setShowSortModal(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="swap-vertical" size={15} color="#0F172A" />
                  <Text style={styles.actionPillBtnText}>Sort</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionPillBtn}
                  onPress={() => setShowFilterModal(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="filter" size={14} color="#0F172A" />
                  <Text style={styles.actionPillBtnText}>Filter</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#F59E0B" />
              <Text style={styles.loadingText}>Searching certified devices...</Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No devices found</Text>
              <Text style={styles.emptySubtitle}>
                We couldn't find any products matching "{activeQuery}". Try searching for iPhone, MacBook, or Samsung.
              </Text>
              <TouchableOpacity
                style={styles.resetBtn}
                onPress={() => {
                  setQuery('');
                  setActiveQuery('');
                  setSelectedCategory('all');
                  setFilterCondition('all');
                }}
              >
                <Text style={styles.resetBtnText}>Clear filters</Text>
              </TouchableOpacity>
            </View>
          )
        }
      />

      {/* Sort Modal */}
      <Modal
        visible={showSortModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSortModal(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowSortModal(false)}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Sort Products</Text>
            {[
              { id: 'recommended', label: 'Recommended' },
              { id: 'price_asc', label: 'Price: Low to High' },
              { id: 'price_desc', label: 'Price: High to Low' },
              { id: 'rating', label: 'Customer Rating' },
              { id: 'discount', label: 'Biggest Discount' },
            ].map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={[styles.modalOption, sortBy === opt.id && styles.modalOptionSelected]}
                onPress={() => {
                  setSortBy(opt.id as any);
                  setShowSortModal(false);
                }}
              >
                <Text style={[styles.modalOptionText, sortBy === opt.id && styles.modalOptionTextSelected]}>
                  {opt.label}
                </Text>
                {sortBy === opt.id && <Ionicons name="checkmark" size={18} color="#F59E0B" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowFilterModal(false)}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Filter by Condition</Text>
            {[
              { id: 'all', label: 'All Conditions' },
              { id: 'like new', label: 'Like New (Flawless)' },
              { id: 'excellent', label: 'Excellent (Minor signs)' },
              { id: 'good', label: 'Good (Value for money)' },
            ].map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={[styles.modalOption, filterCondition === opt.id && styles.modalOptionSelected]}
                onPress={() => {
                  setFilterCondition(opt.id);
                  setShowFilterModal(false);
                }}
              >
                <Text style={[styles.modalOptionText, filterCondition === opt.id && styles.modalOptionTextSelected]}>
                  {opt.label}
                </Text>
                {filterCondition === opt.id && <Ionicons name="checkmark" size={18} color="#F59E0B" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 9. Bottom Navigation Bar matching Mockup */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.bottomTabItem}
          onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}
          activeOpacity={0.8}
        >
          <Ionicons name="home-outline" size={22} color="#64748B" />
          <Text style={styles.bottomTabLabel}>Home</Text>
        </TouchableOpacity>

        {/* Active Search Pill */}
        <View style={styles.bottomActiveTabPill}>
          <Ionicons name="search" size={20} color="#0F172A" />
          <Text style={styles.bottomActiveTabLabel}>Search</Text>
        </View>

        <TouchableOpacity
          style={styles.bottomTabItem}
          onPress={() => navigation.navigate('MainTabs', { screen: 'Sell' })}
          activeOpacity={0.8}
        >
          <Ionicons name="pricetag-outline" size={22} color="#64748B" />
          <Text style={styles.bottomTabLabel}>Sell</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bottomTabItem}
          onPress={() => navigation.navigate('MainTabs', { screen: 'Track' })}
          activeOpacity={0.8}
        >
          <Ionicons name="bag-handle-outline" size={22} color="#64748B" />
          <Text style={styles.bottomTabLabel}>Orders</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bottomTabItem}
          onPress={() => navigation.navigate('MainTabs', { screen: 'Account' })}
          activeOpacity={0.8}
        >
          <Ionicons name="person-outline" size={22} color="#64748B" />
          <Text style={styles.bottomTabLabel}>Profile</Text>
        </TouchableOpacity>
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
  brandContainer: {
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandRenew: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    fontStyle: 'italic',
    letterSpacing: -0.5,
  },
  brandX: {
    fontSize: 22,
    fontWeight: '900',
    color: '#EAB308',
    fontStyle: 'italic',
  },
  brandTagline: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '600',
    marginTop: -2,
  },
  cartButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#FACC15',
    borderRadius: 10,
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

  /* Header Block */
  headerBlock: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  screenHeading: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  screenSubheading: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
    marginBottom: 16,
  },

  /* Search Input Row */
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    height: 48,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '500',
    paddingVertical: 0,
  },
  clearIconBtn: {
    padding: 4,
  },
  searchSubmitBtn: {
    backgroundColor: '#FBBF24',
    height: 48,
    paddingHorizontal: 22,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchSubmitBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },

  /* Category Chips */
  categoryChipsContainer: {
    gap: 8,
    paddingBottom: 16,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  categoryChipSelected: {
    backgroundColor: '#FEF08A',
    borderColor: '#FACC15',
  },
  categoryChipIcon: {
    marginRight: 6,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  categoryChipTextSelected: {
    color: '#0F172A',
    fontWeight: '800',
  },

  /* Search Sections: Recent & Popular */
  searchSection: {
    marginBottom: 14,
  },
  searchSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  searchSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  clearAllBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  searchPillsRow: {
    gap: 8,
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  searchPillText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#334155',
  },

  /* Results Header */
  resultsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 12,
  },
  resultsCountText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  resultsQueryBold: {
    fontWeight: '800',
    color: '#0F172A',
  },
  sortFilterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  actionPillBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },

  /* Product Grid */
  listContent: {
    paddingBottom: 110,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  productCard: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingTop: 10,
    zIndex: 1,
  },
  discountBadge: {
    backgroundColor: '#FEF08A',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  discountBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#854D0E',
  },
  wishlistBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImageContainer: {
    width: '100%',
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -8,
  },
  productImage: {
    width: '85%',
    height: '90%',
  },
  cardBody: {
    padding: 10,
    paddingTop: 2,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  productCondition: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  ratingScore: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  ratingCount: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 6,
  },
  currentPrice: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  originalPrice: {
    fontSize: 12,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
    fontWeight: '500',
  },
  specsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  specStorageCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  specStorageText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  specColorCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '50%',
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  specColorText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },

  /* Empty & Loading States */
  loadingContainer: {
    paddingVertical: 50,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  emptyContainer: {
    paddingVertical: 50,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  resetBtn: {
    marginTop: 8,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  resetBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
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
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 16,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalOptionSelected: {
    backgroundColor: '#FEF9C3',
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  modalOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
  },
  modalOptionTextSelected: {
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