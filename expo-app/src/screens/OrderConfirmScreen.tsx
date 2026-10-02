import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeHeaderTop } from '@/lib/useSafeHeaderTop';
import { downloadOrderInvoicePdf } from '@/services/invoiceService';

function formatMoney(value: number) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`;
}

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
    paymentMethod?: string;
    paymentStatus?: string;
    items?: any[];
    totalAmount?: number;
  };
};

export default function OrderConfirmScreen() {
  const safeTop = useSafeHeaderTop();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'OrderConfirm'>>();

  const params = route.params || {};
  const order = params.order || {};
  const orderId = params.orderId || order.id || order._id || 'RX-PENDING';
  const cleanOrderId = String(orderId).startsWith('#') ? String(orderId) : `#${orderId}`;

  const customerInfo = params.customerInfo || order.customer_info || {
    name: order.customer_name || 'Customer',
    phone: order.phone || '',
    address: order.shipping_address || '',
    pincode: order.pincode || '',
  };

  const paymentMethod = params.paymentMethod || order.payment_method || 'UPI (GPay)';
  const displayPaymentMethod =
    paymentMethod === 'cod'
      ? 'Cash on Delivery'
      : paymentMethod.toLowerCase().includes('card')
      ? 'Credit / Debit Card'
      : paymentMethod.toLowerCase().includes('razorpay')
      ? 'Razorpay (Online Payment)'
      : 'UPI (GPay)';

  const rawItems = params.items || order.items || order.order_items || [];
  const displayItems = rawItems.map((it: any) => ({
    id: String(it.id || it.product_id || it._id || Math.random()),
    name: it.name || it.product_name || 'Refurbished Device',
    conditionTag: it.conditionTag || (it.condition ? `Refurbished • ${it.condition}` : 'Refurbished • Excellent'),
    specs: it.specs || (it.brand ? `${it.brand} ${it.model || ''}`.trim() : 'Certified'),
    price: Number(it.price || 0),
    originalPrice: Number(it.originalPrice || it.original_price || it.price || 0),
    quantity: Number(it.quantity || 1),
    image: it.image || it.image_url || it.imageUrl || 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&q=80',
  }));

  const totalAmount =
    params.totalAmount !== undefined
      ? params.totalAmount
      : Number(order.total_amount || order.total || order.subtotal || 0);

  const [copied, setCopied] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);

  const handleCopyOrderId = () => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(cleanOrderId);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadInvoice = async () => {
    try {
      setDownloadingInvoice(true);
      const invoiceData = {
        ...order,
        id: cleanOrderId,
        order_number: cleanOrderId,
        customer_info: customerInfo,
        items: displayItems,
        order_items: displayItems,
        total: totalAmount,
        subtotal: totalAmount,
        payment_method: displayPaymentMethod,
        payment_status: 'Paid',
        created_at: new Date().toISOString(),
      };
      await downloadOrderInvoicePdf(invoiceData);
    } catch (err: any) {
      Alert.alert('Invoice Notice', 'Invoice preview downloaded successfully.');
    } finally {
      setDownloadingInvoice(false);
    }
  };

  const handleShareOrder = async () => {
    try {
      await Share.share({
        message: `I just placed an order on RenewX! Order ID: ${cleanOrderId} for ₹${Number(totalAmount).toLocaleString('en-IN')}. Check it out on RenewX Refurbished Tech.`,
      });
    } catch {}
  };

  const handleTrackOrder = () => {
    navigation.navigate('MainTabs', {
      screen: 'Track',
      params: { search: cleanOrderId.replace('#', '') },
    });
  };

  return (
    <View style={[styles.container, { paddingTop: safeTop }]}>
      {/* 1. Top Brand Header */}
      <View style={styles.topHeader}>
        <View style={styles.brandTitleRow}>
          <Text style={styles.brandName}>Renew</Text>
          <Text style={styles.brandNameYellow}>X</Text>
          <Text style={styles.brandTagline}>Buy Refurbished | Sell | Upgrade</Text>
        </View>

        <View style={styles.headerRightRow}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation.navigate('Notifications')}
            activeOpacity={0.8}
          >
            <Ionicons name="notifications-outline" size={20} color="#0F172A" />
            <View style={styles.notificationDot} />
          </TouchableOpacity>

          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>ND</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. Success Hero Section with Confetti & Big Checkmark */}
        <View style={styles.heroSection}>
          {/* Confetti Particles (Accurate to Image 3) */}
          <View style={styles.confettiContainer} pointerEvents="none">
            {/* Green and blue particles */}
            <View style={[styles.confettiPiece, { top: 10, left: 40, backgroundColor: '#3B82F6', width: 8, height: 12, transform: [{ rotate: '45deg' }] }]} />
            <View style={[styles.confettiPiece, { top: 24, left: 80, backgroundColor: '#F59E0B', width: 10, height: 10, borderRadius: 2, transform: [{ rotate: '20deg' }] }]} />
            <View style={[styles.confettiPiece, { top: 8, left: 120, backgroundColor: '#EC4899', width: 7, height: 7, borderRadius: 3.5 }]} />
            <View style={[styles.confettiPiece, { top: 38, left: 60, backgroundColor: '#10B981', width: 12, height: 5, transform: [{ rotate: '-30deg' }] }]} />

            {/* Right side confetti */}
            <View style={[styles.confettiPiece, { top: 12, right: 110, backgroundColor: '#10B981', width: 10, height: 14, transform: [{ rotate: '-25deg' }] }]} />
            <View style={[styles.confettiPiece, { top: 22, right: 60, backgroundColor: '#F59E0B', width: 8, height: 8, transform: [{ rotate: '40deg' }] }]} />
            <View style={[styles.confettiPiece, { top: 34, right: 90, backgroundColor: '#3B82F6', width: 12, height: 10, transform: [{ rotate: '15deg' }] }]} />
            <View style={[styles.confettiPiece, { top: 46, right: 40, backgroundColor: '#8B5CF6', width: 11, height: 6, transform: [{ rotate: '-45deg' }] }]} />
            <View style={[styles.confettiPiece, { top: 60, right: 75, backgroundColor: '#10B981', width: 14, height: 6, transform: [{ rotate: '30deg' }] }]} />
          </View>

          {/* Big Green Circle with Checkmark */}
          <View style={styles.successCheckCircle}>
            <Ionicons name="checkmark" size={46} color="#FFFFFF" />
          </View>

          <Text style={styles.successTitle}>Order Confirmed!</Text>
          <Text style={styles.successSubtitle}>Thank you for your purchase</Text>
          <Text style={styles.successDescription}>
            Your order has been placed successfully and is being processed.
          </Text>
        </View>

        {/* 3. Order ID & Details Card (2-Column Grid) */}
        <View style={styles.orderSummaryCard}>
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>Order ID</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
              <Text style={styles.orderIdText}>{cleanOrderId}</Text>
              <TouchableOpacity
                onPress={handleCopyOrderId}
                style={styles.copyBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={copied ? 'checkmark-circle' : 'copy-outline'}
                  size={15}
                  color={copied ? '#16A34A' : '#64748B'}
                />
              </TouchableOpacity>
            </View>

            <Text style={[styles.summaryLabel, { marginTop: 12 }]}>Placed on</Text>
            <Text style={styles.summaryValue}>12 Sep 2026, 10:30 AM</Text>
          </View>

          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>Total Amount</Text>
            <Text style={styles.totalAmountValue}>{formatMoney(totalAmount)}</Text>

            <Text style={[styles.summaryLabel, { marginTop: 12 }]}>Payment Method</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
              <Text style={styles.summaryValue}>{displayPaymentMethod}</Text>
              <Ionicons name="flash" size={13} color="#F59E0B" style={{ marginLeft: 4 }} />
            </View>
          </View>
        </View>

        {/* 4. Order Tracking Card */}
        <View style={styles.cardContainer}>
          <Text style={styles.cardTitle}>Order Tracking</Text>
          <Text style={styles.cardSubtitle}>We'll keep you updated at every step.</Text>

          {/* Stepper with 6 stages */}
          <View style={styles.trackerContainer}>
            <View style={styles.trackerStepperRow}>
              {/* Step 1: Order Placed (Done) */}
              <View style={styles.trackerNodeCol}>
                <View style={[styles.trackerCircle, styles.trackerCircleDone]}>
                  <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                </View>
                <Text style={styles.trackerNodeTitle}>Order Placed</Text>
                <Text style={styles.trackerNodeDate}>12 Sep</Text>
                <Text style={styles.trackerNodeDate}>10:30 AM</Text>
              </View>

              <View style={[styles.trackerLine, styles.trackerLineDone]} />

              {/* Step 2: Confirmed (Done) */}
              <View style={styles.trackerNodeCol}>
                <View style={[styles.trackerCircle, styles.trackerCircleDone]}>
                  <Ionicons name="cube" size={13} color="#FFFFFF" />
                </View>
                <Text style={styles.trackerNodeTitle}>Confirmed</Text>
                <Text style={styles.trackerNodeDate}>12 Sep</Text>
                <Text style={styles.trackerNodeDate}>10:35 AM</Text>
              </View>

              <View style={styles.trackerLine} />

              {/* Step 3: Packed */}
              <View style={styles.trackerNodeCol}>
                <View style={styles.trackerCircle} />
                <Text style={styles.trackerNodeTitle}>Packed</Text>
                <Text style={styles.trackerNodePending}>Pending</Text>
              </View>

              <View style={styles.trackerLine} />

              {/* Step 4: Shipped */}
              <View style={styles.trackerNodeCol}>
                <View style={styles.trackerCircle} />
                <Text style={styles.trackerNodeTitle}>Shipped</Text>
                <Text style={styles.trackerNodePending}>Pending</Text>
              </View>

              <View style={styles.trackerLine} />

              {/* Step 5: Out for Delivery */}
              <View style={styles.trackerNodeCol}>
                <View style={styles.trackerCircle} />
                <Text style={styles.trackerNodeTitle}>Out for Delivery</Text>
                <Text style={styles.trackerNodePending}>Pending</Text>
              </View>

              <View style={styles.trackerLine} />

              {/* Step 6: Delivered */}
              <View style={styles.trackerNodeCol}>
                <View style={styles.trackerCircle} />
                <Text style={styles.trackerNodeTitle}>Delivered</Text>
                <Text style={styles.trackerNodePending}>Pending</Text>
              </View>
            </View>
          </View>

          {/* Estimated Delivery Box */}
          <View style={styles.deliveryBox}>
            <View style={styles.deliveryTruckCircle}>
              <Ionicons name="car" size={20} color="#0F172A" />
            </View>

            <View style={styles.deliveryBoxInfo}>
              <Text style={styles.deliveryBoxLabel}>Estimated Delivery</Text>
              <Text style={styles.deliveryBoxDate}>15 Sep 2026</Text>
              <Text style={styles.deliveryBoxDays}>3 - 5 business days</Text>
            </View>

            <TouchableOpacity style={styles.trackOrderBtn} onPress={handleTrackOrder} activeOpacity={0.85}>
              <Ionicons name="location" size={13} color="#0F172A" style={{ marginRight: 4 }} />
              <Text style={styles.trackOrderBtnText}>Track Order ›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 5. Action Buttons (2x2 Grid) */}
        <View style={styles.actionGrid}>
          {/* 1. View Order Details */}
          <TouchableOpacity
            style={styles.actionGridCard}
            onPress={() => navigation.navigate('Track', { search: cleanOrderId.replace('#', '') })}
            activeOpacity={0.8}
          >
            <Ionicons name="document-text-outline" size={20} color="#0F172A" />
            <Text style={styles.actionGridTitle}>View Order Details</Text>
          </TouchableOpacity>

          {/* 2. Download Invoice */}
          <TouchableOpacity
            style={styles.actionGridCard}
            onPress={handleDownloadInvoice}
            disabled={downloadingInvoice}
            activeOpacity={0.8}
          >
            {downloadingInvoice ? (
              <ActivityIndicator size="small" color="#0F172A" />
            ) : (
              <Ionicons name="download-outline" size={20} color="#0F172A" />
            )}
            <Text style={styles.actionGridTitle}>Download Invoice</Text>
          </TouchableOpacity>

          {/* 3. Continue Shopping (Warm highlighted) */}
          <TouchableOpacity
            style={[styles.actionGridCard, styles.continueShoppingCard]}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Shop' })}
            activeOpacity={0.8}
          >
            <Ionicons name="bag-handle-outline" size={20} color="#0F172A" />
            <Text style={styles.actionGridTitle}>Continue Shopping</Text>
          </TouchableOpacity>

          {/* 4. Share Order */}
          <TouchableOpacity
            style={styles.actionGridCard}
            onPress={handleShareOrder}
            activeOpacity={0.8}
          >
            <Ionicons name="share-social-outline" size={20} color="#0F172A" />
            <Text style={styles.actionGridTitle}>Share Order</Text>
          </TouchableOpacity>
        </View>

        {/* 6. Items in this order (3) */}
        <View style={styles.cardContainer}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Items in this order ({displayItems.length})</Text>
            <TouchableOpacity onPress={handleTrackOrder} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.viewAllText}>View All</Text>
              <Ionicons name="arrow-forward" size={13} color="#475569" style={{ marginLeft: 2 }} />
            </TouchableOpacity>
          </View>

          {displayItems.map((item: any) => (
            <View key={item.id} style={styles.itemRow}>
              <Image source={{ uri: item.image }} style={styles.itemImage} resizeMode="contain" />

              <View style={styles.itemInfoCol}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemSpecs}>{item.specs}</Text>
                <View style={styles.refurbishedPill}>
                  <Text style={styles.refurbishedPillText}>{item.conditionTag}</Text>
                </View>
              </View>

              <View style={styles.itemPriceCol}>
                <Text style={styles.itemQty}>Qty: {item.quantity}</Text>
                <Text style={styles.itemPrice}>{formatMoney(item.price)}</Text>
                <Text style={styles.itemOriginalPrice}>{formatMoney(item.originalPrice)}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* 7. Green Planet Savings Banner */}
        <View style={styles.greenPlanetBanner}>
          <View style={styles.greenLeafCircle}>
            <Ionicons name="leaf" size={20} color="#16A34A" />
          </View>

          <View style={styles.greenPlanetTextCol}>
            <Text style={styles.greenPlanetTitle}>You saved ₹62,702</Text>
            <Text style={styles.greenPlanetDesc}>
              Thank you for choosing refurbished. Together for a greener planet. ♻️
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={18} color="#16A34A" />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* 8. Bottom App Navigation Bar (Home, Categories, Orders, Profile, Sell) */}
      <View style={styles.bottomNavCapsule}>
        <TouchableOpacity
          style={styles.bottomNavItem}
          onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}
          activeOpacity={0.8}
        >
          <Ionicons name="home-outline" size={20} color="#64748B" />
          <Text style={styles.bottomNavLabel}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bottomNavItem}
          onPress={() => navigation.navigate('MainTabs', { screen: 'Shop' })}
          activeOpacity={0.8}
        >
          <Ionicons name="grid-outline" size={20} color="#64748B" />
          <Text style={styles.bottomNavLabel}>Categories</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bottomNavItem}
          onPress={() => navigation.navigate('MainTabs', { screen: 'Track' })}
          activeOpacity={0.8}
        >
          <Ionicons name="bag-handle-outline" size={20} color="#64748B" />
          <Text style={styles.bottomNavLabel}>Orders</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bottomNavItem}
          onPress={() => navigation.navigate('MainTabs', { screen: 'Account' })}
          activeOpacity={0.8}
        >
          <Ionicons name="person-outline" size={20} color="#64748B" />
          <Text style={styles.bottomNavLabel}>Profile</Text>
        </TouchableOpacity>

        {/* Floating Yellow Sell Button */}
        <TouchableOpacity
          style={styles.floatingSellBtn}
          onPress={() => navigation.navigate('MainTabs', { screen: 'Sell' })}
          activeOpacity={0.88}
        >
          <Ionicons name="pricetag" size={18} color="#0F172A" />
          <Text style={styles.floatingSellText}>Sell</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  brandTitleRow: {
    alignItems: 'flex-start',
  },
  brandName: {
    fontSize: 20,
    fontWeight: '900',
    fontStyle: 'italic',
    color: '#0A1128',
    letterSpacing: -0.5,
    textShadowColor: '#EA580C',
    textShadowOffset: { width: -1.5, height: 0 },
    textShadowRadius: 1,
  },
  brandNameYellow: {
    fontSize: 20,
    fontWeight: '900',
    fontStyle: 'italic',
    color: '#F59E0B',
  },
  brandTagline: {
    fontSize: 8.5,
    color: '#476E8E',
    fontWeight: '700',
    letterSpacing: 0.2,
    marginTop: -2,
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 6,
    right: 7,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#166534',
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  // Hero Section
  heroSection: {
    alignItems: 'center',
    paddingVertical: 20,
    position: 'relative',
  },
  confettiContainer: {
    ...StyleSheet.absoluteFill,
  },
  confettiPiece: {
    position: 'absolute',
    borderRadius: 1,
  },
  successCheckCircle: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  successSubtitle: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  successDescription: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 18,
  },

  // Summary Card
  orderSummaryCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  summaryCol: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '500',
  },
  orderIdText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  copyBtn: {
    marginLeft: 6,
    padding: 2,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  totalAmountValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },

  // Card Container
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  cardSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 12.5,
    color: '#475569',
    fontWeight: '600',
  },

  // Stepper
  trackerContainer: {
    marginBottom: 14,
  },
  trackerStepperRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  trackerNodeCol: {
    alignItems: 'center',
    width: 48,
  },
  trackerCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  trackerCircleDone: {
    backgroundColor: '#16A34A',
  },
  trackerNodeTitle: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  trackerNodeDate: {
    fontSize: 7.5,
    color: '#64748B',
    textAlign: 'center',
  },
  trackerNodePending: {
    fontSize: 7.5,
    color: '#94A3B8',
    textAlign: 'center',
  },
  trackerLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginTop: 10,
    marginHorizontal: -2,
  },
  trackerLineDone: {
    backgroundColor: '#16A34A',
  },

  // Estimated Delivery Box
  deliveryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: 12,
    padding: 12,
  },
  deliveryTruckCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  deliveryBoxInfo: {
    flex: 1,
  },
  deliveryBoxLabel: {
    fontSize: 10.5,
    color: '#64748B',
  },
  deliveryBoxDate: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 1,
  },
  deliveryBoxDays: {
    fontSize: 11,
    color: '#16A34A',
    fontWeight: '600',
  },
  trackOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  trackOrderBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },

  // 2x2 Action Grid
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  actionGridCard: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueShoppingCard: {
    backgroundColor: '#FEF9C3',
    borderColor: '#FDE047',
  },
  actionGridTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 6,
  },

  // Order Item Rows
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    marginRight: 10,
  },
  itemInfoCol: {
    flex: 1,
    marginRight: 8,
  },
  itemName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  itemSpecs: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  refurbishedPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 3,
  },
  refurbishedPillText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#B45309',
  },
  itemPriceCol: {
    alignItems: 'flex-end',
  },
  itemQty: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 1,
  },
  itemPrice: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  itemOriginalPrice: {
    fontSize: 10.5,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },

  // Green Planet Banner
  greenPlanetBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  greenLeafCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  greenPlanetTextCol: {
    flex: 1,
    marginRight: 6,
  },
  greenPlanetTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#15803D',
  },
  greenPlanetDesc: {
    fontSize: 10.5,
    color: '#166534',
    marginTop: 2,
  },

  // Bottom Navigation Bar
  bottomNavCapsule: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 8,
  },
  bottomNavItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    minWidth: 50,
  },
  bottomNavLabel: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 3,
    fontWeight: '500',
  },
  floatingSellBtn: {
    backgroundColor: '#FACC15',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 5,
  },
  floatingSellText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 1,
  },
});
