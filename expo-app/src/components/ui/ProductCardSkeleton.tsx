import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  View,
  ScrollView,
  type StyleProp,
  type ViewStyle,
  type DimensionValue,
} from 'react-native';
import { renewxRadius } from '@/design-system';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

export function SkeletonPill({
  width = '100%',
  height = 14,
  radius = renewxRadius.sm,
  style,
}: SkeletonProps) {
  const anim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 0.9,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0.4,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  return (
    <Animated.View
      accessibilityLabel="Loading skeleton"
      style={[
        styles.skeletonBase,
        {
          width,
          height,
          borderRadius: radius,
          opacity: anim,
        },
        style,
      ]}
    />
  );
}

interface ProductCardSkeletonProps {
  cardWidth?: DimensionValue;
  style?: StyleProp<ViewStyle>;
}

export function ProductCardSkeleton({
  cardWidth = 172,
  style,
}: ProductCardSkeletonProps) {
  return (
    <View style={[styles.card, { width: cardWidth }, style]}>
      {/* Top row: Mini badge + Heart skeleton */}
      <View style={styles.topRow}>
        <SkeletonPill width={58} height={18} radius={10} />
        <SkeletonPill width={28} height={28} radius={14} />
      </View>

      {/* Main product device image skeleton */}
      <View style={styles.imageWrap}>
        <SkeletonPill width="78%" height={92} radius={12} />
      </View>

      {/* Product Name */}
      <SkeletonPill width="88%" height={15} radius={4} style={{ marginTop: 8 }} />

      {/* Specs / Storage / RAM */}
      <SkeletonPill width="62%" height={12} radius={4} style={{ marginTop: 6 }} />

      {/* Rating stars row */}
      <View style={styles.ratingRow}>
        <SkeletonPill width={42} height={12} radius={4} />
        <SkeletonPill width={32} height={10} radius={4} />
      </View>

      {/* Price row */}
      <View style={styles.priceRow}>
        <SkeletonPill width={68} height={18} radius={6} />
        <SkeletonPill width={45} height={13} radius={4} />
      </View>
    </View>
  );
}

/**
 * Horizontal row of Product Card Skeletons (Used in Featured Devices on Home / Shop)
 */
export function ProductRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.horizontalScroll}
    >
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={`row-skel-${i}`} cardWidth={170} />
      ))}
    </ScrollView>
  );
}

/**
 * 2-Column Grid of Product Card Skeletons (Used in Product Catalog / Shop Screen)
 */
export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <View style={styles.gridContainer}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={`grid-skel-${i}`} style={styles.gridCol}>
          <ProductCardSkeleton cardWidth="100%" />
        </View>
      ))}
    </View>
  );
}

/**
 * Full page Product Detail Skeleton
 */
export function ProductDetailSkeleton({ safeTop = 0 }: { safeTop?: number }) {
  return (
    <View style={[styles.detailContainer, { paddingTop: safeTop }]}>
      {/* Top Header */}
      <View style={styles.detailHeader}>
        <SkeletonPill width={38} height={38} radius={19} />
        <SkeletonPill width={120} height={22} radius={6} />
        <SkeletonPill width={38} height={38} radius={19} />
      </View>

      <ScrollView contentContainerStyle={styles.detailContent} showsVerticalScrollIndicator={false}>
        {/* Large Product Gallery Image */}
        <View style={styles.detailImageCard}>
          <SkeletonPill width="85%" height={240} radius={16} />
        </View>

        {/* Brand pill */}
        <SkeletonPill width={80} height={18} radius={9} style={{ marginTop: 16 }} />
        {/* Product Title */}
        <SkeletonPill width="90%" height={24} radius={6} style={{ marginTop: 8 }} />
        {/* Rating summary */}
        <SkeletonPill width="50%" height={16} radius={4} style={{ marginTop: 8 }} />

        {/* Price & Discount Pill */}
        <View style={styles.detailPriceRow}>
          <SkeletonPill width={110} height={28} radius={6} />
          <SkeletonPill width={80} height={20} radius={4} />
          <SkeletonPill width={65} height={22} radius={11} />
        </View>

        {/* Variant Selectors: Storage Pills */}
        <SkeletonPill width={100} height={16} radius={4} style={{ marginTop: 20 }} />
        <View style={styles.chipRow}>
          <SkeletonPill width={74} height={36} radius={10} />
          <SkeletonPill width={74} height={36} radius={10} />
          <SkeletonPill width={74} height={36} radius={10} />
        </View>

        {/* Variant Selectors: Color Swatches */}
        <SkeletonPill width={90} height={16} radius={4} style={{ marginTop: 16 }} />
        <View style={styles.chipRow}>
          <SkeletonPill width={36} height={36} radius={18} />
          <SkeletonPill width={36} height={36} radius={18} />
          <SkeletonPill width={36} height={36} radius={18} />
        </View>

        {/* Inspection Trust Box */}
        <View style={styles.trustBox}>
          <SkeletonPill width="100%" height={56} radius={12} />
        </View>
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View style={styles.bottomBar}>
        <SkeletonPill width="47%" height={48} radius={24} />
        <SkeletonPill width="47%" height={48} radius={24} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeletonBase: {
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  imageWrap: {
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  horizontalScroll: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 12,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  gridCol: {
    width: '48.5%',
    marginBottom: 14,
  },

  /* Product Detail Page Skeleton Styles */
  detailContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailContent: {
    padding: 16,
    paddingBottom: 100,
  },
  detailImageCard: {
    width: '100%',
    height: 280,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  detailPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  trustBox: {
    marginTop: 20,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
});

export default ProductCardSkeleton;
