import { useNavigation } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  FlatList,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '@/context/CartContext';
import { confirmAction } from '@/lib/confirmAction';
import { useSafeHeaderTop } from '@/lib/useSafeHeaderTop';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme';

function formatMoney(value: number) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`;
}

export default function CartScreen() {
  const safeTop = useSafeHeaderTop();
  const {
    items,
    updateQuantity,
    removeFromCart,
    subtotal,
    savings,
    totalItems,
    hydrated,
  } = useCart();

  const navigation = useNavigation<any>();

  const handleRemove = (item: any) => {
    const itemId = item.id ?? item._uuid ?? item._id;
    confirmAction(
      'Remove item?',
      `Remove ${item.name || 'this item'} from your cart?`,
      () => removeFromCart(itemId),
      'Remove'
    );
  };

  const handleDecrease = (item: any) => {
    const itemId = item.id ?? item._uuid ?? item._id;
    if (item.quantity <= 1) {
      handleRemove(item);
      return;
    }

    updateQuantity(itemId, item.quantity - 1);
  };

  if (!hydrated) {
    return (
      <View style={[styles.container, { paddingTop: safeTop }]}>
        <View style={styles.loadingScreen}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingTitle}>Loading your cart</Text>
          <Text style={styles.loadingText}>Just a moment…</Text>
        </View>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: safeTop }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerIcon}
            onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs', { screen: 'Home' }))}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={21} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.title}>Your Cart</Text>
          </View>

          <View style={styles.headerIconPlaceholder} />
        </View>

        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="bag-handle-outline" size={38} color={colors.text} />
          </View>

          <Text style={styles.emptyTitle}>Your cart is empty</Text>

          <Text style={styles.emptySubtitle}>
            Nothing here yet. Browse our devices and add something you like.
          </Text>

          <TouchableOpacity
            style={styles.shopButton}
            onPress={() => navigation.navigate('Shop')}
            activeOpacity={0.85}
          >
            <Text style={styles.shopButtonText}>Browse Devices</Text>
            <Ionicons name="arrow-forward" size={17} color={colors.black} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: safeTop }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerIcon}
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs', { screen: 'Home' }))}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={21} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.title}>Your Cart</Text>
          <Text style={styles.itemCount}>
            {totalItems} {totalItems === 1 ? 'item' : 'items'}
          </Text>
        </View>

        <View style={styles.headerIconPlaceholder} />
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.cartItem}>
            <View style={styles.imageWrap}>
              {item.image ? (
                <Image
                  source={{ uri: item.image }}
                  style={styles.itemImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons
                    name="image-outline"
                    size={25}
                    color={colors.textMuted}
                  />
                </View>
              )}
            </View>

            <View style={styles.itemContent}>
              <View style={styles.itemTop}>
                <View style={styles.itemTitleWrap}>
                  <Text style={styles.itemName} numberOfLines={2}>
                    {item.name}
                  </Text>

                  {!!item.brand && (
                    <Text style={styles.itemMeta} numberOfLines={1}>
                      {item.brand}
                      {item.condition ? ` · ${item.condition}` : ''}
                    </Text>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.removeIcon}
                  onPress={() => handleRemove(item)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${item.name}`}
                >
                  <Ionicons
                    name="trash-outline"
                    size={17}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.itemBottom}>
                <View>
                  <Text style={styles.priceLabel}>Price</Text>
                  <Text style={styles.itemPrice}>
                    {formatMoney(item.price * item.quantity)}
                  </Text>
                </View>

                <View style={styles.quantityControl}>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => handleDecrease(item)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`Decrease quantity of ${item.name}`}
                  >
                    <Ionicons name="remove" size={15} color={colors.text} />
                  </TouchableOpacity>

                  <Text style={styles.quantityText}>{item.quantity}</Text>

                  <TouchableOpacity
                    style={styles.quantityButton}
                    disabled={item.quantity >= item.stock}
                    onPress={() =>
                      updateQuantity(item.id ?? item._uuid ?? (item as any)._id, item.quantity + 1)
                    }
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`Increase quantity of ${item.name}`}
                  >
                    <Ionicons
                      name="add"
                      size={15}
                      color={
                        item.quantity >= item.stock
                          ? '#cbd5e1'
                          : colors.text
                      }
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {item.stock <= 0 ? (
                <View style={styles.stockWarning}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={13}
                    color="#dc2626"
                  />
                  <Text style={styles.stockWarningText}>
                    Currently unavailable
                  </Text>
                </View>
              ) : item.quantity >= item.stock ? (
                <View style={styles.stockInfo}>
                  <Ionicons
                    name="information-circle-outline"
                    size={13}
                    color={colors.textMuted}
                  />
                  <Text style={styles.stockInfoText}>
                    Maximum available quantity reached
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        )}
        ListFooterComponent={
          <View style={styles.footerSpace}>
            <TouchableOpacity
              style={styles.continueShopping}
              onPress={() => navigation.navigate('Shop')}
              activeOpacity={0.75}
            >
              <Ionicons name="arrow-back" size={16} color={colors.text} />
              <Text style={styles.continueShoppingText}>
                Continue Shopping
              </Text>
            </TouchableOpacity>
          </View>
        }
      />

      <View style={styles.summary}>
        <View style={styles.summaryHeader}>
          <Text style={styles.summaryTitle}>Order Summary</Text>
          <Text style={styles.summaryCount}>
            {totalItems} {totalItems === 1 ? 'item' : 'items'}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>{formatMoney(subtotal)}</Text>
        </View>

        {savings > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.savingsLabel}>You save</Text>
            <Text style={styles.savingsAmount}>
              -{formatMoney(savings)}
            </Text>
          </View>
        )}

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Shipping</Text>
          <Text style={styles.freeShipping}>FREE</Text>
        </View>

        <View style={styles.totalRow}>
          <View>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalHint}>Inclusive of listed prices</Text>
          </View>
          <Text style={styles.totalValue}>{formatMoney(subtotal)}</Text>
        </View>

        <TouchableOpacity
          style={styles.checkoutButton}
          onPress={() => navigation.navigate('Checkout')}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Continue to checkout"
        >
          <Text style={styles.checkoutText}>Continue to Checkout</Text>
          <Ionicons
            name="arrow-forward"
            size={18}
            color={colors.primary}
          />
        </TouchableOpacity>

        <View style={styles.secureRow}>
          <Ionicons
            name="lock-closed-outline"
            size={13}
            color={colors.textMuted}
          />
          <Text style={styles.secureText}>
            Secure checkout · Your cart is saved
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },

  loadingTitle: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },

  loadingText: {
    marginTop: 4,
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },

  header: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f7f5ec',
  },

  headerIconPlaceholder: {
    width: 40,
    height: 40,
  },

  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },

  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.black,
    color: colors.text,
    letterSpacing: -0.2,
  },

  itemCount: {
    marginTop: 2,
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
  },

  list: {
    padding: spacing.md,
    paddingBottom: 185,
  },

  cartItem: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 12,
    marginBottom: 10,
  },

  imageWrap: {
    width: 84,
    height: 94,
    borderRadius: radius.md,
    backgroundColor: '#f7f5ec',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginRight: 12,
  },

  itemImage: {
    width: '100%',
    height: '100%',
  },

  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  itemContent: {
    flex: 1,
    minWidth: 0,
  },

  itemTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  itemTitleWrap: {
    flex: 1,
    paddingRight: 7,
  },

  itemName: {
    fontSize: fontSize.sm,
    lineHeight: 19,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },

  itemMeta: {
    marginTop: 4,
    fontSize: 10,
    color: colors.textMuted,
  },

  removeIcon: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: '#f8f7f2',
  },

  itemBottom: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 13,
  },

  priceLabel: {
    fontSize: 9,
    color: colors.textMuted,
    marginBottom: 1,
  },

  itemPrice: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.black,
    color: colors.text,
  },

  quantityControl: {
    height: 34,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },

  quantityButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f7f2',
  },

  quantityText: {
    minWidth: 30,
    paddingHorizontal: 5,
    textAlign: 'center',
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },

  stockWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },

  stockWarningText: {
    fontSize: 9,
    color: '#dc2626',
    fontWeight: fontWeight.semibold,
  },

  stockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },

  stockInfoText: {
    fontSize: 9,
    color: colors.textMuted,
  },

  footerSpace: {
    paddingTop: 2,
    paddingBottom: 12,
  },

  continueShopping: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },

  continueShoppingText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },

  summary: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: 13,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 12,
  },

  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  summaryTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },

  summaryCount: {
    fontSize: 10,
    color: colors.textMuted,
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },

  summaryLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },

  summaryValue: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },

  savingsLabel: {
    fontSize: fontSize.xs,
    color: '#059669',
    fontWeight: fontWeight.semibold,
  },

  savingsAmount: {
    fontSize: fontSize.xs,
    color: '#059669',
    fontWeight: fontWeight.bold,
  },

  freeShipping: {
    fontSize: 10,
    color: '#059669',
    fontWeight: fontWeight.bold,
  },

  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    marginTop: 6,
    paddingTop: 9,
    marginBottom: 10,
  },

  totalLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.black,
    color: colors.text,
  },

  totalHint: {
    marginTop: 1,
    fontSize: 9,
    color: colors.textMuted,
  },

  totalValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.black,
    color: colors.text,
  },

  checkoutButton: {
    minHeight: 49,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radius.md,
    backgroundColor: '#000000',
  },

  checkoutText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },

  secureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 8,
  },

  secureText: {
    fontSize: 9,
    color: colors.textMuted,
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: 70,
  },

  emptyIcon: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: '#eeeae0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },

  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.black,
    color: colors.text,
    marginBottom: 7,
  },

  emptySubtitle: {
    maxWidth: 300,
    fontSize: fontSize.xs,
    lineHeight: 18,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 20,
  },

  shopButton: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },

  shopButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.black,
  },
});
