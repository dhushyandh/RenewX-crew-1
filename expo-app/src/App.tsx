import { useEffect, useState } from 'react';
import {
  NavigationContainer,
  useNavigationContainerRef,
  type LinkingOptions,
  getStateFromPath,
} from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import * as Sentry from '@sentry/react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, Platform } from 'react-native';

// Global font injection for Web without overriding vector icon fonts
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const styleId = 'renewx-outfit-global';
  let styleEl = document.getElementById(styleId);
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }
  styleEl.innerHTML = `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
    html, body, #root, input, textarea, select, button {
      font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    [dir="auto"]:not([style*="Ionicons"]):not([style*="Material"]):not([style*="FontAwesome"]):not([style*="Feather"]):not([style*="AntDesign"]):not([style*="Entypo"]):not([style*="EvilIcons"]):not([style*="Octicons"]):not([style*="SimpleLineIcons"]):not([style*="Zocial"]):not([style*="Fontisto"]):not([style*="Foundation"]) {
      font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
  `;
}

// Global font default for React Native Native only
if (Platform.OS !== 'web') {
  if ((Text as any).defaultProps == null) {
    (Text as any).defaultProps = {};
  }
  (Text as any).defaultProps.style = [
    { fontFamily: renewxFontFamily.regular },
    (Text as any).defaultProps.style,
  ];

  if ((TextInput as any).defaultProps == null) {
    (TextInput as any).defaultProps = {};
  }
  (TextInput as any).defaultProps.style = [
    { fontFamily: 'Outfit_400Regular' },
    (TextInput as any).defaultProps.style,
  ];
}
import type { Product } from '@/types';
import { colors } from '@/theme';
import { renewxColors, renewxFontFamily, renewxRadius } from '@/design-system';
import { CartProvider, useCart } from '@/context/CartContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { WishlistProvider } from '@/context/WishlistContext';
import { LocationProvider } from '@/context/LocationContext';
import { NotificationProvider } from '@/context/NotificationContext';
import {
  useFonts,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold,
} from '@expo-google-fonts/outfit';

import HomeScreen from '@/screens/HomeScreen';
import ShopScreen from '@/screens/ShopScreen';
import SellScreen from '@/screens/SellScreen';
import MySellRequestsScreen from '@/screens/MySellRequestsScreen';
import TrackScreen from '@/screens/TrackScreen';
import AccountScreen from '@/screens/AccountScreen';
import SettingsScreen from '@/screens/SettingsScreen';
import NotificationsScreen from '@/screens/NotificationsScreen';
import CartScreen from '@/screens/CartScreen';
import CheckoutScreen from '@/screens/CheckoutScreen';
import OrderConfirmScreen from '@/screens/OrderConfirmScreen';
import OrderDetailScreen from '@/screens/OrderDetailScreen';
import PaymentScreen from '@/screens/PaymentScreen';
import ProductDetailScreen from '@/screens/ProductDetailScreen';
import SearchScreen from '@/screens/SearchScreen';
import WishlistScreen from '@/screens/WishlistScreen';
import AuthScreen from '@/screens/AuthScreen';
import ForgotPasswordScreen from '@/screens/ForgotPasswordScreen';
import ResetPasswordScreen from '@/screens/ResetPasswordScreen';
import AboutRenewXScreen from '@/screens/AboutRenewXScreen';
import SecurityScreen from '@/screens/SecurityScreen';
import EditProfileScreen from '@/screens/EditProfileScreen';
import OnboardingProfileScreen from '@/screens/OnboardingProfileScreen';
import CategoriesScreen from '@/screens/CategoriesScreen';
import ManageAddressesScreen from '@/screens/ManageAddressesScreen';
import AdminPanel from '@/screens/AdminPanel';
import ProtectedRoute, { withProtectedRoute } from '@/components/ProtectedRoute';
import ConnectionStatusBanner from '@/components/ConnectionStatusBanner';
import NotificationPermissionPrompt from '@/components/NotificationPermissionPrompt';
import AnimatedSplashScreen from '@/components/AnimatedSplashScreen';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { clientObservability } from '@/services/observability';

// Initialize global crash & unhandled exception telemetry
clientObservability.init();

