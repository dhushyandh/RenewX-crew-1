import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  RefreshControl,
  Platform,
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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  colors,
  fontSize,
  fontWeight,
  radius,
  spacing,
  conditionColors,
} from '@/theme';
import { useSafeHeaderTop } from '@/lib/useSafeHeaderTop';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type RouteParams = {
  product?: Product;
  id?: string;
};

export default function ProductDetailScreen() {
  const safeTop = useSafeHeaderTop();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const params = route.params as RouteParams | undefined;

  const [product, setProduct] = useState<Product | null>(
    params?.product ? mapProductRow(params.product) : null,
  );
  const [loading, setLoading] = useState(!params?.product);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const { addToCart } = useCart();
  const toast = useToast();
  const scrollRef = useRef<ScrollView>(null);

  const handleShare = useCallback(async () => {
    if (!product) return;
    await shareProduct(product, {
      onSuccessToast: (msg) => {
        toast?.success?.(msg, 'Link Copied');
      },
    });
  }, [product, toast]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as any });
    }
  }, [params?.id, product?.id]);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' as any });
      }
    }, [])
  );

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('MainTabs', { screen: 'Home' });
    }
  }, [navigation]);

  const loadProduct = useCallback(
    async (showLoader = true) => {
      if (!params?.id) {
        if (!params?.product) {
          setNotFound(true);
        }
        setLoading(false);
        return;
      }

      if (showLoader) {
        setLoading(true);
      }

      setError(null);
      setNotFound(false);

      try {
        const row = await api.products.getById(params.id);
        setProduct(mapProductRow(row));
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
    },
    [params?.id, params?.product],
  );

  useEffect(() => {
    // When navigation supplied the full product, avoid an unnecessary request.
    if (params?.product) {
      setProduct(mapProductRow(params.product));
      setLoading(false);
      return;
    }

    loadProduct();
  }, [params?.product, loadProduct]);

  const onRefresh = useCallback(async () => {
    if (!params?.id) return;

    setRefreshing(true);
    await loadProduct(false);
    setRefreshing(false);
  }, [loadProduct, params?.id]);

  const discount = useMemo(() => {
    if (!product || product.originalPrice <= 0 || product.price >= product.originalPrice) {
      return 0;
    }

    return Math.round(
      ((product.originalPrice - product.price) / product.originalPrice) * 100,
    );
  }, [product]);

  const savings = useMemo(() => {
    if (!product || product.originalPrice <= product.price) return 0;
    return product.originalPrice - product.price;
  }, [product]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading product...</Text>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.errorIcon}>
          <Ionicons
            name={notFound ? 'cube-outline' : 'cloud-offline-outline'}
            size={30}
            color={colors.textMuted}
          />
        </View>

        <Text style={styles.errorText}>
          {notFound ? 'Product not found' : 'Unable to load product'}
        </Text>

        <Text style={styles.errorSubtext}>
          {notFound
            ? 'This product may have been removed or is no longer available.'
            : error || 'Check your connection and try again.'}
        </Text>

        {!notFound && params?.id ? (
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => loadProduct()}
            activeOpacity={0.85}
          >
            <Ionicons name="refresh" size={17} color={colors.primary} />
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={styles.backErrorButton}
          onPress={handleBack}
          activeOpacity={0.85}
        >
          <Text style={styles.backErrorText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const condition =
    conditionColors[product.condition] || conditionColors.Good;

  const hasSpecs = Array.isArray(product.specs) && product.specs.length > 0;
  const stock = Number(product.stock || 0);
  const isOutOfStock = stock <= 0;

  const handleAddToCart = () => {
    if (isOutOfStock) return;

    addToCart(product);
    navigation.navigate('Cart');
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        refreshControl={
          params?.id ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          ) : undefined
        }
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.imageContainer}>
          {product.image ? (
            <Image
              source={{ uri: product.image }}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons
                name="image-outline"
                size={42}
                color={colors.textMuted}
              />
              <Text style={styles.imagePlaceholderText}>No image available</Text>
            </View>
          )}

          {discount > 0 ? (
            <View style={[styles.discountBadge, { top: safeTop + 46 }]}>
              <Text style={styles.discountText}>-{discount}%</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.backButton, { top: safeTop }]}
            onPress={handleBack}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.shareButton, { top: safeTop }]}
            onPress={handleShare}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Share product"
          >
            <Ionicons name="share-social-outline" size={19} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {!!product.brand && <Text style={styles.brand}>{product.brand}</Text>}

          <Text style={styles.name}>{product.name}</Text>

          <View style={styles.conditionRow}>
            <View
              style={[
                styles.conditionBadge,
                { backgroundColor: condition.bg },
              ]}
            >
              <Text style={[styles.conditionText, { color: condition.text }]}>
                {product.condition}
              </Text>
            </View>

            {!isOutOfStock ? (
              <View style={styles.inStockBadge}>
                <View style={styles.inStockDot} />
                <Text style={styles.inStockText}>In stock</Text>
              </View>
            ) : (
              <View style={styles.outOfStockBadge}>
                <Text style={styles.outOfStockText}>Out of stock</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.inlineShareBtn}
              onPress={handleShare}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Share this deal"
            >
              <Ionicons name="share-social-outline" size={14} color="#334155" />
              <Text style={styles.inlineShareBtnText}>Share</Text>
            </TouchableOpacity>
          </View>

          {!!product.description && (
            <Text style={styles.description}>{product.description}</Text>
          )}

          {hasSpecs ? (
            <View style={styles.specSection}>
              <View style={styles.specSectionHeader}>
                <View>
                  <Text style={styles.specSectionTitle}>Key Specifications</Text>
                  <Text style={styles.specSectionSubtitle}>
                    Everything you need to know before you buy
                  </Text>
                </View>
                <View style={styles.specCountBadge}>
                  <Text style={styles.specCountText}>{product.specs!.length}</Text>
                </View>
              </View>

              <View style={styles.specsGrid}>
                {product.specs!.map((spec, index) => (
                  <View key={`${spec}-${index}`} style={styles.specCard}>
                    <View style={styles.specIconBox}>
                      <Ionicons
                        name="checkmark"
                        size={17}
                        color="#000000"
                      />
                    </View>
                    <View style={styles.specCardContent}>
                      <Text style={styles.specIndex}>SPEC {String(index + 1).padStart(2, '0')}</Text>
                      <Text style={styles.specTextLarge}>{spec}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.featuresGrid}>
            <View style={styles.featureCard}>
              <Ionicons
                name="cube-outline"
                size={20}
                color={colors.text}
              />
              <View style={styles.featureCopy}>
                <Text style={styles.featureCardTitle}>Shipping</Text>
                <Text style={styles.featureCardText}>Delivery available</Text>
              </View>
            </View>

            <View style={styles.featureCard}>
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color={colors.text}
              />
              <View style={styles.featureCopy}>
                <Text style={styles.featureCardTitle}>Secure Checkout</Text>
                <Text style={styles.featureCardText}>Protected payment flow</Text>
              </View>
            </View>

            <View style={styles.featureCard}>
              <Ionicons
                name="bag-check-outline"
                size={20}
                color={colors.text}
              />
              <View style={styles.featureCopy}>
                <Text style={styles.featureCardTitle}>Availability</Text>
                <Text style={styles.featureCardText}>
                  {isOutOfStock ? 'Out of stock' : `${stock} in stock`}
                </Text>
              </View>
            </View>

            <View style={styles.featureCard}>
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color={colors.text}
              />
              <View style={styles.featureCopy}>
                <Text style={styles.featureCardTitle}>RenewX</Text>
                <Text style={styles.featureCardText}>Verified listing</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.priceSection}>
          <View style={styles.priceRow}>
            <Text style={styles.price}>
              ₹{Number(product.price || 0).toLocaleString('en-IN')}
            </Text>

            {product.originalPrice > product.price ? (
              <Text style={styles.originalPrice}>
                ₹{Number(product.originalPrice).toLocaleString('en-IN')}
              </Text>
            ) : null}
          </View>

          {savings > 0 ? (
            <Text style={styles.savings}>
              Save ₹{savings.toLocaleString('en-IN')}
            </Text>
          ) : null}
        </View>

        <TouchableOpacity
          style={[
            styles.addToCartButton,
            isOutOfStock && styles.addToCartButtonDisabled,
          ]}
          onPress={handleAddToCart}
          disabled={isOutOfStock}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={
            isOutOfStock ? 'Product is out of stock' : 'Add to cart'
          }
        >
          <Ionicons
            name={isOutOfStock ? 'close-circle-outline' : 'cart-outline'}
            size={18}
            color={isOutOfStock ? colors.textMuted : colors.primary}
          />
          <Text
            style={[
              styles.addToCartText,
              isOutOfStock && styles.addToCartTextDisabled,
            ]}
          >
            {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.lg,
  },

  loadingText: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },

  errorIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f7f2',
    borderWidth: 1,
    borderColor: '#ece8dc',
    marginBottom: spacing.md,
  },

  errorText: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
    marginBottom: 6,
  },

  errorSubtext: {
    color: colors.textMuted,
    textAlign: 'center',
    fontSize: fontSize.xs,
    lineHeight: 18,
    maxWidth: 300,
    marginBottom: spacing.md,
  },

  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#000000',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },

  retryText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },

  backErrorButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },

  backErrorText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },

  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  scrollContent: {
    paddingBottom: 112,
  },

  imageContainer: {
    position: 'relative',
    aspectRatio: 1,
    backgroundColor: '#f7f5ec',
  },

  image: {
    width: '100%',
    height: '100%',
  },

  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  imagePlaceholderText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },

  discountBadge: {
    position: 'absolute',
    top: spacing.lg + 10,
    right: spacing.md,
    backgroundColor: '#000000',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.full,
  },

  discountText: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },

  backButton: {
    position: 'absolute',
    top: spacing.lg + 10,
    left: spacing.md,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e1d8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },

  shareButton: {
    position: 'absolute',
    top: spacing.lg + 10,
    right: spacing.md,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e1d8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },

  inlineShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginLeft: 'auto',
  },

  inlineShareBtnText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: '#334155',
  },

  content: {
    padding: spacing.lg,
  },

  brand: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },

  name: {
    fontSize: 20,
    fontWeight: fontWeight.black,
    color: colors.text,
    lineHeight: 25,
    marginBottom: 10,
  },

  conditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.lg,
  },

  conditionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
  },

  inStockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: '#ecfdf5',
  },

  inStockDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },

  inStockText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: '#047857',
  },

  outOfStockBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: '#fef2f2',
  },

  outOfStockText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: '#dc2626',
  },

  conditionText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
  },

  description: {
    fontSize: fontSize.sm,
    color: '#4b5563',
    lineHeight: 21,
    marginBottom: spacing.lg,
  },

  specSection: {
    marginBottom: spacing.lg,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e7e5df',
  },

  specSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  specSectionTitle: {
    fontSize: 20,
    fontWeight: fontWeight.black,
    color: colors.text,
    letterSpacing: -0.4,
  },

  specSectionSubtitle: {
    marginTop: 3,
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 16,
  },

  specCountBadge: {
    minWidth: 34,
    height: 34,
    paddingHorizontal: 9,
    borderRadius: 17,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },

  specCountText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: fontWeight.black,
  },

  specsGrid: {
    gap: 10,
  },

  specCard: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 72,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#f8f7f2',
    borderWidth: 1,
    borderColor: '#ece8dc',
  },

  specIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  specCardContent: {
    flex: 1,
  },

  specIndex: {
    fontSize: 9,
    fontWeight: fontWeight.black,
    color: '#9a9487',
    letterSpacing: 1,
    marginBottom: 3,
  },

  specTextLarge: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: fontWeight.bold,
    color: '#171717',
  },

  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  featureCard: {
    flexBasis: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: '#f8f7f2',
    borderWidth: 1,
    borderColor: '#ece8dc',
    minHeight: 68,
  },

  featureCopy: {
    flex: 1,
  },

  featureCardTitle: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: 2,
  },

  featureCardText: {
    fontSize: 10,
    color: colors.textMuted,
    lineHeight: 15,
  },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  priceSection: {
    flex: 1,
    minWidth: 0,
  },

  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },

  price: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.black,
    color: colors.text,
  },

  originalPrice: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },

  savings: {
    fontSize: 11,
    color: '#10b981',
    fontWeight: fontWeight.bold,
    marginTop: 2,
  },

  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: radius.md,
    backgroundColor: '#000000',
    minWidth: 138,
  },

  addToCartButtonDisabled: {
    backgroundColor: '#e5e7eb',
  },

  addToCartText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },

  addToCartTextDisabled: {
    color: colors.textMuted,
  },
});
