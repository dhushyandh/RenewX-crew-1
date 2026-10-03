import React, { useState, useMemo, useCallback } from 'react';
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
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
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

function formatMoney(value: number) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`;
}

const COLOR_OPTIONS = [
  { id: 'deep_purple', name: 'Deep Purple', colorHex: '#4E3C56', ringColor: '#FACC15' },
  { id: 'gold', name: 'Gold', colorHex: '#F5E7D3', ringColor: '#E2E8F0' },
  { id: 'silver', name: 'Silver', colorHex: '#E2E4E7', ringColor: '#E2E8F0' },
  { id: 'space_black', name: 'Space Black', colorHex: '#2B2B2D', ringColor: '#E2E8F0' },
];

const STORAGE_OPTIONS = [
  { size: '128 GB', priceDelta: 0, mrpDelta: 0 },
  { size: '256 GB', priceDelta: 6000, mrpDelta: 8000 },
  { size: '512 GB', priceDelta: 14000, mrpDelta: 18000 },
];

export default function ProductDetailScreen() {
  const safeTop = useSafeHeaderTop();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const params = route.params || {};

  const { addToCart, totalItems } = useCart();
  const toast = useToast();
  const { isInWishlist, toggleWishlist } = useWishlist();

  const [fetchedProduct, setFetchedProduct] = useState<any>(null);
  const [loadingProduct, setLoadingProduct] = useState<boolean>(!params.product && !!(params.productId || params.id));
  const [similarProducts, setSimilarProducts] = useState<any[]>([]);

  React.useEffect(() => {
    const prodId = params.productId || params.id;
    if (!params.product && prodId) {
      setLoadingProduct(true);
      api.products.getById(prodId)
        .then((res: any) => {
          const item = res?.data || res;
          if (item) setFetchedProduct(mapProductRow(item));
        })
        .catch(() => {})
        .finally(() => setLoadingProduct(false));
    }
  }, [params.productId, params.id, params.product]);

  // Real mapped product
  const baseProduct = useMemo(() => {
    if (params.product) return mapProductRow(params.product);
    if (fetchedProduct) return fetchedProduct;
    return null;
  }, [params.product, fetchedProduct]);

  React.useEffect(() => {
    if (!baseProduct?.category) return;
    let active = true;
    api.products.getAll({ category: baseProduct.category, limit: 4 })
      .then((res: any) => {
        if (!active) return;
        const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
        const filtered = list
          .filter((p: any) => String(p.id || p._id) !== String(baseProduct.id))
          .slice(0, 4)
          .map((p: any) => ({
            id: String(p.id || p._id),
            name: p.name,
            discount: p.original_price && p.price ? `${Math.round(((p.original_price - p.price) / p.original_price) * 100)}% OFF` : '',
            image: p.image_url || p.imageUrl || p.image || 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&q=80',
            price: p.price,
            raw: p,
          }));
        setSimilarProducts(filtered);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [baseProduct?.category, baseProduct?.id]);

  // Gallery state
  const gallery = useMemo(() => {
    if (!baseProduct) return [];
    const customImages = Array.isArray(baseProduct.images) ? baseProduct.images.filter(Boolean) : [];
    if (customImages.length > 0) {
      return Array.from(new Set([baseProduct.image, ...customImages].filter(Boolean)));
    }
    return baseProduct.image ? [baseProduct.image] : [];
  }, [baseProduct]);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedStorage, setSelectedStorage] = useState('128 GB');
  const [selectedColor, setSelectedColor] = useState('Deep Purple');
  const isWishlisted = isInWishlist(baseProduct?.id || '');

  // Dynamic pricing based on storage
  const storageOption = STORAGE_OPTIONS.find((s) => s.size === selectedStorage) || STORAGE_OPTIONS[0];
  const currentPrice = (baseProduct?.price || 0) + storageOption.priceDelta;
  const currentOriginalPrice = ((baseProduct?.originalPrice || Math.round((baseProduct?.price || 0) * 1.38))) + storageOption.mrpDelta;
  const discountPercent = currentOriginalPrice > 0 ? Math.round(((currentOriginalPrice - currentPrice) / currentOriginalPrice) * 100) : 0;

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

  const handleAddToCart = useCallback(() => {
    if (!baseProduct) return;
    addToCart({
      ...baseProduct,
      price: currentPrice,
      originalPrice: currentOriginalPrice,
      specs: [
        `${selectedStorage} | ${selectedColor}`,
        ...(baseProduct.specs || []),
      ],
    });
    toast.success('Added to your cart', `${baseProduct.name} (${selectedStorage})`);
  }, [addToCart, baseProduct, currentPrice, currentOriginalPrice, selectedStorage, selectedColor, toast]);

  if (loadingProduct) {
    return (
      <View style={[styles.container, { paddingTop: safeTop, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#F59E0B" />
        <Text style={{ marginTop: 12, fontSize: 13, color: '#64748B' }}>Loading device details...</Text>
      </View>
    );
  }

  if (!baseProduct) {
    return (
      <View style={[styles.container, { paddingTop: safeTop }]}>
        <View style={styles.topHeader}>
          <TouchableOpacity onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs', { screen: 'Home' }))} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={24} color="#0F172A" />
          </TouchableOpacity>
          <RenewXLogo size="md" alignCenter />
          <View style={{ width: 40 }} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
          <Ionicons name="alert-circle-outline" size={54} color="#CBD5E1" />
          <Text style={{ fontSize: 17, fontWeight: '800', color: '#0F172A' }}>Device Not Found</Text>
          <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center' }}>
            This device is no longer available or was not found in our catalog.
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: '#FBBF24', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginTop: 10 }}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Shop' })}
          >
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>Explore Devices</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 1. Header (Matching Reference Image 1: Product Details, Share, Heart) */}
      <HomeHeader
        mode="product-detail"
        title="Product Details"
        onBack={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs', { screen: 'Home' }))}
        onShare={handleShare}
        isWishlisted={isWishlisted}
        onToggleWishlist={handleToggleWishlist}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. Top Showcase Section: Main Preview + Vertical Thumbnails + Vertical Value Props */}
        <View style={styles.showcaseSection}>
          {/* A. Main Device Preview with Carousel Arrows & Indicator */}
          <View style={styles.mainPreviewContainer}>
            <Image
              source={{ uri: gallery[activeImageIndex] || gallery[0] }}
              style={styles.mainPreviewImage}
              resizeMode="contain"
            />

            {/* Left Carousel Arrow */}
            <TouchableOpacity style={styles.carouselArrowLeft} onPress={handlePrevImage} activeOpacity={0.8}>
              <Ionicons name="chevron-back" size={18} color="#0F172A" />
            </TouchableOpacity>

            {/* Right Carousel Arrow */}
            <TouchableOpacity style={styles.carouselArrowRight} onPress={handleNextImage} activeOpacity={0.8}>
              <Ionicons name="chevron-forward" size={18} color="#0F172A" />
            </TouchableOpacity>

            {/* Bottom 1 / 6 Counter Pill */}
            <View style={styles.counterPill}>
              <Text style={styles.counterPillText}>
                {activeImageIndex + 1} / {gallery.length + 1}
              </Text>
            </View>
          </View>

          {/* B. Vertical Thumbnail Strip (4 images + 1 video thumbnail) */}
          <View style={styles.thumbnailStrip}>
            {gallery.slice(0, 4).map((uri, idx) => {
              const isActive = activeImageIndex === idx;
              return (
                <TouchableOpacity
                  key={`thumb_${idx}`}
                  style={[styles.thumbBox, isActive && styles.thumbBoxActive]}
                  onPress={() => setActiveImageIndex(idx)}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri }} style={styles.thumbImage} resizeMode="contain" />
                </TouchableOpacity>
              );
            })}

            {/* 5th Video Thumbnail */}
            <TouchableOpacity
              style={[styles.thumbBox, styles.videoThumbBox, activeImageIndex === 4 && styles.thumbBoxActive]}
              onPress={() => setActiveImageIndex(4)}
              activeOpacity={0.8}
            >
              <View style={styles.videoPlayCircle}>
                <Ionicons name="play" size={12} color="#FFFFFF" style={{ marginLeft: 2 }} />
              </View>
            </TouchableOpacity>
          </View>

          {/* C. Vertical Value Propositions List */}
          <View style={styles.valuePropsCol}>
            <View style={styles.valuePropItem}>
              <View style={styles.valuePropIconCircle}>
                <Ionicons name="shield-checkmark-outline" size={17} color="#0F172A" />
              </View>
              <Text style={styles.valuePropText}>Quality</Text>
              <Text style={styles.valuePropText}>Checked</Text>
            </View>

            <View style={styles.valuePropItem}>
              <View style={styles.valuePropIconCircle}>
                <Ionicons name="sync-outline" size={17} color="#0F172A" />
              </View>
              <Text style={styles.valuePropText}>6 Months</Text>
              <Text style={styles.valuePropText}>Warranty</Text>
            </View>

            <View style={styles.valuePropItem}>
              <View style={styles.valuePropIconCircle}>
                <Ionicons name="leaf-outline" size={17} color="#0F172A" />
              </View>
              <Text style={styles.valuePropText}>Refurbished</Text>
              <Text style={styles.valuePropText}>& Sustainable</Text>
            </View>

            <View style={styles.valuePropItem}>
              <View style={styles.valuePropIconCircle}>
                <Ionicons name="cube-outline" size={17} color="#0F172A" />
              </View>
              <Text style={styles.valuePropText}>7 Days</Text>
              <Text style={styles.valuePropText}>Replacement</Text>
            </View>
          </View>
        </View>

        {/* 3. Product Title, Refurbished Badge & Reviews */}
        <View style={styles.titleSection}>
          <Text style={styles.productTitle}>{baseProduct.name}</Text>

          <View style={styles.badgeReviewRow}>
            <View style={styles.refurbishedPill}>
              <Text style={styles.refurbishedPillText}>Refurbished • {baseProduct.condition || 'Excellent'}</Text>
            </View>

            <View style={styles.ratingRow}>
              <Ionicons name="star" size={14} color="#F59E0B" />
              <Text style={styles.ratingNumber}>4.6</Text>
              <Text style={styles.ratingCount}>(1.2K reviews)</Text>
            </View>
          </View>

          {/* Pricing Row */}
          <View style={styles.priceRow}>
            <Text style={styles.currentPriceText}>{formatMoney(currentPrice)}</Text>
            <Text style={styles.originalPriceText}>{formatMoney(currentOriginalPrice)}</Text>
            <View style={styles.discountBadge}>
              <Text style={styles.discountBadgeText}>{discountPercent}% OFF</Text>
            </View>
          </View>
          <Text style={styles.taxesSubtext}>Inclusive of all taxes</Text>
        </View>

        {/* 4. Selectors Row: Storage & Color */}
        <View style={styles.selectorsRow}>
          {/* Storage Column */}
          <View style={styles.storageCol}>
            <Text style={styles.selectorLabel}>Storage</Text>
            <View style={styles.storagePillsRow}>
              {STORAGE_OPTIONS.map((opt) => {
                const isSelected = selectedStorage === opt.size;
                return (
                  <TouchableOpacity
                    key={opt.size}
                    style={[styles.storagePill, isSelected && styles.storagePillSelected]}
                    onPress={() => setSelectedStorage(opt.size)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.storagePillText, isSelected && styles.storagePillTextSelected]}>
                      {opt.size}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Color Column */}
          <View style={styles.colorCol}>
            <Text style={styles.selectorLabel}>Color</Text>
            <View style={styles.colorSwatchesRow}>
              {COLOR_OPTIONS.map((clr) => {
                const isSelected = selectedColor === clr.name;
                return (
                  <TouchableOpacity
                    key={clr.id}
                    style={styles.colorItem}
                    onPress={() => setSelectedColor(clr.name)}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.colorSwatchOuter,
                        isSelected && { borderColor: '#FACC15', borderWidth: 2 },
                      ]}
                    >
                      <View style={[styles.colorSwatchInner, { backgroundColor: clr.colorHex }]} />
                    </View>
                    <Text style={[styles.colorLabel, isSelected && styles.colorLabelSelected]} numberOfLines={1}>
                      {clr.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* 5. Key Specs Highlight Card (4 horizontal items) */}
        <View style={styles.specsCard}>
          <View style={styles.specBoxItem}>
            <Ionicons name="logo-apple" size={18} color="#0F172A" />
            <Text style={styles.specBoxText}>A16 Bionic Chip</Text>
          </View>

          <View style={styles.specBoxItem}>
            <Ionicons name="phone-portrait-outline" size={18} color="#0F172A" />
            <Text style={styles.specBoxText}>6.1" Super Retina XDR Display</Text>
          </View>

          <View style={styles.specBoxItem}>
            <Ionicons name="camera-outline" size={18} color="#0F172A" />
            <Text style={styles.specBoxText}>48 MP Triple Camera</Text>
          </View>

          <View style={styles.specBoxItem}>
            <Ionicons name="battery-charging-outline" size={18} color="#0F172A" />
            <Text style={styles.specBoxText}>3200 mAh All-day Battery</Text>
          </View>
        </View>

        {/* 6. Condition: Excellent Card */}
        <View style={styles.conditionCard}>
          <View style={styles.conditionHeaderRow}>
            <Text style={styles.conditionTitle}>Condition: Excellent</Text>
            <TouchableOpacity
              onPress={() => Alert.alert('RenewX Condition Grading', 'Excellent: Flawless screen, minimal body signs, 100% battery performance tested, and backed by a 6-month warranty.')}
              style={{ flexDirection: 'row', alignItems: 'center' }}
            >
              <Ionicons name="information-circle-outline" size={14} color="#64748B" style={{ marginRight: 3 }} />
              <Text style={styles.conditionLearnMore}>Learn about conditions</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.conditionBodyRow}>
            {/* Bullets */}
            <View style={styles.conditionBulletsCol}>
              {[
                'Fully functional and tested by experts',
                'Minimal signs of previous use',
                'Original parts with genuine performance',
                'Comes with charger and cable',
              ].map((bullet, i) => (
                <View key={i} style={styles.bulletRow}>
                  <Ionicons name="checkmark-circle" size={16} color="#16A34A" style={{ marginRight: 6 }} />
                  <Text style={styles.bulletText}>{bullet}</Text>
                </View>
              ))}
            </View>

            {/* Camera module thumbnail */}
            <View style={styles.conditionImageWrap}>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=400&q=80' }}
                style={styles.conditionImage}
                resizeMode="cover"
              />
            </View>
          </View>
        </View>

        {/* 7. Deliver to Bangalore & Free Delivery Section */}
        <View style={styles.deliveryCard}>
          <TouchableOpacity
            style={styles.deliveryLocationRow}
            onPress={() => Alert.alert('Delivery Location', 'Current delivery location is set to Bangalore - 560004.')}
            activeOpacity={0.8}
          >
            <Ionicons name="location" size={16} color="#0F172A" style={{ marginRight: 6 }} />
            <Text style={styles.deliveryLocationText}>Deliver to Bangalore - 560004</Text>
            <Ionicons name="chevron-down" size={14} color="#0F172A" style={{ marginLeft: 4 }} />
          </TouchableOpacity>

          <View style={styles.deliveryDivider} />

          <View style={styles.freeDeliveryRow}>
            <View style={styles.truckIconCircle}>
              <Ionicons name="car-outline" size={18} color="#0F172A" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.freeDeliveryTitle}>Free Delivery</Text>
              <Text style={styles.freeDeliverySubtitle}>3 - 5 business days</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
          </View>
        </View>

        {/* 8. RenewX Certified Banner */}
        <View style={styles.certifiedBanner}>
          <View style={styles.certifiedShieldCircle}>
            <Ionicons name="shield-checkmark" size={18} color="#16A34A" />
          </View>

          <View style={styles.certifiedTextCol}>
            <Text style={styles.certifiedTitle}>RenewX Certified</Text>
            <Text style={styles.certifiedSubtitle}>Quality checked devices with warranty</Text>
          </View>

          <View style={styles.certifiedWarrantyPill}>
            <Ionicons name="shield-checkmark" size={12} color="#16A34A" style={{ marginRight: 4 }} />
            <Text style={styles.certifiedWarrantyText}>6 Months Warranty</Text>
          </View>
        </View>

        {/* 9. Similar Products Carousel */}
        {similarProducts.length > 0 && (
          <View style={styles.similarSection}>
            <View style={styles.similarHeaderRow}>
              <Text style={styles.similarTitle}>Similar Products</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('MainTabs', { screen: 'Shop' })}
                style={{ flexDirection: 'row', alignItems: 'center' }}
              >
                <Text style={styles.similarViewAll}>View All</Text>
                <Ionicons name="arrow-forward" size={13} color="#475569" style={{ marginLeft: 2 }} />
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.similarList}>
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
                  {/* Yellow discount badge */}
                  {prod.discount ? (
                    <View style={styles.similarDiscountPill}>
                      <Text style={styles.similarDiscountText}>{prod.discount}</Text>
                    </View>
                  ) : null}

                  {/* Heart */}
                  <TouchableOpacity
                    style={styles.similarHeartBtn}
                    onPress={() => Alert.alert('Wishlist', `${prod.name} saved.`)}
                  >
                    <Ionicons name="heart-outline" size={15} color="#475569" />
                  </TouchableOpacity>

                  <Image source={{ uri: prod.image }} style={styles.similarImage} resizeMode="contain" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* 10. Bottom Sticky Bar: Add to Wishlist + Add to Cart */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.wishlistBtn}
          onPress={handleToggleWishlist}
          activeOpacity={0.85}
        >
          <Ionicons
            name={isWishlisted ? 'heart' : 'heart-outline'}
            size={18}
            color={isWishlisted ? '#EF4444' : '#0F172A'}
            style={{ marginRight: 6 }}
          />
          <Text style={styles.wishlistBtnText}>Add to Wishlist</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.addToCartBtn}
          onPress={handleAddToCart}
          activeOpacity={0.88}
        >
          <Ionicons name="cart" size={18} color="#000000" style={{ marginRight: 8 }} />
          <Text style={styles.addToCartBtnText}>Add to Cart</Text>
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
  brandTitleRow: {
    alignItems: 'center',
  },
  brandName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  brandNameYellow: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F59E0B',
  },
  brandTagline: {
    fontSize: 9.5,
    color: '#64748B',
    marginTop: -2,
  },
  headerRightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cartIconContainer: {
    position: 'relative',
    padding: 2,
  },
  cartBadgeCircle: {
    position: 'absolute',
    top: -4,
    right: -6,
    width: 17,
    height: 17,
    borderRadius: 8.5,
    backgroundColor: '#FACC15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#000000',
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },

  // Showcase Section (3 columns: Main preview, thumbnails strip, value props)
  showcaseSection: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    gap: 12,
  },
  mainPreviewContainer: {
    flex: 1,
    height: 250,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  mainPreviewImage: {
    width: '88%',
    height: '88%',
  },
  carouselArrowLeft: {
    position: 'absolute',
    left: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  carouselArrowRight: {
    position: 'absolute',
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  counterPill: {
    position: 'absolute',
    bottom: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  counterPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Thumbnails Strip
  thumbnailStrip: {
    width: 48,
    gap: 6,
    justifyContent: 'space-between',
  },
  thumbBox: {
    width: 46,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbBoxActive: {
    borderColor: '#FACC15',
    borderWidth: 2,
  },
  thumbImage: {
    width: '85%',
    height: '85%',
  },
  videoThumbBox: {
    backgroundColor: '#2E1065',
  },
  videoPlayCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Value Props Column
  valuePropsCol: {
    width: 78,
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  valuePropItem: {
    alignItems: 'center',
  },
  valuePropIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  valuePropText: {
    fontSize: 8.5,
    fontWeight: '600',
    color: '#0F172A',
    textAlign: 'center',
    lineHeight: 11,
  },

  // Title & Reviews
  titleSection: {
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  productTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  badgeReviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  refurbishedPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 14,
  },
  refurbishedPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingNumber: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  ratingCount: {
    fontSize: 12,
    color: '#64748B',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  currentPriceText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
  },
  originalPriceText: {
    fontSize: 14,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  discountBadgeText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#15803D',
  },
  taxesSubtext: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },

  // Selectors Row
  selectorsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 16,
  },
  storageCol: {
    flex: 1.1,
  },
  colorCol: {
    flex: 1.4,
  },
  selectorLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  storagePillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  storagePill: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  storagePillSelected: {
    borderColor: '#FACC15',
    backgroundColor: '#FEFCE8',
  },
  storagePillText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  storagePillTextSelected: {
    fontWeight: '800',
    color: '#0F172A',
  },

  // Colors
  colorSwatchesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  colorItem: {
    alignItems: 'center',
    width: 48,
  },
  colorSwatchOuter: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  colorSwatchInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  colorLabel: {
    fontSize: 9.5,
    color: '#64748B',
    textAlign: 'center',
  },
  colorLabelSelected: {
    fontWeight: '700',
    color: '#0F172A',
  },

  // Key Specs Strip Card
  specsCard: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 16,
    justifyContent: 'space-around',
  },
  specBoxItem: {
    alignItems: 'center',
    width: '24%',
  },
  specBoxText: {
    fontSize: 8.5,
    fontWeight: '600',
    color: '#0F172A',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 11,
  },

  // Condition Card
  conditionCard: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  conditionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  conditionTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  conditionLearnMore: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  conditionBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  conditionBulletsCol: {
    flex: 1,
    paddingRight: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  bulletText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '500',
    flex: 1,
  },
  conditionImageWrap: {
    width: 90,
    height: 80,
    borderRadius: 10,
    overflow: 'hidden',
  },
  conditionImage: {
    width: '100%',
    height: '100%',
  },

  // Delivery Card
  deliveryCard: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  deliveryLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deliveryLocationText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  deliveryDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  freeDeliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  truckIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  freeDeliveryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  freeDeliverySubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },

  // Certified Banner
  certifiedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  certifiedShieldCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  certifiedTextCol: {
    flex: 1,
  },
  certifiedTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  certifiedSubtitle: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 1,
  },
  certifiedWarrantyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  certifiedWarrantyText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#16A34A',
  },

  // Similar Products
  similarSection: {
    marginBottom: 10,
  },
  similarHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  similarTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  similarViewAll: {
    fontSize: 12.5,
    color: '#475569',
    fontWeight: '600',
  },
  similarList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  similarCard: {
    width: 110,
    height: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    padding: 8,
  },
  similarDiscountPill: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: '#FDE047',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 1,
  },
  similarDiscountText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#000000',
  },
  similarHeartBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    zIndex: 1,
  },
  similarImage: {
    width: '90%',
    height: '90%',
  },

  // Bottom Sticky Action Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 8,
  },
  wishlistBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 24,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  wishlistBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  addToCartBtn: {
    flex: 1.25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FACC15',
    borderRadius: 24,
    paddingVertical: 12,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  addToCartBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#000000',
  },
});
