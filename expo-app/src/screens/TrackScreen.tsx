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
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { useSafeHeaderTop } from '@/lib/useSafeHeaderTop';
import RenewXLogo from '@/components/RenewXLogo';
import ShimmerText from '@/components/ShimmerText';
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
  date: string;
  status: 'completed' | 'active' | 'pending';
}

interface OrderItem {
  id: string;
  product_name: string;
  specs: string;
  price: number;
  qty: number;
  placed_date: string;
  status: 'processing' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled';
  status_label: string;
  status_color: string;
  image: any;
  tracking_id?: string;
  delivery_partner: {
    name: string;
    role: string;
    phone: string;
    avatar?: string;
  };
  live_banner?: {
    title: string;
    subtitle: string;
  };
  delivery_address: string;
  estimated_delivery_date: string;
  estimated_delivery_time: string;
  steps: TrackingStep[];
}

export interface SellRequestItem {
  id: string;
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
  live_banner: {
    title: string;
    subtitle: string;
  };
  pickup_partner?: {
    name: string;
    role: string;
    phone: string;
    avatar?: string;
  };
}

const FILTER_TABS = [
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
  { id: 'completed', label: 'Completed & Paid' },
  { id: 'cancelled', label: 'Cancelled' },
];

function getCategoryIcon(cat?: string): keyof typeof Ionicons.glyphMap {
  const c = String(cat || '').toLowerCase();
  if (c.includes('laptop') || c.includes('macbook')) return 'laptop-outline';
  if (c.includes('tablet') || c.includes('ipad')) return 'tablet-portrait-outline';
  if (c.includes('watch')) return 'watch-outline';
  return 'phone-portrait-outline';
}

