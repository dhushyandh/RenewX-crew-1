import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Product } from '@/types';
import {
  renewxColors,
  renewxRadius,
  renewxSpacing,
  renewxTypography,
  renewxShadows,
} from '@/design-system';

interface ProductCardProps {
  product: Product;
  onPress: () => void;
  onAddToCart: () => void;
  onShare?: () => void;
}

export default function ProductCard({ product, onPress, onAddToCart, onShare }: ProductCardProps) {
  const price = Number(product.price) || 0;
  const originalPrice = Number(product.originalPrice) || price;
  const discount = Math.max(
    0,
    Math.round(originalPrice > 0 ? ((originalPrice - price) / originalPrice) * 100 : 0),
  );
  const stock = Number(product.stock) || 0;
  const isLowStock = stock > 0 && stock <= 5;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.card}
      activeOpacity={0.92}
      accessibilityRole="button"
      accessibilityLabel={product.name}
    >
      <View style={styles.imageContainer}>
        <View style={styles.imageWash} />
        {product.image ? (
          <Image source={{ uri: product.image }} style={styles.image} resizeMode="contain" />
        ) : (
          <View style={styles.imageFallback}>
            <Ionicons name="phone-portrait-outline" size={34} color={renewxColors.textMuted} />
          </View>
        )}

        <View style={styles.topBadges}>
          <View style={styles.conditionBadge}>
            <Ionicons name="shield-checkmark" size={10} color={renewxColors.greenDark} />
            <Text style={styles.conditionText}>{product.condition}</Text>
          </View>

          {discount > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>-{discount}%</Text>
            </View>
          )}
        </View>

        {onShare && (
          <TouchableOpacity
            style={styles.shareBtn}
            onPress={(event) => {
              (event as any)?.stopPropagation?.();
              onShare();
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Share product"
          >
            <Ionicons name="share-social-outline" size={15} color={renewxColors.text} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.brandRow}>
          <Text style={styles.brand} numberOfLines={1}>{product.brand}</Text>
          <View style={styles.rating}>
            <Ionicons name="star" size={11} color={renewxColors.yellowDark} />
            <Text style={styles.ratingText}>{product.rating}</Text>
          </View>
        </View>

        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>

        <View style={styles.metaRow}>
          <Text style={styles.reviews}>({product.reviews || 0} reviews)</Text>
          {isLowStock && (
            <Text style={styles.stock}>Only {stock} left</Text>
          )}
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.priceContainer}>
            <Text style={styles.price}>₹{price.toLocaleString('en-IN')}</Text>
            {originalPrice > price && (
              <Text style={styles.originalPrice}>₹{originalPrice.toLocaleString('en-IN')}</Text>
            )}
          </View>

          <TouchableOpacity
            onPress={(event) => {
              (event as any)?.stopPropagation?.();
              onAddToCart();
            }}
            style={styles.addButton}
            activeOpacity={0.78}
            accessibilityLabel={`Add ${product.name} to cart`}
          >
            <Ionicons name="add" size={17} color={renewxColors.black} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    marginBottom: renewxSpacing.sm,
    overflow: 'hidden',
    borderRadius: renewxRadius.lg,
    borderWidth: 1,
    borderColor: renewxColors.border,
    backgroundColor: renewxColors.surface,
    ...renewxShadows.card,
  },
  imageContainer: {
    position: 'relative',
    aspectRatio: 0.94,
    overflow: 'hidden',
    backgroundColor: renewxColors.background,
  },
  imageWash: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    top: 24,
    left: '50%',
    marginLeft: -75,
    backgroundColor: renewxColors.yellowSoft,
  },
  image: {
    width: '100%',
    height: '100%',
    padding: 10,
  },
  imageFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBadges: {
    position: 'absolute',
    top: 9,
    left: 9,
    right: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  conditionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: renewxRadius.pill,
    backgroundColor: renewxColors.greenLight,
  },
  conditionText: {
    fontFamily: renewxFontFamily.semibold,
    fontSize: 9,
    color: renewxColors.greenDark,
  },
  discountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: renewxRadius.pill,
    backgroundColor: renewxColors.black,
  },
  discountText: {
    fontFamily: renewxFontFamily.semibold,
    fontSize: 9,
    color: renewxColors.yellow,
  },
  shareBtn: {
    position: 'absolute',
    right: 9,
    bottom: 9,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: renewxColors.border,
  },
  content: {
    padding: renewxSpacing.sm,
    paddingTop: 11,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  brand: {
    flex: 1,
    fontFamily: renewxFontFamily.semibold,
    fontSize: 9,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: renewxColors.textSecondary,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontFamily: renewxFontFamily.regular,
    fontSize: 9,
    color: renewxColors.textSecondary,
  },
  name: {
    marginTop: 5,
    minHeight: 32,
    fontFamily: renewxFontFamily.semibold,
    fontSize: 13,
    lineHeight: 17,
    color: renewxColors.text,
  },
  metaRow: {
    minHeight: 18,
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 5,
  },
  reviews: {
    fontFamily: renewxFontFamily.regular,
    fontSize: 9,
    color: renewxColors.textMuted,
  },
  stock: {
    fontFamily: renewxFontFamily.regular,
    fontSize: 9,
    color: renewxColors.warning,
  },
  bottomRow: {
    marginTop: 9,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: renewxColors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceContainer: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
  },
  price: {
    fontFamily: renewxFontFamily.extraBold,
    fontSize: 15,
    color: renewxColors.text,
  },
  originalPrice: {
    fontFamily: renewxFontFamily.regular,
    fontSize: 9,
    color: renewxColors.textMuted,
    textDecorationLine: 'line-through',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: renewxColors.yellow,
  },
});
