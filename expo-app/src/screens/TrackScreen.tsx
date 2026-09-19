import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme';
import { useAuth } from '@/context/AuthContext';

type Order = any;
type SearchMode = 'order' | 'phone';

const STATUS_STEPS = [
  {
    key: 'verified',
    title: 'Order Confirmed',
    description: 'Your order has been confirmed.',
    icon: 'checkmark-circle-outline',
  },
  {
    key: 'processing',
    title: 'Processing',
    description: 'Your device is being prepared.',
    icon: 'cube-outline',
  },
  {
    key: 'shipped',
    title: 'Shipped',
    description: 'The package has left our facility.',
    icon: 'car-outline',
  },
  {
    key: 'out_for_delivery',
    title: 'Out for Delivery',
    description: 'Your order is on the way to you.',
    icon: 'navigate-outline',
  },
  {
    key: 'delivered',
    title: 'Delivered',
    description: 'Your order has been delivered.',
    icon: 'home-outline',
  },
] as const;

const STATUS_RANK: Record<string, number> = {
  pending: 0,
  verified: 1,
  confirmed: 1,
  processing: 2,
  shipped: 3,
  out_for_delivery: 4,
  delivered: 5,
  cancelled: -1,
};

function normalizePhone(value: string) {
  return value.replace(/\D/g, '').slice(-10);
}

function formatMoney(value: unknown) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '₹0';
  return `₹${amount.toLocaleString('en-IN')}`;
}

function formatDate(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getOrderItemName(order: Order) {
  return (
    order?.order_items?.[0]?.product_name ||
    order?.items?.[0]?.product_name ||
    order?.items?.[0]?.name ||
    order?.product_name ||
    'RenewX device'
  );
}

function getOrderImage(order: Order) {
  return (
    order?.order_items?.[0]?.product_image ||
    order?.items?.[0]?.product_image ||
    order?.product_image ||
    null
  );
}

function getPhoneCandidates(order: Order) {
  return [
    order?.phone,
    order?.phone_number,
    order?.customer_phone,
    order?.user_phone,
    order?.shipping_phone,
    order?.shipping_address?.phone,
    order?.shipping_address?.phone_number,
    order?.pickup_phone,
  ]
    .filter(Boolean)
    .map((value) => normalizePhone(String(value)));
}

function unwrapOrders(response: any): Order[] {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.orders)) return response.orders;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.orders)) return response.data.orders;
  return [];
}

