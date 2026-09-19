import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Product } from '@/types';
import { colors, fontSize, fontWeight, radius, spacing, conditionColors } from '@/theme';

interface ProductCardProps {
  product: Product;
  onPress: () => void;
  onAddToCart: () => void;
}

export default function ProductCard({ product, onPress, onAddToCart }: ProductCardProps) {
  const discount = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
  const cond = conditionColors[product.condition] || conditionColors.Good;

  return (
    <TouchableOpacity onPress={onPress} style={styles.card} activeOpacity={0.85}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: product.image }} style={styles.image} />
        {discount > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>-{discount}%</Text>
          </View>
        )}
        <View style={[styles.conditionBadge, { backgroundColor: cond.bg }]}>
          <Text style={[styles.conditionText, { color: cond.text }]}>{product.condition}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={12} color="#fbbf24" />
          <Text style={styles.ratingText}>{product.rating}</Text>
          <Text style={styles.reviewsText}>({product.reviews})</Text>
          <Text style={styles.brandText}>{product.brand}</Text>
        </View>

        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>

        <View style={styles.warrantyRow}>
          <Ionicons name="shield-checkmark" size={12} color={colors.primary} />
          <Text style={styles.warrantyText}>{product.warrantyMonths}mo warranty</Text>
          {product.stock <= 5 && (
            <Text style={styles.stockText}>Only {product.stock} left</Text>
          )}
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.priceContainer}>
            <Text style={styles.price}>${product.price}</Text>
            <Text style={styles.originalPrice}>${product.originalPrice}</Text>
          </View>
          <TouchableOpacity onPress={onAddToCart} style={styles.addButton} activeOpacity={0.7}>
            <Ionicons name="cart" size={14} color={colors.white} />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
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
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  discountText: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  conditionBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  conditionText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  content: {
    padding: spacing.md,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  ratingText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  reviewsText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  brandText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginLeft: 'auto',
  },
  name: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    lineHeight: 19,
    marginBottom: 8,
  },
  warrantyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  warrantyText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  stockText: {
    fontSize: fontSize.xs,
    color: colors.warning,
    fontWeight: fontWeight.medium,
    marginLeft: 'auto',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  price: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  originalPrice: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.sm,
  },
  addButtonText: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
});
