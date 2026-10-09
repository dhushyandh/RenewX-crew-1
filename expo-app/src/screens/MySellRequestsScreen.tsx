import { useCallback, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl, ActivityIndicator, Alert, Platform, TextInput } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { api } from '@/services/api';
import { useSafeHeaderTop } from '@/lib/useSafeHeaderTop';
import { useToast } from '@/context/ToastContext';
import HomeHeader from '@/components/HomeHeader';

const STATUS_META: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; bg: string; color: string }> = {
  pending: { label: 'Pending Review', icon: 'time-outline', bg: '#fff7ed', color: '#c2410c' },
  approved: { label: 'Approved', icon: 'checkmark-circle-outline', bg: '#ecfdf5', color: '#047857' },
  rejected: { label: 'Rejected', icon: 'close-circle-outline', bg: '#fef2f2', color: '#b91c1c' },
  scheduled: { label: 'Pickup Scheduled', icon: 'calendar-outline', bg: '#eff6ff', color: '#1d4ed8' },
  picked_up: { label: 'Picked Up', icon: 'cube-outline', bg: '#f5f3ff', color: '#6d28d9' },
  inspected: { label: 'Inspection', icon: 'search-outline', bg: '#f5f3ff', color: '#6d28d9' },
  completed: { label: 'Completed', icon: 'checkmark-done-outline', bg: '#ecfdf5', color: '#047857' },
  cancelled: { label: 'Cancelled', icon: 'ban-outline', bg: '#f3f4f6', color: '#4b5563' },
};

