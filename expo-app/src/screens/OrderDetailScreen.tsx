import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Image,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api, getApiBaseUrl } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { renewxColors, renewxFontFamily, renewxRadius, renewxSpacing, renewxTypography } from '@/design-system';
import { downloadOrderInvoicePdf } from '@/services/invoiceService';

type RootParamList = {
  OrderDetail: { id: string; order?: any };
};

type OrderDetailRoute = RouteProp<RootParamList, 'OrderDetail'>;

const STATUS_STEPS = [
  { key: 'verified', title: 'Order Confirmed', text: 'Your order has been confirmed.', icon: 'checkmark-circle-outline' },
  { key: 'processing', title: 'Processing', text: 'Your device is being prepared.', icon: 'cube-outline' },
  { key: 'shipped', title: 'Shipped', text: 'Your package has left our facility.', icon: 'car-outline' },
  { key: 'out_for_delivery', title: 'Out for Delivery', text: 'Your package is on the way.', icon: 'navigate-outline' },
  { key: 'delivered', title: 'Delivered', text: 'Your order was delivered.', icon: 'home-outline' },
] as const;

const RANK: Record<string, number> = {
  pending: 0, verified: 1, confirmed: 1, processing: 2, shipped: 3, out_for_delivery: 4, delivered: 5,
};

function money(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? `₹${n.toLocaleString('en-IN')}` : '₹0';
}

