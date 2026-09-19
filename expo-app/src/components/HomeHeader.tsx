import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme';

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
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Ionicons name="phone-portrait" size={18} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.logo}>
              Renew<Text style={styles.logoAccent}>X</Text>
            </Text>
            <Text style={styles.logoSub}>CREW</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity onPress={onSearch} style={styles.iconButton}>
            <Ionicons name="search" size={20} color={colors.text} />
          </TouchableOpacity>

          {isAdmin && onAdmin && (
            <TouchableOpacity onPress={onAdmin} style={styles.iconButton}>
              <Ionicons name="grid-outline" size={20} color={colors.primaryDark} />
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={onCart} style={styles.iconButton}>
            <Ionicons name="cart-outline" size={22} color={colors.text} />
            {cartCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          {onLogout && (
            <TouchableOpacity onPress={onLogout} style={styles.iconButton}>
              <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.black,
    color: colors.text,
    letterSpacing: -0.5,
    lineHeight: 18,
  },
  logoAccent: {
    color: colors.primary,
  },
  logoSub: {
    fontSize: 8,
    fontWeight: fontWeight.bold,
    color: colors.text,
    letterSpacing: 2,
    marginTop: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: colors.primary,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  badgeText: {
    color: colors.black,
    fontSize: 9,
    fontWeight: fontWeight.bold,
  },
});
