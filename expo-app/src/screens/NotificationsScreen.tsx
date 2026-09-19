import { useCallback, useState } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { RootStackParamList } from '@/App';
import { api } from '@/services/api';

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

  useFocusEffect(useCallback(() => {
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, [load]));

  const refresh = async () => {
    setRefreshing(true);
    await load();
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

  const iconFor = (type: string) => {
    if (type === 'trade_in') return 'cash-outline';
    if (type === 'order') return 'cube-outline';
    return 'notifications-outline';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={21} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>{unreadCount ? unreadCount + ' unread update' + (unreadCount === 1 ? '' : 's') : 'You are all caught up'}</Text>
        </View>
        <TouchableOpacity onPress={markAllRead} disabled={!unreadCount} style={styles.readAll}>
          <Text style={[styles.readAllText, !unreadCount && styles.disabledText]}>Read all</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
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
            <Ionicons name="notifications-off-outline" size={36} color="#94a3b8" />
            <Text style={styles.stateTitle}>No notifications yet</Text>
            <Text style={styles.stateText}>Order and sell-request updates will appear here.</Text>
          </View>
        ) : (
          items.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.notificationCard, !item.read_at && styles.unreadCard]}
              onPress={() => markRead(item)}
              activeOpacity={0.8}
            >
              <View style={styles.iconCircle}>
                <Ionicons name={iconFor(item.type) as any} size={20} color="#111827" />
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
          ))
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
  back: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '900', color: '#0f172a' },
  subtitle: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  readAll: { padding: 6 },
  readAllText: { fontSize: 11, fontWeight: '800', color: '#b45309' },
  disabledText: { color: '#cbd5e1' },
  content: { padding: 16, paddingBottom: 120 },
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
