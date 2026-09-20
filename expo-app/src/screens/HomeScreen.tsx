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
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RootStackParamList } from '@/App';
import type { Product } from '@/types';
import { useCart } from '@/context/CartContext';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme';
import HomeHeader from '@/components/HomeHeader';
import ProductCard from '@/components/ProductCard';
import { mapProductRow } from '@/lib/productMapper';
import { Ionicons } from '@expo/vector-icons';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type AnyProduct = Product & Record<string, any>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PRODUCTS_CACHE_KEY = '@renewx_products_cache';

function ProductSkeleton() {
  return (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonImage} />
      <View style={styles.skeletonLineLarge} />
      <View style={styles.skeletonLineSmall} />
      <View style={styles.skeletonLinePrice} />
    </View>
  );
}

function getProductName(product: AnyProduct) {
  return (
    product.name ??
    product.title ??
    product.product_name ??
    product.productName ??
    'Certified Device'
  );
}

function getCategory(product: AnyProduct) {
  return (
    product.category ??
    product.category_name ??
    product.categoryName ??
    product.type ??
    ''
  );
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
  return (
    product.condition ??
    product.grade ??
    product.quality ??
    product.device_condition ??
    'Certified'
  );
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
  if (!value) return 'Price on request';

  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

function getHeroProductScore(product: AnyProduct) {
  const stock = Number(
    product.stock_quantity ?? product.stockQuantity ?? product.stock ?? 1,
  );

  const featured = Boolean(
    product.featured ??
      product.is_featured ??
      product.isFeatured ??
      product.highlighted,
  );

  const hasImage = Boolean(getProductImage(product));
  const price = getProductPrice(product);

  return (featured ? 1000 : 0) + (hasImage ? 100 : 0) + (stock > 0 ? 20 : 0) + (price > 0 ? 10 : 0);
}

function HeroProductCard({
  product,
  index,
  total,
  onPress,
}: {
  product: AnyProduct;
  index: number;
  total: number;
  onPress: () => void;
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
      style={styles.heroOuter}
    >
      <View style={styles.heroCard}>
        <View style={styles.heroGlow} />

        <View style={styles.heroDeviceBadge}>
          <Ionicons name="phone-portrait-outline" size={19} color={colors.text} />
        </View>

        <View style={styles.heroCounter}>
          <Ionicons name="chevron-back" size={16} color={colors.textMuted} />
          <Text style={styles.heroCounterText}>
            {index + 1} / {total}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </View>

        <View style={styles.heroImageFrame}>
          {image ? (
            <Image
              source={{ uri: image }}
              style={styles.heroImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.heroImageFallback}>
              <Ionicons name="phone-portrait-outline" size={58} color={colors.textMuted} />
            </View>
          )}
        </View>

        <View style={styles.heroInfo}>
          <View style={styles.heroMetaRow}>
            <Text style={styles.heroCertified}>CERTIFIED DEVICE</Text>
            <View style={styles.heroMetaDot} />
            <Text style={styles.heroGrade}>{String(condition)}</Text>
          </View>

          <View style={styles.heroNamePriceRow}>
            <View style={styles.heroNameBlock}>
              <Text style={styles.heroProductName} numberOfLines={1}>
                {name}
              </Text>
              <Text style={styles.heroCategory} numberOfLines={1}>
                {String(category || 'Devices').toLowerCase()}
              </Text>
            </View>

            <View style={styles.heroPriceBlock}>
              <Text style={styles.heroFrom}>FROM</Text>
              <Text style={styles.heroPrice} numberOfLines={1}>
                {formatPrice(price)}
              </Text>
            </View>
          </View>

          <View style={styles.heroDivider} />

          <View style={styles.heroConditionRow}>
            <View style={styles.conditionIcon}>
              <Ionicons name="shield-checkmark-outline" size={18} color={colors.success} />
            </View>
            <Text style={styles.conditionText}>{String(condition)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.heroAvailabilityRow}>
        <View style={styles.heroDots}>
          {Array.from({ length: Math.min(total, 7) }).map((_, dotIndex) => (
            <View
              key={dotIndex}
              style={[
                styles.heroDot,
                dotIndex === index % 7 && styles.heroDotActive,
              ]}
            />
          ))}
        </View>
        <View
          style={[
            styles.availableDot,
            availability === 'Out of stock' && styles.unavailableDot,
          ]}
        />
        <Text style={styles.availabilityText}>{availability}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { addToCart, totalItems } = useCart();
  const { isAdmin, signOut } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [productList, setProductList] = useState<Product[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [usingCache, setUsingCache] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);

  const heroScrollRef = useRef<ScrollView>(null);

  const readCache = useCallback(async () => {
    try {
      const cached = await AsyncStorage.getItem(PRODUCTS_CACHE_KEY);
      if (!cached) return false;

      const rows = JSON.parse(cached);
      if (!Array.isArray(rows)) return false;

      const mapped = rows.map(mapProductRow);
      if (mapped.length) {
        setProductList(mapped);
        setUsingCache(true);
        return true;
      }
    } catch (error) {
      console.warn('[Home] Product cache read failed:', error);
    }

    return false;
  }, []);

  const fetchLiveProducts = useCallback(async () => {
    try {
      setLoadError(null);

      const data = await api.products.getAll({ limit: 100 });
      const rows = Array.isArray(data) ? data : [];
      const mapped = rows.map(mapProductRow);

      setProductList(mapped);
      setUsingCache(false);
      setHeroIndex(0);

      await AsyncStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(rows));
    } catch (err: any) {
      const cached = await readCache();

      setLoadError(
        err?.message || 'Unable to load products. Check your connection.',
      );

      if (!cached) {
        setProductList([]);
      }
    } finally {
      setLoading(false);
    }
  }, [readCache]);

  useEffect(() => {
    fetchLiveProducts();
  }, [fetchLiveProducts]);

  const heroProducts = useMemo(() => {
    const products = productList as AnyProduct[];

    return [...products]
      .filter((product) => getProductImage(product))
      .sort((a, b) => getHeroProductScore(b) - getHeroProductScore(a))
      .slice(0, 7);
  }, [productList]);

  const newArrivals = useMemo(() => {
    const products = productList as AnyProduct[];

    return [...products]
      .sort((a, b) => {
        const dateA = new Date(
          a.created_at ?? a.createdAt ?? a.updated_at ?? a.updatedAt ?? 0,
        ).getTime();

        const dateB = new Date(
          b.created_at ?? b.createdAt ?? b.updated_at ?? b.updatedAt ?? 0,
        ).getTime();

        return dateB - dateA;
      })
      .slice(0, 10);
  }, [productList]);

  const handleHeroScroll = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const nextIndex = Math.round(
      event.nativeEvent.contentOffset.x / SCREEN_WIDTH,
    );

    if (nextIndex !== heroIndex) {
      setHeroIndex(Math.max(0, Math.min(nextIndex, heroProducts.length - 1)));
    }
  };

  const goToHero = (index: number) => {
    if (!heroProducts.length) return;

    const nextIndex =
      index < 0
        ? heroProducts.length - 1
        : index >= heroProducts.length
          ? 0
          : index;

    heroScrollRef.current?.scrollTo({
      x: nextIndex * SCREEN_WIDTH,
      animated: true,
    });
    setHeroIndex(nextIndex);
  };

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

  const renderProduct = ({ item }: { item: Product }) => (
    <View style={styles.productWrapper}>
      <ProductCard
        product={item}
        onPress={() => openProduct(item)}
        onAddToCart={() => {
          addToCart(item);
          navigation.navigate('Cart');
        }}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <HomeHeader
        onSearch={() => navigation.navigate('Search')}
        cartCount={totalItems}
        onCart={() => navigation.navigate('Cart')}
        isAdmin={isAdmin}
        onAdmin={() => navigation.navigate('Admin', { screen: 'dashboard' })}
        onLogout={signOut}
      />

      <FlatList
        data={loading ? [] : newArrivals}
        keyExtractor={(item, index) =>
          String((item as AnyProduct)._uuid ?? (item as AnyProduct).id ?? index)
        }
        numColumns={2}
        columnWrapperStyle={styles.productRow}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
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
                  onMomentumScrollEnd={handleHeroScroll}
                  scrollEventThrottle={16}
                >
                  {heroProducts.map((product, index) => (
                    <HeroProductCard
                      key={String(
                        (product as AnyProduct)._uuid ??
                          (product as AnyProduct).id ??
                          index,
                      )}
                      product={product as AnyProduct}
                      index={index}
                      total={heroProducts.length}
                      onPress={() => openProduct(product)}
                    />
                  ))}
                </ScrollView>

                <TouchableOpacity
                  accessibilityLabel="Previous featured product"
                  style={[styles.heroExternalArrow, styles.heroExternalLeft]}
                  onPress={() => goToHero(heroIndex - 1)}
                >
                  <Ionicons name="chevron-back" size={25} color={colors.text} />
                </TouchableOpacity>

                <TouchableOpacity
                  accessibilityLabel="Next featured product"
                  style={[styles.heroExternalArrow, styles.heroExternalRight]}
                  onPress={() => goToHero(heroIndex + 1)}
                >
                  <Ionicons name="chevron-forward" size={25} color={colors.text} />
                </TouchableOpacity>
              </View>
            ) : loading ? (
              <View style={styles.heroSkeleton}>
                <View style={styles.heroSkeletonCircle} />
                <View style={styles.heroSkeletonImage} />
                <View style={styles.heroSkeletonInfo}>
                  <View style={styles.skeletonLineSmall} />
                  <View style={styles.skeletonLineLarge} />
                  <View style={styles.skeletonLineMedium} />
                </View>
              </View>
            ) : (
              <View style={styles.heroEmpty}>
                <View style={styles.heroEmptyIcon}>
                  <Ionicons name="phone-portrait-outline" size={32} color={colors.textMuted} />
                </View>
                <Text style={styles.heroEmptyTitle}>Featured devices will appear here</Text>
                <Text style={styles.heroEmptyText}>
                  Published products with images are shown in this section.
                </Text>
              </View>
            )}

            {loadError && (
              <View style={styles.connectionNotice}>
                <Ionicons
                  name={usingCache ? 'cloud-offline-outline' : 'warning-outline'}
                  size={18}
                  color="#92400e"
                />
                <View style={styles.connectionCopy}>
                  <Text style={styles.connectionTitle}>
                    {usingCache ? 'Showing saved products' : 'Could not load products'}
                  </Text>
                  <Text style={styles.connectionText}>
                    {usingCache
                      ? 'The latest inventory will appear when the connection returns.'
                      : loadError}
                  </Text>
                </View>

                <TouchableOpacity onPress={onRefresh} style={styles.retryButton}>
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.arrivalsHeader}>
              <Text style={styles.arrivalsTitle}>New Device Arrivals</Text>
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => navigation.navigate('Shop' as never)}
                activeOpacity={0.7}
              >
                <Text style={styles.viewAllText}>View all devices</Text>
                <Ionicons name="arrow-forward" size={15} color={colors.text} />
              </TouchableOpacity>
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
                <Ionicons
                  name={loadError ? 'cloud-offline-outline' : 'cube-outline'}
                  size={30}
                  color={colors.textMuted}
                />
              </View>

              <Text style={styles.emptyTitle}>
                {loadError ? 'Inventory unavailable' : 'No products available'}
              </Text>

              <Text style={styles.emptyText}>
                {loadError
                  ? 'We could not reach the product service. Please try again.'
                  : 'New certified devices will appear here when they are published.'}
              </Text>

              {loadError && (
                <TouchableOpacity
                  style={styles.emptyRetry}
                  onPress={onRefresh}
                >
                  <Ionicons name="refresh" size={16} color="#ffffff" />
                  <Text style={styles.emptyRetryText}>Try Again</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null
        }
        renderItem={renderProduct}
      />

      <FloatingContactButtons />
    </SafeAreaView>
  );
}

