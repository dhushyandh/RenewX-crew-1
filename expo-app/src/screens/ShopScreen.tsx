import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  Share,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/App';
import type { Product } from '@/types';
import { api } from '@/services/api';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { shareProduct } from '@/services/shareService';
import { mapProductRow } from '@/lib/productMapper';
import { useSafeHeaderTop } from '@/lib/useSafeHeaderTop';
import { Ionicons } from '@expo/vector-icons';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const categories = [
  'All Devices',
  'Smartphones',
  'MacBooks',
  'Laptops',
  'Tablets',
  'Smartwatches',
  'Audio',
  'Accessories',
];

const sortOptions: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: 'Featured', value: 'featured', icon: 'sparkles-outline' },
  { label: 'Price: Low to High', value: 'price_asc', icon: 'trending-up-outline' },
  { label: 'Price: High to Low', value: 'price_desc', icon: 'trending-down-outline' },
  { label: 'Highest Rated', value: 'rating', icon: 'star-outline' },
  { label: 'Biggest % Off', value: 'discount', icon: 'pricetag-outline' },
];

const priceRangeOptions = [
  { label: 'All Prices', value: 'all' },
  { label: 'Under ₹20,000', value: 'under20k' },
  { label: '₹20K – ₹40K', value: '20k-40k' },
  { label: '₹40K – ₹70K', value: '40k-70k' },
  { label: 'Above ₹70,000', value: 'above70k' },
];

const conditionOptions = [
  { label: 'All Conditions', value: 'all' },
  { label: 'Like New (Flawless)', value: 'Like New' },
  { label: 'Excellent', value: 'Excellent' },
  { label: 'Good', value: 'Good' },
  { label: 'Fair', value: 'Fair' },
];

const storageOptions = [
  { label: 'All Storages', value: 'all' },
  { label: '64 GB', value: '64gb' },
  { label: '128 GB', value: '128gb' },
  { label: '256 GB', value: '256gb' },
  { label: '512 GB', value: '512gb' },
  { label: '1 TB+', value: '1tb+' },
];

type ProductListResponse = unknown;

function unwrapProductRows(response: ProductListResponse): any[] {
  if (Array.isArray(response)) return response;

  const value = response as any;
  if (!value || typeof value !== 'object') return [];

  const candidates = [
    value.data,
    value.products,
    value.rows,
    value.items,
    value.results,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;

    if (candidate && typeof candidate === 'object') {
      const nested = [
        candidate.data,
        candidate.products,
        candidate.rows,
        candidate.items,
        candidate.results,
      ];
      const nestedArray = nested.find(Array.isArray);
      if (nestedArray) return nestedArray;
    }
  }

  return [];
}

function getProductBrand(product: Product): string {
  return String((product as any).brand ?? '').trim();
}

function getProductCategory(product: Product): string {
  return String((product as any).category ?? '').trim();
}

function getSafeOriginalPrice(product: Product): number {
  const original = Number((product as any).originalPrice);
  const price = Number(product.price);
  return Number.isFinite(original) && original > price ? original : 0;
}

function getDiscountPercent(product: Product): number {
  const original = getSafeOriginalPrice(product);
  const price = Number(product.price);
  if (!original || !Number.isFinite(price) || price <= 0) return 0;
  return Math.max(0, Math.round(((original - price) / original) * 100));
}

function getProductImage(product: Product): { uri: string } | null {
  const image = String((product as any).image ?? '').trim();
  return image ? { uri: image } : null;
}