export default function TrackScreen() {
  const safeTop = useSafeHeaderTop();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<any>();
  const toast = useToast();
  const filterScrollRef = useRef<ScrollView>(null);

  const initialType = route.params?.type === 'sell_requests' ? 'sell_requests' : 'orders';
  const [trackType, setTrackType] = useState<'orders' | 'sell_requests'>(initialType);

  const [activeTab, setActiveTab] = useState('all');
  const [activeSellTab, setActiveSellTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [expandedSellId, setExpandedSellId] = useState<string | null>(route.params?.id || null);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [sellRequests, setSellRequests] = useState<SellRequestItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingSellId, setCancellingSellId] = useState<string | null>(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Sync route params when navigating with specific type or id
  useEffect(() => {
    if (route.params?.type) {
      setTrackType(route.params.type);
    }
    if (route.params?.id) {
      if (route.params.type === 'sell_requests') {
        setExpandedSellId(route.params.id);
      } else {
        setExpandedOrderId(route.params.id);
      }
    }
  }, [route.params]);

  // Fetch real orders and real sell requests from database
  const fetchData = useCallback(async () => {
    try {
      const [orderRes, sellRes] = await Promise.allSettled([
        api.orders.getAll(),
        api.tradeIn.getMyRequests(),
      ]);

      if (orderRes.status === 'fulfilled' && Array.isArray(orderRes.value) && orderRes.value.length > 0) {
        const mapped: OrderItem[] = orderRes.value.map((o: any, idx: number) => {
          const rawStatus = String(o.status || 'processing').toLowerCase();
          const items = o.order_items || o.items || [];
          const firstItem = items[0] || {};
          const status = (rawStatus === 'delivered'
            ? 'delivered'
            : rawStatus === 'out_for_delivery'
            ? 'out_for_delivery'
            : rawStatus === 'shipped'
            ? 'shipped'
            : 'processing') as OrderItem['status'];

          const status_label =
            status === 'out_for_delivery'
              ? 'Out for Delivery'
              : status.charAt(0).toUpperCase() + status.slice(1);

          const status_color =
            status === 'delivered' || status === 'out_for_delivery'
              ? '#16A34A'
              : status === 'shipped'
              ? '#2563EB'
              : '#F59E0B';

          return {
            id: o.id || o.order_id || `RX12345${idx + 7}`,
            product_name:
              firstItem.product_name || firstItem.name || o.product_name || 'Certified Device',
            specs: firstItem.specs || `${firstItem.storage || '128 GB'} · Pristine Condition`,
            price: Number(o.total_amount || o.total || o.amount || 45000),
            qty: items.length || 1,
            placed_date: o.created_at
              ? `Placed on ${new Date(o.created_at).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}`
              : 'Placed on 12 Sep 2026, 10:30 AM',
            status,
            status_label,
            status_color,
            image: firstItem.image
              ? { uri: firstItem.image }
              : require('@/assets/categories/smartphone.png'),
            tracking_id: o.tracking_number || `BD${String(o.id || '12345678').slice(-8)}IN`,
            delivery_partner: {
              name: 'Ramesh K',
              role: 'Delivery Partner',
              phone: '+91 98401 23456',
              avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
            },
            live_banner: {
              title:
                status === 'out_for_delivery'
                  ? 'Your order is out for delivery'
                  : status === 'shipped'
                  ? 'Your package is in transit'
                  : 'Order is being processed',
              subtitle:
                status === 'out_for_delivery'
                  ? 'Our delivery partner is on the way to your address.'
                  : 'Arriving soon at your doorstep.',
            },
            delivery_address:
              o.shipping_address ||
              '123, Anna Nagar Main Road,\nChennai, Tamil Nadu - 600040',
            estimated_delivery_date: '14 Sep 2026',
            estimated_delivery_time: 'by 6:00 PM',
            steps: [
              { label: 'Order Placed', date: '12 Sep, 10:30 AM', status: 'completed' },
              {
                label: 'Processing',
                date: '12 Sep, 02:15 PM',
                status: status === 'processing' ? 'active' : 'completed',
              },
              {
                label: 'Shipped',
                date: status === 'processing' ? 'Expected 13 Sep' : '13 Sep, 09:20 AM',
                status:
                  status === 'shipped'
                    ? 'active'
                    : status === 'out_for_delivery' || status === 'delivered'
                    ? 'completed'
                    : 'pending',
              },
              {
                label: 'Out for Delivery',
                date: status === 'out_for_delivery' ? '14 Sep, 10:05 AM' : '—',
                status:
                  status === 'out_for_delivery'
                    ? 'active'
                    : status === 'delivered'
                    ? 'completed'
                    : 'pending',
              },
              {
                label: 'Delivered',
                date: status === 'delivered' ? '14 Sep, 06:00 PM' : '—',
                status: status === 'delivered' ? 'completed' : 'pending',
              },
            ],
          };
        });

        setOrders(mapped);
        if (mapped.length > 0) {
          setExpandedOrderId((prev) => prev || mapped[0].id);
        }
      } else {
        setOrders([]);
      }

      if (sellRes.status === 'fulfilled' && Array.isArray(sellRes.value)) {
        const mappedSell: SellRequestItem[] = sellRes.value.map((sr: any) => {
          const rawStatus = String(sr.status || 'pending').toLowerCase();
          const id = String(sr.id || sr._id || `SR${Date.now()}`);
          const valuation = Number(sr.valuation_amount || sr.expected_price || 0);

          let status_label = 'Under Review';
          let status_color = '#D97706';
          let status_bg = '#FEF3C7';

          if (rawStatus === 'approved') {
            status_label = 'Approved';
            status_color = '#059669';
            status_bg = '#ECFDF5';
          } else if (rawStatus === 'scheduled') {
            status_label = 'Pickup Scheduled';
            status_color = '#2563EB';
            status_bg = '#EFF6FF';
          } else if (rawStatus === 'picked_up') {
            status_label = 'Picked Up';
            status_color = '#7C3AED';
            status_bg = '#F5F3FF';
          } else if (rawStatus === 'inspected') {
            status_label = 'Inspection Passed';
            status_color = '#7C3AED';
            status_bg = '#F5F3FF';
          } else if (rawStatus === 'completed') {
            status_label = 'Completed & Paid';
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
              date: createdDateStr,
              status: 'completed',
            },
            {
              label: 'Technical Valuation',
              date: rawStatus === 'pending' ? 'In Progress' : 'Verified',
              status: rawStatus === 'pending' ? 'active' : 'completed',
            },
            {
              label: 'Doorstep Pickup',
              date:
                rawStatus === 'scheduled'
                  ? 'Scheduled'
                  : rawStatus === 'picked_up' || rawStatus === 'inspected' || rawStatus === 'completed'
                  ? 'Picked Up'
                  : 'Pending',
              status:
                rawStatus === 'scheduled'
                  ? 'active'
                  : rawStatus === 'picked_up' || rawStatus === 'inspected' || rawStatus === 'completed'
                  ? 'completed'
                  : 'pending',
            },
            {
              label: 'Device Inspection',
              date:
                rawStatus === 'inspected' || rawStatus === 'completed'
                  ? 'Passed'
                  : rawStatus === 'picked_up'
                  ? 'In Progress'
                  : 'Pending',
              status:
                rawStatus === 'picked_up'
                  ? 'active'
                  : rawStatus === 'inspected' || rawStatus === 'completed'
                  ? 'completed'
                  : 'pending',
            },
            {
              label: 'Payment Sent',
              date: rawStatus === 'completed' ? 'Transferred' : 'Pending',
              status: rawStatus === 'completed' ? 'completed' : 'pending',
            },
          ];

          let bannerTitle = 'Device Under Review';
          let bannerSubtitle = 'Our team is verifying specifications to confirm final valuation.';
          if (rawStatus === 'approved') {
            bannerTitle = 'Valuation Approved';
            bannerSubtitle = `Quote of ₹${valuation.toLocaleString('en-IN')} approved! Pickup agent will be assigned shortly.`;
          } else if (rawStatus === 'scheduled') {
            bannerTitle = 'Pickup Executive Assigned';
            bannerSubtitle = 'Executive will visit your location to inspect device and initiate instant payout.';
          } else if (rawStatus === 'picked_up') {
            bannerTitle = 'Device in Transit';
            bannerSubtitle = 'Device collected from your doorstep. Heading to technical inspection center.';
          } else if (rawStatus === 'inspected') {
            bannerTitle = 'Inspection Verified';
            bannerSubtitle = 'Quality checks completed. Payment transfer is in progress.';
          } else if (rawStatus === 'completed') {
            bannerTitle = 'Payment Successfully Transferred';
            bannerSubtitle = `₹${valuation.toLocaleString('en-IN')} has been sent to your registered account via Instant UPI / IMPS.`;
          } else if (rawStatus === 'cancelled' || rawStatus === 'rejected') {
            bannerTitle = 'Request Closed';
            bannerSubtitle = 'This trade-in request has been closed or cancelled.';
          }

          return {
            id,
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
            customer_address: sr.address || 'Customer Registered Address',
            pincode: sr.pincode || '',
            photos: Array.isArray(sr.photos) ? sr.photos : [],
            steps,
            live_banner: {
              title: bannerTitle,
              subtitle: bannerSubtitle,
            },
            pickup_partner: {
              name: 'Arun Kumar',
              role: 'RenewX Inspection Specialist',
              phone: '+91 98401 98765',
              avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
            },
          };
        });

        setSellRequests(mappedSell);
        if (mappedSell.length > 0) {
          setExpandedSellId((prev) => prev || mappedSell[0].id);
        }
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
      toast.success(`Copied ${label} #${id.slice(-8).toUpperCase()} to clipboard!`);
    } catch {
      toast.info(`ID: ${id}`);
    }
  };

  const handleCancelSellRequest = (req: SellRequestItem) => {
    const doCancel = async () => {
      try {
        setCancellingSellId(req.id);
        await api.tradeIn.cancel(req.id, 'Cancelled by user');
        setSellRequests((prev) =>
          prev.map((it) =>
            it.id === req.id
              ? {
                  ...it,
                  status: 'cancelled' as const,
                  status_label: 'Cancelled',
                  status_color: '#DC2626',
                  status_bg: '#FEE2E2',
                }
              : it
          )
        );
        toast.success(`Sell request #${req.id.slice(-8).toUpperCase()} has been cancelled.`, 'Request Cancelled');
      } catch (err: any) {
        toast.error(err?.message || 'Could not cancel request. Please try again.');
      } finally {
        setCancellingSellId(null);
      }
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm(`Are you sure you want to cancel sell request #${req.id.slice(-8).toUpperCase()} for ${req.brand} ${req.model}?`)) {
        doCancel();
      }
    } else {
      Alert.alert(
        'Cancel Sell Request',
        `Are you sure you want to cancel sell request #${req.id.slice(-8).toUpperCase()} for ${req.brand} ${req.model}?`,
        [
          { text: 'Keep Request', style: 'cancel' },
          { text: 'Yes, Cancel', style: 'destructive', onPress: doCancel },
        ]
      );
    }
  };

  const handleTrackSearch = () => {
    if (!searchQuery.trim()) {
      toast.info('Enter an Order ID or Sell Request ID to track');
      return;
    }
    const query = searchQuery.trim().toLowerCase();

    // 1. Search in Sell Requests
    const sellMatch = sellRequests.find(
      (sr) =>
        sr.id.toLowerCase().includes(query) ||
        sr.brand.toLowerCase().includes(query) ||
        sr.model.toLowerCase().includes(query) ||
        sr.customer_phone.includes(query) ||
        `sell-${sr.id}`.toLowerCase().includes(query)
    );

    // 2. Search in Orders
    const orderMatch = orders.find(
      (o) =>
        o.id.toLowerCase().includes(query) ||
        o.product_name.toLowerCase().includes(query) ||
        o.delivery_partner.phone.includes(query) ||
        (o.tracking_id && o.tracking_id.toLowerCase().includes(query))
    );

    if (sellMatch && !orderMatch) {
      setTrackType('sell_requests');
      setExpandedSellId(sellMatch.id);
      toast.success(`Found Sell Request #${sellMatch.id.slice(-8).toUpperCase()}!`, `${sellMatch.brand} ${sellMatch.model}`);
    } else if (orderMatch && !sellMatch) {
      setTrackType('orders');
      setExpandedOrderId(orderMatch.id);
      toast.success(`Found Order #${orderMatch.id}!`, orderMatch.product_name);
    } else if (sellMatch && orderMatch) {
      if (trackType === 'sell_requests') {
        setExpandedSellId(sellMatch.id);
        toast.success(`Found Sell Request #${sellMatch.id.slice(-8).toUpperCase()}!`, `${sellMatch.brand} ${sellMatch.model}`);
      } else {
        setExpandedOrderId(orderMatch.id);
        toast.success(`Found Order #${orderMatch.id}!`, orderMatch.product_name);
      }
    } else {
      toast.info(`No matching Order or Sell Request found for "${searchQuery}"`);
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

  const toggleOrderExpand = (orderId: string) => {
    setExpandedOrderId((prev) => (prev === orderId ? null : orderId));
  };

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    let result = orders;

    if (activeTab !== 'all') {
      result = result.filter((o) => {
        if (activeTab === 'processing') return o.status === 'processing';
        if (activeTab === 'shipped') return o.status === 'shipped';
        if (activeTab === 'out_for_delivery') return o.status === 'out_for_delivery';
        if (activeTab === 'delivered') return o.status === 'delivered';
        return true;
      });
    }

    if (searchQuery.trim() && trackType === 'orders') {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          o.product_name.toLowerCase().includes(q) ||
          o.specs.toLowerCase().includes(q) ||
          o.delivery_partner.phone.includes(q)
      );
    }

    return result;
  }, [orders, activeTab, searchQuery, trackType]);

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

    if (searchQuery.trim() && trackType === 'sell_requests') {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (sr) =>
          sr.id.toLowerCase().includes(q) ||
          sr.brand.toLowerCase().includes(q) ||
          sr.model.toLowerCase().includes(q) ||
          sr.category.toLowerCase().includes(q) ||
          sr.customer_phone.includes(q)
      );
    }

    return result;
  }, [sellRequests, activeSellTab, searchQuery, trackType]);

  return (
    <View style={styles.container}>
      {/* 1. TOP BAR */}
      <View style={[styles.topBar, { paddingTop: safeTop }]}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.topBarBackBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>

        {/* Center RenewX Logo with Italic Tagline */}
        <RenewXLogo size="md" alignCenter />

        {/* Right Action Icons: Notification Bell with Red Badge & Profile Avatar */}
        <View style={styles.topBarRightGroup}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Notifications')}
            style={styles.topBarIconBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={22} color="#0F172A" />
            <View style={styles.notificationBadge} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('MainTabs', { screen: 'Account' })}
            style={styles.topBarProfileBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="person-outline" size={19} color="#0F172A" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={renewxColors.green}
          />
        }
      >
        {/* 2. TRACK TYPE SELECTOR (ORDERS VS SELL REQUESTS) */}
        <View style={styles.trackTypeSelectorContainer}>
          <TouchableOpacity
            style={[
              styles.trackTypeTab,
              trackType === 'orders' && styles.trackTypeTabActive,
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
            />
            <Text
              style={[
                styles.trackTypeTabText,
                trackType === 'orders' && styles.trackTypeTabTextActive,
              ]}
            >
              Orders ({orders.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.trackTypeTab,
              trackType === 'sell_requests' && styles.trackTypeTabActive,
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
            />
            <Text
              style={[
                styles.trackTypeTabText,
                trackType === 'sell_requests' && styles.trackTypeTabTextActive,
              ]}
            >
              Sell Requests ({sellRequests.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* 3. PAGE HEADING */}
        <View style={styles.headingBlock}>
          <Text style={styles.pageTitle}>
            {trackType === 'orders' ? 'Track Your Orders' : 'Track Sell Requests'}
          </Text>
          <Text style={styles.pageSubtitle}>
            {trackType === 'orders'
              ? 'Get real-time updates on your device delivery.'
              : 'Track device evaluation, doorstep pickup & instant payment.'}
          </Text>
        </View>

        {/* 4. SEARCH BAR & TRACK BUTTON */}
        <View style={styles.searchRow}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search-outline" size={19} color="#64748B" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={
                trackType === 'orders'
                  ? 'Search by Order ID, product or tracking number...'
                  : 'Search by Sell Request ID (#RX-...), model or brand...'
              }
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleTrackSearch}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={16} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={styles.trackButton}
            onPress={handleTrackSearch}
            activeOpacity={0.85}
          >
            <Text style={styles.trackButtonText}>Track</Text>
          </TouchableOpacity>
        </View>

        {/* 5. FILTER TABS */}
        <View style={styles.filterWrapper}>
          <ScrollView
            ref={filterScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {(trackType === 'orders' ? FILTER_TABS : SELL_FILTER_TABS).map((tab) => {
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

        {/* 6. ORDERS OR SELL REQUESTS LIST */}
        <View style={styles.ordersListContainer}>
          {trackType === 'orders' ? (
            filteredOrders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={48} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No Orders Found</Text>
              <Text style={styles.emptySubtitle}>
                No orders match your filter criteria. Try selecting "All Orders".
              </Text>
              <TouchableOpacity
                style={styles.emptyResetBtn}
                onPress={() => {
                  setActiveTab('all');
                  setSearchQuery('');
                }}
              >
                <Text style={styles.emptyResetBtnText}>View All Orders</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredOrders.map((order) => {
              const isExpanded = expandedOrderId === order.id;

              if (isExpanded) {
                // EXPANDED ACTIVE TRACKING VIEW
                return (
                  <View key={order.id} style={styles.expandedCard}>
                    {/* Header */}
                    <TouchableOpacity
                      style={styles.cardHeaderRow}
                      onPress={() => toggleOrderExpand(order.id)}
                      activeOpacity={0.8}
                    >
                      <View>
                        <Text style={styles.orderIdText}>Order #{order.id}</Text>
                        <Text style={styles.placedDateText}>{order.placed_date}</Text>
                      </View>

                      <View style={styles.headerRightGroup}>
                        <View style={[styles.statusPill, { backgroundColor: '#DCFCE7' }]}>
                          <Ionicons name="car" size={14} color="#16A34A" style={{ marginRight: 4 }} />
                          <Text style={[styles.statusPillText, { color: '#16A34A' }]}>
                            {order.status_label}
                          </Text>
                        </View>
                        <Ionicons name="chevron-up" size={18} color="#0F172A" />
                      </View>
                    </TouchableOpacity>

                    {/* Horizontal 5-Step Stepper */}
                    <View style={styles.stepperContainer}>
                      <View style={styles.stepperNodesRow}>
                        {order.steps.map((step, idx) => {
                          const isCompleted = step.status === 'completed';
                          const isActive = step.status === 'active';
                          const isDoneLine = idx < 3; // Yellow connecting lines between 0-1, 1-2, 2-3

                          return (
                            <View key={step.label} style={styles.stepNodeItem}>
                              {/* Horizontal Connecting Line (Left) */}
                              {idx > 0 && (
                                <View
                                  style={[
                                    styles.stepConnectingLine,
                                    styles.stepLineLeft,
                                    idx <= 3 ? styles.stepLineYellow : styles.stepLineGrey,
                                  ]}
                                />
                              )}

                              {/* Node Circle */}
                              <View
                                style={[
                                  styles.stepCircle,
                                  isCompleted && styles.stepCircleCompleted,
                                  isActive && styles.stepCircleActive,
                                ]}
                              >
                                {isCompleted ? (
                                  <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                                ) : isActive ? (
                                  <Ionicons name="car" size={13} color="#0F172A" />
                                ) : (
                                  <View style={styles.stepCircleHollow} />
                                )}
                              </View>

                              {/* Horizontal Connecting Line (Right) */}
                              {idx < order.steps.length - 1 && (
                                <View
                                  style={[
                                    styles.stepConnectingLine,
                                    styles.stepLineRight,
                                    idx < 3 ? styles.stepLineYellow : styles.stepLineGrey,
                                  ]}
                                />
                              )}

                              {/* Step Title & Timestamp */}
                              <Text
                                style={[
                                  styles.stepNodeTitle,
                                  (isCompleted || isActive) && styles.stepNodeTitleActive,
                                ]}
                                numberOfLines={1}
                              >
                                {step.label}
                              </Text>
                              <Text style={styles.stepNodeDate} numberOfLines={1}>
                                {step.date}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>

                    {/* Live Tracking Banner */}
                    <View style={styles.liveBanner}>
                      <View style={styles.truckIllustrationBox}>
                        <Ionicons name="car-sport" size={26} color="#F59E0B" />
                      </View>

                      <View style={styles.liveBannerTextCol}>
                        <View style={styles.liveTagRow}>
                          <View style={styles.liveTag}>
                            <View style={styles.liveDot} />
                            <Text style={styles.liveTagText}>LIVE</Text>
                          </View>
                        </View>
                        <ShimmerText variant="gold" style={styles.liveBannerTitle}>
                          {order.live_banner?.title}
                        </ShimmerText>
                        <Text style={styles.liveBannerSubtitle}>
                          {order.live_banner?.subtitle}
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={styles.viewOnMapBtn}
                        onPress={() => setShowMapModal(true)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="location-outline" size={14} color="#0F172A" style={{ marginRight: 3 }} />
                        <Text style={styles.viewOnMapText}>View on Map</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Product Card Row */}
                    <TouchableOpacity
                      style={styles.productRowCard}
                      onPress={() => navigation.navigate('ProductDetail', { id: order.id })}
                      activeOpacity={0.85}
                    >
                      <View style={styles.productImgBox}>
                        <Image source={order.image} style={styles.productImg} resizeMode="contain" />
                      </View>

                      <View style={styles.productInfoCol}>
                        <Text style={styles.productName} numberOfLines={1}>
                          {order.product_name}
                        </Text>
                        <Text style={styles.productSpecs} numberOfLines={1}>
                          {order.specs}
                        </Text>
                        <Text style={styles.productPrice}>
                          ₹{order.price.toLocaleString('en-IN')}
                        </Text>
                      </View>

                      <View style={styles.qtyBox}>
                        <Text style={styles.qtyText}>Qty: {order.qty}</Text>
                        <Ionicons name="arrow-forward" size={14} color="#64748B" style={{ marginLeft: 4 }} />
                      </View>
                    </TouchableOpacity>

                    {/* Delivery Partner Box */}
                    <View style={styles.deliveryPartnerCard}>
                      <View style={styles.partnerAvatarBox}>
                        <Image
                          source={{ uri: order.delivery_partner.avatar }}
                          style={styles.partnerAvatar}
                        />
                      </View>

                      <View style={styles.partnerInfoCol}>
                        <Text style={styles.partnerName}>{order.delivery_partner.name}</Text>
                        <Text style={styles.partnerRole}>{order.delivery_partner.role}</Text>
                      </View>

                      <View style={styles.partnerActionBtnsRow}>
                        <TouchableOpacity
                          style={styles.partnerRoundBtn}
                          onPress={() =>
                            handleCallPartner(order.delivery_partner.phone, order.delivery_partner.name)
                          }
                          activeOpacity={0.8}
                        >
                          <Ionicons name="call" size={15} color="#0F172A" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.partnerRoundBtn}
                          onPress={() => handleChatPartner(order.delivery_partner.name)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="chatbubble-ellipses" size={15} color="#0F172A" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Delivery Address & Estimated Delivery Row */}
                    <View style={styles.deliveryDetailsRow}>
                      {/* Left: Delivery Address */}
                      <View style={styles.deliveryCol}>
                        <View style={styles.detailsHeaderRow}>
                          <Ionicons name="location-outline" size={16} color="#0F172A" />
                          <Text style={styles.detailsHeaderText}>Delivery Address</Text>
                        </View>
                        <Text style={styles.addressBodyText}>{order.delivery_address}</Text>
                      </View>

                      {/* Divider */}
                      <View style={styles.detailsVerticalDivider} />

                      {/* Right: Estimated Delivery */}
                      <View style={styles.deliveryCol}>
                        <View style={styles.detailsHeaderRow}>
                          <Ionicons name="calendar-outline" size={16} color="#0F172A" />
                          <Text style={styles.detailsHeaderText}>Estimated Delivery</Text>
                        </View>
                        <Text style={styles.estimatedDateText}>
                          {order.estimated_delivery_date}
                        </Text>
                        <Text style={styles.estimatedTimeText}>
                          {order.estimated_delivery_time}
                        </Text>
                      </View>
                    </View>

                    {/* Action Buttons: View Order Details + Need Help */}
                    <View style={styles.actionButtonsRow}>
                      <TouchableOpacity
                        style={styles.viewDetailsBtn}
                        onPress={() => navigation.navigate('OrderDetail', { id: order.id, order })}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.viewDetailsBtnText}>View Order Details</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.needHelpBtn}
                        onPress={() => setShowHelpModal(true)}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="headset" size={17} color="#0F172A" style={{ marginRight: 6 }} />
                        <Text style={styles.needHelpBtnText}>Need Help?</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }

              // COLLAPSED CARD VIEW
              const isShipped = order.status === 'shipped';
              const isDelivered = order.status === 'delivered';

              return (
                <TouchableOpacity
                  key={order.id}
                  style={styles.collapsedCard}
                  onPress={() => toggleOrderExpand(order.id)}
                  activeOpacity={0.85}
                >
                  <View style={styles.collapsedThumbBox}>
                    <Image source={order.image} style={styles.collapsedThumbImg} resizeMode="contain" />
                  </View>

                  <View style={styles.collapsedInfoCol}>
                    <Text style={styles.collapsedOrderTitle}>Order #{order.id}</Text>
                    <Text style={styles.collapsedOrderDate}>{order.placed_date}</Text>
                  </View>

                  <View style={styles.collapsedRightGroup}>
                    <View
                      style={[
                        styles.statusPill,
                        isShipped && { backgroundColor: '#EFF6FF' },
                        isDelivered && { backgroundColor: '#DCFCE7' },
                      ]}
                    >
                      <Ionicons
                        name={isShipped ? 'car' : 'checkmark-circle'}
                        size={13}
                        color={isShipped ? '#2563EB' : '#16A34A'}
                        style={{ marginRight: 4 }}
                      />
                      <Text
                        style={[
                          styles.statusPillText,
                          { color: isShipped ? '#2563EB' : '#16A34A' },
                        ]}
                      >
                        {order.status_label}
                      </Text>
                    </View>

                    <Ionicons name="chevron-down" size={18} color="#0F172A" style={{ marginLeft: 6 }} />
                  </View>
                </TouchableOpacity>
              );
            })
          )) : (
            /* SELL REQUESTS TRACKING LIST */
            filteredSellRequests.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="repeat-outline" size={48} color="#94A3B8" />
                <Text style={styles.emptyTitle}>No Sell Requests Found</Text>
                <Text style={styles.emptySubtitle}>
                  You haven't submitted any device sell requests yet or none match your filter.
                </Text>
                <TouchableOpacity
                  style={styles.emptyResetBtn}
                  onPress={() => (navigation as any).navigate('Sell')}
                >
                  <Ionicons name="add-circle" size={16} color="#0F172A" style={{ marginRight: 6 }} />
                  <Text style={styles.emptyResetBtnText}>Sell a Device for Instant Cash</Text>
                </TouchableOpacity>
              </View>
            ) : (
              filteredSellRequests.map((req) => {
                const isExpanded = expandedSellId === req.id;
                const shortId = req.id.slice(-8).toUpperCase();

                if (isExpanded) {
                  return (
                    <View key={req.id} style={styles.expandedCard}>
                      {/* Header with Sell Request ID & Copy button */}
                      <TouchableOpacity
                        style={styles.cardHeaderRow}
                        onPress={() => setExpandedSellId(null)}
                        activeOpacity={0.8}
                      >
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.orderIdText}>Sell Request #{shortId}</Text>
                            <TouchableOpacity
                              style={styles.copyIdChip}
                              onPress={() => handleCopyId(req.id, 'Sell Request')}
                              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            >
                              <Ionicons name="copy-outline" size={12} color="#0F172A" />
                              <Text style={styles.copyIdChipText}>Copy</Text>
                            </TouchableOpacity>
                          </View>
                          <Text style={styles.placedDateText}>Submitted on {req.created_at}</Text>
                        </View>

                        <View style={styles.headerRightGroup}>
                          <View style={[styles.statusPill, { backgroundColor: req.status_bg }]}>
                            <Ionicons
                              name={
                                req.status === 'completed'
                                  ? 'checkmark-done'
                                  : req.status === 'scheduled'
                                  ? 'calendar'
                                  : 'time'
                              }
                              size={14}
                              color={req.status_color}
                              style={{ marginRight: 4 }}
                            />
                            <Text style={[styles.statusPillText, { color: req.status_color }]}>
                              {req.status_label}
                            </Text>
                          </View>
                          <Ionicons name="chevron-up" size={18} color="#0F172A" />
                        </View>
                      </TouchableOpacity>

                      {/* 5-Step Stepper for Sell Request */}
                      <View style={styles.stepperContainer}>
                        <View style={styles.stepperNodesRow}>
                          {req.steps.map((step, idx) => {
                            const isCompleted = step.status === 'completed';
                            const isActive = step.status === 'active';

                            return (
                              <View key={step.label} style={styles.stepNodeItem}>
                                {idx > 0 && (
                                  <View
                                    style={[
                                      styles.stepConnectingLine,
                                      styles.stepLineLeft,
                                      isCompleted || isActive ? styles.stepLineYellow : styles.stepLineGrey,
                                    ]}
                                  />
                                )}

                                <View
                                  style={[
                                    styles.stepCircle,
                                    isCompleted && styles.stepCircleCompleted,
                                    isActive && styles.stepCircleActive,
                                  ]}
                                >
                                  {isCompleted ? (
                                    <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                                  ) : isActive ? (
                                    <Ionicons name="repeat" size={12} color="#0F172A" />
                                  ) : (
                                    <View style={styles.stepCircleHollow} />
                                  )}
                                </View>

                                {idx < req.steps.length - 1 && (
                                  <View
                                    style={[
                                      styles.stepConnectingLine,
                                      styles.stepLineRight,
                                      isCompleted ? styles.stepLineYellow : styles.stepLineGrey,
                                    ]}
                                  />
                                )}

                                <Text
                                  style={[
                                    styles.stepNodeTitle,
                                    (isCompleted || isActive) && styles.stepNodeTitleActive,
                                  ]}
                                  numberOfLines={1}
                                >
                                  {step.label}
                                </Text>
                                <Text style={styles.stepNodeDate} numberOfLines={1}>
                                  {step.date}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                      </View>

                      {/* Live Banner for Sell Request */}
                      <View style={styles.liveBanner}>
                        <View style={[styles.truckIllustrationBox, { backgroundColor: '#FEF3C7' }]}>
                          <Ionicons name="repeat" size={24} color="#D97706" />
                        </View>

                        <View style={styles.liveBannerTextCol}>
                          <View style={styles.liveTagRow}>
                            <View style={styles.liveTag}>
                              <View style={styles.liveDot} />
                              <Text style={styles.liveTagText}>LIVE STATUS</Text>
                            </View>
                          </View>
                          <ShimmerText variant="gold" style={styles.liveBannerTitle}>
                            {req.live_banner?.title}
                          </ShimmerText>
                          <Text style={styles.liveBannerSubtitle}>
                            {req.live_banner?.subtitle}
                          </Text>
                        </View>
                      </View>

                      {/* Device Details Card */}
                      <View style={styles.productRowCard}>
                        <View style={[styles.productImgBox, { backgroundColor: '#F1F5F9' }]}>
                          <Ionicons name={getCategoryIcon(req.category)} size={26} color="#0F172A" />
                        </View>

                        <View style={styles.productInfoCol}>
                          <Text style={styles.productName} numberOfLines={1}>
                            {req.brand} {req.model}
                          </Text>
                          <Text style={styles.productSpecs} numberOfLines={1}>
                            {req.category} • {req.storage} • Certified Valuation
                          </Text>
                          <Text style={[styles.productPrice, { color: '#059669' }]}>
                            Offered Value: ₹{req.valuation_amount.toLocaleString('en-IN')}
                          </Text>
                        </View>

                        <View
                          style={[
                            styles.qtyBox,
                            { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
                          ]}
                        >
                          <Text style={[styles.qtyText, { color: '#059669', fontWeight: '800' }]}>
                            Instant Cash
                          </Text>
                        </View>
                      </View>

                      {/* Pickup & Payment Details Row */}
                      <View style={styles.deliveryDetailsRow}>
                        <View style={styles.deliveryCol}>
                          <View style={styles.detailsHeaderRow}>
                            <Ionicons name="location-outline" size={16} color="#0F172A" />
                            <Text style={styles.detailsHeaderText}>Pickup Address</Text>
                          </View>
                          <Text style={styles.addressBodyText}>
                            {req.customer_address
                              ? `${req.customer_address}${req.pincode ? ' - ' + req.pincode : ''}`
                              : 'Address registered in request'}
                          </Text>
                          <Text style={{ fontSize: 11, color: '#64748B', marginTop: 3 }}>
                            Contact: {req.customer_phone || req.customer_name}
                          </Text>
                        </View>

                        <View style={styles.detailsVerticalDivider} />

                        <View style={styles.deliveryCol}>
                          <View style={styles.detailsHeaderRow}>
                            <Ionicons name="cash-outline" size={16} color="#0F172A" />
                            <Text style={styles.detailsHeaderText}>Payout Details</Text>
                          </View>
                          <Text style={[styles.estimatedDateText, { color: '#059669' }]}>
                            ₹{req.valuation_amount.toLocaleString('en-IN')}
                          </Text>
                          <Text style={styles.estimatedTimeText}>
                            UPI / Instant Bank Transfer
                          </Text>
                        </View>
                      </View>

                      {/* Action buttons */}
                      <View style={styles.actionButtonsRow}>
                        {req.status === 'pending' && (
                          <TouchableOpacity
                            style={[
                              styles.viewDetailsBtn,
                              { backgroundColor: '#FEE2E2', borderColor: '#FECACA' },
                            ]}
                            onPress={() => handleCancelSellRequest(req)}
                            disabled={cancellingSellId === req.id}
                            activeOpacity={0.8}
                          >
                            <Ionicons
                              name="close-circle-outline"
                              size={15}
                              color="#DC2626"
                              style={{ marginRight: 4 }}
                            />
                            <Text style={[styles.viewDetailsBtnText, { color: '#DC2626' }]}>
                              {cancellingSellId === req.id ? 'Cancelling...' : 'Cancel Request'}
                            </Text>
                          </TouchableOpacity>
                        )}

                        <TouchableOpacity
                          style={styles.needHelpBtn}
                          onPress={() => (navigation as any).navigate('Sell')}
                          activeOpacity={0.85}
                        >
                          <Ionicons
                            name="add-circle-outline"
                            size={16}
                            color="#0F172A"
                            style={{ marginRight: 5 }}
                          />
                          <Text style={styles.needHelpBtnText}>Sell Another</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }

                // Collapsed Sell Request Card
                return (
                  <TouchableOpacity
                    key={req.id}
                    style={styles.collapsedCard}
                    onPress={() => setExpandedSellId(req.id)}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.collapsedThumbBox, { backgroundColor: '#F8FAFC' }]}>
                      <Ionicons name={getCategoryIcon(req.category)} size={24} color="#0F172A" />
                    </View>

                    <View style={styles.collapsedInfoCol}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <Text style={styles.collapsedOrderTitle}>
                          {req.brand} {req.model}
                        </Text>
                      </View>
                      <Text style={styles.collapsedOrderDate}>
                        Req #{shortId} • {req.created_at}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '700',
                          color: '#059669',
                          marginTop: 2,
                        }}
                      >
                        ₹{req.valuation_amount.toLocaleString('en-IN')}
                      </Text>
                    </View>

                    <View style={styles.collapsedRightGroup}>
                      <View style={[styles.statusPill, { backgroundColor: req.status_bg }]}>
                        <Text style={[styles.statusPillText, { color: req.status_color }]}>
                          {req.status_label}
                        </Text>
                      </View>

                      <Ionicons
                        name="chevron-down"
                        size={18}
                        color="#0F172A"
                        style={{ marginLeft: 6 }}
                      />
                    </View>
                  </TouchableOpacity>
                );
              })
            )
          )}
        </View>
      </ScrollView>

      {/* 6. LIVE MAP MODAL */}
      <Modal visible={showMapModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.mapModalContainer}>
            <View style={styles.mapModalHeader}>
              <View>
                <Text style={styles.mapModalTitle}>Live Tracking Route</Text>
                <Text style={styles.mapModalSubtitle}>Delivery Partner: Ramesh K · On the way</Text>
              </View>
              <TouchableOpacity onPress={() => setShowMapModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color="#0F172A" />
              </TouchableOpacity>
            </View>

            {/* Simulated Vector Map Area */}
            <View style={styles.simulatedMapArea}>
              <View style={styles.mapRoadHorizontal} />
              <View style={styles.mapRoadVertical} />
              <View style={styles.mapRoadDiagonal} />

              {/* Delivery Van Pin */}
              <View style={styles.mapVanPin}>
                <Ionicons name="car" size={16} color="#FFFFFF" />
              </View>

              {/* Destination Pin */}
              <View style={styles.mapDestinationPin}>
                <Ionicons name="home" size={14} color="#FFFFFF" />
              </View>

              <View style={styles.mapEtaCard}>
                <Ionicons name="speedometer-outline" size={18} color="#0F172A" />
                <View>
                  <Text style={styles.mapEtaTime}>ETA: ~18 mins</Text>
                  <Text style={styles.mapEtaDist}>1.4 km away · Anna Nagar Main Road</Text>
                </View>
              </View>
            </View>

            {/* Quick Actions */}
            <View style={styles.mapActionsRow}>
              <TouchableOpacity
                style={styles.mapCallBtn}
                onPress={() => {
                  setShowMapModal(false);
                  handleCallPartner('+91 98401 23456', 'Ramesh K');
                }}
              >
                <Ionicons name="call" size={16} color="#0F172A" style={{ marginRight: 6 }} />
                <Text style={styles.mapCallBtnText}>Call Delivery Partner</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.mapDismissBtn}
                onPress={() => setShowMapModal(false)}
              >
                <Text style={styles.mapDismissBtnText}>Close Map</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 7. NEED HELP / SUPPORT MODAL */}
      <Modal visible={showHelpModal} animationType="fade" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.helpModalContainer}>
            <View style={styles.helpModalHeader}>
              <View style={styles.helpHeaderIcon}>
                <Ionicons name="headset" size={20} color="#0F172A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.helpModalTitle}>Order Assistance</Text>
                <Text style={styles.helpModalSubtitle}>Order #RX123456 Support</Text>
              </View>
              <TouchableOpacity onPress={() => setShowHelpModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.helpOptionItem}
              onPress={() => {
                setShowHelpModal(false);
                toast.info('Connecting to RenewX 24/7 Live Support...');
              }}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={20} color="#2563EB" />
              <View style={styles.helpOptionTextCol}>
                <Text style={styles.helpOptionTitle}>Chat with Live Agent</Text>
                <Text style={styles.helpOptionSub}>Instant answers for delivery and refunds</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.helpOptionItem}
              onPress={() => {
                setShowHelpModal(false);
                if (Platform.OS !== 'web') {
                  Linking.openURL('tel:18002331234').catch(() => {});
                } else {
                  toast.success('Toll Free Support:', '1800 233 1234');
                }
              }}
            >
              <Ionicons name="call-outline" size={20} color="#16A34A" />
              <View style={styles.helpOptionTextCol}>
                <Text style={styles.helpOptionTitle}>Call Helpline (1800 233 1234)</Text>
                <Text style={styles.helpOptionSub}>Toll-free customer care available 9 AM - 9 PM</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.helpOptionItem}
              onPress={() => {
                setShowHelpModal(false);
                toast.info('Ticket created! Our logistics manager will inspect this order.');
              }}
            >
              <Ionicons name="alert-circle-outline" size={20} color="#DC2626" />
              <View style={styles.helpOptionTextCol}>
                <Text style={styles.helpOptionTitle}>Report Delivery Issue</Text>
                <Text style={styles.helpOptionSub}>Delay, damaged package or wrong address</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  /* TOP BAR */
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  topBarBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topBarIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 7,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  topBarProfileBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* SCROLL CONTENT */
  scrollArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingBottom: 120,
  },

  /* TRACK TYPE SELECTOR */
  trackTypeSelectorContainer: {
    flexDirection: 'row',
    marginHorizontal: 18,
    marginTop: 14,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  trackTypeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  trackTypeTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  trackTypeTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  trackTypeTabTextActive: {
    color: '#0F172A',
    fontWeight: '800',
  },
  copyIdChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  copyIdChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0F172A',
  },

  /* HEADING BLOCK */
  headingBlock: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 12,
  },
  pageTitle: {
    fontFamily: renewxFontFamily.extraBold,
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  pageSubtitle: {
    marginTop: 4,
    fontFamily: renewxFontFamily.regular,
    fontSize: 13.5,
    color: '#64748B',
  },

  /* SEARCH ROW */
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    gap: 10,
    marginBottom: 14,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    ...Platform.select({
      web: { boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' },
      default: { elevation: 1 },
    }),
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: renewxFontFamily.regular,
    fontSize: 13,
    color: '#0F172A',
    height: '100%',
    padding: 0,
    ...Platform.select({
      web: { outlineStyle: 'none' } as any,
    }),
  },
  trackButton: {
    height: 48,
    paddingHorizontal: 22,
    backgroundColor: '#FBBF24',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackButtonText: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },

  /* FILTER TABS STRIP */
  filterWrapper: {
    marginBottom: 16,
  },
  filterScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#FEF08A',
    borderColor: '#FDE047',
  },
  filterChipText: {
    fontFamily: renewxFontFamily.semibold,
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#0F172A',
    fontWeight: '800',
  },

  /* ORDERS CONTAINER */
  ordersListContainer: {
    paddingHorizontal: 18,
    gap: 14,
  },

  /* EXPANDED ORDER CARD */
  expandedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    ...Platform.select({
      web: { boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)' },
      default: { elevation: 3 },
    }),
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  orderIdText: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  placedDateText: {
    marginTop: 3,
    fontFamily: renewxFontFamily.regular,
    fontSize: 12,
    color: '#64748B',
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  statusPillText: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 11.5,
    fontWeight: '700',
  },

  /* STEPPER */
  stepperContainer: {
    marginTop: 18,
    paddingVertical: 6,
  },
  stepperNodesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  stepNodeItem: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  stepConnectingLine: {
    position: 'absolute',
    top: 11,
    height: 3,
    zIndex: 1,
  },
  stepLineLeft: {
    left: 0,
    right: '50%',
  },
  stepLineRight: {
    left: '50%',
    right: 0,
  },
  stepLineYellow: {
    backgroundColor: '#FBBF24',
  },
  stepLineGrey: {
    backgroundColor: '#CBD5E1',
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  stepCircleCompleted: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },
  stepCircleActive: {
    backgroundColor: '#FBBF24',
    borderColor: '#F59E0B',
  },
  stepCircleHollow: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CBD5E1',
  },
  stepNodeTitle: {
    marginTop: 8,
    fontFamily: renewxFontFamily.semibold,
    fontSize: 9.5,
    color: '#64748B',
    textAlign: 'center',
  },
  stepNodeTitleActive: {
    color: '#0F172A',
    fontWeight: '800',
  },
  stepNodeDate: {
    marginTop: 2,
    fontFamily: renewxFontFamily.regular,
    fontSize: 8.5,
    color: '#94A3B8',
    textAlign: 'center',
  },

  /* LIVE BANNER */
  liveBanner: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  truckIllustrationBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveBannerTextCol: {
    flex: 1,
  },
  liveTagRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF08A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#0F172A',
  },
  liveTagText: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 9,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  liveBannerTitle: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  liveBannerSubtitle: {
    marginTop: 1,
    fontFamily: renewxFontFamily.regular,
    fontSize: 11,
    color: '#64748B',
  },
  viewOnMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  viewOnMapText: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },

  /* PRODUCT ROW */
  productRowCard: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 10,
    gap: 12,
  },
  productImgBox: {
    width: 54,
    height: 54,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  productImg: {
    width: '100%',
    height: '100%',
  },
  productInfoCol: {
    flex: 1,
  },
  productName: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  productSpecs: {
    marginTop: 2,
    fontFamily: renewxFontFamily.regular,
    fontSize: 11,
    color: '#64748B',
  },
  productPrice: {
    marginTop: 3,
    fontFamily: renewxFontFamily.extraBold,
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },
  qtyBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyText: {
    fontFamily: renewxFontFamily.medium,
    fontSize: 12,
    color: '#64748B',
  },

  /* DELIVERY PARTNER CARD */
  deliveryPartnerCard: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEFCE8',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FEF08A',
    padding: 12,
    gap: 12,
  },
  partnerAvatarBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: 'hidden',
    backgroundColor: '#FDE047',
  },
  partnerAvatar: {
    width: '100%',
    height: '100%',
  },
  partnerInfoCol: {
    flex: 1,
  },
  partnerName: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  partnerRole: {
    marginTop: 1,
    fontFamily: renewxFontFamily.regular,
    fontSize: 11.5,
    color: '#64748B',
  },
  partnerActionBtnsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  partnerRoundBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF08A',
    borderWidth: 1,
    borderColor: '#FDE047',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* DELIVERY DETAILS 2-COL */
  deliveryDetailsRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  deliveryCol: {
    flex: 1,
  },
  detailsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  detailsHeaderText: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  addressBodyText: {
    fontFamily: renewxFontFamily.regular,
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 16,
  },
  estimatedDateText: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  estimatedTimeText: {
    marginTop: 2,
    fontFamily: renewxFontFamily.regular,
    fontSize: 11.5,
    color: '#64748B',
  },
  detailsVerticalDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 12,
    alignSelf: 'stretch',
  },

  /* ACTIONS ROW */
  actionButtonsRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  viewDetailsBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewDetailsBtnText: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  needHelpBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#FBBF24',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  needHelpBtnText: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },

  /* COLLAPSED ORDERS */
  collapsedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)' },
      default: { elevation: 1 },
    }),
  },
  collapsedThumbBox: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  collapsedThumbImg: {
    width: '100%',
    height: '100%',
  },
  collapsedInfoCol: {
    flex: 1,
  },
  collapsedOrderTitle: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  collapsedOrderDate: {
    marginTop: 2,
    fontFamily: renewxFontFamily.regular,
    fontSize: 11,
    color: '#64748B',
  },
  collapsedRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  /* EMPTY STATE */
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    marginTop: 14,
    fontFamily: renewxFontFamily.bold,
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptySubtitle: {
    marginTop: 4,
    fontFamily: renewxFontFamily.regular,
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyResetBtn: {
    marginTop: 16,
    backgroundColor: '#FBBF24',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  emptyResetBtnText: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
  },

  /* MODALS */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  mapModalContainer: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    ...Platform.select({
      web: { boxShadow: '0 10px 30px rgba(0,0,0,0.2)' },
      default: { elevation: 8 },
    }),
  },
  mapModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  mapModalTitle: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
  },
  mapModalSubtitle: {
    marginTop: 2,
    fontFamily: renewxFontFamily.regular,
    fontSize: 12,
    color: '#64748B',
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
    height: 220,
    borderRadius: 14,
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapRoadHorizontal: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 18,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#CBD5E1',
  },
  mapRoadVertical: {
    position: 'absolute',
    left: '60%',
    top: 0,
    bottom: 0,
    width: 18,
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#CBD5E1',
  },
  mapRoadDiagonal: {
    position: 'absolute',
    top: 30,
    left: 20,
    width: 160,
    height: 8,
    backgroundColor: '#FDE047',
    borderRadius: 4,
    transform: [{ rotate: '35deg' }],
  },
  mapVanPin: {
    position: 'absolute',
    left: '35%',
    top: '42%',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F59E0B',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapDestinationPin: {
    position: 'absolute',
    left: '68%',
    top: '32%',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapEtaCard: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mapEtaTime: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  mapEtaDist: {
    fontFamily: renewxFontFamily.regular,
    fontSize: 11,
    color: '#64748B',
  },
  mapActionsRow: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 10,
  },
  mapCallBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FBBF24',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapCallBtnText: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  mapDismissBtn: {
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapDismissBtnText: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 13,
    color: '#64748B',
  },

  /* HELP MODAL */
  helpModalContainer: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    ...Platform.select({
      web: { boxShadow: '0 10px 30px rgba(0,0,0,0.2)' },
      default: { elevation: 8 },
    }),
  },
  helpModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  helpHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF08A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpModalTitle: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  helpModalSubtitle: {
    fontFamily: renewxFontFamily.regular,
    fontSize: 12,
    color: '#64748B',
  },
  helpOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  helpOptionTextCol: {
    flex: 1,
  },
  helpOptionTitle: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  helpOptionSub: {
    marginTop: 2,
    fontFamily: renewxFontFamily.regular,
    fontSize: 11,
    color: '#64748B',
  },
});
