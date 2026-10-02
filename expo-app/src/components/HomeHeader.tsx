import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { renewxColors, renewxRadius, renewxSpacing, renewxFontFamily } from '@/design-system';
import { useSafeHeaderTop } from '@/lib/useSafeHeaderTop';

interface HomeHeaderProps {
  onSearch: () => void;
  cartCount: number;
  onCart: () => void;
  isAdmin?: boolean;
  onAdmin?: () => void;
  onLogout?: () => void;
}

export default function HomeHeader({
  onSearch,
  cartCount,
  onCart,
  isAdmin,
  onAdmin,
  onLogout,
}: HomeHeaderProps) {
  const safeTop = useSafeHeaderTop();

  return (
    <View style={[styles.container, { paddingTop: safeTop }]}>
      <View style={styles.topRow}>
        <View style={styles.brandRow}>
          <Image source={require('@/assets/logo.png')} style={styles.logo} resizeMode="contain" />
          <View style={styles.brandMeta}>
            <Text style={styles.eyebrow}>CERTIFIED DEVICES</Text>
            <Text style={styles.subline}>Buy better. Sell smarter.</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            onPress={onSearch}
            style={styles.iconButton}
            accessibilityLabel="Search products"
            activeOpacity={0.75}
          >
            <Ionicons name="search-outline" size={21} color={renewxColors.black} />
          </TouchableOpacity>

          {isAdmin && onAdmin && (
            <TouchableOpacity
              onPress={onAdmin}
              style={styles.iconButton}
              accessibilityLabel="Open admin dashboard"
              activeOpacity={0.75}
            >
              <Ionicons name="grid-outline" size={20} color={renewxColors.greenDark} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={onCart}
            style={styles.iconButton}
            accessibilityLabel={cartCount > 0 ? `Cart, ${cartCount} items` : 'Cart'}
            activeOpacity={0.75}
          >
            <Ionicons name="bag-handle-outline" size={21} color={renewxColors.black} />
            {cartCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{cartCount > 99 ? '99+' : cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          {onLogout && (
            <TouchableOpacity
              onPress={onLogout}
              style={styles.iconButton}
              accessibilityLabel="Sign out"
              activeOpacity={0.75}
            >
              <Ionicons name="log-out-outline" size={20} color={renewxColors.error} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: renewxSpacing.md,
    paddingBottom: renewxSpacing.sm,
    backgroundColor: renewxColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: renewxColors.border,
  },
  topRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: renewxSpacing.sm,
  },
  brandRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: renewxSpacing.xs,
  },
  logo: {
    width: 112,
    height: 38,
  },
  brandMeta: {
    flexShrink: 1,
    paddingLeft: 2,
  },
  eyebrow: {
    fontFamily: renewxFontFamily.semibold,
    fontSize: 8,
    lineHeight: 10,
    letterSpacing: 1.1,
    color: renewxColors.green,
  },
  subline: {
    marginTop: 1,
    fontFamily: renewxFontFamily.regular,
    fontSize: 9,
    lineHeight: 12,
    color: renewxColors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: renewxRadius.md,
    borderWidth: 1,
    borderColor: renewxColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: renewxColors.surface,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: renewxColors.yellow,
    borderWidth: 2,
    borderColor: renewxColors.surface,
  },
  badgeText: {
    fontFamily: renewxFontFamily.semibold,
    fontSize: 8,
    color: renewxColors.black,
  },
});
