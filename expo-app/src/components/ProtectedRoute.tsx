import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { fontSize, radius, spacing } from '@/theme';
import { renewxColors, renewxShadows, renewxTextStyle } from '@/design-system';
import { useSafeHeaderTop } from '@/lib/useSafeHeaderTop';

export interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
  requireAuth?: boolean;
  title?: string;
  message?: string;
}

export default function ProtectedRoute({
  children,
  adminOnly = false,
  requireAuth = true,
  title,
  message,
}: ProtectedRouteProps) {
  const safeTop = useSafeHeaderTop();
  const navigation = useNavigation<any>();
  const { user, isAdmin, loading, signOut } = useAuth();

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: safeTop }]}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={renewxColors.yellow} />
          <Text style={styles.loadingText}>Verifying permissions…</Text>
        </View>
      </View>
    );
  }

  // Check 1: User authentication required
  if (requireAuth && !user) {
    return (
      <View style={[styles.container, { paddingTop: safeTop }]}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs', { screen: 'Home' })}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={20} color={renewxColors.black} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Authentication Required</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.content}>
          <View style={[styles.iconCircle, styles.lockCircle]}>
            <Ionicons name="lock-closed-outline" size={38} color={renewxColors.black} />
          </View>

          <View style={styles.badge}>
            <Text style={styles.badgeText}>SECURE ACCESS</Text>
          </View>

          <Text style={styles.title}>{title || 'Sign In Required'}</Text>
          <Text style={styles.subtitle}>
            {message || 'You need to be signed in to access this secure section of RenewX.'}
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate('MainTabs', { screen: 'Account' })}
              activeOpacity={0.85}
            >
              <Ionicons name="log-in-outline" size={18} color={renewxColors.black} />
              <Text style={styles.primaryButtonText}>Sign In to Continue</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>Return to Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Check 2: Admin authorization required
  if (adminOnly && !isAdmin) {
    return (
      <View style={[styles.container, { paddingTop: safeTop }]}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs', { screen: 'Home' })}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={20} color={renewxColors.black} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Restricted Route</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.content}>
          <View style={[styles.iconCircle, styles.adminCircle]}>
            <Ionicons name="shield-outline" size={40} color={renewxColors.warning} />
          </View>

          <View style={[styles.badge, styles.adminBadge]}>
            <View style={styles.adminDot} />
            <Text style={styles.adminBadgeText}>ADMIN PRIVILEGES REQUIRED</Text>
          </View>

          <Text style={styles.title}>{title || 'Access Restricted'}</Text>
          <Text style={styles.subtitle}>
            {message ||
              `The RenewX Admin Control Center is restricted to authorized store administrators. Your account (${user?.email || 'current user'}) does not have administrative permissions.`}
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}
              activeOpacity={0.85}
            >
              <Ionicons name="storefront-outline" size={18} color={renewxColors.black} />
              <Text style={styles.primaryButtonText}>Return to Store</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={async () => {
                await signOut();
                navigation.navigate('MainTabs', { screen: 'Home' });
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="log-out-outline" size={17} color={renewxColors.textSecondary} />
              <Text style={styles.secondaryButtonText}>Sign Out & Switch Account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Authorized: render the protected content
  return <>{children}</>;
}

/**
 * Higher Order Component to wrap screen components with ProtectedRoute.
 */
export function withProtectedRoute<P extends object>(
  Component: React.ComponentType<P>,
  options?: { adminOnly?: boolean; requireAuth?: boolean; title?: string; message?: string }
) {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedRoute
        adminOnly={options?.adminOnly}
        requireAuth={options?.requireAuth}
        title={options?.title}
        message={options?.message}
      >
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: renewxColors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: renewxColors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingBox: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: renewxColors.textSecondary,
    ...renewxTextStyle('medium'),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: renewxColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: renewxColors.border,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: renewxColors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: fontSize.md,
    ...renewxTextStyle('bold'),
    color: renewxColors.black,
  },
  headerSpacer: {
    width: 38,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  lockCircle: {
    backgroundColor: renewxColors.yellowLight,
    borderWidth: 2,
    borderColor: renewxColors.yellow,
  },
  adminCircle: {
    backgroundColor: renewxColors.yellowSoft,
    borderWidth: 2,
    borderColor: renewxColors.yellowDark,
  },
  badge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: renewxColors.surfaceMuted,
    borderWidth: 1,
    borderColor: renewxColors.border,
    marginBottom: spacing.sm,
  },
  badgeText: {
    fontSize: 10.5,
    ...renewxTextStyle('extraBold'),
    letterSpacing: 0.7,
    color: renewxColors.textSecondary,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: renewxColors.yellowLight,
    borderColor: renewxColors.yellowDark,
  },
  adminDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: renewxColors.warning,
  },
  adminBadgeText: {
    fontSize: 10.5,
    ...renewxTextStyle('extraBold'),
    letterSpacing: 0.7,
    color: renewxColors.black,
  },
  title: {
    fontSize: fontSize.xl,
    ...renewxTextStyle('black'),
    color: renewxColors.black,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.sm,
    lineHeight: 20,
    ...renewxTextStyle('regular'),
    color: renewxColors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    maxWidth: 340,
  },
  actions: {
    width: '100%',
    maxWidth: 320,
    gap: spacing.sm,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: renewxColors.yellow,
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: renewxColors.yellowDark,
    ...(renewxShadows.card as object),
  },
  primaryButtonText: {
    fontSize: fontSize.sm,
    ...renewxTextStyle('extraBold'),
    color: renewxColors.black,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: renewxColors.surface,
    paddingVertical: 13,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: renewxColors.border,
  },
  secondaryButtonText: {
    fontSize: fontSize.sm,
    ...renewxTextStyle('semibold'),
    color: renewxColors.textSecondary,
  },
});
