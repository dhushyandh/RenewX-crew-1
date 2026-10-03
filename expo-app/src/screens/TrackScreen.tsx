import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  TextInput,
  RefreshControl,
  Platform,
  Modal,
  Linking,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/App';
import { api } from '@/services/api';
import { useToast } from '@/context/ToastContext';
import HomeHeader from '@/components/HomeHeader';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import {
  renewxColors,
  renewxFontFamily,
  renewxRadius,
  renewxSpacing,
} from '@/design-system';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface TrackingStep {
  label: string;
  description: string;
  date: string;
  status: 'completed' | 'active' | 'pending';
}

interface OrderItem {
  id: string;
  display_id: string;
  product_name: string;
  specs: string;
  price: number;
  qty: number;
  placed_date: string;
  status: 'processing' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled';
  status_label: string;
  status_color: string;
  status_bg: string;
  image: any;
  tracking_id?: string;
  delivery_partner?: {
    name: string;
    role: string;
    phone: string;
    avatar?: string;
  };
  delivery_address?: string;
  estimated_delivery_date: string;
  estimated_delivery_time: string;
  steps: TrackingStep[];
  raw_order?: any;
}

export interface SellRequestItem {
  id: string;
  display_id: string;
  category: string;
  brand: string;
  model: string;
  storage: string;
  valuation_amount: number;
  expected_price: number;
  status: 'pending' | 'approved' | 'scheduled' | 'picked_up' | 'inspected' | 'completed' | 'cancelled' | 'rejected';
  status_label: string;
  status_color: string;
  status_bg: string;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  pincode: string;
  photos: string[];
  steps: TrackingStep[];
  pickup_partner?: {
    name: string;
    role: string;
    phone: string;
    avatar?: string;
  };
}

const ORDER_FILTER_TABS = [
  { id: 'all', label: 'All Orders' },
  { id: 'processing', label: 'Processing' },
  { id: 'shipped', label: 'Shipped' },
  { id: 'out_for_delivery', label: 'Out for Delivery' },
  { id: 'delivered', label: 'Delivered' },
];