function FloatingContactButtons() {
  const whatsappNumber = process.env.EXPO_PUBLIC_WHATSAPP_NUMBER;
  const supportPhone = process.env.EXPO_PUBLIC_SUPPORT_PHONE;
  const instagramUrl = process.env.EXPO_PUBLIC_INSTAGRAM_URL;

  const openWhatsApp = async () => {
    if (!whatsappNumber) return;
    const url = `https://wa.me/${whatsappNumber.replace(/\D/g, '')}`;
    await Linking.openURL(url);
  };

  const openPhone = async () => {
    if (!supportPhone) return;
    await Linking.openURL(`tel:${supportPhone}`);
  };

  const openInstagram = async () => {
    if (!instagramUrl) return;
    await Linking.openURL(instagramUrl);
  };

  const actions = [
    whatsappNumber
      ? {
          key: 'whatsapp',
          icon: 'logo-whatsapp' as const,
          onPress: openWhatsApp,
          style: styles.whatsappButton,
        }
      : null,
    supportPhone
      ? {
          key: 'phone',
          icon: 'call-outline' as const,
          onPress: openPhone,
          style: styles.phoneButton,
        }
      : null,
    instagramUrl
      ? {
          key: 'instagram',
          icon: 'logo-instagram' as const,
          onPress: openInstagram,
          style: styles.instagramButton,
        }
      : null,
  ].filter(Boolean) as {
    key: string;
    icon: any;
    onPress: () => void;
    style: any;
  }[];

  if (!actions.length) return null;

  return (
    <View pointerEvents="box-none" style={styles.floatingContacts}>
      {actions.map((action) => (
        <TouchableOpacity
          key={action.key}
          style={[styles.floatingButton, action.style]}
          onPress={action.onPress}
          activeOpacity={0.82}
        >
          <Ionicons name={action.icon} size={27} color="#ffffff" />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  listContent: {
    paddingBottom: spacing.xl,
  },

  heroSection: {
    position: 'relative',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },

  heroOuter: {
    width: SCREEN_WIDTH,
    paddingHorizontal: 48,
  },

  heroCard: {
    minHeight: 520,
    borderRadius: 38,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eef0f2',
    position: 'relative',
    paddingTop: 54,
  },

  heroGlow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#fff6bd',
    top: 78,
    left: '50%',
    marginLeft: -150,
    opacity: 0.88,
  },

  heroDeviceBadge: {
    position: 'absolute',
    top: 12,
    left: '50%',
    marginLeft: -26,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#111111',
    borderWidth: 5,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },

  heroCounter: {
    position: 'absolute',
    top: 76,
    left: '50%',
    marginLeft: -71,
    width: 142,
    height: 48,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.94)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    zIndex: 4,
  },

  heroCounterText: {
    fontSize: 14,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
  },

  heroImageFrame: {
    height: 275,
    marginHorizontal: 48,
    marginTop: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },

  heroImage: {
    width: '100%',
    height: '100%',
  },

  heroImageFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroInfo: {
    marginTop: 8,
    marginHorizontal: 10,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 18,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.97)',
    zIndex: 3,
    shadowColor: '#000000',
    shadowOpacity: 0.07,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 7 },
    elevation: 3,
  },

  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  heroCertified: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    color: '#0a9b70',
  },

  heroMetaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    marginHorizontal: 8,
  },

  heroGrade: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: '#94a3b8',
  },

  heroNamePriceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 10,
  },

  heroNameBlock: {
    flex: 1,
    paddingRight: 12,
  },

  heroProductName: {
    fontSize: 20,
    fontWeight: fontWeight.bold,
    color: '#111111',
  },

  heroCategory: {
    marginTop: 7,
    fontSize: 12,
    color: '#64748b',
  },

  heroPriceBlock: {
    alignItems: 'flex-end',
  },

  heroFrom: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: '#94a3b8',
    marginBottom: 2,
  },

  heroPrice: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111111',
  },

  heroDivider: {
    height: 1,
    backgroundColor: '#edf0f2',
    marginVertical: 14,
  },

  heroConditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  conditionIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },

  conditionText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: fontWeight.medium,
  },

  heroAvailabilityRow: {
    minHeight: 25,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 3,
  },

  heroDots: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 7,
  },

  heroDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#cbd5e1',
    marginHorizontal: 3,
  },

  heroDotActive: {
    width: 30,
    backgroundColor: '#111111',
  },

  availableDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#08b66b',
    marginRight: 5,
  },

  unavailableDot: {
    backgroundColor: '#ef4444',
  },

  availabilityText: {
    fontSize: 10,
    color: colors.textMuted,
  },

  heroExternalArrow: {
    position: 'absolute',
    top: 220,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },

  heroExternalLeft: {
    left: 48,
  },

  heroExternalRight: {
    right: 48,
  },

  heroSkeleton: {
    height: 520,
    marginHorizontal: 22,
    borderRadius: 38,
    backgroundColor: '#f4f5f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
    paddingTop: 72,
  },

  heroSkeletonCircle: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    top: 12,
    left: '50%',
    marginLeft: -26,
    backgroundColor: '#e5e7eb',
  },

  heroSkeletonImage: {
    height: 275,
    marginHorizontal: 72,
    borderRadius: 18,
    backgroundColor: '#e5e7eb',
  },

  heroSkeletonInfo: {
    marginTop: 20,
    marginHorizontal: 30,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    padding: 24,
  },

  heroEmpty: {
    marginHorizontal: 22,
    minHeight: 260,
    borderRadius: 34,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 34,
    borderWidth: 1,
    borderColor: '#edf0f2',
  },

  heroEmptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },

  heroEmptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
  },

  heroEmptyText: {
    marginTop: 7,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },

  arrivalsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },

  arrivalsTitle: {
    flex: 1,
    fontSize: 23,
    fontWeight: '900',
    color: '#111111',
  },

  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },

  viewAllText: {
    fontSize: 12,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginRight: 5,
  },

  productRow: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },

  productWrapper: {
    flex: 1,
    maxWidth: '50%',
  },

  connectionNotice: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  connectionCopy: {
    flex: 1,
  },

  connectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#78350f',
  },

  connectionText: {
    fontSize: 10,
    color: '#92400e',
    marginTop: 2,
  },

  retryButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },

  retryText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400e',
  },

  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },

  skeletonCard: {
    width: '48%',
    padding: 10,
    marginBottom: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },

  skeletonImage: {
    height: 145,
    borderRadius: radius.sm,
    backgroundColor: '#e5e7eb',
    marginBottom: 10,
  },

  skeletonLineLarge: {
    height: 12,
    width: '82%',
    borderRadius: 6,
    backgroundColor: '#e5e7eb',
    marginBottom: 7,
  },

  skeletonLineMedium: {
    height: 10,
    width: '64%',
    borderRadius: 6,
    backgroundColor: '#e5e7eb',
    marginBottom: 9,
  },

  skeletonLineSmall: {
    height: 9,
    width: '55%',
    borderRadius: 6,
    backgroundColor: '#e5e7eb',
    marginBottom: 10,
  },

  skeletonLinePrice: {
    height: 14,
    width: '45%',
    borderRadius: 6,
    backgroundColor: '#d1d5db',
  },

  emptyState: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: 55,
  },

  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },

  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: 6,
  },

  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },

  emptyRetry: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#111827',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: radius.md,
  },

  emptyRetryText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 12,
  },

  floatingContacts: {
    position: 'absolute',
    right: 18,
    bottom: 90,
    alignItems: 'center',
    gap: 13,
  },

  floatingButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 7,
  },

  whatsappButton: {
    backgroundColor: '#1fc76b',
  },

  phoneButton: {
    backgroundColor: '#090909',
  },

  instagramButton: {
    backgroundColor: '#d12d83',
  },
});
