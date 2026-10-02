import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  FlatList,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/App';
import type { Product } from '@/types';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { shareProduct } from '@/services/shareService';
import { api } from '@/services/api';
import { mapProductRow } from '@/lib/productMapper';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  renewxColors,
  renewxFontFamily,
  renewxRadius,
  renewxSpacing,
  renewxTypography,
  renewxShadows,
} from '@/design-system';
import { useSafeHeaderTop } from '@/lib/useSafeHeaderTop';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteParams = { product?: Product; id?: string };

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_SIZE = Math.min(SCREEN_WIDTH, 560);

function getGallery(product: Product): string[] {
  const gallery = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
  return Array.from(new Set([product.image, ...gallery].filter(Boolean)));
}

export default function ProductDetailScreen() {
  const safeTop = useSafeHeaderTop();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const params = route.params as RouteParams | undefined;
  const { addToCart } = useCart();
  const toast = useToast();

  const [product, setProduct] = useState<Product | null>(
    params?.product ? mapProductRow(params.product) : null,
  );
  const [loading, setLoading] = useState(!params?.product);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);

  const loadProduct = useCallback(async (showLoader = true) => {
    if (!params?.id) {
      if (!params?.product) setNotFound(true);
      setLoading(false);
      return;
    }
    if (showLoader) setLoading(true);
    setError(null);
    setNotFound(false);

    try {
      const row = await api.products.getById(params.id);
      setProduct(mapProductRow(row));
      setSelectedImage(0);
    } catch (err: any) {
      if (err?.status === 404 || err?.code === 'NOT_FOUND') {
        setProduct(null);
        setNotFound(true);
        setError(null);
      } else {
        setError(err?.message || 'Unable to load product');
      }
    } finally {
      setLoading(false);
    }
  }, [params?.id, params?.product]);

  useEffect(() => {
    if (params?.product) {
      setProduct(mapProductRow(params.product));
      setLoading(false);
      setSelectedImage(0);
      return;
    }
    loadProduct();
  }, [params?.product, loadProduct]);

  useEffect(() => {
    setSelectedImage(0);
  }, [params?.id]);

  useFocusEffect(useCallback(() => {
    // Keep product detail positioned at the top when reopened.
  }, []));

  const gallery = useMemo(() => product ? getGallery(product) : [], [product]);
  const discount = useMemo(() => {
    if (!product || product.originalPrice <= product.price || product.originalPrice <= 0) return 0;
    return Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
  }, [product]);
  const savings = product && product.originalPrice > product.price
    ? product.originalPrice - product.price
    : 0;

  const conditionTone = useMemo(() => {
    switch (product?.condition) {
      case 'Like New': return { bg: renewxColors.greenLight, text: renewxColors.greenDark };
      case 'Excellent': return { bg: '#EAF4FF', text: '#2563EB' };
      case 'Fair': return { bg: '#FFF4E5', text: '#B45309' };
      default: return { bg: renewxColors.yellowLight, text: renewxColors.black };
    }
  }, [product?.condition]);

  const stock = Number(product?.stock || 0);
  const isOutOfStock = stock <= 0;
  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('MainTabs', { screen: 'Home' });
  }, [navigation]);

  const handleShare = useCallback(async () => {
    if (!product) return;
    await shareProduct(product, {
      onSuccessToast: (msg) => toast.success(msg, 'Link Copied'),
    });
  }, [product, toast]);

  const onRefresh = useCallback(async () => {
    if (!params?.id) return;
    setRefreshing(true);
    await loadProduct(false);
    setRefreshing(false);
  }, [loadProduct, params?.id]);

  const handleAddToCart = useCallback(() => {
    if (!product || isOutOfStock) return;
    addToCart(product);
    toast.success('Added to your cart', 'Cart Updated');
  }, [addToCart, isOutOfStock, product, toast]);

  if (loading) {
    return (
      <View style={styles.stateScreen}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={renewxColors.green} />
          <Text style={styles.loadingTitle}>Loading product</Text>
          <Text style={styles.loadingSub}>Fetching the latest inventory details…</Text>
        </View>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.stateScreen}>
        <View style={styles.stateIcon}>
          <Ionicons name={notFound ? 'cube-outline' : 'cloud-offline-outline'} size={30} color={renewxColors.greenDark} />
        </View>
        <Text style={styles.stateTitle}>{notFound ? 'Product not found' : 'Unable to load product'}</Text>
        <Text style={styles.stateSub}>
          {notFound ? 'This device may have been removed or is no longer available.' : error || 'Check your connection and try again.'}
        </Text>
        {!notFound && params?.id && (
          <TouchableOpacity style={styles.primaryStateButton} onPress={() => loadProduct()} activeOpacity={0.85}>
            <Ionicons name="refresh-outline" size={17} color={renewxColors.black} />
            <Text style={styles.primaryStateText}>Try Again</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.secondaryStateButton} onPress={handleBack} activeOpacity={0.85}>
          <Text style={styles.secondaryStateText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const selectedUri = gallery[selectedImage] || '';
  const specs = product.specs || [];

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          params?.id ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={renewxColors.green} /> : undefined
        }
        contentContainerStyle={styles.scrollContent}
      >
        <View style={[styles.hero, { paddingTop: safeTop }]}>
          <View style={[styles.heroTop, { top: safeTop + 12 }]}>
            <TouchableOpacity style={styles.iconButton} onPress={handleBack} accessibilityLabel="Go back">
              <Ionicons name="arrow-back" size={20} color={renewxColors.text} />
            </TouchableOpacity>
            <View style={styles.heroActions}>
              <TouchableOpacity style={styles.iconButton} onPress={handleShare} accessibilityLabel="Share product">
                <Ionicons name="share-social-outline" size={19} color={renewxColors.text} />
              </TouchableOpacity>
            </View>
          </View>

          {discount > 0 && (
            <View style={[styles.discountBadge, { top: safeTop + 60 }]}>
              <Text style={styles.discountText}>{discount}% OFF</Text>
            </View>
          )}

          <View style={styles.heroImageWrap}>
            {selectedUri ? (
              <Image source={{ uri: selectedUri }} style={styles.heroImage} resizeMode="contain" />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="image-outline" size={48} color={renewxColors.textMuted} />
                <Text style={styles.imagePlaceholderText}>No image available</Text>
              </View>
            )}
          </View>

          {gallery.length > 1 && (
            <FlatList
              data={gallery}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(uri, index) => `${uri}-${index}`}
              contentContainerStyle={styles.thumbnailList}
              renderItem={({ item: uri, index }) => (
                <TouchableOpacity
                  style={[styles.thumbnail, selectedImage === index && styles.thumbnailActive]}
                  onPress={() => setSelectedImage(index)}
                  activeOpacity={0.8}
                  accessibilityLabel={`View product image ${index + 1}`}
                >
                  <Image source={{ uri }} style={styles.thumbnailImage} resizeMode="contain" />
                </TouchableOpacity>
              )}
            />
          )}
        </View>

        <View style={styles.content}>
          <View style={styles.eyebrowRow}>
            <Text style={styles.brand}>{product.brand}</Text>
            {product.model ? <Text style={styles.model}>{product.model}</Text> : null}
          </View>

          <Text style={styles.name}>{product.name}</Text>

          <View style={styles.statusRow}>
            <View style={[styles.conditionBadge, { backgroundColor: conditionTone.bg }]}>
              <Text style={[styles.conditionText, { color: conditionTone.text }]}>{product.condition}</Text>
            </View>
            <View style={[styles.stockBadge, isOutOfStock && styles.stockBadgeOut]}>
              <View style={[styles.stockDot, isOutOfStock && styles.stockDotOut]} />
              <Text style={[styles.stockText, isOutOfStock && styles.stockTextOut]}>
                {isOutOfStock ? 'Out of stock' : stock <= 3 ? `Only ${stock} left` : 'In stock'}
              </Text>
            </View>
          </View>

          <View style={styles.ratingRow}>
            <View style={styles.ratingStars}>
              <Ionicons name="star" size={15} color={renewxColors.yellowDark} />
              <Text style={styles.ratingValue}>{product.rating > 0 ? product.rating.toFixed(1) : 'New'}</Text>
              {product.reviews > 0 && <Text style={styles.reviewCount}>({product.reviews} reviews)</Text>}
            </View>
            <TouchableOpacity onPress={handleShare} style={styles.shareInline}>
              <Ionicons name="share-outline" size={14} color={renewxColors.textSecondary} />
              <Text style={styles.shareInlineText}>Share</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.priceCard}>
            <View style={styles.priceMainRow}>
              <Text style={styles.price}>₹{product.price.toLocaleString('en-IN')}</Text>
              {product.originalPrice > product.price && (
                <Text style={styles.originalPrice}>₹{product.originalPrice.toLocaleString('en-IN')}</Text>
              )}
            </View>
            {savings > 0 && (
              <View style={styles.savingsPill}>
                <Ionicons name="pricetag-outline" size={13} color={renewxColors.greenDark} />
                <Text style={styles.savingsText}>You save ₹{savings.toLocaleString('en-IN')}</Text>
              </View>
            )}
          </View>

          {!!product.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About this device</Text>
              <Text style={styles.description}>{product.description}</Text>
            </View>
          )}

          {specs.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <View>
                  <Text style={styles.sectionTitle}>Specifications</Text>
                  <Text style={styles.sectionSub}>Verified details from RenewX inventory</Text>
                </View>
                <View style={styles.countBadge}><Text style={styles.countBadgeText}>{specs.length}</Text></View>
              </View>
              <View style={styles.specList}>
                {specs.map((spec, index) => (
                  <View key={`${spec}-${index}`} style={styles.specRow}>
                    <View style={styles.specIcon}><Ionicons name="checkmark" size={15} color={renewxColors.black} /></View>
                    <Text style={styles.specText}>{spec}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.serviceGrid}>
            <View style={styles.serviceCard}>
              <Ionicons name="shield-checkmark-outline" size={21} color={renewxColors.green} />
              <Text style={styles.serviceTitle}>Verified listing</Text>
              <Text style={styles.serviceText}>Checked by RenewX</Text>
            </View>
            <View style={styles.serviceCard}>
              <Ionicons name="cube-outline" size={21} color={renewxColors.green} />
              <Text style={styles.serviceTitle}>Secure delivery</Text>
              <Text style={styles.serviceText}>Delivery available</Text>
            </View>
            <View style={styles.serviceCard}>
              <Ionicons name="card-outline" size={21} color={renewxColors.green} />
              <Text style={styles.serviceTitle}>Secure checkout</Text>
              <Text style={styles.serviceText}>Protected payment flow</Text>
            </View>
            <View style={styles.serviceCard}>
              <Ionicons name="time-outline" size={21} color={renewxColors.green} />
              <Text style={styles.serviceTitle}>Warranty</Text>
              <Text style={styles.serviceText}>{product.warrantyMonths > 0 ? `${product.warrantyMonths} month warranty` : 'See listing details'}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.bottomPrice}>
          <Text style={styles.bottomLabel}>Total</Text>
          <Text style={styles.bottomAmount}>₹{product.price.toLocaleString('en-IN')}</Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, isOutOfStock && styles.addButtonDisabled]}
          onPress={handleAddToCart}
          disabled={isOutOfStock}
          activeOpacity={0.85}
        >
          <Ionicons name={isOutOfStock ? 'close-circle-outline' : 'cart-outline'} size={19} color={isOutOfStock ? renewxColors.textMuted : renewxColors.black} />
          <Text style={[styles.addButtonText, isOutOfStock && styles.addButtonTextDisabled]}>
            {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: renewxColors.background },
  scrollContent: { paddingBottom: 108 },
  stateScreen: { flex: 1, backgroundColor: renewxColors.background, alignItems: 'center', justifyContent: 'center', padding: renewxSpacing.xl },
  loadingCard: { alignItems: 'center', padding: renewxSpacing.xl, borderRadius: renewxRadius.xl, backgroundColor: renewxColors.surface, borderWidth: 1, borderColor: renewxColors.border, ...renewxShadows.card },
  loadingTitle: { marginTop: 12, fontFamily: renewxFontFamily.semibold, fontSize: 16, color: renewxColors.text },
  loadingSub: { marginTop: 4, fontFamily: renewxFontFamily.regular, fontSize: 11, color: renewxColors.textSecondary },
  stateIcon: { width: 68, height: 68, borderRadius: 34, backgroundColor: renewxColors.greenLight, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  stateTitle: { ...renewxTypography.h3, color: renewxColors.text, textAlign: 'center' },
  stateSub: { marginTop: 6, maxWidth: 310, textAlign: 'center', fontFamily: renewxFontFamily.regular, fontSize: 12, lineHeight: 18, color: renewxColors.textSecondary },
  primaryStateButton: { marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 18, paddingVertical: 11, borderRadius: renewxRadius.md, backgroundColor: renewxColors.yellow },
  primaryStateText: { fontFamily: renewxFontFamily.semibold, fontSize: 12, color: renewxColors.black },
  secondaryStateButton: { marginTop: 9, paddingHorizontal: 18, paddingVertical: 10, borderRadius: renewxRadius.md, borderWidth: 1, borderColor: renewxColors.border, backgroundColor: renewxColors.surface },
  secondaryStateText: { fontFamily: renewxFontFamily.semibold, fontSize: 12, color: renewxColors.text },
  hero: { backgroundColor: renewxColors.surface, borderBottomWidth: 1, borderBottomColor: renewxColors.border },
  heroTop: { position: 'absolute', top: 12, left: renewxSpacing.md, right: renewxSpacing.md, zIndex: 5, flexDirection: 'row', justifyContent: 'space-between' },
  heroActions: { flexDirection: 'row', gap: 8 },
  iconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.94)', borderWidth: 1, borderColor: renewxColors.border, alignItems: 'center', justifyContent: 'center', ...renewxShadows.card },
  discountBadge: { position: 'absolute', zIndex: 4, top: 60, right: renewxSpacing.md, paddingHorizontal: 10, paddingVertical: 6, borderRadius: renewxRadius.pill, backgroundColor: renewxColors.black },
  discountText: { fontFamily: renewxFontFamily.semibold, fontSize: 10, color: renewxColors.yellow },
  heroImageWrap: { width: '100%', height: Math.max(320, Math.min(460, IMAGE_SIZE)), backgroundColor: renewxColors.surfaceMuted, alignItems: 'center', justifyContent: 'center', padding: 22 },
  heroImage: { width: '100%', height: '100%' },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center', gap: 7 },
  imagePlaceholderText: { fontFamily: renewxFontFamily.regular, fontSize: 11, color: renewxColors.textMuted },
  thumbnailList: { paddingHorizontal: renewxSpacing.md, paddingVertical: 10, gap: 8 },
  thumbnail: { width: 62, height: 62, borderRadius: renewxRadius.sm, backgroundColor: renewxColors.background, borderWidth: 1, borderColor: renewxColors.border, alignItems: 'center', justifyContent: 'center', padding: 5 },
  thumbnailActive: { borderColor: renewxColors.yellow, borderWidth: 2 },
  thumbnailImage: { width: '100%', height: '100%' },
  content: { padding: renewxSpacing.lg },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  brand: { fontFamily: renewxFontFamily.semibold, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: renewxColors.greenDark },
  model: { fontFamily: renewxFontFamily.medium, fontSize: 10, color: renewxColors.textMuted },
  name: { ...renewxTypography.h1, color: renewxColors.text, marginBottom: 11 },
  statusRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7 },
  conditionBadge: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: renewxRadius.pill },
  conditionText: { fontFamily: renewxFontFamily.semibold, fontSize: 10 },
  stockBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: renewxRadius.pill, backgroundColor: renewxColors.greenLight },
  stockBadgeOut: { backgroundColor: '#FEECEC' },
  stockDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: renewxColors.green },
  stockDotOut: { backgroundColor: renewxColors.error },
  stockText: { fontFamily: renewxFontFamily.semibold, fontSize: 10, color: renewxColors.greenDark },
  stockTextOut: { color: renewxColors.error },
  ratingRow: { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ratingStars: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  ratingValue: { fontFamily: renewxFontFamily.semibold, fontSize: 12, color: renewxColors.text },
  reviewCount: { fontFamily: renewxFontFamily.regular, fontSize: 11, color: renewxColors.textSecondary },
  shareInline: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: renewxRadius.pill, backgroundColor: renewxColors.surface, borderWidth: 1, borderColor: renewxColors.border },
  shareInlineText: { fontFamily: renewxFontFamily.medium, fontSize: 10, color: renewxColors.textSecondary },
  priceCard: { marginTop: 16, padding: 16, borderRadius: renewxRadius.lg, backgroundColor: renewxColors.black, ...renewxShadows.card },
  priceMainRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  price: { fontFamily: renewxFontFamily.extraBold, fontSize: 26, color: renewxColors.white },
  originalPrice: { fontFamily: renewxFontFamily.regular, fontSize: 12, color: '#B8B8B8', textDecorationLine: 'line-through' },
  savingsPill: { alignSelf: 'flex-start', marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: renewxRadius.pill, backgroundColor: renewxColors.greenLight },
  savingsText: { fontFamily: renewxFontFamily.semibold, fontSize: 10, color: renewxColors.greenDark },
  section: { marginTop: 18 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { fontFamily: renewxFontFamily.bold, fontSize: 17, color: renewxColors.text },
  sectionSub: { marginTop: 2, fontFamily: renewxFontFamily.regular, fontSize: 10, color: renewxColors.textSecondary },
  description: { marginTop: 7, fontFamily: renewxFontFamily.regular, fontSize: 13, lineHeight: 20, color: renewxColors.textSecondary },
  countBadge: { minWidth: 28, height: 28, paddingHorizontal: 6, borderRadius: 14, backgroundColor: renewxColors.yellow, alignItems: 'center', justifyContent: 'center' },
  countBadgeText: { fontFamily: renewxFontFamily.bold, fontSize: 10, color: renewxColors.black },
  specList: { overflow: 'hidden', borderRadius: renewxRadius.lg, borderWidth: 1, borderColor: renewxColors.border, backgroundColor: renewxColors.surface },
  specRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderBottomWidth: 1, borderBottomColor: renewxColors.border },
  specIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: renewxColors.yellow, alignItems: 'center', justifyContent: 'center' },
  specText: { flex: 1, fontFamily: renewxFontFamily.medium, fontSize: 12, lineHeight: 18, color: renewxColors.text },
  serviceGrid: { marginTop: 18, flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  serviceCard: { flexBasis: '48%', flexGrow: 1, minHeight: 92, padding: 12, borderRadius: renewxRadius.md, backgroundColor: renewxColors.surface, borderWidth: 1, borderColor: renewxColors.border },
  serviceTitle: { marginTop: 7, fontFamily: renewxFontFamily.semibold, fontSize: 11, color: renewxColors.text },
  serviceText: { marginTop: 2, fontFamily: renewxFontFamily.regular, fontSize: 9, lineHeight: 14, color: renewxColors.textSecondary },
  bottomBar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: renewxSpacing.lg, paddingVertical: 11, backgroundColor: renewxColors.surface, borderTopWidth: 1, borderTopColor: renewxColors.border, ...renewxShadows.elevated },
  bottomPrice: { flex: 1, minWidth: 0 },
  bottomLabel: { fontFamily: renewxFontFamily.regular, fontSize: 9, color: renewxColors.textMuted },
  bottomAmount: { marginTop: 2, fontFamily: renewxFontFamily.extraBold, fontSize: 19, color: renewxColors.text },
  addButton: { minWidth: 150, height: 46, paddingHorizontal: 18, borderRadius: renewxRadius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: renewxColors.yellow },
  addButtonDisabled: { backgroundColor: renewxColors.surfaceMuted },
  addButtonText: { fontFamily: renewxFontFamily.semibold, fontSize: 12, color: renewxColors.black },
  addButtonTextDisabled: { color: renewxColors.textMuted },
});
