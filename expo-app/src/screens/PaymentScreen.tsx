import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
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
import CheckoutStepper from '@/components/CheckoutStepper';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme';
import { useSafeHeaderTop } from '@/lib/useSafeHeaderTop';

type RouteParams = {
  Payment: {
    customerInfo: {
      name: string;
      phone: string;
      address: string;
      pincode: string;
    };
  };
};

function createCheckoutKey(): string {
  const random = Math.random().toString(36).slice(2, 14);
  return `rnx_${Date.now()}_${random}`;
}

export default function PaymentScreen() {
  const safeTop = useSafeHeaderTop();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'Payment'>>();
  const { items, subtotal, clearCart } = useCart();
  const { user } = useAuth();

  const customerInfo = route.params?.customerInfo || {
    name: user?.full_name || 'Customer',
    phone: '',
    address: '',
    pincode: '',
  };

  const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'cod'>('razorpay');
  const [processing, setProcessing] = useState(false);

  // In-app Razorpay modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [checkoutOptions, setCheckoutOptions] = useState<RazorpayCheckoutOptions | null>(null);
  const [activeOrder, setActiveOrder] = useState<any>(null);

  // 1. Online Payment (Razorpay) Handler
  const handleRazorpayPayment = async () => {
    setProcessing(true);

    try {
      const checkoutKey = createCheckoutKey();

      const checkout = await api.orders.createCheckout(
        {
          items: items.map((item) => ({
            product_id: String(item.id),
            quantity: item.quantity,
          })),
          customer_info: customerInfo,
          payment_method: 'razorpay',
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
        currency: checkout.currency || 'INR',
        key: checkout.razorpay_key_id,
        amount: checkout.amount,
        order_id: checkout.razorpay_order_id,
        name: 'RenewX',
        prefill: {
          name: customerInfo.name.trim(),
          contact: customerInfo.phone,
          email: user?.email || '',
        },
        theme: {
          color: '#ffc400',
        },
      };

      if (Platform.OS === 'web' || isNativeRazorpayAvailable()) {
        const paymentResult = await openRazorpay(options);
        const orderId = checkout.order?.id || checkout.order?._id;
        await completeOnlineVerification(orderId, paymentResult);
      } else {
        setActiveOrder(checkout.order);
        setCheckoutOptions(options);
        setModalVisible(true);
        setProcessing(false);
      }
    } catch (error: any) {
      handlePaymentError(error);
    }
  };

  const completeOnlineVerification = async (
    orderId: string,
    paymentResult: RazorpayCheckoutResult,
  ) => {
    try {
      setProcessing(true);

      const verifiedOrder = await api.orders.verifyPayment({
        order_id: String(orderId),
        razorpay_order_id: paymentResult.razorpay_order_id,
        razorpay_payment_id: paymentResult.razorpay_payment_id,
        razorpay_signature: paymentResult.razorpay_signature,
      });

      const currentItems = [...items];
      const currentSubtotal = subtotal;

      clearCart();

      navigation.replace('OrderConfirm', {
        order: verifiedOrder,
        orderId: String(verifiedOrder?.id || orderId),
        customerInfo,
        paymentMethod: 'razorpay',
        paymentStatus: 'paid',
        items: currentItems,
        totalAmount: currentSubtotal,
      });
    } catch (error: any) {
      Alert.alert(
        'Payment Received',
        error?.message || 'Payment was received. Please check your order status.',
        [
          {
            text: 'View Orders',
            onPress: () => navigation.navigate('MainTabs', { screen: 'Track' }),
          },
        ],
      );
    } finally {
      setProcessing(false);
    }
  };

  // 2. Cash on Delivery (COD) Handler
  const handleCodPayment = async () => {
    Alert.alert(
      'Confirm Cash on Delivery',
      `Place order for ₹${subtotal.toLocaleString('en-IN')}? You can pay with cash or UPI at the time of delivery.`,
      [
        { text: 'Review', style: 'cancel' },
        {
          text: 'Confirm COD Order',
          onPress: async () => {
            setProcessing(true);
            try {
              const checkoutKey = createCheckoutKey();

              const checkout = await api.orders.createCheckout(
                {
                  items: items.map((item) => ({
                    product_id: String(item.id),
                    quantity: item.quantity,
                  })),
                  customer_info: customerInfo,
                  payment_method: 'cod',
                },
                checkoutKey,
              );

              const currentItems = [...items];
              const currentSubtotal = subtotal;

              clearCart();

              navigation.replace('OrderConfirm', {
                order: checkout.order,
                orderId: String(checkout.order?.id || checkoutKey),
                customerInfo,
                paymentMethod: 'cod',
                paymentStatus: 'cod',
                items: currentItems,
                totalAmount: currentSubtotal,
              });
            } catch (err: any) {
              Alert.alert(
                'Order placement failed',
                err?.message || 'Could not place COD order. Please check stock or try again.',
              );
            } finally {
              setProcessing(false);
            }
          },
        },
      ],
    );
  };

  const handlePaymentError = (error: any) => {
    setProcessing(false);
    const code = error?.code;
    const msg = error?.message || error?.description || '';

    if (code === 'PAYMENT_NOT_CONFIGURED') {
      Alert.alert('Payments unavailable', 'Payment gateway is being configured. Please use Cash on Delivery.');
    } else if (/international/i.test(msg)) {
      Alert.alert(
        'Card Not Supported',
        'International cards are disabled by default on this merchant account.\n\nFor testing:\n• Choose UPI (enter success@razorpay)\n• Or choose Netbanking (click Success)\n• Or choose Cash on Delivery!',
      );
    } else if (error?.code === 2 || error?.description === 'Payment cancelled') {
      Alert.alert('Payment cancelled', 'Your order was not completed. Your cart is safe.');
    } else {
      Alert.alert('Payment failed', msg || 'Transaction could not be completed. Please try again.');
    }
  };

  const handleProceed = () => {
    if (paymentMethod === 'razorpay') {
      handleRazorpayPayment();
    } else {
      handleCodPayment();
    }
  };

  return (
    <View style={[styles.container, { paddingTop: safeTop }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Cart'))}
          style={styles.backButton}
          disabled={processing}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>

        <View>
          <Text style={styles.title}>Payment</Text>
          <Text style={styles.subtitle}>Choose your payment method</Text>
        </View>
      </View>

      {/* Stepper: Step 2 Active */}
      <CheckoutStepper currentStep={2} />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Delivery Address Reminder */}
        <View style={styles.deliverSummary}>
          <Ionicons name="location" size={16} color={colors.primary} />
          <Text style={styles.deliverText} numberOfLines={1}>
            Delivering to <Text style={styles.deliverBold}>{customerInfo.name}</Text> • PIN {customerInfo.pincode}
          </Text>
        </View>

        {/* Amount to Pay Banner */}
        <View style={styles.amountCard}>
          <Text style={styles.amountCardLabel}>Total Payable Amount</Text>
          <Text style={styles.amountCardValue}>₹{subtotal.toLocaleString('en-IN')}</Text>
          <Text style={styles.amountCardNote}>Free Shipping Included • Includes all taxes</Text>
        </View>

        <Text style={styles.sectionHeading}>Select Payment Option</Text>

        {/* Option 1: Razorpay Online Payment */}
        <TouchableOpacity
          style={[
            styles.paymentOption,
            paymentMethod === 'razorpay' && styles.paymentOptionSelected,
          ]}
          onPress={() => setPaymentMethod('razorpay')}
          activeOpacity={0.88}
          disabled={processing}
        >
          <View style={styles.radioRow}>
            <View style={[styles.radio, paymentMethod === 'razorpay' && styles.radioActive]}>
              {paymentMethod === 'razorpay' && <View style={styles.radioDot} />}
            </View>

            <View style={styles.optionInfo}>
              <View style={styles.optionTitleRow}>
                <Text style={styles.optionTitle}>Online Payment (Razorpay)</Text>
                <View style={styles.recommendedBadge}>
                  <Text style={styles.recommendedText}>Fastest</Text>
                </View>
              </View>
              <Text style={styles.optionSubtitle}>
                UPI (GPay, PhonePe, Paytm), Cards & NetBanking
              </Text>

              <View style={styles.badgesRow}>
                <View style={styles.methodTag}>
                  <Ionicons name="flash-outline" size={12} color="#059669" />
                  <Text style={styles.methodTagText}>Instant Confirmation</Text>
                </View>
                <View style={styles.methodTag}>
                  <Ionicons name="shield-checkmark-outline" size={12} color="#059669" />
                  <Text style={styles.methodTagText}>100% Secure</Text>
                </View>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* Option 2: Cash on Delivery */}
        <TouchableOpacity
          style={[
            styles.paymentOption,
            paymentMethod === 'cod' && styles.paymentOptionSelected,
          ]}
          onPress={() => setPaymentMethod('cod')}
          activeOpacity={0.88}
          disabled={processing}
        >
          <View style={styles.radioRow}>
            <View style={[styles.radio, paymentMethod === 'cod' && styles.radioActive]}>
              {paymentMethod === 'cod' && <View style={styles.radioDot} />}
            </View>

            <View style={styles.optionInfo}>
              <View style={styles.optionTitleRow}>
                <Text style={styles.optionTitle}>Cash on Delivery (COD)</Text>
                <View style={styles.codBadge}>
                  <Text style={styles.codBadgeText}>Doorstep</Text>
                </View>
              </View>
              <Text style={styles.optionSubtitle}>
                Pay with cash or UPI QR scan when your courier arrives
              </Text>

              <View style={styles.badgesRow}>
                <View style={styles.methodTag}>
                  <Ionicons name="checkmark-circle-outline" size={12} color="#475569" />
                  <Text style={styles.methodTagText}>Zero Extra Fee</Text>
                </View>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* Security Notice */}
        <View style={styles.securityBox}>
          <Ionicons name="lock-closed" size={16} color="#64748b" />
          <Text style={styles.securityText}>
            All transactions are 256-bit encrypted. Stock and prices are verified securely by RenewX server.
          </Text>
        </View>
      </ScrollView>

      {/* Footer Action */}
      <View style={styles.footer}>
        <View>
          <Text style={styles.footerLabel}>Amount</Text>
          <Text style={styles.footerTotal}>₹{subtotal.toLocaleString('en-IN')}</Text>
        </View>

        <TouchableOpacity
          style={[styles.payButton, processing && styles.payButtonDisabled]}
          onPress={handleProceed}
          disabled={processing}
          activeOpacity={0.88}
        >
          {processing ? (
            <ActivityIndicator color={colors.primary} />
          ) : paymentMethod === 'razorpay' ? (
            <>
              <Ionicons name="lock-closed" size={16} color="#000" />
              <Text style={styles.payButtonText}>Pay Online Securely</Text>
            </>
          ) : (
            <>
              <Ionicons name="checkmark-done" size={18} color="#000" />
              <Text style={styles.payButtonText}>Place COD Order</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* In-app Razorpay modal for Expo Go / web fallback */}
      <RazorpayModal
        visible={modalVisible}
        options={checkoutOptions}
        onSuccess={(res) => {
          setModalVisible(false);
          const orderId = activeOrder?.id || activeOrder?._id || checkoutOptions?.order_id;
          if (orderId) {
            completeOnlineVerification(orderId, res);
          }
        }}
        onError={(err) => {
          setModalVisible(false);
          handlePaymentError(err);
        }}
        onClose={() => {
          setModalVisible(false);
          setProcessing(false);
          Alert.alert('Payment cancelled', 'Your order was not completed. Your cart is safe.');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 4,
  },
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
  content: {
    padding: spacing.md,
    paddingBottom: 120,
  },
  deliverSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  deliverText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    flex: 1,
  },
  deliverBold: {
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  amountCard: {
    backgroundColor: '#0f172a',
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  amountCardLabel: {
    fontSize: fontSize.xs,
    color: '#94a3b8',
    marginBottom: 4,
  },
  amountCardValue: {
    fontSize: 28,
    fontWeight: fontWeight.black,
    color: colors.primary,
    marginBottom: 4,
  },
  amountCardNote: {
    fontSize: 11,
    color: '#94a3b8',
  },
  sectionHeading: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  paymentOption: {
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: 12,
  },
  paymentOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: '#fffbeb',
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioActive: {
    borderColor: '#000',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  optionInfo: {
    flex: 1,
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  optionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  recommendedBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  recommendedText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: '#15803d',
  },
  codBadge: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  codBadgeText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: '#0369a1',
  },
  optionSubtitle: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    lineHeight: 16,
    marginBottom: 8,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  methodTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.03)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  methodTagText: {
    fontSize: 10,
    color: '#475569',
    fontWeight: fontWeight.medium,
  },
  securityBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    marginTop: 8,
  },
  securityText: {
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
  footerLabel: {
    fontSize: 10,
    color: colors.textMuted,
  },
  footerTotal: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.black,
    color: colors.text,
  },
  payButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    minHeight: 48,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonText: {
    color: '#000',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
});
