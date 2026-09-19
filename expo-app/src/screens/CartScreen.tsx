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
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme';

export default function CartScreen() {
  const { items, updateQuantity, removeFromCart, clearCart, subtotal, savings, totalItems, hydrated } = useCart();
  const { user } = useAuth();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [name, setName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('');

  const handleCheckout = async () => {
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in before placing an order.');
      return;
    }
    if (!name.trim() || !phone.trim() || !address.trim() || !/^\d{6}$/.test(pincode.trim())) {
      Alert.alert('Complete delivery details', 'Enter your name, 10-digit phone number, full address and a valid 6-digit pincode.');
      return;
    }
    if (!/^\d{10}$/.test(phone.replace(/\D/g, ''))) {
      Alert.alert('Invalid phone number', 'Enter a valid 10-digit Indian mobile number.');
      return;
    }

    setIsProcessing(true);
    try {
      const order = await api.orders.create({
        items: items.map((item) => ({
          product_id: String(item.id),
          quantity: item.quantity,
        })),
        customer_info: {
          name: name.trim(),
          phone: phone.replace(/\D/g, ''),
          address: address.trim(),
          pincode: pincode.trim(),
        },
      });

      setOrderId(order?.id || null);
      clearCart();
      setCheckoutOpen(false);
    } catch (error: any) {
      Alert.alert(
        'Order could not be placed',
        error?.message || 'Please try again. Your cart was not cleared.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  if (!hydrated) {
    return (
      <SafeAreaView style={styles.emptyContainer} edges={['top']}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (orderId) {
    return (
      <SafeAreaView style={styles.emptyContainer} edges={['top']}>
        <View style={styles.checkoutDone}>
          <View style={styles.checkoutIcon}>
            <Ionicons name="checkmark-sharp" size={48} color={colors.black} />
          </View>
          <Text style={styles.checkoutTitle}>Order Confirmed</Text>
          <Text style={styles.orderNumber}>Order #{orderId.slice(0, 8).toUpperCase()}</Text>
          <Text style={styles.checkoutSubtitle}>
            Your order has been created successfully. You can follow its status from Track Orders.
          </Text>
          <TouchableOpacity style={styles.doneButton} onPress={() => setOrderId(null)}>
            <Text style={styles.doneButtonText}>Back to Cart</Text>
          </TouchableOpacity>
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
          <Text style={styles.emptySubtitle}>Browse renewed electronics and upgrade the smart way.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Your Cart</Text>
          <Text style={styles.itemCount}>{totalItems} items</Text>
        </View>

        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.cartItem}>
              <Image source={{ uri: item.image }} style={styles.itemImage} />
              <View style={styles.itemContent}>
                <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.itemMeta}>{item.brand} · {item.condition}</Text>
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
                      disabled={item.quantity >= item.stock}
                      onPress={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      <Ionicons name="add" size={14} color={item.quantity >= item.stock ? '#cbd5e1' : colors.text} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.itemPrice}>₹{(item.price * item.quantity).toLocaleString('en-IN')}</Text>
                  <TouchableOpacity onPress={() => removeFromCart(item.id)} style={styles.removeButton}>
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
          ListFooterComponent={
            checkoutOpen ? (
              <View style={styles.checkoutCard}>
                <View style={styles.checkoutHeader}>
                  <Text style={styles.checkoutCardTitle}>Delivery details</Text>
                  <TouchableOpacity onPress={() => setCheckoutOpen(false)}>
                    <Ionicons name="close" size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
                <TextInput value={name} onChangeText={setName} placeholder="Full name" placeholderTextColor="#94a3b8" style={styles.input} />
                <TextInput value={phone} onChangeText={setPhone} placeholder="10-digit mobile number" placeholderTextColor="#94a3b8" keyboardType="phone-pad" maxLength={10} style={styles.input} />
                <TextInput value={address} onChangeText={setAddress} placeholder="Full delivery address" placeholderTextColor="#94a3b8" multiline style={[styles.input, styles.addressInput]} />
                <TextInput value={pincode} onChangeText={setPincode} placeholder="6-digit pincode" placeholderTextColor="#94a3b8" keyboardType="number-pad" maxLength={6} style={styles.input} />
                <TouchableOpacity
                  style={[styles.placeOrderButton, isProcessing && { opacity: 0.6 }]}
                  onPress={handleCheckout}
                  disabled={isProcessing}
                >
                  {isProcessing ? <ActivityIndicator color={colors.primary} /> : (
                    <Text style={styles.placeOrderText}>Place Order · ₹{subtotal.toLocaleString('en-IN')}</Text>
                  )}
                </TouchableOpacity>
                <Text style={styles.serverNote}>Final price and stock are verified securely by the server.</Text>
              </View>
            ) : null
          }
        />

        {!checkoutOpen && (
          <View style={styles.summary}>
            {savings > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.savingsText}>You're saving</Text>
                <Text style={styles.savingsAmount}>₹{savings.toLocaleString('en-IN')}</Text>
              </View>
            )}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>₹{subtotal.toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Shipping</Text>
              <Text style={styles.freeShipping}>Free</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>₹{subtotal.toLocaleString('en-IN')}</Text>
            </View>
            <TouchableOpacity style={styles.checkoutButton} onPress={() => setCheckoutOpen(true)} activeOpacity={0.8}>
              <Text style={styles.checkoutText}>Continue to Checkout</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.primary} />
            </TouchableOpacity>
            <View style={styles.secureRow}>
              <Ionicons name="shield-checkmark" size={14} color={colors.textMuted} />
              <Text style={styles.secureText}>Secure checkout · Warranty included</Text>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  emptyContainer: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  itemCount: { fontSize: fontSize.xs, color: colors.textMuted },
  list: { padding: spacing.md, paddingBottom: 240 },
  cartItem: { flexDirection: 'row', gap: 12, backgroundColor: '#ffffff', borderRadius: radius.lg, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  itemImage: { width: 72, height: 72, borderRadius: radius.md, resizeMode: 'cover', backgroundColor: '#f7f5ec' },
  itemContent: { flex: 1 },
  itemName: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.text, lineHeight: 18, marginBottom: 4 },
  itemMeta: { fontSize: fontSize.xs, color: colors.textMuted, marginBottom: 8 },
  itemBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, overflow: 'hidden' },
  qtyButton: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8f7f2' },
  qtyText: { paddingHorizontal: 8, fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.text, minWidth: 26, textAlign: 'center' },
  itemPrice: { fontSize: fontSize.md, fontWeight: fontWeight.black, color: colors.text },
  removeButton: { padding: 4 },
  summary: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.lg, backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: colors.border },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  savingsText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: '#10b981' },
  savingsAmount: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: '#10b981' },
  summaryLabel: { fontSize: fontSize.xs, color: colors.textSecondary },
  summaryValue: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.text },
  freeShipping: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: '#10b981' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, marginTop: 4, borderTopWidth: 1, borderTopColor: colors.borderLight, marginBottom: 10 },
  totalLabel: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  totalValue: { fontSize: fontSize.xl, fontWeight: fontWeight.black, color: colors.text },
  checkoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: radius.md, backgroundColor: '#000000', marginBottom: 8 },
  checkoutText: { color: colors.primary, fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  secureRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  secureText: { fontSize: 10, color: colors.textMuted },
  checkoutCard: { backgroundColor: '#ffffff', borderRadius: radius.lg, padding: spacing.md, marginBottom: 220, borderWidth: 1, borderColor: colors.border },
  checkoutHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  checkoutCardTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 10, backgroundColor: '#fff', color: colors.text, fontSize: fontSize.sm },
  addressInput: { minHeight: 82, textAlignVertical: 'top' },
  placeOrderButton: { alignItems: 'center', justifyContent: 'center', minHeight: 48, borderRadius: radius.md, backgroundColor: '#000000', marginTop: 4 },
  placeOrderText: { color: colors.primary, fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  serverNote: { fontSize: 10, color: colors.textMuted, textAlign: 'center', marginTop: 8 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#f1efe8', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  emptyTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text, marginBottom: 6 },
  emptySubtitle: { fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'center' },
  checkoutDone: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  checkoutIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  checkoutTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, marginBottom: 6 },
  orderNumber: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textSecondary, marginBottom: 8 },
  checkoutSubtitle: { fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'center', lineHeight: 18 },
  doneButton: { marginTop: 18, paddingHorizontal: 20, paddingVertical: 12, borderRadius: radius.md, backgroundColor: '#000000' },
  doneButtonText: { color: colors.primary, fontWeight: fontWeight.bold, fontSize: fontSize.sm },
});
