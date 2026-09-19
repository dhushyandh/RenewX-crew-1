import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme';
import { useAuth } from '@/context/AuthContext';

type Order = any;

const STATUS_STEPS = [
  { key: 'verified', title: 'Order Confirmed', description: 'Payment verified and order booked' },
  { key: 'processing', title: 'Processing', description: 'Device is being prepared for dispatch' },
  { key: 'shipped', title: 'Shipped', description: 'Package handed to the courier' },
  { key: 'out_for_delivery', title: 'Out for Delivery', description: 'Courier partner is delivering your order' },
  { key: 'delivered', title: 'Delivered', description: 'Package delivered successfully' },
];

const statusRank: Record<string, number> = {
  pending: 0, verified: 1, processing: 2, shipped: 3, out_for_delivery: 4, delivered: 5, cancelled: -1,
};

function formatMoney(value: unknown) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`;
}

function formatDate(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function getItemName(order: Order) {
  return order?.order_items?.[0]?.product_name || 'RenewX device';
}

export default function TrackScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [searchId, setSearchId] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const data = await api.orders.getAll();
      const next = Array.isArray(data) ? data : [];
      setOrders(next);
      setSelectedOrderId((current) => current && next.some((o) => String(o.id) === current) ? current : next[0]?.id || null);
    } catch (err: any) {
      setError(err?.message || 'Unable to load your orders.');
      setOrders([]);
      setSelectedOrderId(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const selectedOrder = useMemo(
    () => orders.find((order) => String(order.id) === String(selectedOrderId)) || null,
    [orders, selectedOrderId],
  );

  const filteredOrders = useMemo(() => {
    const query = searchId.trim().toLowerCase();
    if (!query) return orders;
    return orders.filter((order) =>
      String(order.id || '').toLowerCase().includes(query) ||
      String(order.tracking_number || '').toLowerCase().includes(query)
    );
  }, [orders, searchId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  if (!user) {
    return (
      <View style={[styles.center, { paddingTop: Math.max(insets.top, 16) }]}>
        <Ionicons name="lock-closed-outline" size={44} color="#94a3b8" />
        <Text style={styles.emptyTitle}>Sign in to track orders</Text>
        <Text style={styles.emptyText}>Your order history and delivery status are available after signing in.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: Math.max(insets.top, 16) }]}>
        <View style={styles.spinnerPlaceholder} />
        <Text style={styles.loadingText}>Loading your orders…</Text>
      </View>
    );
  }

  if (error && orders.length === 0) {
    return (
      <View style={[styles.center, { paddingTop: Math.max(insets.top, 16) }]}>
        <Ionicons name="cloud-offline-outline" size={46} color="#94a3b8" />
        <Text style={styles.emptyTitle}>Orders unavailable</Text>
        <Text style={styles.emptyText}>{error}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={loadOrders}>
          <Ionicons name="refresh" size={17} color="#fff" />
          <Text style={styles.primaryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!selectedOrder) {
    return (
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Track Orders</Text>
          <Text style={styles.headerSubtitle}>Your real orders and delivery status</Text>
        </View>
        {error && <Text style={styles.inlineError}>{error}</Text>}
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          contentContainerStyle={styles.centerScroll}
        >
          <Ionicons name="cube-outline" size={48} color="#94a3b8" />
          <Text style={styles.emptyTitle}>No orders yet</Text>
          <Text style={styles.emptyText}>Confirmed orders will appear here automatically.</Text>
        </ScrollView>
      </View>
    );
  }

  const currentRank = statusRank[selectedOrder.status] ?? 0;
  const isCancelled = selectedOrder.status === 'cancelled';

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Track Orders</Text>
        <Text style={styles.headerSubtitle}>Real order status from RenewX</Text>
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={17} color="#94a3b8" />
          <TextInput
            value={searchId}
            onChangeText={setSearchId}
            placeholder="Search Order ID or tracking number"
            placeholderTextColor="#9ca3af"
            style={styles.searchInput}
            autoCapitalize="none"
          />
          {searchId.length > 0 && (
            <TouchableOpacity onPress={() => setSearchId('')}>
              <Ionicons name="close-circle" size={17} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {filteredOrders.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.orderChips}>
          {filteredOrders.map((order) => (
            <TouchableOpacity
              key={String(order.id)}
              onPress={() => setSelectedOrderId(String(order.id))}
              style={[styles.orderChip, String(order.id) === String(selectedOrder.id) && styles.orderChipActive]}
            >
              <Text style={[styles.orderChipText, String(order.id) === String(selectedOrder.id) && styles.orderChipTextActive]}>
                #{String(order.id).slice(0, 8)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.scrollContent}
      >
        {error && <Text style={styles.inlineError}>{error}</Text>}

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.orderId}>#{selectedOrder.id}</Text>
              <Text style={styles.muted}>{formatDate(selectedOrder.created_at)}</Text>
            </View>
            <View style={[styles.statusPill, isCancelled ? styles.cancelled : styles.active]}>
              <Text style={[styles.statusText, isCancelled ? styles.cancelledText : styles.activeText]}>
                {String(selectedOrder.status || 'pending').replace(/_/g, ' ')}
              </Text>
            </View>
          </View>

          <Text style={styles.itemName}>{getItemName(selectedOrder)}</Text>
          <Text style={styles.price}>{formatMoney(selectedOrder.total ?? selectedOrder.subtotal)}</Text>

          <View style={styles.infoGrid}>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Courier</Text>
              <Text style={styles.infoValue}>{selectedOrder.courier || 'Assigned after dispatch'}</Text>
            </View>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Tracking</Text>
              <Text style={styles.infoValue}>{selectedOrder.tracking_number || 'Not assigned yet'}</Text>
            </View>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Estimated delivery</Text>
              <Text style={styles.infoValue}>{selectedOrder.estimated_delivery || 'Will update after dispatch'}</Text>
            </View>
          </View>

          {!isCancelled ? (
            <View style={styles.timeline}>
              <Text style={styles.timelineTitle}>Order Progress</Text>
              {STATUS_STEPS.map((step, index) => {
                const completed = currentRank >= statusRank[step.key];
                const current = currentRank === statusRank[step.key];
                const last = index === STATUS_STEPS.length - 1;
                return (
                  <View key={step.key} style={styles.timelineRow}>
                    <View style={styles.timelineRail}>
                      <View style={[styles.dot, completed && styles.dotDone, current && styles.dotCurrent]}>
                        {completed && <Ionicons name="checkmark" size={10} color="#fff" />}
                      </View>
                      {!last && <View style={[styles.line, completed && styles.lineDone]} />}
                    </View>
                    <View style={styles.timelineCopy}>
                      <Text style={[styles.stepTitle, completed && styles.stepDone]}>{step.title}</Text>
                      <Text style={styles.stepDescription}>{step.description}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.cancelledBox}>
              <Ionicons name="close-circle-outline" size={22} color="#b91c1c" />
              <Text style={styles.cancelledBoxText}>This order has been cancelled.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', padding: 28 },
  centerScroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  headerTitle: { fontSize: 24, fontWeight: fontWeight.black, color: colors.text },
  headerSubtitle: { marginTop: 4, color: colors.textMuted, fontSize: fontSize.sm },
  searchSection: { paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  searchBar: {
    minHeight: 44, backgroundColor: '#fff', borderRadius: radius.md, borderWidth: 1,
    borderColor: '#e2e8f0', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: fontSize.sm },
  orderChips: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, gap: 8 },
  orderChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.full, backgroundColor: '#e2e8f0' },
  orderChipActive: { backgroundColor: '#111827' },
  orderChipText: { color: '#475569', fontSize: 11, fontWeight: '700' },
  orderChipTextActive: { color: '#fff' },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: 130 },
  card: { backgroundColor: '#fff', borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: '#e2e8f0' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  orderId: { fontSize: 15, fontWeight: '900', color: colors.text },
  muted: { color: colors.textMuted, fontSize: 11, marginTop: 3 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.full },
  active: { backgroundColor: '#dcfce7' },
  cancelled: { backgroundColor: '#fee2e2' },
  statusText: { fontSize: 10, fontWeight: '800', textTransform: 'capitalize' },
  activeText: { color: '#166534' },
  cancelledText: { color: '#b91c1c' },
  itemName: { fontSize: 18, fontWeight: '900', color: colors.text, lineHeight: 23 },
  price: { marginTop: 5, fontSize: 17, fontWeight: '900', color: colors.text },
  infoGrid: { marginTop: spacing.lg, gap: 8 },
  infoBox: { padding: 11, borderRadius: radius.md, backgroundColor: '#f8fafc' },
  infoLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '700', textTransform: 'uppercase' },
  infoValue: { marginTop: 3, fontSize: 12, color: colors.text, fontWeight: '700' },
  timeline: { marginTop: spacing.lg },
  timelineTitle: { fontSize: 15, fontWeight: '900', color: colors.text, marginBottom: spacing.md },
  timelineRow: { flexDirection: 'row', minHeight: 66 },
  timelineRail: { width: 28, alignItems: 'center' },
  dot: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  dotDone: { backgroundColor: '#059669' },
  dotCurrent: { borderWidth: 3, borderColor: '#a7f3d0' },
  line: { width: 2, flex: 1, backgroundColor: '#e2e8f0', marginVertical: 2 },
  lineDone: { backgroundColor: '#059669' },
  timelineCopy: { flex: 1, paddingLeft: 8, paddingBottom: 12 },
  stepTitle: { fontSize: 13, fontWeight: '800', color: '#64748b' },
  stepDone: { color: colors.text },
  stepDescription: { marginTop: 2, fontSize: 11, color: colors.textMuted, lineHeight: 16 },
  cancelledBox: { marginTop: spacing.lg, padding: 14, borderRadius: radius.md, backgroundColor: '#fef2f2', flexDirection: 'row', alignItems: 'center', gap: 8 },
  cancelledBoxText: { color: '#991b1b', fontSize: 12, fontWeight: '700' },
  inlineError: { marginHorizontal: spacing.lg, marginBottom: spacing.sm, color: '#b45309', fontSize: 11 },
  emptyTitle: { marginTop: spacing.md, fontSize: 18, fontWeight: '900', color: colors.text },
  emptyText: { marginTop: 7, textAlign: 'center', color: colors.textMuted, lineHeight: 20, fontSize: 13 },
  primaryButton: { marginTop: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#111827', paddingHorizontal: 18, paddingVertical: 11, borderRadius: radius.md },
  primaryButtonText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  loadingText: { marginTop: 14, color: colors.textMuted, fontSize: 13 },
  spinnerPlaceholder: { width: 48, height: 48, borderRadius: 24, borderWidth: 4, borderColor: '#e2e8f0', borderTopColor: '#059669' },
});
