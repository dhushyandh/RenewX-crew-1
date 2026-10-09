import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  FlatList,
  TextInput,
  Modal,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RootStackParamList } from '@/App';
import type { Product } from '@/types';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useToast } from '@/context/ToastContext';
import { api } from '@/services/api';
import { mapProductRow } from '@/lib/productMapper';
import { useSafeHeaderTop } from '@/lib/useSafeHeaderTop';
import { renewxFontFamily } from '@/design-system';
import HomeHeader from '@/components/HomeHeader';
import { getCategoryThirdPartyImage } from '@/data/categories';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type AnyProduct = Product & Record<string, any>;

const RECENT_SEARCHES_KEY = '@renewx_recent_searches_v3';
const POPULAR_SEARCHES = ['iPhone 14', 'iPhone 15', 'MacBook Air', 'Samsung S23', 'Apple Watch', 'AirPods'];

const CATEGORY_CHIPS = [
  'All',
  'Smartphones',
  'Laptops',
  'Tablets',
  'Smartwatches',
  'Audio',
  'Accessories',
];

const BRAND_OPTIONS = ['Apple', 'Samsung', 'OnePlus', 'Xiaomi', 'Realme', 'Vivo', 'Oppo', 'Nothing'];
const PRICE_RANGE_OPTIONS = [
  { label: 'Under ₹10,000', min: 0, max: 10000 },
  { label: '₹10,000 - ₹30,000', min: 10000, max: 30000 },
  { label: '₹30,000 - ₹60,000', min: 30000, max: 60000 },
  { label: 'Above ₹60,000', min: 60000, max: Infinity },
];
const CONDITION_OPTIONS = ['New', 'Like New', 'Good', 'Used'];
const STORAGE_OPTIONS = ['64 GB', '128 GB', '256 GB', '512 GB'];

type SortKey =
  | 'featured'
  | 'newest'
  | 'price_asc'
  | 'price_desc'
  | 'highest_rated'
  | 'biggest_discount';

const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: 'featured', label: 'Featured' },
  { id: 'newest', label: 'Newest First' },
  { id: 'price_asc', label: 'Price: Low to High' },
  { id: 'price_desc', label: 'Price: High to Low' },
  { id: 'highest_rated', label: 'Highest Rated' },
  { id: 'biggest_discount', label: 'Biggest Discount' },
];

function getProductName(product: AnyProduct): string {
  return product.name ?? product.title ?? product.product_name ?? product.productName ?? 'Certified Device';
}

