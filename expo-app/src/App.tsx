import { NavigationContainer, type LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import type { Product } from '@/types';
import { colors } from '@/theme';
import { CartProvider } from '@/context/CartContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';

import HomeScreen from '@/screens/HomeScreen';
import ShopScreen from '@/screens/ShopScreen';
import SellScreen from '@/screens/SellScreen';
import MySellRequestsScreen from '@/screens/MySellRequestsScreen';
import TrackScreen from '@/screens/TrackScreen';
import AccountScreen from '@/screens/AccountScreen';
import CartScreen from '@/screens/CartScreen';
import CheckoutScreen from '@/screens/CheckoutScreen';
import OrderConfirmScreen from '@/screens/OrderConfirmScreen';
import PaymentScreen from '@/screens/PaymentScreen';
import ProductDetailScreen from '@/screens/ProductDetailScreen';
import SearchScreen from '@/screens/SearchScreen';
import AuthScreen from '@/screens/AuthScreen';
import AdminPanel from '@/screens/AdminPanel';
import FloatingContactButtons from '@/components/FloatingContactButtons';

export type RootStackParamList = {
  MainTabs: { screen?: keyof TabParamList } | undefined;
  ProductDetail: { product?: Product; id?: string };
  Search: undefined;
  Cart: undefined;
  Checkout: undefined;
  OrderConfirm: {
    customerInfo: {
      name: string;
      phone: string;
      address: string;
      pincode: string;
    };
  };
  MySellRequests: undefined;
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

  // Container fallback
  Admin: {
    screen?: 'dashboard' | 'products' | 'brands' | 'orders' | 'users' | 'addProduct' | 'editProduct' | 'addBrand' | 'addModel';
    productId?: string;
    brandId?: string;
    id?: string;
  } | undefined;
};

// Deep linking configuration for URL bar sync and navigation
export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [
    'renewx://',
    'http://localhost:8081',
    'http://127.0.0.1:8081',
    'http://localhost:19006',
    'http://localhost:8082',
    'http://10.0.2.2:8081',
  ],
  config: {
    screens: {
      MainTabs: {
        screens: {
          Home: '',
          Shop: 'shop',
          Sell: 'sell',
          Track: 'track',
          Account: 'account',
        },
      } as any,
      ProductDetail: 'product/:id',
      Search: 'search',
      Cart: 'cart',
      Checkout: 'checkout',
      OrderConfirm: 'confirm',
      Payment: 'payment',
      MySellRequests: 'sell-requests',
      AdminDashboard: 'admin/dashboard',
      AdminProducts: 'admin/products',
      AdminAddProduct: 'admin/add/product/:id?',
      AdminEditProduct: 'admin/edit/product/:id',
      AdminBrands: 'admin/brands',
      AdminAddBrand: 'admin/add/brands',
      AdminAddModel: 'admin/add/models',
      AdminOrders: 'admin/orders',
      AdminUsers: 'admin/users',
      Admin: 'admin',
    },
  },
};

export type TabParamList = {
  Home: undefined;
  Shop: undefined;
  Sell: undefined;
  Track: undefined;
  Account: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// Custom Elevated Sell Button with Dollar sign
function CustomSellTabButton({ children, onPress, accessibilityState }: any) {
  const focused = accessibilityState?.selected;
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.customSellContainer}
      activeOpacity={0.88}
    >
      <View style={[styles.customSellCircle, focused && styles.customSellCircleActive]}>
        <Text style={styles.sellCurrencySign}>$</Text>
      </View>
      <Text style={[styles.sellLabel, focused && styles.sellLabelActive]}>Sell</Text>
    </TouchableOpacity>
  );
}

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0f172a',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          borderTopColor: '#ebe7dd',
          borderTopWidth: 1,
          backgroundColor: '#ffffff',
          height: Platform.OS === 'ios' ? 82 : 68,
          paddingBottom: Platform.OS === 'ios' ? 24 : 10,
          paddingTop: 8,
          elevation: 10,
          boxShadow: '0px -2px 8px rgba(0, 0, 0, 0.05)',
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={22}
              color={focused ? '#0f172a' : color}
            />
          ),
          tabBarLabel: 'Home',
        }}
      />

      <Tab.Screen
        name="Shop"
        component={ShopScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'grid' : 'grid-outline'}
              size={22}
              color={focused ? '#0f172a' : color}
            />
          ),
          tabBarLabel: 'Shop',
        }}
      />

      <Tab.Screen
        name="Sell"
        component={SellScreen}
        options={{
          tabBarButton: (props) => <CustomSellTabButton {...props} />,
        }}
      />

      <Tab.Screen
        name="Track"
        component={TrackScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'cube' : 'cube-outline'}
              size={22}
              color={focused ? '#0f172a' : color}
            />
          ),
          tabBarLabel: 'Track',
        }}
      />

      <Tab.Screen
        name="Account"
        component={AccountScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={22}
              color={focused ? '#0f172a' : color}
            />
          ),
          tabBarLabel: 'Account',
        }}
      />
    </Tab.Navigator>
  );
}

function MainAppNavigation() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer linking={linking}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="MainTabs" component={TabNavigator} />
          <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
          <Stack.Screen name="Search" component={SearchScreen} />
          <Stack.Screen name="Cart" component={CartScreen} />
          <Stack.Screen name="Checkout" component={CheckoutScreen} />
          <Stack.Screen name="OrderConfirm" component={OrderConfirmScreen} />
          <Stack.Screen name="Payment" component={PaymentScreen} />
          <Stack.Screen name="MySellRequests" component={MySellRequestsScreen} />

          {/* Dedicated Admin Direct Routes */}
          <Stack.Screen name="AdminDashboard" component={AdminPanel} />
          <Stack.Screen name="AdminProducts" component={AdminPanel} />
          <Stack.Screen name="AdminAddProduct" component={AdminPanel} />
          <Stack.Screen name="AdminEditProduct" component={AdminPanel} />
          <Stack.Screen name="AdminBrands" component={AdminPanel} />
          <Stack.Screen name="AdminAddBrand" component={AdminPanel} />
          <Stack.Screen name="AdminAddModel" component={AdminPanel} />
          <Stack.Screen name="AdminOrders" component={AdminPanel} />
          <Stack.Screen name="AdminUsers" component={AdminPanel} />
          <Stack.Screen name="Admin" component={AdminPanel} />
        </Stack.Navigator>
      </NavigationContainer>
      <FloatingContactButtons />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <MainAppNavigation />
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customSellContainer: {
    top: -18,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  customSellCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#ffc400',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3.5,
    borderColor: '#ffffff',
    boxShadow: '0px 4px 8px rgba(255, 196, 0, 0.5)',
    elevation: 8,
  },
  customSellCircleActive: {
    backgroundColor: '#f59e0b',
    borderColor: '#ffffff',
  },
  sellCurrencySign: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0a0a0a',
    marginTop: -2,
  },
  sellLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9ca3af',
    marginTop: 2,
  },
  sellLabelActive: {
    color: '#0f172a',
    fontWeight: '900',
  },
});
