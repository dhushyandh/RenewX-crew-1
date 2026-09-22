import { useState, useMemo, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/App';
import type { Product } from '@/types';
import { api } from '@/services/api';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
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

const sortOptions = [
  { label: 'Featured', value: 'featured' },
  { label: 'Price: Low to High', value: 'price_asc' },
  { label: 'Price: High to Low', value: 'price_desc' },
  { label: 'Highest Rated', value: 'rating' },
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
  const [showFilters, setShowFilters] = useState(false);
  const [favorites, setFavorites] = useState<Record<string | number, boolean>>({});
  const [refreshing, setRefreshing] = useState(false);

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
      // Keep already-loaded products visible if a background refresh fails.
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
    try {
      await Share.share({
        title: product.name,
        message: `Check out ${product.name} on RenewX for ₹${Number(product.price || 0).toLocaleString('en-IN')}.`,
      });
    } catch (error) {
      // Share cancellation/errors should not interrupt shopping.
      console.warn('Share error:', error);
    }
  };

  const filteredProducts = useMemo(() => {
    return products
      .filter((product) => {
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

        if (selectedBrand !== 'All Brands') {
          const brand = getProductBrand(product).toLowerCase();
          const name = String(product.name || '').toLowerCase();

          if (!brand.includes(selectedBrand.toLowerCase()) &&
              !name.includes(selectedBrand.toLowerCase())) {
            return false;
          }
        }

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

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price_asc') return Number(a.price || 0) - Number(b.price || 0);
        if (sortBy === 'price_desc') return Number(b.price || 0) - Number(a.price || 0);
        if (sortBy === 'rating') return Number((b as any).rating || 0) - Number((a as any).rating || 0);
        return 0;
      });
  }, [products, selectedCategory, selectedBrand, searchQuery, sortBy]);

  const hasActiveFilters =
    selectedCategory !== 'All Devices' ||
    selectedBrand !== 'All Brands' ||
    searchQuery.trim().length > 0;

  const clearFilters = () => {
    setSelectedCategory('All Devices');
    setSelectedBrand('All Brands');
    setSearchQuery('');
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
      {loadError && products.length > 0 && (
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
            <View style={styles.liveDot} />
            <Text style={styles.shopBadge}>SHOP</Text>
            <View style={styles.routeBadge}>
              <Ionicons name="link-outline" size={11} color="#64748b" />
              <Text
                style={[
                  styles.routeBadgeText,
                  { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
                ]}
              >
                /shop
              </Text>
            </View>
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
          style={[styles.filterToggleBtn, showFilters && styles.filterToggleBtnActive]}
          onPress={() => setShowFilters((value) => !value)}
        >
          <Ionicons
            name="options-outline"
            size={16}
            color={showFilters ? '#ffffff' : '#111827'}
          />
          <Text
            style={[
              styles.filterToggleText,
              showFilters && styles.filterToggleTextActive,
            ]}
          >
            Filters
          </Text>
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={styles.expandedFiltersBox}>
          <Text style={styles.filterGroupTitle}>Brand</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.brandRowScroll}
          >
            {brands.map((brand) => (
              <TouchableOpacity
                key={brand}
                style={[
                  styles.brandChip,
                  selectedBrand === brand && styles.brandChipActive,
                ]}
                onPress={() => setSelectedBrand(brand)}
              >
                <Text
                  style={[
                    styles.brandChipText,
                    selectedBrand === brand && styles.brandChipTextActive,
                  ]}
                >
                  {brand}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[styles.filterGroupTitle, { marginTop: 8 }]}>Sort By</Text>

          <View style={styles.sortRow}>
            {sortOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.sortChip,
                  sortBy === option.value && styles.sortChipActive,
                ]}
                onPress={() => setSortBy(option.value)}
              >
                <Text
                  style={[
                    styles.sortChipText,
                    sortBy === option.value && styles.sortChipTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

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
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  filterToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  filterToggleTextActive: {
    color: '#ffffff',
  },
  expandedFiltersBox: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e2d8',
    marginBottom: 8,
  },
  filterGroupTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  brandRowScroll: {
    marginBottom: 4,
  },
  brandChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#f3f4f6',
    marginRight: 6,
  },
  brandChipActive: {
    backgroundColor: '#ffc400',
  },
  brandChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
  brandChipTextActive: {
    color: '#000000',
    fontWeight: '800',
  },
  sortRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  sortChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#f3f4f6',
  },
  sortChipActive: {
    backgroundColor: '#0f172a',
  },
  sortChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
  sortChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
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
