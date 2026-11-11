import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  Platform,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import HomeHeader from '@/components/HomeHeader';
import { useSafeHeaderTop } from '@/lib/useSafeHeaderTop';
import { useToast } from '@/context/ToastContext';
import { confirmAction } from '@/lib/confirmAction';
import { api } from '@/services/api';
import { getCategoryDeviceImage } from '@/lib/imageUtils';
import { renewxColors, renewxShadows, renewxTextStyle } from '@/design-system';

function formatMoney(value: number) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`;
}

export default function CartScreen() {
  const safeTop = useSafeHeaderTop();
  const navigation = useNavigation<any>();
  const toast = useToast();
  const { user, isAdmin } = useAuth();
  const scrollRef = useRef<ScrollView>(null);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' as any });
      }
    }, [])
  );
  const {
    items: contextItems,
    updateQuantity,
    removeFromCart,
    clearCart,
    addToCart,
    hydrated,
    refreshInventory,
  } = useCart();

  const [selectedItemIds, setSelectedItemIds] = useState<Record<string, boolean>>({});
  const [recommendedProducts, setRecommendedProducts] = useState<any[]>([]);

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponModalVisible, setCouponModalVisible] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState(0);

  // Initialize selected item ids when real items change
  React.useEffect(() => {
    const initial: Record<string, boolean> = {};
    contextItems.forEach((it) => {
      initial[String(it.id)] = true;
    });
    setSelectedItemIds(initial);
  }, [contextItems]);

  // Load real recommended products from API
  React.useEffect(() => {
    let active = true;
    api.products.getAll({ limit: 4 })
      .then((res: any) => {
        if (!active) return;
        const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
        if (list.length > 0) {
          setRecommendedProducts(
            list.slice(0, 4).map((p: any) => ({
              id: String(p.id || p._id),
              name: p.name,
              specs: p.specs?.[0] || `${p.condition || 'Good'} • Certified`,
              price: p.price,
              originalPrice: p.original_price || p.originalPrice || Math.round(p.price * 1.35),
              discount: `${Math.round((((p.original_price || p.price * 1.35) - p.price) / (p.original_price || p.price * 1.35)) * 100)}% OFF`,
              image:
                typeof (p.image_url || p.imageUrl || p.image) === 'string' &&
                !(p.image_url || p.imageUrl || p.image).includes('unsplash.com') &&
                (p.image_url || p.imageUrl || p.image).trim()
                  ? (p.image_url || p.imageUrl || p.image).trim()
                  : getCategoryDeviceImage(p.category, p.name),
              raw: p,
            }))
          );
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      if (hydrated && contextItems.length > 0) {
        refreshInventory().catch(() => {});
      }
    }, [hydrated, contextItems.length, refreshInventory])
  );

  // Map real cart items for display
  const displayItems = useMemo(() => {
    return contextItems.map((item) => ({
      id: String(item.id),
      name: item.name,
      conditionTag: item.condition ? `Pre-Owned • ${item.condition}` : 'Pre-Owned • Excellent',
      specs: item.brand ? `${item.brand} | ${item.model || 'Verified'}` : 'Verified Device',
      price: item.price,
      originalPrice: item.originalPrice || Math.round(item.price * 1.38),
      discount: `${Math.round((((item.originalPrice || item.price * 1.38) - item.price) / (item.originalPrice || item.price * 1.38)) * 100)}% OFF`,
      quantity: item.quantity,
      is_best_price: Boolean((item as any).is_best_price || (item as any).isBestPrice || item.price === 0),
      isBestPrice: Boolean((item as any).is_best_price || (item as any).isBestPrice || item.price === 0),
      image:
        typeof (item.image || item.images?.[0]) === 'string' &&
        !(item.image || item.images?.[0]).includes('unsplash.com') &&
        (item.image || item.images?.[0]).trim()
          ? (item.image || item.images?.[0]).trim()
          : getCategoryDeviceImage(item.category, item.name),
      stock: item.stock || 10,
      raw: item,
    }));
  }, [contextItems]);

  const toggleItemSelection = (id: string) => {
    setSelectedItemIds((prev) => ({
      ...prev,
      [id]: prev[id] === undefined ? true : !prev[id],
    }));
  };

  const handleUpdateQuantity = (id: string, newQty: number) => {
    if (newQty <= 0) {
      confirmAction('Remove Item', 'Remove this item from your cart?', () => removeFromCart(id));
    } else {
      updateQuantity(id, newQty);
    }
  };

  const handleRemove = (id: string, name: string) => {
    confirmAction('Remove item?', `Remove ${name} from your cart?`, () => {
      removeFromCart(id);
    });
  };

  const handleClearCart = () => {
    confirmAction('Clear Cart?', 'Are you sure you want to remove all items from your cart?', () => {
      clearCart();
    });
  };

  // Calculation for Price Details
  const activeItems = displayItems.filter((it) => selectedItemIds[it.id] !== false);
  const totalItemCount = activeItems.reduce((acc, it) => acc + it.quantity, 0);

  const totalMRP = activeItems.reduce(
    (acc, it) => acc + (it.originalPrice || Math.round(it.price * 1.35)) * it.quantity,
    0
  );
  const totalSellingPrice = activeItems.reduce((acc, it) => acc + it.price * it.quantity, 0);
  const rawDiscount = Math.max(0, totalMRP - totalSellingPrice);
  const totalSavings = rawDiscount + couponDiscount;
  const finalPayable = Math.max(0, totalSellingPrice - couponDiscount);

  const handleApplyCouponCode = () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) return;
    if (code === 'RENEWX10' || code === 'SAVE1000' || code === 'FESTIVE') {
      const discountVal = 1000;
      setCouponDiscount(discountVal);
      setAppliedCoupon(code);
      setCouponModalVisible(false);
      Alert.alert('Coupon Applied!', `Congratulations! ${code} applied. You saved ₹${discountVal}.`);
    } else {
      Alert.alert('Invalid Coupon', 'Please enter a valid coupon code like RENEWX10 or SAVE1000.');
    }
  };

  const handleProceedCheckout = () => {
    if (activeItems.length === 0) {
      Alert.alert('Cart is empty', 'Please select at least 1 item to proceed to checkout.');
      return;
    }
    navigation.navigate('Checkout');
  };

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.allSettled([
        refreshInventory(),
        api.products.getAll({ limit: 4 }).then((res: any) => {
          const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
          if (list.length > 0) {
            setRecommendedProducts(
              list.slice(0, 4).map((p: any) => ({
                id: String(p.id || p._id),
                name: p.name,
                specs: p.specs?.[0] || `${p.condition || 'Good'} • Certified`,
                price: p.price,
                originalPrice: p.original_price || p.originalPrice || Math.round(p.price * 1.35),
                discount: `${Math.round((((p.original_price || p.price * 1.35) - p.price) / (p.original_price || p.price * 1.35)) * 100)}% OFF`,
                image:
                  typeof (p.image_url || p.imageUrl || p.image) === 'string' &&
                  !(p.image_url || p.imageUrl || p.image).includes('unsplash.com') &&
                  (p.image_url || p.imageUrl || p.image).trim()
                    ? (p.image_url || p.imageUrl || p.image).trim()
                    : getCategoryDeviceImage(p.category, p.name),
                raw: p,
              }))
            );
          }
        }),
      ]);
    } catch {
      // ignore
    } finally {
      setRefreshing(false);
    }
  }, [refreshInventory]);

  return (
    <View style={styles.container}>
      {/* 1. Top Header (Matching Reference Image 2: Cart) */}
      <HomeHeader
        mode="cart"
        title="My Cart"
        cartCount={totalItemCount}
        onBack={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs', { screen: 'Home' }))}
        onCart={() => {}}
      />

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={renewxColors.yellow}
            colors={[renewxColors.yellow, renewxColors.emerald]}
            progressBackgroundColor="#FFFFFF"
          />
        }
      >

        {/* Empty state fallback */}
        {displayItems.length === 0 && (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="bag-handle-outline" size={36} color="#059669" />
            </View>
            <Text style={styles.emptyTitle}>Your cart is empty</Text>
            <Text style={styles.emptySubtitle}>
              Explore our quality-tested laptops, phones, and audio devices at unbeatable prices.
            </Text>
            <TouchableOpacity
              style={[styles.browseBtn, { marginTop: 16, paddingHorizontal: 24 }]}
              onPress={() => navigation.navigate('MainTabs', { screen: 'Shop' })}
              activeOpacity={0.8}
            >
              <Text style={styles.browseBtnText}>Browse Devices</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 3. Cart Item Cards (Accurate to Image 1) */}
        {displayItems.map((item) => {
          const isSelected = selectedItemIds[item.id] !== false;

          return (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemCardTop}>
                {/* Green Checkbox */}
                <TouchableOpacity
                  style={[styles.checkbox, isSelected && styles.checkboxActive]}
                  onPress={() => toggleItemSelection(item.id)}
                  activeOpacity={0.8}
                >
                  {isSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                </TouchableOpacity>

                {/* Product Thumbnail */}
                <View style={styles.imageContainer}>
                  <Image
                    source={typeof item.image === 'string' ? { uri: item.image } : item.image}
                    style={styles.productImage}
                    resizeMode="contain"
                  />
                </View>

                {/* Middle Info Column */}
                <View style={styles.infoCol}>
                  <View style={styles.titleTrashRow}>
                    <Text style={styles.productName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleRemove(item.id, item.name)}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={17} color="#94A3B8" />
                    </TouchableOpacity>
                  </View>

                  {/* Condition Badge */}
                  <View style={styles.refurbishedBadge}>
                    <Text style={styles.refurbishedBadgeText}>{item.conditionTag}</Text>
                  </View>

                  {/* Specs */}
                  <Text style={styles.specsText}>{item.specs}</Text>

                  {/* Save for later */}
                  <TouchableOpacity
                    style={styles.saveForLaterRow}
                    onPress={() => Alert.alert('Saved', `${item.name} saved for later.`)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="bookmark-outline" size={13} color="#64748B" style={{ marginRight: 4 }} />
                    <Text style={styles.saveForLaterText}>Save for later</Text>
                  </TouchableOpacity>
                </View>

                {/* Right Price & Stepper Column */}
                <View style={styles.priceStepperCol}>
                  {item.is_best_price || item.isBestPrice || item.price === 0 ? (
                    <View style={{ alignItems: 'flex-end', marginBottom: 4 }}>
                      <Text style={styles.bestPriceLabel}>Best Price</Text>
                      <Text style={styles.codOnlyBadge}>COD Only</Text>
                    </View>
                  ) : (
                    <>
                      <Text style={styles.currentPriceText}>{formatMoney(item.price)}</Text>
                      {item.originalPrice ? (
                        <Text style={styles.originalPriceText}>{formatMoney(item.originalPrice)}</Text>
                      ) : null}
                      {item.discount ? (
                        <View style={styles.discountBadge}>
                          <Text style={styles.discountBadgeText}>{item.discount}</Text>
                        </View>
                      ) : null}
                    </>
                  )}

                  {/* Stepper capsule */}
                  <View style={styles.stepperContainer}>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="remove" size={14} color="#0F172A" />
                    </TouchableOpacity>

                    <Text style={styles.stepperValue}>{item.quantity}</Text>

                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="add" size={14} color="#0F172A" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          );
        })}

        {/* 5. Price Details Card */}
        {activeItems.length > 0 && (
          <View style={styles.priceDetailsCard}>
            <Text style={styles.priceDetailsTitle}>Price Details</Text>

            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Total MRP ({totalItemCount} items)</Text>
              <Text style={styles.priceValue}>{formatMoney(totalMRP)}</Text>
            </View>

            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Discount on Products</Text>
              <Text style={styles.priceDiscountValue}>- {formatMoney(rawDiscount)}</Text>
            </View>

            {couponDiscount > 0 && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Coupon Discount</Text>
                <Text style={styles.priceDiscountValue}>- {formatMoney(couponDiscount)}</Text>
              </View>
            )}

            <View style={styles.priceRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.priceLabel}>Delivery Charges</Text>
                <Ionicons name="information-circle-outline" size={13} color="#94A3B8" style={{ marginLeft: 4 }} />
              </View>
              <Text style={styles.freeDeliveryText}>FREE</Text>
            </View>

            <View style={styles.priceDivider} />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>{formatMoney(finalPayable)}</Text>
            </View>

            {/* Green Saving Banner */}
            <View style={styles.savingsBanner}>
              <Ionicons name="shield-checkmark" size={16} color="#059669" style={{ marginRight: 6 }} />
              <Text style={styles.savingsBannerText}>
                You are saving {formatMoney(totalSavings)}
              </Text>
              <Ionicons name="chevron-forward" size={14} color="#059669" style={{ marginLeft: 'auto' }} />
            </View>
          </View>
        )}

        {/* 6. "You may also like" Section */}
        {recommendedProducts.length > 0 && (
          <View style={styles.recommendationsSection}>
            <View style={styles.recHeaderRow}>
              <Text style={styles.recSectionTitle}>You may also like</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('MainTabs', { screen: 'Shop' })}
                style={{ flexDirection: 'row', alignItems: 'center' }}
              >
                <Text style={styles.recViewAll}>View All</Text>
                <Ionicons name="arrow-forward" size={13} color={renewxColors.emerald} style={{ marginLeft: 2 }} />
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recListContainer}>
              {recommendedProducts.map((prod) => (
                <View key={prod.id} style={styles.recCard}>
                  {/* Yellow discount pill badge */}
                  {prod.discount ? (
                    <View style={styles.recDiscountBadge}>
                      <Text style={styles.recDiscountText}>{prod.discount}</Text>
                    </View>
                  ) : null}

                  {/* Wishlist Heart */}
                  <TouchableOpacity
                    style={styles.recHeartBtn}
                    activeOpacity={0.8}
                    onPress={() => Alert.alert('Wishlist', `${prod.name} added to your wishlist.`)}
                  >
                    <Ionicons name="heart-outline" size={16} color="#475569" />
                  </TouchableOpacity>

                  <Image
                    source={typeof prod.image === 'string' ? { uri: prod.image } : prod.image}
                    style={styles.recProductImage}
                    resizeMode="contain"
                  />

                  <Text style={styles.recProdName} numberOfLines={1}>
                    {prod.name}
                  </Text>
                  <Text style={styles.recProdSpecs} numberOfLines={1}>
                    {prod.specs}
                  </Text>

                  <View style={styles.recPriceRow}>
                    <View>
                      <Text style={styles.recPriceText}>{formatMoney(prod.price)}</Text>
                      {prod.originalPrice ? (
                        <Text style={styles.recOriginalPrice}>{formatMoney(prod.originalPrice)}</Text>
                      ) : null}
                    </View>

                    {/* Yellow cart icon button */}
                    <TouchableOpacity
                      style={styles.recCartBtn}
                      activeOpacity={0.85}
                      onPress={() => {
                        addToCart({
                          id: prod.id,
                          name: prod.name,
                          brand: prod.raw?.brand || 'RenewX',
                          category: prod.raw?.category || 'Phones',
                          originalPrice: prod.originalPrice,
                          price: prod.price,
                          condition: prod.raw?.condition || 'Excellent',
                          warrantyMonths: prod.raw?.warrantyMonths || 6,
                          image: prod.image,
                          rating: prod.raw?.rating || 4.8,
                          reviews: prod.raw?.reviews || 42,
                          stock: prod.raw?.stock || 5,
                          description: prod.specs,
                          specs: [prod.specs],
                        });
                        toast.success(prod.name, 'Added to Cart');
                      }}
                    >
                      <Ionicons name="cart" size={15} color="#000000" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Space for bottom checkout bar */}
        {displayItems.length > 0 && <View style={{ height: 110 }} />}
      </ScrollView>

      {/* 7. Bottom Sticky Checkout Action Bar (Only when cart has items) */}
      {displayItems.length > 0 && (
        <View style={styles.bottomCheckoutBar}>
          <View style={styles.bottomSecureCol}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.secureShieldCircle}>
                <Ionicons name="shield-checkmark" size={16} color="#15803D" />
              </View>
              <View>
                <Text style={styles.secureTitle}>100% Secure Checkout</Text>
                <Text style={styles.secureSubtext}>Safe payments with Razorpay</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.proceedCheckoutBtn}
            onPress={handleProceedCheckout}
            activeOpacity={0.88}
          >
            <Text style={styles.proceedBtnTitle}>Proceed to Checkout →</Text>
            <Text style={styles.proceedBtnSubtext}>
              {formatMoney(finalPayable)} • {totalItemCount} items
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Coupon Modal */}
      <Modal visible={couponModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Apply Promo Code</Text>
              <TouchableOpacity onPress={() => setCouponModalVisible(false)}>
                <Ionicons name="close" size={22} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              Enter a valid coupon or promo code to get instant discounts on electronics.
            </Text>

            <TextInput
              style={styles.couponInput}
              placeholder="e.g. RENEWX10 or SAVE1000"
              placeholderTextColor="#94A3B8"
              value={couponCode}
              onChangeText={setCouponCode}
              autoCapitalize="characters"
            />

            <View style={styles.suggestedPillsRow}>
              {['RENEWX10', 'SAVE1000', 'FESTIVE'].map((code) => (
                <TouchableOpacity
                  key={code}
                  style={styles.suggestedPill}
                  onPress={() => setCouponCode(code)}
                >
                  <Text style={styles.suggestedPillText}>{code}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.applyCouponSubmit} onPress={handleApplyCouponCode}>
              <Text style={styles.applyCouponSubmitText}>Apply Discount</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  cartHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  cartBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 2,
        elevation: 1,
      },
    }),
  },
  cartHeaderTitle: {
    ...renewxTextStyle('extraBold'),
    fontSize: 18,
    color: renewxColors.black,
  },
  cartHeaderRight: {
    minWidth: 38,
    alignItems: 'flex-end',
  },
  clearCartPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  clearCartPillText: {
    ...renewxTextStyle('bold'),
    fontSize: 12,
    color: renewxColors.error,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  // Title Row
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  pageTitle: {
    ...renewxTextStyle('extraBold'),
    fontSize: 20,
    color: renewxColors.black,
  },
  itemCountText: {
    ...renewxTextStyle('medium'),
    fontSize: 14,
    color: renewxColors.textSecondary,
  },
  clearCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  clearCartText: {
    ...renewxTextStyle('semibold'),
    fontSize: 13,
    color: renewxColors.textSecondary,
  },

  // Empty State
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginVertical: 20,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: renewxColors.mint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    ...renewxTextStyle('bold'),
    fontSize: 17,
    color: renewxColors.black,
    marginBottom: 6,
  },
  emptySubtitle: {
    ...renewxTextStyle('regular'),
    fontSize: 13,
    color: renewxColors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  restoreDemoBtn: {
    backgroundColor: renewxColors.black,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  restoreDemoBtnText: {
    ...renewxTextStyle('semibold'),
    color: '#FFFFFF',
    fontSize: 13,
  },
  browseBtn: {
    backgroundColor: renewxColors.emerald,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  browseBtnText: {
    ...renewxTextStyle('bold'),
    color: '#FFFFFF',
    fontSize: 13,
  },

  // Cart Item Card
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...(renewxShadows.card as object),
  },
  itemCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginRight: 10,
  },
  checkboxActive: {
    backgroundColor: renewxColors.emerald,
    borderColor: renewxColors.emerald,
  },
  imageContainer: {
    width: 74,
    height: 74,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  productImage: {
    width: 66,
    height: 66,
  },
  infoCol: {
    flex: 1,
    marginRight: 8,
  },
  titleTrashRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productName: {
    ...renewxTextStyle('bold'),
    fontSize: 15,
    color: renewxColors.black,
    flex: 1,
    marginRight: 6,
  },
  refurbishedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: renewxColors.yellowSoft,
    borderWidth: 1,
    borderColor: renewxColors.yellowLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
    marginTop: 4,
    marginBottom: 4,
  },
  refurbishedBadgeText: {
    ...renewxTextStyle('bold'),
    fontSize: 10.5,
    color: '#9A6700',
  },
  specsText: {
    ...renewxTextStyle('regular'),
    fontSize: 12,
    color: renewxColors.textMuted,
    marginBottom: 4,
  },
  warrantyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  warrantyText: {
    ...renewxTextStyle('medium'),
    fontSize: 11.5,
    color: renewxColors.black,
  },
  saveForLaterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  saveForLaterText: {
    ...renewxTextStyle('medium'),
    fontSize: 11.5,
    color: renewxColors.textMuted,
  },

  // Price & Stepper
  priceStepperCol: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    minHeight: 84,
  },
  bestPriceLabel: {
    ...renewxTextStyle('extraBold'),
    fontSize: 13,
    color: renewxColors.emerald,
  },
  codOnlyBadge: {
    ...renewxTextStyle('bold'),
    fontSize: 9.5,
    color: '#9A6700',
    backgroundColor: renewxColors.yellowLight,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    marginTop: 2,
  },
  currentPriceText: {
    ...renewxTextStyle('extraBold'),
    fontSize: 16,
    color: renewxColors.black,
  },
  originalPriceText: {
    ...renewxTextStyle('regular'),
    fontSize: 11.5,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
    marginTop: 1,
  },
  discountBadge: {
    backgroundColor: renewxColors.mint,
    borderWidth: 1,
    borderColor: renewxColors.mintBorder,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 3,
    marginBottom: 6,
  },
  discountBadgeText: {
    ...renewxTextStyle('bold'),
    fontSize: 10,
    color: renewxColors.emerald,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  stepperBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    ...renewxTextStyle('bold'),
    fontSize: 13,
    color: renewxColors.black,
    paddingHorizontal: 8,
  },

  // Price Details
  priceDetailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  priceDetailsTitle: {
    ...renewxTextStyle('extraBold'),
    fontSize: 15,
    color: renewxColors.black,
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceLabel: {
    ...renewxTextStyle('regular'),
    fontSize: 13,
    color: renewxColors.textSecondary,
  },
  priceValue: {
    ...renewxTextStyle('semibold'),
    fontSize: 13.5,
    color: renewxColors.black,
  },
  priceDiscountValue: {
    ...renewxTextStyle('bold'),
    fontSize: 13.5,
    color: renewxColors.emerald,
  },
  freeDeliveryText: {
    ...renewxTextStyle('extraBold'),
    fontSize: 13,
    color: renewxColors.emerald,
  },
  priceDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 10,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  totalLabel: {
    ...renewxTextStyle('extraBold'),
    fontSize: 15,
    color: renewxColors.black,
  },
  totalValue: {
    ...renewxTextStyle('black'),
    fontSize: 17,
    color: renewxColors.black,
  },
  savingsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: renewxColors.mintLight,
    borderWidth: 1,
    borderColor: renewxColors.mintBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  savingsBannerText: {
    ...renewxTextStyle('bold'),
    fontSize: 12.5,
    color: renewxColors.emerald,
  },

  // Recommendations
  recommendationsSection: {
    marginBottom: 16,
  },
  recHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  recSectionTitle: {
    ...renewxTextStyle('extraBold'),
    fontSize: 16,
    color: renewxColors.black,
  },
  recViewAll: {
    ...renewxTextStyle('bold'),
    fontSize: 13,
    color: renewxColors.emerald,
  },
  recListContainer: {
    paddingRight: 10,
    gap: 12,
  },
  recCard: {
    width: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    position: 'relative',
  },
  recDiscountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: renewxColors.yellowLight,
    borderWidth: 1,
    borderColor: renewxColors.yellowDark,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    zIndex: 1,
  },
  recDiscountText: {
    ...renewxTextStyle('extraBold'),
    fontSize: 9.5,
    color: renewxColors.black,
  },
  recHeartBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recProductImage: {
    width: 110,
    height: 90,
    alignSelf: 'center',
    marginTop: 14,
    marginBottom: 8,
  },
  recProdName: {
    ...renewxTextStyle('bold'),
    fontSize: 12.5,
    color: renewxColors.black,
  },
  recProdSpecs: {
    ...renewxTextStyle('regular'),
    fontSize: 10.5,
    color: renewxColors.textMuted,
    marginBottom: 6,
  },
  recPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  recPriceText: {
    ...renewxTextStyle('extraBold'),
    fontSize: 13,
    color: renewxColors.black,
  },
  recOriginalPrice: {
    ...renewxTextStyle('regular'),
    fontSize: 10,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  recCartBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: renewxColors.yellow,
    borderWidth: 1,
    borderColor: renewxColors.yellowDark,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Bottom Sticky Action Bar
  bottomCheckoutBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  bottomSecureCol: {
    flex: 1,
    marginRight: 10,
  },
  secureShieldCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: renewxColors.mint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  secureTitle: {
    ...renewxTextStyle('bold'),
    fontSize: 11.5,
    color: renewxColors.black,
  },
  secureSubtext: {
    ...renewxTextStyle('regular'),
    fontSize: 10,
    color: renewxColors.textMuted,
  },
  proceedCheckoutBtn: {
    backgroundColor: renewxColors.mintDark,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 190,
  },
  proceedBtnTitle: {
    ...renewxTextStyle('extraBold'),
    color: '#FFFFFF',
    fontSize: 13.5,
  },
  proceedBtnSubtext: {
    ...renewxTextStyle('semibold'),
    color: '#D1FAE5',
    fontSize: 10.5,
    marginTop: 1,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalTitle: {
    ...renewxTextStyle('extraBold'),
    fontSize: 17,
    color: renewxColors.black,
  },
  modalDescription: {
    ...renewxTextStyle('regular'),
    fontSize: 12.5,
    color: renewxColors.textMuted,
    lineHeight: 18,
    marginBottom: 16,
  },
  couponInput: {
    ...renewxTextStyle('bold'),
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: renewxColors.black,
    marginBottom: 12,
  },
  suggestedPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  suggestedPill: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  suggestedPillText: {
    ...renewxTextStyle('bold'),
    fontSize: 11,
    color: renewxColors.black,
  },
  applyCouponSubmit: {
    backgroundColor: renewxColors.emerald,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  applyCouponSubmitText: {
    ...renewxTextStyle('bold'),
    color: '#FFFFFF',
    fontSize: 14,
  },
});
