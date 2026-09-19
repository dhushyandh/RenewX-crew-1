import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import type { RootStackParamList } from '@/App';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
const SETTINGS_KEY = '@renewx_settings';

type Settings = {
  orderUpdates: boolean;
  sellRequestUpdates: boolean;
  marketing: boolean;
};

const defaults: Settings = {
  orderUpdates: true,
  sellRequestUpdates: true,
  marketing: false,
};

export default function SettingsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, signOut } = useAuth();
  const [settings, setSettings] = useState<Settings>(defaults);
  const [savingKey, setSavingKey] = useState<keyof Settings | null>(null);
  const [loadingPreferences, setLoadingPreferences] = useState(true);

  useEffect(() => {
    let active = true;
    api.users.getNotificationPreferences()
      .then((value) => {
        if (!active) return;
        const next = {
          orderUpdates: value.order_updates ?? true,
          sellRequestUpdates: value.sell_request_updates ?? true,
          marketing: value.marketing ?? false,
        };
        setSettings(next);
        return AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      })
      .catch(async () => {
        const value = await AsyncStorage.getItem(SETTINGS_KEY);
        if (!active || !value) return;
        try { setSettings({ ...defaults, ...JSON.parse(value) }); } catch { /* use defaults */ }
      })
      .finally(() => { if (active) setLoadingPreferences(false); });
    return () => { active = false; };
  }, []);

  const updateSetting = async (key: keyof Settings, value: boolean) => {
    const previous = settings[key];
    const next = { ...settings, [key]: value };
    setSettings(next);
    setSavingKey(key);
    const payload = key === 'orderUpdates'
      ? { order_updates: value }
      : key === 'sellRequestUpdates'
      ? { sell_request_updates: value }
      : { marketing: value };
    try {
      await api.users.updateNotificationPreferences(payload);
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    } catch (error: any) {
      setSettings({ ...next, [key]: previous });
      Alert.alert('Could not save setting', error?.message || 'Please try again when you are online.');
    } finally {
      setSavingKey(null);
    }
  };

  const resetSettings = () => {
    Alert.alert('Reset Settings', 'Restore all notification preferences to their defaults?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          setSettings(defaults);
          await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(defaults));
        },
      },
    ]);
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Sign out of this RenewX account?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={21} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Manage your RenewX app preferences</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>\n        {loadingPreferences && <Text style={styles.syncText}>Syncing preferences…</Text>}
        <View style={styles.accountCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.email?.charAt(0).toUpperCase() || 'U'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.accountName} numberOfLines={1}>
              {user?.full_name || user?.email?.split('@')[0] || 'RenewX Member'}
            </Text>
            <Text style={styles.accountEmail} numberOfLines={1}>{user?.email || 'Signed in account'}</Text>
          </View>
          <View style={styles.activePill}>
            <View style={styles.dot} />
            <Text style={styles.activeText}>ACTIVE</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
        <View style={styles.card}>
          <SettingRow
            icon="cube-outline"
            title="Order Updates"
            description="Payment, packing and delivery status"
            value={settings.orderUpdates}
            onValueChange={(value) => updateSetting('orderUpdates', value)}
            disabled={savingKey === 'orderUpdates'}
          />
          <SettingRow
            icon="cash-outline"
            title="Sell Request Updates"
            description="Approval, rejection and pickup status"
            value={settings.sellRequestUpdates}
            onValueChange={(value) => updateSetting('sellRequestUpdates', value)}
            disabled={savingKey === 'sellRequestUpdates'}
            last
          />
          <SettingRow
            icon="megaphone-outline"
            title="Offers & Promotions"
            description="Optional marketing messages from RenewX"
            value={settings.marketing}
            onValueChange={(value) => updateSetting('marketing', value)}
            disabled={savingKey === 'marketing'}
            last
          />
        </View>

        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <View style={styles.card}>
          <ActionRow
            icon="person-circle-outline"
            title="Account & Profile"
            description="View your account details"
            onPress={() => navigation.goBack()}
          />
          <ActionRow
            icon="lock-closed-outline"
            title="Security"
            description="Password and sign-in are managed by your account"
            onPress={() => Alert.alert('Security', 'Use the sign-in flow to manage your account password. Password changes are not handled locally by the app.')}
          />
          <ActionRow
            icon="refresh-outline"
            title="Reset Preferences"
            description="Restore notification settings to defaults"
            onPress={resetSettings}
            last
          />
        </View>

        <Text style={styles.sectionLabel}>SUPPORT & LEGAL</Text>
        <View style={styles.card}>
          <ActionRow
            icon="help-circle-outline"
            title="Help & Support"
            description="Get help with orders or sell requests"
            onPress={() => Alert.alert('RenewX Support', 'Please use the support contact shown in the app or your RenewX website support channel.')}
          />
          <ActionRow
            icon="document-text-outline"
            title="Privacy & Terms"
            description="Review the policies before using RenewX"
            onPress={() => Alert.alert('Privacy & Terms', 'Privacy and terms pages will be linked here once the official RenewX policy URLs are configured.')}
            last
          />
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={19} color="#b91c1c" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>RenewX • Settings • v2.4.0</Text>
      </ScrollView>
    </View>
  );
}

function SettingRow({
  icon,
  title,
  description,
  value,
  onValueChange,
  disabled,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <View style={styles.iconBox}><Ionicons name={icon} size={19} color="#111827" /></View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: '#d1d5db', true: '#fde68a' }}
        thumbColor={value ? '#f59e0b' : '#f8fafc'}
      />
    </View>
  );
}

function ActionRow({
  icon,
  title,
  description,
  onPress,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <TouchableOpacity style={[styles.row, !last && styles.rowBorder]} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.iconBox}><Ionicons name={icon} size={19} color="#111827" /></View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowDescription}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={17} color="#9ca3af" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f7f2' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#ebe7dd',
    backgroundColor: '#ffffff',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 22, fontWeight: '900', color: '#0f172a' },
  subtitle: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  content: { padding: 16, paddingBottom: 120 },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0f172a',
    borderRadius: 18,
    padding: 16,
    marginBottom: 22,
  },
  avatar: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: '#ffc400',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '900', color: '#000000' },
  accountName: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
  accountEmail: { color: '#cbd5e1', fontSize: 11, marginTop: 2 },
  activePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#dcfce7', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16a34a' },
  activeText: { fontSize: 8, fontWeight: '900', color: '#166534' },
  sectionLabel: {
    fontSize: 10, fontWeight: '900', color: '#9ca3af',
    letterSpacing: 1, marginBottom: 8, marginLeft: 4,
  },
  card: {
    backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1,
    borderColor: '#e8e4da', paddingHorizontal: 12, marginBottom: 20,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  iconBox: {
    width: 36, height: 36, borderRadius: 11, backgroundColor: '#f3f4f6',
    alignItems: 'center', justifyContent: 'center',
  },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 13, fontWeight: '800', color: '#1f2937' },
  rowDescription: { fontSize: 10, color: '#6b7280', marginTop: 3, lineHeight: 14 },
  signOutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: '#fee2e2', paddingVertical: 13, borderRadius: 13, marginTop: 2,
  },
  signOutText: { color: '#b91c1c', fontSize: 13, fontWeight: '800' },
  syncText: { fontSize: 10, color: '#6b7280', textAlign: 'center', marginBottom: 10 },
  footer: { textAlign: 'center', color: '#9ca3af', fontSize: 10, marginTop: 18 },
});
