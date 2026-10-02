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
import {
  renewxColors,
  renewxFontFamily,
  renewxRadius,
  renewxSpacing,
  renewxShadows,
} from '@/design-system';

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
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: safeTop }]}>
      <View style={styles.header}>
        <View style={styles.shopBrandBlock}>
          <Image
            source={require('@/assets/logo.png')}
            style={styles.shopLogo}
            resizeMode="contain"
          />
          <View style={styles.shopTitleBlock}>
            <View style={styles.shopTitleRow}>
              <Text style={styles.shopEyebrow}>RENEWX</Text>
              <View style={styles.liveDot} />
              <Text style={styles.shopLiveText}>LIVE INVENTORY</Text>
            </View>
            <Text style={styles.headerSub}>Certified devices, ready to ship.</Text>
          </View>
        </View>

        <View style={styles.headerIcons}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => navigation.navigate('Search')}
            accessibilityLabel="Search products"
          >
            <Ionicons name="search-outline" size={20} color={renewxColors.black} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => navigation.navigate('Cart' as any)}
            accessibilityLabel={`Cart, ${totalItems} items`}
          >
            <Ionicons name="bag-handle-outline" size={20} color={renewxColors.black} />
            {totalItems > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{totalItems > 99 ? '99+' : totalItems}</Text>
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
          <Ionicons name="search" size={16} color={renewxColors.textMuted} />
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
                <Ionicons name="options" size={20} color={renewxColors.black} />
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
              colors={[renewxColors.yellow]}
              tintColor={renewxColors.yellow}
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
    backgroundColor: renewxColors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: renewxSpacing.md,
    paddingBottom: renewxSpacing.sm,
    gap: renewxSpacing.sm,
    backgroundColor: renewxColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: renewxColors.border,
  },
  shopBrandBlock: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  shopLogo: {
    width: 92,
    height: 36,
  },
  shopTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  shopTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  shopEyebrow: {
    fontFamily: renewxFontFamily.semibold,
    fontSize: 8,
    letterSpacing: 1,
    color: renewxColors.green,
  },
  shopLiveText: {
    fontFamily: renewxFontFamily.semibold,
    fontSize: 7,
    letterSpacing: 0.5,
    color: renewxColors.textMuted,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: renewxColors.green,
  },
  headerSub: {
    marginTop: 2,
    fontFamily: renewxFontFamily.regular,
    fontSize: 9,
    color: renewxColors.textSecondary,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: renewxRadius.md,
    backgroundColor: renewxColors.surface,
    borderWidth: 1,
    borderColor: renewxColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: renewxColors.yellow,
    borderWidth: 2,
    borderColor: renewxColors.surface,
  },
  cartBadgeText: {
    color: renewxColors.black,
    fontFamily: renewxFontFamily.semibold,
    fontSize: 8,
  },
  categoryScrollContainer: {
    paddingVertical: 10,
    backgroundColor: renewxColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: renewxColors.border,
  },
  categoryPillsWrapper: {
    paddingHorizontal: renewxSpacing.md,
    gap: 7,
  },
  categoryPill: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: renewxRadius.pill,
    backgroundColor: renewxColors.surface,
    borderWidth: 1,
    borderColor: renewxColors.border,
  },
  categoryPillActive: {
    backgroundColor: renewxColors.black,
    borderColor: renewxColors.black,
  },
  categoryPillText: {
    fontFamily: renewxFontFamily.medium,
    fontSize: 11,
    color: renewxColors.textSecondary,
  },
  categoryPillTextActive: {
    fontFamily: renewxFontFamily.semibold,
    color: renewxColors.yellow,
  },
  filterStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: renewxSpacing.md,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: renewxColors.background,
  },
  searchBar: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: renewxColors.surface,
    borderRadius: renewxRadius.md,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: renewxColors.border,
    gap: 7,
  },
  searchInput: {
    flex: 1,
    fontFamily: renewxFontFamily.regular,
    fontSize: 12,
    color: renewxColors.text,
  },
  filterToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: renewxColors.surface,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: renewxRadius.md,
    borderWidth: 1,
    borderColor: renewxColors.border,
  },
  filterToggleBtnActive: {
    backgroundColor: renewxColors.yellow,
    borderColor: renewxColors.yellow,
  },
  filterToggleText: {
    fontFamily: renewxFontFamily.semibold,
    fontSize: 11,
    color: renewxColors.text,
  },
  filterToggleTextActive: {
    color: renewxColors.black,
  },
  filterCountBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: renewxColors.black,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterCountBadgeText: {
    color: renewxColors.yellow,
    fontFamily: renewxFontFamily.semibold,
    fontSize: 9,
  },
  activeFiltersStrip: {
    paddingHorizontal: renewxSpacing.md,
    paddingBottom: 8,
    backgroundColor: renewxColors.background,
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
    backgroundColor: renewxColors.greenLight,
    borderWidth: 1,
    borderColor: renewxColors.greenLight,
    borderRadius: renewxRadius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  activeFilterTagText: {
    fontFamily: renewxFontFamily.medium,
    fontSize: 10,
    color: renewxColors.greenDark,
  },
  clearAllFiltersTag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: renewxRadius.pill,
    backgroundColor: renewxColors.yellowLight,
  },
  clearAllFiltersTagText: {
    fontFamily: renewxFontFamily.semibold,
    fontSize: 10,
    color: renewxColors.black,
  },
  guaranteeRibbon: {
    marginHorizontal: renewxSpacing.md,
    marginBottom: renewxSpacing.sm,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: renewxRadius.md,
    backgroundColor: renewxColors.greenSoft,
    borderWidth: 1,
    borderColor: renewxColors.greenLight,
  },
  deviceCountText: {
    fontFamily: renewxFontFamily.medium,
    fontSize: 11,
    color: renewxColors.greenDark,
  },
  refreshErrorBanner: {
    marginHorizontal: renewxSpacing.md,
    marginBottom: 10,
    padding: 11,
    borderRadius: renewxRadius.md,
    backgroundColor: renewxColors.yellowSoft,
    borderWidth: 1,
    borderColor: renewxColors.yellowLight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshErrorContent: {
    flex: 1,
  },
  refreshErrorTitle: {
    fontFamily: renewxFontFamily.semibold,
    fontSize: 11,
    color: renewxColors.text,
  },
  refreshErrorText: {
    marginTop: 2,
    fontFamily: renewxFontFamily.regular,
    fontSize: 9,
    color: renewxColors.textSecondary,
  },
  retrySmallButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: renewxRadius.sm,
    backgroundColor: renewxColors.yellow,
  },
  retrySmallButtonText: {
    fontFamily: renewxFontFamily.semibold,
    fontSize: 9,
    color: renewxColors.black,
  },
  gridContainer: {
    paddingHorizontal: renewxSpacing.md,
    paddingTop: 4,
  },
  gridRow: {
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  card: {
    flex: 1,
    maxWidth: '50%',
    minWidth: 0,
    backgroundColor: renewxColors.surface,
    borderRadius: renewxRadius.lg,
    borderWidth: 1,
    borderColor: renewxColors.border,
    overflow: 'hidden',
    ...renewxShadows.card,
  },
  cardTopBar: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingTop: 8,
    zIndex: 1,
  },
  productMetaBadge: {
    maxWidth: '65%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: renewxRadius.pill,
    backgroundColor: renewxColors.greenLight,
  },
  metaStatusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: renewxColors.green,
  },
  productMetaText: {
    fontFamily: renewxFontFamily.semibold,
    fontSize: 8,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: renewxColors.greenDark,
  },
  topActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  circleIconButton: {
    width: 29,
    height: 29,
    borderRadius: 15,
    backgroundColor: renewxColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: renewxColors.border,
  },
  imageBox: {
    width: '100%',
    height: 145,
    backgroundColor: renewxColors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    marginTop: 1,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    marginTop: 4,
    fontFamily: renewxFontFamily.regular,
    fontSize: 9,
    color: renewxColors.textMuted,
  },
  cardBody: {
    padding: 11,
    backgroundColor: renewxColors.surface,
  },
  productTitle: {
    fontFamily: renewxFontFamily.semibold,
    fontSize: 13,
    lineHeight: 17,
    color: renewxColors.text,
    minHeight: 34,
  },
  productInfoRow: {
    marginTop: 4,
    minHeight: 16,
  },
  productInfoText: {
    fontFamily: renewxFontFamily.regular,
    fontSize: 9,
    color: renewxColors.textSecondary,
  },
  pricingSection: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: renewxColors.border,
    paddingTop: 9,
    marginTop: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currencySymbol: {
    fontFamily: renewxFontFamily.semibold,
    fontSize: 11,
    color: renewxColors.text,
  },
  mainPrice: {
    fontFamily: renewxFontFamily.extraBold,
    fontSize: 15,
    color: renewxColors.text,
  },
  subPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  originalPrice: {
    fontFamily: renewxFontFamily.regular,
    fontSize: 9,
    color: renewxColors.textMuted,
    textDecorationLine: 'line-through',
  },
  discountTag: {
    backgroundColor: renewxColors.yellowLight,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
  },
  discountTagText: {
    fontFamily: renewxFontFamily.semibold,
    fontSize: 8,
    color: renewxColors.black,
  },
  addBtn: {
    width: 35,
    height: 35,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: renewxColors.yellow,
  },
  addBtnDone: {
    backgroundColor: renewxColors.green,
  },
  addBtnText: {
    fontFamily: renewxFontFamily.semibold,
    fontSize: 10,
    color: renewxColors.black,
  },
  addBtnTextDone: {
    color: renewxColors.white,
  },
  skeletonBlock: {
    backgroundColor: renewxColors.border,
  },
  skeletonHeader: {
    height: 55,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: renewxSpacing.md,
  },
  skeletonCount: {
    width: 100,
    height: 12,
    borderRadius: 6,
  },
  skeletonLivePill: {
    width: 74,
    height: 24,
    borderRadius: 12,
  },
  skeletonMeta: {
    width: 70,
    height: 20,
    borderRadius: 10,
  },
  skeletonCircle: {
    width: 29,
    height: 29,
    borderRadius: 15,
  },
  skeletonImage: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
  },
  skeletonTitle: {
    width: '78%',
    height: 13,
    borderRadius: 6,
  },
  skeletonSubtitle: {
    width: '48%',
    height: 9,
    borderRadius: 5,
    marginTop: 7,
  },
  skeletonPrice: {
    width: 76,
    height: 16,
    borderRadius: 6,
  },
  skeletonOriginalPrice: {
    width: 48,
    height: 9,
    borderRadius: 5,
    marginTop: 4,
  },
  skeletonButton: {
    width: 35,
    height: 35,
    borderRadius: 18,
  },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: renewxSpacing.xl,
  },
  stateIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: renewxColors.greenSoft,
  },
  stateTitle: {
    marginTop: 12,
    fontFamily: renewxFontFamily.bold,
    fontSize: 17,
    color: renewxColors.text,
    textAlign: 'center',
  },
  stateSub: {
    marginTop: 5,
    fontFamily: renewxFontFamily.regular,
    fontSize: 12,
    lineHeight: 18,
    color: renewxColors.textSecondary,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: renewxRadius.pill,
    backgroundColor: renewxColors.yellow,
  },
  retryButtonText: {
    fontFamily: renewxFontFamily.semibold,
    fontSize: 11,
    color: renewxColors.black,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 55,
    paddingHorizontal: renewxSpacing.xl,
  },
  emptyTitle: {
    marginTop: 12,
    fontFamily: renewxFontFamily.bold,
    fontSize: 17,
    color: renewxColors.text,
  },
  emptySub: {
    marginTop: 5,
    marginBottom: 16,
    fontFamily: renewxFontFamily.regular,
    fontSize: 12,
    lineHeight: 18,
    color: renewxColors.textSecondary,
    textAlign: 'center',
  },
  resetBtn: {
    paddingHorizontal: 17,
    paddingVertical: 10,
    borderRadius: renewxRadius.pill,
    backgroundColor: renewxColors.black,
  },
  resetBtnText: {
    fontFamily: renewxFontFamily.semibold,
    fontSize: 11,
    color: renewxColors.yellow,
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17,17,17,0.52)',
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
    maxHeight: '90%',
    backgroundColor: renewxColors.surface,
    borderTopLeftRadius: renewxRadius.xxl,
    borderTopRightRadius: renewxRadius.xxl,
    overflow: 'hidden',
    ...renewxShadows.floating,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: renewxSpacing.lg,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: renewxColors.border,
  },
  modalHeaderTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 16,
    color: renewxColors.text,
  },
  modalActiveBadge: {
    backgroundColor: renewxColors.yellowLight,
    borderWidth: 1,
    borderColor: renewxColors.yellowLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: renewxRadius.pill,
  },
  modalActiveBadgeText: {
    fontFamily: renewxFontFamily.semibold,
    fontSize: 9,
    color: renewxColors.black,
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalResetBtn: {
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  modalResetBtnText: {
    fontFamily: renewxFontFamily.semibold,
    fontSize: 10,
    color: renewxColors.greenDark,
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: renewxColors.background,
  },
  modalContent: {
    paddingHorizontal: renewxSpacing.lg,
    paddingBottom: 110,
  },
  filterSection: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: renewxColors.border,
  },
  filterSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 10,
  },
  filterSectionTitle: {
    fontFamily: renewxFontFamily.semibold,
    fontSize: 12,
    color: renewxColors.text,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: renewxRadius.pill,
    backgroundColor: renewxColors.background,
    borderWidth: 1,
    borderColor: renewxColors.border,
  },
  filterChipActive: {
    backgroundColor: renewxColors.yellow,
    borderColor: renewxColors.yellow,
  },
  filterChipText: {
    fontFamily: renewxFontFamily.medium,
    fontSize: 10,
    color: renewxColors.textSecondary,
  },
  filterChipTextActive: {
    fontFamily: renewxFontFamily.semibold,
    color: renewxColors.black,
  },
  countPill: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: renewxColors.surface,
  },
  countPillActive: {
    backgroundColor: renewxColors.black,
  },
  countPillText: {
    fontFamily: renewxFontFamily.semibold,
    fontSize: 8,
    color: renewxColors.textSecondary,
  },
  countPillTextActive: {
    color: renewxColors.yellow,
  },
  customPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 11,
    gap: 8,
  },
  customPriceInputWrap: {
    flex: 1,
  },
  customPriceLabel: {
    marginBottom: 5,
    fontFamily: renewxFontFamily.semibold,
    fontSize: 9,
    color: renewxColors.textSecondary,
  },
  customPriceInput: {
    height: 40,
    borderWidth: 1,
    borderColor: renewxColors.border,
    borderRadius: renewxRadius.md,
    paddingHorizontal: 10,
    fontFamily: renewxFontFamily.regular,
    fontSize: 11,
    color: renewxColors.text,
    backgroundColor: renewxColors.surface,
  },
  customPriceDivider: {
    paddingTop: 16,
  },
  customPriceDividerText: {
    fontFamily: renewxFontFamily.regular,
    fontSize: 10,
    color: renewxColors.textMuted,
  },
  modalBottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: 9,
    paddingHorizontal: renewxSpacing.lg,
    paddingVertical: 12,
    backgroundColor: renewxColors.surface,
    borderTopWidth: 1,
    borderTopColor: renewxColors.border,
  },
  modalClearBtn: {
    flex: 0.35,
    height: 44,
    borderRadius: renewxRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: renewxColors.background,
    borderWidth: 1,
    borderColor: renewxColors.border,
  },
  modalClearBtnText: {
    fontFamily: renewxFontFamily.semibold,
    fontSize: 10,
    color: renewxColors.text,
  },
  modalApplyBtn: {
    flex: 1,
    height: 44,
    borderRadius: renewxRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: renewxColors.yellow,
  },
  modalApplyBtnText: {
    fontFamily: renewxFontFamily.semibold,
    fontSize: 11,
    color: renewxColors.black,
  },
});

