import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  RefreshControl,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/App';
import type { Product } from '@/types';
import { api } from '@/services/api';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { mapProductRow } from '@/lib/productMapper';
import HomeHeader from '@/components/HomeHeader';
import { Ionicons } from '@expo/vector-icons';
import {
  renewxColors,
  renewxFontFamily,
  renewxRadius,
  renewxSpacing,
} from '@/design-system';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const SIDEBAR_CATEGORIES = [
  {
    id: 'Smartphones',
    label: 'Smartphones',
    icon: 'phone-portrait-outline' as const,
    key: 'phone',
    image: require('@/assets/categories/smartphone.png'),
  },
  {
    id: 'Laptops',
    label: 'Laptops',
    icon: 'laptop-outline' as const,
    key: 'laptop',
    image: require('@/assets/categories/laptop.png'),
  },
  {
    id: 'Tablets',
    label: 'Tablets',
    icon: 'tablet-portrait-outline' as const,
    key: 'tablet',
    image: require('@/assets/categories/tablets.png'),
  },
  {
    id: 'Watches',
    label: 'Watches',
    icon: 'watch-outline' as const,
    key: 'watch',
    image: require('@/assets/categories/smartwatch.png'),
  },
  {
    id: 'Audio',
    label: 'Audio',
    icon: 'headset-outline' as const,
    key: 'audio',
    image: require('@/assets/categories/accessories.png'),
  },
  {
    id: 'Accessories',
    label: 'Accessories',
    icon: 'bag-handle-outline' as const,
    key: 'accessor',
    image: require('@/assets/categories/accessories.png'),
  },
  {
    id: 'Gaming',
    label: 'Gaming',
    icon: 'game-controller-outline' as const,
    key: 'gaming',
    image: require('@/assets/categories/gaming.png'),
  },
  {
    id: 'Cameras',
    label: 'Cameras',
    icon: 'camera-outline' as const,
    key: 'camera',
    image: require('@/assets/categories/smartphone.png'),
  },
];

const BRAND_ITEMS = [
  { id: 'Apple', name: 'Apple', icon: 'logo-apple' as const, color: '#000000', bg: '#F8FAFC' },
  { id: 'Samsung', name: 'Samsung', text: 'SAMSUNG', color: '#1428A0', bg: '#EFF6FF' },
  { id: 'OnePlus', name: 'OnePlus', text: '1+', color: '#EB0029', bg: '#FEF2F2' },
  { id: 'Google', name: 'Google', icon: 'logo-google' as const, color: '#EA4335', bg: '#F8FAFC' },
  { id: 'Xiaomi', name: 'Xiaomi', text: 'mi', color: '#FF6900', bg: '#FFF7ED' },
  { id: 'Realme', name: 'Realme', text: 'R', color: '#CA8A04', bg: '#FEF9C3' },
];

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
  return '28% OFF';
}

function getProductSpecs(product: Product): string {
  const p = product as any;
  const storage = p.storage || p.ram_storage || p.specs?.storage || '128 GB';
  const condition = p.condition || p.grade || p.quality || 'Excellent';
  return `${storage} • ${condition}`;
}

export function resolveCategoryId(raw?: string): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const s = raw.trim().toLowerCase();

  if (s === 'all') return 'Smartphones';
  if (s.includes('phone') || s.includes('mobile') || s.includes('smart')) {
    if (s.includes('watch')) return 'Watches';
    return 'Smartphones';
  }
  if (s.includes('laptop') || s.includes('mac') || s.includes('computer') || s.includes('pc')) {
    return 'Laptops';
  }
  if (s.includes('tab') || s.includes('pad')) {
    return 'Tablets';
  }
  if (s.includes('watch') || s.includes('wear') || s.includes('clock')) {
    return 'Watches';
  }
  if (s.includes('audio') || s.includes('headphone') || s.includes('ear') || s.includes('sound') || s.includes('speaker') || s.includes('pod')) {
    return 'Audio';
  }
  if (s.includes('accessor') || s.includes('access') || s.includes('cable') || s.includes('charger') || s.includes('case') || s.includes('cover')) {
    return 'Accessories';
  }
  if (s.includes('game') || s.includes('gaming') || s.includes('console')) {
    return 'Gaming';
  }
  if (s.includes('camera') || s.includes('photo') || s.includes('lens') || s.includes('dslr')) {
    return 'Cameras';
  }

  const directMatch = SIDEBAR_CATEGORIES.find(
    (c) => c.id.toLowerCase() === s || c.label.toLowerCase() === s
  );
  return directMatch ? directMatch.id : null;
}

