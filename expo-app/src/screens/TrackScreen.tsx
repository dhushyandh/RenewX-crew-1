import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Image,
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
import { api, getApiBaseUrl } from '@/services/api';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import { useSafeHeaderTop } from '@/lib/useSafeHeaderTop';

type Order = Record<string, any>;
type SearchMode = 'order' | 'phone';
type SocketState = 'connecting' | 'connected' | 'reconnecting' | 'offline';

const STATUS_STEPS = [
  { key: 'verified', title: 'Order Confirmed', description: 'Your order has been confirmed.', icon: 'checkmark-circle-outline' },
  { key: 'processing', title: 'Processing', description: 'Your device is being prepared.', icon: 'cube-outline' },
  { key: 'shipped', title: 'Shipped', description: 'The package has left our facility.', icon: 'car-outline' },
  { key: 'out_for_delivery', title: 'Out for Delivery', description: 'Your order is on the way to you.', icon: 'navigate-outline' },
  { key: 'delivered', title: 'Delivered', description: 'Your order has been delivered.', icon: 'home-outline' },
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
  refunded: -1,
};

const TERMINAL_STATUSES = new Set(['delivered', 'cancelled', 'refunded']);
const WS_MAX_RECONNECT_DELAY = 30000;

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
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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

function getWsBaseUrl() {
  const configured = process.env.EXPO_PUBLIC_WS_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');

  const apiUrl = getApiBaseUrl().replace(/\/+$/, '');
  const wsUrl = apiUrl.replace(/^https:/i, 'wss:').replace(/^http:/i, 'ws:');
  return wsUrl.replace(/\/api$/i, '');
}

function buildTrackingSocketUrl(orderId: string) {
  const base = getWsBaseUrl();
  return `${base}/ws/orders/${encodeURIComponent(orderId)}`;
}

function parseSocketMessage(raw: string): { order?: Order; status?: string; orderId?: string } | null {
  try {
    const event = JSON.parse(raw);
    const payload = event?.data ?? event?.payload ?? event;
    const order = payload?.order ?? (payload?.id ? payload : undefined);

    return {
      order,
      status: payload?.status ?? payload?.order_status ?? order?.status,
      orderId: String(
        payload?.orderId ??
          payload?.order_id ??
          order?.id ??
          event?.orderId ??
          event?.order_id ??
          '',
      ) || undefined,
    };
  } catch {
    return null;
  }
}

function mergeOrder(previous: Order, incoming?: Order, status?: string) {
  if (!incoming && !status) return previous;
  const next = incoming ? { ...previous, ...incoming } : { ...previous };
  if (status) next.status = status;
  next.updated_at = incoming?.updated_at || new Date().toISOString();
  return next;
}

