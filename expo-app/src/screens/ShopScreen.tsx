import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/App';
import type { Product } from '@/types';
import { api } from '@/services/api';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useToast } from '@/context/ToastContext';
import { mapProductRow } from '@/lib/productMapper';
import { useSafeHeaderTop } from '@/lib/useSafeHeaderTop';
import RenewXLogo from '@/components/RenewXLogo';
import HomeHeader from '@/components/HomeHeader';
import { ProductRowSkeleton, ProductGridSkeleton, SkeletonPill } from '@/components/ui';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// 1. Horizontal Category Selector Items (Matching Reference Image 2)
const SHOP_CATEGORIES = [
  {
    id: 'All',
    label: 'All',
    isAllIcon: true,
  },
  {
    id: 'Smartphones',
    label: 'Smartphones',
    image: require('@/assets/categories/smartphone.png'),
  },
  {
    id: 'Laptops',
    label: 'Laptops',
    image: require('@/assets/categories/laptop.png'),
  },
  {
    id: 'Tablets',
    label: 'Tablets',
    image: require('@/assets/categories/tablets.png'),
  },
  {
    id: 'Smartwatches',
    label: 'Smartwatches',
    image: require('@/assets/categories/smartwatch.png'),
  },
  {
    id: 'Earbuds',
    label: 'Earbuds',
    image: require('@/assets/categories/earbuds.png'),
  },
  {
    id: 'Accessories',
    label: 'Accessories',
    image: require('@/assets/categories/accessories.png'),
  },
];

// 2. Brand Items (Matching Reference Image 2)
const BRAND_ITEMS = [
  { id: 'Apple', name: 'Apple', icon: 'logo-apple' as const, type: 'apple' },
  { id: 'Samsung', name: 'Samsung', text: 'SAMSUNG', color: '#1428A0', type: 'text' },
  { id: 'Xiaomi', name: 'Xiaomi', text: 'mi', color: '#FF6900', type: 'mi' },
  { id: 'OnePlus', name: 'OnePlus', text: '1+', color: '#EB0029', type: 'oneplus' },
  { id: 'OPPO', name: 'OPPO', text: 'oppo', color: '#059669', type: 'text' },
  { id: 'vivo', name: 'vivo', text: 'vivo', color: '#2563EB', type: 'text' },
  { id: 'Others', name: 'Others', text: '••• Others', color: '#64748B', type: 'text' },
];

const BANNER_IMAGE = require('@/assets/categories/banner_devices.png');

function getProductImageUri(product: Product): string | undefined {
  const p = product as any;
  const images = p.images ?? p.image_urls ?? p.imageUrls;
  if (Array.isArray(images) && images.length > 0) {
    const first = images[0];
    if (typeof first === 'string') return first;
    if (first?.url) return first.url;
    if (first?.src) return first.src;
  }
  return p.image_url ?? p.imageUrl ?? p.image ?? p.thumbnail ?? p.thumbnail_url;
}

function getProductPrice(product: Product): number {
  const p = product as any;
  const val = p.price ?? p.sale_price ?? p.selling_price ?? 0;
  const num = Number(val);
  return Number.isFinite(num) ? num : 0;
}

function getOriginalPrice(product: Product): number {
  const p = product as any;
  const orig = Number(p.original_price ?? p.originalPrice ?? 0);
  if (orig > 0) return orig;
  const price = getProductPrice(product);
  return price > 0 ? Math.round(price * 1.35) : 0;
}

function getDiscountPercent(product: Product): string {
  const p = product as any;
  if (p.discount && Number(p.discount) > 0) {
    return `${Math.round(Number(p.discount))}% OFF`;
  }
  const price = getProductPrice(product);
  const orig = getOriginalPrice(product);
  if (orig > price && price > 0) {
    return `${Math.round(((orig - price) / orig) * 100)}% OFF`;
  }
  return '30% OFF';
}

function getProductSpecs(product: Product): string {
  const p = product as any;
  const storage = p.storage || p.ram_storage || p.specs?.storage || '128 GB';
  const color = p.color || p.colour || p.variant || '';
  return color ? `${storage} · ${color}` : storage;
}

function getProductCondition(product: Product): string {
  const p = product as any;
  const condition = p.condition || p.grade || p.quality || 'Excellent';
  return `${condition} Condition`;
}

