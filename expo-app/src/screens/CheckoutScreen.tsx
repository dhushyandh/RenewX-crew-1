import { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, Alert,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import { openRazorpay } from '@/lib/razorpay';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme';

function createCheckoutKey(): string {
  return `rnx_${Date.now()}_${Math.random().toString(36).slice(2, 14)}`;
}

export default function CheckoutScreen() {
  const navigation = useNavigation<any>();
  const { items, subtotal, clearCart, hydrated } = useCart();
  const { user } = useAuth();

  const [name, setName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('');
  const [processing, setProcessing] = useState(false);

  const itemCount = useMemo(() => items.reduce((n, item) => n + item.quantity, 0), [items]);

  const startPayment = async () => {
    const cleanPhone = phone.replace(/\D/g, '');
    const cleanPincode = pincode.trim();

    if (
      name.trim().length < 2 ||
      address.trim().length < 8 ||
      !/^\d{10}$/.test(cleanPhone) ||
      !/^\d{6}$/.test(cleanPincode)
    ) {
      Alert.alert(
        'Complete delivery details',
        'Enter your name, valid 10-digit phone, full address and 6-digit pincode.'
      );
      return;
    }

    if (!items.length) {
      Alert.alert('Cart is empty', 'Add a product before checking out.');
      return;
    }

    setProcessing(true);

    try {
      const checkoutKey = createCheckoutKey();

      // The server calculates the amount from the current product records.
      // The mobile app never sends a price or trusts its local subtotal.
      const checkout = await api.orders.createCheckout(
        {
          items: items.map((item) => ({
            product_id: String(item.id),
            quantity: item.quantity,
          })),
          customer_info: {
            name: name.trim(),
            phone: cleanPhone,
            address: address.trim(),
            pincode: cleanPincode,
          },
        },
        checkoutKey,
      );

      const paymentResult = await openRazorpay({
        description: `RenewX order ${checkout.order.id}`,
        currency: checkout.currency,
        key: checkout.razorpay_key_id,
        amount: String(checkout.amount),
        order_id: checkout.razorpay_order_id,
        name: 'RenewX',
        prefill: {
          name: name.trim(),
          contact: cleanPhone,
          email: user?.email || '',
        },
        theme: {
          color: '#ffc400',
        },
      });

      // Never trust the client callback as proof of payment.
      // The backend verifies the Razorpay signature and fetches the payment.
      const verifiedOrder = await api.orders.verifyPayment({
        order_id: String(checkout.order.id),
        razorpay_order_id: paymentResult.razorpay_order_id,
        razorpay_payment_id: paymentResult.razorpay_payment_id,
        razorpay_signature: paymentResult.razorpay_signature,
      });

      clearCart();

      Alert.alert(
        'Payment successful',
        `Order #${verifiedOrder.id} is confirmed.`,
        [
          {
            text: 'Track Order',
            onPress: () => navigation.navigate('MainTabs', { screen: 'Track' }),
          },
        ],
        { cancelable: false }
      );
    } catch (error: any) {
      const code = error?.code;

      if (code === 'PAYMENT_NOT_CONFIGURED') {
        Alert.alert(
          'Payments unavailable',
          'Razorpay is not configured on the RenewX server yet. Your cart is safe.'
        );
      } else if (code === 'PAYMENT_NOT_AVAILABLE_ON_WEB') {
        Alert.alert(
          'Use the mobile app',
          'Razorpay checkout is available in the Android and iOS app. Your cart is still available.'
        );
      } else if (error?.code === 2 || error?.description) {
        Alert.alert(
          'Payment cancelled',
          'No order was confirmed. Your cart is still available so you can try again.'
        );
      } else {
        Alert.alert(
          'Checkout failed',
          error?.message || 'The payment could not be verified. Your cart was not cleared.'
        );
      }
    } finally {
      setProcessing(false);
    }
  };

  if (!hydrated) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
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
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            disabled={processing}
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>

          <View>
            <Text style={styles.title}>Checkout</Text>
            <Text style={styles.subtitle}>Secure payment & delivery</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Delivery Address</Text>

            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Full name"
              placeholderTextColor="#94a3b8"
              style={styles.input}
              editable={!processing}
            />

            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="10-digit mobile number"
              placeholderTextColor="#94a3b8"
              keyboardType="phone-pad"
              maxLength={10}
              style={styles.input}
              editable={!processing}
            />

            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder="Full delivery address"
              placeholderTextColor="#94a3b8"
              multiline
              style={[styles.input, styles.address]}
              editable={!processing}
            />

            <TextInput
              value={pincode}
              onChangeText={setPincode}
              placeholder="6-digit pincode"
              placeholderTextColor="#94a3b8"
              keyboardType="number-pad"
              maxLength={6}
              style={styles.input}
              editable={!processing}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Summary</Text>

            <View style={styles.row}>
              <Text style={styles.label}>{itemCount} items</Text>
              <Text style={styles.value}>₹{subtotal.toLocaleString('en-IN')}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Shipping</Text>
              <Text style={styles.free}>Free</Text>
            </View>

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.total}>₹{subtotal.toLocaleString('en-IN')}</Text>
            </View>
          </View>

          <View style={styles.notice}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#64748b" />
            <Text style={styles.noticeText}>
              Final price, stock and payment are verified by the RenewX server.
              Card/UPI details are handled by Razorpay.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <View>
            <Text style={styles.footerLabel}>Total</Text>
            <Text style={styles.footerTotal}>₹{subtotal.toLocaleString('en-IN')}</Text>
          </View>

          <TouchableOpacity
            style={[styles.place, processing && styles.placeDisabled]}
            onPress={startPayment}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Ionicons name="lock-closed" size={15} color={colors.primary} />
                <Text style={styles.placeText}>Pay Securely</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: { padding: 4 },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  content: { padding: spacing.md, paddingBottom: 130 },
  section: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
    color: colors.text,
    backgroundColor: '#fff',
    fontSize: fontSize.sm,
  },
  address: { minHeight: 90, textAlignVertical: 'top' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  label: { fontSize: fontSize.sm, color: colors.textSecondary },
  value: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  free: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: '#10b981',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  total: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.black,
    color: colors.text,
  },
  notice: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    padding: 12,
  },
  noticeText: {
    flex: 1,
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 16,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerLabel: { fontSize: 10, color: colors.textMuted },
  footerTotal: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.black,
    color: colors.text,
  },
  place: {
    backgroundColor: '#000',
    borderRadius: radius.md,
    minWidth: 155,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    flexDirection: 'row',
    gap: 8,
  },
  placeDisabled: { opacity: 0.6 },
  placeText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
});
