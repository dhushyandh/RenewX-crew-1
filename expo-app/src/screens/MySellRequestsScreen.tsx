import { useCallback, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl, ActivityIndicator, Alert, Platform, TextInput } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { api } from '@/services/api';
import { useSafeHeaderTop } from '@/lib/useSafeHeaderTop';
import { useToast } from '@/context/ToastContext';
import HomeHeader from '@/components/HomeHeader';
import { renewxColors, renewxShadows, renewxTextStyle } from '@/design-system';

const STATUS_META: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; bg: string; color: string }> = {
  pending: { label: 'Pending Review', icon: 'time-outline', bg: renewxColors.yellowSoft, color: '#9A6700' },
  approved: { label: 'Approved', icon: 'checkmark-circle-outline', bg: renewxColors.mint, color: renewxColors.emerald },
  rejected: { label: 'Rejected', icon: 'close-circle-outline', bg: '#FEF2F2', color: renewxColors.error },
  scheduled: { label: 'Pickup Scheduled', icon: 'calendar-outline', bg: '#EFF6FF', color: renewxColors.info },
  picked_up: { label: 'Picked Up', icon: 'cube-outline', bg: '#F5F3FF', color: '#6D28D9' },
  inspected: { label: 'Inspection', icon: 'search-outline', bg: '#F5F3FF', color: '#6D28D9' },
  completed: { label: 'Completed', icon: 'checkmark-done-outline', bg: renewxColors.mint, color: renewxColors.emerald },
  cancelled: { label: 'Cancelled', icon: 'ban-outline', bg: renewxColors.surfaceMuted, color: renewxColors.textSecondary },
};

function formatStatus(status: string) {
  return STATUS_META[status] || {
    label: status.replace(/_/g, ' '),
    icon: 'ellipse-outline' as const,
    bg: renewxColors.surfaceMuted,
    color: renewxColors.textSecondary,
  };
}