export default function ShopScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<any>();
  const { addToCart, totalItems } = useCart();
  const { isAdmin, signOut } = useAuth();
  const toast = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const initialCat = resolveCategoryId(route.params?.category) || 'Smartphones';
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCat);
  const [selectedBrand, setSelectedBrand] = useState<string>(route.params?.brand || 'All');
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  // Sync category filter from navigation params (e.g. when redirected from HomeScreen)
  useEffect(() => {
    const rawCat = route.params?.category;
    if (rawCat) {
      const resolved = resolveCategoryId(rawCat);
      if (resolved) {
        setSelectedCategory(resolved);
      }
    }
    if (route.params?.brand) {
      setSelectedBrand(route.params.brand);
    } else if (rawCat) {
      setSelectedBrand('All');
    }
  }, [route.params?.category, route.params?.brand, route.params?._t]);

  const fetchLiveProducts = useCallback(async () => {
    try {
      const data = await api.products.getAll({ limit: 100 });
      const rows = Array.isArray(data) ? data : [];
      const mapped = rows.map(mapProductRow);
      setProducts(mapped);
    } catch (err: any) {
      console.warn('[Categories] Failed to fetch products:', err?.message);
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

  const toggleFavorite = (productId: string, productName?: string) => {
    setFavorites((prev) => {
      const next = !prev[productId];
      if (next) {
        toast?.success?.(productName ? `Saved "${productName}" to wishlist` : 'Saved to wishlist');
      } else {
        toast?.info?.('Removed from wishlist');
      }
      return { ...prev, [productId]: next };
    });
  };

  const currentCategory = useMemo(() => {
    return (
      SIDEBAR_CATEGORIES.find((c) => c.id === selectedCategory) || SIDEBAR_CATEGORIES[0]
    );
  }, [selectedCategory]);

  const categoryProducts = useMemo(() => {
    const key = currentCategory.key;

    const filtered = products.filter((p) => {
      const catStr = String((p as any).category ?? '').toLowerCase();
      const nameStr = String(p.name ?? '').toLowerCase();
      const typeStr = String((p as any).type ?? '').toLowerCase();

      let matchesCat = catStr.includes(key) || nameStr.includes(key) || typeStr.includes(key);

      if (key === 'phone') {
        matchesCat =
          matchesCat ||
          catStr.includes('mobile') ||
          catStr.includes('smart') ||
          nameStr.includes('iphone') ||
          nameStr.includes('samsung') ||
          nameStr.includes('pixel') ||
          nameStr.includes('oneplus');
      } else if (key === 'laptop') {
        matchesCat =
          matchesCat ||
          catStr.includes('mac') ||
          nameStr.includes('macbook') ||
          nameStr.includes('laptop');
      } else if (key === 'tablet') {
        matchesCat =
          matchesCat || catStr.includes('pad') || nameStr.includes('ipad') || nameStr.includes('tab');
      } else if (key === 'watch') {
        matchesCat = matchesCat || catStr.includes('wear') || nameStr.includes('watch');
      } else if (key === 'audio') {
        matchesCat =
          matchesCat ||
          catStr.includes('audio') ||
          catStr.includes('headphone') ||
          catStr.includes('earbud') ||
          catStr.includes('earphone') ||
          catStr.includes('airpod') ||
          nameStr.includes('airpods') ||
          nameStr.includes('boat') ||
          nameStr.includes('audio');
      } else if (key === 'accessor') {
        matchesCat =
          matchesCat ||
          catStr.includes('access') ||
          catStr.includes('case') ||
          catStr.includes('charger') ||
          catStr.includes('cable') ||
          nameStr.includes('case') ||
          nameStr.includes('charger') ||
          nameStr.includes('cable');
      } else if (key === 'gaming') {
        matchesCat =
          matchesCat ||
          catStr.includes('game') ||
          catStr.includes('gaming') ||
          nameStr.includes('playstation') ||
          nameStr.includes('ps5') ||
          nameStr.includes('xbox') ||
          nameStr.includes('nintendo');
      } else if (key === 'camera') {
        matchesCat =
          matchesCat ||
          catStr.includes('camera') ||
          nameStr.includes('camera') ||
          nameStr.includes('sony a') ||
          nameStr.includes('canon') ||
          nameStr.includes('nikon');
      }

      if (selectedBrand !== 'All') {
        const bStr = String((p as any).brand ?? '').toLowerCase();
        const brandMatches =
          bStr.includes(selectedBrand.toLowerCase()) ||
          nameStr.includes(selectedBrand.toLowerCase());
        return matchesCat && brandMatches;
      }

      return matchesCat;
    });

    return filtered;
  }, [products, currentCategory, selectedBrand]);

  const popularProducts = useMemo(() => {
    return [...categoryProducts]
      .sort((a, b) => getProductPrice(b) - getProductPrice(a))
      .slice(0, 10);
  }, [categoryProducts]);

  const newArrivalProducts = useMemo(() => {
    return [...categoryProducts]
      .sort((a, b) => {
        const dateA = new Date((a as any).created_at || (a as any).createdAt || 0).getTime();
        const dateB = new Date((b as any).created_at || (b as any).createdAt || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 10);
  }, [categoryProducts]);

  const renderMiniCard = (product: Product) => {
    const p = product as any;
    const pid = String(p.id ?? p._uuid ?? p._id ?? '');
    const name = p.name ?? 'Device';
    const price = getProductPrice(product);
    const origPrice = getOriginalPrice(product);
    const discount = getDiscountPercent(product);
    const specs = getProductSpecs(product);
    const imageUri = getProductImageUri(product);
    const isFav = Boolean(favorites[pid]);

    return (
      <TouchableOpacity
        key={pid}
        style={styles.miniCard}
        onPress={() => navigation.navigate('ProductDetail', { id: pid })}
        activeOpacity={0.92}
      >
        {/* Top Row: Discount Pill & Heart */}
        <View style={styles.miniCardTopRow}>
          <View style={styles.miniDiscountPill}>
            <Text style={styles.miniDiscountText}>{discount}</Text>
          </View>
          <TouchableOpacity
            onPress={() => toggleFavorite(pid, name)}
            style={styles.miniHeartBtn}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={isFav ? 'heart' : 'heart-outline'}
              size={15}
              color={isFav ? '#EF4444' : '#64748B'}
            />
          </TouchableOpacity>
        </View>

        {/* Product Image */}
        <View style={styles.miniCardImageBox}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.miniCardImage} resizeMode="contain" />
          ) : (
            <Ionicons name="phone-portrait-outline" size={38} color="#94A3B8" />
          )}
        </View>

        {/* Title & Specs */}
        <Text style={styles.miniCardTitle} numberOfLines={1}>{name}</Text>
        <Text style={styles.miniCardSpecs} numberOfLines={1}>{specs}</Text>

        {/* Bottom Price & Yellow Cart Button */}
        <View style={styles.miniCardBottomRow}>
          <View style={styles.miniCardPriceBlock}>
            <Text style={styles.miniCardPrice}>₹{price.toLocaleString('en-IN')}</Text>
            {origPrice > price && (
              <Text style={styles.miniCardOrigPrice}>₹{origPrice.toLocaleString('en-IN')}</Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.miniCardCartBtn}
            onPress={() => {
              addToCart(product);
              toast?.success?.('Added to cart!', name);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="cart" size={14} color="#000000" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* 1. TOP HEADER */}
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

      {/* 2. CATEGORIES TITLE BAR */}
      <View style={styles.titleBar}>
        <Text style={styles.pageTitle}>Categories</Text>
        <TouchableOpacity
          style={styles.seeAllBtn}
          onPress={() => {
            setSelectedBrand('All');
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.seeAllBtnText}>See All Products</Text>
          <Ionicons name="arrow-forward" size={13} color="#0F172A" />
        </TouchableOpacity>
      </View>

      {/* 3. SPLIT VIEW: SIDEBAR RAIL + RIGHT CONTENT */}
      <View style={styles.splitRow}>
        {/* LEFT SIDEBAR RAIL */}
        <View style={styles.sidebarRail}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.sidebarScrollContent}
          >
            {SIDEBAR_CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.sidebarCard,
                    isSelected && styles.sidebarCardActive,
                  ]}
                  onPress={() => {
                    setSelectedCategory(cat.id);
                    setSelectedBrand('All');
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={cat.icon}
                    size={22}
                    color={isSelected ? '#0C7A43' : '#475569'}
                  />
                  <Text
                    style={[
                      styles.sidebarCardLabel,
                      isSelected && styles.sidebarCardLabelActive,
                    ]}
                    numberOfLines={1}
                  >
                    {cat.label}
                  </Text>
                  {isSelected && (
                    <Ionicons
                      name="chevron-forward"
                      size={12}
                      color="#0C7A43"
                      style={styles.sidebarChevron}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* RIGHT MAIN PANEL */}
        <ScrollView
          style={styles.mainPanel}
          contentContainerStyle={styles.mainPanelContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={renewxColors.green}
            />
          }
        >
          {/* Card 1: Category Hero Banner */}
          <View style={styles.catHeroBanner}>
            <View style={styles.catHeroLeft}>
              <Text style={styles.catHeroTitle}>{currentCategory.label}</Text>
              <Text style={styles.catHeroSub}>
                {'Top brands. Great prices.\nRefurbished & verified.'}
              </Text>
              <TouchableOpacity
                style={styles.catHeroDarkBtn}
                onPress={() => {}}
                activeOpacity={0.85}
              >
                <Text style={styles.catHeroDarkBtnText}>Shop Now</Text>
                <Ionicons name="arrow-forward" size={13} color="#FFFFFF" style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            </View>

            <View style={styles.catHeroRight}>
              <Image
                source={currentCategory.image}
                style={styles.catHeroImg}
                resizeMode="contain"
              />
              <View style={styles.catHeroDots}>
                <View style={[styles.pagerDot, styles.pagerDotActive]} />
                <View style={styles.pagerDot} />
                <View style={styles.pagerDot} />
                <View style={styles.pagerDot} />
              </View>
            </View>
          </View>

          {/* Card 2: Brand Logos Strip */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.brandsScroll}
          >
            {BRAND_ITEMS.map((brand) => {
              const isBrandActive = selectedBrand === brand.id;
              return (
                <TouchableOpacity
                  key={brand.id}
                  style={[
                    styles.brandCard,
                    isBrandActive && styles.brandCardActive,
                  ]}
                  onPress={() => {
                    setSelectedBrand((prev: string) => (prev === brand.id ? 'All' : brand.id));
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.brandIconBox, { backgroundColor: brand.bg }]}>
                    {brand.icon ? (
                      <Ionicons name={brand.icon} size={20} color={brand.color} />
                    ) : (
                      <Text style={[styles.brandLogoText, { color: brand.color }]}>
                        {brand.text}
                      </Text>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.brandCardName,
                      isBrandActive && styles.brandCardNameActive,
                    ]}
                    numberOfLines={1}
                  >
                    {brand.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Card 3: Refurbished Smartphones Promo Card */}
          <View style={styles.refurbPromoBanner}>
            <View style={styles.refurbPromoLeft}>
              <View style={styles.refurbDiscountBadge}>
                <Text style={styles.refurbDiscountBadgeText}>UP TO 40% OFF</Text>
              </View>
              <Text style={styles.refurbPromoTitle}>
                Refurbished {currentCategory.label}
              </Text>
              <Text style={styles.refurbPromoSub}>
                Premium brands at better value.
              </Text>
              <TouchableOpacity
                style={styles.refurbPromoBtn}
                onPress={() => {}}
                activeOpacity={0.85}
              >
                <Text style={styles.refurbPromoBtnText}>View Deals</Text>
                <Ionicons name="arrow-forward" size={13} color="#0F172A" style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            </View>

            <View style={styles.refurbPromoRight}>
              <Image
                source={require('@/assets/categories/smartphone.png')}
                style={styles.refurbPromoImg}
                resizeMode="contain"
              />
              <View style={styles.percentBadge}>
                <Text style={styles.percentBadgeText}>%</Text>
              </View>
            </View>
          </View>

          {/* Products Section */}
          {categoryProducts.length === 0 && !loading ? (
            <View style={styles.emptyCategoryBox}>
              <View style={styles.emptyCatIconCircle}>
                <Ionicons name={currentCategory.icon} size={30} color="#64748B" />
              </View>
              <Text style={styles.emptyCategoryTitle}>No {currentCategory.label} in Stock</Text>
              <Text style={styles.emptyCategorySub}>
                We regularly inspect and add verified devices. Check back soon or browse our other top categories!
              </Text>
              <TouchableOpacity
                style={styles.emptyCategoryBtn}
                onPress={() => {
                  setSelectedCategory('Smartphones');
                  setSelectedBrand('All');
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.emptyCategoryBtnText}>Browse Smartphones</Text>
                <Ionicons name="arrow-forward" size={13} color="#000000" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Card 4: Popular Devices Section */}
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeadingTitle}>
                  {selectedCategory === 'Smartphones'
                    ? 'Popular Phones'
                    : `Popular ${currentCategory.label}`}
                </Text>
                <TouchableOpacity
                  style={styles.viewAllRow}
                  onPress={() => {}}
                  activeOpacity={0.7}
                >
                  <Text style={styles.viewAllText}>View All</Text>
                  <Ionicons name="arrow-forward" size={13} color="#0F172A" />
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalProductsScroll}
              >
                {popularProducts.map((p) => renderMiniCard(p))}
              </ScrollView>

              {/* Card 5: New Arrivals Section */}
              <View style={[styles.sectionHeaderRow, { marginTop: 14 }]}>
                <Text style={styles.sectionHeadingTitle}>New Arrivals</Text>
                <TouchableOpacity
                  style={styles.viewAllRow}
                  onPress={() => {}}
                  activeOpacity={0.7}
                >
                  <Text style={styles.viewAllText}>View All</Text>
                  <Ionicons name="arrow-forward" size={13} color="#0F172A" />
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalProductsScroll}
              >
                {newArrivalProducts.map((p) => renderMiniCard(p))}
              </ScrollView>
            </>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  titleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: renewxSpacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  pageTitle: {
    fontFamily: renewxFontFamily.extraBold,
    fontSize: 21,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllBtnText: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  splitRow: {
    flex: 1,
    flexDirection: 'row',
  },

  /* LEFT SIDEBAR RAIL */
  sidebarRail: {
    width: 82,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#F1F5F9',
  },
  sidebarScrollContent: {
    paddingVertical: 8,
    paddingHorizontal: 5,
    gap: 6,
    paddingBottom: 110,
  },
  sidebarCard: {
    width: 72,
    height: 66,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 2,
    position: 'relative',
  },
  sidebarCardActive: {
    backgroundColor: '#DCFCE7',
  },
  sidebarCardLabel: {
    marginTop: 4,
    fontFamily: renewxFontFamily.medium,
    fontSize: 9.5,
    color: '#475569',
    textAlign: 'center',
  },
  sidebarCardLabelActive: {
    color: '#0C7A43',
    fontWeight: '800',
    fontFamily: renewxFontFamily.bold,
  },
  sidebarChevron: {
    position: 'absolute',
    right: 3,
    top: '50%',
    marginTop: -6,
  },

  /* RIGHT MAIN PANEL */
  mainPanel: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  mainPanelContent: {
    padding: 10,
    paddingBottom: 115,
  },

  /* 1. HERO BANNER */
  catHeroBanner: {
    backgroundColor: '#DCFCE7',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    ...Platform.select({
      web: { boxShadow: '0 2px 10px rgba(16, 185, 129, 0.08)' },
      default: { elevation: 2 },
    }),
  },
  catHeroLeft: {
    flex: 1.15,
  },
  catHeroTitle: {
    fontFamily: renewxFontFamily.extraBold,
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
  },
  catHeroSub: {
    marginTop: 4,
    fontFamily: renewxFontFamily.regular,
    fontSize: 9.5,
    lineHeight: 13,
    color: '#475569',
  },
  catHeroDarkBtn: {
    marginTop: 9,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  catHeroDarkBtnText: {
    color: '#FFFFFF',
    fontFamily: renewxFontFamily.bold,
    fontSize: 10.5,
    fontWeight: '700',
  },
  catHeroRight: {
    flex: 0.85,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catHeroImg: {
    width: 75,
    height: 80,
  },
  catHeroDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
  },
  pagerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#94A3B8',
  },
  pagerDotActive: {
    backgroundColor: '#0F172A',
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },

  /* 2. BRAND LOGOS STRIP */
  brandsScroll: {
    gap: 8,
    paddingVertical: 4,
    marginBottom: 10,
  },
  brandCard: {
    width: 56,
    alignItems: 'center',
  },
  brandCardActive: {
    opacity: 1,
  },
  brandIconBox: {
    width: 48,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLogoText: {
    fontFamily: renewxFontFamily.extraBold,
    fontSize: 10.5,
    fontWeight: '900',
  },
  brandCardName: {
    marginTop: 3,
    fontFamily: renewxFontFamily.medium,
    fontSize: 9,
    color: '#475569',
    textAlign: 'center',
  },
  brandCardNameActive: {
    color: '#0F172A',
    fontWeight: '800',
  },

  /* 3. REFURBISHED PROMO BANNER */
  refurbPromoBanner: {
    backgroundColor: '#ECFDF5',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  refurbPromoLeft: {
    flex: 1.15,
  },
  refurbDiscountBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FDE047',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  refurbDiscountBadgeText: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 7.5,
    fontWeight: '800',
    color: '#000000',
  },
  refurbPromoTitle: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  refurbPromoSub: {
    marginTop: 2,
    fontFamily: renewxFontFamily.regular,
    fontSize: 8.5,
    color: '#475569',
  },
  refurbPromoBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  refurbPromoBtnText: {
    color: '#0F172A',
    fontFamily: renewxFontFamily.bold,
    fontSize: 9.5,
    fontWeight: '700',
  },
  refurbPromoRight: {
    flex: 0.85,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  refurbPromoImg: {
    width: 70,
    height: 75,
  },
  percentBadge: {
    position: 'absolute',
    bottom: 2,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },

  /* 4. SECTION HEADERS */
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 8,
  },
  sectionHeadingTitle: {
    fontFamily: renewxFontFamily.extraBold,
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  viewAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  viewAllText: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },

  /* 5. HORIZONTAL MINI PRODUCT CARDS */
  horizontalProductsScroll: {
    gap: 8,
    paddingBottom: 4,
  },
  miniCard: {
    width: 132,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 8,
    ...Platform.select({
      web: { boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)' },
      default: { elevation: 1 },
    }),
  },
  miniCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  miniDiscountPill: {
    backgroundColor: '#FDE047',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  miniDiscountText: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 7.5,
    fontWeight: '800',
    color: '#000000',
  },
  miniHeartBtn: {
    padding: 2,
  },
  miniCardImageBox: {
    height: 85,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  miniCardImage: {
    width: '90%',
    height: '100%',
  },
  miniCardTitle: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  miniCardSpecs: {
    fontFamily: renewxFontFamily.regular,
    fontSize: 9,
    color: '#64748B',
    marginTop: 1,
  },
  miniCardBottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  miniCardPriceBlock: {
    flex: 1,
  },
  miniCardPrice: {
    fontFamily: renewxFontFamily.extraBold,
    fontSize: 12.5,
    fontWeight: '900',
    color: '#0F172A',
  },
  miniCardOrigPrice: {
    fontFamily: renewxFontFamily.regular,
    fontSize: 8.5,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
    marginTop: 0.5,
  },
  miniCardCartBtn: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: '#FFC400',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCategoryBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginVertical: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  emptyCatIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EDF2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyCategoryTitle: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
  },
  emptyCategorySub: {
    fontFamily: renewxFontFamily.regular,
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  emptyCategoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFCC00',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 9999,
  },
  emptyCategoryBtnText: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
  },
});
