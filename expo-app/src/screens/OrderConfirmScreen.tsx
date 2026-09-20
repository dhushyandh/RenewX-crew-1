import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import CheckoutStepper from '@/components/CheckoutStepper';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme';

type RouteParams = {
  OrderConfirm: {
    order?: any;
    orderId?: string;
    customerInfo?: {
      name: string;
      phone: string;
      address: string;
      pincode: string;
    };
    paymentMethod?: 'razorpay' | 'cod' | string;
    paymentStatus?: 'paid' | 'cod' | 'pending' | string;
    items?: any[];
    totalAmount?: number;
  };
};

export default function OrderConfirmScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'OrderConfirm'>>();

  const params = route.params || {};
  const order = params.order || {};
  const orderId =
    params.orderId ||
    order.id ||
    order._id ||
    `RNX-${Math.floor(100000 + Math.random() * 900000)}`;

  const customerInfo = params.customerInfo || order.customer_info || {
    name: 'Valued Customer',
    phone: '',
    address: 'Delivery address provided',
    pincode: '',
  };

  const paymentMethod = params.paymentMethod || order.payment_method || 'razorpay';
  const isCod = paymentMethod === 'cod';
  const items = params.items || order.items || order.order_items || [];
  const totalAmount =
    params.totalAmount !== undefined
      ? params.totalAmount
      : order.total_amount || order.amount || 0;

  const [copied, setCopied] = useState(false);

  const handleCopyOrderId = () => {
    const textToCopy = String(orderId);
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleGoToMyOrders = () => {
    // Navigate to Track screen and prefill or view the order
    navigation.navigate('MainTabs', {
      screen: 'Track',
      params: { search: String(orderId) },
    });
  };

  const handleContinueShopping = () => {
    navigation.navigate('MainTabs', { screen: 'Shop' });
  };

  // Order placed timestamp
  const orderDateFormatted = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoBadgeText}>R</Text>
          </View>
          <Text style={styles.brandText}>RenewX <Text style={styles.brandCrew}>Crew</Text></Text>
        </View>

        <TouchableOpacity
          onPress={handleContinueShopping}
          style={styles.closeBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={22} color="#475569" />
        </TouchableOpacity>
      </View>

      {/* Stepper (Step 3: Confirmed) */}
      <CheckoutStepper currentStep={3} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Celebration Header Card with Green Tick */}
        <View style={styles.heroCard}>
          {/* Animated Glow Circle with Green Tick */}
          <View style={styles.tickGlowRing}>
            <View style={styles.tickCircle}>
              <Ionicons name="checkmark" size={48} color="#ffffff" />
            </View>
          </View>

          <Text style={styles.confirmedHeading}>Order Confirmed!</Text>
          <Text style={styles.confirmedSubtext}>
            Thank you, <Text style={styles.boldText}>{customerInfo.name || 'Friend'}</Text>! We’ve received your order and are preparing it for shipment.
          </Text>

          {/* Order ID Pill with Copy */}
          <TouchableOpacity
            style={styles.orderIdPill}
            onPress={handleCopyOrderId}
            activeOpacity={0.8}
          >
            <View style={styles.orderIdLeft}>
              <Text style={styles.orderIdLabel}>Order ID:</Text>
              <Text style={styles.orderIdValue}>#{orderId}</Text>
            </View>
            <View style={styles.copyBadge}>
              <Ionicons
                name={copied ? 'checkmark-circle' : 'copy-outline'}
                size={14}
                color={copied ? '#10b981' : '#64748b'}
              />
              <Text style={[styles.copyText, copied && { color: '#10b981' }]}>
                {copied ? 'Copied' : 'Copy'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Quick Status Tag */}
          <View style={[styles.statusTag, isCod ? styles.statusTagCod : styles.statusTagPaid]}>
            <Ionicons
              name={isCod ? 'cash-outline' : 'shield-checkmark'}
              size={15}
              color={isCod ? '#d97706' : '#059669'}
            />
            <Text style={[styles.statusTagText, isCod ? styles.statusTextCod : styles.statusTextPaid]}>
              {isCod
                ? `Cash on Delivery • Pay ₹${Number(totalAmount).toLocaleString('en-IN')} on Delivery`
                : `Payment Verified • ₹${Number(totalAmount).toLocaleString('en-IN')} Paid via Razorpay`}
            </Text>
          </View>
        </View>

        {/* Delivery Estimate Card */}
        <View style={styles.card}>
          <View style={styles.deliveryRow}>
            <View style={styles.deliveryIconCircle}>
              <Ionicons name="car-outline" size={22} color="#0284c7" />
            </View>
            <View style={styles.deliveryInfo}>
              <Text style={styles.deliveryTitle}>Estimated Delivery</Text>
              <Text style={styles.deliveryDates}>Within 3 – 5 Business Days</Text>
              <Text style={styles.deliveryNote}>Free Express Delivery with tracking included</Text>
            </View>
          </View>
        </View>

        {/* Order Details & Summary Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="receipt-outline" size={18} color="#0f172a" />
            <Text style={styles.cardHeaderTitle}>Order Details</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Placed on</Text>
            <Text style={styles.detailValue}>{orderDateFormatted}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Payment Method</Text>
            <Text style={styles.detailValue}>
              {isCod ? 'Cash on Delivery (COD)' : 'Razorpay (Online Payment)'}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Payment Status</Text>
            <View style={[styles.microBadge, isCod ? styles.microBadgeAmber : styles.microBadgeGreen]}>
              <Text style={[styles.microBadgeText, isCod ? styles.microTextAmber : styles.microTextGreen]}>
                {isCod ? 'Pay on Delivery' : 'Paid'}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>₹{Number(totalAmount).toLocaleString('en-IN')}</Text>
          </View>
        </View>

        {/* Shipping Address Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="location-outline" size={18} color="#0f172a" />
            <Text style={styles.cardHeaderTitle}>Shipping Address</Text>
          </View>

          <Text style={styles.addressName}>{customerInfo.name}</Text>
          {customerInfo.phone ? (
            <Text style={styles.addressPhone}>+91 {customerInfo.phone}</Text>
          ) : null}
          <Text style={styles.addressBody}>{customerInfo.address}</Text>
          {customerInfo.pincode ? (
            <View style={styles.pincodePill}>
              <Text style={styles.pincodePillText}>PIN: {customerInfo.pincode}</Text>
            </View>
          ) : null}
        </View>

        {/* Ordered Items Card */}
        {items && items.length > 0 ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="cube-outline" size={18} color="#0f172a" />
              <Text style={styles.cardHeaderTitle}>Items in this Order ({items.length})</Text>
            </View>

            {items.map((item: any, index: number) => {
              const itemName =
                item.name ||
                item.product_name ||
                item.title ||
                `Product #${item.product_id || index + 1}`;
              const itemPrice = item.price || item.unit_price || 0;
              const itemQty = item.quantity || 1;
              const itemImg =
                item.image_url ||
                item.image ||
                item.product_image ||
                item.images?.[0];

              return (
                <View key={String(item.id || item.product_id || index)} style={styles.itemRow}>
                  {itemImg ? (
                    <Image source={{ uri: itemImg }} style={styles.itemImage} resizeMode="cover" />
                  ) : (
                    <View style={styles.itemImageFallback}>
                      <Ionicons name="phone-portrait-outline" size={20} color="#94a3b8" />
                    </View>
                  )}

                  <View style={styles.itemMeta}>
                    <Text style={styles.itemTitle} numberOfLines={2}>
                      {itemName}
                    </Text>
                    <Text style={styles.itemSub}>Qty: {itemQty}</Text>
                  </View>

                  <Text style={styles.itemPriceText}>
                    ₹{(Number(itemPrice) * Number(itemQty)).toLocaleString('en-IN')}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : null}

        {/* Trust & Support Banner */}
        <View style={styles.supportBox}>
          <Ionicons name="headset-outline" size={20} color="#64748b" />
          <View style={{ flex: 1 }}>
            <Text style={styles.supportTitle}>Questions about your order?</Text>
            <Text style={styles.supportText}>
              Our RenewX support crew is available 24/7. Call +91 90801 68778 or visit Account support.
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {/* Primary Button: Go to My Orders */}
          <TouchableOpacity
            style={styles.primaryOrdersBtn}
            onPress={handleGoToMyOrders}
            activeOpacity={0.88}
          >
            <Ionicons name="cube-outline" size={20} color="#0f172a" />
            <Text style={styles.primaryOrdersText}>Go to My Orders</Text>
            <Ionicons name="arrow-forward" size={18} color="#0f172a" />
          </TouchableOpacity>

          {/* Secondary Button: Continue Shopping */}
          <TouchableOpacity
            style={styles.secondaryShoppingBtn}
            onPress={handleContinueShopping}
            activeOpacity={0.85}
          >
            <Ionicons name="cart-outline" size={19} color="#334155" />
            <Text style={styles.secondaryShoppingText}>Continue Shopping</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f7f2',
  },
  topBar: {
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'android' ? 14 : 10,
    paddingBottom: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadgeText: {
    color: '#ffc400',
    fontWeight: '900',
    fontSize: 16,
  },
  brandText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.4,
  },
  brandCrew: {
    color: '#d97706',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 48,
  },
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
    elevation: 2,
  },
  tickGlowRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 6,
    borderColor: '#d1fae5',
  },
  tickCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
    elevation: 4,
  },
  confirmedHeading: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  confirmedSubtext: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 18,
    maxWidth: 320,
  },
  boldText: {
    color: '#0f172a',
    fontWeight: '700',
  },
  orderIdPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 10,
    paddingHorizontal: 14,
    width: '100%',
    maxWidth: 320,
    marginBottom: 14,
  },
  orderIdLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orderIdLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  orderIdValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  copyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffffff',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  copyText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusTagPaid: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  statusTagCod: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  statusTagText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusTextPaid: {
    color: '#065f46',
  },
  statusTextCod: {
    color: '#92400e',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deliveryIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deliveryInfo: {
    flex: 1,
  },
  deliveryTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284c7',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  deliveryDates: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  deliveryNote: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  detailLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  microBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  microBadgeGreen: {
    backgroundColor: '#ecfdf5',
  },
  microBadgeAmber: {
    backgroundColor: '#fffbeb',
  },
  microBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  microTextGreen: {
    color: '#059669',
  },
  microTextAmber: {
    color: '#d97706',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 10,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  addressName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 3,
  },
  addressPhone: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 6,
  },
  addressBody: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  pincodePill: {
    alignSelf: 'flex-start',
    backgroundColor: '#f1f5f9',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginTop: 8,
  },
  pincodePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  itemImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  itemImageFallback: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemMeta: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 18,
  },
  itemSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  itemPriceText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  supportBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginBottom: 20,
  },
  supportTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 3,
  },
  supportText: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 16,
  },
  actionsContainer: {
    gap: 10,
  },
  primaryOrdersBtn: {
    backgroundColor: '#ffc400',
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    boxShadow: '0 4px 14px rgba(255, 196, 0, 0.45)',
    elevation: 3,
  },
  primaryOrdersText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  secondaryShoppingBtn: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
  },
  secondaryShoppingText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
  },
});
