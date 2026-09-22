import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { RootStackParamList } from '@/App';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme';
import { useSafeHeaderTop } from '@/lib/useSafeHeaderTop';

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

type PreferenceKey = keyof Settings;

const preferenceMeta: Record<
  PreferenceKey,
  {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    description: string;
  }
> = {
  orderUpdates: {
    icon: 'cube-outline',
    title: 'Order Updates',
    description: 'Payment, packing and delivery status',
  },
  sellRequestUpdates: {
    icon: 'cash-outline',
    title: 'Sell Request Updates',
    description: 'Approval, rejection and pickup status',
  },
  marketing: {
    icon: 'megaphone-outline',
    title: 'Offers & Promotions',
    description: 'Optional marketing messages from RenewX',
  },
};

export default function SettingsScreen() {
  const safeTop = useSafeHeaderTop();
  const navigation = useNavigation<NavigationProp>();
  const { user, signOut } = useAuth();

  const [settings, setSettings] = useState<Settings>(defaults);
  const [savingKey, setSavingKey] = useState<PreferenceKey | null>(null);
  const [loadingPreferences, setLoadingPreferences] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [preferenceError, setPreferenceError] = useState<string | null>(null);

  const displayName =
    user?.full_name ||
    user?.email?.split('@')[0] ||
    'RenewX Member';

  const email = user?.email || 'Signed in account';

  const initials = useMemo(() => {
    const source = displayName.trim();
    if (!source) return 'U';

    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length > 1) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }

    return source.slice(0, 2).toUpperCase();
  }, [displayName]);

  const loadPreferences = async (showLoader = true) => {
    if (showLoader) setLoadingPreferences(true);
    setPreferenceError(null);

    try {
      const value = await api.users.getNotificationPreferences();

      const next: Settings = {
        orderUpdates: value?.order_updates ?? defaults.orderUpdates,
        sellRequestUpdates:
          value?.sell_request_updates ?? defaults.sellRequestUpdates,
        marketing: value?.marketing ?? defaults.marketing,
      };

      setSettings(next);
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    } catch (error: any) {
      try {
        const cached = await AsyncStorage.getItem(SETTINGS_KEY);

        if (cached) {
          const parsed = JSON.parse(cached);
          setSettings({ ...defaults, ...parsed });
        } else {
          setPreferenceError(
            error?.message || 'Could not load your notification preferences.'
          );
        }
      } catch {
        setPreferenceError(
          error?.message || 'Could not load your notification preferences.'
        );
      }
    } finally {
      if (showLoader) setLoadingPreferences(false);
    }
  };

  useEffect(() => {
    loadPreferences(true);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPreferences(false);
    setRefreshing(false);
  };

  const updateSetting = async (
    key: PreferenceKey,
    value: boolean
  ) => {
    if (savingKey) return;

    const previous = settings[key];
    const next = { ...settings, [key]: value };

    // Optimistic UI keeps the switch responsive.
    setSettings(next);
    setSavingKey(key);
    setPreferenceError(null);

    const payload =
      key === 'orderUpdates'
        ? { order_updates: value }
        : key === 'sellRequestUpdates'
          ? { sell_request_updates: value }
          : { marketing: value };

    try {
      await api.users.updateNotificationPreferences(payload);
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    } catch (error: any) {
      setSettings({ ...next, [key]: previous });

      Alert.alert(
        'Could not save setting',
        error?.message || 'Please try again when you are online.'
      );
    } finally {
      setSavingKey(null);
    }
  };

  const resetSettings = () => {
    Alert.alert(
      'Reset notification settings',
      'Restore all notification preferences to their default values?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            const previous = settings;
            setSettings(defaults);
            setSavingKey(null);
            setPreferenceError(null);

            try {
              await api.users.updateNotificationPreferences({
                order_updates: defaults.orderUpdates,
                sell_request_updates: defaults.sellRequestUpdates,
                marketing: defaults.marketing,
              });

              await AsyncStorage.setItem(
                SETTINGS_KEY,
                JSON.stringify(defaults)
              );
            } catch (error: any) {
              setSettings(previous);

              Alert.alert(
                'Could not reset settings',
                error?.message ||
                  'Please try again when you are online.'
              );
            }
          },
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of this RenewX account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: signOut,
        },
      ]
    );
  };

  const openSupport = () => {
    Alert.alert(
      'RenewX Support',
      'Please use the support contact shown in the app or your RenewX website support channel.'
    );
  };

  const openPrivacyTerms = () => {
    Alert.alert(
      'Privacy & Terms',
      'Privacy and terms pages will be linked here once the official RenewX policy URLs are configured.'
    );
  };

  return (
    <View style={[styles.container, { paddingTop: safeTop }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons
            name="arrow-back"
            size={21}
            color={colors.text}
          />
        </TouchableOpacity>

        <View style={styles.headerText}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>
            Manage your RenewX preferences
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {loadingPreferences ? (
          <View style={styles.syncCard}>
            <ActivityIndicator
              size="small"
              color={colors.primary}
            />
            <Text style={styles.syncText}>
              Syncing your preferences…
            </Text>
          </View>
        ) : null}

        {preferenceError ? (
          <View style={styles.errorCard}>
            <View style={styles.errorIcon}>
              <Ionicons
                name="cloud-offline-outline"
                size={18}
                color={colors.primary}
              />
            </View>

            <View style={styles.errorTextWrap}>
              <Text style={styles.errorTitle}>
                Preferences could not be synced
              </Text>
              <Text style={styles.errorDescription}>
                Your saved settings are still available on this device.
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => loadPreferences(false)}
              style={styles.retryButton}
              activeOpacity={0.8}
            >
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.accountCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>

          <View style={styles.accountInfo}>
            <Text
              style={styles.accountName}
              numberOfLines={1}
            >
              {displayName}
            </Text>

            <Text
              style={styles.accountEmail}
              numberOfLines={1}
            >
              {email}
            </Text>

            <View style={styles.accountStatus}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>ACCOUNT ACTIVE</Text>
            </View>
          </View>

          <Ionicons
            name="shield-checkmark-outline"
            size={23}
            color={colors.primary}
          />
        </View>

        <SectionHeader
          title="Notifications"
          description="Choose which updates RenewX can send you."
        />

        <View style={styles.card}>
          {(Object.keys(preferenceMeta) as PreferenceKey[]).map(
            (key, index) => {
              const item = preferenceMeta[key];

              return (
                <SettingRow
                  key={key}
                  icon={item.icon}
                  title={item.title}
                  description={item.description}
                  value={settings[key]}
                  disabled={
                    loadingPreferences ||
                    savingKey !== null
                  }
                  saving={savingKey === key}
                  onValueChange={(value) =>
                    updateSetting(key, value)
                  }
                  last={
                    index ===
                    Object.keys(preferenceMeta).length - 1
                  }
                />
              );
            }
          )}
        </View>

        <SectionHeader
          title="Account"
          description="Manage account access and preferences."
        />

        <View style={styles.card}>
          <ActionRow
            icon="person-circle-outline"
            title="Account & Profile"
            description="View your account details"
            onPress={() => navigation.goBack()}
          />

          <ActionRow
            icon="shield-checkmark-outline"
            title="Password & Security"
            description="Change password, request reset link, or update security"
            onPress={() => navigation.navigate('Security' as any)}
          />

          <ActionRow
            icon="refresh-outline"
            title="Reset Preferences"
            description="Restore notification settings to defaults"
            onPress={resetSettings}
            last
          />
        </View>

        <SectionHeader
          title="Support & Legal"
          description="Get help and review important information."
        />

        <View style={styles.card}>
          <ActionRow
            icon="help-circle-outline"
            title="Help & Support"
            description="Get help with orders or sell requests"
            onPress={openSupport}
          />

          <ActionRow
            icon="document-text-outline"
            title="Privacy & Terms"
            description="Review the policies before using RenewX"
            onPress={openPrivacyTerms}
            last
          />
        </View>

        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
        >
          <Ionicons
            name="log-out-outline"
            size={19}
            color="#b91c1c"
          />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>
          RenewX • Settings
        </Text>
      </ScrollView>
    </View>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionDescription}>
        {description}
      </Text>
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
  saving,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  saving?: boolean;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <View style={styles.iconBox}>
        <Ionicons
          name={icon}
          size={19}
          color={colors.text}
        />
      </View>

      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowDescription}>
          {description}
        </Text>
      </View>

      {saving ? (
        <ActivityIndicator
          size="small"
          color={colors.primary}
          style={styles.switchLoader}
        />
      ) : (
        <Switch
          value={value}
          onValueChange={onValueChange}
          disabled={disabled}
          trackColor={{
            false: '#d1d5db',
            true: colors.primary,
          }}
          thumbColor="#ffffff"
          ios_backgroundColor="#d1d5db"
        />
      )}
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
    <TouchableOpacity
      style={[styles.row, !last && styles.rowBorder]}
      onPress={onPress}
      activeOpacity={0.72}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={styles.iconBox}>
        <Ionicons
          name={icon}
          size={19}
          color={colors.text}
        />
      </View>

      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowDescription}>
          {description}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={17}
        color={colors.textMuted}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: 6,
    paddingBottom: spacing.sm + 2,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#ebe7dd',
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerText: {
    flex: 1,
  },

  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.black,
    color: colors.text,
  },

  subtitle: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },

  content: {
    padding: spacing.md,
    paddingBottom: 110,
  },

  syncCard: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#e8e4da',
  },

  syncText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },

  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm + 2,
    marginBottom: spacing.md,
    borderRadius: radius.md,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
  },

  errorIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef3c7',
  },

  errorTextWrap: {
    flex: 1,
  },

  errorTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },

  errorDescription: {
    fontSize: 10,
    lineHeight: 14,
    color: colors.textMuted,
    marginTop: 2,
  },

  retryButton: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
  },

  retryText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },

  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.text,
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },

  avatarText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.black,
    color: '#000000',
  },

  accountInfo: {
    flex: 1,
  },

  accountName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: '#ffffff',
  },

  accountEmail: {
    fontSize: 10,
    color: '#cbd5e1',
    marginTop: 2,
  },

  accountStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 7,
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
  },

  statusText: {
    fontSize: 8,
    fontWeight: fontWeight.black,
    letterSpacing: 0.7,
    color: '#86efac',
  },

  sectionHeader: {
    marginBottom: spacing.xs,
    marginLeft: 3,
  },

  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.black,
    color: colors.text,
  },

  sectionDescription: {
    fontSize: 10,
    lineHeight: 14,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: spacing.xs,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#e8e4da',
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },

  row: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
  },

  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },

  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
  },

  rowText: {
    flex: 1,
  },

  rowTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },

  rowDescription: {
    fontSize: 10,
    lineHeight: 14,
    color: colors.textMuted,
    marginTop: 3,
  },

  switchLoader: {
    width: 36,
  },

  signOutButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingVertical: 13,
    borderRadius: radius.md,
  },

  signOutText: {
    color: '#b91c1c',
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },

  footer: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 10,
    marginTop: spacing.lg,
  },
});
