import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
} from 'react-native';
import { useFocusEffect, useNavigation, useIsFocused } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RootStackParamList } from '@/App';
import type { Product } from '@/types';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { shareProduct } from '@/services/shareService';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import HomeHeader from '@/components/HomeHeader';
import ProductCard from '@/components/ProductCard';
import FloatingContactButtons from '@/components/FloatingContactButtons';
import { mapProductRow } from '@/lib/productMapper';
import { Ionicons } from '@expo/vector-icons';
import {
  renewxColors,
  renewxRadius,
  renewxSpacing,
  renewxFontFamily,
  renewxShadows,
} from '@/design-system';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type AnyProduct = Product & Record<string, any>;

const PRODUCTS_CACHE_KEY = '@renewx_products_cache';
const AUTO_SLIDE_INTERVAL = 4000;

const QUICK_CATEGORIES = [
  { label: 'Smartphones', icon: 'phone-portrait-outline' as const },
  { label: 'Laptops', icon: 'laptop-outline' as const },
  { label: 'MacBooks', icon: 'logo-apple' as const },
  { label: 'Tablets', icon: 'tablet-portrait-outline' as const },
  { label: 'Audio', icon: 'headset-outline' as const },
  { label: 'Smartwatches', icon: 'watch-outline' as const },
];

function getProductName(product: AnyProduct) {
  return product.name ?? product.title ?? product.product_name ?? product.productName ?? 'Certified Device';
}

function getCategory(product: AnyProduct) {
  return product.category ?? product.category_name ?? product.categoryName ?? product.type ?? '';
}

function getProductImage(product: AnyProduct): string | undefined {
  const images = product.images ?? product.image_urls ?? product.imageUrls;

  if (Array.isArray(images) && images.length > 0) {
    const first = images[0];
    if (typeof first === 'string') return first;
    if (first?.url) return first.url;
    if (first?.src) return first.src;
  }

  return (
    product.image_url ??
    product.imageUrl ??
    product.image ??
    product.thumbnail ??
    product.thumbnail_url ??
    product.photo_url ??
    product.photoUrl
  );
}