function getProductPrice(product: AnyProduct): number {
  const value =
    product.price ??
    product.sale_price ??
    product.salePrice ??
    product.selling_price ??
    product.sellingPrice ??
    product.amount ??
    product.final_price ??
    0;

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function getOriginalPrice(product: AnyProduct): number {
  const orig = Number(product.original_price ?? product.originalPrice ?? 0);
  if (orig > 0) return orig;
  const price = getProductPrice(product);
  return price > 0 ? Math.round(price * 1.35) : 0;
}

function getProductSpecs(product: AnyProduct): string {
  const p = product as any;
  const storage =
    p.storage ||
    p.ram_storage ||
    (p.specs && typeof p.specs === 'object' && !Array.isArray(p.specs) ? p.specs.storage : '') ||
    '128 GB';
  const color = p.color || p.colour || p.variant || '';
  const ram =
    p.ram ||
    (p.specs && typeof p.specs === 'object' && !Array.isArray(p.specs) ? p.specs.ram : '') ||
    '';

  if (ram && storage && !color) {
    return `${ram} · ${storage}`;
  }
  return color ? `${storage} · ${color}` : `${storage} · Certified`;
}

function getProductImageSource(product: AnyProduct): any {
  const images = product.images ?? product.image_urls ?? product.imageUrls;
  let direct: string | undefined;

  if (Array.isArray(images) && images.length > 0) {
    const first = images[0];
    if (typeof first === 'string') direct = first;
    else if (first?.url) direct = first.url;
    else if (first?.src) direct = first.src;
  }

  if (!direct) {
    direct =
      product.image_url ??
      product.imageUrl ??
      product.image ??
      product.thumbnail ??
      product.thumbnail_url ??
      product.photo_url ??
      product.photoUrl;
  }

  if (direct && typeof direct === 'string' && direct.trim().length > 0) {
    return { uri: direct };
  }

  // Fallbacks by category
  const cat = (product.category ?? product.category_name ?? '').toLowerCase();
  return { uri: getCategoryThirdPartyImage(cat) };
}

export default function SearchScreen() {
  const safeTop = useSafeHeaderTop();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<any>();
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const toast = useToast();
  const listRef = useRef<FlatList>(null);

  useFocusEffect(
    useCallback(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' as any });
      }
    }, [])
  );

  const inputRef = useRef<TextInput>(null);

  // Search input state
  const initialQuery = route.params?.query || '';
  const [searchText, setSearchText] = useState(initialQuery);
  const [submittedQuery, setSubmittedQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Filter & Sort modal state
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedSort, setSelectedSort] = useState<SortKey>('featured');
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedPriceRangeIndex, setSelectedPriceRangeIndex] = useState<number | null>(null);
  const [selectedCondition, setSelectedCondition] = useState<string | null>(null);
  const [selectedStorage, setSelectedStorage] = useState<string | null>(null);

  // Products state
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load recent searches
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) setRecentSearches(parsed);
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  const saveRecentSearch = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setRecentSearches((prev) => {
      const filtered = prev.filter((item) => item.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, 10);
      AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  const removeRecentSearch = useCallback(async (query: string) => {
    setRecentSearches((prev) => {
      const updated = prev.filter((item) => item !== query);
      AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  const clearAllRecent = useCallback(async () => {
    setRecentSearches([]);
    AsyncStorage.removeItem(RECENT_SEARCHES_KEY).catch(() => {});
  }, []);

  // Fetch live products
  const fetchProducts = useCallback(async () => {
    try {
      const res = await api.products.getAll({ limit: 100 });
      const rows = Array.isArray(res) ? res : Array.isArray((res as any)?.data) ? (res as any).data : [];
      const mapped = rows.map(mapProductRow);
      setProducts(mapped);
    } catch (err) {
      console.warn('[SearchScreen] Failed to load products:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProducts();
  }, [fetchProducts]);

  // Handle Search Submission
  const handleSearchSubmit = useCallback(
    (textToSearch?: string) => {
      const target = (textToSearch !== undefined ? textToSearch : searchText).trim();
      setSearchText(target);
      setSubmittedQuery(target);
      setIsInputFocused(false);
      inputRef.current?.blur();
      if (target) {
        saveRecentSearch(target);
      }
    },
    [searchText, saveRecentSearch]
  );

  const handleClearSearch = useCallback(() => {
    setSearchText('');
    setSubmittedQuery('');
  }, []);

  // Filter & Sort Logic
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // 1. Text Search matching name, brand, model, category, specifications
    const q = (submittedQuery || searchText).trim().toLowerCase();
    if (q) {
      result = result.filter((p: any) => {
        const name = (p.name || '').toLowerCase();
        const brand = (p.brand || '').toLowerCase();
        const category = (p.category || '').toLowerCase();
        const specs = (getProductSpecs(p) || '').toLowerCase();
        const description = (p.description || '').toLowerCase();
        return (
          name.includes(q) ||
          brand.includes(q) ||
          category.includes(q) ||
          specs.includes(q) ||
          description.includes(q)
        );
      });
    }

    // 2. Category Chip Filter
    if (selectedCategory !== 'All') {
      const targetCat = selectedCategory.toLowerCase();
      result = result.filter((p: any) => {
        const cat = (p.category || '').toLowerCase();
        if (targetCat === 'smartphones') return cat.includes('phone') || cat.includes('mobile');
        if (targetCat === 'laptops') return cat.includes('laptop') || cat.includes('mac') || cat.includes('computer');
        if (targetCat === 'tablets') return cat.includes('tablet') || cat.includes('pad');
        if (targetCat === 'smartwatches') return cat.includes('watch');
        if (targetCat === 'audio') return cat.includes('audio') || cat.includes('ear') || cat.includes('headphone');
        if (targetCat === 'accessories') return cat.includes('access') || cat.includes('case') || cat.includes('charger');
        return cat.includes(targetCat);
      });
    }

    // 3. Brand Filter
    if (selectedBrand) {
      const b = selectedBrand.toLowerCase();
      result = result.filter((p: any) => (p.brand || '').toLowerCase().includes(b));
    }

    // 4. Price Range Filter
    if (selectedPriceRangeIndex !== null) {
      const range = PRICE_RANGE_OPTIONS[selectedPriceRangeIndex];
      if (range) {
        result = result.filter((p) => {
          const price = getProductPrice(p);
          return price >= range.min && price <= range.max;
        });
      }
    }

    // 5. Condition Filter
    if (selectedCondition) {
      const cond = selectedCondition.toLowerCase();
      result = result.filter((p: any) => {
        const c = (p.condition || '').toLowerCase();
        if (cond === 'new') return c.includes('new') || c.includes('sealed');
        if (cond === 'like new') return c.includes('like new') || c.includes('mint') || c.includes('flawless');
        if (cond === 'good') return c.includes('good') || c.includes('fair');
        if (cond === 'used') return c.includes('used') || c.includes('refurb');
        return true;
      });
    }

    // 6. Storage Filter
    if (selectedStorage) {
      const stor = selectedStorage.toLowerCase().replace(' ', '');
      result = result.filter((p: any) => {
        const specs = (getProductSpecs(p) || '').toLowerCase().replace(' ', '');
        return specs.includes(stor);
      });
    }

    // 7. Sorting
    switch (selectedSort) {
      case 'newest':
        result.sort((a: any, b: any) => {
          const tA = new Date(a.createdAt || a.created_at || 0).getTime();
          const tB = new Date(b.createdAt || b.created_at || 0).getTime();
          return tB - tA;
        });
        break;
      case 'price_asc':
        result.sort((a, b) => getProductPrice(a) - getProductPrice(b));
        break;
      case 'price_desc':
        result.sort((a, b) => getProductPrice(b) - getProductPrice(a));
        break;
      case 'highest_rated':
        result.sort((a: any, b: any) => Number(b.rating || 0) - Number(a.rating || 0));
        break;
      case 'biggest_discount':
        result.sort((a, b) => {
          const discA = getOriginalPrice(a) - getProductPrice(a);
          const discB = getOriginalPrice(b) - getProductPrice(b);
          return discB - discA;
        });
        break;
      case 'featured':
      default:
        // Featured default: maintain natural list order
        break;
    }

    return result;
  }, [
    products,
    submittedQuery,
    searchText,
    selectedCategory,
    selectedBrand,
    selectedPriceRangeIndex,
    selectedCondition,
    selectedStorage,
    selectedSort,
  ]);

  const currentSortLabel = useMemo(() => {
    const s = SORT_OPTIONS.find((opt) => opt.id === selectedSort);
    return s ? `Sort: ${s.label}` : 'Sort: Featured';
  }, [selectedSort]);

  const clearAllFilters = useCallback(() => {
    setSelectedBrand(null);
    setSelectedPriceRangeIndex(null);
    setSelectedCondition(null);
    setSelectedStorage(null);
    setSelectedSort('featured');
  }, []);

  const hasActiveFilters =
    Boolean(selectedBrand) ||
    selectedPriceRangeIndex !== null ||
    Boolean(selectedCondition) ||
    Boolean(selectedStorage) ||
    selectedSort !== 'featured';

  // Render Product Card (2-column mobile grid matching Category/Shop listing)
  const renderProductItem = ({ item }: { item: Product }) => {
    const pid = String((item as AnyProduct).id ?? (item as AnyProduct)._uuid ?? '');
    const name = getProductName(item);
    const price = getProductPrice(item);
    const origPrice = getOriginalPrice(item);
    const specs = getProductSpecs(item);
    const isWishlisted = isInWishlist(pid);
    const imgSource = getProductImageSource(item);

    return (
      <View style={styles.gridCardWrapper}>
        <View style={styles.productCard}>
          {/* Top Right Wishlist Heart */}
          <TouchableOpacity
            style={styles.wishlistHeartBtn}
            onPress={() => toggleWishlist(item)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={isWishlisted ? 'heart' : 'heart-outline'}
              size={18}
              color={isWishlisted ? '#EF4444' : '#0F172A'}
            />
          </TouchableOpacity>

          {/* Product Image */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => navigation.navigate('ProductDetail', { id: pid })}
            style={styles.productImgBox}
          >
            <Image source={imgSource} style={styles.productImg} resizeMode="contain" />
          </TouchableOpacity>

          {/* Product Title & Specs */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => navigation.navigate('ProductDetail', { id: pid })}
          >
            <Text style={styles.productTitle} numberOfLines={1}>
              {name}
            </Text>
            <Text style={styles.productSpecs} numberOfLines={1}>
              {specs}
            </Text>
          </TouchableOpacity>

          {/* Price Row */}
          <View style={styles.priceRow}>
            {item.is_best_price || item.isBestPrice || price === 0 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#047857' }}>Best Price</Text>
                <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#92400E', backgroundColor: '#FEF3C7', paddingHorizontal: 5, paddingVertical: 1.5, borderRadius: 4 }}>COD Only</Text>
              </View>
            ) : (
              <>
                <Text style={styles.priceText}>₹{price.toLocaleString('en-IN')}</Text>
                {origPrice > price && (
                  <Text style={styles.origPriceText}>₹{origPrice.toLocaleString('en-IN')}</Text>
                )}
              </>
            )}
          </View>

          {/* Full-width Yellow Add to Cart Button */}
          <TouchableOpacity
            style={styles.addToCartBtn}
            onPress={() => {
              addToCart(item);
              toast?.success?.('Added to cart!', name);
              navigation.navigate('Cart');
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="cart" size={15} color="#000000" style={{ marginRight: 6 }} />
            <Text style={styles.addToCartText}>Add to Cart</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const showSuggestions = isInputFocused && !submittedQuery;

  return (
    <View style={styles.container}>
      {/* 1. Top Bar 3: Search Top Bar (with text, location row, and category chips) */}
      <HomeHeader
        mode="search"
        onBack={() => navigation.goBack()}
        searchText={searchText}
        onChangeSearchText={setSearchText}
        onClearSearchText={handleClearSearch}
        onSubmitSearch={() => handleSearchSubmit()}
        onFilterPress={() => setFilterModalVisible(true)}
        categoryChips={CATEGORY_CHIPS}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* 3. Filter & Sort action buttons row */}
      <View style={styles.actionsBarRow}>
        <TouchableOpacity
          style={[styles.actionPillBtn, hasActiveFilters && styles.actionPillBtnActive]}
          onPress={() => setFilterModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="options-outline" size={15} color="#0F172A" style={{ marginRight: 6 }} />
          <Text style={styles.actionPillText}>Filter</Text>
          {hasActiveFilters && <View style={styles.filterDotBadge} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionPillBtn}
          onPress={() => setFilterModalVisible(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.actionPillText}>{currentSortLabel}</Text>
          <Ionicons name="chevron-down" size={13} color="#0F172A" style={{ marginLeft: 5 }} />
        </TouchableOpacity>
      </View>

      {/* 4. Results count & view mode row */}
      <View style={styles.resultsInfoRow}>
        <Text style={styles.resultsCountText}>
          {submittedQuery
            ? `${filteredProducts.length} results for "${submittedQuery}"`
            : `${filteredProducts.length} products`}
        </Text>
        <Ionicons name="grid-outline" size={18} color="#0F172A" />
      </View>

      {/* 5. Suggestions & Recent Searches (when focused before searching) */}
      {showSuggestions && (
        <ScrollView style={styles.suggestionsContainer} keyboardShouldPersistTaps="handled">
          {recentSearches.length > 0 && (
            <View style={styles.recentSection}>
              <View style={styles.recentHeaderRow}>
                <Text style={styles.suggestionTitle}>Recent Searches</Text>
                <TouchableOpacity onPress={clearAllRecent}>
                  <Text style={styles.clearAllRecentText}>Clear All</Text>
                </TouchableOpacity>
              </View>
              {recentSearches.map((item) => (
                <View key={item} style={styles.recentItemRow}>
                  <TouchableOpacity
                    style={styles.recentItemTouch}
                    onPress={() => handleSearchSubmit(item)}
                  >
                    <Ionicons name="time-outline" size={16} color="#64748B" style={{ marginRight: 10 }} />
                    <Text style={styles.recentItemText}>{item}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeRecentSearch(item)} style={{ padding: 4 }}>
                    <Ionicons name="close" size={15} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <View style={styles.popularSection}>
            <Text style={styles.suggestionTitle}>Popular Searches</Text>
            <View style={styles.popularChipsWrap}>
              {POPULAR_SEARCHES.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={styles.popularChip}
                  onPress={() => handleSearchSubmit(item)}
                >
                  <Ionicons name="trending-up" size={13} color="#EAB308" style={{ marginRight: 6 }} />
                  <Text style={styles.popularChipText}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      )}

      {/* 6. Product Listing 2-Column Grid */}
      {!showSuggestions && (
        <FlatList
          ref={listRef}
          data={loading ? [] : filteredProducts}
          keyExtractor={(item, index) =>
            String((item as AnyProduct)._uuid ?? (item as AnyProduct).id ?? index)
          }
          numColumns={2}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#FFC400"
              colors={['#FFC400', '#10B981']}
              progressBackgroundColor="#FFFFFF"
            />
          }
          ListEmptyComponent={
            loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color="#FACC15" />
              </View>
            ) : (
              <View style={styles.emptyBox}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="search-outline" size={36} color="#94A3B8" />
                </View>
                <Text style={styles.emptyTitle}>No matching products</Text>
                <Text style={styles.emptySubtitle}>
                  We couldn't find any products matching your filters. Try clearing some filters or searching for something else.
                </Text>
                {hasActiveFilters && (
                  <TouchableOpacity style={styles.emptyClearBtn} onPress={clearAllFilters}>
                    <Text style={styles.emptyClearBtnText}>Reset All Filters</Text>
                  </TouchableOpacity>
                )}
              </View>
            )
          }
          renderItem={renderProductItem}
        />
      )}

      {/* 7. Filters & Sort Bottom Sheet Modal (Matching Reference Image 4) */}
      <Modal
        visible={filterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {/* Top Bar 4: Filters / Sort Top Bar */}
            <HomeHeader
              mode="filters"
              title="Filters & Sort"
              onBack={() => setFilterModalVisible(false)}
              onClearAll={clearAllFilters}
            />

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              {/* SORT BY SECTION */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Sort By</Text>
                {SORT_OPTIONS.map((opt) => {
                  const isSelected = selectedSort === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[styles.sortOptionRow, isSelected && styles.sortOptionRowSelected]}
                      onPress={() => setSelectedSort(opt.id)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.sortOptionText, isSelected && styles.sortOptionTextSelected]}>
                        {opt.label}
                      </Text>
                      <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                        {isSelected && <Ionicons name="checkmark" size={13} color="#000000" />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* FILTERS SECTION HEADER */}
              <View style={styles.filtersTopRow}>
                <Text style={styles.filterSectionTitle}>Filters</Text>
                <TouchableOpacity onPress={clearAllFilters}>
                  <Text style={styles.clearAllFiltersText}>Clear All</Text>
                </TouchableOpacity>
              </View>

              {/* Brand Filter */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupLabel}>Brand</Text>
                <View style={styles.pillRowWrap}>
                  {BRAND_OPTIONS.map((brand) => {
                    const isSelected = selectedBrand === brand;
                    return (
                      <TouchableOpacity
                        key={brand}
                        style={[styles.modalPill, isSelected && styles.modalPillSelected]}
                        onPress={() => setSelectedBrand(isSelected ? null : brand)}
                      >
                        <Text style={[styles.modalPillText, isSelected && styles.modalPillTextSelected]}>
                          {brand}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Price Range Filter */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupLabel}>Price Range</Text>
                <View style={styles.pillRowWrap}>
                  {PRICE_RANGE_OPTIONS.map((range, index) => {
                    const isSelected = selectedPriceRangeIndex === index;
                    return (
                      <TouchableOpacity
                        key={range.label}
                        style={[styles.modalPill, isSelected && styles.modalPillSelected]}
                        onPress={() => setSelectedPriceRangeIndex(isSelected ? null : index)}
                      >
                        <Text style={[styles.modalPillText, isSelected && styles.modalPillTextSelected]}>
                          {range.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Condition Filter */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupLabel}>Condition</Text>
                <View style={styles.pillRowWrap}>
                  {CONDITION_OPTIONS.map((cond) => {
                    const isSelected = selectedCondition === cond;
                    return (
                      <TouchableOpacity
                        key={cond}
                        style={[styles.modalPill, isSelected && styles.modalPillSelected]}
                        onPress={() => setSelectedCondition(isSelected ? null : cond)}
                      >
                        <Text style={[styles.modalPillText, isSelected && styles.modalPillTextSelected]}>
                          {cond}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Storage Filter */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupLabel}>Storage</Text>
                <View style={styles.pillRowWrap}>
                  {STORAGE_OPTIONS.map((storage) => {
                    const isSelected = selectedStorage === storage;
                    return (
                      <TouchableOpacity
                        key={storage}
                        style={[styles.modalPill, isSelected && styles.modalPillSelected]}
                        onPress={() => setSelectedStorage(isSelected ? null : storage)}
                      >
                        <Text style={[styles.modalPillText, isSelected && styles.modalPillTextSelected]}>
                          {storage}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={{ height: 20 }} />
            </ScrollView>

            {/* Bottom Apply Filters Button */}
            <View style={styles.modalBottomBar}>
              <TouchableOpacity
                style={styles.applyFiltersBtn}
                onPress={() => setFilterModalVisible(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.applyFiltersBtnText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  /* HEADER */
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 10,
  },
  headerBackBtn: {
    padding: 4,
  },
  searchBarBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: 42,
    paddingHorizontal: 12,
    ...Platform.select({
      web: { boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 2,
        elevation: 1,
      },
    }),
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    fontFamily: renewxFontFamily.regular,
    color: '#0F172A',
    paddingVertical: 0,
  },
  headerFilterBtn: {
    padding: 6,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerFilterBtnActive: {
    backgroundColor: '#FEF08A',
    borderColor: '#FACC15',
  },

  /* CATEGORY CHIPS */
  categoryChipsWrapper: {
    paddingVertical: 6,
  },
  categoryChipsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 6.5,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryChipSelected: {
    backgroundColor: '#FEF08A',
    borderColor: '#FACC15',
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 12,
    fontFamily: renewxFontFamily.semibold,
    fontWeight: '600',
    color: '#475569',
  },
  categoryChipTextSelected: {
    color: '#000000',
    fontWeight: '800',
  },

  /* ACTION PILL BUTTONS (Filter & Sort) */
  actionsBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 10,
  },
  actionPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 6.5,
    position: 'relative',
  },
  actionPillBtnActive: {
    borderColor: '#FACC15',
    backgroundColor: '#FFFDF0',
  },
  actionPillText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: renewxFontFamily.bold,
    color: '#0F172A',
  },
  filterDotBadge: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EAB308',
    marginLeft: 6,
  },

  /* RESULTS INFO ROW */
  resultsInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  resultsCountText: {
    fontSize: 12.5,
    color: '#64748B',
    fontFamily: renewxFontFamily.medium,
  },

  /* LIST CONTENT */
  listContent: {
    paddingHorizontal: 10,
    paddingBottom: 110,
  },
  gridCardWrapper: {
    flex: 0.5,
    padding: 6,
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 12,
    position: 'relative',
    ...Platform.select({
      web: { boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
      },
    }),
  },
  wishlistHeartBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 3,
    padding: 4,
  },
  productImgBox: {
    height: 98,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 8,
  },
  productImg: {
    width: '100%',
    height: 94,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: renewxFontFamily.bold,
    color: '#0F172A',
  },
  productSpecs: {
    fontSize: 11,
    fontFamily: renewxFontFamily.regular,
    color: '#94A3B8',
    marginTop: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 6,
    gap: 6,
  },
  priceText: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: renewxFontFamily.bold,
    color: '#0F172A',
  },
  origPriceText: {
    fontSize: 11.5,
    fontFamily: renewxFontFamily.regular,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  addToCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FACC15',
    borderRadius: 12,
    height: 36,
    marginTop: 10,
    ...Platform.select({
      web: { boxShadow: '0 2px 6px rgba(250, 204, 21, 0.25)' },
      default: {
        shadowColor: '#FACC15',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
        elevation: 1,
      },
    }),
  },
  addToCartText: {
    fontSize: 12.5,
    fontWeight: '700',
    fontFamily: renewxFontFamily.bold,
    color: '#000000',
  },

  /* SUGGESTIONS & RECENT SEARCHES */
  suggestionsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  recentSection: {
    marginBottom: 20,
    marginTop: 8,
  },
  recentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  suggestionTitle: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: renewxFontFamily.bold,
    color: '#0F172A',
  },
  clearAllRecentText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  recentItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  recentItemTouch: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentItemText: {
    fontSize: 13,
    color: '#334155',
  },
  popularSection: {
    marginBottom: 20,
  },
  popularChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  popularChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  popularChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },

  /* EMPTY & LOADING STATES */
  loadingBox: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBox: {
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: renewxFontFamily.bold,
    color: '#0F172A',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  emptyClearBtn: {
    backgroundColor: '#FEF08A',
    borderWidth: 1,
    borderColor: '#FACC15',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  emptyClearBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#000000',
  },

  /* MODAL (Filters & Sort Bottom Sheet) */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 14,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: renewxFontFamily.bold,
    color: '#0F172A',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalScroll: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  filterSection: {
    paddingVertical: 10,
  },
  filterSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: renewxFontFamily.bold,
    color: '#0F172A',
    marginBottom: 10,
  },
  sortOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  sortOptionRowSelected: {
    backgroundColor: '#FEFCE8',
  },
  sortOptionText: {
    fontSize: 13.5,
    fontFamily: renewxFontFamily.medium,
    color: '#334155',
  },
  sortOptionTextSelected: {
    fontWeight: '700',
    color: '#000000',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    backgroundColor: '#FACC15',
    borderColor: '#EAB308',
  },
  filtersTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 8,
  },
  clearAllFiltersText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  filterGroup: {
    marginBottom: 16,
  },
  filterGroupLabel: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: renewxFontFamily.bold,
    color: '#0F172A',
    marginBottom: 8,
  },
  pillRowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modalPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalPillSelected: {
    backgroundColor: '#FEF08A',
    borderColor: '#FACC15',
  },
  modalPillText: {
    fontSize: 12,
    fontFamily: renewxFontFamily.medium,
    color: '#475569',
  },
  modalPillTextSelected: {
    fontWeight: '800',
    color: '#000000',
  },
  modalBottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  applyFiltersBtn: {
    backgroundColor: '#FACC15',
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { boxShadow: '0 2px 10px rgba(250, 204, 21, 0.35)' },
      default: {
        shadowColor: '#FACC15',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.35,
        shadowRadius: 5,
        elevation: 3,
      },
    }),
  },
  applyFiltersBtnText: {
    fontSize: 14.5,
    fontWeight: '800',
    fontFamily: renewxFontFamily.bold,
    color: '#000000',
  },
});