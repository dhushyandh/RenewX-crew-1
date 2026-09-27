import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Product } from '@/types';
import { colors, fontSize, fontWeight, radius, spacing, conditionColors } from '@/theme';

interface ProductCardProps {
  product: Product;
  onPress: () => void;
  onAddToCart: () => void;
  onShare?: () => void;
}

export default function ProductCard({ product, onPress, onAddToCart, onShare }: ProductCardProps) {
  const price = Number(product.price) || 0;
  const originalPrice = Number(product.originalPrice) || price;
  const discount = Math.round(
    originalPrice > 0 ? ((originalPrice - price) / originalPrice) * 100 : 0
  );
  const cond = conditionColors[product.condition] || conditionColors.Good;

  return (
    <TouchableOpacity onPress={onPress} style={styles.card} activeOpacity={0.88}>
      <View style={styles.imageContainer}>
        <Image source={product.image ? { uri: product.image } : null} style={styles.image} resizeMode="cover" />
        {discount > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>-{discount}%</Text>
          </View>
        )}
        {onShare && (
          <TouchableOpacity
            style={styles.shareBtn}
            onPress={(e) => {
              (e as any)?.stopPropagation?.();
              onShare();
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Share product"
          >
            <Ionicons name="share-social-outline" size={13} color="#334155" />
          </TouchableOpacity>
        )}
        <View style={[styles.conditionBadge, { backgroundColor: cond.bg }]}>
          <Text style={[styles.conditionText, { color: cond.text }]}>{product.condition}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={12} color="#f59e0b" />
          <Text style={styles.ratingText}>{product.rating}</Text>
          <Text style={styles.reviewsText}>({product.reviews})</Text>
          <Text style={styles.brandText}>{product.brand}</Text>
        </View>

        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>

        {product.stock <= 5 && (
          <View style={styles.stockRow}>
            <Text style={styles.stockText}>Only {product.stock} left in stock</Text>
          </View>
        )}

        <View style={styles.bottomRow}>
          <View style={styles.priceContainer}>
            <Text style={styles.price}>₹{price.toLocaleString('en-IN')}</Text>
            <Text style={styles.originalPrice}>₹{originalPrice.toLocaleString('en-IN')}</Text>
          </View>
          <TouchableOpacity onPress={onAddToCart} style={styles.addButton} activeOpacity={0.7}>
            <Ionicons name="add" size={14} color="#000000" />
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
    backgroundColor: '#ffffff',
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#ece8dc',
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
    top: spacing.xs + 2,
    left: spacing.xs + 2,
    backgroundColor: '#000000',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  discountText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: fontWeight.black,
  },
  conditionBadge: {
    position: 'absolute',
    top: spacing.xs + 2,
    right: spacing.xs + 2,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  shareBtn: {
    position: 'absolute',
    bottom: spacing.xs + 3,
    right: spacing.xs + 3,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  conditionText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
  },
  content: {
    padding: 10,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  reviewsText: {
    fontSize: 10,
    color: '#9b9588',
  },
  brandText: {
    fontSize: 10,
    color: '#9b9588',
    marginLeft: 'auto',
  },
  name: {
    fontSize: 12,
    fontWeight: fontWeight.bold,
    color: colors.text,
    lineHeight: 16,
    marginBottom: 6,
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  stockText: {
    fontSize: 10,
    color: '#c47e00',
    fontWeight: fontWeight.bold,
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
    gap: 4,
  },
  price: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.black,
    color: colors.text,
  },
  originalPrice: {
    fontSize: 10,
    color: '#9b9588',
    textDecorationLine: 'line-through',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ffc400',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  addButtonText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: fontWeight.bold,
  },
});