function dateTime(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function statusLabel(value?: string) {
  return String(value || 'pending').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function getWsBaseUrl() {
  const configured = process.env.EXPO_PUBLIC_WS_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');
  return getApiBaseUrl().replace(/\/+$/, '').replace(/^https:/i, 'wss:').replace(/^http:/i, 'ws:').replace(/\/api$/i, '');
}

function socketUrl(id: string) {
  return `${getWsBaseUrl()}/ws/orders/${encodeURIComponent(id)}`;
}

export default function OrderDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<OrderDetailRoute>();
  const { token, user } = useAuth();
  const toast = useToast();

  const orderId = String(route.params?.id || route.params?.order?.id || '');
  const [order, setOrder] = useState<any>(route.params?.order || null);
  const [loading, setLoading] = useState(!route.params?.order);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempt = useRef(0);
  const mountedRef = useRef(true);

  const loadOrder = useCallback(async (showLoader = false) => {
    if (!orderId) {
      setError('Order reference is missing.');
      setLoading(false);
      return;
    }
    if (showLoader) setLoading(true);
    try {
      setError(null);
      const fresh = await api.orders.getById(orderId);
      if (mountedRef.current) {
        setOrder(fresh);
        setLastUpdate(new Date().toISOString());
      }
    } catch (err: any) {
      if (mountedRef.current) setError(err?.message || 'Unable to load this order.');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    mountedRef.current = true;
    loadOrder(!order);
    return () => { mountedRef.current = false; };
  }, [loadOrder]);

  const connectSocket = useCallback(() => {
    if (!orderId || !token || ['delivered', 'cancelled'].includes(String(order?.status || '').toLowerCase())) {
      setLive(false);
      return;
    }
    if (socketRef.current) socketRef.current.close();
    if (reconnectRef.current) clearTimeout(reconnectRef.current);

    let ws: WebSocket;
    try { ws = new WebSocket(socketUrl(orderId)); } catch { setLive(false); return; }
    socketRef.current = ws;

    ws.onopen = () => {
      reconnectAttempt.current = 0;
      setLive(true);
      ws.send(JSON.stringify({ type: 'auth', token }));
      ws.send(JSON.stringify({ type: 'subscribe', channel: 'order', orderId }));
    };

    ws.onmessage = (message) => {
      try {
        const event = JSON.parse(String(message.data));
        if (event?.type === 'error') return;
        const data = event?.data ?? event?.payload ?? {};
        const incoming = data?.order ?? (data?.id ? data : null);
        const status = data?.status ?? incoming?.status;
        if (incoming || status) {
          setOrder((current: any) => ({
            ...(current || {}),
            ...(incoming || {}),
            ...(status ? { status } : {}),
          }));
          setLastUpdate(new Date().toISOString());
        }
        if (['delivered', 'cancelled'].includes(String(status || '').toLowerCase())) {
          ws.close(1000, 'terminal');
        }
      } catch {}
    };

    ws.onclose = () => {
      if (socketRef.current === ws) socketRef.current = null;
      setLive(false);
      if (!mountedRef.current || ['delivered', 'cancelled'].includes(String(order?.status || '').toLowerCase())) return;
      const delay = Math.min(1000 * 2 ** reconnectAttempt.current, 30000);
      reconnectAttempt.current = Math.min(reconnectAttempt.current + 1, 6);
      reconnectRef.current = setTimeout(connectSocket, delay);
    };
    ws.onerror = () => {};
  }, [orderId, token, order?.status]);

  useEffect(() => {
    connectSocket();
    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (socketRef.current) socketRef.current.close(1000, 'screen closed');
      socketRef.current = null;
      setLive(false);
    };
  }, [connectSocket]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        loadOrder(false);
        connectSocket();
      }
    });
    return () => sub.remove();
  }, [connectSocket, loadOrder]);

  const currentStatus = String(order?.status || 'pending').toLowerCase();
  const currentRank = RANK[currentStatus] ?? 0;
  const cancelled = currentStatus === 'cancelled';
  const refunded = ['refunded'].includes(String(order?.payment_status || '').toLowerCase());
  const items = Array.isArray(order?.order_items) ? order.order_items : [];
  const image = items[0]?.product_image || items[0]?.image_url || order?.product_image;
  const totalItems = items.reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0);

  const refresh = async () => {
    setRefreshing(true);
    try { await loadOrder(false); } finally { setRefreshing(false); }
  };

  const shareOrder = async () => {
    try {
      await Share.share({
        message: `RenewX order #${order?.order_number || orderId}\nStatus: ${statusLabel(currentStatus)}\nTotal: ${money(order?.subtotal)}`,
      });
    } catch {}
  };

  const invoice = async () => {
    if (!order) return;
    try {
      setInvoiceLoading(true);
      await downloadOrderInvoicePdf(order, user);
      toast.success('Invoice ready');
    } catch (err: any) {
      Alert.alert('Invoice unavailable', err?.message || 'Unable to generate the invoice right now.');
    } finally {
      setInvoiceLoading(false);
    }
  };

  if (loading && !order) {
    return <View style={styles.center}><ActivityIndicator size="large" color={renewxColors.yellow} /><Text style={styles.centerText}>Loading order…</Text></View>;
  }

  if (error && !order) {
    return (
      <View style={styles.center}>
        <View style={styles.errorIcon}><Ionicons name="receipt-outline" size={28} color={renewxColors.black} /></View>
        <Text style={styles.errorTitle}>Order unavailable</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => loadOrder(true)}><Text style={styles.primaryButtonText}>Retry</Text></TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={renewxColors.green} />}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}><Ionicons name="arrow-back" size={22} color={renewxColors.black} /></TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>RENEWX ORDER</Text>
            <Text style={styles.title}>#{order?.order_number || orderId.slice(-8)}</Text>
          </View>
          <TouchableOpacity onPress={shareOrder} style={styles.iconButton}><Ionicons name="share-outline" size={20} color={renewxColors.black} /></TouchableOpacity>
        </View>

        <View style={[styles.liveCard, live && styles.liveCardActive]}>
          <View style={[styles.liveDot, live && styles.liveDotActive]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.liveTitle}>{live ? 'Live tracking connected' : 'Tracking status'}</Text>
            <Text style={styles.liveText}>{lastUpdate ? `Last updated ${dateTime(lastUpdate)}` : 'Pull down to refresh the latest status.'}</Text>
          </View>
          <Ionicons name={live ? 'radio' : 'cloud-offline-outline'} size={18} color={live ? renewxColors.green : '#64748b'} />
        </View>

        {cancelled ? (
          <View style={styles.alertCard}>
            <Ionicons name="close-circle" size={24} color="#dc2626" />
            <View style={styles.alertCopy}><Text style={styles.alertTitle}>Order cancelled</Text><Text style={styles.alertText}>This order is no longer being delivered.</Text></View>
          </View>
        ) : (
          <View style={styles.statusCard}>
            <View style={styles.statusTop}>
              <View>
                <Text style={styles.statusEyebrow}>CURRENT STATUS</Text>
                <Text style={styles.statusTitle}>{statusLabel(currentStatus)}</Text>
              </View>
              <View style={styles.statusBadge}><Text style={styles.statusBadgeText}>{live ? 'LIVE' : 'UPDATED'}</Text></View>
            </View>

            {STATUS_STEPS.map((step, index) => {
              const stepRank = RANK[step.key];
              const complete = currentRank >= stepRank;
              const active = currentRank === stepRank;
              return (
                <View key={step.key} style={styles.timelineRow}>
                  <View style={styles.timelineRail}>
                    <View style={[styles.timelineIcon, complete && styles.timelineIconComplete, active && styles.timelineIconActive]}>
                      <Ionicons name={step.icon as any} size={17} color={complete ? renewxColors.black : '#94a3b8'} />
                    </View>
                    {index < STATUS_STEPS.length - 1 && <View style={[styles.timelineLine, currentRank > stepRank && styles.timelineLineComplete]} />}
                  </View>
                  <View style={styles.timelineCopy}>
                    <Text style={[styles.timelineTitle, active && styles.timelineTitleActive]}>{step.title}</Text>
                    <Text style={styles.timelineText}>{step.text}</Text>
                  </View>
                  {complete && <Ionicons name="checkmark-circle" size={18} color={renewxColors.green} />}
                </View>
              );
            })}
          </View>
        )}

        {order?.courier || order?.tracking_number ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Delivery details</Text>
            {order?.courier ? <InfoRow icon="business-outline" label="Courier" value={order.courier} /> : null}
            {order?.tracking_number ? <InfoRow icon="barcode-outline" label="Tracking ID" value={order.tracking_number} /> : null}
            {order?.courier_phone ? <InfoRow icon="call-outline" label="Courier contact" value={order.courier_phone} /> : null}
            {order?.estimated_delivery ? <InfoRow icon="calendar-outline" label="Estimated delivery" value={order.estimated_delivery} /> : null}
          </View>
        ) : null}

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Items {totalItems ? `(${totalItems})` : ''}</Text>
            <Text style={styles.date}>{dateTime(order?.created_at)}</Text>
          </View>
          {items.length ? items.map((item: any, index: number) => (
            <View key={`${item.product_id || index}`} style={styles.itemRow}>
              {item.product_image ? <Image source={{ uri: item.product_image }} style={styles.itemImage} /> : <View style={styles.itemImageFallback}><Ionicons name="phone-portrait-outline" size={24} color="#94a3b8" /></View>}
              <View style={styles.itemCopy}>
                <Text style={styles.itemName} numberOfLines={2}>{item.product_name || 'RenewX device'}</Text>
                <Text style={styles.itemMeta}>Qty {item.quantity || 1} · {money(item.price)}</Text>
              </View>
              <Text style={styles.itemTotal}>{money(Number(item.price || 0) * Number(item.quantity || 1))}</Text>
            </View>
          )) : (
            <Text style={styles.muted}>Order item details are not available.</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Payment summary</Text>
          <InfoRow icon="card-outline" label="Method" value={String(order?.payment_method || 'Online').toUpperCase()} />
          <InfoRow icon="shield-checkmark-outline" label="Payment status" value={statusLabel(order?.payment_status || 'created')} />
          <View style={styles.totalRow}><Text style={styles.totalLabel}>Total</Text><Text style={styles.total}>{money(order?.subtotal)}</Text></View>
          {Number(order?.savings) > 0 ? <Text style={styles.savings}>You saved {money(order.savings)}</Text> : null}
          {refunded ? <View style={styles.refundBanner}><Ionicons name="return-down-back-outline" size={18} color="#b91c1c" /><Text style={styles.refundText}>Payment has been refunded.</Text></View> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Delivery address</Text>
          <InfoRow icon="person-outline" label="Name" value={order?.customer_info?.name || '—'} />
          <InfoRow icon="call-outline" label="Phone" value={order?.customer_info?.phone || '—'} />
          <InfoRow icon="location-outline" label="Address" value={order?.customer_info?.address || '—'} />
          <InfoRow icon="pin-outline" label="PIN" value={order?.customer_info?.pincode || '—'} />
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('MainTabs', { screen: 'Track' })}>
            <Ionicons name="locate-outline" size={18} color={renewxColors.black} />
            <Text style={styles.primaryButtonText}>Track all orders</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={invoice} disabled={invoiceLoading}>
            {invoiceLoading ? <ActivityIndicator color={renewxColors.black} /> : <Ionicons name="document-text-outline" size={18} color={renewxColors.black} />}
            <Text style={styles.secondaryButtonText}>{invoiceLoading ? 'Preparing invoice…' : 'Download invoice'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.securityNote}><Ionicons name="lock-closed-outline" size={12} color="#64748b" /> Order details are available only to your RenewX account.</Text>
      </ScrollView>
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={17} color="#64748b" />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={3}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: renewxColors.background },
  content: { padding: renewxSpacing.md, paddingBottom: 40 },
  center: { flex: 1, backgroundColor: renewxColors.black, alignItems: 'center', justifyContent: 'center', padding: 28 },
  centerText: { color: '#fff', marginTop: 12, fontFamily: renewxFontFamily.medium },
  errorIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: renewxColors.yellow, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  errorTitle: { color: '#fff', fontSize: 22, fontFamily: renewxFontFamily.bold, marginBottom: 8 },
  errorText: { color: '#cbd5e1', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  headerCopy: { flex: 1 },
  eyebrow: { fontSize: 10, letterSpacing: 1.4, color: renewxColors.green, fontFamily: renewxFontFamily.bold },
  title: { fontSize: 23, color: renewxColors.black, fontFamily: renewxFontFamily.extraBold, marginTop: 2 },
  iconButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  liveCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: renewxRadius.lg, padding: 14, marginBottom: 12 },
  liveCardActive: { borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' },
  liveDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#94a3b8' },
  liveDotActive: { backgroundColor: renewxColors.green },
  liveTitle: { fontFamily: renewxFontFamily.bold, color: renewxColors.black, fontSize: 13 },
  liveText: { color: '#64748b', fontSize: 11, marginTop: 2 },
  statusCard: { backgroundColor: renewxColors.black, borderRadius: renewxRadius.xl, padding: 18, marginBottom: 12 },
  statusTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  statusEyebrow: { color: '#94a3b8', fontSize: 9, letterSpacing: 1.2, fontFamily: renewxFontFamily.bold },
  statusTitle: { color: renewxColors.yellow, fontSize: 22, fontFamily: renewxFontFamily.extraBold, marginTop: 4 },
  statusBadge: { backgroundColor: renewxColors.yellow, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 99 },
  statusBadgeText: { color: renewxColors.black, fontSize: 9, fontFamily: renewxFontFamily.bold },
  timelineRow: { flexDirection: 'row', minHeight: 62 },
  timelineRail: { width: 38, alignItems: 'center' },
  timelineIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#1f2937', alignItems: 'center', justifyContent: 'center' },
  timelineIconComplete: { backgroundColor: renewxColors.yellow },
  timelineIconActive: { transform: [{ scale: 1.08 }] },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#334155', marginVertical: 3 },
  timelineLineComplete: { backgroundColor: renewxColors.green },
  timelineCopy: { flex: 1, paddingHorizontal: 10, paddingBottom: 14 },
  timelineTitle: { color: '#cbd5e1', fontFamily: renewxFontFamily.semibold, fontSize: 13 },
  timelineTitleActive: { color: '#fff', fontFamily: renewxFontFamily.bold },
  timelineText: { color: '#94a3b8', fontSize: 11, marginTop: 3 },
  alertCard: { flexDirection: 'row', gap: 12, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: renewxRadius.lg, padding: 16, marginBottom: 12 },
  alertCopy: { flex: 1 },
  alertTitle: { color: '#991b1b', fontFamily: renewxFontFamily.bold, fontSize: 15 },
  alertText: { color: '#b91c1c', fontSize: 12, marginTop: 4 },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: renewxRadius.lg, padding: 16, marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { color: renewxColors.black, fontFamily: renewxFontFamily.bold, fontSize: 15, marginBottom: 12 },
  date: { color: '#64748b', fontSize: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, paddingVertical: 8 },
  infoLabel: { width: 92, color: '#64748b', fontSize: 12 },
  infoValue: { flex: 1, color: renewxColors.black, fontFamily: renewxFontFamily.semibold, fontSize: 12, textAlign: 'right' },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  itemImage: { width: 58, height: 58, borderRadius: 10, backgroundColor: '#f8fafc' },
  itemImageFallback: { width: 58, height: 58, borderRadius: 10, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' },
  itemCopy: { flex: 1 },
  itemName: { color: renewxColors.black, fontFamily: renewxFontFamily.semibold, fontSize: 13 },
  itemMeta: { color: '#64748b', fontSize: 11, marginTop: 4 },
  itemTotal: { color: renewxColors.black, fontFamily: renewxFontFamily.bold, fontSize: 12 },
  muted: { color: '#64748b', fontSize: 12 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#e2e8f0', marginTop: 8, paddingTop: 13 },
  totalLabel: { color: '#475569', fontFamily: renewxFontFamily.semibold },
  total: { color: renewxColors.black, fontFamily: renewxFontFamily.extraBold, fontSize: 20 },
  savings: { color: renewxColors.green, fontSize: 11, marginTop: 5, textAlign: 'right', fontFamily: renewxFontFamily.semibold },
  refundBanner: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: '#fef2f2', borderRadius: 9, padding: 10, marginTop: 10 },
  refundText: { color: '#991b1b', fontSize: 11, fontFamily: renewxFontFamily.semibold },
  actions: { gap: 10, marginTop: 2 },
  primaryButton: { minHeight: 50, borderRadius: renewxRadius.md, backgroundColor: renewxColors.yellow, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  primaryButtonText: { color: renewxColors.black, fontFamily: renewxFontFamily.bold, fontSize: 13 },
  secondaryButton: { minHeight: 50, borderRadius: renewxRadius.md, backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  secondaryButtonText: { color: renewxColors.black, fontFamily: renewxFontFamily.bold, fontSize: 13 },
  securityNote: { textAlign: 'center', color: '#64748b', fontSize: 10, marginTop: 16 },
});