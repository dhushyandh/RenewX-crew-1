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
            tintColor="#FFC400"
            colors={['#FFC400', '#10B981']}
            progressBackgroundColor="#FFFFFF"
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
                <Ionicons name="heart" size={14} color="#EF4444" style={{ marginRight: 4 }} />
                <Text style={styles.countPillText}>{totalWishlistItems} Items</Text>
              </View>
            </View>

            {/* Gradient Info Banner */}
            <View style={styles.bannerCard}>
              <View style={styles.bannerLeftIconBox}>
                <Ionicons name="heart" size={18} color="#0284C7" />
              </View>

              <View style={styles.bannerTextCol}>
                <ShimmerText variant="blue" style={styles.bannerTitle}>
                  Save your favourite devices
                </ShimmerText>
                <Text style={styles.bannerSubtitle}>
                  Compare, come back later, and never miss a deal.
                </Text>
              </View>

              <View style={styles.bannerGraphic}>
                <View style={styles.graphicHeartPill}>
                  <Ionicons name="sparkles" size={14} color="#A855F7" />
                  <Ionicons name="phone-portrait-outline" size={16} color="#7C3AED" style={{ marginLeft: 2 }} />
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
              style={[styles.modalOption, { borderBottomWidth: 0 }]}
              onPress={() => {
                if (selectedProductForMenu) {
                  handleRemove(selectedProductForMenu.id, selectedProductForMenu.name);
                }
                setSelectedProductForMenu(null);
              }}
            >
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
              <Text style={[styles.modalOptionText, { color: '#EF4444' }]}>Remove from Wishlist</Text>
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
    backgroundColor: '#FFFFFF',
  },

  /* Top Bar */
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#FACC15',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  cartBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0F172A',
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
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
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
    fontWeight: '800',
    color: '#E11D48',
  },

  /* Info Banner */
  bannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#E0F2FE',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  bannerLeftIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#BAE6FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTextCol: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  bannerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },
  bannerGraphic: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  graphicHeartPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  /* List & Cards */
  listContent: {
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  cardMainRow: {
    flexDirection: 'row',
    gap: 12,
  },
  imageContainer: {
    width: 96,
    height: 96,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#F8FAFC',
  },
  discountBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: '#FEF08A',
    borderTopLeftRadius: 10,
    borderBottomRightRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    zIndex: 1,
  },
  discountBadgeText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#854D0E',
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
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
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
    color: '#64748B',
    fontWeight: '500',
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
    fontWeight: '800',
    color: '#0F172A',
  },
  reviewsCount: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  inStockBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  inStockText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#16A34A',
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
    fontSize: 16.5,
    fontWeight: '900',
    color: '#0F172A',
  },
  originalPrice: {
    fontSize: 12,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
    fontWeight: '500',
  },
  addToCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FACC15',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  addToCartBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  footerBadgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerBadgeText: {
    fontSize: 10.5,
    color: '#475569',
    fontWeight: '500',
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
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  exploreBtn: {
    backgroundColor: '#FACC15',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 6,
  },
  exploreBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },

  /* Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  modalOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
});
