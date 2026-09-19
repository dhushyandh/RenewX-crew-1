import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme';

export default function CartScreen() {
  const { items, updateQuantity, removeFromCart, clearCart, subtotal, savings, totalItems } = useCart();
  const { user } = useAuth();
  const [checkoutDone, setCheckoutDone] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCheckout = () => {
    Alert.alert(
      'Confirm Order',
      `Place order for ${totalItems} items totaling $${subtotal.toFixed(0)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Place Order',
          onPress: async () => {
            setIsProcessing(true);
            try {
              if (user) {
                const { data: order, error: orderError } = await supabase
                  .from('orders')
                  .insert({
                    user_id: user.id,
                    subtotal: Math.round(subtotal),
                    savings: Math.round(savings),
                    status: 'pending',
                  })
                  .select()
                  .maybeSingle();

                if (!orderError && order) {
                  const orderItems = items.map((item) => ({
                    order_id: order.id,
                    product_id: item._uuid || null,
                    product_name: item.name,
                    quantity: item.quantity,
                    price: item.price,
                  }));
                  await supabase.from('order_items').insert(orderItems);
                }
              }
            } catch (err) {
              console.warn('Checkout sync warning:', err);
            } finally {
              setIsProcessing(false);
              setCheckoutDone(true);
              clearCart();
              setTimeout(() => setCheckoutDone(false), 3500);
            }
          },
        },
      ]
    );
  };

  if (checkoutDone) {
    return (
      <SafeAreaView style={styles.emptyContainer} edges={['top']}>
        <View style={styles.checkoutDone}>
          <View style={styles.checkoutIcon}>
            <Ionicons name="checkmark-sharp" size={48} color={colors.black} />
          </View>
          <Text style={styles.checkoutTitle}>Order Confirmed!</Text>
          <Text style={styles.checkoutSubtitle}>
            Thank you for choosing RenewX Crew. Your renewed electronics order is being processed.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.emptyContainer} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Your Cart</Text>
        </View>
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="cart-outline" size={40} color="#94a3b8" />
          </View>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySubtitle}>
            Browse renewed electronics and upgrade the smart way.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Cart</Text>
        <Text style={styles.itemCount}>{totalItems} items</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => String(item._uuid || item.id)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.cartItem}>
            <Image source={{ uri: item.image }} style={styles.itemImage} />
            <View style={styles.itemContent}>
              <Text style={styles.itemName} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={styles.itemMeta}>
                {item.brand} · {item.condition}
              </Text>
              <View style={styles.itemBottom}>
                <View style={styles.qtyRow}>
                  <TouchableOpacity
                    style={styles.qtyButton}
                    onPress={() => updateQuantity(item.id, item.quantity - 1)}
                  >
                    <Ionicons name="remove" size={14} color={colors.text} />
                  </TouchableOpacity>
                  <Text style={styles.qtyText}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={styles.qtyButton}
                    onPress={() => updateQuantity(item.id, item.quantity + 1)}
                  >
                    <Ionicons name="add" size={14} color={colors.text} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.itemPrice}>
                  ${(item.price * item.quantity).toFixed(0)}
                </Text>
                <TouchableOpacity
                  onPress={() => removeFromCart(item.id)}
                  style={styles.removeButton}
                >
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      />

      <View style={styles.summary}>
        {savings > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.savingsText}>You're saving</Text>
            <Text style={styles.savingsAmount}>${savings.toFixed(0)}</Text>
          </View>
        )}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>${subtotal.toFixed(0)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Shipping</Text>
          <Text style={styles.freeShipping}>Free</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>${subtotal.toFixed(0)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.checkoutButton, isProcessing && { opacity: 0.7 }]}
          onPress={handleCheckout}
          disabled={isProcessing}
          activeOpacity={0.8}
        >
          {isProcessing ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <>
              <Text style={styles.checkoutText}>Checkout</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.primary} />
            </>
          )}
        </TouchableOpacity>
        <View style={styles.secureRow}>
          <Ionicons name="shield-checkmark" size={14} color={colors.textMuted} />
          <Text style={styles.secureText}>Secure checkout · Warranty included</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  itemCount: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  list: {
    padding: spacing.md,
    paddingBottom: 250,
  },
  cartItem: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: radius.lg,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemImage: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    resizeMode: 'cover',
    backgroundColor: '#f7f5ec',
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
    lineHeight: 18,
    marginBottom: 4,
  },
  itemMeta: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: 8,
  },
  itemBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  qtyButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f7f2',
  },
  qtyText: {
    paddingHorizontal: 8,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.text,
    minWidth: 26,
    textAlign: 'center',
  },
  itemPrice: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.black,
    color: colors.text,
  },
  removeButton: {
    padding: 4,
  },
  summary: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  savingsText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: '#10b981',
  },
  savingsAmount: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: '#10b981',
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
  freeShipping: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: '#10b981',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    marginBottom: 10,
  },
  totalLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  totalValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.black,
    color: colors.text,
  },
  checkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: radius.md,
    backgroundColor: '#000000',
    marginBottom: 8,
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
    gap: 6,
  },
  secureText: {
    fontSize: 10,
    color: colors.textMuted,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: 60,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#f1efe8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
  },
  checkoutDone: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  checkoutIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  checkoutTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: 6,
  },
  checkoutSubtitle: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
