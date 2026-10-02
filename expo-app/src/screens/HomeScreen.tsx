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
import ShimmerText from '@/components/ShimmerText';
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

const QUICK_CATEGORIES = [
  { id: 'All', label: 'All', icon: 'grid' as const },
  { id: 'Phones', label: 'Phones', icon: 'phone-portrait-outline' as const },
  { id: 'Laptops', label: 'Laptops', icon: 'laptop-outline' as const },
  { id: 'Tablets', label: 'Tablets', icon: 'tablet-portrait-outline' as const },
  { id: 'Watches', label: 'Watches', icon: 'watch-outline' as const },
  { id: 'Audio', label: 'Audio', icon: 'headset-outline' as const },
  { id: 'Accessories', label: 'Accessories', icon: 'bag-handle-outline' as const },
];

const TOP_CATEGORIES = [
  {
    id: 'Smartphones',
    title: 'Smartphones',
    subtitle: 'Best brands',
    image: require('@/assets/categories/smartphone.png'),
    filter: 'Phones',
  },
  {
    id: 'Laptops',
    title: 'Laptops',
    subtitle: 'High performance',
    image: require('@/assets/categories/laptop.png'),
    filter: 'Laptops',
  },
  {
    id: 'Tablets',
    title: 'Tablets',
    subtitle: 'iPad, Galaxy Tab',
    image: require('@/assets/categories/tablets.png'),
    filter: 'Tablets',
  },
  {
    id: 'Watches',
    title: 'Watches',
    subtitle: 'Apple, Samsung',
    image: require('@/assets/categories/smartwatch.png'),
    filter: 'Watches',
  },
  {
    id: 'Audio',
    title: 'Audio',
    subtitle: 'AirPods, Boat',
    image: require('@/assets/categories/accessories.png'),
    filter: 'Audio',
  },
  {
    id: 'Accessories',
    title: 'Accessories',
    subtitle: 'Chargers, Cases',
    image: require('@/assets/categories/accessories.png'),
    filter: 'Accessories',
  },
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

function getDiscountPercent(product: AnyProduct) {
  if (product.discount && Number(product.discount) > 0) {
    return `${Math.round(Number(product.discount))}% OFF`;
  }
  const price = getProductPrice(product);
  const orig = Number(product.original_price ?? product.originalPrice ?? 0);
  if (orig > price && price > 0) {
    return `${Math.round(((orig - price) / orig) * 100)}% OFF`;
  }
  return '28% OFF';
}

function getOriginalPrice(product: AnyProduct) {
  const orig = Number(product.original_price ?? product.originalPrice ?? 0);
  if (orig > 0) return orig;
  const price = getProductPrice(product);
  return price > 0 ? Math.round(price * 1.35) : 0;
}

function getProductCondition(product: AnyProduct) {
  return product.condition ?? product.grade ?? product.quality ?? product.device_condition ?? 'Excellent';
}

function getProductSpecLine(product: AnyProduct) {
  const p = product as any;
  const storage = p?.storage || p?.ram_storage || p?.specs?.storage || '128 GB';
  const condition = getProductCondition(product);
  return `${storage} • ${condition}`;
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
  const { isAdmin, signOut, user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [wishlist, setWishlist] = useState<Record<string, boolean>>({});
  const toast = useToast();
  const isFocused = useIsFocused();

  const toggleWishlist = useCallback((id: string, name: string) => {
    setWishlist((prev) => {
      const next = !prev[id];
      if (next) {
        toast?.success?.('Saved to wishlist', name);
      } else {
        toast?.info?.('Removed from wishlist', name);
      }
      return { ...prev, [id]: next };
    });
  }, [toast]);

  const handleCategoryPress = useCallback((categoryName: string) => {
    let target = categoryName;
    if (target === 'Phones') target = 'Smartphones';
    if (target === 'Smartwatches') target = 'Watches';

    // Keep home state in sync
    setSelectedCategory(categoryName);

    // Redirect to Categories (Shop) screen with this category filter active
    (navigation as any).navigate('Shop', {
      category: target,
      _t: Date.now(),
    });
  }, [navigation]);

  const [screenWidth, setScreenWidth] = useState(() => Dimensions.get('window').width);
  const responsive = useMemo(() => getResponsiveMetrics(screenWidth), [screenWidth]);

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [productList, setProductList] = useState<Product[]>([]);
  const listRef = useRef<FlatList>(null);

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

  const newArrivals = useMemo(() => {
    return [...(productList as AnyProduct[])]
      .sort((a, b) => {
        const dateA = new Date(a.created_at ?? a.createdAt ?? a.updated_at ?? a.updatedAt ?? 0).getTime();
        const dateB = new Date(b.created_at ?? b.createdAt ?? b.updated_at ?? b.updatedAt ?? 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 10);
  }, [productList]);

  const displayedProducts = useMemo(() => {
    if (selectedCategory === 'All') {
      return productList.length > 0 ? productList : newArrivals;
    }
    const cat = selectedCategory.toLowerCase();
    const filtered = (productList as AnyProduct[]).filter((p) => {
      const pCat = String(getCategory(p) || '').toLowerCase();
      const pName = String(getProductName(p) || '').toLowerCase();
      const pBrand = String(p.brand || '').toLowerCase();
      if (cat.includes('festive') || cat.includes('deals')) {
        return Boolean(
          p.featured ||
          p.is_featured ||
          p.isFeatured ||
          (p.discount && p.discount > 0) ||
          p.original_price ||
          p.originalPrice,
        );
      }
      if (cat.includes('smartphone') || cat.includes('phone')) {
        return (
          pCat.includes('phone') ||
          pCat.includes('mobile') ||
          pCat.includes('smartphone') ||
          pName.includes('iphone') ||
          pName.includes('samsung') ||
          pName.includes('pixel') ||
          pName.includes('oneplus')
        );
      }
      if (cat.includes('macbook') || cat.includes('laptop')) {
        return pCat.includes('laptop') || pCat.includes('macbook') || pName.includes('macbook') || pName.includes('laptop');
      }
      if (cat.includes('audio') || cat.includes('sound')) {
        return (
          pCat.includes('audio') ||
          pCat.includes('headphone') ||
          pCat.includes('airpods') ||
          pName.includes('airpods') ||
          pName.includes('headphone') ||
          pName.includes('sound')
        );
      }
      if (cat.includes('watch')) {
        return pCat.includes('watch') || pName.includes('watch');
      }
      if (cat.includes('tab') || cat.includes('ipad')) {
        return pCat.includes('tab') || pCat.includes('ipad') || pName.includes('ipad');
      }
      if (cat.includes('gaming')) {
        return pCat.includes('gaming') || pCat.includes('console') || pName.includes('ps5') || pName.includes('xbox');
      }
      if (cat.includes('accessories')) {
        return pCat.includes('access') || pCat.includes('charger') || pCat.includes('cable');
      }
      return pCat.includes(cat) || pName.includes(cat) || pBrand.includes(cat);
    });
    return filtered.length > 0 ? filtered : productList;
  }, [selectedCategory, productList, newArrivals]);

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

  const renderProduct = ({ item }: { item: Product }) => {
    const p = item as AnyProduct;
    const pid = String(p.id ?? p._uuid ?? p._id ?? '');
    const name = getProductName(p);
    const image = getProductImage(p);
    const price = getProductPrice(p);
    const origPrice = getOriginalPrice(p);
    const discount = getDiscountPercent(p);
    const specs = getProductSpecLine(p);
    const isWishlisted = Boolean(wishlist[pid]);

    return (
      <View style={styles.productWrapper}>
        <TouchableOpacity
          style={styles.trendingCard}
          onPress={() => openProduct(item)}
          activeOpacity={0.92}
        >
          {/* Card Top Row: Discount Pill + Wishlist Heart */}
          <View style={styles.dealTopRow}>
            <View style={styles.dealDiscountPill}>
              <Text style={styles.dealDiscountText}>{discount}</Text>
            </View>
            <TouchableOpacity
              onPress={() => toggleWishlist(pid, name)}
              style={styles.dealHeartBtn}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={isWishlisted ? 'heart' : 'heart-outline'}
                size={18}
                color={isWishlisted ? '#EF4444' : '#475569'}
              />
            </TouchableOpacity>
          </View>

          {/* Product Image */}
          <View style={styles.dealImageBox}>
            {image ? (
              <Image source={{ uri: image }} style={styles.dealImage} resizeMode="contain" />
            ) : (
              <Ionicons name="phone-portrait-outline" size={48} color="#94A3B8" />
            )}
          </View>

          {/* Product Title & Specs */}
          <Text style={styles.dealTitle} numberOfLines={1}>{name}</Text>
          <Text style={styles.dealSpecs} numberOfLines={1}>{specs}</Text>

          {/* Price Row + Yellow Cart Button */}
          <View style={styles.dealBottomRow}>
            <View style={styles.dealPriceBlock}>
              <Text style={styles.dealPrice}>₹{price.toLocaleString('en-IN')}</Text>
              {origPrice > price && (
                <Text style={styles.dealOrigPrice}>₹{origPrice.toLocaleString('en-IN')}</Text>
              )}
            </View>

            <TouchableOpacity
              style={styles.dealCartBtn}
              onPress={() => {
                addToCart(item);
                toast?.success?.('Added to cart!', name);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="cart" size={17} color="#000000" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <HomeHeader
        onSearch={() => navigation.navigate('Search')}
        cartCount={totalItems}
        onCart={() => navigation.navigate('Cart')}
        isAdmin={isAdmin}
        onAdmin={() => navigation.navigate('Admin', { screen: 'dashboard' })}
        onLogout={signOut}
        onAccount={() => (navigation as any).navigate('Account')}
        onSell={() => (navigation as any).navigate('Sell')}
        onWishlist={() => navigation.navigate('Wishlist')}
        onNotifications={() => navigation.navigate('Notifications')}
        userAddress="Bangalore - 560004"
      />

      <FlatList
        ref={listRef}
        data={loading ? [] : displayedProducts}
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
            {/* 1. TOP QUICK CATEGORY STRIP */}
            <View style={styles.quickCatSection}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.quickCatScroll}
              >
                {QUICK_CATEGORIES.map((cat) => {
                  const isSelected =
                    selectedCategory === cat.label ||
                    (cat.label === 'Phones' && selectedCategory === 'Smartphones');
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.quickCatCard,
                        isSelected && styles.quickCatCardActive,
                      ]}
                      onPress={() => handleCategoryPress(cat.label)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={cat.icon}
                        size={22}
                        color={isSelected ? '#000000' : '#1E293B'}
                      />
                      <Text
                        style={[
                          styles.quickCatText,
                          isSelected && styles.quickCatTextActive,
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

            {/* 2. HERO BANNER 1: CERTIFIED REFURBISHED */}
            <View style={styles.heroBanner1Card}>
              <View style={styles.heroBanner1Top}>
                {/* Left Text */}
                <View style={styles.heroBanner1Left}>
                  <View style={styles.heroRefurbBadge}>
                    <Text style={styles.heroRefurbBadgeText}>CERTIFIED REFURBISHED</Text>
                  </View>
                  <ShimmerText variant="gold" style={styles.heroBanner1Title}>
                    {'Premium devices.\nBetter value.'}
                  </ShimmerText>
                  <Text style={styles.heroBanner1Sub}>
                    {'Same performance. Lower price.\nGood for you. Better for the planet.'}
                  </Text>
                  <TouchableOpacity
                    style={styles.heroPillBtn}
                    onPress={() => handleCategoryPress('Laptops')}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.heroPillBtnText}>Shop Now</Text>
                    <Ionicons name="arrow-forward" size={15} color="#FFFFFF" style={{ marginLeft: 6 }} />
                  </TouchableOpacity>
                </View>

                {/* Right Device Visual */}
                <View style={styles.heroBanner1Right}>
                  <Image
                    source={require('@/assets/categories/mac.png')}
                    style={styles.heroCollageImg}
                    resizeMode="contain"
                  />
                  <View style={styles.dotsRow}>
                    <View style={[styles.pagerDot, styles.pagerDotActive]} />
                    <View style={styles.pagerDot} />
                    <View style={styles.pagerDot} />
                    <View style={styles.pagerDot} />
                  </View>
                </View>
              </View>

              {/* 4 Trust Guarantee items below */}
              <View style={styles.heroTrustGrid}>
                <View style={styles.heroTrustItem}>
                  <Ionicons name="shield-checkmark-outline" size={18} color="#0F172A" />
                  <View style={styles.heroTrustItemTextCol}>
                    <Text style={styles.heroTrustTitle}>Quality Checked</Text>
                    <Text style={styles.heroTrustSub}>by experts</Text>
                  </View>
                </View>

                <View style={styles.heroTrustItem}>
                  <Ionicons name="car-outline" size={18} color="#0F172A" />
                  <View style={styles.heroTrustItemTextCol}>
                    <Text style={styles.heroTrustTitle}>Free Delivery</Text>
                    <Text style={styles.heroTrustSub}>across India</Text>
                  </View>
                </View>

                <View style={styles.heroTrustItem}>
                  <Ionicons name="shield-outline" size={18} color="#0F172A" />
                  <View style={styles.heroTrustItemTextCol}>
                    <Text style={styles.heroTrustTitle}>6 Months Warranty</Text>
                    <Text style={styles.heroTrustSub}>on all devices</Text>
                  </View>
                </View>

                <View style={styles.heroTrustItem}>
                  <Ionicons name="leaf-outline" size={18} color="#0F172A" />
                  <View style={styles.heroTrustItemTextCol}>
                    <Text style={styles.heroTrustTitle}>Sustainable</Text>
                    <Text style={styles.heroTrustSub}>Choice</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* 3. HERO BANNER 2: TRADE-IN / SELL */}
            <View style={styles.heroBanner2Card}>
              <View style={styles.heroBanner2Content}>
                {/* Left Text */}
                <View style={styles.heroBanner2Left}>
                  <Text style={styles.tradeInEyebrow}>TRADE-IN  |  UPGRADE  |  SAVE</Text>
                  <ShimmerText variant="green" style={styles.heroBanner2Title}>
                    Turn your old device into instant value.
                  </ShimmerText>
                  <Text style={styles.heroBanner2Sub}>
                    Sell your phone, laptop, tablet & more
                  </Text>
                  <TouchableOpacity
                    style={styles.heroPillBtn}
                    onPress={() => navigation.navigate('Sell' as never)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.heroPillBtnText}>Sell Now</Text>
                    <Ionicons name="arrow-forward" size={15} color="#FFFFFF" style={{ marginLeft: 6 }} />
                  </TouchableOpacity>
                </View>

                {/* Center Phone Visual */}
                <View style={styles.heroBanner2Center}>
                  <Image
                    source={require('@/assets/categories/smartphone.png')}
                    style={styles.heroTradeInImg}
                    resizeMode="contain"
                  />
                  <View style={styles.dotsRow}>
                    <View style={[styles.pagerDot, styles.pagerDotActive]} />
                    <View style={styles.pagerDot} />
                    <View style={styles.pagerDot} />
                    <View style={styles.pagerDot} />
                  </View>
                </View>

                {/* Right 3 Value Props */}
                <View style={styles.heroBanner2Values}>
                  <View style={styles.tradeInValueRow}>
                    <View style={styles.tradeInValueIcon}>
                      <Text style={styles.tradeInValueIconSymbol}>₹</Text>
                    </View>
                    <View>
                      <Text style={styles.tradeInValTitle}>Best</Text>
                      <Text style={styles.tradeInValSub}>market price</Text>
                    </View>
                  </View>

                  <View style={styles.tradeInValueRow}>
                    <View style={styles.tradeInValueIcon}>
                      <Ionicons name="car-outline" size={14} color="#92400E" />
                    </View>
                    <View>
                      <Text style={styles.tradeInValTitle}>Free pickup</Text>
                      <Text style={styles.tradeInValSub}>at your doorstep</Text>
                    </View>
                  </View>

                  <View style={styles.tradeInValueRow}>
                    <View style={styles.tradeInValueIcon}>
                      <Ionicons name="shield-checkmark-outline" size={14} color="#92400E" />
                    </View>
                    <View>
                      <Text style={styles.tradeInValTitle}>Safe & secure</Text>
                      <Text style={styles.tradeInValSub}>process</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* 4. TOP CATEGORIES SECTION */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionMainTitle}>Top Categories</Text>
              <TouchableOpacity
                style={styles.viewAllRow}
                onPress={() => navigation.navigate('Shop' as never)}
                activeOpacity={0.7}
              >
                <Text style={styles.viewAllText}>View All</Text>
                <Ionicons name="arrow-forward" size={14} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.topCategoriesScroll}
            >
              {TOP_CATEGORIES.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.topCategoryCard}
                  onPress={() => handleCategoryPress(item.id || item.filter)}
                  activeOpacity={0.85}
                >
                  <View style={styles.topCategoryCardImgBox}>
                    <Image source={item.image} style={styles.topCategoryCardImg} resizeMode="contain" />
                  </View>
                  <Text style={styles.topCategoryCardTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.topCategoryCardSub} numberOfLines={1}>{item.subtitle}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* 5. TRENDING DEALS SECTION */}
            <View style={[styles.sectionHeaderRow, { marginTop: 18 }]}>
              <View style={styles.trendingTitleRow}>
                <Text style={styles.fireEmoji}>🔥</Text>
                <Text style={styles.sectionMainTitle}>Trending Deals</Text>
              </View>
              <TouchableOpacity
                style={styles.viewAllRow}
                onPress={() => navigation.navigate('Shop' as never)}
                activeOpacity={0.7}
              >
                <Text style={styles.viewAllText}>View All</Text>
                <Ionicons name="arrow-forward" size={14} color="#0F172A" />
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

  /* 1. TOP QUICK CATEGORY STRIP */
  quickCatSection: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  quickCatScroll: {
    paddingHorizontal: renewxSpacing.md,
    gap: 10,
    alignItems: 'center',
  },
  quickCatCard: {
    width: 62,
    height: 64,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    ...Platform.select({
      web: { boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' },
      default: { elevation: 1 },
    }),
  },
  quickCatCardActive: {
    backgroundColor: '#FDE047',
    borderColor: '#FDE047',
  },
  quickCatText: {
    fontSize: 10.5,
    fontFamily: renewxFontFamily.semibold,
    color: '#475569',
    fontWeight: '600',
  },
  quickCatTextActive: {
    color: '#000000',
    fontWeight: '800',
  },

  /* 2. HERO BANNER 1: CERTIFIED REFURBISHED */
  heroBanner1Card: {
    marginHorizontal: renewxSpacing.md,
    marginTop: 14,
    marginBottom: 12,
    backgroundColor: '#FFFDF0',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#FEF08A',
    padding: 14,
    ...Platform.select({
      web: { boxShadow: '0 4px 16px rgba(234, 179, 8, 0.08)' },
      default: { elevation: 2 },
    }),
  },
  heroBanner1Top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  heroBanner1Left: {
    flex: 1.15,
  },
  heroRefurbBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FDE047',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 7,
  },
  heroRefurbBadgeText: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 8.5,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: 0.4,
  },
  heroBanner1Title: {
    fontFamily: renewxFontFamily.extraBold,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  heroBanner1Sub: {
    marginTop: 5,
    fontFamily: renewxFontFamily.regular,
    fontSize: 9.5,
    lineHeight: 13.5,
    color: '#64748B',
  },
  heroPillBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  heroPillBtnText: {
    color: '#FFFFFF',
    fontFamily: renewxFontFamily.bold,
    fontSize: 11,
    fontWeight: '700',
  },
  heroBanner1Right: {
    flex: 0.95,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCollageImg: {
    width: '100%',
    height: 110,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  pagerDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#CBD5E1',
  },
  pagerDotActive: {
    backgroundColor: '#334155',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  heroTrustGrid: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#FEF08A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  heroTrustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '48%',
    marginBottom: 4,
  },
  heroTrustItemTextCol: {
    flex: 1,
  },
  heroTrustTitle: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 9.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  heroTrustSub: {
    fontFamily: renewxFontFamily.regular,
    fontSize: 8,
    color: '#64748B',
  },

  /* 3. HERO BANNER 2: TRADE-IN / SELL */
  heroBanner2Card: {
    marginHorizontal: renewxSpacing.md,
    marginBottom: 16,
    backgroundColor: '#ECFDF5',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: 14,
    ...Platform.select({
      web: { boxShadow: '0 4px 16px rgba(16, 185, 129, 0.08)' },
      default: { elevation: 2 },
    }),
  },
  heroBanner2Content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  heroBanner2Left: {
    flex: 1.1,
  },
  tradeInEyebrow: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: '#059669',
    marginBottom: 4,
  },
  heroBanner2Title: {
    fontFamily: renewxFontFamily.extraBold,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  heroBanner2Sub: {
    marginTop: 4,
    fontFamily: renewxFontFamily.regular,
    fontSize: 9.5,
    color: '#64748B',
  },
  heroBanner2Center: {
    flex: 0.75,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTradeInImg: {
    width: 65,
    height: 95,
  },
  heroBanner2Values: {
    flex: 0.95,
    gap: 7,
  },
  tradeInValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tradeInValueIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tradeInValueIconSymbol: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
  },
  tradeInValTitle: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 9,
    fontWeight: '700',
    color: '#0F172A',
  },
  tradeInValSub: {
    fontFamily: renewxFontFamily.regular,
    fontSize: 7.5,
    color: '#64748B',
  },

  /* 4. SECTION HEADERS & TOP CATEGORIES */
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: renewxSpacing.md,
    marginTop: 8,
    marginBottom: 10,
  },
  sectionMainTitle: {
    fontFamily: renewxFontFamily.extraBold,
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  viewAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  trendingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fireEmoji: {
    fontSize: 18,
  },
  topCategoriesScroll: {
    paddingHorizontal: renewxSpacing.md,
    gap: 10,
    paddingBottom: 6,
  },
  topCategoryCard: {
    width: 95,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 8,
    alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)' },
      default: { elevation: 1 },
    }),
  },
  topCategoryCardImgBox: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  topCategoryCardImg: {
    width: '100%',
    height: '100%',
  },
  topCategoryCardTitle: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  topCategoryCardSub: {
    fontFamily: renewxFontFamily.regular,
    fontSize: 8.5,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 1,
  },

  /* 5. TRENDING CARD (2-COLUMN GRID ITEM) */
  trendingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    marginBottom: 10,
    position: 'relative',
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)' },
      default: { elevation: 2 },
    }),
  },
  dealTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  dealDiscountPill: {
    backgroundColor: '#FDE047',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dealDiscountText: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 8.5,
    fontWeight: '800',
    color: '#000000',
  },
  dealHeartBtn: {
    padding: 2,
  },
  dealImageBox: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  dealImage: {
    width: '100%',
    height: '100%',
  },
  dealTitle: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 4,
  },
  dealSpecs: {
    fontFamily: renewxFontFamily.regular,
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  dealBottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  dealPriceBlock: {
    flex: 1,
  },
  dealPrice: {
    fontFamily: renewxFontFamily.extraBold,
    fontSize: 14.5,
    fontWeight: '900',
    color: '#0F172A',
  },
  dealOrigPrice: {
    fontFamily: renewxFontFamily.regular,
    fontSize: 10,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
    marginTop: 1,
  },
  dealCartBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFC400',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* 6. FILTER CONTROLS */
  clearFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#DCFCE7',
  },
  clearFilterText: {
    fontFamily: renewxFontFamily.semibold,
    fontSize: 10,
    color: '#0C7A43',
  },
});