export default function TrackScreen() {
  const safeTop = useSafeHeaderTop();
  const { user, token } = useAuth();

  const [searchMode, setSearchMode] = useState<SearchMode>('order');
  const [query, setQuery] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [socketState, setSocketState] = useState<SocketState>('offline');
  const [lastLiveUpdate, setLastLiveUpdate] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const shouldReconnectRef = useRef(true);

  const selectedOrder = useMemo(
    () =>
      orders.find((order) => String(order?.id) === String(selectedOrderId)) || null,
    [orders, selectedOrderId],
  );

  const upsertOrder = useCallback((nextOrder: Order) => {
    setOrders((current) => {
      const id = String(nextOrder?.id || '');
      if (!id) return current;

      const exists = current.some((order) => String(order?.id) === id);
      if (!exists) return [nextOrder, ...current];

      return current.map((order) =>
        String(order?.id) === id ? { ...order, ...nextOrder } : order,
      );
    });
  }, []);

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
        if (current && next.some((order) => String(order?.id) === String(current))) return current;
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
      if (searchMode === 'phone') {
        const phone = normalizePhone(value);
        const response = await (api.orders.getAll as any)({ phone });
        let found = unwrapOrders(response);

        const exact = found.filter((order) => getPhoneCandidates(order).includes(phone));
        if (exact.length > 0) found = exact;

        setOrders(found);
        setSelectedOrderId(found[0]?.id ? String(found[0].id) : null);

        if (!found.length) setError('No order was found for this mobile number.');
      } else {
        const needle = value.toLowerCase();
        const response = await api.orders.getAll();
        const all = unwrapOrders(response);

        const found = all.filter((order) => {
          const id = String(order?.id || '').toLowerCase();
          const tracking = String(order?.tracking_number || '').toLowerCase();
          const reference = String(
            order?.order_number || order?.order_id || order?.reference || '',
          ).toLowerCase();

          return id.includes(needle) || tracking.includes(needle) || reference.includes(needle);
        });

        setOrders(found);
        setSelectedOrderId(found[0]?.id ? String(found[0].id) : null);

        if (!found.length) setError('No order matched that ID or tracking number.');
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

  const clearSearch = useCallback(() => {
    setQuery('');
    setError(null);
    setSearched(false);

    if (user) {
      loadMyOrders();
    } else {
      setOrders([]);
      setSelectedOrderId(null);
    }
  }, [loadMyOrders, user]);

  const refreshSelectedOrder = useCallback(async (orderId: string) => {
    try {
      const fresh = await api.orders.getById(orderId);
      if (fresh) {
        upsertOrder(fresh);
        setLastLiveUpdate(new Date().toISOString());
      }
    } catch {
      // WebSocket remains the live channel; a temporary REST failure should not
      // destroy an already-rendered tracking state.
    }
  }, [upsertOrder]);

  const connectTrackingSocket = useCallback(() => {
    const orderId = selectedOrderId;
    if (!orderId || !token) {
      setSocketState('offline');
      return;
    }

    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    shouldReconnectRef.current = true;
    setSocketState(reconnectAttemptRef.current > 0 ? 'reconnecting' : 'connecting');

    let socket: WebSocket;
    try {
      socket = new WebSocket(buildTrackingSocketUrl(orderId));
      socketRef.current = socket;
    } catch {
      setSocketState('offline');
      return;
    }

    socket.onopen = () => {
      reconnectAttemptRef.current = 0;
      setSocketState('connected');

      // Authentication is sent as a message rather than putting the JWT in the
      // WebSocket URL, avoiding credentials in URLs, proxy logs and analytics.
      socket.send(
        JSON.stringify({
          type: 'auth',
          token,
        }),
      );

      socket.send(
        JSON.stringify({
          type: 'subscribe',
          channel: 'order',
          orderId,
        }),
      );

      refreshSelectedOrder(orderId);
    };

    socket.onmessage = (message) => {
      const parsed = parseSocketMessage(String(message.data));
      if (!parsed) return;

      if (parsed.orderId && String(parsed.orderId) !== String(orderId)) return;

      if (parsed.order || parsed.status) {
        setOrders((current) =>
          current.map((order) =>
            String(order?.id) === String(orderId)
              ? mergeOrder(order, parsed.order, parsed.status)
              : order,
          ),
        );
        setLastLiveUpdate(new Date().toISOString());
      }

      if (parsed.status && TERMINAL_STATUSES.has(String(parsed.status).toLowerCase())) {
        shouldReconnectRef.current = false;
        socket.close(1000, 'Order reached terminal state');
      }
    };

    socket.onerror = () => {
      // onclose owns reconnecting so the UI does not flicker between states.
    };

    socket.onclose = () => {
      if (socketRef.current === socket) socketRef.current = null;
      if (!shouldReconnectRef.current) {
        setSocketState('offline');
        return;
      }

      const attempt = reconnectAttemptRef.current;
      const delay = Math.min(1000 * 2 ** attempt, WS_MAX_RECONNECT_DELAY);
      reconnectAttemptRef.current = Math.min(attempt + 1, 6);
      setSocketState('reconnecting');

      reconnectTimerRef.current = setTimeout(() => {
        connectTrackingSocket();
      }, delay);
    };
  }, [refreshSelectedOrder, selectedOrderId, token]);

  useEffect(() => {
    shouldReconnectRef.current = true;
    reconnectAttemptRef.current = 0;

    if (!selectedOrderId || !token) {
      if (socketRef.current) socketRef.current.close();
      socketRef.current = null;
      setSocketState('offline');
      return;
    }

    connectTrackingSocket();

    return () => {
      shouldReconnectRef.current = false;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.close(1000, 'Tracking screen closed');
        socketRef.current = null;
      }
      setSocketState('offline');
    };
  }, [connectTrackingSocket, selectedOrderId, token]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && selectedOrderId && token) {
        connectTrackingSocket();
      }
    });

    return () => subscription.remove();
  }, [connectTrackingSocket, selectedOrderId, token]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (searched && query.trim()) await searchOrders();
      else await loadMyOrders();

      if (selectedOrderId) await refreshSelectedOrder(selectedOrderId);
    } finally {
      setRefreshing(false);
    }
  };

  const currentRank = getRank(selectedOrder?.status);
  const normalizedStatus = String(selectedOrder?.status || '').toLowerCase();
  const isCancelled = normalizedStatus === 'cancelled' || normalizedStatus === 'refunded';
  const imageUrl = getOrderImage(selectedOrder);
  const liveEnabled = Boolean(selectedOrderId && token);

  const socketLabel =
    socketState === 'connected'
      ? 'LIVE'
      : socketState === 'connecting'
        ? 'CONNECTING'
        : socketState === 'reconnecting'
          ? 'RECONNECTING'
          : liveEnabled
            ? 'OFFLINE'
            : 'SIGN IN FOR LIVE';

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={[styles.container, { paddingTop: safeTop }]}>
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
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>RENEWX CREW</Text>
              <Text style={styles.title}>Track your order</Text>
              <Text style={styles.subtitle}>
                Follow your device from confirmation to delivery with live updates.
              </Text>
            </View>

            <View
              style={[
                styles.liveBadge,
                socketState === 'connected' && styles.liveBadgeActive,
              ]}
            >
              <View
                style={[
                  styles.liveDot,
                  socketState === 'connected' && styles.liveDotActive,
                ]}
              />
              <Text
                style={[
                  styles.liveText,
                  socketState === 'connected' && styles.liveTextActive,
                ]}
              >
                {socketLabel}
              </Text>
            </View>
          </View>

          <View style={styles.lookupCard}>
            <View style={styles.cardHeadingRow}>
              <View style={styles.cardIcon}>
                <Ionicons name="location-outline" size={18} color={colors.primary} />
              </View>
              <View style={styles.cardHeadingCopy}>
                <Text style={styles.lookupTitle}>Find an order</Text>
                <Text style={styles.lookupSubtitle}>
                  Use an order ID, tracking number, or mobile number.
                </Text>
              </View>
            </View>

            <View style={styles.modeSwitch}>
              {(['order', 'phone'] as SearchMode[]).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[styles.modeButton, searchMode === mode && styles.modeButtonActive]}
                  onPress={() => {
                    setSearchMode(mode);
                    setQuery('');
                    setError(null);
                    setSearched(false);
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name={mode === 'phone' ? 'call-outline' : 'cube-outline'}
                    size={16}
                    color={searchMode === mode ? '#111' : colors.textMuted}
                  />
                  <Text
                    style={[styles.modeText, searchMode === mode && styles.modeTextActive]}
                  >
                    {mode === 'phone' ? 'Mobile Number' : 'Order / Tracking ID'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={[styles.inputWrap, error && styles.inputWrapError]}>
              <Ionicons
                name={searchMode === 'phone' ? 'call-outline' : 'search-outline'}
                size={18}
                color={colors.textMuted}
              />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={
                  searchMode === 'phone'
                    ? '10-digit mobile number'
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
                <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={19} color="#cbd5e1" />
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
                <ActivityIndicator size="small" color="#111" />
              ) : (
                <Ionicons name="search" size={17} color="#111" />
              )}
              <Text style={styles.searchButtonText}>
                {searching ? 'Searching…' : 'Track Order'}
              </Text>
            </TouchableOpacity>

            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={17} color="#92400e" />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={searchOrders} hitSlop={8}>
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {loading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>Loading your orders…</Text>
            </View>
          ) : selectedOrder ? (
            <View style={styles.resultCard}>
              <View style={styles.resultTop}>
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
                <View style={styles.deviceThumb}>
                  {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={styles.deviceImage} />
                  ) : (
                    <Ionicons
                      name="phone-portrait-outline"
                      size={24}
                      color={colors.textMuted}
                    />
                  )}
                </View>

                <View style={styles.deviceCopy}>
                  <Text style={styles.deviceName} numberOfLines={2}>
                    {getOrderItemName(selectedOrder)}
                  </Text>
                  <Text style={styles.deviceMeta}>
                    {selectedOrder?.tracking_number
                      ? `Tracking · ${selectedOrder.tracking_number}`
                      : 'Tracking number will appear after dispatch'}
                  </Text>
                </View>

                <Text style={styles.devicePrice}>
                  {formatMoney(selectedOrder?.total ?? selectedOrder?.subtotal)}
                </Text>
              </View>

              <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                  <View style={styles.infoIcon}>
                    <Ionicons name="car-outline" size={16} color={colors.primary} />
                  </View>
                  <View style={styles.infoCopy}>
                    <Text style={styles.infoLabel}>Courier service</Text>
                    <Text style={styles.infoValue}>
                      {selectedOrder?.courier || 'Not assigned'}
                    </Text>
                    {selectedOrder?.courier_phone ? (
                      <Text style={styles.deliveryPhone}>
                        {selectedOrder.courier_phone}
                      </Text>
                    ) : null}
                  </View>
                </View>

                <View style={styles.infoItem}>
                  <View style={styles.infoIcon}>
                    <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                  </View>
                  <View style={styles.infoCopy}>
                    <Text style={styles.infoLabel}>Estimated delivery</Text>
                    <Text style={styles.infoValue}>
                      {formatDate(selectedOrder?.estimated_delivery)}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.liveStrip}>
                <View style={styles.liveStripIcon}>
                  <Ionicons
                    name={socketState === 'connected' ? 'radio-outline' : 'cloud-offline-outline'}
                    size={15}
                    color={socketState === 'connected' ? '#166534' : '#92400e'}
                  />
                </View>
                <View style={styles.liveStripCopy}>
                  <Text style={styles.liveStripTitle}>
                    {socketState === 'connected'
                      ? 'Live tracking connected'
                      : token
                        ? 'Live tracking reconnecting'
                        : 'Sign in for live tracking'}
                  </Text>
                  <Text style={styles.liveStripText}>
                    {lastLiveUpdate
                      ? `Last update ${formatDateTime(lastLiveUpdate)}`
                      : 'The screen also supports pull-to-refresh as a fallback.'}
                  </Text>
                </View>
              </View>

              {isCancelled ? (
                <View style={styles.cancelledBox}>
                  <Ionicons name="close-circle-outline" size={22} color="#b91c1c" />
                  <View style={styles.cancelledCopy}>
                    <Text style={styles.cancelledTitle}>
                      {normalizedStatus === 'refunded' ? 'Order refunded' : 'Order cancelled'}
                    </Text>
                    <Text style={styles.cancelledText}>
                      This order is no longer moving through delivery.
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.timelineSection}>
                  <View style={styles.timelineHeader}>
                    <View>
                      <Text style={styles.timelineTitle}>Delivery progress</Text>
                      <Text style={styles.timelineSubtitle}>
                        Status updates appear here automatically.
                      </Text>
                    </View>
                    <Text style={styles.timelineStatus}>
                      {statusLabel(selectedOrder.status)}
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
                              color={completed ? '#111' : '#94a3b8'}
                            />
                          </View>

                          {!last && (
                            <View
                              style={[
                                styles.timelineLine,
                                completed &&
                                  currentRank > stepRank &&
                                  styles.timelineLineDone,
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
                          <Text style={styles.stepDescription}>{step.description}</Text>
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
                <Ionicons name="search-outline" size={27} color={colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>No order found</Text>
              <Text style={styles.emptyText}>
                Check the details you entered and try again.
              </Text>
              <TouchableOpacity style={styles.secondaryButton} onPress={clearSearch}>
                <Text style={styles.secondaryButtonText}>Search again</Text>
              </TouchableOpacity>
            </View>
          ) : !user ? (
            <View style={styles.guestCard}>
              <View style={styles.guestIcon}>
                <Ionicons name="shield-checkmark-outline" size={23} color={colors.primary} />
              </View>
              <View style={styles.guestCopy}>
                <Text style={styles.guestTitle}>Track without an account</Text>
                <Text style={styles.guestText}>
                  Use the mobile number attached to your order. Sign in to receive
                  authenticated real-time WebSocket updates.
                </Text>
              </View>
            </View>
          ) : orders.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <Ionicons name="cube-outline" size={28} color={colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>No orders yet</Text>
              <Text style={styles.emptyText}>
                Your confirmed orders will appear here automatically.
              </Text>
            </View>
          ) : (
            <View>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Recent orders</Text>
                  <Text style={styles.sectionSubtitle}>Tap one to open live tracking.</Text>
                </View>
                <View style={styles.orderCount}>
                  <Text style={styles.orderCountText}>{orders.length}</Text>
                </View>
              </View>

              <View style={styles.recentList}>
                {orders.slice(0, 5).map((order) => (
                  <TouchableOpacity
                    key={String(order.id)}
                    style={styles.recentOrder}
                    onPress={() => setSelectedOrderId(String(order.id))}
                    activeOpacity={0.82}
                  >
                    <View style={styles.recentOrderIcon}>
                      <Ionicons name="cube-outline" size={18} color={colors.primary} />
                    </View>

                    <View style={styles.recentOrderCopy}>
                      <Text style={styles.recentOrderId}>#{String(order.id)}</Text>
                      <Text style={styles.recentOrderName} numberOfLines={1}>
                        {getOrderItemName(order)}
                      </Text>
                    </View>

                    <View style={styles.recentOrderRight}>
                      <Text style={styles.recentOrderPrice}>
                        {formatMoney(order?.total ?? order?.subtotal)}
                      </Text>
                      <Ionicons name="chevron-forward" size={17} color="#9ca3af" />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
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

          <View style={styles.footerNote}>
            <Ionicons name="lock-closed-outline" size={12} color="#9ca3af" />
            <Text style={styles.footerText}>RenewX secure order tracking</Text>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: 130 },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: spacing.md,
  },
  headerCopy: { flex: 1 },
  eyebrow: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    letterSpacing: 1.4,
    color: colors.primary,
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    lineHeight: 33,
    fontWeight: fontWeight.black,
    color: colors.text,
    letterSpacing: -0.8,
  },
  subtitle: {
    marginTop: 5,
    maxWidth: 315,
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
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  liveBadgeActive: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#94a3b8' },
  liveDotActive: { backgroundColor: '#16a34a' },
  liveText: {
    fontSize: 8,
    fontWeight: fontWeight.bold,
    color: '#64748b',
    letterSpacing: 0.7,
  },
  liveTextActive: { color: '#166534' },

  lookupCard: {
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#fff7cc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeadingCopy: { flex: 1 },
  lookupTitle: { fontSize: 17, fontWeight: fontWeight.bold, color: colors.text },
  lookupSubtitle: { marginTop: 2, fontSize: 10, lineHeight: 15, color: colors.textMuted },

  modeSwitch: {
    flexDirection: 'row',
    gap: 5,
    padding: 4,
    backgroundColor: '#f5f5f3',
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  modeButton: {
    flex: 1,
    minHeight: 39,
    borderRadius: radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  modeButtonActive: { backgroundColor: '#ffc400' },
  modeText: { fontSize: 10, fontWeight: fontWeight.bold, color: colors.textMuted },
  modeTextActive: { color: '#111' },

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
  inputWrapError: { borderColor: '#f59e0b' },
  input: { flex: 1, color: colors.text, fontSize: fontSize.sm, paddingVertical: 0 },
  searchButton: {
    minHeight: 48,
    marginTop: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: '#ffc400',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonDisabled: { opacity: 0.65 },
  searchButtonText: { color: '#111', fontSize: 13, fontWeight: fontWeight.bold },

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
  errorText: { flex: 1, color: '#92400e', fontSize: 10, lineHeight: 15 },
  retryText: { color: '#92400e', fontSize: 10, fontWeight: fontWeight.bold },

  loadingCard: {
    minHeight: 170,
    borderRadius: radius.lg,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  loadingText: { marginTop: 9, fontSize: 12, color: colors.textMuted },

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
  resultTopCopy: { flex: 1 },
  resultLabel: {
    fontSize: 8,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
    letterSpacing: 1.1,
  },
  resultId: {
    marginTop: 1,
    fontSize: 16,
    fontWeight: fontWeight.black,
    color: colors.text,
  },
  resultDate: { marginTop: 2, fontSize: 9, color: colors.textMuted },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fff7cc',
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  statusBadgeCancelled: { backgroundColor: '#fef2f2' },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#d39e00' },
  statusDotCancelled: { backgroundColor: '#ef4444' },
  statusBadgeText: { color: '#7a5b00', fontSize: 9, fontWeight: fontWeight.bold },
  statusBadgeTextCancelled: { color: '#b91c1c' },

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
    width: 60,
    height: 60,
    borderRadius: 15,
    backgroundColor: '#f7f7f5',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceImage: { width: '100%', height: '100%' },
  deviceCopy: { flex: 1 },
  deviceName: { fontSize: 13, lineHeight: 18, fontWeight: fontWeight.bold, color: colors.text },
  deviceMeta: { marginTop: 4, fontSize: 9, lineHeight: 14, color: colors.textMuted },
  devicePrice: { fontSize: 13, fontWeight: fontWeight.black, color: colors.text },

  infoGrid: { padding: spacing.md, gap: 8 },
  infoItem: {
    minHeight: 52,
    paddingHorizontal: 11,
    borderRadius: radius.md,
    backgroundColor: '#f8fafc',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  infoIcon: {
    width: 31,
    height: 31,
    borderRadius: 10,
    backgroundColor: '#fff7cc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCopy: { flex: 1 },
  infoLabel: {
    fontSize: 8,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    fontWeight: fontWeight.bold,
  },
  infoValue: { marginTop: 2, fontSize: 11, color: colors.text, fontWeight: fontWeight.bold },

  liveStrip: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: 11,
    borderRadius: radius.md,
    backgroundColor: '#f7f7f5',
    borderWidth: 1,
    borderColor: '#eeeeea',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  deliveryPhone: {
    fontSize: 11,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginTop: 2,
  },
  liveStripIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: '#fff7cc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveStripCopy: { flex: 1 },
  liveStripTitle: { fontSize: 11, fontWeight: fontWeight.bold, color: colors.text },
  liveStripText: { marginTop: 2, fontSize: 9, lineHeight: 14, color: colors.textMuted },

  timelineSection: { padding: spacing.md, paddingTop: 0 },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: 10,
  },
  timelineTitle: { fontSize: 15, fontWeight: fontWeight.bold, color: colors.text },
  timelineSubtitle: { marginTop: 2, fontSize: 9, color: colors.textMuted },
  timelineStatus: {
    fontSize: 9,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    textTransform: 'uppercase',
  },
  timelineRow: { minHeight: 69, flexDirection: 'row' },
  rail: { width: 36, alignItems: 'center' },
  timelineIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineIconDone: { backgroundColor: '#ffc400' },
  timelineIconCurrent: { borderWidth: 3, borderColor: '#fff0a8' },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#e2e8f0', marginVertical: 2 },
  timelineLineDone: { backgroundColor: '#ffc400' },
  timelineCopy: { flex: 1, paddingLeft: 8, paddingBottom: 13 },
  stepTitle: { fontSize: 12, fontWeight: fontWeight.bold, color: '#94a3b8' },
  stepTitleDone: { color: colors.text },
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
    backgroundColor: '#fff7cc',
  },
  currentPillText: {
    fontSize: 7,
    fontWeight: fontWeight.bold,
    color: '#7a5b00',
    letterSpacing: 0.5,
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
  cancelledCopy: { flex: 1 },
  cancelledTitle: { fontSize: 12, fontWeight: fontWeight.bold, color: '#991b1b' },
  cancelledText: { marginTop: 2, fontSize: 10, lineHeight: 15, color: '#b91c1c' },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: { fontSize: 17, fontWeight: fontWeight.bold, color: colors.text },
  sectionSubtitle: { marginTop: 2, fontSize: 10, color: colors.textMuted },
  orderCount: {
    minWidth: 28,
    height: 28,
    paddingHorizontal: 7,
    borderRadius: 14,
    backgroundColor: '#fff7cc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderCountText: { color: '#7a5b00', fontSize: 11, fontWeight: fontWeight.bold },
  recentList: { gap: 8 },
  recentOrder: {
    minHeight: 68,
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
    width: 39,
    height: 39,
    borderRadius: 12,
    backgroundColor: '#fff7cc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentOrderCopy: { flex: 1 },
  recentOrderId: { fontSize: 11, fontWeight: fontWeight.bold, color: colors.text },
  recentOrderName: { marginTop: 2, fontSize: 10, color: colors.textMuted },
  recentOrderRight: { alignItems: 'center', flexDirection: 'row', gap: 7 },
  recentOrderPrice: { fontSize: 11, fontWeight: fontWeight.bold, color: colors.text },

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
    backgroundColor: '#f5f5f3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { marginTop: spacing.md, fontSize: 17, fontWeight: fontWeight.bold, color: colors.text },
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
  secondaryButtonText: { fontSize: 11, fontWeight: fontWeight.bold, color: colors.text },

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
    backgroundColor: '#fff7cc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestCopy: { flex: 1 },
  guestTitle: { fontSize: 13, fontWeight: fontWeight.bold, color: colors.text },
  guestText: { marginTop: 3, fontSize: 10, lineHeight: 15, color: colors.textMuted },

  clearButton: {
    alignSelf: 'center',
    marginTop: spacing.md,
    paddingVertical: 9,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  clearButtonText: { fontSize: 11, color: colors.textMuted, fontWeight: fontWeight.bold },

  footerNote: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  footerText: { fontSize: 9, color: '#9ca3af' },
});