function getProductPrice(product: AnyProduct) {
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

function getProductCondition(product: AnyProduct) {
  return product.condition ?? product.grade ?? product.quality ?? product.device_condition ?? 'Certified';
}

function getAvailability(product: AnyProduct) {
  const stock = product.stock_quantity ?? product.stockQuantity ?? product.stock;

  if (stock !== undefined && stock !== null) {
    return Number(stock) > 0 ? 'Available now' : 'Out of stock';
  }

  if (product.available === false || product.is_available === false) {
    return 'Out of stock';
  }

  return 'Available now';
}

function formatPrice(value: number) {
  return value > 0 ? `₹${Math.round(value).toLocaleString('en-IN')}` : 'Price on request';
}

function getHeroProductScore(product: AnyProduct) {
  const stock = Number(product.stock_quantity ?? product.stockQuantity ?? product.stock ?? 1);
  const featured = Boolean(
    product.featured ?? product.is_featured ?? product.isFeatured ?? product.highlighted,
  );
  const hasImage = Boolean(getProductImage(product));
  const price = getProductPrice(product);

  return (featured ? 1000 : 0) + (hasImage ? 100 : 0) + (stock > 0 ? 20 : 0) + (price > 0 ? 10 : 0);
}

function getResponsiveMetrics(width: number) {
  const isSmall = width < 360;
  const isLarge = width >= 430;

  return {
    heroHeight: isSmall ? 430 : isLarge ? 490 : 455,
    imageHeight: isSmall ? 210 : isLarge ? 255 : 230,
    sidePadding: isSmall ? 12 : 16,
    gridGap: isSmall ? 8 : 10,
  };
}

function HeroProductCard({
  product,
  index,
  total,
  onPress,
  screenWidth,
}: {
  product: AnyProduct;
  index: number;
  total: number;
  onPress: () => void;
  screenWidth: number;
}) {
  const image = getProductImage(product);
  const name = getProductName(product);
  const category = getCategory(product);
  const price = getProductPrice(product);
  const condition = getProductCondition(product);
  const availability = getAvailability(product);

  return (
    <TouchableOpacity
      activeOpacity={0.96}
      onPress={onPress}
      style={{ width: screenWidth }}
      accessibilityRole="button"
      accessibilityLabel={`Featured device: ${name}`}
    >
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={styles.certifiedPill}>
            <View style={styles.certifiedDot} />
            <Text style={styles.certifiedText}>CERTIFIED DEVICE</Text>
          </View>

          <View style={styles.heroCount}>
            <Text style={styles.heroCountText}>{index + 1}</Text>
            <Text style={styles.heroCountSlash}>/</Text>
            <Text style={styles.heroCountTotal}>{total}</Text>
          </View>
        </View>

        <View style={styles.heroVisual}>
          <View style={styles.heroGlowLarge} />
          <View style={styles.heroGlowSmall} />

          {image ? (
            <Image source={{ uri: image }} style={{ width: '92%', height: '100%' }} resizeMode="contain" />
          ) : (
            <View style={styles.heroFallback}>
              <Ionicons name="phone-portrait-outline" size={54} color={renewxColors.textSecondary} />
            </View>
          )}
        </View>

        <View style={styles.heroInfo}>
          <View style={styles.heroInfoTop}>
            <View style={styles.heroTitleBlock}>
              <Text style={styles.heroBrand} numberOfLines={1}>
                {String(category || 'RenewX device').toUpperCase()}
              </Text>
              <Text style={styles.heroName} numberOfLines={2}>{name}</Text>
              <Text style={styles.heroSubline}>Professionally checked • Ready to ship</Text>
            </View>

            <View style={styles.heroPriceBlock}>
              <Text style={styles.heroFrom}>FROM</Text>
              <Text style={styles.heroPrice}>{formatPrice(price)}</Text>
            </View>
          </View>

          <View style={styles.heroBottomRow}>
            <View style={styles.conditionPill}>
              <Ionicons name="shield-checkmark-outline" size={16} color={renewxColors.greenDark} />
              <Text style={styles.conditionText}>{String(condition)}</Text>
            </View>

            <View style={styles.availability}>
              <View
                style={[
                  styles.availabilityDot,
                  availability === 'Out of stock' && styles.availabilityDotOff,
                ]}
              />
              <Text style={styles.availabilityText}>{availability}</Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function ProductSkeleton() {
  return (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonImage} />
      <View style={styles.skeletonLineWide} />
      <View style={styles.skeletonLine} />
      <View style={styles.skeletonPrice} />
    </View>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { addToCart, totalItems } = useCart();
  const { isAdmin, signOut } = useAuth();
  const toast = useToast();
  const isFocused = useIsFocused();

  const [screenWidth, setScreenWidth] = useState(() => Dimensions.get('window').width);
  const responsive = useMemo(() => getResponsiveMetrics(screenWidth), [screenWidth]);

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [productList, setProductList] = useState<Product[]>([]);
  const [heroIndex, setHeroIndex] = useState(0);
  const [autoSlideTrigger, setAutoSlideTrigger] = useState(0);

  const heroScrollRef = useRef<ScrollView>(null);
  const listRef = useRef<FlatList>(null);
  const isInteractingRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' as any });
      }
    }, []),
  );

  const saveProductsCache = useCallback(async (rows: any[]) => {
    try {
      const lightweight = rows.slice(0, 20).map((row: any) => {
        const image = typeof row.image === 'string' ? row.image : '';
        return {
          id: row.id || row._uuid || row._id,
          name: row.name,
          price: row.price,
          originalPrice: row.originalPrice,
          brand: row.brand,
          category: row.category,
          stock: row.stock,
          condition: row.condition,
          image: image.startsWith('data:') && image.length > 5000 ? '' : image,
        };
      });

      await AsyncStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(lightweight));
    } catch (error: any) {
      console.warn('[Home] Failed to write product cache:', error?.message);
      if (String(error?.message).includes('SQLITE_FULL') || String(error?.message).includes('full')) {
        try { await AsyncStorage.removeItem(PRODUCTS_CACHE_KEY); } catch {}
      }
    }
  }, []);

  const readCache = useCallback(async () => {
    try {
      const cached = await AsyncStorage.getItem(PRODUCTS_CACHE_KEY);
      if (!cached) return false;

      const rows = JSON.parse(cached);
      if (!Array.isArray(rows)) return false;

      const mapped = rows.map(mapProductRow);
      if (mapped.length) {
        setProductList(mapped);
        return true;
      }
    } catch (error) {
      console.warn('[Home] Product cache read failed:', error);
    }

    return false;
  }, []);

  const fetchLiveProducts = useCallback(async () => {
    try {
      const data = await api.products.getAll({ limit: 100 });
      const rows = Array.isArray(data) ? data : [];
      const mapped = rows.map(mapProductRow);

      setProductList(mapped);
      setHeroIndex(0);
      saveProductsCache(rows);
    } catch (error: any) {
      console.warn('[Home] Live product fetch failed:', error?.message);
      const cached = await readCache();
      if (!cached) setProductList([]);
    } finally {
      setLoading(false);
    }
  }, [readCache, saveProductsCache]);

  useEffect(() => {
    fetchLiveProducts();

    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });

    return () => subscription.remove();
  }, [fetchLiveProducts]);

  const heroProducts = useMemo(() => {
    return [...(productList as AnyProduct[])]
      .filter((product) => getProductImage(product))
      .sort((a, b) => getHeroProductScore(b) - getHeroProductScore(a))
      .slice(0, 7);
  }, [productList]);

  const newArrivals = useMemo(() => {
    return [...(productList as AnyProduct[])]
      .sort((a, b) => {
        const dateA = new Date(a.created_at ?? a.createdAt ?? a.updated_at ?? a.updatedAt ?? 0).getTime();
        const dateB = new Date(b.created_at ?? b.createdAt ?? b.updated_at ?? b.updatedAt ?? 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 10);
  }, [productList]);

  const goToHero = useCallback((index: number) => {
    if (!heroProducts.length) return;

    const nextIndex = index < 0
      ? heroProducts.length - 1
      : index >= heroProducts.length ? 0 : index;

    heroScrollRef.current?.scrollTo({
      x: nextIndex * Math.max(screenWidth, 1),
      animated: true,
    });
    setHeroIndex(nextIndex);
  }, [heroProducts.length, screenWidth]);

  const resetAutoSlide = useCallback(() => {
    setAutoSlideTrigger((value) => value + 1);
  }, []);

  const handleHeroScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(
      event.nativeEvent.contentOffset.x / Math.max(screenWidth, 1),
    );

    if (nextIndex !== heroIndex) {
      setHeroIndex(Math.max(0, Math.min(nextIndex, heroProducts.length - 1)));
    }
  };

  useEffect(() => {
    if (!isFocused || heroProducts.length <= 1) return;

    const timer = setTimeout(() => {
      if (!isInteractingRef.current) {
        goToHero(heroIndex + 1);
      }
    }, AUTO_SLIDE_INTERVAL);

    return () => clearTimeout(timer);
  }, [heroIndex, isFocused, heroProducts.length, autoSlideTrigger, goToHero]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLiveProducts();
    setRefreshing(false);
  };

  const openProduct = (product: Product) => {
    navigation.navigate('ProductDetail', {
      id: String((product as AnyProduct).id),
    });
  };

  const handleShareProduct = useCallback(async (product: Product) => {
    await shareProduct(product, {
      onSuccessToast: (message) => toast?.success?.(message, 'Link Copied'),
    });
  }, [toast]);

  const renderProduct = ({ item }: { item: Product }) => (
    <View style={styles.productWrapper}>
      <ProductCard
        product={item}
        onPress={() => openProduct(item)}
        onAddToCart={() => {
          addToCart(item);
          navigation.navigate('Cart');
        }}
        onShare={() => handleShareProduct(item)}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <HomeHeader
        onSearch={() => navigation.navigate('Search')}
        cartCount={totalItems}
        onCart={() => navigation.navigate('Cart')}
        isAdmin={isAdmin}
        onAdmin={() => navigation.navigate('Admin', { screen: 'dashboard' })}
        onLogout={signOut}
      />

      <FlatList
        ref={listRef}
        data={loading ? [] : newArrivals}
        keyExtractor={(item, index) =>
          String((item as AnyProduct)._uuid ?? (item as AnyProduct).id ?? index)
        }
        numColumns={2}
        columnWrapperStyle={[styles.productRow, { gap: responsive.gridGap }]}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={renewxColors.green}
          />
        }
        ListHeaderComponent={
          <View>
            {heroProducts.length > 0 ? (
              <View style={styles.heroSection}>
                <ScrollView
                  ref={heroScrollRef}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onScrollBeginDrag={() => { isInteractingRef.current = true; }}
                  onScrollEndDrag={() => {
                    isInteractingRef.current = false;
                    resetAutoSlide();
                  }}
                  onMomentumScrollEnd={handleHeroScroll}
                  scrollEventThrottle={16}
                >
                  {heroProducts.map((product, index) => (
                    <HeroProductCard
                      key={String((product as AnyProduct)._uuid ?? (product as AnyProduct).id ?? index)}
                      product={product as AnyProduct}
                      index={index}
                      total={heroProducts.length}
                      onPress={() => openProduct(product)}
                      screenWidth={screenWidth}
                    />
                  ))}
                </ScrollView>

                {heroProducts.length > 1 && (
                  <>
                    <TouchableOpacity
                      style={[styles.heroArrow, styles.heroArrowLeft]}
                      onPress={() => { goToHero(heroIndex - 1); resetAutoSlide(); }}
                      accessibilityLabel="Previous featured product"
                    >
                      <Ionicons name="chevron-back" size={20} color={renewxColors.text} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.heroArrow, styles.heroArrowRight]}
                      onPress={() => { goToHero(heroIndex + 1); resetAutoSlide(); }}
                      accessibilityLabel="Next featured product"
                    >
                      <Ionicons name="chevron-forward" size={20} color={renewxColors.text} />
                    </TouchableOpacity>
                  </>
                )}
              </View>
            ) : loading ? (
              <View style={[styles.heroSkeleton, { height: responsive.heroHeight }]}>
                <View style={styles.skeletonCircle} />
                <View style={styles.skeletonVisual} />
                <View style={styles.skeletonInfo} />
              </View>
            ) : (
              <View style={styles.heroEmpty}>
                <View style={styles.heroEmptyIcon}>
                  <Ionicons name="cube-outline" size={28} color={renewxColors.textSecondary} />
                </View>
                <Text style={styles.heroEmptyTitle}>Your next certified device is coming</Text>
                <Text style={styles.heroEmptyText}>
                  Published products with images will appear here.
                </Text>
              </View>
            )}

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionKicker}>EXPLORE</Text>
                  <Text style={styles.sectionTitle}>Shop by category</Text>
                </View>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Shop' as never)}
                  style={styles.textAction}
                >
                  <Text style={styles.textActionLabel}>Shop all</Text>
                  <Ionicons name="arrow-forward" size={15} color={renewxColors.greenDark} />
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryRow}
              >
                {QUICK_CATEGORIES.map((category) => (
                  <TouchableOpacity
                    key={category.label}
                    style={styles.categoryChip}
                    onPress={() => navigation.navigate('Shop' as never)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.categoryIcon}>
                      <Ionicons name={category.icon} size={18} color={renewxColors.greenDark} />
                    </View>
                    <Text style={styles.categoryLabel}>{category.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionKicker}>JUST IN</Text>
                  <Text style={styles.sectionTitle}>New device arrivals</Text>
                </View>
                <TouchableOpacity
                  style={styles.textAction}
                  onPress={() => navigation.navigate('Shop' as never)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.textActionLabel}>View all</Text>
                  <Ionicons name="arrow-forward" size={15} color={renewxColors.greenDark} />
                </TouchableOpacity>
              </View>
            </View>

            {loading && (
              <View style={styles.skeletonGrid}>
                <ProductSkeleton />
                <ProductSkeleton />
                <ProductSkeleton />
                <ProductSkeleton />
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="cube-outline" size={28} color={renewxColors.textSecondary} />
              </View>
              <Text style={styles.emptyTitle}>No products available</Text>
              <Text style={styles.emptyText}>
                New certified devices will appear here when they are published.
              </Text>
              <TouchableOpacity style={styles.emptyRetry} onPress={onRefresh}>
                <Ionicons name="refresh" size={16} color={renewxColors.black} />
                <Text style={styles.emptyRetryText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        renderItem={renderProduct}
      />

      <FloatingContactButtons />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: renewxColors.background,
  },
  listContent: {
    paddingBottom: 118,
  },
  heroSection: {
    position: 'relative',
    marginTop: renewxSpacing.sm,
    marginBottom: renewxSpacing.lg,
  },
  heroCard: {
    minHeight: 445,
    marginHorizontal: renewxSpacing.md,
    padding: renewxSpacing.md,
    paddingBottom: 12,
    overflow: 'hidden',
    borderRadius: renewxRadius.xl,
    backgroundColor: renewxColors.surface,
    borderWidth: 1,
    borderColor: renewxColors.border,
    ...renewxShadows.card,
  },
  heroTopRow: {
    zIndex: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  certifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: renewxRadius.pill,
    backgroundColor: renewxColors.greenLight,
  },
  certifiedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: renewxColors.green,
  },
  certifiedText: {
    fontFamily: renewxFontFamily.semibold,
    fontSize: 9,
    letterSpacing: 0.7,
    color: renewxColors.greenDark,
  },
  heroCount: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  heroCountText: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 15,
    color: renewxColors.text,
  },
  heroCountSlash: {
    fontFamily: renewxFontFamily.regular,
    fontSize: 12,
    color: renewxColors.textMuted,
  },
  heroCountTotal: {
    fontFamily: renewxFontFamily.regular,
    fontSize: 12,
    color: renewxColors.textSecondary,
  },
  heroVisual: {
    height: 245,
    marginTop: 6,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  heroGlowLarge: {
    position: 'absolute',
    width: 245,
    height: 245,
    borderRadius: 123,
    backgroundColor: renewxColors.yellowLight,
  },
  heroGlowSmall: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: renewxColors.greenSoft,
    right: 20,
    bottom: 4,
    opacity: 0.95,
  },
  heroFallback: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInfo: {
    paddingTop: 14,
    paddingHorizontal: 3,
  },
  heroInfoTop: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  heroTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  heroBrand: {
    fontFamily: renewxFontFamily.semibold,
    fontSize: 9,
    letterSpacing: 0.8,
    color: renewxColors.green,
  },
  heroName: {
    marginTop: 3,
    fontFamily: renewxFontFamily.bold,
    fontSize: 22,
    lineHeight: 27,
    color: renewxColors.text,
  },
  heroSubline: {
    marginTop: 5,
    fontFamily: renewxFontFamily.regular,
    fontSize: 10,
    color: renewxColors.textSecondary,
  },
  heroPriceBlock: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  heroFrom: {
    fontFamily: renewxFontFamily.semibold,
    fontSize: 8,
    letterSpacing: 0.8,
    color: renewxColors.textMuted,
  },
  heroPrice: {
    marginTop: 1,
    fontFamily: renewxFontFamily.extraBold,
    fontSize: 22,
    color: renewxColors.text,
  },
  heroBottomRow: {
    marginTop: 13,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: renewxColors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  conditionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  conditionText: {
    fontFamily: renewxFontFamily.medium,
    fontSize: 11,
    color: renewxColors.textSecondary,
  },
  availability: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  availabilityDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: renewxColors.green,
  },
  availabilityDotOff: {
    backgroundColor: renewxColors.error,
  },
  availabilityText: {
    fontFamily: renewxFontFamily.regular,
    fontSize: 10,
    color: renewxColors.textSecondary,
  },
  heroArrow: {
    position: 'absolute',
    top: 214,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: renewxColors.surface,
    borderWidth: 1,
    borderColor: renewxColors.border,
    ...renewxShadows.card,
  },
  heroArrowLeft: { left: 8 },
  heroArrowRight: { right: 8 },
  heroSkeleton: {
    marginHorizontal: renewxSpacing.md,
    borderRadius: renewxRadius.xl,
    overflow: 'hidden',
    backgroundColor: renewxColors.surface,
    borderWidth: 1,
    borderColor: renewxColors.border,
    padding: renewxSpacing.md,
  },
  skeletonCircle: {
    width: 80,
    height: 12,
    borderRadius: 6,
    backgroundColor: renewxColors.border,
  },
  skeletonVisual: {
    height: 260,
    marginTop: 16,
    borderRadius: renewxRadius.lg,
    backgroundColor: renewxColors.background,
  },
  skeletonInfo: {
    height: 105,
    marginTop: 14,
    borderRadius: renewxRadius.md,
    backgroundColor: renewxColors.background,
  },
  heroEmpty: {
    minHeight: 250,
    marginHorizontal: renewxSpacing.md,
    padding: renewxSpacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: renewxRadius.xl,
    backgroundColor: renewxColors.surface,
    borderWidth: 1,
    borderColor: renewxColors.border,
  },
  heroEmptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: renewxColors.greenSoft,
  },
  heroEmptyTitle: {
    marginTop: 12,
    textAlign: 'center',
    fontFamily: renewxFontFamily.bold,
    fontSize: 17,
    color: renewxColors.text,
  },
  heroEmptyText: {
    marginTop: 6,
    textAlign: 'center',
    fontFamily: renewxFontFamily.regular,
    fontSize: 12,
    lineHeight: 18,
    color: renewxColors.textSecondary,
  },
  section: {
    marginBottom: renewxSpacing.lg,
  },
  sectionHeader: {
    paddingHorizontal: renewxSpacing.md,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 10,
  },
  sectionKicker: {
    fontFamily: renewxFontFamily.semibold,
    fontSize: 9,
    letterSpacing: 1.1,
    color: renewxColors.green,
  },
  sectionTitle: {
    marginTop: 2,
    fontFamily: renewxFontFamily.bold,
    fontSize: 21,
    lineHeight: 25,
    color: renewxColors.text,
  },
  textAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingBottom: 2,
  },
  textActionLabel: {
    fontFamily: renewxFontFamily.semibold,
    fontSize: 10,
    color: renewxColors.greenDark,
  },
  categoryRow: {
    paddingHorizontal: renewxSpacing.md,
    paddingTop: 12,
    gap: 8,
  },
  categoryChip: {
    minWidth: 92,
    padding: 9,
    borderRadius: renewxRadius.lg,
    backgroundColor: renewxColors.surface,
    borderWidth: 1,
    borderColor: renewxColors.border,
    alignItems: 'center',
    ...renewxShadows.card,
  },
  categoryIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: renewxColors.greenLight,
  },
  categoryLabel: {
    marginTop: 6,
    textAlign: 'center',
    fontFamily: renewxFontFamily.regular,
    fontSize: 9,
    lineHeight: 12,
    color: renewxColors.text,
  },
  productRow: {
    paddingHorizontal: renewxSpacing.md,
  },
  productWrapper: {
    flex: 1,
    minWidth: 0,
    maxWidth: '50%',
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: renewxSpacing.md,
  },
  skeletonCard: {
    flex: 1,
    minWidth: 0,
    maxWidth: '50%',
    marginBottom: renewxSpacing.sm,
    padding: 9,
    borderRadius: renewxRadius.lg,
    backgroundColor: renewxColors.surface,
    borderWidth: 1,
    borderColor: renewxColors.border,
  },
  skeletonImage: {
    height: 145,
    borderRadius: renewxRadius.md,
    backgroundColor: renewxColors.background,
  },
  skeletonLineWide: {
    width: '78%',
    height: 10,
    marginTop: 11,
    borderRadius: 5,
    backgroundColor: renewxColors.border,
  },
  skeletonLine: {
    width: '52%',
    height: 8,
    marginTop: 7,
    borderRadius: 4,
    backgroundColor: renewxColors.border,
  },
  skeletonPrice: {
    width: '42%',
    height: 13,
    marginTop: 10,
    borderRadius: 5,
    backgroundColor: renewxColors.border,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: renewxSpacing.xl,
    paddingVertical: 45,
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: renewxColors.greenSoft,
  },
  emptyTitle: {
    marginTop: 12,
    fontFamily: renewxFontFamily.bold,
    fontSize: 17,
    color: renewxColors.text,
  },
  emptyText: {
    marginTop: 6,
    textAlign: 'center',
    fontFamily: renewxFontFamily.regular,
    fontSize: 12,
    lineHeight: 18,
    color: renewxColors.textSecondary,
  },
  emptyRetry: {
    marginTop: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: renewxRadius.pill,
    backgroundColor: renewxColors.yellow,
  },
  emptyRetryText: {
    fontFamily: renewxFontFamily.semibold,
    fontSize: 11,
    color: renewxColors.black,
  },
});