export type RootStackParamList = {
  Auth: undefined;
  ForgotPassword: { email?: string } | undefined;
  ResetPassword: { token?: string; email?: string } | undefined;
  MainTabs: { screen?: keyof TabParamList; params?: any } | undefined;
  Categories: { category?: string } | undefined;
  Shop: { category?: string; brand?: string; _t?: number } | undefined;
  ProductDetail: { product?: Product; id?: string };
  Search: undefined;
  Wishlist: undefined;
  Cart: undefined;
  Checkout: undefined;
  OrderDetail: { id: string; order?: any };
  OrderConfirm: {
    order?: any;
    orderId?: string;
    customerInfo?: {
      name: string;
      phone: string;
      address: string;
      pincode: string;
    };
    paymentMethod?: 'razorpay' | 'cod' | string;
    paymentStatus?: 'paid' | 'cod' | 'pending' | string;
    items?: any[];
    totalAmount?: number;
  } | undefined;
  MySellRequests: undefined;
  Settings: undefined;
  ManageAddresses: undefined;
  AboutRenewX: { tab?: 'howItWorks' | 'aboutUs' | 'contact' | 'privacy' | 'terms'; initialTab?: string } | undefined;
  Notifications: undefined;
  EditProfile: undefined;
  OnboardingProfile: undefined;
  Security: { token?: string; email?: string } | undefined;
  Payment: {
    customerInfo: {
      name: string;
      phone: string;
      address: string;
      pincode: string;
    };
  };

  // Dedicated Admin Routes with direct URLs
  AdminDashboard: undefined;
  AdminProducts: undefined;
  AdminAddProduct: { id?: string } | undefined;
  AdminEditProduct: { id: string };
  AdminBrands: undefined;
  AdminAddBrand: undefined;
  AdminAddModel: { brandId?: string } | undefined;
  AdminOrders: undefined;
  AdminUsers: undefined;
  AdminTradeIns: undefined;
  AdminPromotions: undefined;

  // Container fallback
  Admin: {
    screen?: 'dashboard' | 'products' | 'brands' | 'orders' | 'users' | 'tradeIns' | 'promotions' | 'addProduct' | 'editProduct' | 'addBrand' | 'addModel';
    productId?: string;
    brandId?: string;
    id?: string;
  } | undefined;
};

// Deep linking configuration for URL bar sync and navigation
export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [
    'renewx://',
    'https://renewx.expo.app',
    'http://renewx.expo.app',
    'https://renewx-crew-server.onrender.com',
    'http://localhost:8081',
    'http://127.0.0.1:8081',
    'http://localhost:19006',
    'http://localhost:8082',
    'http://10.0.2.2:8081',
    ...(Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin
      ? [window.location.origin]
      : []),
  ],
  getStateFromPath: (path, options) => {
    // Normalization: support user's /forget-password route as alias to /forgot-password
    let normalized = path.replace(/^\/forget-password/, '/forgot-password');
    // If a token parameter is present in forgot-password, treat it directly as reset-password
    if (normalized.includes('token=') && (normalized.startsWith('/forgot-password') || normalized.startsWith('forgot-password'))) {
      normalized = normalized.replace(/^\/?forgot-password/, '/reset-password');
    }
    return getStateFromPath(normalized, options);
  },
  config: {
    screens: {
      Auth: 'login',
      ForgotPassword: 'forgot-password',
      ResetPassword: 'reset-password',
      MainTabs: {
        screens: {
          Home: '',
          Shop: 'shop',
          Sell: 'sell',
          Track: 'track',
          Account: 'account',
        },
      } as any,
      Categories: 'categories',
      ProductDetail: 'product/:id',
      Search: 'search',
      Wishlist: 'wishlist',
      Cart: 'cart',
      Checkout: 'checkout',
      OrderDetail: 'order/:id',
      OrderConfirm: 'order-confirmed',
      Payment: 'payment',
      MySellRequests: 'sell-requests',
      Settings: 'settings',
      ManageAddresses: 'manage-address',
      AboutRenewX: 'about',
      Notifications: 'notifications',
      EditProfile: 'edit-profile',
      OnboardingProfile: 'onboarding',
      Security: 'security',
      AdminDashboard: 'admin/dashboard',
      AdminProducts: 'admin/products',
      AdminAddProduct: 'admin/add/product/:id?',
      AdminEditProduct: 'admin/edit/product/:id',
      AdminBrands: 'admin/brands',
      AdminAddBrand: 'admin/add/brands',
      AdminAddModel: 'admin/add/models',
      AdminOrders: 'admin/orders',
      AdminUsers: 'admin/users',
      AdminTradeIns: 'admin/trade-ins',
      AdminPromotions: 'admin/promotions',
      Admin: 'admin',
    },
  },
};

