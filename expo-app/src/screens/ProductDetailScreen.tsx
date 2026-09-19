import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/App';
import type { Product } from '@/types';
import { useCart } from '@/context/CartContext';
import { api } from '@/services/api';
import { mapProductRow } from '@/lib/productMapper';
import { useEffect, useState } from 'react';
import { colors, fontSize, fontWeight, radius, spacing, conditionColors } from '@/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ProductDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const params = route.params as { product?: Product; id?: string } | undefined;
  const [product, setProduct] = useState<Product | null>(params?.product ? mapProductRow(params.product) : null);
  const [loading, setLoading] = useState(!params?.product);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const { addToCart } = useCart();

  useEffect(() => {
    if (product || !params?.id) return;
    let mounted = true;
    api.products.getById(params.id)
      .then((row: any) => {
        if (!mounted) return;
        setProduct({
          id: row.id,
          _uuid: row.id,
          name: row.name,
          brand: row.brand,
          category: row.category as Product['category'],
          originalPrice: row.original_price,
          price: row.price,
          condition: row.condition as Product['condition'],
          warrantyMonths: row.warranty_months,
          image: row.image_url,
          rating: row.rating ?? 0,
          reviews: row.reviews ?? 0,
          stock: row.stock,
          description: row.description ?? '',
          specs: Array.isArray(row.specs) ? row.specs : [],
        });
      })
      .catch((err: any) => {
        if (!mounted) return;
        if (err?.status === 404 || err?.code === 'NOT_FOUND') {
          setNotFound(true);
          setError(null);
        } else {
          setError(err?.message || 'Unable to load product');
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [params?.id, product]);

  if (loading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  if (!product) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name={notFound ? 'cube-outline' : 'cloud-offline-outline'} size={48} color="#94a3b8" />
        <Text style={styles.errorText}>{notFound ? 'Product not found' : (error || 'Unable to load product')}</Text>
        <Text style={styles.errorSubtext}>
          {notFound ? 'This product may have been removed or is no longer available.' : 'Check your connection and try again.'}
        </Text>
        <TouchableOpacity style={styles.backErrorButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backErrorText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const discount = product.originalPrice > 0
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;
  const cond = conditionColors[product.condition] || conditionColors.Good;

  const handleAddToCart = () => {
    addToCart(product);
    (navigation as any).navigate('MainTabs', { screen: 'Cart' });
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.imageContainer}>
          <Image source={product.image ? { uri: product.image } : null} style={styles.image} resizeMode="cover" />
          {discount > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>-{discount}%</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color="#111827" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.brand}>{product.brand}</Text>
          <Text style={styles.name}>{product.name}</Text>

          <View style={styles.ratingRow}>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Ionicons
                  key={n}
                  name="star"
                  size={15}
                  color={n <= Math.round(product.rating) ? '#f59e0b' : '#e5e7eb'}
                />
              ))}
            </View>
            <Text style={styles.ratingText}>{product.rating}</Text>
            <Text style={styles.reviewsText}>({product.reviews} reviews)</Text>
            <View style={[styles.conditionBadge, { backgroundColor: cond.bg }]}>
              <Text style={[styles.conditionText, { color: cond.text }]}>
                {product.condition}
              </Text>
            </View>
          </View>

          <Text style={styles.description}>{product.description}</Text>

          <Text style={styles.sectionLabel}>Key Specifications</Text>
          <View style={styles.specsContainer}>
            {(product.specs || []).map((spec, i) => (
              <View key={i} style={styles.specRow}>
                <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                <Text style={styles.specText}>{spec}</Text>
              </View>
            ))}
          </View>

          <View style={styles.featuresGrid}>
            <View style={styles.featureCard}>
              <Ionicons name="shield-checkmark" size={20} color={colors.text} />
              <Text style={styles.featureCardText}>{product.warrantyMonths}mo warranty</Text>
            </View>
            <View style={styles.featureCard}>
              <Ionicons name="cube-outline" size={20} color={colors.text} />
              <Text style={styles.featureCardText}>Free shipping</Text>
            </View>
            <View style={styles.featureCard}>
              <Ionicons name="refresh" size={20} color={colors.text} />
              <Text style={styles.featureCardText}>14-day returns</Text>
            </View>
            <View style={styles.featureCard}>
              <Ionicons name="bag-check-outline" size={20} color={colors.text} />
              <Text style={styles.featureCardText}>{product.stock} in stock</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.priceSection}>
          <View style={styles.priceRow}>
            <Text style={styles.price}>₹{product.price.toLocaleString('en-IN')}</Text>
            <Text style={styles.originalPrice}>₹{product.originalPrice.toLocaleString('en-IN')}</Text>
          </View>
          <Text style={styles.savings}>Save ₹{(product.originalPrice - product.price).toLocaleString('en-IN')}</Text>
        </View>
        <TouchableOpacity
          style={styles.addToCartButton}
          onPress={handleAddToCart}
          disabled={product.stock <= 0}
          activeOpacity={0.85}
        >
          <Ionicons name="cart" size={18} color={colors.primary} />
          <Text style={styles.addToCartText}>Add to Cart</Text>
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
    backgroundColor: '#ffffff',
    padding: spacing.lg,
  },
  errorText: {
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  backErrorButton: {
    backgroundColor: '#000000',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  backErrorText: {
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },
  errorSubtext: {
    color: colors.textMuted,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
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
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 110,
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
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.md,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  reviewsText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  conditionBadge: {
    marginLeft: 'auto',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
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
  sectionLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: 10,
  },
  specsContainer: {
    gap: 8,
    marginBottom: spacing.lg,
  },
  specRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  specText: {
    fontSize: fontSize.xs,
    color: '#374151',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  featureCard: {
    flexBasis: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: '#f8f7f2',
    borderWidth: 1,
    borderColor: '#ece8dc',
  },
  featureCardText: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    color: colors.text,
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
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  priceSection: {
    flex: 1,
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
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: radius.md,
    backgroundColor: '#000000',
  },
  addToCartText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
});