export function resolveCategoryId(raw?: string): string {
  if (!raw || typeof raw !== 'string') return 'All';
  const s = raw.trim().toLowerCase();

  if (s === 'all') return 'All';
  if (s.includes('phone') || s.includes('mobile') || s.includes('smart')) {
    if (s.includes('watch')) return 'Smartwatches';
    return 'Smartphones';
  }
  if (s.includes('laptop') || s.includes('mac') || s.includes('computer') || s.includes('pc')) {
    return 'Laptops';
  }
  if (s.includes('tab') || s.includes('pad')) {
    return 'Tablets';
  }
  if (s.includes('watch') || s.includes('wear') || s.includes('clock')) {
    return 'Smartwatches';
  }
  if (s.includes('audio') || s.includes('headphone') || s.includes('ear') || s.includes('sound') || s.includes('speaker') || s.includes('pod')) {
    return 'Earbuds';
  }
  if (s.includes('accessor') || s.includes('access') || s.includes('cable') || s.includes('charger') || s.includes('case') || s.includes('cover')) {
    return 'Accessories';
  }

  const directMatch = SHOP_CATEGORIES.find(
    (c) => c.id.toLowerCase() === s || c.label.toLowerCase() === s
  );
  return directMatch ? directMatch.id : 'All';
}

