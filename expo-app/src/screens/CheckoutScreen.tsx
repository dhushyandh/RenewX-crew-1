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
import {
  openRazorpay,
  isNativeRazorpayAvailable,
  RazorpayCheckoutOptions,
  RazorpayCheckoutResult,
} from '@/lib/razorpay';
import RazorpayModal from '@/components/RazorpayModal';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme';

function createCheckoutKey(): string {
  // Stable across retries of the same checkout attempt so the server's
  // idempotency protection can safely return the same Razorpay order.
  const random = Math.random().toString(36).slice(2, 14);
  return `rnx_${Date.now()}_${random}`;
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

  // In-app Razorpay modal state (used when native module is unavailable, e.g. Expo Go)
  const [modalVisible, setModalVisible] = useState(false);
  const [checkoutOptions, setCheckoutOptions] = useState<RazorpayCheckoutOptions | null>(null);
  const [activeOrder, setActiveOrder] = useState<any>(null);

  const itemCount = useMemo(() => items.reduce((n, item) => n + item.quantity, 0), [items]);

  const completePaymentVerification = async (
    orderId: string,
    paymentResult: RazorpayCheckoutResult,
  ) => {
    try {
      setProcessing(true);

      if (
        !paymentResult?.razorpay_order_id ||
        !paymentResult?.razorpay_payment_id ||
        !paymentResult?.razorpay_signature
      ) {
        throw Object.assign(new Error('Razorpay returned an incomplete payment response.'), {
          code: 'PAYMENT_RESPONSE_INVALID',
        });
      }

      const verifiedOrder = await api.orders.verifyPayment({
        order_id: String(orderId),
        razorpay_order_id: paymentResult.razorpay_order_id,
        razorpay_payment_id: paymentResult.razorpay_payment_id,
        razorpay_signature: paymentResult.razorpay_signature,
      });

      clearCart();

      Alert.alert(
        'Payment successful',
        `Order #${verifiedOrder.id || orderId} is confirmed.`,
        [
          {
            text: 'Track Order',
            onPress: () => navigation.navigate('MainTabs', { screen: 'Track' }),
          },
        ],
        { cancelable: false },
      );
    } catch (error: any) {
      const code = error?.code;
      if (code === 'PAYMENT_NOT_CAPTURED') {
        Alert.alert(
          'Payment Authorized',
          'Your payment was authorized and is being processed by the bank. You can track its status in orders.',
          [
            {
              text: 'View Orders',
              onPress: () => navigation.navigate('MainTabs', { screen: 'Track' }),
            },
          ],
        );
      } else {
        Alert.alert(
          'Verification issue',
          error?.message || 'Payment received but could not be verified automatically. Contact support if debited.',
          [
            {
              text: 'Check Order Status',
              onPress: () => navigation.navigate('MainTabs', { screen: 'Track' }),
            },
          ],
        );
      }
    } finally {
      setProcessing(false);
    }
  };

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
        'Enter your name, valid 10-digit phone, full address and 6-digit pincode.',
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

      // The server calculates the amount from current product records.
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

      if (!checkout.razorpay_key_id || !checkout.razorpay_order_id || !checkout.amount) {
        throw Object.assign(new Error('Payment session could not be created. Please try again.'), {
          code: 'PAYMENT_SESSION_INVALID',
        });
      }

      const options: RazorpayCheckoutOptions = {
        description: `RenewX order ${checkout.order.id}`,
        currency: checkout.currency,
        key: checkout.razorpay_key_id,
        amount: checkout.amount,
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
      };

      // Determine platform flow:
      // 1. Web: uses official Razorpay web checkout script popup
      // 2. Standalone mobile with native module: uses native SDK
      // 3. Expo Go / unlinked environment: uses in-app RazorpayModal
      if (Platform.OS === 'web' || isNativeRazorpayAvailable()) {
        const paymentResult = await openRazorpay(options);
        await completePaymentVerification(checkout.order.id, paymentResult);
      } else {
        // In Expo Go or when native module is absent, open the in-app Razorpay modal
        setActiveOrder(checkout.order);
        setCheckoutOptions(options);
        setModalVisible(true);
        setProcessing(false);
      }
    } catch (error: any) {
      const code = error?.code;

      if (code === 'PAYMENT_NOT_CONFIGURED') {
        Alert.alert(
          'Payments unavailable',
          'Razorpay is not configured on the RenewX server yet. Your cart is safe.',
        );
      } else if (
        code === 'PAYMENT_SESSION_INVALID' ||
        code === 'PAYMENT_RESPONSE_INVALID'
      ) {
        Alert.alert(
          'Payment could not start',
          error?.message || 'The secure payment session could not be created. Please try again.',
        );
      } else if (error?.code === 2 || error?.description === 'Payment cancelled') {
        Alert.alert(
          'Payment cancelled',
          'No order was confirmed. Your cart is still available so you can try again.',
        );
      } else {
        Alert.alert(
          'Checkout failed',
          error?.message || 'The payment could not be processed. Your cart was not cleared.',
        );
      }
      setProcessing(false);
    }
  };

  const handleModalSuccess = (result: RazorpayCheckoutResult) => {
    setModalVisible(false);
    if (activeOrder?.id) {
      completePaymentVerification(activeOrder.id, result);
    }
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setProcessing(false);
    Alert.alert(
      'Payment cancelled',
      'No order was confirmed. Your cart is still available so you can try again.',
    );
  };

  const handleModalError = (error: Error) => {
    setModalVisible(false);
    setProcessing(false);
    Alert.alert(
      'Payment issue',
      error?.message || 'Payment could not be completed. Please try again.',
    );
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
              Card/UPI details are handled securely by Razorpay.
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

      {/* In-app Razorpay modal for Expo Go / web fallback */}
      <RazorpayModal
        visible={modalVisible}
        options={checkoutOptions}
        onSuccess={handleModalSuccess}
        onError={handleModalError}
        onClose={handleModalClose}
      />
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
