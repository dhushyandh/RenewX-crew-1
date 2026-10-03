import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import type { RootStackParamList } from '@/App';
import type { Product } from '@/types';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import { mapProductRow } from '@/lib/productMapper';
import HomeHeader from '@/components/HomeHeader';
import { renewxFontFamily } from '@/design-system';
import { ProductRowSkeleton } from '@/components/ui';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type AnyProduct = Product & Record<string, any>;

const PRODUCTS_CACHE_KEY = '@renewx_products_cache_home';

const QUICK_CATEGORIES = [
  {
    id: 'Smartphones',
    label: 'Smartphones',
    image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&auto=format&fit=crop&q=80',
  },
  {
    id: 'Laptops',
    label: 'Laptops',
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&auto=format&fit=crop&q=80',
  },
  {
    id: 'Tablets',
    label: 'Tablets',
    image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&auto=format&fit=crop&q=80',
  },
  {
    id: 'Smartwatches',
    label: 'Smartwatches',
    image: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=400&auto=format&fit=crop&q=80',
  },
  {
    id: 'Earbuds',
    label: 'Earbuds',
    image: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=400&auto=format&fit=crop&q=80',
  },
  {
    id: 'Accessories',
    label: 'Accessories',
    image: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=400&auto=format&fit=crop&q=80',
  },
];

