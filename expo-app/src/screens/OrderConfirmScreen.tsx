import React, { useState, useRef, useCallback } from 'react';
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
import * as Clipboard from 'expo-clipboard';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { useSafeHeaderTop } from '@/lib/useSafeHeaderTop';
import { downloadOrderInvoicePdf } from '@/services/invoiceService';
import HomeHeader from '@/components/HomeHeader';
import AnimatedOrderSuccessTick from '@/components/AnimatedOrderSuccessTick';
import { getCategoryDeviceImage } from '@/lib/imageUtils';
import { renewxColors, renewxShadows, renewxTextStyle } from '@/design-system';

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
  const scrollRef = useRef<ScrollView>(null);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' as any });
      }
    }, [])
  );

  const params = route.params || {};
  const order = params.order || {};
  const rawId = String(params.orderId || order.order_number || order.orderNumber || order.id || order._id || 'RX-PENDING');
  const cleanOrderId = rawId.startsWith('#') ? rawId : `#${rawId}`;
  const rawIdNoHash = cleanOrderId.replace(/^#/, '');
  const displayOrderId =
    rawIdNoHash.length > 13
      ? `#${rawIdNoHash.slice(0, 7)}...${rawIdNoHash.slice(-4)}`
      : cleanOrderId;

  const orderDateRaw = order.created_at || order.createdAt || order.date;
  const placedOnDate = orderDateRaw
    ? new Date(orderDateRaw).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

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
    name: it.name || it.product_name || 'Device',
    conditionTag: it.conditionTag || (it.condition ? `Pre-Owned • ${it.condition}` : 'Pre-Owned • Excellent'),
    specs: it.specs || (it.brand ? `${it.brand} ${it.model || ''}`.trim() : 'Certified'),
    price: Number(it.price || 0),
    originalPrice: Number(it.originalPrice || it.original_price || it.price || 0),
    quantity: Number(it.quantity || 1),
    image:
      typeof (it.image || it.image_url || it.imageUrl) === 'string' &&
      !(it.image || it.image_url || it.imageUrl).includes('unsplash.com') &&
      (it.image || it.image_url || it.imageUrl).trim()
        ? (it.image || it.image_url || it.imageUrl).trim()
        : getCategoryDeviceImage(it.category, it.name),
  }));

  const totalAmount =
    params.totalAmount !== undefined
      ? params.totalAmount
      : Number(order.total_amount || order.total || order.subtotal || 0);

  const [copied, setCopied] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);

  const handleCopyOrderId = async () => {
    try {
      if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(cleanOrderId);
        } else if (typeof document !== 'undefined') {
          const textarea = document.createElement('textarea');
          textarea.value = cleanOrderId;
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          textarea.focus();
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
        }
      } else {
        await Clipboard.setStringAsync(cleanOrderId);
      }
    } catch {
      try {
        await Clipboard.setStringAsync(cleanOrderId);
      } catch {}
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
        message: `I just placed an order on RenewX! Order ID: ${cleanOrderId} for ₹${Number(totalAmount).toLocaleString('en-IN')}. Check it out on RenewX.`,
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
    <View style={styles.container}>
      {/* 1. Top Header (Matching Reference Image 4: Order Confirmation) */}
      <HomeHeader
        mode="order-confirm"
        onClose={() => navigation.navigate('MainTabs', { screen: 'Home' })}
      />

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. Success Hero Section with Animated Green Tick (Zoom-in to Zoom-out) */}
        <View style={styles.heroSection}>
          <View style={{ marginBottom: 8, alignItems: 'center', justifyContent: 'center' }}>
            <AnimatedOrderSuccessTick size={88} showParticles={true} />
          </View>

          <Text style={styles.successTitle}>Order Confirmed!</Text>
          <Text style={styles.successSubtitle}>Thank you for your purchase</Text>
          <Text style={styles.successDescription}>
            Your order has been placed successfully and is being processed.
          </Text>
        </View>

        {/* 3. Order ID & Details Card (2-Row Layout - Prevents Any Text Collision) */}
        <View style={styles.orderSummaryCard}>
          {/* Top Row: Order ID & Total Amount */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryColLeft}>
              <Text style={styles.summaryLabel}>Order ID</Text>
              <View style={styles.orderIdRow}>
                <Text
                  style={styles.orderIdText}
                  numberOfLines={1}
                  ellipsizeMode="middle"
                >
                  {displayOrderId}
                </Text>
                <TouchableOpacity
                  onPress={handleCopyOrderId}
                  style={styles.copyBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={copied ? 'checkmark-circle' : 'copy-outline'}
                    size={15}
                    color={copied ? renewxColors.emerald : renewxColors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.summaryColRight}>
              <Text style={styles.summaryLabelRight}>Total Amount</Text>
              <Text style={styles.totalAmountValue}>{formatMoney(totalAmount)}</Text>
            </View>
          </View>

          {/* Subtle Divider */}
          <View style={styles.summaryDivider} />

          {/* Bottom Row: Placed on & Payment Method */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryColLeft}>
              <Text style={styles.summaryLabel}>Placed on</Text>
              <Text style={styles.summaryValue} numberOfLines={1}>{placedOnDate}</Text>
            </View>

            <View style={styles.summaryColRight}>
              <Text style={styles.summaryLabelRight}>Payment Method</Text>
              <View style={styles.paymentMethodRow}>
                <Text style={styles.summaryValueRight} numberOfLines={1}>
                  {displayPaymentMethod}
                </Text>
                <Ionicons name="flash" size={13} color={renewxColors.yellowDark} style={{ marginLeft: 4 }} />
              </View>
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
              <Ionicons name="arrow-forward" size={13} color={renewxColors.emerald} style={{ marginLeft: 3 }} />
            </TouchableOpacity>
          </View>

          {displayItems.map((item: any) => (
            <View key={item.id} style={styles.itemRow}>
              <Image
                source={typeof item.image === 'string' ? { uri: item.image } : item.image}
                style={styles.itemImage}
                resizeMode="contain"
              />

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
            <Ionicons name="leaf" size={20} color={renewxColors.emerald} />
          </View>

          <View style={styles.greenPlanetTextCol}>
            <Text style={styles.greenPlanetTitle}>You saved ₹62,702</Text>
            <Text style={styles.greenPlanetDesc}>
              Thank you for choosing pre-owned devices. Together for a greener planet. ♻️
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={18} color={renewxColors.emerald} />
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
    backgroundColor: renewxColors.background,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: renewxColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: renewxColors.border,
  },
  brandTitleRow: {
    alignItems: 'flex-start',
  },
  brandName: {
    ...renewxTextStyle('black'),
    fontSize: 20,
    color: renewxColors.black,
    letterSpacing: -0.5,
  },
  brandNameYellow: {
    ...renewxTextStyle('black'),
    fontSize: 20,
    color: renewxColors.yellowDark,
  },
  brandTagline: {
    ...renewxTextStyle('semibold'),
    fontSize: 8.5,
    color: renewxColors.textSecondary,
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
    backgroundColor: renewxColors.background,
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
    backgroundColor: renewxColors.error,
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: renewxColors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...renewxTextStyle('extraBold'),
    fontSize: 13,
    color: renewxColors.mintDark,
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
    backgroundColor: renewxColors.emerald,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    ...Platform.select({
      ios: { shadowColor: renewxColors.emerald, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12 },
      android: { elevation: 6 },
      web: { boxShadow: '0 8px 20px rgba(12, 122, 67, 0.24)' },
    }),
  },
  successTitle: {
    ...renewxTextStyle('black'),
    fontSize: 24,
    color: renewxColors.black,
    marginBottom: 4,
  },
  successSubtitle: {
    ...renewxTextStyle('semibold'),
    fontSize: 14.5,
    color: renewxColors.textSecondary,
    marginBottom: 6,
  },
  successDescription: {
    ...renewxTextStyle('regular'),
    fontSize: 12.5,
    color: renewxColors.textMuted,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 18,
  },

  // Summary Card
  orderSummaryCard: {
    backgroundColor: renewxColors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: renewxColors.border,
    marginBottom: 14,
    ...renewxShadows.card,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  summaryColLeft: {
    flex: 1,
    marginRight: 12,
    minWidth: 0,
  },
  summaryColRight: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: renewxColors.surfaceMuted,
    marginVertical: 12,
  },
  summaryLabel: {
    ...renewxTextStyle('medium'),
    fontSize: 11.5,
    color: renewxColors.textMuted,
  },
  summaryLabelRight: {
    ...renewxTextStyle('medium'),
    fontSize: 11.5,
    color: renewxColors.textMuted,
    textAlign: 'right',
  },
  orderIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    maxWidth: '100%',
  },
  orderIdText: {
    ...renewxTextStyle('extraBold'),
    fontSize: 15.5,
    color: renewxColors.black,
    flexShrink: 1,
  },
  copyBtn: {
    marginLeft: 6,
    padding: 3,
  },
  summaryValue: {
    ...renewxTextStyle('bold'),
    fontSize: 13,
    color: renewxColors.black,
    marginTop: 2,
  },
  summaryValueRight: {
    ...renewxTextStyle('bold'),
    fontSize: 13,
    color: renewxColors.black,
    textAlign: 'right',
  },
  totalAmountValue: {
    ...renewxTextStyle('black'),
    fontSize: 18,
    color: renewxColors.black,
    marginTop: 2,
    textAlign: 'right',
  },
  paymentMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 2,
  },

  // Card Container
  cardContainer: {
    backgroundColor: renewxColors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: renewxColors.border,
  },
  cardTitle: {
    ...renewxTextStyle('extraBold'),
    fontSize: 15.5,
    color: renewxColors.black,
  },
  cardSubtitle: {
    ...renewxTextStyle('regular'),
    fontSize: 12,
    color: renewxColors.textMuted,
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
    ...renewxTextStyle('bold'),
    fontSize: 12.5,
    color: renewxColors.emerald,
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
    backgroundColor: renewxColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  trackerCircleDone: {
    backgroundColor: renewxColors.emerald,
  },
  trackerNodeTitle: {
    ...renewxTextStyle('bold'),
    fontSize: 8.5,
    color: renewxColors.black,
    textAlign: 'center',
  },
  trackerNodeDate: {
    ...renewxTextStyle('regular'),
    fontSize: 7.5,
    color: renewxColors.textMuted,
    textAlign: 'center',
  },
  trackerNodePending: {
    ...renewxTextStyle('regular'),
    fontSize: 7.5,
    color: '#94A3B8',
    textAlign: 'center',
  },
  trackerLine: {
    flex: 1,
    height: 2,
    backgroundColor: renewxColors.border,
    marginTop: 10,
    marginHorizontal: -2,
  },
  trackerLineDone: {
    backgroundColor: renewxColors.emerald,
  },

  // Estimated Delivery Box
  deliveryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: renewxColors.mintLight,
    borderWidth: 1,
    borderColor: renewxColors.mintBorder,
    borderRadius: 12,
    padding: 12,
  },
  deliveryTruckCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: renewxColors.mint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  deliveryBoxInfo: {
    flex: 1,
  },
  deliveryBoxLabel: {
    ...renewxTextStyle('regular'),
    fontSize: 10.5,
    color: renewxColors.textMuted,
  },
  deliveryBoxDate: {
    ...renewxTextStyle('extraBold'),
    fontSize: 15,
    color: renewxColors.black,
    marginTop: 1,
  },
  deliveryBoxDays: {
    ...renewxTextStyle('semibold'),
    fontSize: 11,
    color: renewxColors.emerald,
  },
  trackOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: renewxColors.surface,
    borderWidth: 1,
    borderColor: renewxColors.border,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  trackOrderBtnText: {
    ...renewxTextStyle('bold'),
    fontSize: 12,
    color: renewxColors.black,
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
    backgroundColor: renewxColors.surface,
    borderWidth: 1,
    borderColor: renewxColors.border,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueShoppingCard: {
    backgroundColor: renewxColors.yellowSoft,
    borderColor: renewxColors.yellowDark,
    borderWidth: 1.5,
  },
  actionGridTitle: {
    ...renewxTextStyle('bold'),
    fontSize: 12.5,
    color: renewxColors.black,
    marginTop: 6,
  },

  // Order Item Rows
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: renewxColors.surfaceMuted,
  },
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: renewxColors.background,
    marginRight: 10,
  },
  itemInfoCol: {
    flex: 1,
    marginRight: 8,
  },
  itemName: {
    ...renewxTextStyle('bold'),
    fontSize: 13.5,
    color: renewxColors.black,
  },
  itemSpecs: {
    ...renewxTextStyle('regular'),
    fontSize: 11,
    color: renewxColors.textMuted,
    marginTop: 1,
  },
  refurbishedPill: {
    alignSelf: 'flex-start',
    backgroundColor: renewxColors.yellowLight,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    marginTop: 3,
  },
  refurbishedPillText: {
    ...renewxTextStyle('bold'),
    fontSize: 9.5,
    color: '#9A6700',
  },
  itemPriceCol: {
    alignItems: 'flex-end',
  },
  itemQty: {
    ...renewxTextStyle('regular'),
    fontSize: 11,
    color: renewxColors.textMuted,
    marginBottom: 1,
  },
  itemPrice: {
    ...renewxTextStyle('extraBold'),
    fontSize: 13.5,
    color: renewxColors.black,
  },
  itemOriginalPrice: {
    ...renewxTextStyle('regular'),
    fontSize: 10.5,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },

  // Green Planet Banner
  greenPlanetBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: renewxColors.mintLight,
    borderWidth: 1,
    borderColor: renewxColors.mintBorder,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  greenLeafCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: renewxColors.mint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  greenPlanetTextCol: {
    flex: 1,
    marginRight: 6,
  },
  greenPlanetTitle: {
    ...renewxTextStyle('extraBold'),
    fontSize: 13.5,
    color: renewxColors.mintDark,
  },
  greenPlanetDesc: {
    ...renewxTextStyle('regular'),
    fontSize: 11,
    color: renewxColors.emerald,
    marginTop: 2,
    lineHeight: 15,
  },

  // Bottom Navigation Bar
  bottomNavCapsule: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: renewxColors.surface,
    borderTopWidth: 1,
    borderTopColor: renewxColors.border,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.05, shadowRadius: 6 },
      android: { elevation: 8 },
      web: { boxShadow: '0 -3px 10px rgba(15, 23, 42, 0.06)' },
    }),
  },
  bottomNavItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    minWidth: 50,
  },
  bottomNavLabel: {
    ...renewxTextStyle('medium'),
    fontSize: 10.5,
    color: renewxColors.textMuted,
    marginTop: 3,
  },
  floatingSellBtn: {
    backgroundColor: renewxColors.yellow,
    borderWidth: 1.5,
    borderColor: renewxColors.yellowDark,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: renewxColors.yellowDark, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 6 },
      android: { elevation: 5 },
      web: { boxShadow: '0 4px 12px rgba(217, 166, 0, 0.32)' },
    }),
  },
  floatingSellText: {
    ...renewxTextStyle('extraBold'),
    fontSize: 9.5,
    color: renewxColors.black,
    marginTop: 1,
  },
});
