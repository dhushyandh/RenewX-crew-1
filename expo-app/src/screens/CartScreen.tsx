import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
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
  const navigation = useNavigation<any>();
  const [name, setName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('');


  if (!hydrated) {
    return (
      <SafeAreaView style={styles.emptyContainer} edges={['top']}>
        <ActivityIndicator size="large" color={colors.primary} />
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
                    <TouchableOpacity style={styles.qtyButton} onPress={() => updateQuantity(item.id, item.quantity - 1)}><Ionicons name="remove" size={14} color={colors.text} /></TouchableOpacity>
                    <Text style={styles.qtyText}>{item.quantity}</Text>
                    <TouchableOpacity style={styles.qtyButton} disabled={item.quantity >= item.stock} onPress={() => updateQuantity(item.id, item.quantity + 1)}><Ionicons name="add" size={14} color={item.quantity >= item.stock ? '#cbd5e1' : colors.text} /></TouchableOpacity>
                  </View>
                  <Text style={styles.itemPrice}>₹{(item.price * item.quantity).toLocaleString('en-IN')}</Text>
                  <TouchableOpacity onPress={() => removeFromCart(item.id)} style={styles.removeButton}><Ionicons name="trash-outline" size={18} color="#ef4444" /></TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        />
        <View style={styles.summary}>
          {savings > 0 && <View style={styles.summaryRow}><Text style={styles.savingsText}>You're saving</Text><Text style={styles.savingsAmount}>₹{savings.toLocaleString('en-IN')}</Text></View>}
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Subtotal</Text><Text style={styles.summaryValue}>₹{subtotal.toLocaleString('en-IN')}</Text></View>
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Shipping</Text><Text style={styles.freeShipping}>Free</Text></View>
          <View style={styles.totalRow}><Text style={styles.totalLabel}>Total</Text><Text style={styles.totalValue}>₹{subtotal.toLocaleString('en-IN')}</Text></View>
          <TouchableOpacity style={styles.checkoutButton} onPress={() => navigation.navigate('Checkout')} activeOpacity={0.8}>
            <Text style={styles.checkoutText}>Continue to Checkout</Text><Ionicons name="arrow-forward" size={18} color={colors.primary} />
          </TouchableOpacity>
          <View style={styles.secureRow}><Ionicons name="shield-checkmark" size={14} color={colors.textMuted} /><Text style={styles.secureText}>Secure checkout · Warranty included</Text></View>
        </View>
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
