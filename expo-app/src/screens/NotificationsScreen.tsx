import { useCallback, useState } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Alert, Image, Platform, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { RootStackParamList } from '@/App';
import { api } from '@/services/api';
import { getNotificationPermissionStatus, requestNotificationPermission } from '@/services/pushNotifications';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function NotificationsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [items, setItems] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const result = await api.notifications.getAll();
      setItems(result.data || []);
      setUnreadCount(Number(result.unreadCount || 0));
    } catch (err: any) {
      setError(err?.message || 'Unable to load notifications');
    }
  }, []);

  const [permissionGranted, setPermissionGranted] = useState(true);

  const checkPermission = useCallback(async () => {
    if (Platform.OS === 'web') return;
    const status = await getNotificationPermissionStatus();
    setPermissionGranted(status.granted);
  }, []);

  useFocusEffect(useCallback(() => {
    load();
    checkPermission();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, [load, checkPermission]));

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([load(), checkPermission()]);
    setRefreshing(false);
  };

  const markRead = async (item: any) => {
    if (item.read_at) return;
    try {
      await api.notifications.markRead(item.id);
      setItems((current) => current.map((notification) =>
        notification.id === item.id ? { ...notification, read_at: new Date().toISOString() } : notification
      ));
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch {
      // Keep the notification unread if the server update failed.
    }
  };

  const markAllRead = async () => {
    if (!unreadCount) return;
    await api.notifications.markAllRead();
    setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at || new Date().toISOString() })));
    setUnreadCount(0);
  };

  const [testing, setTesting] = useState(false);

  const triggerTest = async (action: string) => {
    setTesting(true);
    try {
      await api.notifications.triggerTest(action);
      await load();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to dispatch test notification');
    } finally {
      setTesting(false);
    }
  };

  const handleTestPress = () => {
    Alert.alert(
      'Test System Push Notification',
      'Select which event notification to send directly to your phone:',
      [
        { text: '✨ New Arrival (All Users)', onPress: () => triggerTest('new_arrival') },
        { text: '🚚 Order Shipped', onPress: () => triggerTest('order_shipped') },
        { text: '🏠 Out for Delivery', onPress: () => triggerTest('out_for_delivery') },
        { text: '✅ Order Delivered', onPress: () => triggerTest('order_delivered') },
        { text: '📱 Sell Request Submitted', onPress: () => triggerTest('trade_in_submitted') },
        { text: '💰 Valuation Updated', onPress: () => triggerTest('trade_in_valuation_changed') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const getEventVisuals = (item: any) => {
    const title = item.title?.toLowerCase() || '';
    const type = item.type || '';

    // ✨ New Arrival / New Product Added
    if (title.includes('new arrival') || title.includes('new product') || type === 'product') {
      return { icon: 'sparkles-outline', color: '#8b5cf6', bg: '#f5f3ff' };
    }
    // 1. 🛒 Order placed -> Order placed successfully
    if (title.includes('order placed') || title.includes('placed successfully')) {
      return { icon: 'cart-outline', color: '#2563eb', bg: '#eff6ff' };
    }
    // 2. 💳 Payment successful -> Payment confirmed
    if (title.includes('payment confirmed') || title.includes('payment successful')) {
      return { icon: 'card-outline', color: '#059669', bg: '#ecfdf5' };
    }
    // 4. 🚚 Order shipped -> Shipment update
    if (title.includes('shipment update') || title.includes('shipped')) {
      return { icon: 'car-outline', color: '#0284c7', bg: '#f0f9ff' };
    }
    // 5. 🏠 Out for delivery -> Delivery update
    if (title.includes('delivery update') || title.includes('out for delivery')) {
      return { icon: 'home-outline', color: '#d97706', bg: '#fffbeb' };
    }
    // 6. ✅ Order delivered -> Order delivered
    if (title.includes('order delivered') || title.includes('delivered')) {
      return { icon: 'checkmark-done-circle-outline', color: '#16a34a', bg: '#f0fdf4' };
    }
    // 7. ❌ Order cancelled -> Order cancelled
    if (title.includes('order cancelled') || title.includes('cancelled')) {
      return { icon: 'close-circle-outline', color: '#dc2626', bg: '#fef2f2' };
    }
    // 8. 💰 Refund initiated/completed -> Refund update
    if (title.includes('refund update') || title.includes('refund')) {
      return { icon: 'cash-outline', color: '#0d9488', bg: '#f0fdfa' };
    }
    // 3. 📦 Order status changed -> Order status updated
    if (title.includes('order status') || type === 'order') {
      return { icon: 'cube-outline', color: '#4b5563', bg: '#f3f4f6' };
    }
    // 9. 📱 Trade-in submitted -> Sell request submitted
    if (title.includes('sell request submitted') || title.includes('trade-in submitted')) {
      return { icon: 'phone-portrait-outline', color: '#6366f1', bg: '#eef2ff' };
    }
    // 11. 💰 Trade-in valuation/amount changed -> Valuation updated
    if (title.includes('valuation updated') || title.includes('valuation')) {
      return { icon: 'pricetag-outline', color: '#059669', bg: '#ecfdf5' };
    }
    // 12. 📅 Pickup scheduled -> Pickup scheduled
    if (title.includes('pickup scheduled')) {
      return { icon: 'calendar-outline', color: '#ea580c', bg: '#fff7ed' };
    }
    // 13. 📦 Pickup completed -> Device picked up
    if (title.includes('device picked up') || title.includes('pickup completed')) {
      return { icon: 'checkmark-circle-outline', color: '#10b981', bg: '#ecfdf5' };
    }
    // 10. 🔄 Trade-in status changed -> Sell request updated
    if (title.includes('sell request') || type === 'trade_in') {
      return { icon: 'sync-outline', color: '#0891b2', bg: '#ecfeff' };
    }
    // 14. ⚙️ Important account/security event -> Account/security update
    if (title.includes('account') || title.includes('security') || type === 'security') {
      return { icon: 'shield-checkmark-outline', color: '#7c3aed', bg: '#f5f3ff' };
    }

    return { icon: 'notifications-outline', color: '#4b5563', bg: '#f3f4f6', useCustomIcon: true };
  };

  const handleNotificationPress = async (item: any) => {
    await markRead(item);

    if (item.reference_type === 'product' || item.type === 'product') {
      navigation.navigate('ProductDetail', { id: item.reference_id });
    } else if (item.reference_type === 'order' || item.type === 'order') {
      navigation.navigate('MainTabs', { screen: 'Orders' as any });
    } else if (item.reference_type === 'trade_in' || item.type === 'trade_in') {
      navigation.navigate('MySellRequests');
    } else if (item.reference_type === 'security' || item.type === 'security') {
      navigation.navigate('Security');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={21} color="#0f172a" />
        </TouchableOpacity>
        <Image
          source={require('@/assets/notification-icon.png')}
          style={styles.headerLogo}
          resizeMode="contain"
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>{unreadCount ? unreadCount + ' unread update' + (unreadCount === 1 ? '' : 's') : 'You are all caught up'}</Text>
        </View>
        <TouchableOpacity onPress={handleTestPress} disabled={testing} style={styles.testBtn}>
          <Ionicons name="paper-plane-outline" size={13} color="#047857" />
          <Text style={styles.testBtnText}>{testing ? '...' : 'Test'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={markAllRead} disabled={!unreadCount} style={styles.readAll}>
          <Text style={[styles.readAllText, !unreadCount && styles.disabledText]}>Read all</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        {!permissionGranted && (
          <View style={styles.permissionWarning}>
            <View style={styles.permissionWarningIcon}>
              <Ionicons name="notifications-off" size={16} color="#b45309" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.permissionWarningTitle}>Notifications are turned off</Text>
              <Text style={styles.permissionWarningText}>
                Enable notifications so you never miss live updates.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.permissionEnableBtn}
              onPress={async () => {
                const granted = await requestNotificationPermission();
                if (granted) setPermissionGranted(true);
              }}
            >
              <Text style={styles.permissionEnableText}>Enable</Text>
            </TouchableOpacity>
          </View>
        )}

        {error ? (
          <View style={styles.stateCard}>
            <Ionicons name="cloud-offline-outline" size={32} color="#64748b" />
            <Text style={styles.stateTitle}>Could not load notifications</Text>
            <Text style={styles.stateText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={load}>
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.stateCard}>
            <Image
              source={require('@/assets/notification-icon.png')}
              style={styles.emptyLogo}
              resizeMode="contain"
            />
            <Text style={styles.stateTitle}>No notifications yet</Text>
            <Text style={styles.stateText}>Order and sell-request updates will appear here.</Text>
          </View>
        ) : (
          items.map((item) => {
            const visual = getEventVisuals(item);
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.notificationCard, !item.read_at && styles.unreadCard]}
                onPress={() => handleNotificationPress(item)}
                activeOpacity={0.8}
              >
                <View style={[styles.iconCircle, { backgroundColor: visual.bg }]}>
                  {visual.useCustomIcon ? (
                    <Image
                      source={require('@/assets/notification-icon.png')}
                      style={{ width: 22, height: 22 }}
                      resizeMode="contain"
                    />
                  ) : (
                    <Ionicons name={visual.icon as any} size={20} color={visual.color} />
                  )}
                </View>
                <View style={styles.textWrap}>
                  <View style={styles.titleRow}>
                    <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                    {!item.read_at && <View style={styles.unreadDot} />}
                  </View>
                  <Text style={styles.body}>{item.body}</Text>
                  <Text style={styles.time}>{formatDate(item.created_at)}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

function formatDate(value: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f7f2' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16,
    paddingTop: 16, paddingBottom: 14, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#ebe7dd',
  },
  headerLogo: { width: 32, height: 32, borderRadius: 8 },
  back: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '900', color: '#0f172a' },
  subtitle: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    marginRight: 4,
  },
  testBtnText: { fontSize: 11, fontWeight: '800', color: '#047857' },
  readAll: { padding: 6 },
  readAllText: { fontSize: 11, fontWeight: '800', color: '#b45309' },
  disabledText: { color: '#cbd5e1' },
  content: { padding: 16, paddingBottom: 120 },
  permissionWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  permissionWarningIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionWarningTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400e',
  },
  permissionWarningText: {
    fontSize: 11,
    color: '#b45309',
    marginTop: 2,
    lineHeight: 15,
  },
  permissionEnableBtn: {
    backgroundColor: '#d97706',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  permissionEnableText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  emptyLogo: { width: 64, height: 64, marginBottom: 10 },
  notificationCard: {
    flexDirection: 'row', gap: 12, backgroundColor: '#fff', padding: 14,
    borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: '#e8e4da',
  },
  unreadCard: { borderColor: '#fcd34d', backgroundColor: '#fffbeb' },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ffc400', alignItems: 'center', justifyContent: 'center' },
  textWrap: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemTitle: { flex: 1, fontSize: 13, fontWeight: '900', color: '#111827' },
  unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#f59e0b' },
  body: { fontSize: 11, lineHeight: 16, color: '#4b5563', marginTop: 4 },
  time: { fontSize: 9, color: '#9ca3af', marginTop: 7 },
  stateCard: { backgroundColor: '#fff', borderRadius: 18, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: '#e8e4da' },
  stateTitle: { fontSize: 14, fontWeight: '900', color: '#111827', marginTop: 10 },
  stateText: { fontSize: 11, color: '#6b7280', textAlign: 'center', lineHeight: 16, marginTop: 5 },
  retryButton: { backgroundColor: '#0f172a', paddingHorizontal: 18, paddingVertical: 9, borderRadius: 10, marginTop: 14 },
  retryText: { color: '#fff', fontSize: 11, fontWeight: '800' },
});