const SHOP_BY_CATEGORIES = [
  {
    id: 'Smartphones',
    label: 'Smartphones',
    image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&auto=format&fit=crop&q=80',
    bg: '#FEFCE8',
    borderColor: '#FDE047',
  },
  {
    id: 'Laptops',
    label: 'Laptops',
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&auto=format&fit=crop&q=80',
    bg: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  {
    id: 'Tablets',
    label: 'Tablets',
    image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&auto=format&fit=crop&q=80',
    bg: '#FAF5FF',
    borderColor: '#E9D5FF',
  },
  {
    id: 'Smartwatches',
    label: 'Smartwatches',
    image: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=400&auto=format&fit=crop&q=80',
    bg: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  {
    id: 'Earbuds',
    label: 'Earbuds',
    image: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=400&auto=format&fit=crop&q=80',
    bg: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  {
    id: 'Accessories',
    label: 'Accessories',
    image: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=400&auto=format&fit=crop&q=80',
    bg: '#FFF1F2',
    borderColor: '#FECDD3',
  },
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
  if (cat.includes('phone')) return require('@/assets/categories/smartphone.png');
  if (cat.includes('laptop') || cat.includes('mac')) return require('@/assets/categories/laptop.png');
  if (cat.includes('tab') || cat.includes('pad')) return require('@/assets/categories/tablets.png');
  if (cat.includes('watch')) return require('@/assets/categories/smartwatch.png');
  if (cat.includes('ear') || cat.includes('audio')) return require('@/assets/categories/earbuds.png');
  return require('@/assets/categories/accessories.png');
}

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { addToCart, totalItems } = useCart();
  const { isInWishlist, toggleWishlist, totalWishlistItems } = useWishlist();
  const { isAdmin, signOut } = useAuth();
  const toast = useToast();

  const [selectedQuickCategory, setSelectedQuickCategory] = useState('Smartphones');
  const [productList, setProductList] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' as any });
      }
    }, []),
  );

  const saveProductsCache = useCallback(async (rows: any[]) => {
    try {
      const lightweight = rows.slice(0, 30).map((row: any) => ({
        id: row.id || row._uuid || row._id,
        name: row.name,
        price: row.price,
        originalPrice: row.originalPrice,
        brand: row.brand,
        category: row.category,
        storage: row.storage,
        color: row.color,
        image: typeof row.image === 'string' && row.image.length < 5000 ? row.image : '',
      }));
      await AsyncStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(lightweight));
    } catch {
      // ignore
    }
  }, []);

  const readCache = useCallback(async () => {
    try {
      const cached = await AsyncStorage.getItem(PRODUCTS_CACHE_KEY);
      if (!cached) return false;
      const rows = JSON.parse(cached);
      if (Array.isArray(rows) && rows.length > 0) {
        setProductList(rows.map(mapProductRow));
        return true;
      }
    } catch {
      // ignore
    }
    return false;
  }, []);

  const fetchLiveProducts = useCallback(async () => {
    try {
      const data = await api.products.getAll({ limit: 100 });
      const rows = Array.isArray(data) ? data : [];
      const mapped = rows.map(mapProductRow);
      if (mapped.length > 0) {
        setProductList(mapped);
        saveProductsCache(mapped);
      }
    } catch (error) {
      console.warn('[HomeScreen] Failed to fetch live products:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [saveProductsCache]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const hasCache = await readCache();
      if (!hasCache && isMounted) {
        setLoading(true);
      }
      await fetchLiveProducts();
    })();
    return () => {
      isMounted = false;
    };
  }, [readCache, fetchLiveProducts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchLiveProducts();
  }, [fetchLiveProducts]);

  const handleCategoryPress = useCallback((categoryName: string) => {
    setSelectedQuickCategory(categoryName);
    (navigation as any).navigate('Shop', {
      category: categoryName,
      _t: Date.now(),
    });
  }, [navigation]);

  const openProduct = useCallback((product: Product) => {
    navigation.navigate('ProductDetail', {
      id: String((product as AnyProduct).id ?? (product as AnyProduct)._uuid),
    });
  }, [navigation]);

  // Featured devices to display in the horizontal row
  const featuredDevices = useMemo(() => {
    if (productList.length === 0) return [];
    // Prioritize popular reference models if present
    const preferredOrder = ['iphone 14 pro', 'macbook air', 'samsung galaxy s23', 'apple watch'];
    const sorted = [...productList].sort((a, b) => {
      const nameA = getProductName(a).toLowerCase();
      const nameB = getProductName(b).toLowerCase();
      const indexA = preferredOrder.findIndex((k) => nameA.includes(k));
      const indexB = preferredOrder.findIndex((k) => nameB.includes(k));
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return 0;
    });
    return sorted.slice(0, 10);
  }, [productList]);

  return (
    <View style={styles.container}>
      {/* 1. Exact Header & Search */}
      <HomeHeader
        onSearch={() => navigation.navigate('Search')}
        cartCount={totalItems}
        onCart={() => navigation.navigate('Cart')}
        wishlistCount={totalWishlistItems}
        isAdmin={isAdmin}
        onAdmin={() => navigation.navigate('Admin', { screen: 'dashboard' })}
        onLogout={signOut}
        onAccount={() => (navigation as any).navigate('Account')}
        onSell={() => (navigation as any).navigate('Sell')}
        onWishlist={() => navigation.navigate('Wishlist')}
        onNotifications={() => navigation.navigate('Notifications')}
        userAddress="Chennai"
      />

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
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
      >
        {/* 2. HERO BANNER: Premium Devices for a Smarter You */}
        <View style={styles.heroBannerCard}>
          <View style={styles.heroContentRow}>
            {/* Left Column: Text & CTA */}
            <View style={styles.heroLeftCol}>
              <Text style={styles.heroTitle}>
                {'Premium\nDevices for\na Smarter You'}
              </Text>
              <Text style={styles.heroSubtitle}>
                {'Top brands. Great prices.\nBetter choices.'}
              </Text>
              <TouchableOpacity
                style={styles.heroShopNowBtn}
                onPress={() => (navigation as any).navigate('Shop')}
                activeOpacity={0.85}
              >
                <Text style={styles.heroShopNowText}>Shop Now</Text>
                <Ionicons name="arrow-forward" size={14} color="#000000" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            </View>

            {/* Right Column: Circular Aura Glow + Device Collage */}
            <View style={styles.heroRightCol}>
              {/* Yellow circular glow aura behind devices */}
              <View style={styles.heroAuraGlow} />

              <Image
                source={require('@/assets/categories/banner_devices.png')}
                style={styles.heroCollageImg}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* 3 Pagination Dots */}
          <View style={styles.heroDotsContainer}>
            <View style={styles.heroDotActive} />
            <View style={styles.heroDotInactive} />
            <View style={styles.heroDotInactive} />
          </View>
        </View>

        {/* 3. QUICK CATEGORIES ROW (Below Hero) */}
        <View style={styles.quickCategoriesWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickCategoriesScroll}
          >
            {QUICK_CATEGORIES.map((cat) => {
              const isActive = selectedQuickCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.quickCategoryCard,
                    isActive && styles.quickCategoryCardActive,
                  ]}
                  onPress={() => handleCategoryPress(cat.id)}
                  activeOpacity={0.85}
                >
                  <View style={styles.quickCategoryImgBox}>
                    <Image
                      source={{ uri: cat.image }}
                      style={styles.quickCategoryImg}
                      resizeMode="cover"
                    />
                  </View>
                  <Text
                    style={[
                      styles.quickCategoryLabel,
                      isActive && styles.quickCategoryLabelActive,
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

        {/* 4. FEATURED DEVICES SECTION */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Featured Devices</Text>
          <TouchableOpacity
            style={styles.viewAllBtn}
            onPress={() => (navigation as any).navigate('Shop')}
            activeOpacity={0.7}
          >
            <Text style={styles.viewAllText}>View All</Text>
            <Ionicons name="arrow-forward" size={14} color="#0F172A" />
          </TouchableOpacity>
        </View>

        {loading && featuredDevices.length === 0 ? (
          <ProductRowSkeleton count={4} />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.featuredDevicesScroll}
          >
            {featuredDevices.map((item) => {
              const pid = String((item as AnyProduct).id ?? (item as AnyProduct)._uuid ?? '');
              const name = getProductName(item);
              const price = getProductPrice(item);
              const origPrice = getOriginalPrice(item);
              const specs = getProductSpecs(item);
              const isWishlisted = isInWishlist(pid);
              const imgSource = getProductImageSource(item);

              return (
                <View key={pid} style={styles.productCard}>
                  {/* Top Right Wishlist Heart */}
                  <TouchableOpacity
                    style={styles.wishlistHeartBtn}
                    onPress={() => {
                      const isNowWishlisted = toggleWishlist(item);
                      const nextCount = isNowWishlisted
                        ? totalWishlistItems + 1
                        : Math.max(0, totalWishlistItems - 1);
                      if (isNowWishlisted) {
                        toast?.success?.(name, `Added to Wishlist (${nextCount} ${nextCount === 1 ? 'item' : 'items'})`);
                      } else {
                        toast?.info?.(name, `Removed from Wishlist (${nextCount} ${nextCount === 1 ? 'item' : 'items'})`);
                      }
                    }}
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
                    onPress={() => openProduct(item)}
                    style={styles.productImgBox}
                  >
                    <Image
                      source={imgSource}
                      style={styles.productImg}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>

                  {/* Product Title & Specs */}
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => openProduct(item)}
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
                    <Text style={styles.priceText}>
                      ₹{price.toLocaleString('en-IN')}
                    </Text>
                    {origPrice > price && (
                      <Text style={styles.origPriceText}>
                        ₹{origPrice.toLocaleString('en-IN')}
                      </Text>
                    )}
                  </View>

                  {/* Full-width Yellow Add to Cart Button */}
                  <TouchableOpacity
                    style={styles.addToCartBtn}
                    onPress={() => {
                      addToCart(item);
                      toast?.success?.('Added to cart!', name);
                      (navigation as any).navigate('Cart');
                    }}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="cart" size={15} color="#000000" style={{ marginRight: 6 }} />
                    <Text style={styles.addToCartText}>Add to Cart</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>
        )}

        {/* 5. SHOP BY CATEGORY SECTION */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Shop by Category</Text>
          <TouchableOpacity
            style={styles.viewAllBtn}
            onPress={() => (navigation as any).navigate('Categories')}
            activeOpacity={0.7}
          >
            <Text style={styles.viewAllText}>View All</Text>
            <Ionicons name="arrow-forward" size={14} color="#0F172A" />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.shopByCatScroll}
        >
          {SHOP_BY_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.shopByCatCard,
                { backgroundColor: cat.bg, borderColor: cat.borderColor },
              ]}
              onPress={() => handleCategoryPress(cat.id)}
              activeOpacity={0.85}
            >
              <View style={styles.shopByCatImgBox}>
                <Image
                  source={{ uri: cat.image }}
                  style={styles.shopByCatImg}
                  resizeMode="cover"
                />
              </View>
              <Text style={styles.shopByCatLabel} numberOfLines={1}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120, // Clean space above floating glass tab bar
  },

  /* HERO BANNER */
  heroBannerCard: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 16,
    backgroundColor: '#FEF9C3', // Soft warm yellow/cream
    borderRadius: 22,
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 26,
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      web: { boxShadow: '0 4px 20px rgba(250, 204, 21, 0.12)' },
      default: {
        shadowColor: '#FACC15',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
        elevation: 3,
      },
    }),
  },
  heroContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroLeftCol: {
    flex: 1.15,
    paddingRight: 6,
    zIndex: 2,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: renewxFontFamily.bold,
    color: '#0F172A',
    lineHeight: 27,
  },
  heroSubtitle: {
    fontSize: 12.5,
    fontFamily: renewxFontFamily.regular,
    color: '#64748B',
    marginTop: 6,
    lineHeight: 17,
  },
  heroShopNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FACC15',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 14,
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(250, 204, 21, 0.35)' },
      default: {
        shadowColor: '#FACC15',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.35,
        shadowRadius: 4,
        elevation: 2,
      },
    }),
  },
  heroShopNowText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: renewxFontFamily.bold,
    color: '#000000',
  },
  heroRightCol: {
    flex: 1.25,
    alignItems: 'center',
    justifyContent: 'center',
    height: 155,
    position: 'relative',
  },
  heroAuraGlow: {
    position: 'absolute',
    right: -10,
    top: 5,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#FDE047',
    opacity: 0.55,
  },
  heroCollageImg: {
    width: '100%',
    height: 155,
    zIndex: 2,
  },
  heroDotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    gap: 5,
  },
  heroDotActive: {
    width: 18,
    height: 5.5,
    borderRadius: 3,
    backgroundColor: '#FACC15',
  },
  heroDotInactive: {
    width: 5.5,
    height: 5.5,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
  },

  /* QUICK CATEGORIES */
  quickCategoriesWrapper: {
    marginBottom: 8,
  },
  quickCategoriesScroll: {
    paddingHorizontal: 16,
    gap: 10,
  },
  quickCategoryCard: {
    width: 66,
    height: 84,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    ...Platform.select({
      web: { boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 3,
        elevation: 1,
      },
    }),
  },
  quickCategoryCardActive: {
    backgroundColor: '#FFFDF0',
    borderColor: '#FDE047',
    borderWidth: 1.5,
  },
  quickCategoryImgBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  quickCategoryImg: {
    width: '100%',
    height: '100%',
  },
  quickCategoryLabel: {
    fontSize: 10.5,
    fontFamily: renewxFontFamily.semibold,
    fontWeight: '600',
    color: '#0F172A',
    marginTop: 4,
    textAlign: 'center',
  },
  quickCategoryLabelActive: {
    fontWeight: '700',
  },

  /* SECTION HEADER */
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    fontFamily: renewxFontFamily.bold,
    color: '#0F172A',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: renewxFontFamily.semibold,
    color: '#475569',
  },

  /* FEATURED DEVICES PRODUCT CARDS */
  featuredDevicesScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  productCard: {
    width: 174,
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

  /* SHOP BY CATEGORY */
  shopByCatScroll: {
    paddingHorizontal: 16,
    gap: 10,
  },
  shopByCatCard: {
    width: 68,
    height: 86,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  shopByCatImgBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
  shopByCatImg: {
    width: '100%',
    height: '100%',
  },
  shopByCatLabel: {
    fontSize: 10.5,
    fontFamily: renewxFontFamily.semibold,
    fontWeight: '600',
    color: '#0F172A',
    marginTop: 4,
    textAlign: 'center',
  },

  loadingBox: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
