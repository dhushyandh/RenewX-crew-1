import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/App';
import type { Product } from '@/types';
import { useCart } from '@/context/CartContext';
import { colors, fontSize, fontWeight, radius, spacing, conditionColors } from '@/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ProductDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const { product } = route.params as { product: Product };
  const { addToCart } = useCart();

  const discount = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
  const cond = conditionColors[product.condition] || conditionColors.Good;

  const handleAddToCart = () => {
    addToCart(product);
    navigation.navigate('MainTabs', { screen: 'Cart' as any });
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.imageContainer}>
          <Image source={{ uri: product.image }} style={styles.image} />
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
            <Ionicons name="arrow-back" size={22} color={colors.text} />
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
                  size={16}
                  color={n <= Math.round(product.rating) ? '#fbbf24' : '#e5e7eb'}
                />
              ))}
            </View>
            <Text style={styles.ratingText}>{product.rating}</Text>
            <Text style={styles.reviewsText}>({product.reviews} reviews)</Text>
            <View style={[styles.conditionBadge, { backgroundColor: cond.bg }]}>
              <Text style={[styles.conditionText, { color: cond.text }]}>{product.condition}</Text>
            </View>
          </View>

          <Text style={styles.description}>{product.description}</Text>

          <Text style={styles.sectionLabel}>Key Specifications</Text>
          <View style={styles.specsContainer}>
            {product.specs.map((spec, i) => (
              <View key={i} style={styles.specRow}>
                <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                <Text style={styles.specText}>{spec}</Text>
              </View>
            ))}
          </View>

          <View style={styles.featuresGrid}>
            <View style={styles.featureCard}>
              <Ionicons name="shield-checkmark" size={22} color={colors.primary} />
              <Text style={styles.featureCardText}>{product.warrantyMonths}mo warranty</Text>
            </View>
            <View style={styles.featureCard}>
              <Ionicons name="cube" size={22} color={colors.primary} />
              <Text style={styles.featureCardText}>Free shipping</Text>
            </View>
            <View style={styles.featureCard}>
              <Ionicons name="refresh" size={22} color={colors.primary} />
              <Text style={styles.featureCardText}>14-day returns</Text>
            </View>
            <View style={styles.featureCard}>
              <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
              <Text style={styles.featureCardText}>{product.stock} in stock</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.priceSection}>
          <View style={styles.priceRow}>
            <Text style={styles.price}>${product.price}</Text>
            <Text style={styles.originalPrice}>${product.originalPrice}</Text>
          </View>
          <Text style={styles.savings}>Save ${product.originalPrice - product.price}</Text>
        </View>
        <TouchableOpacity style={styles.addToCartButton} onPress={handleAddToCart} activeOpacity={0.8}>
          <Ionicons name="cart" size={20} color={colors.white} />
          <Text style={styles.addToCartText}>Add to Cart</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  imageContainer: {
    position: 'relative',
    aspectRatio: 1,
    backgroundColor: colors.borderLight,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  discountBadge: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  discountText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  backButton: {
    position: 'absolute',
    top: spacing.lg + 8,
    left: spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  brand: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
    marginBottom: 4,
  },
  name: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    lineHeight: 26,
    marginBottom: 12,
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
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  reviewsText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  conditionBadge: {
    marginLeft: 'auto',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  conditionText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  description: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: 12,
  },
  specsContainer: {
    gap: 10,
    marginBottom: spacing.lg,
  },
  specRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  specText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  featureCard: {
    flexBasis: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  featureCardText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
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
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  priceSection: {
    flex: 1,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  price: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  originalPrice: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  savings: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  addToCartText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
});