export default function ShopScreen() {
  const safeTop = useSafeHeaderTop();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<any>();
  const { addToCart, totalItems } = useCart();
  const { isInWishlist, toggleWishlist, totalWishlistItems } = useWishlist();
  const toast = useToast();
  const scrollRef = useRef<ScrollView>(null);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' as any });
      }
    }, [])
  );

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialCat = resolveCategoryId(route.params?.category);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCat);
  const [selectedBrand, setSelectedBrand] = useState<string>(route.params?.brand || 'All');

  // Sync category & brand from route params
  useEffect(() => {
    if (route.params?.category) {
      const resolved = resolveCategoryId(route.params.category);
      setSelectedCategory(resolved);
    }
    if (route.params?.brand) {
      setSelectedBrand(route.params.brand);
    }
  }, [route.params?.category, route.params?.brand, route.params?._t]);

  // Fetch live backend products
  const fetchLiveProducts = useCallback(async () => {
    try {
      setError(null);
      const data = await api.products.getAll({ limit: 100 });
      const rows = Array.isArray(data) ? data : [];
      const mapped = rows.map(mapProductRow);
      setProducts(mapped);
    } catch (err: any) {
      console.warn('[ShopScreen] Failed to fetch products:', err?.message);
      setError(err?.message || 'Unable to connect to live inventory.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveProducts();
  }, [fetchLiveProducts]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLiveProducts();
    setRefreshing(false);
  };

  const handleToggleWishlist = (product: Product) => {
    const isNowWishlisted = toggleWishlist(product);
    const nextCount = isNowWishlisted ? totalWishlistItems + 1 : Math.max(0, totalWishlistItems - 1);
    if (isNowWishlisted) {
      toast.success(product.name, `Added to Wishlist (${nextCount} ${nextCount === 1 ? 'item' : 'items'})`);
    } else {
      toast.info(product.name, `Removed from Wishlist (${nextCount} ${nextCount === 1 ? 'item' : 'items'})`);
    }
  };

  const handleAddToCart = (product: Product) => {
    addToCart(product);
    toast.success(product.name, 'Added to Cart');
    navigation.navigate('Cart');
  };

  const handleCategoryPress = (catId: string) => {
    setSelectedCategory(catId);
  };

  const handleBrandPress = (brandId: string) => {
    if (selectedBrand === brandId) {
      setSelectedBrand('All');
    } else {
      setSelectedBrand(brandId);
    }
  };

  // Filter products by category and brand
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // 1. Category match
      let matchesCategory = true;
      if (selectedCategory !== 'All') {
        const c = selectedCategory.toLowerCase();
        const catStr = String((p as any).category ?? '').toLowerCase();
        const nameStr = String(p.name ?? '').toLowerCase();
        const typeStr = String((p as any).type ?? '').toLowerCase();

        if (c === 'smartphones') {
          matchesCategory =
            catStr.includes('phone') ||
            catStr.includes('mobile') ||
            catStr.includes('smart') ||
            typeStr.includes('phone') ||
            nameStr.includes('iphone') ||
            nameStr.includes('samsung') ||
            nameStr.includes('pixel') ||
            nameStr.includes('oneplus') ||
            nameStr.includes('galaxy') ||
            nameStr.includes('xiaomi');
        } else if (c === 'laptops') {
          matchesCategory =
            catStr.includes('laptop') ||
            catStr.includes('mac') ||
            catStr.includes('computer') ||
            catStr.includes('pc') ||
            typeStr.includes('laptop') ||
            nameStr.includes('macbook') ||
            nameStr.includes('laptop') ||
            nameStr.includes('dell') ||
            nameStr.includes('hp');
        } else if (c === 'tablets') {
          matchesCategory =
            catStr.includes('tablet') ||
            catStr.includes('pad') ||
            typeStr.includes('tablet') ||
            nameStr.includes('ipad') ||
            nameStr.includes('tab');
        } else if (c === 'smartwatches') {
          matchesCategory =
            catStr.includes('watch') ||
            catStr.includes('wear') ||
            typeStr.includes('watch') ||
            nameStr.includes('watch');
        } else if (c === 'earbuds') {
          matchesCategory =
            catStr.includes('audio') ||
            catStr.includes('ear') ||
            catStr.includes('headphone') ||
            catStr.includes('sound') ||
            typeStr.includes('audio') ||
            nameStr.includes('airpod') ||
            nameStr.includes('earbud') ||
            nameStr.includes('boat') ||
            nameStr.includes('noise');
        } else if (c === 'accessories') {
          matchesCategory =
            catStr.includes('access') ||
            catStr.includes('cable') ||
            catStr.includes('charger') ||
            catStr.includes('case') ||
            typeStr.includes('access');
        } else {
          matchesCategory = catStr.includes(c) || nameStr.includes(c);
        }
      }

      if (!matchesCategory) return false;

      // 2. Brand match
      if (selectedBrand !== 'All') {
        const b = selectedBrand.toLowerCase();
        const brandStr = String(p.brand ?? '').toLowerCase();
        const nameStr = String(p.name ?? '').toLowerCase();
        if (b === 'others') {
          const coreBrands = ['apple', 'samsung', 'xiaomi', 'oneplus', 'oppo', 'vivo'];
          return !coreBrands.some((cb) => brandStr.includes(cb) || nameStr.includes(cb));
        }
        return brandStr.includes(b) || nameStr.includes(b);
      }

      return true;
    });
  }, [products, selectedCategory, selectedBrand]);

  // Featured Devices slice
  const featuredProducts = useMemo(() => {
    if (filteredProducts.length === 0) return [];
    const featured = filteredProducts.filter((p) => (p as any).featured);
    return featured.length > 0 ? featured : filteredProducts.slice(0, 8);
  }, [filteredProducts]);

  // Recently Added slice (sorted descending)
  const recentlyAddedProducts = useMemo(() => {
    if (filteredProducts.length === 0) return [];
    return [...filteredProducts]
      .sort((a, b) => Number(b.id || 0) - Number(a.id || 0))
      .slice(0, 8);
  }, [filteredProducts]);

  // Render a Single Product Card (Exact visual spec of Reference Image 2)
  const renderProductCard = (item: Product, index: number) => {
    const isWish = isInWishlist(item.id);
    const price = getProductPrice(item);
    const origPrice = getOriginalPrice(item);
    const discount = getDiscountPercent(item);
    const specs = getProductSpecs(item);
    const condition = getProductCondition(item);
    const imageUri = getProductImageUri(item);

    // Badge rule
    const discNum = parseInt(discount, 10) || 0;
    const isGreatDeal = discNum >= 38;
    const isBestSeller = !isGreatDeal && index % 2 === 0;

    return (
      <TouchableOpacity
        key={String(item._uuid || item.id || index)}
        style={styles.productCard}
        onPress={() => navigation.navigate('ProductDetail', { id: String(item.id), product: item })}
        activeOpacity={0.88}
        accessibilityLabel={`${item.name}, ₹${price.toLocaleString('en-IN')}`}
      >
        {/* Top Row: Badge + Wishlist Heart */}
        <View style={styles.cardTopRow}>
          {isGreatDeal ? (
            <View style={styles.badgeGreatDeal}>
              <Ionicons name="pricetag" size={10} color="#166534" style={{ marginRight: 3 }} />
              <Text style={styles.badgeGreatDealText}>Great Deal</Text>
            </View>
          ) : isBestSeller ? (
            <View style={styles.badgeBestSeller}>
              <Ionicons name="ribbon-outline" size={10} color="#854D0E" style={{ marginRight: 3 }} />
              <Text style={styles.badgeBestSellerText}>Best Seller</Text>
            </View>
          ) : (
            <View style={styles.badgeCertified}>
              <Text style={styles.badgeCertifiedText}>Verified</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.wishlistHit}
            onPress={(e) => {
              (e as any)?.stopPropagation?.();
              handleToggleWishlist(item);
            }}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={isWish ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <Ionicons
              name={isWish ? 'heart' : 'heart-outline'}
              size={18}
              color={isWish ? '#EF4444' : '#0F172A'}
            />
          </TouchableOpacity>
        </View>

        {/* Product Image */}
        <View style={styles.productImageWrap}>
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={styles.productImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.productPlaceholder}>
              <Ionicons name="phone-portrait-outline" size={36} color="#CBD5E1" />
            </View>
          )}
        </View>

        {/* Product Title */}
        <Text style={styles.productName} numberOfLines={1}>
          {item.name}
        </Text>

        {/* Specs & Condition */}
        <Text style={styles.productSpecs} numberOfLines={1}>
          {specs}
        </Text>
        <Text style={styles.productCondition} numberOfLines={1}>
          {condition}
        </Text>

        {/* Pricing Row */}
        <View style={styles.priceRow}>
          <Text style={styles.priceCurrent}>
            ₹{Number(price).toLocaleString('en-IN')}
          </Text>
          {origPrice > price && (
            <Text style={styles.priceOriginal}>
              ₹{Number(origPrice).toLocaleString('en-IN')}
            </Text>
          )}
        </View>

        {/* Discount Tag */}
        <View style={styles.discountPill}>
          <Text style={styles.discountPillText}>{discount}</Text>
        </View>

        {/* Add to Cart Yellow CTA */}
        <TouchableOpacity
          style={styles.addToCartBtn}
          onPress={(e) => {
            (e as any)?.stopPropagation?.();
            handleAddToCart(item);
          }}
          activeOpacity={0.88}
          accessibilityRole="button"
          accessibilityLabel={`Add ${item.name} to cart`}
        >
          <Ionicons name="cart" size={14} color="#0F172A" style={{ marginRight: 6 }} />
          <Text style={styles.addToCartText}>Add to Cart</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.screenContainer}>
      {/* 1. TOP BAR 2 (Category / Shop Top Bar) */}
      <HomeHeader
        mode="category"
        title={selectedCategory === 'All' ? 'Smartphones' : selectedCategory}
        onBack={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs', { screen: 'Home' }))}
        onSearch={() => navigation.navigate('Search')}
        cartCount={totalItems}
        onCart={() => navigation.navigate('Cart')}
        searchPlaceholder={`Search in ${selectedCategory === 'All' ? 'Smartphones' : selectedCategory}...`}
      />

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
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

        {/* 3. HORIZONTAL CATEGORY SELECTOR */}
        <View style={styles.categorySelectorWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categorySelectorScroll}
          >
            {SHOP_CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;

              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.catPillCard,
                    isSelected && styles.catPillCardSelected,
                  ]}
                  onPress={() => handleCategoryPress(cat.id)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={`${cat.label} category`}
                >
                  <View style={styles.catPillIconContainer}>
                    {cat.isAllIcon ? (
                      <Ionicons
                        name="grid"
                        size={22}
                        color="#0F172A"
                      />
                    ) : (
                      <Image
                        source={cat.image}
                        style={styles.catPillImage}
                        resizeMode="contain"
                      />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.catPillLabel,
                      isSelected && styles.catPillLabelSelected,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* 4. PROMOTIONAL BANNER (IDENTICAL DESIGN TO CATEGORY SCREEN) */}
        <View style={styles.bannerContainer}>
          {/* Subtle gold sparkles */}
          <View style={styles.sparkleOne}>
            <Text style={{ fontSize: 13, color: '#F59E0B' }}>✦</Text>
          </View>
          <View style={styles.sparkleTwo}>
            <Text style={{ fontSize: 11, color: '#F59E0B' }}>✦</Text>
          </View>

          <View style={styles.bannerLeftContent}>
            <View style={styles.certifiedBadge}>
              <Text style={styles.certifiedBadgeText}>CERTIFIED PRE-OWNED</Text>
            </View>

            <Text style={styles.bannerHeadline}>
              Premium Devices{'\n'}at Better Prices
            </Text>

            <Text style={styles.bannerSubtext}>
              Same performance. Greater value.
            </Text>

            <TouchableOpacity
              style={styles.bannerCtaButton}
              onPress={() => setSelectedCategory('All')}
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel="Shop pre-owned devices"
            >
              <Text style={styles.bannerCtaText}>Shop Now →</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bannerRightGraphic}>
            <Image
              source={BANNER_IMAGE}
              style={styles.bannerImage}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* LOADING SKELETON STATE */}
        {loading ? (
          <View style={styles.loadingSkeletonContainer}>
            {/* Featured Section Skeleton */}
            <View style={styles.sectionHeaderRow}>
              <SkeletonPill width={140} height={20} radius={6} />
              <SkeletonPill width={60} height={14} radius={4} />
            </View>
            <ProductRowSkeleton count={3} />

            {/* Catalog Grid Skeleton */}
            <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
              <SkeletonPill width={170} height={20} radius={6} />
              <SkeletonPill width={50} height={14} radius={4} />
            </View>
            <ProductGridSkeleton count={4} />
          </View>
        ) : error && products.length === 0 ? (
          /* ERROR STATE */
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={38} color="#EF4444" />
            <Text style={styles.errorTitle}>Connection Problem</Text>
            <Text style={styles.errorSub}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchLiveProducts}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : filteredProducts.length === 0 ? (
          /* EMPTY STATE */
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={44} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No devices found</Text>
            <Text style={styles.emptySub}>
              We couldn't find any {selectedCategory} devices matching {selectedBrand}. Check back soon or reset filters!
            </Text>
            <TouchableOpacity
              style={styles.resetFilterBtn}
              onPress={() => {
                setSelectedCategory('All');
                setSelectedBrand('All');
              }}
            >
              <Text style={styles.resetFilterBtnText}>Show All Devices</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* 5. FEATURED DEVICES SECTION */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Featured Devices</Text>
              <TouchableOpacity
                onPress={() => setSelectedCategory('All')}
                activeOpacity={0.7}
              >
                <Text style={styles.viewAllText}>View All →</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalProductsScroll}
            >
              {featuredProducts.map((p, idx) => renderProductCard(p, idx))}
            </ScrollView>

            {/* 6. EXPLORE BY BRAND SECTION */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Explore by Brand</Text>
              <TouchableOpacity
                onPress={() => setSelectedBrand('All')}
                activeOpacity={0.7}
              >
                <Text style={styles.viewAllText}>View All →</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalBrandsScroll}
            >
              {BRAND_ITEMS.map((brand) => {
                const isBrandSelected = selectedBrand === brand.id;

                return (
                  <TouchableOpacity
                    key={brand.id}
                    style={[
                      styles.brandCard,
                      isBrandSelected && styles.brandCardSelected,
                    ]}
                    onPress={() => handleBrandPress(brand.id)}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel={`${brand.name} brand`}
                  >
                    {brand.type === 'apple' ? (
                      <View style={styles.brandRow}>
                        <Ionicons name="logo-apple" size={17} color="#000000" style={{ marginRight: 5 }} />
                        <Text style={styles.brandAppleText}>Apple</Text>
                      </View>
                    ) : brand.type === 'mi' ? (
                      <View style={styles.brandRow}>
                        <View style={styles.miBadge}>
                          <Text style={styles.miBadgeText}>mi</Text>
                        </View>
                        <Text style={styles.brandNameText}>Xiaomi</Text>
                      </View>
                    ) : brand.type === 'oneplus' ? (
                      <View style={styles.brandRow}>
                        <View style={styles.onePlusBadge}>
                          <Text style={styles.onePlusBadgeText}>1+</Text>
                        </View>
                        <Text style={styles.brandNameText}>OnePlus</Text>
                      </View>
                    ) : (
                      <Text
                        style={[
                          styles.brandCustomText,
                          brand.color ? { color: brand.color } : undefined,
                        ]}
                      >
                        {brand.text || brand.name}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* 7. RECENTLY ADDED SECTION */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Recently Added</Text>
              <TouchableOpacity
                onPress={() => setSelectedCategory('All')}
                activeOpacity={0.7}
              >
                <Text style={styles.viewAllText}>View All →</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalProductsScroll}
            >
              {recentlyAddedProducts.map((p, idx) => renderProductCard(p, idx))}
            </ScrollView>
          </>
        )}

        {/* Bottom padding so content is never covered by the floating bottom tab bar */}
        <View style={{ height: 110 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // 1. Top Header
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  headerLeft: {
    flex: 1,
    justifyContent: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FACC15',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  cartBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0F172A',
  },

  // Scroll Content
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  // 2. Search Bar
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
  },
  filterButton: {
    paddingLeft: 10,
    paddingVertical: 6,
  },

  // 3. Horizontal Category Selector
  categorySelectorWrap: {
    marginHorizontal: -20,
    marginBottom: 18,
  },
  categorySelectorScroll: {
    paddingHorizontal: 20,
    gap: 10,
  },
  catPillCard: {
    width: 74,
    height: 84,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  catPillCardSelected: {
    backgroundColor: '#FFFDF0',
    borderColor: '#FACC15',
    borderWidth: 1.5,
  },
  catPillIconContainer: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  catPillImage: {
    width: '100%',
    height: '100%',
  },
  catPillLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    textAlign: 'center',
  },
  catPillLabelSelected: {
    color: '#0F172A',
    fontWeight: '800',
  },

  // 4. Promotional Banner (Identical to Category Screen)
  bannerContainer: {
    backgroundColor: '#FFFDF0',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#FEF08A',
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 24,
  },
  sparkleOne: {
    position: 'absolute',
    top: 50,
    right: 175,
  },
  sparkleTwo: {
    position: 'absolute',
    top: 18,
    right: 20,
  },
  bannerLeftContent: {
    flex: 1.15,
    paddingRight: 10,
    zIndex: 2,
  },
  certifiedBadge: {
    backgroundColor: '#FEF08A',
    paddingVertical: 3.5,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  certifiedBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#854D0E',
    letterSpacing: 0.5,
  },
  bannerHeadline: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 25,
    letterSpacing: -0.4,
  },
  bannerSubtext: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 4,
    marginBottom: 12,
  },
  bannerCtaButton: {
    backgroundColor: '#FACC15',
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignSelf: 'flex-start',
    shadowColor: '#FACC15',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 2,
  },
  bannerCtaText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  bannerRightGraphic: {
    flex: 0.85,
    height: 125,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },

  // 5. Section Headers
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  viewAllText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '700',
  },

  // Horizontal Products Scroll
  horizontalProductsScroll: {
    paddingRight: 8,
    paddingBottom: 6,
    gap: 12,
  },

  // Product Card (Exact Match to Reference Image 2)
  productCard: {
    width: 180,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    justifyContent: 'space-between',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 24,
  },
  badgeBestSeller: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF9C3',
    paddingVertical: 2.5,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  badgeBestSellerText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#854D0E',
  },
  badgeGreatDeal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingVertical: 2.5,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  badgeGreatDealText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#166534',
  },
  badgeCertified: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 2.5,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  badgeCertifiedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  wishlistHit: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
  },
  productImageWrap: {
    width: '100%',
    height: 105,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  productName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
    marginTop: 2,
  },
  productSpecs: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },
  productCondition: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
    marginTop: 1,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 6,
  },
  priceCurrent: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  priceOriginal: {
    fontSize: 11,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
    marginLeft: 6,
    fontWeight: '500',
  },
  discountPill: {
    backgroundColor: '#DCFCE7',
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
    marginBottom: 8,
  },
  discountPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#16A34A',
  },
  addToCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FACC15',
    paddingVertical: 9,
    borderRadius: 10,
    shadowColor: '#FACC15',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 1,
  },
  addToCartText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
  },

  // 6. Explore by Brand Row
  horizontalBrandsScroll: {
    paddingRight: 8,
    paddingBottom: 6,
    gap: 10,
  },
  brandCard: {
    minWidth: 100,
    height: 46,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  brandCardSelected: {
    backgroundColor: '#FFFDF0',
    borderColor: '#FACC15',
    borderWidth: 1.5,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandAppleText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  brandNameText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  brandCustomText: {
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  miBadge: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#FF6900',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  miBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  onePlusBadge: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#EB0029',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  onePlusBadgeText: {
    color: '#EB0029',
    fontSize: 10,
    fontWeight: '900',
  },

  // Status & Feedback States
  loadingSkeletonContainer: {
    paddingTop: 8,
    paddingBottom: 24,
  },
  loadingContainer: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  errorContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 10,
  },
  errorSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#FACC15',
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
    lineHeight: 18,
  },
  resetFilterBtn: {
    backgroundColor: '#0F172A',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  resetFilterBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