export default function ShopScreen() {
  const safeTop = useSafeHeaderTop();
  const navigation = useNavigation<NavigationProp>();
  const { addToCart, items, totalItems } = useCart();
  const toast = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All Devices');
  const [selectedBrand, setSelectedBrand] = useState('All Brands');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('featured');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [priceRange, setPriceRange] = useState('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [selectedCondition, setSelectedCondition] = useState('all');
  const [selectedStorage, setSelectedStorage] = useState('all');
  const [onlyDiscounts, setOnlyDiscounts] = useState(false);
  const [onlyWarranty, setOnlyWarranty] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [favorites, setFavorites] = useState<Record<string | number, boolean>>({});
  const [refreshing, setRefreshing] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useFocusEffect(
    useCallback(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' as any });
      }
    }, [])
  );

  const fetchLiveProducts = useCallback(async (options?: { initial?: boolean }) => {
    const initial = options?.initial ?? false;

    try {
      if (initial) setIsInitialLoading(true);
      setLoadError(null);

      const response = await api.products.getAll({ limit: 100 });
      const rows = unwrapProductRows(response);
      const mapped = rows
        .map((row) => {
          try {
            return mapProductRow(row);
          } catch {
            return null;
          }
        })
        .filter(Boolean) as Product[];

      setProducts(mapped);
    } catch (err: any) {
      setLoadError(err?.message || 'Unable to load products. Please try again.');
    } finally {
      if (initial) setIsInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveProducts({ initial: true });
  }, [fetchLiveProducts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchLiveProducts();
    setRefreshing(false);
  }, [fetchLiveProducts]);

  // Brands come from the live product data instead of a hard-coded catalog.
  const brands = useMemo(() => {
    const values = new Set<string>();

    products.forEach((product) => {
      const brand = getProductBrand(product);
      if (brand) values.add(brand);
    });

    return ['All Brands', ...Array.from(values).sort((a, b) => a.localeCompare(b))];
  }, [products]);

  const brandCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      const b = getProductBrand(p);
      if (b) {
        counts[b] = (counts[b] || 0) + 1;
      }
    });
    return counts;
  }, [products]);

  useEffect(() => {
    if (selectedBrand !== 'All Brands' && !brands.includes(selectedBrand)) {
      setSelectedBrand('All Brands');
    }
  }, [brands, selectedBrand]);

  const toggleFavorite = (productId: string | number, productName?: string) => {
    setFavorites((prev) => {
      const willFav = !prev[productId];

      if (willFav) {
        toast.info(
          productName ? `"${productName}" saved to wishlist` : 'Saved to wishlist',
          'Added to Wishlist',
        );
      } else {
        toast.info('Item removed from wishlist', 'Wishlist Updated');
      }

      return {
        ...prev,
        [productId]: willFav,
      };
    });
  };

  const handleShare = async (product: Product) => {
    await shareProduct(product, {
      onSuccessToast: (msg) => {
        toast.success(msg, 'Link Copied');
      },
    });
  };

  const filteredProducts = useMemo(() => {
    return products
      .filter((product) => {
        // Category filter
        if (selectedCategory !== 'All Devices') {
          const catStr = getProductCategory(product).toLowerCase();
          const nameStr = String(product.name || '').toLowerCase();
          const selStr = selectedCategory.toLowerCase();

          const matchCat =
            (selectedCategory === 'Smartphones' &&
              (catStr.includes('phone') || catStr.includes('smart'))) ||
            (selectedCategory === 'MacBooks' &&
              (nameStr.includes('macbook') || catStr.includes('mac'))) ||
            (selectedCategory === 'Laptops' && catStr.includes('laptop')) ||
            (selectedCategory === 'Tablets' &&
              (catStr.includes('tablet') || catStr.includes('pad'))) ||
            (selectedCategory === 'Smartwatches' &&
              (catStr.includes('wear') || catStr.includes('watch'))) ||
            (selectedCategory === 'Audio' &&
              (catStr.includes('audio') ||
                catStr.includes('headphone') ||
                catStr.includes('earbud'))) ||
            (selectedCategory === 'Accessories' &&
              (catStr.includes('accessor') ||
                catStr.includes('charger') ||
                catStr.includes('cable') ||
                catStr.includes('case'))) ||
            catStr.includes(selStr);

          if (!matchCat) return false;
        }

        // Brand filter
        if (selectedBrand !== 'All Brands') {
          const brand = getProductBrand(product).toLowerCase();
          const name = String(product.name || '').toLowerCase();

          if (!brand.includes(selectedBrand.toLowerCase()) &&
            !name.includes(selectedBrand.toLowerCase())) {
            return false;
          }
        }

        // Search query filter
        if (searchQuery.trim()) {
          const query = searchQuery.trim().toLowerCase();
          const name = String(product.name || '').toLowerCase();
          const brand = getProductBrand(product).toLowerCase();
          const description = String((product as any).description ?? '').toLowerCase();
          const category = getProductCategory(product).toLowerCase();

          if (
            !name.includes(query) &&
            !brand.includes(query) &&
            !description.includes(query) &&
            !category.includes(query)
          ) {
            return false;
          }
        }

        // Price range filter
        const price = Number(product.price || 0);
        if (priceRange === 'under20k' && price >= 20000) return false;
        if (priceRange === '20k-40k' && (price < 20000 || price > 40000)) return false;
        if (priceRange === '40k-70k' && (price < 40000 || price > 70000)) return false;
        if (priceRange === 'above70k' && price <= 70000) return false;
        if (minPrice && price < Number(minPrice)) return false;
        if (maxPrice && price > Number(maxPrice)) return false;

        // Condition filter
        if (selectedCondition !== 'all') {
          const prodCond = String(product.condition || (product as any).grade || '').toLowerCase();
          if (!prodCond.includes(selectedCondition.toLowerCase())) return false;
        }

        // Storage filter
        if (selectedStorage !== 'all') {
          const target = selectedStorage.toLowerCase().replace(/\s+/g, '');
          const searchStr = `${product.name} ${product.description || ''} ${(product.specs || []).join(' ')}`.toLowerCase().replace(/\s+/g, '');
          const matches = target === '1tb+' ? (searchStr.includes('1tb') || searchStr.includes('2tb')) : searchStr.includes(target);
          if (!matches) return false;
        }

        // Discounts filter
        if (onlyDiscounts && getDiscountPercent(product) <= 0) return false;

        // Warranty filter
        if (onlyWarranty && Number(product.warrantyMonths || 0) < 6) return false;

        // Stock filter
        if (inStockOnly && Number(product.stock ?? 1) <= 0) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price_asc') return Number(a.price || 0) - Number(b.price || 0);
        if (sortBy === 'price_desc') return Number(b.price || 0) - Number(a.price || 0);
        if (sortBy === 'rating') return Number((b as any).rating || 0) - Number((a as any).rating || 0);
        if (sortBy === 'discount') return getDiscountPercent(b) - getDiscountPercent(a);
        return 0;
      });
  }, [
    products,
    selectedCategory,
    selectedBrand,
    searchQuery,
    sortBy,
    priceRange,
    minPrice,
    maxPrice,
    selectedCondition,
    selectedStorage,
    onlyDiscounts,
    onlyWarranty,
    inStockOnly,
  ]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCategory !== 'All Devices') count++;
    if (selectedBrand !== 'All Brands') count++;
    if (priceRange !== 'all' || minPrice || maxPrice) count++;
    if (selectedCondition !== 'all') count++;
    if (selectedStorage !== 'all') count++;
    if (onlyDiscounts) count++;
    if (onlyWarranty) count++;
    if (inStockOnly) count++;
    if (sortBy !== 'featured') count++;
    return count;
  }, [
    selectedCategory,
    selectedBrand,
    priceRange,
    minPrice,
    maxPrice,
    selectedCondition,
    selectedStorage,
    onlyDiscounts,
    onlyWarranty,
    inStockOnly,
    sortBy,
  ]);

  const hasActiveFilters = activeFiltersCount > 0 || searchQuery.trim().length > 0;

  const clearFilters = () => {
    setSelectedCategory('All Devices');
    setSelectedBrand('All Brands');
    setSearchQuery('');
    setSortBy('featured');
    setPriceRange('all');
    setMinPrice('');
    setMaxPrice('');
    setSelectedCondition('all');
    setSelectedStorage('all');
    setOnlyDiscounts(false);
    setOnlyWarranty(false);
    setInStockOnly(false);
  };

  const renderProductItem = ({ item: product }: { item: Product }) => {
    const isFav = !!favorites[product.id];
    const isAdded = items.some((item) => item.id === product.id);
    const discount = getDiscountPercent(product);
    const originalPrice = getSafeOriginalPrice(product);
    const brand = getProductBrand(product);
    const category = getProductCategory(product);

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('ProductDetail', { id: String(product.id) })}
      >
        <View style={styles.cardTopBar}>
          <View style={styles.productMetaBadge}>
            <Ionicons name="phone-portrait-outline" size={10} color="#64748b" />
            <Text style={styles.productMetaText} numberOfLines={1}>
              {brand || category || 'Device'}
            </Text>
          </View>

          <View style={styles.topActionsRow}>
            <TouchableOpacity
              style={styles.circleIconButton}
              onPress={() => toggleFavorite(product.id, product.name)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={isFav ? 'heart' : 'heart-outline'}
                size={16}
                color={isFav ? '#ef4444' : '#6b7280'}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.circleIconButton}
              onPress={() => handleShare(product)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="share-social-outline" size={15} color="#6b7280" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.imageBox}>
          {getProductImage(product) ? (
            <Image
              source={getProductImage(product)}
              style={styles.productImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image-outline" size={34} color="#c7c0b4" />
              <Text style={styles.imagePlaceholderText}>No image</Text>
            </View>
          )}
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.productTitle} numberOfLines={2}>
            {product.name}
          </Text>

          <View style={styles.productInfoRow}>
            <Text style={styles.productInfoText} numberOfLines={1}>
              {category || 'Device'}
            </Text>
          </View>

          <View style={styles.pricingSection}>
            <View>
              <View style={styles.priceRow}>
                <Text style={styles.currencySymbol}>₹</Text>
                <Text style={styles.mainPrice}>
                  {Number(product.price || 0).toLocaleString('en-IN')}
                </Text>
              </View>

              {originalPrice > 0 && (
                <View style={styles.subPriceRow}>
                  <Text style={styles.originalPrice}>
                    ₹{originalPrice.toLocaleString('en-IN')}
                  </Text>
                  {discount > 0 && (
                    <View style={styles.discountTag}>
                      <Text style={styles.discountTagText}>{discount}% OFF</Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[styles.addBtn, isAdded && styles.addBtnDone]}
              onPress={() => {
                addToCart(product);
                navigation.navigate('Cart');
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isAdded ? 'checkmark' : 'add'}
                size={16}
                color={isAdded ? '#ffffff' : '#0a0a0a'}
              />
              <Text style={[styles.addBtnText, isAdded && styles.addBtnTextDone]}>
                {isAdded ? 'Added' : 'Add'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSkeletonItem = ({ index }: { index: number }) => (
    <View style={styles.card} key={`skeleton-${index}`}>
      <View style={styles.cardTopBar}>
        <View style={[styles.skeletonBlock, styles.skeletonMeta]} />
        <View style={styles.topActionsRow}>
          <View style={[styles.skeletonBlock, styles.skeletonCircle]} />
          <View style={[styles.skeletonBlock, styles.skeletonCircle]} />
        </View>
      </View>

      <View style={styles.imageBox}>
        <View style={[styles.skeletonBlock, styles.skeletonImage]} />
      </View>

      <View style={styles.cardBody}>
        <View style={[styles.skeletonBlock, styles.skeletonTitle]} />
        <View style={[styles.skeletonBlock, styles.skeletonSubtitle]} />

        <View style={styles.pricingSection}>
          <View>
            <View style={[styles.skeletonBlock, styles.skeletonPrice]} />
            <View style={[styles.skeletonBlock, styles.skeletonOriginalPrice]} />
          </View>
          <View style={[styles.skeletonBlock, styles.skeletonButton]} />
        </View>
      </View>
    </View>
  );

  const renderListHeader = () => (
    <View>
      {Boolean(loadError) && products.length > 0 && (
        <View style={styles.refreshErrorBanner}>
          <Ionicons name="cloud-offline-outline" size={16} color="#92400e" />
          <View style={styles.refreshErrorContent}>
            <Text style={styles.refreshErrorTitle}>Couldn’t refresh the shop</Text>
            <Text style={styles.refreshErrorText} numberOfLines={2}>
              {loadError}
            </Text>
          </View>
          <TouchableOpacity onPress={() => fetchLiveProducts()} style={styles.retrySmallButton}>
            <Text style={styles.retrySmallButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.guaranteeRibbon}>
        <Text style={styles.deviceCountText}>
          {filteredProducts.length} {filteredProducts.length === 1 ? 'device' : 'devices'}
        </Text>
        <View style={styles.livePill}>
          <Ionicons name="cloud-done-outline" size={13} color="#475569" />
          <Text style={styles.livePillText}>Live inventory</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: safeTop }]}>
      <View style={styles.header}>
        <View>
          <View style={styles.brandRow}>
            <Text style={styles.brandTitle}>Renew</Text>
            <Text style={styles.brandAccent}>X</Text>
          </View>
          <Text style={styles.headerSub}>Shop devices from live inventory</Text>
        </View>

        <View style={styles.headerIcons}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => navigation.navigate('Search')}
          >
            <Ionicons name="search-outline" size={20} color="#111827" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => navigation.navigate('Cart' as any)}
          >
            <Ionicons name="bag-handle-outline" size={20} color="#111827" />
            {totalItems > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{totalItems}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.categoryScrollContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryPillsWrapper}
        >
          {categories.map((cat) => {
            const isActive = selectedCategory === cat;

            return (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryPill, isActive && styles.categoryPillActive]}
                onPress={() => setSelectedCategory(cat)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    isActive && styles.categoryPillTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.filterStrip}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color="#9ca3af" />
          <TextInput
            placeholder="Search iPhones, MacBooks, Dell..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            returnKeyType="search"
            clearButtonMode="never"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.filterToggleBtn, activeFiltersCount > 0 && styles.filterToggleBtnActive]}
          onPress={() => setShowFilterModal(true)}
        >
          <Ionicons
            name="options"
            size={16}
            color={activeFiltersCount > 0 ? '#111827' : '#111827'}
          />
          <Text
            style={[
              styles.filterToggleText,
              activeFiltersCount > 0 && styles.filterToggleTextActive,
            ]}
          >
            Filters
          </Text>
          {activeFiltersCount > 0 && (
            <View style={styles.filterCountBadge}>
              <Text style={styles.filterCountBadgeText}>{activeFiltersCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Active Filter Removable Tags Strip */}
      {activeFiltersCount > 0 && (
        <View style={styles.activeFiltersStrip}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.activeFiltersScroll}
          >
            {selectedCategory !== 'All Devices' && (
              <TouchableOpacity
                style={styles.activeFilterTag}
                onPress={() => setSelectedCategory('All Devices')}
              >
                <Text style={styles.activeFilterTagText}>{selectedCategory}</Text>
                <Ionicons name="close" size={13} color="#475569" />
              </TouchableOpacity>
            )}
            {selectedBrand !== 'All Brands' && (
              <TouchableOpacity
                style={styles.activeFilterTag}
                onPress={() => setSelectedBrand('All Brands')}
              >
                <Text style={styles.activeFilterTagText}>{selectedBrand}</Text>
                <Ionicons name="close" size={13} color="#475569" />
              </TouchableOpacity>
            )}
            {Boolean(priceRange !== 'all' || minPrice || maxPrice) && (
              <TouchableOpacity
                style={styles.activeFilterTag}
                onPress={() => {
                  setPriceRange('all');
                  setMinPrice('');
                  setMaxPrice('');
                }}
              >
                <Text style={styles.activeFilterTagText}>
                  {priceRange === 'under20k'
                    ? '< ₹20K'
                    : priceRange === '20k-40k'
                    ? '₹20K–₹40K'
                    : priceRange === '40k-70k'
                    ? '₹40K–₹70K'
                    : priceRange === 'above70k'
                    ? '> ₹70K'
                    : `₹${minPrice || '0'}–₹${maxPrice || '∞'}`}
                </Text>
                <Ionicons name="close" size={13} color="#475569" />
              </TouchableOpacity>
            )}
            {selectedCondition !== 'all' && (
              <TouchableOpacity
                style={styles.activeFilterTag}
                onPress={() => setSelectedCondition('all')}
              >
                <Text style={styles.activeFilterTagText}>{selectedCondition}</Text>
                <Ionicons name="close" size={13} color="#475569" />
              </TouchableOpacity>
            )}
            {selectedStorage !== 'all' && (
              <TouchableOpacity
                style={styles.activeFilterTag}
                onPress={() => setSelectedStorage('all')}
              >
                <Text style={styles.activeFilterTagText}>{selectedStorage}</Text>
                <Ionicons name="close" size={13} color="#475569" />
              </TouchableOpacity>
            )}
            {onlyDiscounts && (
              <TouchableOpacity
                style={styles.activeFilterTag}
                onPress={() => setOnlyDiscounts(false)}
              >
                <Text style={styles.activeFilterTagText}>Deals Only</Text>
                <Ionicons name="close" size={13} color="#475569" />
              </TouchableOpacity>
            )}
            {onlyWarranty && (
              <TouchableOpacity
                style={styles.activeFilterTag}
                onPress={() => setOnlyWarranty(false)}
              >
                <Text style={styles.activeFilterTagText}>6M+ Warranty</Text>
                <Ionicons name="close" size={13} color="#475569" />
              </TouchableOpacity>
            )}
            {inStockOnly && (
              <TouchableOpacity
                style={styles.activeFilterTag}
                onPress={() => setInStockOnly(false)}
              >
                <Text style={styles.activeFilterTagText}>In Stock</Text>
                <Ionicons name="close" size={13} color="#475569" />
              </TouchableOpacity>
            )}
            {sortBy !== 'featured' && (
              <TouchableOpacity
                style={styles.activeFilterTag}
                onPress={() => setSortBy('featured')}
              >
                <Text style={styles.activeFilterTagText}>
                  {sortOptions.find((s) => s.value === sortBy)?.label || 'Sorted'}
                </Text>
                <Ionicons name="close" size={13} color="#475569" />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.clearAllFiltersTag} onPress={clearFilters}>
              <Text style={styles.clearAllFiltersTagText}>Clear All</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Comprehensive Filter Modal */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowFilterModal(false)}
          />
          <View style={styles.modalSheet}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleWrap}>
                <Ionicons name="options" size={20} color="#111827" />
                <Text style={styles.modalTitle}>Filters & Sort</Text>
                {activeFiltersCount > 0 && (
                  <View style={styles.modalActiveBadge}>
                    <Text style={styles.modalActiveBadgeText}>{activeFiltersCount} Active</Text>
                  </View>
                )}
              </View>
              <View style={styles.modalHeaderActions}>
                {activeFiltersCount > 0 && (
                  <TouchableOpacity onPress={clearFilters} style={styles.modalResetBtn}>
                    <Text style={styles.modalResetBtnText}>Reset</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => setShowFilterModal(false)}
                  style={styles.modalCloseBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={20} color="#374151" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Scrollable Filters Content */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalContent}
            >
              {/* 1. Sort By */}
              <View style={styles.filterSection}>
                <View style={styles.filterSectionHeader}>
                  <Ionicons name="swap-vertical" size={16} color="#0f172a" />
                  <Text style={styles.filterSectionTitle}>Sort By</Text>
                </View>
                <View style={styles.chipGrid}>
                  {sortOptions.map((opt) => {
                    const isSelected = sortBy === opt.value;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        style={[styles.filterChip, isSelected && styles.filterChipActive]}
                        onPress={() => setSortBy(opt.value)}
                      >
                        <Ionicons
                          name={opt.icon}
                          size={14}
                          color={isSelected ? '#000000' : '#64748b'}
                        />
                        <Text
                          style={[
                            styles.filterChipText,
                            isSelected && styles.filterChipTextActive,
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 2. Price Range */}
              <View style={styles.filterSection}>
                <View style={styles.filterSectionHeader}>
                  <Ionicons name="cash-outline" size={16} color="#0f172a" />
                  <Text style={styles.filterSectionTitle}>Price Range</Text>
                </View>
                <View style={styles.chipGrid}>
                  {priceRangeOptions.map((opt) => {
                    const isSelected = priceRange === opt.value && !minPrice && !maxPrice;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        style={[styles.filterChip, isSelected && styles.filterChipActive]}
                        onPress={() => {
                          setPriceRange(opt.value);
                          setMinPrice('');
                          setMaxPrice('');
                        }}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            isSelected && styles.filterChipTextActive,
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Custom Min / Max input */}
                <View style={styles.customPriceRow}>
                  <View style={styles.customPriceInputWrap}>
                    <Text style={styles.customPriceLabel}>Min (₹)</Text>
                    <TextInput
                      placeholder="e.g. 15000"
                      placeholderTextColor="#9ca3af"
                      keyboardType="numeric"
                      value={minPrice}
                      onChangeText={(val) => {
                        setMinPrice(val.replace(/[^0-9]/g, ''));
                        setPriceRange('custom');
                      }}
                      style={styles.customPriceInput}
                    />
                  </View>
                  <View style={styles.customPriceDivider}>
                    <Text style={styles.customPriceDividerText}>to</Text>
                  </View>
                  <View style={styles.customPriceInputWrap}>
                    <Text style={styles.customPriceLabel}>Max (₹)</Text>
                    <TextInput
                      placeholder="e.g. 60000"
                      placeholderTextColor="#9ca3af"
                      keyboardType="numeric"
                      value={maxPrice}
                      onChangeText={(val) => {
                        setMaxPrice(val.replace(/[^0-9]/g, ''));
                        setPriceRange('custom');
                      }}
                      style={styles.customPriceInput}
                    />
                  </View>
                </View>
              </View>

              {/* 3. Brand */}
              <View style={styles.filterSection}>
                <View style={styles.filterSectionHeader}>
                  <Ionicons name="pricetag-outline" size={16} color="#0f172a" />
                  <Text style={styles.filterSectionTitle}>Brand</Text>
                </View>
                <View style={styles.chipGrid}>
                  {brands.map((brand) => {
                    const isSelected = selectedBrand === brand;
                    const count =
                      brand === 'All Brands' ? products.length : brandCounts[brand] || 0;
                    return (
                      <TouchableOpacity
                        key={brand}
                        style={[styles.filterChip, isSelected && styles.filterChipActive]}
                        onPress={() => setSelectedBrand(brand)}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            isSelected && styles.filterChipTextActive,
                          ]}
                        >
                          {brand}
                        </Text>
                        <View style={[styles.countPill, isSelected && styles.countPillActive]}>
                          <Text
                            style={[
                              styles.countPillText,
                              isSelected && styles.countPillTextActive,
                            ]}
                          >
                            {count}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 4. Device Condition */}
              <View style={styles.filterSection}>
                <View style={styles.filterSectionHeader}>
                  <Ionicons name="shield-checkmark-outline" size={16} color="#0f172a" />
                  <Text style={styles.filterSectionTitle}>Condition / Grade</Text>
                </View>
                <View style={styles.chipGrid}>
                  {conditionOptions.map((opt) => {
                    const isSelected = selectedCondition === opt.value;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        style={[styles.filterChip, isSelected && styles.filterChipActive]}
                        onPress={() => setSelectedCondition(opt.value)}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            isSelected && styles.filterChipTextActive,
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 5. Storage Capacity */}
              <View style={styles.filterSection}>
                <View style={styles.filterSectionHeader}>
                  <Ionicons name="server-outline" size={16} color="#0f172a" />
                  <Text style={styles.filterSectionTitle}>Storage</Text>
                </View>
                <View style={styles.chipGrid}>
                  {storageOptions.map((opt) => {
                    const isSelected = selectedStorage === opt.value;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        style={[styles.filterChip, isSelected && styles.filterChipActive]}
                        onPress={() => setSelectedStorage(opt.value)}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            isSelected && styles.filterChipTextActive,
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 6. Special Highlights */}
              <View style={styles.filterSection}>
                <View style={styles.filterSectionHeader}>
                  <Ionicons name="ribbon-outline" size={16} color="#0f172a" />
                  <Text style={styles.filterSectionTitle}>Special Highlights</Text>
                </View>
                <View style={styles.chipGrid}>
                  <TouchableOpacity
                    style={[styles.filterChip, onlyDiscounts && styles.filterChipActive]}
                    onPress={() => setOnlyDiscounts((prev) => !prev)}
                  >
                    <Ionicons
                      name="flame"
                      size={14}
                      color={onlyDiscounts ? '#dc2626' : '#64748b'}
                    />
                    <Text
                      style={[
                        styles.filterChipText,
                        onlyDiscounts && styles.filterChipTextActive,
                      ]}
                    >
                      On Sale / Discounted
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.filterChip, onlyWarranty && styles.filterChipActive]}
                    onPress={() => setOnlyWarranty((prev) => !prev)}
                  >
                    <Ionicons
                      name="shield-checkmark"
                      size={14}
                      color={onlyWarranty ? '#059669' : '#64748b'}
                    />
                    <Text
                      style={[
                        styles.filterChipText,
                        onlyWarranty && styles.filterChipTextActive,
                      ]}
                    >
                      6+ Months Warranty
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.filterChip, inStockOnly && styles.filterChipActive]}
                    onPress={() => setInStockOnly((prev) => !prev)}
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={14}
                      color={inStockOnly ? '#0284c7' : '#64748b'}
                    />
                    <Text
                      style={[
                        styles.filterChipText,
                        inStockOnly && styles.filterChipTextActive,
                      ]}
                    >
                      In Stock Only
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            {/* Sticky Bottom Actions */}
            <View style={styles.modalBottomBar}>
              <TouchableOpacity
                style={styles.modalClearBtn}
                onPress={clearFilters}
              >
                <Text style={styles.modalClearBtnText}>Reset All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalApplyBtn}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={styles.modalApplyBtnText}>
                  Show {filteredProducts.length} {filteredProducts.length === 1 ? 'Device' : 'Devices'}
                </Text>
                <Ionicons name="arrow-forward" size={16} color="#000000" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {isInitialLoading ? (
        <FlatList
          data={Array.from({ length: 6 }, (_, index) => index)}
          renderItem={renderSkeletonItem}
          keyExtractor={(item) => `skeleton-${item}`}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={[styles.gridContainer, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.skeletonHeader}>
              <View style={[styles.skeletonBlock, styles.skeletonCount]} />
              <View style={[styles.skeletonBlock, styles.skeletonLivePill]} />
            </View>
          }
        />
      ) : loadError && products.length === 0 ? (
        <View style={styles.stateContainer}>
          <View style={styles.stateIconCircle}>
            <Ionicons name="cloud-offline-outline" size={28} color="#64748b" />
          </View>
          <Text style={styles.stateTitle}>Couldn’t load the shop</Text>
          <Text style={styles.stateSub}>
            {loadError}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchLiveProducts({ initial: true })}
            activeOpacity={0.85}
          >
            <Ionicons name="refresh-outline" size={16} color="#000000" />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={filteredProducts}
          renderItem={renderProductItem}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={[
            styles.gridContainer,
            { paddingBottom: 100 },
            filteredProducts.length === 0 && styles.emptyListContainer,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#ffc400']}
              tintColor="#ffc400"
            />
          }
          ListHeaderComponent={renderListHeader}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.stateIconCircle}>
                <Ionicons name="search-outline" size={28} color="#64748b" />
              </View>
              <Text style={styles.emptyTitle}>
                {hasActiveFilters ? 'No matching devices' : 'No devices available'}
              </Text>
              <Text style={styles.emptySub}>
                {hasActiveFilters
                  ? 'Try another category, brand, or search term.'
                  : 'There are no products available right now. Pull down to refresh.'}
              </Text>
              {hasActiveFilters ? (
                <TouchableOpacity style={styles.resetBtn} onPress={clearFilters}>
                  <Text style={styles.resetBtnText}>Clear All Filters</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.resetBtn}
                  onPress={() => fetchLiveProducts()}
                >
                  <Text style={styles.resetBtnText}>Refresh Shop</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f7f2',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  brandAccent: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffc400',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
    marginLeft: 6,
    marginRight: 6,
  },
  shopBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0f172a',
    backgroundColor: '#ffc400',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  headerSub: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
    fontWeight: '500',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#0f172a',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  cartBadgeText: {
    color: '#ffc400',
    fontSize: 9,
    fontWeight: '800',
  },
  categoryScrollContainer: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#ebe7dd',
  },
  categoryPillsWrapper: {
    paddingHorizontal: 14,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2ddd3',
  },
  categoryPillActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4b5563',
  },
  categoryPillTextActive: {
    color: '#ffc400',
    fontWeight: '700',
  },
  filterStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: '#e5e2d8',
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
  },
  filterToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e2d8',
  },
  filterToggleBtnActive: {
    backgroundColor: '#ffc400',
    borderColor: '#ffc400',
  },
  filterToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  filterToggleTextActive: {
    color: '#000000',
  },
  filterCountBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 3,
  },
  filterCountBadgeText: {
    color: '#ffc400',
    fontSize: 10,
    fontWeight: '800',
  },

  // Active Filters Tags Strip
  activeFiltersStrip: {
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  activeFiltersScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeFilterTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  activeFilterTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  clearAllFiltersTag: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: '#fee2e2',
  },
  clearAllFiltersTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#dc2626',
  },

  // Filter Modal / Bottom Sheet
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalSheet: {
    width: '100%',
    maxWidth: 620,
    maxHeight: '88%',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalHeaderTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalActiveBadge: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  modalActiveBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#b45309',
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalResetBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  modalResetBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#dc2626',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    padding: 18,
    paddingBottom: 30,
    gap: 18,
  },
  filterSection: {
    gap: 10,
  },
  filterSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: '#ffc400',
    borderColor: '#ffc400',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  filterChipTextActive: {
    color: '#000000',
    fontWeight: '800',
  },
  countPill: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  countPillActive: {
    backgroundColor: '#0f172a',
  },
  countPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  countPillTextActive: {
    color: '#ffc400',
  },
  customPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  customPriceInputWrap: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  customPriceLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  customPriceInput: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    paddingVertical: 2,
  },
  customPriceDivider: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  customPriceDividerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
  },
  modalBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  modalClearBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalClearBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  modalApplyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#ffc400',
  },
  modalApplyBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#000000',
  },
  guaranteeRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  deviceCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4b5563',
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  livePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  routeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  routeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  productMetaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    maxWidth: '62%',
  },
  productMetaText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#475569',
  },
  productInfoRow: {
    marginTop: 6,
    marginBottom: 8,
  },
  productInfoText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  imagePlaceholderText: {
    fontSize: 9,
    color: '#a8a095',
    fontWeight: '600',
  },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 80,
  },
  stateIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  stateTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1f2937',
    textAlign: 'center',
  },
  stateSub: {
    fontSize: 12,
    lineHeight: 18,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 320,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffc400',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 18,
  },
  retryButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000000',
  },
  refreshErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginTop: 4,
    marginBottom: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    gap: 8,
  },
  refreshErrorContent: {
    flex: 1,
  },
  refreshErrorTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400e',
  },
  refreshErrorText: {
    fontSize: 10,
    color: '#a16207',
    marginTop: 1,
  },
  retrySmallButton: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 7,
    backgroundColor: '#ffc400',
  },
  retrySmallButtonText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#000000',
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  skeletonBlock: {
    backgroundColor: '#ebe7dd',
    borderRadius: 6,
  },
  skeletonCount: {
    width: 92,
    height: 14,
  },
  skeletonLivePill: {
    width: 92,
    height: 18,
    borderRadius: 10,
  },
  skeletonMeta: {
    width: 54,
    height: 16,
    borderRadius: 10,
  },
  skeletonCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  skeletonImage: {
    width: '72%',
    height: '72%',
    borderRadius: 12,
  },
  skeletonTitle: {
    width: '88%',
    height: 13,
    marginBottom: 5,
  },
  skeletonSubtitle: {
    width: '54%',
    height: 10,
    marginBottom: 8,
  },
  skeletonPrice: {
    width: 76,
    height: 16,
  },
  skeletonOriginalPrice: {
    width: 48,
    height: 9,
    marginTop: 4,
  },
  skeletonButton: {
    width: 58,
    height: 30,
    borderRadius: 8,
  },
  gridContainer: {
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  card: {
    flex: 1,
    maxWidth: '48.5%',
    backgroundColor: '#fdfbf7',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ebe5d8',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1.5,
  },
  cardTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingTop: 10,
    zIndex: 1,
  },
  topActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  circleIconButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e0d3',
  },
  imageBox: {
    width: '100%',
    height: 125,
    backgroundColor: '#f8f4eb',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    marginTop: 4,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  cardBody: {
    padding: 10,
    backgroundColor: '#fdfbf7',
  },
  productTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 16,
    minHeight: 32,
  },
  pricingSection: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#eee9dd',
    paddingTop: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  currencySymbol: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 1,
  },
  mainPrice: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
  },
  subPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  originalPrice: {
    fontSize: 10,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
  },
  discountTag: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  discountTagText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#b91c1c',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#ffc400',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  addBtnDone: {
    backgroundColor: '#059669',
  },
  addBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#000000',
  },
  addBtnTextDone: {
    color: '#ffffff',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1f2937',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  resetBtn: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  resetBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});