export type TabParamList = {
  Home: undefined;
  Shop: { category?: string; brand?: string; _t?: number } | undefined;
  Sell: undefined;
  Track: { type?: 'orders' | 'sell_requests'; id?: string } | undefined;
  Account: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// Custom Modern Floating Rounded-Full Tab Bar
function ModernRoundedTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomInset = Platform.OS === 'ios' ? Math.max(insets.bottom, 12) : 12;
  const { totalItems } = useCart();

  const currentRoute = state.routes[state.index];
  const currentDescriptor = descriptors[currentRoute.key];
  if ((currentDescriptor?.options?.tabBarStyle as any)?.display === 'none') {
    return null;
  }

  const TAB_CONFIG: Record<string, { active: any; inactive: any; label: string }> = {
    Home: { active: 'home', inactive: 'home-outline', label: 'Home' },
    Shop: { active: 'bag-handle', inactive: 'bag-handle-outline', label: 'Shop' },
    Track: { active: 'cube', inactive: 'cube-outline', label: 'Track' },
    Account: { active: 'person', inactive: 'person-outline', label: 'Account' },
    Sell: { active: 'pricetag', inactive: 'pricetag-outline', label: 'Sell' },
  };

  const mainRoutes = state.routes.filter((r) => r.name !== 'Sell');
  const sellRoute = state.routes.find((r) => r.name === 'Sell');

  return (
    <View
      pointerEvents={Platform.OS === 'web' ? undefined : 'box-none'}
      style={[
        styles.floatingTabBarWrapper,
        { bottom: bottomInset },
        Platform.OS === 'web' ? ({ pointerEvents: 'box-none' } as any) : undefined,
      ]}
    >
      {/* Floating Free Delivery / Cart Pill */}
      {totalItems > 0 && (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => navigation.navigate('Cart')}
          style={styles.floatingCartBanner}
          accessibilityRole="button"
          accessibilityLabel={`Cart with ${totalItems} items, unlock free delivery`}
        >
          <View style={styles.floatingCartLeft}>
            <View style={styles.floatingCartCheckCircle}>
              <Ionicons name="checkmark-sharp" size={13} color="#FFFFFF" />
            </View>
            <Text style={styles.floatingCartText}>You've unlocked FREE delivery</Text>
          </View>
          <View style={styles.floatingCartRightBtn}>
            <Ionicons name="bag-handle" size={14} color="#FFFFFF" />
            <Text style={styles.floatingCartCount}>{totalItems}</Text>
            <Ionicons name="arrow-forward" size={13} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
      )}

      <View style={styles.floatingNavRow}>
        {/* 1. Main Navbar Capsule with Home, Categories, Orders, Profile */}
        <View style={styles.floatingMainCapsule}>
          <BlurView
            intensity={85}
            tint="light"
            style={[
              StyleSheet.absoluteFill,
              styles.floatingBlurBackground,
              Platform.OS === 'web'
                ? ({
                    backdropFilter: 'blur(20px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                  } as any)
                : undefined,
            ]}
          />

          <View style={styles.floatingCapsuleRow}>
            {mainRoutes.map((route) => {
              const routeIndex = state.routes.findIndex((r) => r.key === route.key);
              const isFocused = state.index === routeIndex;
              const config = TAB_CONFIG[route.name] || {
                active: 'ellipse',
                inactive: 'ellipse-outline',
                label: route.name,
              };

              const onPress = () => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!event.defaultPrevented) {
                  if (!isFocused) {
                    navigation.navigate(route.name);
                  }
                  if (Platform.OS === 'web' && typeof window !== 'undefined') {
                    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as any });
                  }
                }
              };

              const activeBg = '#FEF08A';

              return (
                <TouchableOpacity
                  key={route.key}
                  onPress={onPress}
                  activeOpacity={0.78}
                  style={[
                    styles.floatingTabItem,
                    isFocused && [styles.floatingTabItemActive, { backgroundColor: activeBg }],
                  ]}
                  accessibilityRole="button"
                  accessibilityState={isFocused ? { selected: true } : {}}
                  accessibilityLabel={config.label}
                >
                  <View style={styles.floatingIconBox}>
                    <Ionicons
                      name={isFocused ? config.active : config.inactive}
                      size={20}
                      color={isFocused ? '#000000' : '#64748B'}
                    />
                  </View>
                  <Text style={[styles.floatingTabLabel, isFocused && styles.floatingTabLabelActive]}>
                    {config.label}
                  </Text>
                  {isFocused && (
                    <View
                      style={{
                        position: 'absolute',
                        bottom: -3,
                        width: 5,
                        height: 5,
                        borderRadius: 2.5,
                        backgroundColor: '#F59E0B',
                      }}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 2. Separate Border Rounded Button for Sell */}
        {sellRoute && (() => {
          const sellIndex = state.routes.findIndex((r) => r.key === sellRoute.key);
          const isSellFocused = state.index === sellIndex;

          const onSellPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: sellRoute.key,
              canPreventDefault: true,
            });

            if (!event.defaultPrevented) {
              if (!isSellFocused) {
                navigation.navigate('Sell');
              }
              if (Platform.OS === 'web' && typeof window !== 'undefined') {
                window.scrollTo({ top: 0, left: 0, behavior: 'instant' as any });
              }
            }
          };

          return (
            <TouchableOpacity
              key={sellRoute.key}
              onPress={onSellPress}
              activeOpacity={0.85}
              style={styles.floatingSellSeparateBtn}
              accessibilityRole="button"
              accessibilityState={isSellFocused ? { selected: true } : {}}
              accessibilityLabel="Sell device for cash"
            >
              <View style={styles.sellSparkleTopRight}>
                <Text style={styles.sparkleChar}>✨</Text>
              </View>
              <View style={styles.sellSparkleBottomLeft}>
                <Text style={styles.sparkleChar}>✨</Text>
              </View>
              <View style={[styles.floatingSellCircle, isSellFocused && styles.floatingSellCircleActive]}>
                <Ionicons name="pricetag" size={20} color="#000000" />
              </View>
              <Text style={[styles.floatingSellLabel, isSellFocused && styles.floatingSellLabelActive]}>
                Sell
              </Text>
            </TouchableOpacity>
          );
        })()}
      </View>
    </View>
  );
}

function TabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <ModernRoundedTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Shop" component={ShopScreen} />
      <Tab.Screen name="Track" component={TrackScreen} />
      <Tab.Screen name="Account" component={AccountScreen} />
      <Tab.Screen name="Sell" component={SellScreen} />
    </Tab.Navigator>
  );
}

// Protected screen wrappers for secure customer & administrative routes
const ProtectedAdminPanel = withProtectedRoute(AdminPanel, {
  adminOnly: true,
});

const ProtectedSettingsScreen = withProtectedRoute(SettingsScreen, {
  requireAuth: true,
});

const ProtectedNotificationsScreen = withProtectedRoute(NotificationsScreen, {
  requireAuth: true,
});

const ProtectedEditProfileScreen = withProtectedRoute(EditProfileScreen, {
  requireAuth: true,
});

const ProtectedMySellRequestsScreen = withProtectedRoute(MySellRequestsScreen, {
  requireAuth: true,
});

const ProtectedCheckoutScreen = withProtectedRoute(CheckoutScreen, {
  requireAuth: true,
});

const ProtectedPaymentScreen = withProtectedRoute(PaymentScreen, {
  requireAuth: true,
});

const ProtectedOrderConfirmScreen = withProtectedRoute(OrderConfirmScreen, {
  requireAuth: true,
});

const ProtectedManageAddressesScreen = withProtectedRoute(ManageAddressesScreen, {
  requireAuth: true,
});