function statusLabel(status?: string) {
  return String(status || 'pending')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getRank(status?: string) {
  return STATUS_RANK[String(status || 'pending').toLowerCase()] ?? 0;
}

export default function TrackScreen() {
  const { user } = useAuth();

  const [searchMode, setSearchMode] = useState<SearchMode>('order');
  const [query, setQuery] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const selectedOrder = useMemo(
    () =>
      orders.find(
        (order) => String(order?.id) === String(selectedOrderId),
      ) || null,
    [orders, selectedOrderId],
  );

  const loadMyOrders = useCallback(async () => {
    if (!user) {
      setOrders([]);
      setSelectedOrderId(null);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const response = await api.orders.getAll();
      const next = unwrapOrders(response);

      setOrders(next);
      setSelectedOrderId((current) => {
        if (current && next.some((order) => String(order?.id) === String(current))) {
          return current;
        }
        return next[0]?.id ? String(next[0].id) : null;
      });
    } catch (err: any) {
      setError(err?.message || 'Unable to load your orders.');
      setOrders([]);
      setSelectedOrderId(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadMyOrders();
  }, [loadMyOrders]);

  const searchOrders = useCallback(async () => {
    const value = query.trim();

    if (!value) {
      setError(
        searchMode === 'phone'
          ? 'Enter the 10-digit mobile number used for the order.'
          : 'Enter your order ID or tracking number.',
      );
      return;
    }

    if (searchMode === 'phone' && normalizePhone(value).length !== 10) {
      setError('Enter a valid 10-digit mobile number.');
      return;
    }

    setSearching(true);
    setSearched(true);
    setError(null);

    try {
      let response: any;

      if (searchMode === 'phone') {
        const phone = normalizePhone(value);

        // The orders API accepts an optional phone filter. Casting keeps this
        // screen compatible with older api.ts typings while the backend is
        // being upgraded to support public phone lookup.
        response = await (api.orders.getAll as any)({ phone });

        let found = unwrapOrders(response);

        // If the API returned a broader result set, keep only orders whose
        // stored customer/shipping/pickup phone matches the searched number.
        const exact = found.filter((order) =>
          getPhoneCandidates(order).includes(phone),
        );

        if (exact.length > 0) found = exact;

        setOrders(found);
        setSelectedOrderId(found[0]?.id ? String(found[0].id) : null);

        if (!found.length) {
          setError('No order was found for this mobile number.');
        }
      } else {
        const needle = value.toLowerCase();

        // Authenticated users can search the orders already available to them.
        // This keeps order/tracking-number search working with the existing API.
        const responseForSearch = await api.orders.getAll();
        const all = unwrapOrders(responseForSearch);

        const found = all.filter((order) => {
          const id = String(order?.id || '').toLowerCase();
          const tracking = String(order?.tracking_number || '').toLowerCase();
          const reference = String(
            order?.order_number || order?.order_id || order?.reference || '',
          ).toLowerCase();

          return (
            id.includes(needle) ||
            tracking.includes(needle) ||
            reference.includes(needle)
          );
        });

        setOrders(found);
        setSelectedOrderId(found[0]?.id ? String(found[0].id) : null);

        if (!found.length) {
          setError('No order matched that ID or tracking number.');
        }
      }
    } catch (err: any) {
      setOrders([]);
      setSelectedOrderId(null);
      setError(
        err?.message ||
          (searchMode === 'phone'
            ? 'Phone lookup is currently unavailable.'
            : 'Unable to search orders right now.'),
      );
    } finally {
      setSearching(false);
    }
  }, [query, searchMode]);

  const clearSearch = () => {
    setQuery('');
    setError(null);
    setSearched(false);

    if (user) {
      loadMyOrders();
    } else {
      setOrders([]);
      setSelectedOrderId(null);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (searched && query.trim()) {
      await searchOrders();
    } else {
      await loadMyOrders();
    }
    setRefreshing(false);
  };

  const currentRank = getRank(selectedOrder?.status);
  const isCancelled =
    String(selectedOrder?.status || '').toLowerCase() === 'cancelled';

  const imageAvailable = Boolean(getOrderImage(selectedOrder));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>RENEWX CREW</Text>
            <Text style={styles.title}>Track your order</Text>
            <Text style={styles.subtitle}>
              Enter your order details and see the latest delivery status.
            </Text>
          </View>

          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>

        <View style={styles.lookupCard}>
          <Text style={styles.lookupTitle}>Find your order</Text>
          <Text style={styles.lookupSubtitle}>
            Track with your order ID, tracking number, or mobile number.
          </Text>

          <View style={styles.modeSwitch}>
            <TouchableOpacity
              style={[
                styles.modeButton,
                searchMode === 'order' && styles.modeButtonActive,
              ]}
              onPress={() => {
                setSearchMode('order');
                setQuery('');
                setError(null);
                setSearched(false);
              }}
              activeOpacity={0.85}
            >
              <Ionicons
                name="cube-outline"
                size={16}
                color={searchMode === 'order' ? '#fff' : colors.textMuted}
              />
              <Text
                style={[
                  styles.modeText,
                  searchMode === 'order' && styles.modeTextActive,
                ]}
              >
                Order ID
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeButton,
                searchMode === 'phone' && styles.modeButtonActive,
              ]}
              onPress={() => {
                setSearchMode('phone');
                setQuery('');
                setError(null);
                setSearched(false);
              }}
              activeOpacity={0.85}
            >
              <Ionicons
                name="call-outline"
                size={16}
                color={searchMode === 'phone' ? '#fff' : colors.textMuted}
              />
              <Text
                style={[
                  styles.modeText,
                  searchMode === 'phone' && styles.modeTextActive,
                ]}
              >
                Mobile Number
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.inputWrap, error && styles.inputWrapError]}>
            <Ionicons
              name={searchMode === 'phone' ? 'call-outline' : 'search-outline'}
              size={19}
              color={colors.textMuted}
            />

            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={
                searchMode === 'phone'
                  ? 'Enter 10-digit mobile number'
                  : 'Order ID or tracking number'
              }
              placeholderTextColor="#9ca3af"
              keyboardType={searchMode === 'phone' ? 'phone-pad' : 'default'}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={searchMode === 'phone' ? 10 : 80}
              style={styles.input}
              returnKeyType="search"
              onSubmitEditing={searchOrders}
            />

            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Ionicons
                  name="close-circle"
                  size={19}
                  color="#cbd5e1"
                />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[styles.searchButton, searching && styles.buttonDisabled]}
            onPress={searchOrders}
            disabled={searching}
            activeOpacity={0.85}
          >
            {searching ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="search" size={17} color="#fff" />
            )}
            <Text style={styles.searchButtonText}>
              {searching ? 'Searching...' : 'Track Order'}
            </Text>
          </TouchableOpacity>

          {error && (
            <View style={styles.errorBox}>
              <Ionicons
                name="information-circle-outline"
                size={17}
                color="#b45309"
              />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={searchOrders}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {!searched && !selectedOrder && user && !loading && orders.length > 0 && (
          <View style={styles.recentHeader}>
            <View>
              <Text style={styles.sectionTitle}>Your recent orders</Text>
              <Text style={styles.sectionSubtitle}>Tap an order to view its status.</Text>
            </View>
            <Text style={styles.orderCount}>{orders.length}</Text>
          </View>
        )}

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>Loading your orders...</Text>
          </View>
        ) : selectedOrder ? (
          <View style={styles.resultCard}>
            <View style={styles.resultTop}>
              <View style={styles.resultIcon}>
                <Ionicons name="cube-outline" size={21} color={colors.primary} />
              </View>

              <View style={styles.resultTopCopy}>
                <Text style={styles.resultLabel}>ORDER</Text>
                <Text style={styles.resultId}>#{String(selectedOrder.id)}</Text>
                <Text style={styles.resultDate}>
                  Placed {formatDate(selectedOrder.created_at)}
                </Text>
              </View>

              <View
                style={[
                  styles.statusBadge,
                  isCancelled && styles.statusBadgeCancelled,
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    isCancelled && styles.statusDotCancelled,
                  ]}
                />
                <Text
                  style={[
                    styles.statusBadgeText,
                    isCancelled && styles.statusBadgeTextCancelled,
                  ]}
                >
                  {statusLabel(selectedOrder.status)}
                </Text>
              </View>
            </View>

            <View style={styles.deviceRow}>
              <View style={[styles.deviceThumb, !imageAvailable && styles.deviceThumbFallback]}>
                <Ionicons
                  name="phone-portrait-outline"
                  size={24}
                  color={colors.textMuted}
                />
              </View>

              <View style={styles.deviceCopy}>
                <Text style={styles.deviceName} numberOfLines={2}>
                  {getOrderItemName(selectedOrder)}
                </Text>
                <Text style={styles.deviceMeta}>
                  {selectedOrder?.tracking_number
                    ? `Tracking: ${selectedOrder.tracking_number}`
                    : 'Tracking number will appear after dispatch'}
                </Text>
              </View>

              <Text style={styles.devicePrice}>
                {formatMoney(selectedOrder?.total ?? selectedOrder?.subtotal)}
              </Text>
            </View>

            <View style={styles.deliveryGrid}>
              <View style={styles.deliveryItem}>
                <Ionicons name="car-outline" size={17} color={colors.primary} />
                <View>
                  <Text style={styles.deliveryLabel}>Courier</Text>
                  <Text style={styles.deliveryValue}>
                    {selectedOrder?.courier || 'Not assigned'}
                  </Text>
                </View>
              </View>

              <View style={styles.deliveryItem}>
                <Ionicons name="calendar-outline" size={17} color={colors.primary} />
                <View>
                  <Text style={styles.deliveryLabel}>Estimated delivery</Text>
                  <Text style={styles.deliveryValue}>
                    {formatDateTime(selectedOrder?.estimated_delivery)}
                  </Text>
                </View>
              </View>
            </View>

            {isCancelled ? (
              <View style={styles.cancelledBox}>
                <Ionicons
                  name="close-circle-outline"
                  size={22}
                  color="#b91c1c"
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cancelledTitle}>Order cancelled</Text>
                  <Text style={styles.cancelledText}>
                    This order is no longer being processed.
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.timelineSection}>
                <View style={styles.timelineHeader}>
                  <Text style={styles.timelineTitle}>Delivery progress</Text>
                  <Text style={styles.timelineStatus}>
                    {statusLabel(selectedOrder?.status)}
                  </Text>
                </View>

                {STATUS_STEPS.map((step, index) => {
                  const stepRank = STATUS_RANK[step.key];
                  const completed = currentRank >= stepRank;
                  const current = currentRank === stepRank;
                  const last = index === STATUS_STEPS.length - 1;

                  return (
                    <View key={step.key} style={styles.timelineRow}>
                      <View style={styles.rail}>
                        <View
                          style={[
                            styles.timelineIcon,
                            completed && styles.timelineIconDone,
                            current && styles.timelineIconCurrent,
                          ]}
                        >
                          <Ionicons
                            name={step.icon as any}
                            size={15}
                            color={completed ? '#fff' : '#94a3b8'}
                          />
                        </View>

                        {!last && (
                          <View
                            style={[
                              styles.timelineLine,
                              completed && currentRank > stepRank && styles.timelineLineDone,
                            ]}
                          />
                        )}
                      </View>

                      <View style={styles.timelineCopy}>
                        <Text
                          style={[
                            styles.stepTitle,
                            completed && styles.stepTitleDone,
                          ]}
                        >
                          {step.title}
                        </Text>
                        <Text style={styles.stepDescription}>
                          {step.description}
                        </Text>
                      </View>

                      {current && (
                        <View style={styles.currentPill}>
                          <Text style={styles.currentPillText}>CURRENT</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        ) : searched ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="search-outline"
                size={28}
                color={colors.textMuted}
              />
            </View>
            <Text style={styles.emptyTitle}>No order found</Text>
            <Text style={styles.emptyText}>
              Check the details you entered and try again.
            </Text>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={clearSearch}
            >
              <Text style={styles.secondaryButtonText}>Search again</Text>
            </TouchableOpacity>
          </View>
        ) : !user ? (
          <View style={styles.guestCard}>
            <View style={styles.guestIcon}>
              <Ionicons name="call-outline" size={23} color={colors.primary} />
            </View>
            <View style={styles.guestCopy}>
              <Text style={styles.guestTitle}>Track without signing in</Text>
              <Text style={styles.guestText}>
                Use the mobile number attached to your order to check its status.
              </Text>
            </View>
          </View>
        ) : orders.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="cube-outline"
                size={28}
                color={colors.textMuted}
              />
            </View>
            <Text style={styles.emptyTitle}>No orders yet</Text>
            <Text style={styles.emptyText}>
              Your confirmed orders will appear here automatically.
            </Text>
          </View>
        ) : (
          <View style={styles.recentList}>
            {orders.slice(0, 5).map((order) => (
              <TouchableOpacity
                key={String(order.id)}
                style={styles.recentOrder}
                onPress={() => setSelectedOrderId(String(order.id))}
                activeOpacity={0.82}
              >
                <View style={styles.recentOrderIcon}>
                  <Ionicons
                    name="cube-outline"
                    size={18}
                    color={colors.textMuted}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.recentOrderId}>
                    #{String(order.id)}
                  </Text>
                  <Text style={styles.recentOrderName} numberOfLines={1}>
                    {getOrderItemName(order)}
                  </Text>
                </View>

                <View style={styles.recentOrderRight}>
                  <Text style={styles.recentOrderPrice}>
                    {formatMoney(order?.total ?? order?.subtotal)}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={17}
                    color="#94a3b8"
                  />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {selectedOrder && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={clearSearch}
            activeOpacity={0.8}
          >
            <Ionicons name="search-outline" size={15} color={colors.textMuted} />
            <Text style={styles.clearButtonText}>Track another order</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: 130,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },

  eyebrow: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    letterSpacing: 1.4,
    color: colors.primary,
    marginBottom: 4,
  },

  title: {
    fontSize: 27,
    lineHeight: 32,
    fontWeight: fontWeight.black,
    color: colors.text,
    letterSpacing: -0.7,
  },

  subtitle: {
    marginTop: 5,
    maxWidth: 285,
    fontSize: fontSize.sm,
    lineHeight: 19,
    color: colors.textMuted,
  },

  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: '#ecfdf5',
  },

  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },

  liveText: {
    fontSize: 9,
    fontWeight: fontWeight.bold,
    color: '#047857',
    letterSpacing: 0.7,
  },

  lookupCard: {
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: spacing.md,
    marginBottom: spacing.md,
  },

  lookupTitle: {
    fontSize: 17,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },

  lookupSubtitle: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 16,
    color: colors.textMuted,
  },

  modeSwitch: {
    flexDirection: 'row',
    gap: 6,
    padding: 4,
    backgroundColor: '#f1f5f9',
    borderRadius: radius.md,
    marginTop: spacing.md,
  },

  modeButton: {
    flex: 1,
    minHeight: 38,
    borderRadius: radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  modeButtonActive: {
    backgroundColor: colors.primary,
  },

  modeText: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
  },

  modeTextActive: {
    color: '#fff',
  },

  inputWrap: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: radius.md,
    paddingHorizontal: 13,
    marginTop: spacing.sm,
    backgroundColor: '#fff',
  },

  inputWrapError: {
    borderColor: '#fbbf24',
  },

  input: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.sm,
    paddingVertical: 0,
  },

  searchButton: {
    minHeight: 48,
    marginTop: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  buttonDisabled: {
    opacity: 0.65,
  },

  searchButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: fontWeight.bold,
  },

  errorBox: {
    marginTop: spacing.sm,
    padding: 10,
    borderRadius: radius.sm,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  errorText: {
    flex: 1,
    color: '#92400e',
    fontSize: 10,
    lineHeight: 15,
  },

  retryText: {
    color: '#92400e',
    fontSize: 10,
    fontWeight: fontWeight.bold,
  },

  loadingCard: {
    minHeight: 150,
    borderRadius: radius.lg,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },

  loadingText: {
    marginTop: 9,
    fontSize: 12,
    color: colors.textMuted,
  },

  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },

  sectionSubtitle: {
    marginTop: 2,
    fontSize: 10,
    color: colors.textMuted,
  },

  orderCount: {
    minWidth: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    textAlign: 'center',
    textAlignVertical: 'center',
    color: colors.text,
    fontSize: 11,
    fontWeight: fontWeight.bold,
  },

  recentList: {
    gap: 8,
  },

  recentOrder: {
    minHeight: 66,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: radius.md,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  recentOrderIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },

  recentOrderId: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },

  recentOrderName: {
    marginTop: 2,
    fontSize: 10,
    color: colors.textMuted,
  },

  recentOrderRight: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 7,
  },

  recentOrderPrice: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },

  resultCard: {
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },

  resultTop: {
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  resultIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  resultTopCopy: {
    flex: 1,
  },

  resultLabel: {
    fontSize: 8,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
    letterSpacing: 1.1,
  },

  resultId: {
    marginTop: 1,
    fontSize: 15,
    fontWeight: fontWeight.black,
    color: colors.text,
  },

  resultDate: {
    marginTop: 2,
    fontSize: 9,
    color: colors.textMuted,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ecfdf5',
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },

  statusBadgeCancelled: {
    backgroundColor: '#fef2f2',
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },

  statusDotCancelled: {
    backgroundColor: '#ef4444',
  },

  statusBadgeText: {
    color: '#047857',
    fontSize: 9,
    fontWeight: fontWeight.bold,
  },

  statusBadgeTextCancelled: {
    color: '#b91c1c',
  },

  deviceRow: {
    marginHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  deviceThumb: {
    width: 58,
    height: 58,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },

  deviceThumbFallback: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  deviceCopy: {
    flex: 1,
  },

  deviceName: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },

  deviceMeta: {
    marginTop: 4,
    fontSize: 9,
    lineHeight: 14,
    color: colors.textMuted,
  },

  devicePrice: {
    fontSize: 13,
    fontWeight: fontWeight.black,
    color: colors.text,
  },

  deliveryGrid: {
    padding: spacing.md,
    gap: 8,
  },

  deliveryItem: {
    minHeight: 50,
    paddingHorizontal: 11,
    borderRadius: radius.md,
    backgroundColor: '#f8fafc',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  deliveryLabel: {
    fontSize: 8,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    fontWeight: fontWeight.bold,
  },

  deliveryValue: {
    marginTop: 2,
    fontSize: 11,
    color: colors.text,
    fontWeight: fontWeight.bold,
  },

  timelineSection: {
    padding: spacing.md,
  },

  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },

  timelineTitle: {
    fontSize: 15,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },

  timelineStatus: {
    fontSize: 9,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    textTransform: 'uppercase',
  },

  timelineRow: {
    minHeight: 69,
    flexDirection: 'row',
  },

  rail: {
    width: 36,
    alignItems: 'center',
  },

  timelineIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  timelineIconDone: {
    backgroundColor: colors.primary,
  },

  timelineIconCurrent: {
    borderWidth: 3,
    borderColor: '#bbf7d0',
  },

  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 2,
  },

  timelineLineDone: {
    backgroundColor: colors.primary,
  },

  timelineCopy: {
    flex: 1,
    paddingLeft: 8,
    paddingBottom: 13,
  },

  stepTitle: {
    fontSize: 12,
    fontWeight: fontWeight.bold,
    color: '#94a3b8',
  },

  stepTitleDone: {
    color: colors.text,
  },

  stepDescription: {
    marginTop: 2,
    paddingRight: 8,
    fontSize: 10,
    lineHeight: 15,
    color: colors.textMuted,
  },

  currentPill: {
    alignSelf: 'flex-start',
    marginTop: 3,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: '#ecfdf5',
  },

  currentPillText: {
    fontSize: 7,
    fontWeight: fontWeight.bold,
    color: '#047857',
    letterSpacing: 0.5,
  },

  emptyCard: {
    minHeight: 250,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },

  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyTitle: {
    marginTop: spacing.md,
    fontSize: 17,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },

  emptyText: {
    marginTop: 6,
    maxWidth: 280,
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 17,
    color: colors.textMuted,
  },

  secondaryButton: {
    marginTop: spacing.md,
    paddingHorizontal: 17,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#dbe2ea',
  },

  secondaryButtonText: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },

  guestCard: {
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },

  guestIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  guestCopy: {
    flex: 1,
  },

  guestTitle: {
    fontSize: 13,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },

  guestText: {
    marginTop: 3,
    fontSize: 10,
    lineHeight: 15,
    color: colors.textMuted,
  },

  cancelledBox: {
    margin: spacing.md,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: '#fef2f2',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  cancelledTitle: {
    fontSize: 12,
    fontWeight: fontWeight.bold,
    color: '#991b1b',
  },

  cancelledText: {
    marginTop: 2,
    fontSize: 10,
    color: '#b91c1c',
  },

  clearButton: {
    alignSelf: 'center',
    marginTop: spacing.md,
    paddingVertical: 9,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  clearButtonText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: fontWeight.bold,
  },
});
