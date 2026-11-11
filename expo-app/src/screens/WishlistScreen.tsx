import React, { useCallback, useState, useRef } from 'react';
import {
  FlatList,
  Image,
  Modal,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import type { RootStackParamList } from '@/App';
import type { Product } from '@/types';
import { useWishlist } from '@/context/WishlistContext';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { useSafeHeaderTop } from '@/lib/useSafeHeaderTop';
import RenewXLogo from '@/components/RenewXLogo';
import ShimmerText from '@/components/ShimmerText';
import HomeHeader from '@/components/HomeHeader';
import { renewxColors, renewxShadows, renewxTextStyle } from '@/design-system';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function WishlistScreen() {
  const safeTop = useSafeHeaderTop();
  const navigation = useNavigation<NavigationProp>();
  const { wishlist, removeFromWishlist, totalWishlistItems, refreshWishlist } = useWishlist();
  const { addToCart, totalItems: cartCount } = useCart();
  const toast = useToast();
  const listRef = useRef<FlatList>(null);

  useFocusEffect(
    useCallback(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' as any });
      }
    }, [])
  );

  const [selectedProductForMenu, setSelectedProductForMenu] = useState<Product | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (refreshWishlist) {
        await refreshWishlist();
      }
    } finally {
      setRefreshing(false);
    }
  }, [refreshWishlist]);

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('MainTabs', { screen: 'Home' });
  }, [navigation]);

  const handleAddToCart = useCallback(
    (product: Product) => {
      addToCart(product);
      toast.success(product.name, 'Added to Cart');
      navigation.navigate('Cart');
    },
    [addToCart, toast, navigation]
  );

  const handleRemove = useCallback(
    (productId: string | number, productName: string) => {
      removeFromWishlist(productId);
      toast.info(productName, 'Removed from Wishlist');
    },
    [removeFromWishlist, toast]
  );

  // Helper to extract specs and discount for each card
  const getCardDetails = (item: Product) => {
    const orig = Number(item.originalPrice) || 0;
    const price = Number(item.price) || 0;
    let discountPct = 25;
    if (orig > price) {
      discountPct = Math.round(((orig - price) / orig) * 100);
    }

    // Specs line (storage · color · condition)
    let storage = '128 GB';
    if (item.name.includes('256GB') || item.name.includes('256 GB')) storage = '256 GB';
    else if (item.name.includes('512GB') || item.name.includes('512 GB')) storage = '512 GB';
    else if (item.name.includes('64GB') || item.name.includes('64 GB')) storage = '64 GB';
    else if (item.specs && item.specs[0]) storage = item.specs[0];

    let color = 'Deep Purple';
    if (item.specs && item.specs[1]) color = item.specs[1];
    else if (item.name.includes('Space Grey')) color = 'Space Grey';
    else if (item.name.includes('Blue')) color = 'Blue';
    else if (item.name.includes('Phantom Black')) color = 'Phantom Black';
    else if (item.name.includes('White')) color = 'White';
    else if (item.name.includes('Midnight')) color = 'Midnight';

    const cond = item.condition || (item.specs && item.specs[2]) || 'Excellent';
    const specsLine = `${storage}  ·  ${color}  ·  ${cond}`;

    const rating = (item.rating || 4.6).toFixed(1);
    const reviews = item.reviews
      ? item.reviews >= 1000
        ? `${(item.reviews / 1000).toFixed(1)}K`
        : `${item.reviews}`
      : '892';

    return { discountPct, specsLine, rating, reviews };
  };

  const renderWishlistItem = ({ item }: { item: Product }) => {
    const details = getCardDetails(item);

    return (
      <View style={styles.card}>
        <View style={styles.cardMainRow}>
          {/* Left: Product Image with Discount Pin */}
          <TouchableOpacity
            style={styles.imageContainer}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('ProductDetail', { id: String(item.id), product: item })}
          >
            <View style={styles.discountBadge}>
              <Text style={styles.discountBadgeText}>{details.discountPct}% OFF</Text>
            </View>
            <Image source={{ uri: item.image }} style={styles.productImg} resizeMode="contain" />
          </TouchableOpacity>

          {/* Right: Info Details */}
          <View style={styles.infoCol}>
            {/* Title & Actions Row */}
            <View style={styles.titleRow}>
              <TouchableOpacity
                style={{ flex: 1 }}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('ProductDetail', { id: String(item.id), product: item })}
              >
                <Text style={styles.productTitle} numberOfLines={1}>
                  {item.name}
                </Text>
              </TouchableOpacity>

              <View style={styles.actionIconsRow}>
                {/* Red Filled Heart to Remove */}
                <TouchableOpacity
                  style={styles.heartBtn}
                  onPress={() => handleRemove(item.id, item.name)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Remove from wishlist"
                >
                  <Ionicons name="heart" size={19} color="#EF4444" />
                </TouchableOpacity>

                {/* Three dots menu */}
                <TouchableOpacity
                  style={styles.dotsBtn}
                  onPress={() => setSelectedProductForMenu(item)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="ellipsis-vertical" size={16} color="#64748B" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Specs Line */}
            <Text style={styles.specsLineText} numberOfLines={1}>
              {details.specsLine}
            </Text>

            {/* Rating & Stock Status */}
            <View style={styles.ratingStockRow}>
              <View style={styles.ratingGroup}>
                <Ionicons name="star" size={13} color="#F59E0B" />
                <Text style={styles.ratingScore}>{details.rating}</Text>
                <Text style={styles.reviewsCount}>({details.reviews} reviews)</Text>
              </View>

              <View style={styles.inStockBadge}>
                <Text style={styles.inStockText}>In Stock</Text>
              </View>
            </View>

            {/* Price & Add to Cart Row */}
            <View style={styles.priceActionRow}>
              <View style={styles.priceGroup}>
                <Text style={styles.currentPrice}>
                  ₹{Number(item.price).toLocaleString('en-IN')}
                </Text>
                {Number(item.originalPrice) > Number(item.price) && (
                  <Text style={styles.originalPrice}>
                    ₹{Number(item.originalPrice).toLocaleString('en-IN')}
                  </Text>
                )}
              </View>

              <TouchableOpacity
                style={styles.addToCartBtn}
                onPress={() => handleAddToCart(item)}
                activeOpacity={0.85}
              >
                <Ionicons name="cart" size={15} color="#0F172A" style={{ marginRight: 4 }} />
                <Text style={styles.addToCartBtnText}>Add to Cart</Text>
              </TouchableOpacity>
            </View>

            {/* Delivery & Quality Badges */}
            <View style={styles.cardFooterRow}>
              <View style={styles.footerBadgeItem}>
                <Ionicons name="bicycle-outline" size={13} color="#475569" />
                <Text style={styles.footerBadgeText}>Free Delivery</Text>
              </View>

              <View style={styles.footerBadgeItem}>
                <Ionicons name="shield-checkmark-outline" size={13} color="#475569" />
                <Text style={styles.footerBadgeText}>Quality Tested</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.screenContainer}>
      {/* 1. Top Bar (Matching Reference Image 7: Wishlist) */}
      <HomeHeader
        mode="wishlist"
        title="Wishlist"
        wishlistCount={totalWishlistItems}
        onBack={handleBack}
        onWishlist={() => {}}
        onFilterPress={() => {}}
      />

      <FlatList
        ref={listRef}
        data={wishlist}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderWishlistItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={renewxColors.yellow}
            colors={[renewxColors.yellow, renewxColors.emerald]}
            progressBackgroundColor={renewxColors.surface}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            {/* Title & Pill Count */}
            <View style={styles.headingRow}>
              <View>
                <Text style={styles.pageTitle}>My Wishlist</Text>
                <Text style={styles.pageSubtitle}>Your saved devices for later</Text>
              </View>

              <View style={styles.countPill}>
                <Ionicons name="heart" size={14} color={renewxColors.error} style={{ marginRight: 4 }} />
                <Text style={styles.countPillText}>{totalWishlistItems} Items</Text>
              </View>
            </View>

            {/* Brand Info Banner */}
            <View style={styles.bannerCard}>
              <View style={styles.bannerLeftIconBox}>
                <Ionicons name="heart" size={18} color="#9A6700" />
              </View>

              <View style={styles.bannerTextCol}>
                <ShimmerText variant="gold" style={styles.bannerTitle}>
                  Save your favourite devices
                </ShimmerText>
                <Text style={styles.bannerSubtitle}>
                  Compare, come back later, and never miss a deal.
                </Text>
              </View>

              <View style={styles.bannerGraphic}>
                <View style={styles.graphicHeartPill}>
                  <Ionicons name="sparkles" size={14} color={renewxColors.yellowDark} />
                  <Ionicons name="phone-portrait-outline" size={16} color={renewxColors.emerald} style={{ marginLeft: 2 }} />
                </View>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="heart-dislike-outline" size={42} color="#94A3B8" />
            </View>
            <Text style={styles.emptyTitle}>Your wishlist is empty</Text>
            <Text style={styles.emptySubtitle}>
              Tap the heart icon on any smartphone, laptop or accessory to save it here for later.
            </Text>
            <TouchableOpacity
              style={styles.exploreBtn}
              onPress={() => navigation.navigate('MainTabs', { screen: 'Shop' })}
              activeOpacity={0.85}
            >
              <Text style={styles.exploreBtnText}>Explore Certified Devices</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Item Action Modal (Three dots) */}
      <Modal
        visible={!!selectedProductForMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedProductForMenu(null)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setSelectedProductForMenu(null)}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{selectedProductForMenu?.name}</Text>
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => {
                if (selectedProductForMenu) handleAddToCart(selectedProductForMenu);
                setSelectedProductForMenu(null);
              }}
            >
              <Ionicons name="cart-outline" size={18} color="#0F172A" />
              <Text style={styles.modalOptionText}>Move to Cart</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => {
                if (selectedProductForMenu) {
                  navigation.navigate('ProductDetail', {
                    id: String(selectedProductForMenu.id),
                    product: selectedProductForMenu,
                  });
                }
                setSelectedProductForMenu(null);
              }}
            >
              <Ionicons name="eye-outline" size={18} color="#0F172A" />
              <Text style={styles.modalOptionText}>View Product Details</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalOption, styles.modalOptionLast]}
              onPress={() => {
                if (selectedProductForMenu) {
                  handleRemove(selectedProductForMenu.id, selectedProductForMenu.name);
                }
                setSelectedProductForMenu(null);
              }}
            >
              <Ionicons name="trash-outline" size={18} color={renewxColors.error} />
              <Text style={[styles.modalOptionText, styles.modalOptionRemoveText]}>Remove from Wishlist</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: renewxColors.background,
  },

  /* Top Bar */
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: renewxColors.border,
    backgroundColor: renewxColors.surface,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cartBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: renewxColors.yellow,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1,
    borderColor: renewxColors.yellowDark,
  },
  cartBadgeText: {
    fontSize: 10,
    ...renewxTextStyle('extraBold'),
    color: renewxColors.black,
  },
  profileBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Header Block */
  headerBlock: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  pageTitle: {
    fontSize: 28,
    ...renewxTextStyle('black'),
    color: renewxColors.black,
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: 14,
    color: renewxColors.textMuted,
    ...renewxTextStyle('medium'),
    marginTop: 2,
  },
  countPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE4E6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  countPillText: {
    fontSize: 13,
    ...renewxTextStyle('extraBold'),
    color: '#E11D48',
  },

  /* Info Banner */
  bannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: renewxColors.yellowSoft,
    borderWidth: 1,
    borderColor: renewxColors.yellowLight,
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  bannerLeftIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: renewxColors.yellowLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTextCol: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    ...renewxTextStyle('extraBold'),
    color: renewxColors.black,
  },
  bannerSubtitle: {
    fontSize: 11.5,
    color: renewxColors.textSecondary,
    ...renewxTextStyle('medium'),
    marginTop: 2,
  },
  bannerGraphic: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  graphicHeartPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: renewxColors.mint,
    borderWidth: 1,
    borderColor: renewxColors.mintBorder,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  /* List & Cards */
  listContent: {
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: renewxColors.surface,
    borderRadius: 18,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: renewxColors.border,
    ...(renewxShadows.card as object),
  },
  cardMainRow: {
    flexDirection: 'row',
    gap: 12,
  },
  imageContainer: {
    width: 96,
    height: 96,
    borderRadius: 12,
    backgroundColor: renewxColors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: renewxColors.border,
  },
  discountBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: renewxColors.yellowLight,
    borderTopLeftRadius: 10,
    borderBottomRightRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    zIndex: 1,
  },
  discountBadgeText: {
    fontSize: 9.5,
    ...renewxTextStyle('black'),
    color: '#8A6500',
  },
  productImg: {
    width: '85%',
    height: '85%',
  },
  infoCol: {
    flex: 1,
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productTitle: {
    fontSize: 15,
    ...renewxTextStyle('bold'),
    color: renewxColors.black,
  },
  actionIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heartBtn: {
    padding: 2,
  },
  dotsBtn: {
    padding: 2,
  },
  specsLineText: {
    fontSize: 11.5,
    color: renewxColors.textMuted,
    ...renewxTextStyle('medium'),
    marginTop: 2,
  },
  ratingStockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  ratingGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingScore: {
    fontSize: 12,
    ...renewxTextStyle('extraBold'),
    color: renewxColors.black,
  },
  reviewsCount: {
    fontSize: 11,
    color: renewxColors.textMuted,
    ...renewxTextStyle('medium'),
  },
  inStockBadge: {
    backgroundColor: renewxColors.mint,
    borderWidth: 1,
    borderColor: renewxColors.mintBorder,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  inStockText: {
    fontSize: 10,
    ...renewxTextStyle('bold'),
    color: renewxColors.emerald,
  },
  priceActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  priceGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  currentPrice: {
    fontSize: 17,
    ...renewxTextStyle('black'),
    color: renewxColors.black,
  },
  originalPrice: {
    fontSize: 12,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
    ...renewxTextStyle('medium'),
  },
  addToCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: renewxColors.yellow,
    borderWidth: 1,
    borderColor: renewxColors.yellowDark,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  addToCartBtnText: {
    fontSize: 12,
    ...renewxTextStyle('bold'),
    color: renewxColors.black,
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: renewxColors.surfaceMuted,
  },
  footerBadgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerBadgeText: {
    fontSize: 10.5,
    color: renewxColors.textSecondary,
    ...renewxTextStyle('medium'),
  },

  /* Empty State */
  emptyContainer: {
    paddingVertical: 60,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 12,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: renewxColors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    ...renewxTextStyle('extraBold'),
    color: renewxColors.black,
  },
  emptySubtitle: {
    fontSize: 13,
    ...renewxTextStyle('regular'),
    color: renewxColors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 280,
  },
  exploreBtn: {
    backgroundColor: renewxColors.yellow,
    borderWidth: 1,
    borderColor: renewxColors.yellowDark,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 6,
  },
  exploreBtnText: {
    fontSize: 14,
    ...renewxTextStyle('bold'),
    color: renewxColors.black,
  },

  /* Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: renewxColors.surface,
    borderRadius: 18,
    padding: 16,
    ...(renewxShadows.elevated as object),
  },
  modalTitle: {
    fontSize: 15.5,
    ...renewxTextStyle('bold'),
    color: renewxColors.black,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: renewxColors.surfaceMuted,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: renewxColors.surfaceMuted,
  },
  modalOptionLast: {
    borderBottomWidth: 0,
  },
  modalOptionText: {
    fontSize: 14,
    ...renewxTextStyle('semibold'),
    color: renewxColors.black,
  },
  modalOptionRemoveText: {
    color: renewxColors.error,
  },
});