function MainAppNavigation() {
  const { user, loading, needsProfileSetup } = useAuth();
  const navigationRef = useNavigationContainerRef<RootStackParamList>();

  // Sync user context with client observability
  useEffect(() => {
    clientObservability.setUser(user ? { id: user.id, email: user.email } : null);
  }, [user]);

  // Deep-link to target screen when push notification banner is tapped
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const navigateFromNotification = (data: Record<string, any> | undefined) => {
      if (!data) return;
      const targetScreen = String(data.screen || '').trim();
      const id = data.productId || data.id || data.orderId || data.tradeInId;

      const performNavigation = () => {
        if (!navigationRef.isReady()) {
          setTimeout(performNavigation, 150);
          return;
        }

        if (targetScreen === 'ProductDetail' && (data.productId || data.id)) {
          navigationRef.navigate('ProductDetail', { id: String(data.productId || data.id) });
        } else if (targetScreen === 'OrderDetail' && (data.orderId || data.id)) {
          navigationRef.navigate('OrderDetail', { id: String(data.orderId || data.id) });
        } else if (targetScreen === 'Track' || targetScreen === 'TrackOrder' || targetScreen === 'Orders') {
          navigationRef.navigate('MainTabs', { screen: 'Track' });
        } else if (targetScreen === 'AdminOrders') {
          navigationRef.navigate('AdminOrders');
        } else if (targetScreen === 'AdminTradeIn' || targetScreen === 'AdminTradeIns') {
          navigationRef.navigate('AdminTradeIns');
        } else if (targetScreen === 'TradeIn' || targetScreen === 'MySellRequests') {
          navigationRef.navigate('MySellRequests');
        } else if (targetScreen === 'Security') {
          navigationRef.navigate('Security');
        } else if (targetScreen === 'ForgotPassword') {
          navigationRef.navigate('ForgotPassword');
        } else if (targetScreen === 'ResetPassword') {
          navigationRef.navigate('ResetPassword');
        } else if (targetScreen === 'Notifications') {
          navigationRef.navigate('Notifications');
        } else if (targetScreen) {
          try {
            (navigationRef.navigate as any)(targetScreen, id ? { id } : undefined);
          } catch {
            navigationRef.navigate('Notifications');
          }
        } else {
          navigationRef.navigate('Notifications');
        }
      };

      performNavigation();
    };

    // 1. Cold start: user opened the app by tapping a notification while terminated
    Notifications.getLastNotificationResponseAsync().then((response) => {
      const data = response?.notification?.request?.content?.data;
      if (data) {
        navigateFromNotification(data as Record<string, any>);
      }
    });

    // 2. Foreground / background: user taps notification banner while app is running
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response?.notification?.request?.content?.data;
      if (data) {
        navigateFromNotification(data as Record<string, any>);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [navigationRef]);


  // On web initial load, ensure reset-password URL is opened directly
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const path = window.location.pathname || '';
    const hash = window.location.hash || '';
    if (path.includes('reset-password') || path.includes('forget-password') || hash.includes('reset-password')) {
      const searchParams = new URLSearchParams(window.location.search || (hash.includes('?') ? hash.split('?')[1] : ''));
      const token = searchParams.get('token') || undefined;
      const email = searchParams.get('email') || undefined;

      const navigateToReset = () => {
        if (!navigationRef.isReady()) {
          setTimeout(navigateToReset, 60);
          return;
        }
        const current = navigationRef.getCurrentRoute()?.name;
        if (current !== 'ResetPassword') {
          navigationRef.navigate('ResetPassword', { token, email });
        }
      };

      navigateToReset();
    }
  }, [navigationRef]);

  // When user logs out, cleanly reset navigation to Auth
  useEffect(() => {
    if (!navigationRef.isReady()) return;
    if (!user) {
      const currentRoute = navigationRef.getCurrentRoute()?.name;
      if (
        currentRoute &&
        currentRoute !== 'Auth' &&
        currentRoute !== 'ForgotPassword' &&
        currentRoute !== 'ResetPassword'
      ) {
        try {
          navigationRef.reset({
            index: 0,
            routes: [{ name: 'Auth' }],
          });
        } catch {
          // Safe ignore
        }
      }
    } else {
      // When user logs in, automatically redirect away from Auth/ForgotPassword to MainTabs (or OnboardingProfile if needed)
      const currentRoute = navigationRef.getCurrentRoute()?.name;
      if (currentRoute === 'Auth' || currentRoute === 'ForgotPassword') {
        try {
          navigationRef.reset({
            index: 0,
            routes: [{ name: needsProfileSetup ? 'OnboardingProfile' : 'MainTabs' }],
          });
        } catch {
          // Safe ignore
        }
      }
    }
  }, [user, needsProfileSetup, navigationRef]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }


  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer
        ref={navigationRef}
        linking={linking}
        onStateChange={() => {
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' as any });
            try {
              const current = navigationRef.current?.getCurrentRoute();
              if (current?.name) {
                const screenTitles: Record<string, string> = {
                  Home: 'RenewX | Certified Pre-Owned Electronics Marketplace',
                  Shop: 'Shop Certified Devices | RenewX',
                  Sell: 'Sell Your Device for Instant Cash | RenewX',
                  Track: 'Live Order Tracking | RenewX',
                  Account: 'My Account | RenewX',
                  ManageAddresses: 'Manage Delivery Addresses | RenewX',
                  Cart: 'Shopping Cart | RenewX',
                  Checkout: 'Secure Checkout | RenewX',
                  ProductDetail: 'Product Specifications | RenewX',
                  Notifications: 'Notifications | RenewX',
                  AboutRenewX: 'About RenewX Crew | Mission & Policies',
                  AdminDashboard: 'Admin Control Center | RenewX',
                  AdminProducts: 'Inventory Management | RenewX',
                  AdminOrders: 'Order Management | RenewX',
                  Auth: 'Sign In / Register | RenewX',
                  ForgotPassword: 'Reset Your Password | RenewX',
                  ResetPassword: 'Set New Password | RenewX',
                };
                document.title = screenTitles[current.name] || `${current.name} | RenewX`;
              }
            } catch {}
          }
        }}
      >
        <Stack.Navigator
          screenOptions={{ headerShown: false }}
          initialRouteName={!user ? 'Auth' : needsProfileSetup ? 'OnboardingProfile' : 'MainTabs'}
        >
          {!user ? (
            /* Mandatory Authentication: Unauthenticated users can only access Auth and recovery flows */
            <Stack.Group>
              <Stack.Screen name="Auth" component={AuthScreen} />
              <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
              <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
              <Stack.Screen name="OnboardingProfile" component={OnboardingProfileScreen} />
            </Stack.Group>
          ) : (
            /* Main App Routes for Authenticated Users */
            <Stack.Group>
              <Stack.Screen name="MainTabs" component={TabNavigator} />
              <Stack.Screen name="Categories" component={CategoriesScreen} />
              <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
              <Stack.Screen name="Search" component={SearchScreen} />
              <Stack.Screen name="Wishlist" component={WishlistScreen} />
              <Stack.Screen name="Cart" component={CartScreen} />
              <Stack.Screen name="Checkout" component={ProtectedCheckoutScreen} />
              <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
              <Stack.Screen name="OrderConfirm" component={ProtectedOrderConfirmScreen} />
              <Stack.Screen name="Payment" component={ProtectedPaymentScreen} />
              <Stack.Screen name="MySellRequests" component={ProtectedMySellRequestsScreen} />
              <Stack.Screen name="Settings" component={ProtectedSettingsScreen} />
              <Stack.Screen name="ManageAddresses" component={ProtectedManageAddressesScreen} />
              <Stack.Screen name="AboutRenewX" component={AboutRenewXScreen} />
              <Stack.Screen name="Notifications" component={ProtectedNotificationsScreen} />
              <Stack.Screen name="EditProfile" component={ProtectedEditProfileScreen} />
              <Stack.Screen name="OnboardingProfile" component={OnboardingProfileScreen} />
              <Stack.Screen name="Security" component={SecurityScreen} />

              {/* Dedicated Protected Admin Direct Routes */}
              <Stack.Screen name="AdminDashboard" component={ProtectedAdminPanel} />
              <Stack.Screen name="AdminProducts" component={ProtectedAdminPanel} />
              <Stack.Screen name="AdminAddProduct" component={ProtectedAdminPanel} />
              <Stack.Screen name="AdminEditProduct" component={ProtectedAdminPanel} />
              <Stack.Screen name="AdminBrands" component={ProtectedAdminPanel} />
              <Stack.Screen name="AdminAddBrand" component={ProtectedAdminPanel} />
              <Stack.Screen name="AdminAddModel" component={ProtectedAdminPanel} />
              <Stack.Screen name="AdminOrders" component={ProtectedAdminPanel} />
              <Stack.Screen name="AdminUsers" component={ProtectedAdminPanel} />
              <Stack.Screen name="AdminTradeIns" component={ProtectedAdminPanel} />
              <Stack.Screen name="AdminPromotions" component={ProtectedAdminPanel} />
              <Stack.Screen name="Admin" component={ProtectedAdminPanel} />
            </Stack.Group>
          )}
        </Stack.Navigator>
      </NavigationContainer>
      <ConnectionStatusBanner />
      <NotificationPermissionPrompt />
    </View>
  );
}

