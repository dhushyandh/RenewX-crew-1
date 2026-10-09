import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  Image,
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
import HomeHeader from '@/components/HomeHeader';
import { clientObservability } from '@/services/observability';

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

  const hasBestPriceItem = useMemo(() => {
    return items.some((it: any) => it.is_best_price || it.isBestPrice || it.price === 0);
  }, [items]);

  useEffect(() => {
    if (hasBestPriceItem) {
      setPaymentMethod('cod');
    }
  }, [hasBestPriceItem]);

  // In-app Razorpay modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [checkoutOptions, setCheckoutOptions] = useState<RazorpayCheckoutOptions | null>(null);
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const activeOrderRef = useRef<any>(null);

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

      activeOrderRef.current = checkout.order;
      setActiveOrder(checkout.order);

      const options: RazorpayCheckoutOptions = {
        description: `RenewX order ${checkout.order.id || checkout.order._id || ''}`,
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
        const orderId =
          checkout.order?.id ||
          checkout.order?._id ||
          checkout.razorpay_order_id;
        await completeOnlineVerification(orderId, paymentResult);
      } else {
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
    const currentItems = [...items];
    const currentSubtotal = subtotal;
    const confirmedOrderId = String(
      activeOrderRef.current?.id ||
      activeOrderRef.current?._id ||
      activeOrder?.id ||
      activeOrder?._id ||
      orderId
    );

    try {
      setProcessing(true);

      try {
        const verifiedOrder = await api.orders.verifyPayment({
          order_id: confirmedOrderId,
          razorpay_order_id: paymentResult.razorpay_order_id,
          razorpay_payment_id: paymentResult.razorpay_payment_id,
          razorpay_signature: paymentResult.razorpay_signature,
        });

        // Only clear the cart after the backend has cryptographically verified
        // and captured the payment.
        clearCart();

        navigation.replace('OrderConfirm', {
          order: verifiedOrder,
          orderId: String(verifiedOrder?.id || verifiedOrder?._id || confirmedOrderId),
          customerInfo,
          paymentMethod: 'razorpay',
          paymentStatus: 'paid',
          items: currentItems,
          totalAmount: currentSubtotal,
        });
        return;
      } catch (verifyErr: any) {
        // Do not report a successful payment as "paid" when backend verification
        // failed. The Razorpay webhook can still finalize the order asynchronously.
        console.warn('[Payment] Backend verification pending:', verifyErr?.message);
        clearCart();

        Alert.alert(
          'Payment received — confirmation pending',
          'Razorpay returned a payment response, but RenewX could not confirm it yet. Your order will update automatically once verification completes. Please do not pay again.',
          [{
            text: 'View Order',
            onPress: () => navigation.replace('OrderConfirm', {
              order: activeOrderRef.current || activeOrder,
              orderId: confirmedOrderId,
              customerInfo,
              paymentMethod: 'razorpay',
              paymentStatus: 'pending',
              items: currentItems,
              totalAmount: currentSubtotal,
            }),
          }],
          { cancelable: false },
        );
      }
    } catch (error: any) {
      console.error('[Payment] Verification flow error:', error);
      Alert.alert(
        'Payment confirmation pending',
        error?.message || 'We could not confirm the payment yet. Please do not pay again.',
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

    clientObservability.trackPaymentFailure({
      orderId: checkoutOptions?.order_id,
      paymentMethod: 'razorpay',
      reason: msg || (code ? `Error code: ${code}` : 'Payment failed or cancelled'),
      stage: 'gateway_open',
    });

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
    <View style={styles.container}>
      {/* Top Bar (Matching Reference Image 3: Checkout/Payment with Secure pill) */}
      <HomeHeader
        mode="checkout"
        title="Payment"
        onBack={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Cart'))}
      />

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
            styles.cleanPaymentCard,
            paymentMethod === 'razorpay' && styles.cleanPaymentCardSelectedRazorpay,
            hasBestPriceItem && { opacity: 0.5, backgroundColor: '#F8FAFC' },
          ]}
          onPress={() => {
            if (hasBestPriceItem) {
              Alert.alert(
                'COD Only for Best Price Items',
                'Your order contains items offered at Best Price. Online payment is unavailable; please proceed with Cash on Delivery (COD).'
              );
              return;
            }
            setPaymentMethod('razorpay');
          }}
          activeOpacity={hasBestPriceItem ? 1 : 0.88}
          disabled={processing}
        >
          <View style={styles.cleanPaymentTopRow}>
            <View
              style={[
                styles.cleanRadio,
                paymentMethod === 'razorpay' && styles.cleanRadioActiveRazorpay,
              ]}
            >
              {paymentMethod === 'razorpay' && <View style={styles.cleanRadioDotRazorpay} />}
            </View>

            <View style={styles.cleanPaymentBody}>
              <View style={styles.cleanTitleRow}>
                <Image
                  source={require('@/assets/razorpay-logo.png')}
                  style={styles.razorpayBrandLogo}
                  resizeMode="contain"
                />
                {hasBestPriceItem ? (
                  <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#DC2626' }}>Unavailable</Text>
                  </View>
                ) : (
                  <View style={styles.cleanBadgeBlue}>
                    <Ionicons name="flash" size={10} color="#0284C7" />
                    <Text style={styles.cleanBadgeBlueText}>Instant</Text>
                  </View>
                )}
              </View>

              <Text style={styles.cleanSubtitle}>
                {hasBestPriceItem
                  ? 'Unavailable: Cart contains Best Price item (COD only)'
                  : 'UPI (Google Pay, PhonePe, Paytm), Cards & NetBanking'}
              </Text>

              <View style={styles.cleanFooterRow}>
                <Ionicons name="shield-checkmark" size={13} color="#059669" />
                <Text style={styles.cleanFooterText}>100% Encrypted</Text>
                <Text style={styles.cleanFooterDot}>•</Text>
                <Text style={styles.cleanFooterText}>50+ Banks & UPI Apps</Text>
              </View>
            </View>

            <Ionicons
              name={paymentMethod === 'razorpay' ? 'checkmark-circle' : 'chevron-forward'}
              size={20}
              color={paymentMethod === 'razorpay' ? '#0284C7' : '#CBD5E1'}
            />
          </View>
        </TouchableOpacity>

        {/* Option 2: Cash on Delivery */}
        <TouchableOpacity
          style={[
            styles.cleanPaymentCard,
            paymentMethod === 'cod' && styles.cleanPaymentCardSelectedCod,
          ]}
          onPress={() => setPaymentMethod('cod')}
          activeOpacity={0.88}
          disabled={processing}
        >
          <View style={styles.cleanPaymentTopRow}>
            <View
              style={[
                styles.cleanRadio,
                paymentMethod === 'cod' && styles.cleanRadioActiveCod,
              ]}
            >
              {paymentMethod === 'cod' && <View style={styles.cleanRadioDotCod} />}
            </View>

            <View style={styles.cleanPaymentBody}>
              <View style={styles.cleanTitleRow}>
                <View style={styles.codTitleBox}>
                  <View style={styles.codIconBadge}>
                    <Ionicons name="cash-outline" size={16} color="#059669" />
                  </View>
                  <Text style={styles.codMainTitle}>Cash on Delivery</Text>
                </View>
                <View style={styles.cleanBadgeGreen}>
                  <Text style={styles.cleanBadgeGreenText}>Doorstep</Text>
                </View>
              </View>

              <Text style={styles.cleanSubtitle}>
                Pay with cash or UPI QR scan when your courier arrives
              </Text>

              <View style={styles.cleanFooterRow}>
                <Ionicons name="checkmark-circle-outline" size={13} color="#64748B" />
                <Text style={styles.cleanFooterText}>Zero Advance Payment Needed</Text>
              </View>
            </View>

            <Ionicons
              name={paymentMethod === 'cod' ? 'checkmark-circle' : 'chevron-forward'}
              size={20}
              color={paymentMethod === 'cod' ? '#059669' : '#CBD5E1'}
            />
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
          const orderId =
            activeOrderRef.current?.id ||
            activeOrderRef.current?._id ||
            activeOrder?.id ||
            activeOrder?._id ||
            checkoutOptions?.order_id;
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
          if (processing) return;
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
  cleanPaymentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 12,
  },
  cleanPaymentCardSelectedRazorpay: {
    backgroundColor: '#F0F9FF',
    borderColor: '#0284C7',
  },
  cleanPaymentCardSelectedCod: {
    backgroundColor: '#F0FDF4',
    borderColor: '#059669',
  },
  cleanPaymentTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  cleanRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  cleanRadioActiveRazorpay: {
    borderColor: '#0284C7',
  },
  cleanRadioDotRazorpay: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0284C7',
  },
  cleanRadioActiveCod: {
    borderColor: '#059669',
  },
  cleanRadioDotCod: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#059669',
  },
  cleanPaymentBody: {
    flex: 1,
  },
  cleanTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  razorpayBrandLogo: {
    width: 105,
    height: 22,
  },
  cleanBadgeBlue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  cleanBadgeBlueText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#0284C7',
  },
  cleanBadgeGreen: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  cleanBadgeGreenText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#15803D',
  },
  codTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  codIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  codMainTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  cleanSubtitle: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
    marginBottom: 6,
  },
  cleanFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  cleanFooterText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  cleanFooterDot: {
    fontSize: 10,
    color: '#94A3B8',
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
