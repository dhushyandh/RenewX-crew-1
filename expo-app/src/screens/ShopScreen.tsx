import { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  Share,
  Alert,
  ScrollView,
  RefreshControl,
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
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme';
import { mapProductRow } from '@/lib/productMapper';
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

const brands = ['All Brands', 'Apple', 'Samsung', 'Dell', 'Lenovo', 'HP', 'Sony', 'OnePlus', 'Google'];

const sortOptions = [
  { label: 'Featured', value: 'featured' },
  { label: 'Price: Low to High', value: 'price_asc' },
  { label: 'Price: High to Low', value: 'price_desc' },
  { label: 'Highest Rated', value: 'rating' },
];

export default function ShopScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { addToCart, items, totalItems } = useCart();
  const toast = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('All Devices');
  const [selectedBrand, setSelectedBrand] = useState('All Brands');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('featured');
  const [showFilters, setShowFilters] = useState(false);
  const [favorites, setFavorites] = useState<Record<string | number, boolean>>({});
  const [refreshing, setRefreshing] = useState(false);

  const fetchLiveProducts = async () => {
    try {
      setLoadError(null);
      const data = await api.products.getAll({ limit: 100 });
      setProducts((data as any[]).map(mapProductRow));
    } catch (err: any) {
      setProducts([]);
      setLoadError(err?.message || 'Unable to load products');
    }
  };

  useEffect(() => {
    fetchLiveProducts();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLiveProducts();
    setRefreshing(false);
  };

  const toggleFavorite = (productId: string | number, productName?: string) => {
    setFavorites((prev) => {
      const willFav = !prev[productId];
      if (willFav) {
        toast.info(productName ? `"${productName}" saved to wishlist` : 'Saved to wishlist', 'Added to Wishlist');
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
        message: `Check out this refurbished ${product.name} with 1-Year Warranty on RenewX for just ₹${product.price.toLocaleString('en-IN')}!`,
      });
    } catch (error) {
      console.warn('Share error:', error);
    }
  };

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Category filter
        if (selectedCategory !== 'All Devices') {
          const catStr = (p.category as string).toLowerCase();
          const selStr = selectedCategory.toLowerCase();
          const matchCat =
            (selectedCategory === 'Smartphones' && (catStr.includes('phone') || catStr.includes('smart'))) ||
            (selectedCategory === 'MacBooks' && (p.name.toLowerCase().includes('macbook') || catStr.includes('laptop'))) ||
            (selectedCategory === 'Laptops' && catStr.includes('laptop')) ||
            (selectedCategory === 'Tablets' && (catStr.includes('tablet') || catStr.includes('pad'))) ||
            (selectedCategory === 'Smartwatches' && (catStr.includes('wear') || catStr.includes('watch'))) ||
            (selectedCategory === 'Audio' && (catStr.includes('audio') || catStr.includes('headphone'))) ||
            catStr.includes(selStr);
          if (!matchCat) return false;
        }

        // Brand filter
        if (selectedBrand !== 'All Brands') {
          if (p.brand?.toLowerCase() !== selectedBrand.toLowerCase() && !p.name.toLowerCase().includes(selectedBrand.toLowerCase())) {
            return false;
          }
        }

        // Search query
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          const matchName = p.name.toLowerCase().includes(query);
          const matchBrand = p.brand?.toLowerCase().includes(query);
          const matchDesc = p.description?.toLowerCase().includes(query);
          if (!matchName && !matchBrand && !matchDesc) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price_asc') return a.price - b.price;
        if (sortBy === 'price_desc') return b.price - a.price;
        if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
        return 0;
      });
  }, [products, selectedCategory, selectedBrand, searchQuery, sortBy]);

  const renderProductItem = ({ item: product }: { item: Product }) => {
    const isFav = !!favorites[product.id];
    const isAdded = items.some((i) => i.id === product.id);
    const discount = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('ProductDetail', { product })}
      >
        {/* Top Badges & Actions */}
        <View style={styles.cardTopBar}>
          <View style={styles.gradeBadge}>
            <Ionicons name="sparkles" size={10} color="#059669" />
            <Text style={styles.gradeText}>Grade A+</Text>
          </View>
          <View style={styles.topActionsRow}>
            <TouchableOpacity
              style={styles.circleIconButton}
              onPress={() => toggleFavorite(product.id)}
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

        {/* Product Image */}
        <View style={styles.imageBox}>
          <Image source={{ uri: product.image }} style={styles.productImage} resizeMode="contain" />
        </View>

        {/* Product Details */}
        <View style={styles.cardBody}>
          <Text style={styles.productTitle} numberOfLines={2}>
            {product.name}
          </Text>

          {/* Quick Specs Badges */}
          <View style={styles.specsRow}>
            <View style={styles.specPill}>
              <Ionicons name="battery-charging" size={11} color="#059669" />
              <Text style={styles.specPillText}>94% Health</Text>
            </View>
            <View style={styles.specPill}>
              <Ionicons name="shield-checkmark" size={11} color="#0284c7" />
              <Text style={styles.specPillText}>{product.warrantyMonths}M Warranty</Text>
            </View>
          </View>

          {/* Price & Action Row */}
          <View style={styles.pricingSection}>
            <View>
              <View style={styles.priceRow}>
                <Text style={styles.currencySymbol}>₹</Text>
                <Text style={styles.mainPrice}>{product.price.toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.subPriceRow}>
                <Text style={styles.originalPrice}>₹{product.originalPrice.toLocaleString('en-IN')}</Text>
                {discount > 0 && (
                  <View style={styles.discountTag}>
                    <Text style={styles.discountTagText}>{discount}% OFF</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Add to Cart Button */}
            <TouchableOpacity
              style={[styles.addBtn, isAdded && styles.addBtnDone]}
              onPress={() => {
                addToCart(product);
                toast.success(`${product.name} added to cart`, 'Added to Cart', {
                  action: {
                    label: 'View Cart',
                    onPress: () => navigation.navigate('Cart'),
                  },
                });
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

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
      {/* Top Header Bar */}
      <View style={styles.header}>
        <View>
          <View style={styles.brandRow}>
            <Text style={styles.brandTitle}>Renew</Text>
            <Text style={styles.brandAccent}>X</Text>
            <View style={styles.liveDot} />
            <Text style={styles.shopBadge}>SHOP</Text>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              backgroundColor: '#f1f5f9',
              paddingHorizontal: 7,
              paddingVertical: 2,
              borderRadius: 6,
              marginLeft: 8,
            }}>
              <Ionicons name="link-outline" size={11} color="#64748b" />
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#475569', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
                /shop
              </Text>
            </View>
          </View>
          <Text style={styles.headerSub}>Certified Refurbished • Instant Delivery</Text>
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

      {/* Horizontal Category Filter Pills */}
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
                <Text style={[styles.categoryPillText, isActive && styles.categoryPillTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Search and Filters Strip */}
      <View style={styles.filterStrip}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color="#9ca3af" />
          <TextInput
            placeholder="Search iPhones, MacBooks, Dell..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.filterToggleBtn, showFilters && styles.filterToggleBtnActive]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons name="options-outline" size={16} color={showFilters ? '#ffffff' : '#111827'} />
          <Text style={[styles.filterToggleText, showFilters && styles.filterToggleTextActive]}>
            Filters
          </Text>
        </TouchableOpacity>
      </View>

      {/* Expandable Filter Drawer (Brand & Sort) */}
      {showFilters && (
        <View style={styles.expandedFiltersBox}>
          {/* Brand Pills */}
          <Text style={styles.filterGroupTitle}>Brand</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.brandRowScroll}>
            {brands.map((b) => (
              <TouchableOpacity
                key={b}
                style={[styles.brandChip, selectedBrand === b && styles.brandChipActive]}
                onPress={() => setSelectedBrand(b)}
              >
                <Text style={[styles.brandChipText, selectedBrand === b && styles.brandChipTextActive]}>
                  {b}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Sort Options */}
          <Text style={[styles.filterGroupTitle, { marginTop: 8 }]}>Sort By</Text>
          <View style={styles.sortRow}>
            {sortOptions.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.sortChip, sortBy === opt.value && styles.sortChipActive]}
                onPress={() => setSortBy(opt.value)}
              >
                <Text style={[styles.sortChipText, sortBy === opt.value && styles.sortChipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Device Count & Quality Guarantee Ribbon */}
      <View style={styles.guaranteeRibbon}>
        <Text style={styles.deviceCountText}>
          {filteredProducts.length} verified {filteredProducts.length === 1 ? 'device' : 'devices'}
        </Text>
        <View style={styles.guaranteePill}>
          <Ionicons name="checkmark-circle" size={13} color="#059669" />
          <Text style={styles.guaranteeText}>100% Tested • 1-Yr Warranty</Text>
        </View>
      </View>

      {/* Products Grid */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProductItem}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={[styles.gridContainer, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#ffc400']} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="hardware-chip-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No Devices Found</Text>
            <Text style={styles.emptySub}>
              Try adjusting your category, brand filters or search term.
            </Text>
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={() => {
                setSelectedCategory('All Devices');
                setSelectedBrand('All Brands');
                setSearchQuery('');
              }}
            >
              <Text style={styles.resetBtnText}>Clear All Filters</Text>
            </TouchableOpacity>
          </View>
        }
      />
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
  guaranteePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  guaranteeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065f46',
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
    backgroundColor: '#fdfbf7', // Warm cream card
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
  gradeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  gradeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#065f46',
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
  specsRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 6,
    marginBottom: 8,
  },
  specPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#f3efe6',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  specPillText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#4b5563',
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
