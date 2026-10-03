import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { useWishlist } from '@/context/WishlistContext';
import { useSafeHeaderTop } from '@/lib/useSafeHeaderTop';
import { shareProduct } from '@/services/shareService';
import { mapProductRow } from '@/lib/productMapper';
import RenewXLogo from '@/components/RenewXLogo';
import HomeHeader from '@/components/HomeHeader';
import { api } from '@/services/api';
import { ProductDetailSkeleton } from '@/components/ui';
import { getCategoryDeviceImage, resolveImageSource } from '@/lib/imageUtils';

function formatMoney(value: number) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`;
}

function getSpecIcon(label: string): keyof typeof Ionicons.glyphMap {
  const l = label.toLowerCase();
  if (l.includes('storage') || l.includes('rom') || l.includes('ssd')) return 'hardware-chip-outline';
  if (l.includes('ram') || l.includes('memory')) return 'speedometer-outline';
  if (l.includes('color')) return 'color-palette-outline';
  if (l.includes('battery')) return 'battery-charging-outline';
  if (l.includes('screen') || l.includes('display')) return 'phone-portrait-outline';
  if (l.includes('camera')) return 'camera-outline';
  if (l.includes('processor') || l.includes('chip') || l.includes('cpu')) return 'hardware-chip-outline';
  if (l.includes('accessory') || l.includes('accessories') || l.includes('box')) return 'cube-outline';
  if (l.includes('imei') || l.includes('serial')) return 'finger-print-outline';
  if (l.includes('os') || l.includes('operating')) return 'code-slash-outline';
  if (l.includes('warranty')) return 'shield-checkmark-outline';
  return 'information-circle-outline';
}

function getConditionMeta(condition?: string) {
  const c = String(condition || '').toLowerCase();
  if (c.includes('pristine') || c.includes('new')) {
    return {
      label: 'Like New (Pristine)',
      badgeBg: '#DCFCE7',
      badgeColor: '#15803D',
      summary: 'Flawless condition with zero scratches. Looks and performs indistinguishable from brand new.',
      bullets: [
        'Screen and body in 100% flawless cosmetic condition',
        'Battery health tested at 90%+ original capacity',
        'Passed all 32-point hardware and software diagnostic tests',
        'Includes certified fast charger and quality inspection pass',
      ],
    };
  }
  if (c.includes('excellent')) {
    return {
      label: 'Excellent Condition',
      badgeBg: '#EFF6FF',
      badgeColor: '#1D4ED8',
      summary: 'Minimal microscopic signs of handling. Fully certified with genuine parts and high battery health.',
      bullets: [
        'Flawless screen with no dead pixels or discoloration',
        'Minor micro-scratches barely noticeable under direct light',
        'Battery health tested above 85% peak performance',
        'Includes original or OEM-certified charging accessories',
      ],
    };
  }
  if (c.includes('good')) {
    return {
      label: 'Good Condition',
      badgeBg: '#FEF3C7',
      badgeColor: '#B45309',
      summary: 'Light cosmetic wear on edges or back cover. Screen is clean and all hardware functions 100%.',
      bullets: [
        'Clear display with full touch sensitivity',
        'Light cosmetic signs of previous use on body frame',
        '100% hardware functionality guaranteed by RenewX lab',
        'Fully cleaned, sanitized and repacked with charging cable',
      ],
    };
  }
  return {
    label: condition || 'Certified Pre-Owned',
    badgeBg: '#F3F4F6',
    badgeColor: '#374151',
    summary: 'Rigorously inspected, fully tested, and certified for reliable everyday performance.',
    bullets: [
      'Comprehensive multi-point functional verification',
      'Clean IMEI / serial number verification and authentic hardware',
      'All buttons, ports, speakers, and cameras 100% working',
      'Includes charging accessories and certified protective packaging',
    ],
  };
}

export default function ProductDetailScreen() {
  const safeTop = useSafeHeaderTop();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const params = route.params || {};

  const { addToCart } = useCart();
  const toast = useToast();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const scrollRef = useRef<ScrollView>(null);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' as any });
      }
    }, [])
  );

  const [fetchedProduct, setFetchedProduct] = useState<any>(null);
  const [loadingProduct, setLoadingProduct] = useState<boolean>(!params.product && !!(params.productId || params.id));
  const [similarProducts, setSimilarProducts] = useState<any[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [selectedStorage, setSelectedStorage] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch complete product details by ID to ensure latest admin data
  const loadProduct = useCallback(async (prodId: string) => {
    try {
      const res: any = await api.products.getById(prodId);
      const item = res?.data || res;
      if (item) {
        const mapped = mapProductRow(item);
        setFetchedProduct(mapped);
      }
    } catch {
      // Keep initial if failed
    } finally {
      setLoadingProduct(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const prodId = params.productId || params.id || params.product?.id || params.product?._id;
    if (prodId) {
      if (!params.product) {
        setLoadingProduct(true);
      }
      loadProduct(String(prodId));
    }
  }, [params.productId, params.id, params.product, loadProduct]);

  // Base mapped product: prefer fetched latest or passed initial
  const baseProduct = useMemo(() => {
    if (fetchedProduct) return fetchedProduct;
    if (params.product) return mapProductRow(params.product);
    return null;
  }, [fetchedProduct, params.product]);

  // Gallery: admin images array + main image_url (deduplicated & filtered)
  const gallery = useMemo(() => {
    if (!baseProduct) return [];
    const list: any[] = [];
    if (
      baseProduct.image &&
      typeof baseProduct.image === 'string' &&
      baseProduct.image.trim() &&
      !baseProduct.image.includes('unsplash.com')
    ) {
      list.push(baseProduct.image.trim());
    }
    if (Array.isArray(baseProduct.images)) {
      baseProduct.images.forEach((img: unknown) => {
        if (
          typeof img === 'string' &&
          img.trim() &&
          !img.includes('unsplash.com') &&
          !list.includes(img.trim())
        ) {
          list.push(img.trim());
        }
      });
    }
    return list.length > 0
      ? list
      : [getCategoryDeviceImage(baseProduct.category, baseProduct.name)];
  }, [baseProduct]);

  // Parse admin specs into structured key-values
  const parsedSpecs = useMemo(() => {
    if (!baseProduct) return [];
    const rawList = Array.isArray(baseProduct.specs) ? baseProduct.specs : [];
    const result: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap }[] = [];

    rawList.forEach((specStr: string) => {
      if (typeof specStr !== 'string' || !specStr.trim()) return;
      const lower = specStr.toLowerCase();
      // Omit warranty and return policies per user request
      if (lower.includes('warranty') || lower.includes('return')) return;

      const colonIdx = specStr.indexOf(':');
      if (colonIdx !== -1) {
        const key = specStr.slice(0, colonIdx).trim();
        const val = specStr.slice(colonIdx + 1).trim();
        result.push({
          label: key,
          value: val,
          icon: getSpecIcon(key),
        });
      } else {
        result.push({
          label: 'Specification',
          value: specStr.trim(),
          icon: getSpecIcon(specStr),
        });
      }
    });

    // If admin specs are missing standard fields, append derived specs
    const labels = result.map((r) => r.label.toLowerCase());
    if (!labels.includes('brand') && baseProduct.brand) {
      result.unshift({ label: 'Brand', value: baseProduct.brand, icon: 'shield-checkmark-outline' });
    }
    if (!labels.includes('model') && baseProduct.model) {
      result.splice(1, 0, { label: 'Model', value: baseProduct.model, icon: 'phone-portrait-outline' });
    }
    if (!labels.includes('condition') && baseProduct.condition) {
      result.push({ label: 'Condition Grade', value: baseProduct.condition, icon: 'checkmark-done-circle-outline' });
    }

    return result;
  }, [baseProduct]);

  // Auto-detect admin storage and color from specs
  useEffect(() => {
    if (!baseProduct) return;
    const specs = Array.isArray(baseProduct.specs) ? baseProduct.specs : [];
    for (const s of specs) {
      if (typeof s === 'string') {
        const lower = s.toLowerCase();
        if (lower.startsWith('storage:') && !selectedStorage) {
          setSelectedStorage(s.slice(8).trim());
        }
        if (lower.startsWith('color:') && !selectedColor) {
          setSelectedColor(s.slice(6).trim());
        }
      }
    }
  }, [baseProduct, selectedStorage, selectedColor]);

  // Similar Products from same category
  useEffect(() => {
    if (!baseProduct?.category) return;
    let active = true;
    api.products
      .getAll({ category: baseProduct.category, limit: 6 })
      .then((res: any) => {
        if (!active) return;
        const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
        const filtered = list
          .filter((p: any) => String(p.id || p._id) !== String(baseProduct.id))
          .slice(0, 4)
          .map((p: any) => {
            const rawImg = p.image_url || p.imageUrl || p.image;
            const validImg =
              typeof rawImg === 'string' && rawImg.trim() && !rawImg.includes('unsplash.com')
                ? rawImg.trim()
                : getCategoryDeviceImage(p.category, p.name);
            return {
              id: String(p.id || p._id),
              name: p.name,
              discount:
                p.original_price && p.price && p.original_price > p.price
                  ? `${Math.round(((p.original_price - p.price) / p.original_price) * 100)}% OFF`
                  : '',
              image: validImg,
              price: p.price,
              raw: p,
            };
          });
        setSimilarProducts(filtered);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [baseProduct?.category, baseProduct?.id]);

  const isWishlisted = isInWishlist(baseProduct?.id || '');

  // Pricing calculations
  const price = Number(baseProduct?.price || 0);
  const originalPrice = Number(baseProduct?.originalPrice || Math.round(price * 1.35));
  const discountPercent =
    originalPrice > price && price > 0
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : 0;
  const savings = Math.max(0, originalPrice - price);

  // Stock status
  const stock = Number(baseProduct?.stock ?? 1);
  const isOutOfStock = stock <= 0;
  const isLowStock = stock > 0 && stock <= 3;

  const conditionMeta = useMemo(() => getConditionMeta(baseProduct?.condition), [baseProduct?.condition]);

  const handlePrevImage = () => {
    setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : Math.max(0, gallery.length - 1)));
  };

  const handleNextImage = () => {
    setActiveImageIndex((prev) => (prev < gallery.length - 1 ? prev + 1 : 0));
  };

  const handleToggleWishlist = () => {
    if (!baseProduct) return;
    const newState = toggleWishlist(baseProduct);
    toast.success(
      newState ? 'Added to wishlist' : 'Removed from wishlist',
      baseProduct.name
    );
  };

  const handleShare = () => {
    if (baseProduct) {
      shareProduct(baseProduct as any);
    }
  };

  const handleOpenInApp = () => {
    const prodId = baseProduct?.id || params.productId || params.id;
    if (!prodId) return;
    const deepLink = `renewx://product/${prodId}`;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.href = deepLink;
      setTimeout(() => {
        toast.info('If the RenewX app does not open, make sure it is installed on your device.');
      }, 1800);
    } else {
      Linking.openURL(deepLink).catch(() => {
        toast.info('Could not open RenewX app.');
      });
    }
  };

  const handleAddToCart = useCallback(() => {
    if (!baseProduct) return;
    if (isOutOfStock) {
      toast.info('This device is currently out of stock');
      return;
    }
    addToCart({
      ...baseProduct,
      price,
      originalPrice,
      specs: [
        selectedStorage ? `Storage: ${selectedStorage}` : '',
        selectedColor ? `Color: ${selectedColor}` : '',
        ...(baseProduct.specs || []),
      ].filter(Boolean),
    });
    toast.success('Added to your cart', `${baseProduct.name}`);
    navigation.navigate('Cart');
  }, [addToCart, baseProduct, price, originalPrice, selectedStorage, selectedColor, isOutOfStock, toast, navigation]);

  const handleRefresh = useCallback(async () => {
    const prodId = baseProduct?.id || params.productId || params.id;
    if (!prodId) return;
    setRefreshing(true);
    await loadProduct(String(prodId));
  }, [baseProduct?.id, params.productId, params.id, loadProduct]);

  if (loadingProduct) {
    return <ProductDetailSkeleton safeTop={safeTop} />;
  }

  if (!baseProduct) {
    return (
      <View style={[styles.container, { paddingTop: safeTop }]}>
        <View style={styles.topHeader}>
          <TouchableOpacity
            onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs', { screen: 'Home' }))}
            style={styles.iconBtn}
          >
            <Ionicons name="chevron-back" size={24} color="#0F172A" />
          </TouchableOpacity>
          <RenewXLogo size="md" alignCenter />
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.notFoundCenter}>
          <Ionicons name="alert-circle-outline" size={54} color="#CBD5E1" />
          <Text style={styles.notFoundTitle}>Device Not Found</Text>
          <Text style={styles.notFoundSubtitle}>
            This product is no longer available or was removed by the administrator.
          </Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <TouchableOpacity
              style={styles.exploreBtn}
              onPress={() => navigation.navigate('MainTabs', { screen: 'Shop' })}
            >
              <Text style={styles.exploreBtnText}>Browse Devices</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.exploreBtn, { backgroundColor: '#F1F5F9' }]}
              onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}
            >
              <Text style={[styles.exploreBtnText, { color: '#0F172A' }]}>Return to Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 1. Header with Share and Wishlist */}
      <HomeHeader
        mode="product-detail"
        title="Product Details"
        onBack={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs', { screen: 'Home' }))}
        onShare={handleShare}
        isWishlisted={isWishlisted}
        onToggleWishlist={handleToggleWishlist}
      />

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#FFC400"
            colors={['#FFC400', '#10B981']}
            progressBackgroundColor="#FFFFFF"
          />
        }
      >
        {/* Web App Banner: Get the RenewX App - Open in App */}
        {Platform.OS === 'web' && (
          <View style={styles.webAppBanner}>
            <View style={styles.webAppBannerLeft}>
              <View style={styles.webAppIconBadge}>
                <Ionicons name="phone-portrait" size={17} color="#0F172A" />
              </View>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.webAppBannerTitle}>Get the RenewX App</Text>
                <Text style={styles.webAppBannerSub}>
                  Enjoy certified warranty, real-time push tracking & doorstep inspection
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.webOpenAppBtn}
              onPress={handleOpenInApp}
              activeOpacity={0.85}
            >
              <Ionicons name="open-outline" size={14} color="#0F172A" style={{ marginRight: 5 }} />
              <Text style={styles.webOpenAppBtnText}>Open in App</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 2. Full-Width Device Showcase */}
        <View style={styles.heroShowcase}>
          <View style={styles.imageStage}>
            {/* Condition Tag */}
            <View style={[styles.conditionFloatingPill, { backgroundColor: conditionMeta.badgeBg }]}>
              <Ionicons name="shield-checkmark" size={12} color={conditionMeta.badgeColor} />
              <Text style={[styles.conditionFloatingText, { color: conditionMeta.badgeColor }]}>
                {conditionMeta.label}
              </Text>
            </View>

            {/* Main Device Image */}
            <Image
              source={resolveImageSource(
                gallery[activeImageIndex] || gallery[0],
                baseProduct?.category,
                baseProduct?.name
              )}
              style={styles.mainDeviceImage}
              resizeMode="contain"
            />

            {/* Counter Badge if multiple images */}
            {gallery.length > 1 && (
              <View style={styles.counterBadge}>
                <Text style={styles.counterBadgeText}>
                  {activeImageIndex + 1} / {gallery.length}
                </Text>
              </View>
            )}

            {/* Carousel navigation arrows */}
            {gallery.length > 1 && (
              <>
                <TouchableOpacity style={styles.arrowLeft} onPress={handlePrevImage} activeOpacity={0.8}>
                  <Ionicons name="chevron-back" size={18} color="#0F172A" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.arrowRight} onPress={handleNextImage} activeOpacity={0.8}>
                  <Ionicons name="chevron-forward" size={18} color="#0F172A" />
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Clean Horizontal Thumbnails Strip below image */}
          {gallery.length > 1 && (
            <View style={styles.thumbnailsRow}>
              {gallery.slice(0, 5).map((img, idx) => {
                const isActive = activeImageIndex === idx;
                const thumbSrc = resolveImageSource(img, baseProduct?.category, baseProduct?.name);
                return (
                  <TouchableOpacity
                    key={`thumb_${idx}`}
                    style={[styles.thumbnailItem, isActive && styles.thumbnailItemActive]}
                    onPress={() => setActiveImageIndex(idx)}
                    activeOpacity={0.8}
                  >
                    <Image source={thumbSrc} style={styles.thumbnailImg} resizeMode="contain" />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* 3. Horizontal Trust Assurances Bar */}
        <View style={styles.trustBar}>
          <View style={styles.trustItem}>
            <Ionicons name="shield-checkmark" size={15} color="#10B981" />
            <Text style={styles.trustTitle}>32-Pt Tested</Text>
          </View>
          <View style={styles.trustDivider} />
          <View style={styles.trustItem}>
            <Ionicons name="checkmark-circle-outline" size={15} color="#0284C7" />
            <Text style={styles.trustTitle}>100% Genuine</Text>
          </View>
          <View style={styles.trustDivider} />
          <View style={styles.trustItem}>
            <Ionicons name="flash-outline" size={15} color="#D97706" />
            <Text style={styles.trustTitle}>Free Delivery</Text>
          </View>
          <View style={styles.trustDivider} />
          <View style={styles.trustItem}>
            <Ionicons name="lock-closed-outline" size={15} color="#7C3AED" />
            <Text style={styles.trustTitle}>Secure Pay</Text>
          </View>
        </View>

        {/* 4. Product Title, Pricing & Live Stock Card */}
        <View style={styles.infoCard}>
          {/* Breadcrumb Tags */}
          <View style={styles.breadcrumbRow}>
            <Text style={styles.breadcrumbText}>
              {baseProduct.category || 'Electronics'}
              {baseProduct.brand ? `  ›  ${baseProduct.brand}` : ''}
              {baseProduct.model ? `  ›  ${baseProduct.model}` : ''}
            </Text>
          </View>

          {/* Product Name */}
          <Text style={styles.productTitle}>{baseProduct.name}</Text>

          {/* Rating & Condition Row */}
          <View style={styles.ratingConditionRow}>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={12} color="#F59E0B" />
              <Text style={styles.ratingNumber}>{Number(baseProduct.rating || 4.8).toFixed(1)}</Text>
            </View>
            <Text style={styles.ratingCount}>
              ({baseProduct.reviews || 36} ratings)
            </Text>
            <Text style={styles.dotDivider}>•</Text>
            <View style={[styles.inlineConditionTag, { backgroundColor: conditionMeta.badgeBg }]}>
              <Text style={[styles.inlineConditionText, { color: conditionMeta.badgeColor }]}>
                {conditionMeta.label}
              </Text>
            </View>
          </View>

          {/* Price Row */}
          <View style={styles.priceRow}>
            <Text style={styles.currentPriceText}>{formatMoney(price)}</Text>
            {originalPrice > price && (
              <>
                <Text style={styles.originalPriceText}>{formatMoney(originalPrice)}</Text>
                <View style={styles.discountBadge}>
                  <Text style={styles.discountBadgeText}>{discountPercent}% OFF</Text>
                </View>
              </>
            )}
          </View>

          {savings > 0 ? (
            <Text style={styles.savingsText}>
              You save {formatMoney(savings)} · Free express doorstep delivery
            </Text>
          ) : (
            <Text style={styles.savingsText}>
              Inclusive of all taxes · Free express doorstep delivery
            </Text>
          )}

          {/* Live Admin Stock Status */}
          <View style={styles.stockContainer}>
            {isOutOfStock ? (
              <View style={styles.outOfStockBadge}>
                <Ionicons name="close-circle" size={14} color="#DC2626" />
                <Text style={styles.outOfStockText}>Currently Out of Stock</Text>
              </View>
            ) : isLowStock ? (
              <View style={styles.lowStockBadge}>
                <Ionicons name="flame" size={14} color="#D97706" />
                <Text style={styles.lowStockText}>Hurry! Only {stock} units left in stock</Text>
              </View>
            ) : (
              <View style={styles.inStockBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
                <Text style={styles.inStockText}>In Stock · {stock} units ready to ship</Text>
              </View>
            )}
          </View>
        </View>

        {/* 5. Unified Device Specifications Card */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionCardHeader}>
            <Ionicons name="hardware-chip-outline" size={17} color="#0F172A" />
            <Text style={styles.sectionCardTitle}>Device Specifications</Text>
            <View style={styles.verifiedTag}>
              <Ionicons name="checkmark-done" size={12} color="#059669" />
              <Text style={styles.verifiedTagText}>Admin Verified</Text>
            </View>
          </View>

          {/* Configuration Chips */}
          <View style={styles.configChipsRow}>
            {selectedStorage ? (
              <View style={styles.configChip}>
                <Text style={styles.configChipLabel}>Storage</Text>
                <Text style={styles.configChipValue}>{selectedStorage}</Text>
              </View>
            ) : null}
            {selectedColor ? (
              <View style={styles.configChip}>
                <Text style={styles.configChipLabel}>Color</Text>
                <Text style={styles.configChipValue}>{selectedColor}</Text>
              </View>
            ) : null}
            <View style={styles.configChip}>
              <Text style={styles.configChipLabel}>Condition</Text>
              <Text style={styles.configChipValue}>{baseProduct.condition || 'Excellent'}</Text>
            </View>
            {baseProduct.brand ? (
              <View style={styles.configChip}>
                <Text style={styles.configChipLabel}>Brand</Text>
                <Text style={styles.configChipValue}>{baseProduct.brand}</Text>
              </View>
            ) : null}
          </View>

          {/* Admin Specs Table */}
          {parsedSpecs.length > 0 && (
            <View style={styles.specsTable}>
              {parsedSpecs.map((item, idx) => (
                <View key={`spec_${idx}`} style={[styles.specRow, idx > 0 && styles.specRowBorder]}>
                  <View style={styles.specIconWrap}>
                    <Ionicons name={item.icon} size={15} color="#0284C7" />
                  </View>
                  <Text style={styles.specLabel}>{item.label}</Text>
                  <Text style={styles.specValue}>{item.value}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* 6. Condition & Quality Inspection Report */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionCardHeader}>
            <Ionicons name="shield-checkmark-outline" size={17} color="#16A34A" />
            <Text style={styles.sectionCardTitle}>Condition Report: {conditionMeta.label}</Text>
          </View>
          <Text style={styles.conditionSummaryText}>{conditionMeta.summary}</Text>

          <View style={styles.bulletsList}>
            {conditionMeta.bullets.map((bullet, i) => (
              <View key={`cond_b_${i}`} style={styles.bulletItem}>
                <Ionicons name="checkmark-circle" size={15} color="#16A34A" style={styles.bulletCheck} />
                <Text style={styles.bulletText}>{bullet}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 7. Product Description & Package Contents */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionCardHeader}>
            <Ionicons name="document-text-outline" size={17} color="#0F172A" />
            <Text style={styles.sectionCardTitle}>About This Device</Text>
          </View>

          <Text style={styles.descriptionBody} numberOfLines={showFullDescription ? undefined : 4}>
            {baseProduct.description
              ? baseProduct.description
              : `${baseProduct.name} has been thoroughly tested, certified, and cleaned by RenewX technicians. Comes complete with genuine performance, battery health above 85%, and fully verified authentic components.`}
          </Text>

          {baseProduct.description && baseProduct.description.length > 180 && (
            <TouchableOpacity
              onPress={() => setShowFullDescription((prev) => !prev)}
              style={styles.toggleDescBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.toggleDescText}>
                {showFullDescription ? 'Show Less' : 'Read Full Description'}
              </Text>
              <Ionicons name={showFullDescription ? 'chevron-up' : 'chevron-down'} size={14} color="#0284C7" />
            </TouchableOpacity>
          )}

          {/* In the box breakdown */}
          <View style={styles.inTheBoxSection}>
            <Text style={styles.inTheBoxTitle}>In The Box</Text>
            <View style={styles.boxGrid}>
              <View style={styles.boxGridItem}>
                <Ionicons name="phone-portrait-outline" size={15} color="#0284C7" />
                <Text style={styles.boxGridText}>1x Certified {baseProduct.name}</Text>
              </View>
              <View style={styles.boxGridItem}>
                <Ionicons name="flash-outline" size={15} color="#0284C7" />
                <Text style={styles.boxGridText}>1x Charging Adapter & Cable</Text>
              </View>
              <View style={styles.boxGridItem}>
                <Ionicons name="shield-checkmark-outline" size={15} color="#16A34A" />
                <Text style={styles.boxGridText}>1x RenewX Quality Certificate & Diagnostics Pass</Text>
              </View>
              <View style={styles.boxGridItem}>
                <Ionicons name="cube-outline" size={15} color="#0284C7" />
                <Text style={styles.boxGridText}>Eco-Friendly Certified Protective Packaging</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 8. Delivery & Payment Assurance */}
        <View style={styles.sectionCard}>
          <View style={styles.deliveryRow}>
            <View style={styles.deliveryPinCircle}>
              <Ionicons name="location" size={16} color="#0F172A" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.deliveryHeadline}>Express Doorstep Delivery</Text>
              <Text style={styles.deliverySubtext}>Dispatches in 24 hours · Delivering in 2–4 business days</Text>
            </View>
            <View style={styles.freeDeliveryPill}>
              <Text style={styles.freeDeliveryText}>FREE</Text>
            </View>
          </View>

          <View style={styles.assuranceBadgesRow}>
            <View style={styles.assuranceBadge}>
              <Ionicons name="card-outline" size={13} color="#0284C7" />
              <Text style={styles.assuranceBadgeText}>Razorpay Instant</Text>
            </View>
            <View style={styles.assuranceBadge}>
              <Ionicons name="cash-outline" size={13} color="#16A34A" />
              <Text style={styles.assuranceBadgeText}>Cash on Delivery</Text>
            </View>
            <View style={styles.assuranceBadge}>
              <Ionicons name="shield-checkmark-outline" size={13} color="#D97706" />
              <Text style={styles.assuranceBadgeText}>100% Genuine</Text>
            </View>
          </View>
        </View>

        {/* 9. Similar Devices Carousel */}
        {similarProducts.length > 0 && (
          <View style={styles.similarSection}>
            <View style={styles.similarHeader}>
              <Text style={styles.similarTitle}>Similar {baseProduct.category || 'Devices'}</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('MainTabs', { screen: 'Shop', params: { category: baseProduct.category } })}
                style={styles.similarViewAll}
                activeOpacity={0.7}
              >
                <Text style={styles.similarViewAllText}>View All</Text>
                <Ionicons name="arrow-forward" size={13} color="#475569" />
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.similarScroll}>
              {similarProducts.map((prod) => (
                <TouchableOpacity
                  key={prod.id}
                  style={styles.similarCard}
                  onPress={() => {
                    navigation.push('ProductDetail', {
                      product: prod.raw || prod,
                    });
                  }}
                  activeOpacity={0.88}
                >
                  {prod.discount ? (
                    <View style={styles.similarDiscountPill}>
                      <Text style={styles.similarDiscountText}>{prod.discount}</Text>
                    </View>
                  ) : null}

                  <Image
                    source={resolveImageSource(prod.image, prod.raw?.category || baseProduct?.category, prod.name)}
                    style={styles.similarImage}
                    resizeMode="contain"
                  />
                  <Text style={styles.similarName} numberOfLines={1}>
                    {prod.name}
                  </Text>
                  <Text style={styles.similarPrice}>{formatMoney(prod.price)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* 10. Sticky Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomPriceCol}>
          <Text style={styles.bottomPriceText}>{formatMoney(price)}</Text>
          {originalPrice > price && (
            <Text style={styles.bottomMrpText}>{formatMoney(originalPrice)}</Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.wishlistBtn}
          onPress={handleToggleWishlist}
          activeOpacity={0.85}
        >
          <Ionicons
            name={isWishlisted ? 'heart' : 'heart-outline'}
            size={20}
            color={isWishlisted ? '#EF4444' : '#0F172A'}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.addToCartBtn, isOutOfStock && styles.addToCartBtnDisabled]}
          onPress={handleAddToCart}
          disabled={isOutOfStock}
          activeOpacity={0.88}
        >
          <Ionicons
            name={isOutOfStock ? 'close-circle' : 'cart'}
            size={18}
            color={isOutOfStock ? '#94A3B8' : '#000000'}
            style={{ marginRight: 8 }}
          />
          <Text style={[styles.addToCartBtnText, isOutOfStock && styles.addToCartBtnTextDisabled]}>
            {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  notFoundTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  notFoundSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  exploreBtn: {
    backgroundColor: '#FBBF24',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 10,
  },
  exploreBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },

  // 1. Full-Width Device Showcase & Image Stage
  heroShowcase: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    alignItems: 'center',
  },
  imageStage: {
    width: '100%',
    height: 290,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  conditionFloatingPill: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
    zIndex: 5,
  },
  conditionFloatingText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  mainDeviceImage: {
    width: '82%',
    height: '82%',
  },
  counterBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  counterBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  arrowLeft: {
    position: 'absolute',
    left: 10,
    top: '50%',
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
  },
  arrowRight: {
    position: 'absolute',
    right: 10,
    top: '50%',
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
  },
  thumbnailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 12,
  },
  thumbnailItem: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  thumbnailItemActive: {
    borderColor: '#0284C7',
    backgroundColor: '#F0F9FF',
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
  },

  // 2. Horizontal Trust Assurances Bar
  trustBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  trustItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  trustTitle: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#334155',
  },
  trustDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#CBD5E1',
  },

  // 3. Product Info Card (Breadcrumbs, Title, Rating, Price, Stock)
  infoCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  breadcrumbRow: {
    marginBottom: 6,
  },
  breadcrumbText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  productTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 26,
    marginBottom: 8,
  },
  ratingConditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
    gap: 3,
  },
  ratingNumber: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#92400E',
  },
  ratingCount: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '500',
  },
  dotDivider: {
    fontSize: 12,
    color: '#CBD5E1',
    marginHorizontal: 2,
  },
  inlineConditionTag: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  inlineConditionText: {
    fontSize: 11,
    fontWeight: '700',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 6,
  },
  currentPriceText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
  },
  originalPriceText: {
    fontSize: 14,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
    fontWeight: '600',
  },
  discountBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  discountBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803D',
  },
  savingsText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
    marginBottom: 12,
  },
  stockContainer: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  inStockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inStockText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16A34A',
  },
  lowStockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lowStockText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
  },
  outOfStockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  outOfStockText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },

  // 4. Section Card Common Layout
  sectionCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionCardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  verifiedTagText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#059669',
  },

  // 5. Specs & Quick Configuration
  configChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  configChip: {
    flex: 1,
    minWidth: 70,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  configChipLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  configChipValue: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  specsTable: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  specRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  specRowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  specIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  specLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  specValue: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'right',
  },

  // 6. Condition Inspection
  conditionSummaryText: {
    fontSize: 12.5,
    color: '#334155',
    lineHeight: 18,
    marginBottom: 10,
  },
  bulletsList: {
    gap: 7,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bulletCheck: {
    marginTop: 1,
  },
  bulletText: {
    flex: 1,
    fontSize: 12,
    color: '#334155',
    lineHeight: 17,
  },

  // 7. Description & In The Box
  descriptionBody: {
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 19,
  },
  toggleDescBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  toggleDescText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  inTheBoxSection: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  inTheBoxTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  boxGrid: {
    gap: 6,
  },
  boxGridItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  boxGridText: {
    fontSize: 11.5,
    color: '#475569',
    fontWeight: '500',
  },

  // 8. Delivery & Assurance
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  deliveryPinCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deliveryHeadline: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  deliverySubtext: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  freeDeliveryPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  freeDeliveryText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#15803D',
  },
  assuranceBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    gap: 6,
  },
  assuranceBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderRadius: 8,
    gap: 4,
  },
  assuranceBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#334155',
  },

  // 9. Similar Devices
  similarSection: {
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 16,
  },
  similarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  similarTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  similarViewAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  similarViewAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  similarScroll: {
    gap: 10,
  },
  similarCard: {
    width: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    position: 'relative',
  },
  similarDiscountPill: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#EF4444',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 2,
  },
  similarDiscountText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  similarImage: {
    width: '100%',
    height: 90,
    marginBottom: 8,
  },
  similarName: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  similarPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0284C7',
  },

  // 10. Bottom Sticky Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 12,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  bottomPriceCol: {
    justifyContent: 'center',
    minWidth: 80,
  },
  bottomPriceText: {
    fontSize: 19,
    fontWeight: '900',
    color: '#0F172A',
  },
  bottomMrpText: {
    fontSize: 11,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  wishlistBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addToCartBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FACC15',
    borderRadius: 22,
    paddingVertical: 12,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  addToCartBtnDisabled: {
    backgroundColor: '#F1F5F9',
    shadowOpacity: 0,
    elevation: 0,
  },
  addToCartBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000000',
  },
  addToCartBtnTextDisabled: {
    color: '#94A3B8',
  },
  webAppBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 6,
    backgroundColor: '#FEF9C3',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#FDE047',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  webAppBannerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  webAppIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FACC15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webAppBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  webAppBannerSub: {
    fontSize: 11,
    color: '#854D0E',
    fontWeight: '500',
    marginTop: 1,
  },
  webOpenAppBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FACC15',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  webOpenAppBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
  },
});