function formatStatus(status: string) {
  return STATUS_META[status] || { label: status.replace(/_/g, ' '), icon: 'ellipse-outline' as const, bg: '#f3f4f6', color: '#475569' };
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
              <Ionicons name="copy-outline" size={12} color="#0284c7" />
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
            <Ionicons name="checkmark-circle" size={18} color="#047857" />
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
            <Ionicons name="navigate-outline" size={14} color="#ffffff" />
            <Text style={styles.trackBtnText}>Track Live Status</Text>
            <Ionicons name="chevron-forward" size={13} color="#ffffff" />
          </TouchableOpacity>

          {canCancel && (
            <TouchableOpacity
              onPress={() => handleCancelRequest(item)}
              disabled={isCancelling}
              style={styles.cancelBtn}
              activeOpacity={0.8}
            >
              {isCancelling ? (
                <ActivityIndicator size="small" color="#dc2626" />
              ) : (
                <>
                  <Ionicons name="close-circle-outline" size={14} color="#dc2626" />
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
    return <View style={styles.center}><ActivityIndicator size="large" color="#059669" /></View>;
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
            <Ionicons name="search" size={16} color="#64748b" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by Sell Request ID (e.g. 104) or Device..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color="#94a3b8" />
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
            tintColor="#FFC400"
            colors={['#FFC400', '#10B981']}
            progressBackgroundColor="#FFFFFF"
          />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          error ? (
            <View style={styles.empty}>
              <Ionicons name="cloud-offline-outline" size={40} color="#64748b" />
              <Text style={styles.emptyTitle}>Couldn't load requests</Text>
              <Text style={styles.emptyText}>{error}</Text>
              <TouchableOpacity style={styles.retry} onPress={() => { setRefreshing(true); load(); }}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : items.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="pricetag-outline" size={44} color="#94a3b8" />
              <Text style={styles.emptyTitle}>No sell requests yet</Text>
              <Text style={styles.emptyText}>Submit a device from Sell and your request will appear here.</Text>
              <TouchableOpacity style={styles.retry} onPress={() => navigation.navigate('MainTabs', { screen: 'Sell' })}>
                <Text style={styles.retryText}>Sell a Device</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={40} color="#94a3b8" />
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

const styles=StyleSheet.create({
  container:{flex:1,backgroundColor:'#f8f7f2'},
  center:{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:'#f8f7f2'},
  header:{flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:16,paddingTop:8,paddingBottom:14,backgroundColor:'#fff',borderBottomWidth:1,borderBottomColor:'#e5e7eb'},
  back:{width:38,height:38,borderRadius:19,alignItems:'center',justifyContent:'center',backgroundColor:'#f1f5f9'},
  refresh:{width:38,height:38,borderRadius:19,alignItems:'center',justifyContent:'center',backgroundColor:'#f1f5f9'},
  title:{fontSize:20,fontWeight:'900',color:'#0f172a'},
  subtitle:{fontSize:11,color:'#64748b',marginTop:2},
  list:{padding:16,gap:12},
  card:{backgroundColor:'#fff',borderRadius:16,padding:15,borderWidth:1,borderColor:'#e5e7eb'},
  cardTop:{flexDirection:'row',alignItems:'center',gap:10},
  deviceIcon:{width:42,height:42,borderRadius:12,backgroundColor:'#f8fafc',alignItems:'center',justifyContent:'center'},
  deviceName:{fontSize:15,fontWeight:'800',color:'#0f172a'},
  deviceMeta:{fontSize:11,color:'#64748b',marginTop:3},
  statusPill:{flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:8,paddingVertical:5,borderRadius:10,maxWidth:135},
  statusText:{fontSize:9,fontWeight:'800'},
  divider:{height:1,backgroundColor:'#eef2f7',marginVertical:12},
  infoRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:7},
  label:{fontSize:11,color:'#64748b'},
  value:{fontSize:11,fontWeight:'700',color:'#334155'},
  amount:{fontSize:14,fontWeight:'900',color:'#047857'},
  approvedBox:{flexDirection:'row',gap:9,alignItems:'center',marginTop:8,padding:11,borderRadius:12,backgroundColor:'#ecfdf5',borderWidth:1,borderColor:'#a7f3d0'},
  approvedTitle:{fontSize:12,fontWeight:'900',color:'#065f46'},
  approvedSub:{fontSize:10,color:'#047857',marginTop:2},
  liveTrackerBadge:{flexDirection:'row',alignItems:'center',gap:5,backgroundColor:'#ecfdf5',paddingHorizontal:10,paddingVertical:6,borderRadius:12,borderWidth:1,borderColor:'#a7f3d0'},
  liveTrackerBadgeText:{fontSize:11,fontWeight:'800',color:'#047857'},
  searchContainer:{paddingHorizontal:16,paddingTop:12,paddingBottom:4},
  searchBar:{flexDirection:'row',alignItems:'center',backgroundColor:'#fff',paddingHorizontal:12,paddingVertical:9,borderRadius:12,borderWidth:1,borderColor:'#e2e8f0',gap:8},
  searchInput:{flex:1,fontSize:12,fontWeight:'600',color:'#0f172a',padding:0},
  idChipRow:{flexDirection:'row',alignItems:'center',gap:6},
  copyBadge:{flexDirection:'row',alignItems:'center',gap:3,backgroundColor:'#e0f2fe',paddingHorizontal:6,paddingVertical:2,borderRadius:6},
  copyBadgeText:{fontSize:10,fontWeight:'700',color:'#0284c7'},
  actionRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10,marginTop:12,paddingTop:12,borderTopWidth:1,borderTopColor:'#f1f5f9'},
  trackBtn:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,backgroundColor:'#0f172a',paddingVertical:9,paddingHorizontal:12,borderRadius:10},
  trackBtnText:{fontSize:12,fontWeight:'800',color:'#ffffff'},
  cancelBtn:{flexDirection:'row',alignItems:'center',gap:5,backgroundColor:'#fef2f2',paddingVertical:8,paddingHorizontal:12,borderRadius:10,borderWidth:1,borderColor:'#fca5a5'},
  cancelBtnText:{fontSize:11,fontWeight:'800',color:'#dc2626'},
  empty:{flex:1,alignItems:'center',justifyContent:'center',padding:30},
  emptyTitle:{fontSize:17,fontWeight:'900',color:'#0f172a',marginTop:10},
  emptyText:{fontSize:12,color:'#64748b',textAlign:'center',lineHeight:18,marginTop:5,marginBottom:16},
  retry:{backgroundColor:'#0f172a',paddingHorizontal:18,paddingVertical:11,borderRadius:10},
  retryText:{color:'#ffc400',fontSize:12,fontWeight:'900'}
});