function App() {
  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
  });

  const [splashFinished, setSplashFinished] = useState(false);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ToastProvider>
          <AuthProvider>
            <CartProvider>
              <WishlistProvider>
                <LocationProvider>
                  <NotificationProvider>
              {fontsLoaded ? (
                <MainAppNavigation />
              ) : (
                <View style={{ flex: 1, backgroundColor: renewxColors.surface }} />
              )}
              {!splashFinished && (
                <AnimatedSplashScreen
                  isReady={fontsLoaded}
                  onFinish={() => setSplashFinished(true)}
                />
              )}
                  </NotificationProvider>
                </LocationProvider>
              </WishlistProvider>
            </CartProvider>
          </AuthProvider>
        </ToastProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

export default Sentry.wrap(App);

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: renewxColors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingTabBarWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  floatingCartBanner: {
    width: '94%',
    maxWidth: 460,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F7ED',
    borderWidth: 1,
    borderColor: '#C3E7CB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginBottom: 8,
    boxShadow: '0px 6px 18px rgba(12, 122, 67, 0.12)',
    elevation: 8,
  },
  floatingCartLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  floatingCartCheckCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#0C7A43',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingCartText: {
    fontFamily: renewxFontFamily.semibold,
    fontSize: 12,
    color: '#064E2E',
    fontWeight: '700',
  },
  floatingCartRightBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#064E2E',
    borderRadius: 16,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  floatingCartCount: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  floatingNavRow: {
    width: '94%',
    maxWidth: 460,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  floatingMainCapsule: {
    flex: 1,
    height: 62,
    position: 'relative',
    borderRadius: renewxRadius.pill,
    boxShadow: '0px 10px 30px rgba(15, 23, 42, 0.08)',
    elevation: 10,
  },
  floatingBlurBackground: {
    borderRadius: renewxRadius.pill,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  floatingCapsuleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 62,
    paddingHorizontal: 6,
  },
  floatingTabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    borderRadius: renewxRadius.pill,
  },
  floatingTabItemActive: {
    backgroundColor: '#FDE047',
    borderRadius: 20,
    paddingHorizontal: 6,
  },
  floatingIconBox: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 22,
  },
  floatingTabLabel: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: renewxFontFamily.semibold,
    color: '#64748B',
    marginTop: 2,
  },
  floatingTabLabelActive: {
    color: '#000000',
    fontWeight: '800',
  },
  floatingSellSeparateBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginLeft: 6,
    paddingTop: 2,
  },
  floatingSellCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FACC15',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { boxShadow: '0px 6px 18px rgba(250, 204, 21, 0.45)' },
      default: {
        shadowColor: '#FACC15',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.45,
        shadowRadius: 8,
        elevation: 8,
      },
    }),
  },
  floatingSellCircleActive: {
    backgroundColor: '#EAB308',
  },
  floatingSellLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    fontFamily: renewxFontFamily.bold,
    color: '#0F172A',
    marginTop: 2,
  },
  floatingSellLabelActive: {
    color: '#000000',
    fontWeight: '900',
  },
  sellSparkleTopRight: {
    position: 'absolute',
    top: -2,
    right: -4,
  },
  sellSparkleBottomLeft: {
    position: 'absolute',
    bottom: 12,
    left: -4,
  },
  sparkleChar: {
    fontSize: 10,
  },
});