const SELL_FILTER_TABS = [
  { id: 'all', label: 'All Requests' },
  { id: 'pending', label: 'Under Review' },
  { id: 'scheduled', label: 'Pickup Scheduled' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
];

function formatShortId(rawId: string, prefix = 'RX'): string {
  if (!rawId) return `#${prefix}-000000`;
  const clean = rawId.replace(/[^a-zA-Z0-9]/g, '');
  if (clean.length > 8) {
    return `#${prefix}-${clean.slice(-6).toUpperCase()}`;
  }
  return `#${rawId.toUpperCase()}`;
}

function getCategoryIcon(cat?: string): keyof typeof Ionicons.glyphMap {
  const c = String(cat || '').toLowerCase();
  if (c.includes('laptop') || c.includes('macbook')) return 'laptop-outline';
  if (c.includes('tablet') || c.includes('ipad')) return 'tablet-portrait-outline';
  if (c.includes('watch')) return 'watch-outline';
  if (c.includes('audio') || c.includes('earbud')) return 'headset-outline';
  return 'phone-portrait-outline';
}

export default function TrackScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<any>();
  const toast = useToast();
  const filterScrollRef = useRef<ScrollView>(null);

  // Switch between 'orders' and 'sell_requests'
  const initialType = route.params?.type === 'sell_requests' ? 'sell_requests' : 'orders';
  const [trackType, setTrackType] = useState<'orders' | 'sell_requests'>(initialType);

  // Filter tabs and search
  const [activeTab, setActiveTab] = useState('all');
  const [activeSellTab, setActiveSellTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState(route.params?.search || '');

  // Tracking detail view selection (Null = List view, Non-null = Dedicated tracking view)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(
    route.params?.type !== 'sell_requests' ? route.params?.id || null : null
  );
  const [selectedSellId, setSelectedSellId] = useState<string | null>(
    route.params?.type === 'sell_requests' ? route.params?.id || null : null
  );

  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [sellRequests, setSellRequests] = useState<SellRequestItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingSellId, setCancellingSellId] = useState<string | null>(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Update selection if route params change
  useEffect(() => {
    if (route.params?.type) {
      setTrackType(route.params.type);
    }
    if (route.params?.search) {
      setSearchQuery(route.params.search);
    }
    if (route.params?.id) {
      if (route.params.type === 'sell_requests') {
        setSelectedSellId(route.params.id);
        setSelectedOrderId(null);
      } else {
        setSelectedOrderId(route.params.id);
        setSelectedSellId(null);
      }
    }
  }, [route.params]);

  // Fetch real data from database
  const fetchData = useCallback(async () => {
    try {
      const [orderRes, sellRes] = await Promise.allSettled([
        api.orders.getAll(),
        api.tradeIn.getMyRequests(),
      ]);

      if (orderRes.status === 'fulfilled' && Array.isArray(orderRes.value) && orderRes.value.length > 0) {
        const mapped: OrderItem[] = orderRes.value.map((o: any) => {
          const rawStatus = String(o.status || 'processing').toLowerCase();
          const items = o.order_items || o.items || [];
          const firstItem = items[0] || {};
          const status = (rawStatus === 'delivered'
            ? 'delivered'
            : rawStatus === 'out_for_delivery'
            ? 'out_for_delivery'
            : rawStatus === 'shipped'
            ? 'shipped'
            : rawStatus === 'cancelled'
            ? 'cancelled'
            : 'processing') as OrderItem['status'];

          const id = String(o.id || o._id || '');
          const display_id = formatShortId(id, 'ORD');

          let status_label = 'Processing';
          let status_color = '#D97706';
          let status_bg = '#FEF3C7';

          if (status === 'shipped') {
            status_label = 'In Transit';
            status_color = '#2563EB';
            status_bg = '#EFF6FF';
          } else if (status === 'out_for_delivery') {
            status_label = 'Out for Delivery';
            status_color = '#7C3AED';
            status_bg = '#F5F3FF';
          } else if (status === 'delivered') {
            status_label = 'Delivered';
            status_color = '#059669';
            status_bg = '#ECFDF5';
          } else if (status === 'cancelled') {
            status_label = 'Cancelled';
            status_color = '#DC2626';
            status_bg = '#FEE2E2';
          }

          const placedDateStr = o.created_at
            ? new Date(o.created_at).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })
            : '03 Oct 2026';

          const steps: TrackingStep[] = [
            {
              label: 'Order Placed & Confirmed',
              description: 'Payment authorized and order sent to RenewX Fulfillment Center.',
              date: placedDateStr,
              status: 'completed',
            },
            {
              label: 'Inspected & Packed',
              description: 'Device cleared 32-point quality check and packed in tamper-proof seal.',
              date: status === 'processing' ? 'In Progress' : 'Completed',
              status: status === 'processing' ? 'active' : 'completed',
            },
            {
              label: 'Handed to Courier Partner',
              description: 'Dispatched via BlueDart Express Air Courier.',
              date: status === 'processing' ? 'Expected Tomorrow' : 'Dispatched',
              status:
                status === 'shipped'
                  ? 'active'
                  : status === 'out_for_delivery' || status === 'delivered'
                  ? 'completed'
                  : 'pending',
            },
            {
              label: 'Out for Doorstep Delivery',
              description: 'Delivery executive is en route to your shipping address.',
              date: status === 'out_for_delivery' ? 'Today' : 'Pending',
              status:
                status === 'out_for_delivery'
                  ? 'active'
                  : status === 'delivered'
                  ? 'completed'
                  : 'pending',
            },
            {
              label: 'Package Delivered',
              description: 'Handed over to customer with OTP verification.',
              date: status === 'delivered' ? 'Delivered' : 'Pending',
              status: status === 'delivered' ? 'completed' : 'pending',
            },
          ];

          return {
            id,
            display_id,
            product_name: firstItem.name || firstItem.product_name || 'Device',
            specs: firstItem.specs || firstItem.condition || 'Pristine Condition • Tested & Verified',
            price: Number(o.total_amount || o.total || firstItem.price || 0),
            qty: items.length || 1,
            placed_date: placedDateStr,
            status,
            status_label,
            status_color,
            status_bg,
            image:
              firstItem.image_url || firstItem.image
                ? { uri: firstItem.image_url || firstItem.image }
                : require('@/assets/categories/smartphone.png'),
            tracking_id: o.tracking_number || (o.status === 'shipped' || o.status === 'out_for_delivery' ? `RX-${id.slice(-6).toUpperCase()}` : undefined),
            delivery_partner: o.delivery_partner || (o.courier ? {
              name: o.courier,
              role: 'RenewX Delivery Partner',
              phone: o.courier_phone || '',
              avatar: o.courier_avatar || undefined,
            } : undefined),
            delivery_address:
              o.shipping_address ||
              (o.customer_info?.address
                ? `${o.customer_info.address}${o.customer_info.pincode ? `, ${o.customer_info.pincode}` : ''}`
                : undefined),
            estimated_delivery_date: (() => {
              const created = o.created_at ? new Date(o.created_at) : new Date();
              const est = o.estimated_delivery
                ? new Date(o.estimated_delivery)
                : new Date(created.getTime() + 4 * 24 * 60 * 60 * 1000);
              return est.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              });
            })(),
            estimated_delivery_time: 'by 6:00 PM',
            steps,
            raw_order: o,
          };
        });

        setOrders(mapped);
      } else {
        setOrders([]);
      }

      if (sellRes.status === 'fulfilled' && Array.isArray(sellRes.value) && sellRes.value.length > 0) {
        const mappedSell: SellRequestItem[] = sellRes.value.map((sr: any) => {
          const rawStatus = String(sr.status || 'pending').toLowerCase();
          const id = String(sr.id || sr._id || '');
          const display_id = formatShortId(id, 'REQ');
          const valuation = Number(sr.valuation_amount || sr.expected_price || 0);

          let status_label = 'Under Review';
          let status_color = '#D97706';
          let status_bg = '#FEF3C7';

          if (rawStatus === 'approved') {
            status_label = 'Valuation Approved';
            status_color = '#059669';
            status_bg = '#ECFDF5';
          } else if (rawStatus === 'scheduled') {
            status_label = 'Pickup Scheduled';
            status_color = '#2563EB';
            status_bg = '#EFF6FF';
          } else if (rawStatus === 'picked_up') {
            status_label = 'Device Picked Up';
            status_color = '#7C3AED';
            status_bg = '#F5F3FF';
          } else if (rawStatus === 'inspected') {
            status_label = 'Inspection Passed';
            status_color = '#059669';
            status_bg = '#ECFDF5';
          } else if (rawStatus === 'completed') {
            status_label = 'Paid & Completed';
            status_color = '#059669';
            status_bg = '#ECFDF5';
          } else if (rawStatus === 'cancelled' || rawStatus === 'rejected') {
            status_label = rawStatus === 'rejected' ? 'Declined' : 'Cancelled';
            status_color = '#DC2626';
            status_bg = '#FEE2E2';
          }

          const createdDateStr = sr.created_at
            ? new Date(sr.created_at).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })
            : 'Recently';

          const steps: TrackingStep[] = [
            {
              label: 'Request Submitted',
              description: 'Device specifications submitted for online evaluation.',
              date: createdDateStr,
              status: 'completed',
            },
            {
              label: 'Price Valuation Approved',
              description: `Instant cash quote of ₹${valuation.toLocaleString('en-IN')} confirmed.`,
              date: rawStatus === 'pending' ? 'In Review' : 'Approved',
              status: rawStatus === 'pending' ? 'active' : 'completed',
            },
            {
              label: 'Doorstep Pickup & Inspection',
              description: 'Executive visits doorstep to run quick automated diagnostics.',
              date:
                rawStatus === 'scheduled'
                  ? 'Scheduled'
                  : ['picked_up', 'inspected', 'completed'].includes(rawStatus)
                  ? 'Picked Up'
                  : 'Pending',
              status:
                rawStatus === 'scheduled'
                  ? 'active'
                  : ['picked_up', 'inspected', 'completed'].includes(rawStatus)
                  ? 'completed'
                  : 'pending',
            },
            {
              label: 'Final Quality Confirmation',
              description: 'Hardware, battery health, and display verified.',
              date: ['inspected', 'completed'].includes(rawStatus) ? 'Passed' : 'Pending',
              status:
                rawStatus === 'picked_up'
                  ? 'active'
                  : ['inspected', 'completed'].includes(rawStatus)
                  ? 'completed'
                  : 'pending',
            },
            {
              label: 'Instant Bank Payout',
              description: `₹${valuation.toLocaleString('en-IN')} transferred via UPI / IMPS.`,
              date: rawStatus === 'completed' ? 'Transferred' : 'Pending',
              status: rawStatus === 'completed' ? 'completed' : 'pending',
            },
          ];

          return {
            id,
            display_id,
            category: sr.category || 'Smartphone',
            brand: sr.brand || 'Device',
            model: sr.model || '',
            storage: sr.storage || 'Standard',
            valuation_amount: valuation,
            expected_price: valuation,
            status: rawStatus as any,
            status_label,
            status_color,
            status_bg,
            created_at: createdDateStr,
            customer_name: sr.customer_name || 'Customer',
            customer_phone: sr.customer_phone || '',
            customer_address: sr.address || '',
            pincode: sr.pincode || '',
            photos: Array.isArray(sr.photos) ? sr.photos : [],
            steps,
            pickup_partner: sr.pickup_partner || (sr.assigned_executive ? {
              name: sr.assigned_executive,
              role: 'RenewX Inspection Specialist',
              phone: sr.executive_phone || '',
              avatar: sr.executive_avatar || undefined,
            } : undefined),
          };
        });

        setSellRequests(mappedSell);
      } else {
        setSellRequests([]);
      }
    } catch {
      setOrders([]);
      setSellRequests([]);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleBack = () => {
    // If inside dedicated tracking view, back button returns to listing
    if (selectedOrderId !== null) {
      setSelectedOrderId(null);
      return;
    }
    if (selectedSellId !== null) {
      setSelectedSellId(null);
      return;
    }

    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('MainTabs', { screen: 'Home' });
  };

  const handleCopyId = async (id: string, label: string) => {
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(id);
      } else {
        await Clipboard.setStringAsync(id);
      }
      toast.success(`Copied ${label} to clipboard!`);
    } catch {
      toast.info(`ID: ${id}`);
    }
  };

  const handleCallPartner = (phone: string, name: string) => {
    toast.success(`Calling ${name}...`, phone);
    if (Platform.OS !== 'web') {
      Linking.openURL(`tel:${phone.replace(/[^0-9+]/g, '')}`).catch(() => {});
    }
  };

  const handleChatPartner = (name: string) => {
    toast.info(`Opening chat with ${name}...`);
  };

  const handleCancelSellRequest = (req: SellRequestItem) => {
    const doCancel = async () => {
      try {
        setCancellingSellId(req.id);
        await api.tradeIn.cancel(req.id, 'Cancelled by customer');
        setSellRequests((prev) =>
          prev.map((it) =>
            it.id === req.id
              ? {
                  ...it,
                  status: 'cancelled',
                  status_label: 'Cancelled',
                  status_color: '#DC2626',
                  status_bg: '#FEE2E2',
                }
              : it
          )
        );
        toast.success(`Request ${req.display_id} has been cancelled.`);
      } catch (err: any) {
        toast.error(err?.message || 'Could not cancel request. Please try again.');
      } finally {
        setCancellingSellId(null);
      }
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm(`Are you sure you want to cancel ${req.display_id} for ${req.brand} ${req.model}?`)) {
        doCancel();
      }
    } else {
      Alert.alert(
        'Cancel Sell Request',
        `Are you sure you want to cancel request ${req.display_id} for ${req.brand} ${req.model}?`,
        [
          { text: 'Keep Request', style: 'cancel' },
          { text: 'Yes, Cancel', style: 'destructive', onPress: doCancel },
        ]
      );
    }
  };

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    let result = orders;

    if (activeTab !== 'all') {
      result = result.filter((o) => o.status === activeTab);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          o.display_id.toLowerCase().includes(q) ||
          o.product_name.toLowerCase().includes(q) ||
          o.specs.toLowerCase().includes(q) ||
          (o.tracking_id && o.tracking_id.toLowerCase().includes(q))
      );
    }

    return result;
  }, [orders, activeTab, searchQuery]);

  // Filtered sell requests list
  const filteredSellRequests = useMemo(() => {
    let result = sellRequests;

    if (activeSellTab !== 'all') {
      result = result.filter((sr) => {
        if (activeSellTab === 'pending') return sr.status === 'pending' || sr.status === 'approved';
        if (activeSellTab === 'scheduled') return sr.status === 'scheduled' || sr.status === 'picked_up' || sr.status === 'inspected';
        if (activeSellTab === 'completed') return sr.status === 'completed';
        if (activeSellTab === 'cancelled') return sr.status === 'cancelled' || sr.status === 'rejected';
        return true;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (sr) =>
          sr.id.toLowerCase().includes(q) ||
          sr.display_id.toLowerCase().includes(q) ||
          sr.brand.toLowerCase().includes(q) ||
          sr.model.toLowerCase().includes(q) ||
          sr.category.toLowerCase().includes(q)
      );
    }

    return result;
  }, [sellRequests, activeSellTab, searchQuery]);

  // Currently tracked order or sell request
  const currentTrackOrder = useMemo(
    () => orders.find((o) => o.id === selectedOrderId),
    [orders, selectedOrderId]
  );
  const currentTrackSell = useMemo(
    () => sellRequests.find((s) => s.id === selectedSellId),
    [sellRequests, selectedSellId]
  );

  // -------------------------------------------------------------
  // VIEW 1: DEDICATED TRACK ORDER VIEW (Image 6 Style)
  // -------------------------------------------------------------
  if (selectedOrderId && currentTrackOrder) {
    const isShipped = currentTrackOrder.status === 'shipped';
    const isOutForDelivery = currentTrackOrder.status === 'out_for_delivery';
    const isDelivered = currentTrackOrder.status === 'delivered';

    return (
      <View style={styles.container}>
        {/* Top Header - Image 6: ← Track Order | Headset, Dots */}
        <HomeHeader
          mode="track-order"
          title="Track Order"
          onBack={handleBack}
          onSupport={() => setShowHelpModal(true)}
          onMenu={() => handleCopyId(currentTrackOrder.id, 'Order ID')}
        />

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.detailScrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={renewxColors.yellow}
              colors={['#FFC400', '#10B981']}
              progressBackgroundColor="#FFFFFF"
            />
          }
        >
          {/* Device Summary Card */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryThumbBox}>
              <Image source={currentTrackOrder.image} style={styles.summaryThumbImg} resizeMode="contain" />
            </View>
            <View style={styles.summaryInfoCol}>
              <View style={styles.summaryHeaderRow}>
                <Text style={styles.summaryOrderId}>{currentTrackOrder.display_id}</Text>
                <TouchableOpacity
                  onPress={() => handleCopyId(currentTrackOrder.id, 'Order ID')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="copy-outline" size={14} color="#64748B" />
                </TouchableOpacity>
              </View>
              <Text style={styles.summaryProductName} numberOfLines={1}>
                {currentTrackOrder.product_name}
              </Text>
              <Text style={styles.summarySpecs} numberOfLines={1}>
                {currentTrackOrder.specs}
              </Text>
              <View style={styles.summaryPriceRow}>
                <Text style={styles.summaryPrice}>
                  ₹{currentTrackOrder.price.toLocaleString('en-IN')}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: currentTrackOrder.status_bg }]}>
                  <Text style={[styles.statusBadgeText, { color: currentTrackOrder.status_color }]}>
                    {currentTrackOrder.status_label}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Live Delivery Status Banner */}
          <View style={styles.liveBannerCard}>
            <View style={styles.liveBannerLeft}>
              <View style={styles.livePill}>
                <View style={styles.pulsingDot} />
                <Text style={styles.livePillText}>LIVE TRACKING</Text>
              </View>
              <Text style={styles.liveStatusTitle}>
                {isDelivered
                  ? 'Delivered to your address'
                  : isOutForDelivery
                  ? 'Out for Delivery Today'
                  : isShipped
                  ? 'Package In Transit'
                  : 'Preparing Your Order'}
              </Text>
              <Text style={styles.liveStatusSubtitle}>
                {isDelivered
                  ? `Delivered on ${currentTrackOrder.estimated_delivery_date}`
                  : `Estimated delivery by ${currentTrackOrder.estimated_delivery_date}, ${currentTrackOrder.estimated_delivery_time}`}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.mapActionBtn}
              onPress={() => setShowMapModal(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="navigate-circle" size={24} color="#0F172A" />
              <Text style={styles.mapActionBtnText}>Live Map</Text>
            </TouchableOpacity>
          </View>

          {/* Clean Vertical Stepper Timeline (Zero horizontal collision!) */}
          <View style={styles.timelineSection}>
            <Text style={styles.sectionHeading}>Order Progress</Text>
            <View style={styles.verticalTimelineCard}>
              {currentTrackOrder.steps.map((step, idx) => {
                const isCompleted = step.status === 'completed';
                const isActive = step.status === 'active';
                const isLast = idx === currentTrackOrder.steps.length - 1;

                return (
                  <View key={step.label} style={styles.timelineRow}>
                    {/* Stepper Node Column */}
                    <View style={styles.stepperCol}>
                      <View
                        style={[
                          styles.timelineCircle,
                          isCompleted && styles.timelineCircleCompleted,
                          isActive && styles.timelineCircleActive,
                        ]}
                      >
                        {isCompleted ? (
                          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                        ) : isActive ? (
                          <Ionicons name="car" size={14} color="#0F172A" />
                        ) : (
                          <View style={styles.timelineCircleHollow} />
                        )}
                      </View>
                      {!isLast && (
                        <View
                          style={[
                            styles.timelineVerticalLine,
                            isCompleted ? styles.timelineLineDone : styles.timelineLinePending,
                          ]}
                        />
                      )}
                    </View>

                    {/* Stepper Text Details */}
                    <View style={[styles.timelineContent, !isLast && { paddingBottom: 22 }]}>
                      <View style={styles.timelineTitleRow}>
                        <Text
                          style={[
                            styles.timelineStepTitle,
                            (isCompleted || isActive) && styles.timelineStepTitleActive,
                          ]}
                        >
                          {step.label}
                        </Text>
                        <Text style={styles.timelineStepDate}>{step.date}</Text>
                      </View>
                      <Text style={styles.timelineStepDesc}>{step.description}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Delivery Courier Partner Card - Only rendered when partner is assigned */}
          {currentTrackOrder.delivery_partner && (
            <View style={styles.courierCard}>
              {currentTrackOrder.delivery_partner.avatar ? (
                <Image
                  source={{ uri: currentTrackOrder.delivery_partner.avatar }}
                  style={styles.courierAvatar}
                />
              ) : (
                <View style={[styles.courierAvatar, { backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }]}>
                  <Ionicons name="person" size={20} color="#64748B" />
                </View>
              )}
              <View style={styles.courierInfoCol}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={styles.courierName}>{currentTrackOrder.delivery_partner.name}</Text>
                  <Ionicons name="checkmark-circle" size={14} color="#059669" />
                </View>
                <Text style={styles.courierRole}>{currentTrackOrder.delivery_partner.role}</Text>
                {currentTrackOrder.tracking_id ? (
                  <Text style={styles.courierTrackingCode}>
                    Tracking ID: {currentTrackOrder.tracking_id}
                  </Text>
                ) : null}
              </View>
              {currentTrackOrder.delivery_partner.phone ? (
                <View style={styles.courierActionsRow}>
                  <TouchableOpacity
                    style={styles.courierCircleBtn}
                    onPress={() =>
                      handleCallPartner(
                        currentTrackOrder.delivery_partner!.phone,
                        currentTrackOrder.delivery_partner!.name
                      )
                    }
                  >
                    <Ionicons name="call" size={16} color="#0F172A" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.courierCircleBtn}
                    onPress={() => handleChatPartner(currentTrackOrder.delivery_partner!.name)}
                  >
                    <Ionicons name="chatbubble-ellipses" size={16} color="#0F172A" />
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          )}

          {/* Shipping Address Card - Only rendered when address exists */}
          {currentTrackOrder.delivery_address ? (
            <View style={styles.addressCard}>
              <View style={styles.addressHeaderRow}>
                <Ionicons name="location-sharp" size={18} color="#0F172A" />
                <Text style={styles.addressCardTitle}>Delivery Address</Text>
              </View>
              <Text style={styles.addressText}>{currentTrackOrder.delivery_address}</Text>
            </View>
          ) : null}

          {/* Action Buttons */}
          <View style={styles.bottomButtonsRow}>
            <TouchableOpacity
              style={styles.primaryActionButton}
              onPress={() =>
                navigation.navigate('OrderDetail', {
                  id: currentTrackOrder.id,
                  order: currentTrackOrder.raw_order || currentTrackOrder,
                })
              }
              activeOpacity={0.85}
            >
              <Ionicons name="document-text-outline" size={17} color="#0F172A" style={{ marginRight: 6 }} />
              <Text style={styles.primaryActionButtonText}>View Full Invoice</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryActionButton}
              onPress={() => setSelectedOrderId(null)}
              activeOpacity={0.85}
            >
              <Text style={styles.secondaryActionButtonText}>Back to All Orders</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Live Map Modal */}
        <Modal visible={showMapModal} animationType="slide" transparent>
          <View style={styles.modalBackdrop}>
            <View style={styles.mapModalSheet}>
              <View style={styles.mapModalHeader}>
                <View>
                  <Text style={styles.mapModalTitle}>Live Delivery Route</Text>
                  <Text style={styles.mapModalSubtitle}>
                    Courier: {currentTrackOrder.delivery_partner?.name || 'RenewX Logistics Partner'} · En route
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setShowMapModal(false)} style={styles.modalCloseBtn}>
                  <Ionicons name="close" size={20} color="#0F172A" />
                </TouchableOpacity>
              </View>

              <View style={styles.simulatedMapArea}>
                <View style={styles.mapRoadHorizontal} />
                <View style={styles.mapRoadVertical} />
                <View style={styles.mapRoadDiagonal} />

                <View style={styles.mapVanPin}>
                  <Ionicons name="car" size={16} color="#FFFFFF" />
                </View>

                <View style={styles.mapDestinationPin}>
                  <Ionicons name="home" size={14} color="#FFFFFF" />
                </View>

                <View style={styles.mapEtaCard}>
                  <Ionicons name="speedometer-outline" size={18} color="#0F172A" />
                  <View>
                    <Text style={styles.mapEtaTime}>ETA: ~18 mins</Text>
                    <Text style={styles.mapEtaDist}>2.4 km away from your location</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={styles.closeMapFullBtn}
                onPress={() => setShowMapModal(false)}
              >
                <Text style={styles.closeMapFullBtnText}>Close Map</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Support Help Modal */}
        <Modal visible={showHelpModal} animationType="fade" transparent>
          <View style={styles.modalBackdrop}>
            <View style={styles.helpModalSheet}>
              <View style={styles.mapModalHeader}>
                <Text style={styles.mapModalTitle}>RenewX Customer Support</Text>
                <TouchableOpacity onPress={() => setShowHelpModal(false)} style={styles.modalCloseBtn}>
                  <Ionicons name="close" size={20} color="#0F172A" />
                </TouchableOpacity>
              </View>
              <Text style={styles.helpModalDesc}>
                Need assistance with Order {currentTrackOrder.display_id}? Our priority support team is available 24/7.
              </Text>
              <TouchableOpacity
                style={styles.helpOptionBtn}
                onPress={() => handleCallPartner('+919080168778', 'RenewX Support')}
              >
                <Ionicons name="call-outline" size={20} color="#0F172A" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.helpOptionTitle}>Call Support Hotline</Text>
                  <Text style={styles.helpOptionSub}>+91 90801 68778 (Instant response)</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // -------------------------------------------------------------
  // VIEW 2: DEDICATED TRACK SELL REQUEST VIEW
  // -------------------------------------------------------------
  if (selectedSellId && currentTrackSell) {
    return (
      <View style={styles.container}>
        <HomeHeader
          mode="track-order"
          title="Track Sell Request"
          onBack={handleBack}
          onSupport={() => handleCallPartner('+919080168778', 'RenewX Valuation Support')}
          onMenu={() => handleCopyId(currentTrackSell.id, 'Sell Request ID')}
        />

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.detailScrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={renewxColors.yellow}
              colors={['#FFC400', '#10B981']}
              progressBackgroundColor="#FFFFFF"
            />
          }
        >
          {/* Device Summary Card */}
          <View style={styles.summaryCard}>
            <View style={[styles.summaryThumbBox, { backgroundColor: '#F8FAFC' }]}>
              <Ionicons name={getCategoryIcon(currentTrackSell.category)} size={32} color="#0F172A" />
            </View>
            <View style={styles.summaryInfoCol}>
              <View style={styles.summaryHeaderRow}>
                <Text style={styles.summaryOrderId}>{currentTrackSell.display_id}</Text>
                <TouchableOpacity
                  onPress={() => handleCopyId(currentTrackSell.id, 'Sell Request ID')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="copy-outline" size={14} color="#64748B" />
                </TouchableOpacity>
              </View>
              <Text style={styles.summaryProductName} numberOfLines={1}>
                {currentTrackSell.brand} {currentTrackSell.model}
              </Text>
              <Text style={styles.summarySpecs} numberOfLines={1}>
                {currentTrackSell.storage} • {currentTrackSell.category}
              </Text>
              <View style={styles.summaryPriceRow}>
                <Text style={[styles.summaryPrice, { color: '#059669' }]}>
                  ₹{currentTrackSell.valuation_amount.toLocaleString('en-IN')}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: currentTrackSell.status_bg }]}>
                  <Text style={[styles.statusBadgeText, { color: currentTrackSell.status_color }]}>
                    {currentTrackSell.status_label}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Timeline Section */}
          <View style={styles.timelineSection}>
            <Text style={styles.sectionHeading}>Evaluation & Payout Steps</Text>
            <View style={styles.verticalTimelineCard}>
              {currentTrackSell.steps.map((step, idx) => {
                const isCompleted = step.status === 'completed';
                const isActive = step.status === 'active';
                const isLast = idx === currentTrackSell.steps.length - 1;

                return (
                  <View key={step.label} style={styles.timelineRow}>
                    <View style={styles.stepperCol}>
                      <View
                        style={[
                          styles.timelineCircle,
                          isCompleted && styles.timelineCircleCompleted,
                          isActive && styles.timelineCircleActive,
                        ]}
                      >
                        {isCompleted ? (
                          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                        ) : isActive ? (
                          <Ionicons name="repeat" size={14} color="#0F172A" />
                        ) : (
                          <View style={styles.timelineCircleHollow} />
                        )}
                      </View>
                      {!isLast && (
                        <View
                          style={[
                            styles.timelineVerticalLine,
                            isCompleted ? styles.timelineLineDone : styles.timelineLinePending,
                          ]}
                        />
                      )}
                    </View>

                    <View style={[styles.timelineContent, !isLast && { paddingBottom: 22 }]}>
                      <View style={styles.timelineTitleRow}>
                        <Text
                          style={[
                            styles.timelineStepTitle,
                            (isCompleted || isActive) && styles.timelineStepTitleActive,
                          ]}
                        >
                          {step.label}
                        </Text>
                        <Text style={styles.timelineStepDate}>{step.date}</Text>
                      </View>
                      <Text style={styles.timelineStepDesc}>{step.description}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Pickup Partner Card */}
          {currentTrackSell.pickup_partner && (
            <View style={styles.courierCard}>
              <Image
                source={{ uri: currentTrackSell.pickup_partner.avatar }}
                style={styles.courierAvatar}
              />
              <View style={styles.courierInfoCol}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={styles.courierName}>{currentTrackSell.pickup_partner.name}</Text>
                  <Ionicons name="shield-checkmark" size={14} color="#059669" />
                </View>
                <Text style={styles.courierRole}>{currentTrackSell.pickup_partner.role}</Text>
                <Text style={styles.courierTrackingCode}>
                  Doorstep Inspection & Instant Cash Payout
                </Text>
              </View>
              <View style={styles.courierActionsRow}>
                <TouchableOpacity
                  style={styles.courierCircleBtn}
                  onPress={() =>
                    handleCallPartner(
                      currentTrackSell.pickup_partner!.phone,
                      currentTrackSell.pickup_partner!.name
                    )
                  }
                >
                  <Ionicons name="call" size={16} color="#0F172A" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Address Card - Only rendered when customer address is provided */}
          {currentTrackSell.customer_address ? (
            <View style={styles.addressCard}>
              <View style={styles.addressHeaderRow}>
                <Ionicons name="home-sharp" size={18} color="#0F172A" />
                <Text style={styles.addressCardTitle}>Inspection & Pickup Address</Text>
              </View>
              <Text style={styles.addressText}>{currentTrackSell.customer_address}</Text>
              {currentTrackSell.pincode ? (
                <Text style={[styles.addressText, { marginTop: 4, color: '#64748B' }]}>
                  Pincode: {currentTrackSell.pincode}
                </Text>
              ) : null}
            </View>
          ) : null}

          {/* Bottom Actions */}
          <View style={styles.bottomButtonsRow}>
            {currentTrackSell.status === 'pending' && (
              <TouchableOpacity
                style={[styles.primaryActionButton, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}
                onPress={() => handleCancelSellRequest(currentTrackSell)}
                disabled={cancellingSellId === currentTrackSell.id}
                activeOpacity={0.85}
              >
                <Ionicons name="close-circle-outline" size={17} color="#DC2626" style={{ marginRight: 6 }} />
                <Text style={[styles.primaryActionButtonText, { color: '#DC2626' }]}>
                  {cancellingSellId === currentTrackSell.id ? 'Cancelling...' : 'Cancel Sell Request'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.secondaryActionButton}
              onPress={() => setSelectedSellId(null)}
              activeOpacity={0.85}
            >
              <Text style={styles.secondaryActionButtonText}>Back to All Requests</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // -------------------------------------------------------------
  // VIEW 3: MAIN LISTING VIEW (Image 5 Style: Clean Cards, No Collisions)
  // -------------------------------------------------------------
  return (
    <View style={styles.container}>
      {/* 1. TOP BAR (Image 5: ← My Orders | Filter funnel on right) */}
      <HomeHeader
        mode="orders"
        title={trackType === 'orders' ? 'My Orders' : 'My Sell Requests'}
        onBack={handleBack}
        onFilterPress={() => {
          filterScrollRef.current?.scrollTo({ x: 0, animated: true });
        }}
      />

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.listScrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={renewxColors.yellow}
            colors={['#FFC400', '#10B981']}
            progressBackgroundColor="#FFFFFF"
          />
        }
      >
        {/* 2. SEGMENTED CAPSULE SWITCHER (Orders vs Sell Requests) */}
        <View style={styles.segmentedContainer}>
          <TouchableOpacity
            style={[
              styles.segmentedTab,
              trackType === 'orders' && styles.segmentedTabActive,
            ]}
            onPress={() => {
              setTrackType('orders');
              setActiveTab('all');
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name="cube"
              size={15}
              color={trackType === 'orders' ? '#0F172A' : '#64748B'}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.segmentedTabText,
                trackType === 'orders' && styles.segmentedTabTextActive,
              ]}
            >
              Orders ({orders.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentedTab,
              trackType === 'sell_requests' && styles.segmentedTabActive,
            ]}
            onPress={() => {
              setTrackType('sell_requests');
              setActiveSellTab('all');
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name="repeat"
              size={15}
              color={trackType === 'sell_requests' ? '#0F172A' : '#64748B'}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.segmentedTabText,
                trackType === 'sell_requests' && styles.segmentedTabTextActive,
              ]}
            >
              Sell Requests ({sellRequests.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* 3. CLEAN SEARCH BAR */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={18} color="#64748B" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={
              trackType === 'orders'
                ? 'Search by Order ID or device...'
                : 'Search by Request ID, brand or model...'
            }
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* 4. HORIZONTAL STATUS FILTER CHIPS */}
        <View style={styles.filterWrapper}>
          <ScrollView
            ref={filterScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {(trackType === 'orders' ? ORDER_FILTER_TABS : SELL_FILTER_TABS).map((tab) => {
              const isActive = (trackType === 'orders' ? activeTab : activeSellTab) === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => (trackType === 'orders' ? setActiveTab(tab.id) : setActiveSellTab(tab.id))}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* 5. CARDS LISTING (ELEGANT, NON-COLLIDING CARDS) */}
        {trackType === 'orders' ? (
          filteredOrders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="cube-outline" size={36} color="#94A3B8" />
              </View>
              <Text style={styles.emptyTitle}>No Orders Found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? `No orders matching "${searchQuery}".`
                  : 'You have not placed any orders matching this filter.'}
              </Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => {
                  setActiveTab('all');
                  setSearchQuery('');
                }}
              >
                <Text style={styles.emptyBtnText}>View All Orders</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredOrders.map((order) => {
              return (
                <View key={order.id} style={styles.orderCard}>
                  {/* Card Header Row: Short ID, Date & Status Badge */}
                  <View style={styles.orderCardHeader}>
                    <View style={styles.orderCardIdGroup}>
                      <Text style={styles.orderCardId}>{order.display_id}</Text>
                      <TouchableOpacity
                        onPress={() => handleCopyId(order.id, 'Order ID')}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Ionicons name="copy-outline" size={13} color="#94A3B8" />
                      </TouchableOpacity>
                      <Text style={styles.orderCardDot}>•</Text>
                      <Text style={styles.orderCardDate}>{order.placed_date}</Text>
                    </View>

                    <View style={[styles.statusBadge, { backgroundColor: order.status_bg }]}>
                      <Text style={[styles.statusBadgeText, { color: order.status_color }]}>
                        {order.status_label}
                      </Text>
                    </View>
                  </View>

                  {/* Card Body: Thumbnail, Name, Specs, Price */}
                  <View style={styles.orderCardBody}>
                    <View style={styles.orderThumbnailBox}>
                      <Image source={order.image} style={styles.orderThumbnailImg} resizeMode="contain" />
                    </View>
                    <View style={styles.orderCardInfo}>
                      <Text style={styles.orderCardTitle} numberOfLines={1}>
                        {order.product_name}
                      </Text>
                      <Text style={styles.orderCardSpecs} numberOfLines={1}>
                        {order.specs}
                      </Text>
                      <Text style={styles.orderCardPrice}>
                        ₹{order.price.toLocaleString('en-IN')}
                      </Text>
                    </View>
                  </View>

                  {/* Card Actions: Primary Track Button + Secondary Details Button */}
                  <View style={styles.orderCardActions}>
                    <TouchableOpacity
                      style={styles.trackOrderBtn}
                      onPress={() => setSelectedOrderId(order.id)}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="car-outline" size={16} color="#0F172A" style={{ marginRight: 6 }} />
                      <Text style={styles.trackOrderBtnText}>Track Order</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.detailsBtn}
                      onPress={() =>
                        navigation.navigate('OrderDetail', {
                          id: order.id,
                          order: order.raw_order || order,
                        })
                      }
                      activeOpacity={0.85}
                    >
                      <Ionicons name="document-text-outline" size={15} color="#0F172A" style={{ marginRight: 4 }} />
                      <Text style={styles.detailsBtnText}>Details</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )
        ) : (
          filteredSellRequests.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="repeat-outline" size={36} color="#94A3B8" />
              </View>
              <Text style={styles.emptyTitle}>No Sell Requests Found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? `No requests matching "${searchQuery}".`
                  : 'You have not submitted any device sell requests.'}
              </Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => (navigation as any).navigate('Sell')}
              >
                <Ionicons name="add-circle" size={16} color="#0F172A" style={{ marginRight: 6 }} />
                <Text style={styles.emptyBtnText}>Sell a Device for Instant Cash</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredSellRequests.map((req) => {
              return (
                <View key={req.id} style={styles.orderCard}>
                  {/* Card Header Row */}
                  <View style={styles.orderCardHeader}>
                    <View style={styles.orderCardIdGroup}>
                      <Text style={styles.orderCardId}>{req.display_id}</Text>
                      <TouchableOpacity
                        onPress={() => handleCopyId(req.id, 'Sell Request ID')}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Ionicons name="copy-outline" size={13} color="#94A3B8" />
                      </TouchableOpacity>
                      <Text style={styles.orderCardDot}>•</Text>
                      <Text style={styles.orderCardDate}>{req.created_at}</Text>
                    </View>

                    <View style={[styles.statusBadge, { backgroundColor: req.status_bg }]}>
                      <Text style={[styles.statusBadgeText, { color: req.status_color }]}>
                        {req.status_label}
                      </Text>
                    </View>
                  </View>

                  {/* Card Body */}
                  <View style={styles.orderCardBody}>
                    <View style={[styles.orderThumbnailBox, { backgroundColor: '#F8FAFC' }]}>
                      <Ionicons name={getCategoryIcon(req.category)} size={28} color="#0F172A" />
                    </View>
                    <View style={styles.orderCardInfo}>
                      <Text style={styles.orderCardTitle} numberOfLines={1}>
                        {req.brand} {req.model}
                      </Text>
                      <Text style={styles.orderCardSpecs} numberOfLines={1}>
                        {req.storage} • {req.category}
                      </Text>
                      <Text style={[styles.orderCardPrice, { color: '#059669' }]}>
                        ₹{req.valuation_amount.toLocaleString('en-IN')} (Instant Cash)
                      </Text>
                    </View>
                  </View>

                  {/* Card Actions */}
                  <View style={styles.orderCardActions}>
                    <TouchableOpacity
                      style={styles.trackOrderBtn}
                      onPress={() => setSelectedSellId(req.id)}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="navigate-outline" size={16} color="#0F172A" style={{ marginRight: 6 }} />
                      <Text style={styles.trackOrderBtnText}>Track Status</Text>
                    </TouchableOpacity>

                    {req.status === 'pending' && (
                      <TouchableOpacity
                        style={[styles.detailsBtn, { borderColor: '#FECACA', backgroundColor: '#FEF2F2' }]}
                        onPress={() => handleCancelSellRequest(req)}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="close-circle-outline" size={15} color="#DC2626" style={{ marginRight: 4 }} />
                        <Text style={[styles.detailsBtnText, { color: '#DC2626' }]}>Cancel</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollArea: {
    flex: 1,
  },
  listScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 120, // generous bottom padding so nothing touches the bottom bar
  },
  detailScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 120,
  },

  // Segmented Capsule Switcher
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: '#EDF2F7',
    borderRadius: 24,
    padding: 3,
    marginBottom: 12,
  },
  segmentedTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 22,
  },
  segmentedTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentedTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    fontFamily: renewxFontFamily.regular,
  },
  segmentedTabTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },

  // Search Bar
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    fontFamily: renewxFontFamily.regular,
    paddingVertical: 0,
  },

  // Filter Chips
  filterWrapper: {
    marginBottom: 14,
  },
  filterScroll: {
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#FDE047',
    borderColor: '#FACC15',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    fontFamily: renewxFontFamily.regular,
  },
  filterChipTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },

  // Order Card (Clean, modern card)
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  orderCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 12,
  },
  orderCardIdGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orderCardId: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: renewxFontFamily.bold,
  },
  orderCardDot: {
    fontSize: 12,
    color: '#CBD5E1',
  },
  orderCardDate: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: renewxFontFamily.regular,
  },
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: renewxFontFamily.regular,
  },
  orderCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderThumbnailBox: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  orderThumbnailImg: {
    width: 48,
    height: 48,
  },
  orderCardInfo: {
    flex: 1,
  },
  orderCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: renewxFontFamily.bold,
    marginBottom: 2,
  },
  orderCardSpecs: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: renewxFontFamily.regular,
    marginBottom: 4,
  },
  orderCardPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: renewxFontFamily.bold,
  },
  orderCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  trackOrderBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FDE047',
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#FACC15',
  },
  trackOrderBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: renewxFontFamily.bold,
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailsBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    fontFamily: renewxFontFamily.regular,
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 32,
    marginTop: 20,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
    fontFamily: renewxFontFamily.bold,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 18,
    lineHeight: 18,
    fontFamily: renewxFontFamily.regular,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDE047',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emptyBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: renewxFontFamily.bold,
  },

  // -------------------------------------------------------------
  // DEDICATED TRACK VIEW STYLES
  // -------------------------------------------------------------
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 12,
  },
  summaryThumbBox: {
    width: 68,
    height: 68,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  summaryThumbImg: {
    width: 52,
    height: 52,
  },
  summaryInfoCol: {
    flex: 1,
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  summaryOrderId: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    fontFamily: renewxFontFamily.regular,
  },
  summaryProductName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: renewxFontFamily.bold,
    marginBottom: 2,
  },
  summarySpecs: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: renewxFontFamily.regular,
    marginBottom: 6,
  },
  summaryPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: renewxFontFamily.bold,
  },

  // Live Banner
  liveBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF9C3',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FEF08A',
    padding: 14,
    marginBottom: 16,
  },
  liveBannerLeft: {
    flex: 1,
    paddingRight: 10,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FACC15',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 6,
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#DC2626',
    marginRight: 5,
  },
  livePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  liveStatusTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: renewxFontFamily.bold,
    marginBottom: 2,
  },
  liveStatusSubtitle: {
    fontSize: 12,
    color: '#713F12',
    lineHeight: 16,
    fontFamily: renewxFontFamily.regular,
  },
  mapActionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#FDE047',
  },
  mapActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },

  // Vertical Stepper Timeline
  timelineSection: {
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: renewxFontFamily.bold,
    marginBottom: 10,
  },
  verticalTimelineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
  },
  timelineRow: {
    flexDirection: 'row',
  },
  stepperCol: {
    alignItems: 'center',
    width: 28,
    marginRight: 12,
  },
  timelineCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineCircleCompleted: {
    backgroundColor: '#16A34A',
  },
  timelineCircleActive: {
    backgroundColor: '#FACC15',
    borderWidth: 2,
    borderColor: '#0F172A',
  },
  timelineCircleHollow: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#94A3B8',
  },
  timelineVerticalLine: {
    width: 2,
    flex: 1,
    marginVertical: 4,
  },
  timelineLineDone: {
    backgroundColor: '#16A34A',
  },
  timelineLinePending: {
    backgroundColor: '#E2E8F0',
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  timelineStepTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    fontFamily: renewxFontFamily.bold,
  },
  timelineStepTitleActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  timelineStepDate: {
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: renewxFontFamily.regular,
  },
  timelineStepDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    fontFamily: renewxFontFamily.regular,
  },

  // Courier Card
  courierCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 12,
  },
  courierAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  courierInfoCol: {
    flex: 1,
  },
  courierName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: renewxFontFamily.bold,
  },
  courierRole: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: renewxFontFamily.regular,
  },
  courierTrackingCode: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
    fontFamily: renewxFontFamily.regular,
  },
  courierActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  courierCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FDE047',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Address Card
  addressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 16,
  },
  addressHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  addressCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: renewxFontFamily.bold,
  },
  addressText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
    fontFamily: renewxFontFamily.regular,
  },

  // Bottom Buttons in Tracking Detail View
  bottomButtonsRow: {
    gap: 10,
    marginBottom: 20,
  },
  primaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FDE047',
    borderRadius: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: '#FACC15',
  },
  primaryActionButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: renewxFontFamily.bold,
  },
  secondaryActionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  secondaryActionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    fontFamily: renewxFontFamily.regular,
  },

  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  mapModalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  helpModalSheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 80,
  },
  mapModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  mapModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: renewxFontFamily.bold,
  },
  mapModalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontFamily: renewxFontFamily.regular,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  simulatedMapArea: {
    height: 240,
    backgroundColor: '#E2E8F0',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 16,
  },
  mapRoadHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '48%',
    height: 14,
    backgroundColor: '#CBD5E1',
  },
  mapRoadVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '52%',
    width: 14,
    backgroundColor: '#CBD5E1',
  },
  mapRoadDiagonal: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    bottom: 20,
    borderWidth: 3,
    borderColor: '#94A3B8',
    borderRadius: 40,
    borderStyle: 'dashed',
  },
  mapVanPin: {
    position: 'absolute',
    top: '40%',
    left: '46%',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  mapDestinationPin: {
    position: 'absolute',
    top: '25%',
    right: '25%',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapEtaCard: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mapEtaTime: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  mapEtaDist: {
    fontSize: 11,
    color: '#64748B',
  },
  closeMapFullBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeMapFullBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  helpModalDesc: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 16,
  },
  helpOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  helpOptionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  helpOptionSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
});