export default function MySellRequestsScreen() {
  const safeTop = useSafeHeaderTop();
  const navigation = useNavigation<any>();
  const toast = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const data = await api.tradeIn.getMyRequests();
      setItems(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || 'Unable to load your sell requests.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, [load]));

  const handleCopyId = async (displayId: string) => {
    const value = String(displayId || '').trim();
    if (!value) return;
    try {
      if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(value);
        } else if (typeof document !== 'undefined') {
          const textarea = document.createElement('textarea');
          textarea.value = value;
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          textarea.focus();
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
        }
      } else {
        await Clipboard.setStringAsync(value);
      }
      toast.success(`Copied: ${value}`);
    } catch (e) {
      console.warn('[MySellRequestsScreen] Copy failed:', e);
      try {
        await Clipboard.setStringAsync(value);
        toast.success(`Copied: ${value}`);
      } catch {
        toast.info(`Sell Request ID: ${value}`);
      }
    }
  };

  const handleTrackLive = (item: any) => {
    const id = String(item.id || item._id);
    navigation.navigate('MainTabs', {
      screen: 'Track',
      params: {
        type: 'sell_requests',
        id,
      },
    });
  };

  const handleCancelRequest = (item: any) => {
    const id = String(item.id || item._id);
    const deviceName = `${item.brand || 'Device'} ${item.model || ''}`.trim();

    const doCancel = async () => {
      try {
        setCancellingId(id);
        await api.tradeIn.cancel(id, 'Cancelled by user');
        setItems((prev) =>
          prev.map((it) => (String(it.id || it._id) === id ? { ...it, status: 'cancelled' } : it))
        );
        toast.success(`Sell request for ${deviceName} has been cancelled.`, 'Request Cancelled');
      } catch (err: any) {
        toast.error(err?.message || 'Could not cancel request. Please try again.');
      } finally {
        setCancellingId(null);
      }
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm(`Are you sure you want to cancel your sell request for ${deviceName}?`)) {
        doCancel();
      }
    } else {
      Alert.alert(
        'Cancel Sell Request',
        `Are you sure you want to cancel your sell request for ${deviceName}?`,
        [
          { text: 'Keep Request', style: 'cancel' },
          { text: 'Yes, Cancel', style: 'destructive', onPress: doCancel },
        ]
      );
    }
  };

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.trim().toLowerCase();
    return items.filter((it) => {
      const id = String(it.id || it._id || '').toLowerCase();
      const brand = String(it.brand || '').toLowerCase();
      const model = String(it.model || '').toLowerCase();
      const category = String(it.category || '').toLowerCase();
      return (
        id.includes(q) ||
        `rx-sell-${id}`.includes(q) ||
        brand.includes(q) ||
        model.includes(q) ||
        category.includes(q)
      );
    });
  }, [items, searchQuery]);

  const renderItem = ({ item }: { item: any }) => {
    const id = String(item.id || item._id);
    const status = String(item.status || 'pending');
    const meta = formatStatus(status);
    const amount = Number(item.expected_price || item.valuation_amount || 0);
    const canCancel = status === 'pending';
    const isCancelling = cancellingId === id;
    const displayId = item.display_id || `#RX-SELL-${id.slice(-8).toUpperCase()}`;

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.deviceIcon}>
            <Ionicons name="phone-portrait-outline" size={22} color="#0f172a" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.deviceName}>{item.brand} {item.model}</Text>
            <Text style={styles.deviceMeta}>{item.category} • {item.storage || 'Standard'}</Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
            <Ionicons name={meta.icon} size={14} color={meta.color} />
            <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>

        <View style={styles.divider} />
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>Seller Quoted Price</Text>
          <Text style={styles.amount}>₹{amount.toLocaleString('en-IN')}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Sell Request ID</Text>
          <View style={styles.idChipRow}>
            <Text style={styles.value}>{displayId}</Text>
            <TouchableOpacity
              onPress={() => handleCopyId(displayId)}
              style={styles.copyBadge}
              activeOpacity={0.7}
            >
              <Ionicons name="copy-outline" size={12} color={renewxColors.emerald} />
              <Text style={styles.copyBadgeText}>Copy</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Submitted On</Text>
          <Text style={styles.value}>{item.created_at ? new Date(item.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</Text>
        </View>

        {status === 'approved' && (
          <View style={styles.approvedBox}>
            <Ionicons name="checkmark-circle" size={18} color={renewxColors.emerald} />
            <View style={{ flex: 1 }}>
              <Text style={styles.approvedTitle}>Sell request approved</Text>
              <Text style={styles.approvedSub}>Your quote has been approved! Doorstep pickup will be scheduled shortly.</Text>
            </View>
          </View>
        )}

        {/* Action Buttons: Live Tracking & Customer Cancellation */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            onPress={() => handleTrackLive(item)}
            style={styles.trackBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="navigate-outline" size={14} color={renewxColors.black} />
            <Text style={styles.trackBtnText}>Track Live Status</Text>
            <Ionicons name="chevron-forward" size={13} color={renewxColors.black} />
          </TouchableOpacity>

          {canCancel && (
            <TouchableOpacity
              onPress={() => handleCancelRequest(item)}
              disabled={isCancelling}
              style={styles.cancelBtn}
              activeOpacity={0.8}
            >
              {isCancelling ? (
                <ActivityIndicator size="small" color={renewxColors.error} />
              ) : (
                <>
                  <Ionicons name="close-circle-outline" size={14} color={renewxColors.error} />
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={renewxColors.emerald} /></View>;
  }

  return (
    <View style={styles.container}>
      <HomeHeader
        mode="orders"
        title="My Sell Requests"
        onBack={() => navigation.goBack()}
        onFilterPress={load}
      />

      {/* Search Input for Request ID or Device */}
      {items.length > 0 && (
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={16} color={renewxColors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by Sell Request ID (e.g. 104) or Device..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <FlatList
        data={filteredItems}
        keyExtractor={(item) => String(item.id || item._id)}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, filteredItems.length === 0 && { flexGrow: 1, justifyContent: 'center' }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={renewxColors.yellow}
            colors={[renewxColors.yellow, renewxColors.emerald]}
            progressBackgroundColor={renewxColors.surface}
          />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          error ? (
            <View style={styles.empty}>
              <Ionicons name="cloud-offline-outline" size={40} color={renewxColors.textMuted} />
              <Text style={styles.emptyTitle}>Couldn't load requests</Text>
              <Text style={styles.emptyText}>{error}</Text>
              <TouchableOpacity style={styles.retry} onPress={() => { setRefreshing(true); load(); }}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : items.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="pricetag-outline" size={44} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No sell requests yet</Text>
              <Text style={styles.emptyText}>Submit a device from Sell and your request will appear here.</Text>
              <TouchableOpacity style={styles.retry} onPress={() => navigation.navigate('MainTabs', { screen: 'Sell' })}>
                <Text style={styles.retryText}>Sell a Device</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={40} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No matches found</Text>
              <Text style={styles.emptyText}>No sell request matching "{searchQuery}"</Text>
              <TouchableOpacity style={styles.retry} onPress={() => setSearchQuery('')}>
                <Text style={styles.retryText}>Clear Search</Text>
              </TouchableOpacity>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: renewxColors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: renewxColors.background,
  },
  list: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: renewxColors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: renewxColors.border,
    ...(renewxShadows.card as object),
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deviceIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: renewxColors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceName: {
    fontSize: 15.5,
    ...renewxTextStyle('bold'),
    color: renewxColors.black,
  },
  deviceMeta: {
    fontSize: 12,
    ...renewxTextStyle('medium'),
    color: renewxColors.textMuted,
    marginTop: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    maxWidth: 140,
  },
  statusText: {
    fontSize: 10.5,
    ...renewxTextStyle('bold'),
  },
  divider: {
    height: 1,
    backgroundColor: renewxColors.surfaceMuted,
    marginVertical: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    ...renewxTextStyle('medium'),
    color: renewxColors.textMuted,
  },
  value: {
    fontSize: 12.5,
    ...renewxTextStyle('semibold'),
    color: renewxColors.textSecondary,
  },
  amount: {
    fontSize: 15,
    ...renewxTextStyle('extraBold'),
    color: renewxColors.emerald,
  },
  approvedBox: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: renewxColors.mintLight,
    borderWidth: 1,
    borderColor: renewxColors.mintBorder,
  },
  approvedTitle: {
    fontSize: 13,
    ...renewxTextStyle('bold'),
    color: renewxColors.mintDark,
  },
  approvedSub: {
    fontSize: 11.5,
    ...renewxTextStyle('regular'),
    color: renewxColors.emerald,
    marginTop: 2,
    lineHeight: 16,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: renewxColors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: renewxColors.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    ...renewxTextStyle('medium'),
    color: renewxColors.black,
    padding: 0,
    ...Platform.select({ web: { outlineStyle: 'none' } as any }),
  },
  idChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  copyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: renewxColors.mint,
    borderWidth: 1,
    borderColor: renewxColors.mintBorder,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  copyBadgeText: {
    fontSize: 11,
    ...renewxTextStyle('bold'),
    color: renewxColors.emerald,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: renewxColors.surfaceMuted,
  },
  trackBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: renewxColors.yellow,
    borderWidth: 1,
    borderColor: renewxColors.yellowDark,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  trackBtnText: {
    fontSize: 12.5,
    ...renewxTextStyle('bold'),
    color: renewxColors.black,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FEF2F2',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  cancelBtnText: {
    fontSize: 12,
    ...renewxTextStyle('bold'),
    color: renewxColors.error,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyTitle: {
    fontSize: 18,
    ...renewxTextStyle('extraBold'),
    color: renewxColors.black,
    marginTop: 12,
  },
  emptyText: {
    fontSize: 13,
    ...renewxTextStyle('regular'),
    color: renewxColors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 6,
    marginBottom: 18,
  },
  retry: {
    backgroundColor: renewxColors.yellow,
    borderWidth: 1,
    borderColor: renewxColors.yellowDark,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 12,
  },
  retryText: {
    color: renewxColors.black,
    fontSize: 13,
    ...renewxTextStyle('bold'),
  },
});
