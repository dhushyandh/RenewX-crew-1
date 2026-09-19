import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';

export default function ConnectionStatusBanner() {
  const [checking, setChecking] = useState(false);
  const [offline, setOffline] = useState(false);

  const check = useCallback(async () => {
    setChecking(true);
    try {
      const result = await api.health();
      setOffline(result?.status !== 'healthy');
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    check();
    const timer = setInterval(check, 30000);
    return () => clearInterval(timer);
  }, [check]);

  if (!offline) return null;

  return (
    <View style={styles.banner}>
      <Ionicons name="cloud-offline-outline" size={17} color="#92400e" />
      <View style={styles.copy}>
        <Text style={styles.title}>Connection unavailable</Text>
        <Text style={styles.text}>RenewX is offline. Saved session data remains available.</Text>
      </View>
      <TouchableOpacity onPress={check} disabled={checking} style={styles.retry}>
        {checking ? <ActivityIndicator size="small" color="#92400e" /> : <Text style={styles.retryText}>Retry</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 8,
    left: 12,
    right: 12,
    zIndex: 100,
    minHeight: 52,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  copy: { flex: 1 },
  title: { fontSize: 12, fontWeight: '800', color: '#78350f' },
  text: { marginTop: 2, fontSize: 10, color: '#92400e' },
  retry: { minWidth: 46, alignItems: 'center', paddingVertical: 7 },
  retryText: { fontSize: 11, fontWeight: '800', color: '#92400e' },
});
