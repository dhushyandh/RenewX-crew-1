import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Alert,
  Image,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase, type ProductRow, type Profile } from '@/lib/supabase';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme';
import { api } from '@/services/api';
import { useToast } from '@/context/ToastContext';
import ImagePickerButton from '@/components/ImagePickerButton';
import BrandsView from '@/components/admin/BrandsView';

type AdminView = 'dashboard' | 'products' | 'brands' | 'orders' | 'users';

const CATEGORIES = ['Laptops', 'Phones', 'Audio', 'Wearables', 'Cameras', 'Tablets'];
const CONDITIONS = ['Fair', 'Good', 'Excellent', 'Like New'];

export default function AdminPanel({ route, onExit }: { route?: any; onExit?: () => void }) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const routeName = route?.name;
  const paramScreen = route?.params?.screen;
  const targetId = route?.params?.id || route?.params?.productId;
  const hasValidTargetId = typeof targetId === 'string' && /^[a-f\d]{24}$/i.test(targetId);

  const determineInitialView = (): AdminView => {
    if (routeName === 'AdminBrands' || routeName === 'AdminAddBrand' || routeName === 'AdminAddModel') return 'brands';
    if (routeName === 'AdminProducts' || routeName === 'AdminAddProduct' || routeName === 'AdminEditProduct') return 'products';
    if (routeName === 'AdminOrders') return 'orders';
    if (routeName === 'AdminUsers') return 'users';
    if (routeName === 'AdminDashboard') return 'dashboard';

    if (paramScreen === 'brands' || paramScreen === 'addBrand' || paramScreen === 'addModel') return 'brands';
    if (paramScreen === 'products' || paramScreen === 'addProduct' || paramScreen === 'editProduct') return 'products';
    if (paramScreen === 'orders') return 'orders';
    if (paramScreen === 'users') return 'users';
    return 'dashboard';
  };

  const [view, setView] = useState<AdminView>(determineInitialView());
  const [modalVisible, setModalVisible] = useState(
    routeName === 'AdminAddProduct' ||
    routeName === 'AdminEditProduct' ||
    paramScreen === 'addProduct' ||
    paramScreen === 'editProduct'
  );
  const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const topInset = insets.top > 0 ? insets.top + 6 : 44;

  const getActiveRoutePath = (): string => {
    if ((routeName === 'AdminEditProduct' || paramScreen === 'editProduct') && hasValidTargetId) {
      return `/admin/edit/product/${targetId || ':id'}`;
    }
    if (routeName === 'AdminAddProduct' || paramScreen === 'addProduct') {
      return targetId ? `/admin/add/product/${targetId}` : '/admin/add/product';
    }
    if (routeName === 'AdminAddBrand' || paramScreen === 'addBrand') return '/admin/add/brands';
    if (routeName === 'AdminAddModel' || paramScreen === 'addModel') return '/admin/add/models';
    if (routeName === 'AdminBrands' || view === 'brands') return '/admin/brands';
    if (routeName === 'AdminProducts' || view === 'products') return '/admin/products';
    if (routeName === 'AdminOrders' || view === 'orders') return '/admin/orders';
    if (routeName === 'AdminUsers' || view === 'users') return '/admin/users';
    return '/admin/dashboard';
  };

  useEffect(() => {
    const nextView = determineInitialView();
    setView(nextView);

    if ((routeName === 'AdminEditProduct' || paramScreen === 'editProduct') && hasValidTargetId) {
      (async () => {
        try {
          const p = await api.products.getById(targetId);
          if (p) {
            setEditingProduct(p);
            setModalVisible(true);
          }
        } catch (err) {
          console.warn('[AdminPanel] Could not load product for editing:', err);
        }
      })();
    } else if (routeName === 'AdminAddProduct' || paramScreen === 'addProduct') {
      setEditingProduct(null);
      setModalVisible(true);
    }
  }, [routeName, paramScreen, targetId, hasValidTargetId]);

  const handleBack = () => {
    if (modalVisible) {
      setModalVisible(false);
      return;
    }
    if (onExit) {
      onExit();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('MainTabs', { screen: 'Account' });
    }
  };

  const handleTabPress = (v: AdminView) => {
    setView(v);
    if (v === 'dashboard') navigation.navigate('AdminDashboard');
    else if (v === 'products') navigation.navigate('AdminProducts');
    else if (v === 'brands') navigation.navigate('AdminBrands');
    else if (v === 'orders') navigation.navigate('AdminOrders');
    else if (v === 'users') navigation.navigate('AdminUsers');
  };

  const handleAddProduct = () => {
    setEditingProduct(null);
    setModalVisible(true);
    navigation.navigate('AdminAddProduct');
  };

  const handleEditProduct = (p: ProductRow) => {
    if (!p.id) return;
    setEditingProduct(p);
    setModalVisible(true);
    navigation.navigate('AdminEditProduct', { id: p.id });
  };

  return (
    <View style={[styles.safeArea, { paddingTop: topInset }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color="#ffffff" />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.headerTitle}>RenewX Command</Text>
            <View
              style={{
                backgroundColor: 'rgba(255, 196, 0, 0.2)',
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 10,
              }}
            >
              <Text
                style={{
                  fontSize: 9,
                  fontWeight: '800',
                  color: colors.primary,
                  textTransform: 'uppercase',
                }}
              >
                Admin
              </Text>
            </View>
          </View>
          <Text style={styles.headerSub}>Store Telemetry & Warehouse Management</Text>
        </View>

        <TouchableOpacity
          onPress={handleAddProduct}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            backgroundColor: colors.primary,
            paddingHorizontal: 12,
            paddingVertical: 7,
            borderRadius: radius.md,
          }}
        >
          <Ionicons name="add" size={16} color={colors.black} />
          <Text style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.black }}>
            Add
          </Text>
        </TouchableOpacity>
      </View>

      {/* Visual Route Path Banner (so users always see the exact route!) */}
      <View style={styles.routeBanner}>
        <View style={styles.routePill}>
          <Ionicons name="link-outline" size={12} color="#ffc400" />
          <Text style={styles.routePillLabel}>ROUTE</Text>
          <Text style={styles.routePillPath}>{getActiveRoutePath()}</Text>
        </View>
        <View style={styles.liveSyncBadge}>
          <View style={styles.livePulseDot} />
          <Text style={styles.liveSyncText}>SYNCED</Text>
        </View>
      </View>

      {/* Segmented Tab Navigation */}
      <View style={styles.tabNav}>
        {(['dashboard', 'products', 'brands', 'orders', 'users'] as AdminView[]).map((v) => {
          const isActive = view === v;
          return (
            <TouchableOpacity
              key={v}
              onPress={() => handleTabPress(v)}
              style={[styles.tabItem, isActive && styles.tabItemActive]}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {v.toUpperCase()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Main View Area */}
      <View style={styles.content}>
        {view === 'dashboard' && (
          <DashboardView
            onNavigate={(v) => setView(v)}
            onAddProduct={handleAddProduct}
            onEditProduct={handleEditProduct}
            refreshSignal={refreshSignal}
          />
        )}
        {view === 'products' && (
          <ProductsView
            onAddProduct={handleAddProduct}
            onEditProduct={handleEditProduct}
            refreshSignal={refreshSignal}
          />
        )}
        {view === 'brands' && (
          <BrandsView
            initialAction={
              route?.params?.screen === 'addBrand'
                ? 'addBrand'
                : route?.params?.screen === 'addModel'
                ? 'addModel'
                : undefined
            }
            preselectedBrandId={route?.params?.brandId}
          />
        )}
        {view === 'orders' && <OrdersView />}
        {view === 'users' && <UsersView />}
      </View>

      {/* Product Add/Edit Modal */}
      {modalVisible && (
        <ProductModal
          visible={modalVisible}
          product={editingProduct}
          onClose={() => {
            setModalVisible(false);
            setEditingProduct(null);
          }}
          onSaved={() => {
            setModalVisible(false);
            setEditingProduct(null);
            setRefreshSignal((s) => s + 1);
          }}
        />
      )}
    </View>
  );
}

/* ========================================================================================
   DASHBOARD VIEW
======================================================================================== */
function DashboardView({
  onNavigate,
  onAddProduct,
  onEditProduct,
  refreshSignal,
}: {
  onNavigate: (view: AdminView) => void;
  onAddProduct: () => void;
  onEditProduct: (p: ProductRow) => void;
  refreshSignal?: number;
}) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [prods, ords, profs] = await Promise.all([
        api.products.getAll(),
        api.orders.getAll(),
        api.users.getAll(),
      ]);

      setProducts((prods as ProductRow[]) || []);
      setOrders(ords || []);
      setProfiles((profs as Profile[]) || []);
    } catch (err) {
      console.error('Error fetching dashboard stats', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData, refreshSignal]);

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={{ marginTop: 8, fontSize: fontSize.xs, color: '#94a3b8' }}>
          Syncing store telemetry...
        </Text>
      </View>
    );
  }

  // Telemetry Calculations
  const totalStock = products.reduce((acc, p) => acc + (p.stock || 0), 0);
  const inventoryValuation = products.reduce((acc, p) => acc + (p.price * (p.stock || 0)), 0);
  const totalRevenue = orders.reduce((acc, o) => acc + (o.total || 0), 0) || inventoryValuation;
  const lowStockItems = products.filter((p) => p.stock <= 3);
  const inStockRatio = products.length > 0
    ? Math.round((products.filter((p) => p.stock > 0).length / products.length) * 100)
    : 100;
  const adminCount = profiles.filter((p) => p.role === 'admin').length;
  const customerCount = Math.max(0, profiles.length - adminCount);

  // Category counts
  const categoryCounts: Record<string, number> = {};
  products.forEach((p) => {
    const cat = p.category || 'Other';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });
  const categoryEntries = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);

  const barColors = ['#ffc400', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#f97316'];

  return (
    <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Telemetry Status Bar */}
      <View style={styles.telemetryBar}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <View style={styles.pulseDot} />
          <View style={{ flex: 1 }}>
            <Text style={styles.telemetryTitle}>Store Telemetry Live</Text>
            <Text style={styles.telemetrySub}>Real-time warehouse & database sync</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleManualRefresh}
          disabled={refreshing}
          style={styles.syncBtn}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color="#0f172a" />
          ) : (
            <>
              <Ionicons name="refresh" size={13} color="#0f172a" />
              <Text style={styles.syncBtnText}>Sync</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* 4 Production KPI Cards (2x2 Grid) */}
      <View style={styles.kpiGrid}>
        {/* Gross Revenue */}
        <View style={styles.kpiCard}>
          <View style={styles.kpiTopRow}>
            <View style={[styles.kpiIcon, { backgroundColor: '#10b981' }]}>
              <Ionicons name="cash-outline" size={18} color="#ffffff" />
            </View>
            <View
              style={[
                styles.kpiBadge,
                { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' },
              ]}
            >
              <Text style={[styles.kpiBadgeText, { color: '#059669' }]}>+18.4%</Text>
            </View>
          </View>
          <Text style={styles.kpiValue} numberOfLines={1}>
            ₹{totalRevenue.toLocaleString('en-IN')}
          </Text>
          <Text style={styles.kpiLabel}>Gross Revenue</Text>
          <Text style={styles.kpiSub} numberOfLines={1}>
            Valuation: ₹{inventoryValuation.toLocaleString('en-IN')}
          </Text>
        </View>

        {/* Live Warehouse Stock */}
        <View style={styles.kpiCard}>
          <View style={styles.kpiTopRow}>
            <View style={[styles.kpiIcon, { backgroundColor: '#3b82f6' }]}>
              <Ionicons name="cube-outline" size={18} color="#ffffff" />
            </View>
            <View
              style={[
                styles.kpiBadge,
                { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
              ]}
            >
              <Text style={[styles.kpiBadgeText, { color: '#2563eb' }]}>
                {inStockRatio}% Optimal
              </Text>
            </View>
          </View>
          <Text style={styles.kpiValue} numberOfLines={1}>
            {totalStock} Units
          </Text>
          <Text style={styles.kpiLabel}>Warehouse Stock</Text>
          <Text style={styles.kpiSub} numberOfLines={1}>
            Across {products.length} models
          </Text>
        </View>

        {/* Orders Processed */}
        <View style={styles.kpiCard}>
          <View style={styles.kpiTopRow}>
            <View style={[styles.kpiIcon, { backgroundColor: '#f59e0b' }]}>
              <Ionicons name="bag-check-outline" size={18} color="#ffffff" />
            </View>
            <View
              style={[
                styles.kpiBadge,
                { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
              ]}
            >
              <Text style={[styles.kpiBadgeText, { color: '#d97706' }]}>Pipeline</Text>
            </View>
          </View>
          <Text style={styles.kpiValue} numberOfLines={1}>
            {orders.length} Orders
          </Text>
          <Text style={styles.kpiLabel}>Store Checkouts</Text>
          <Text style={styles.kpiSub} numberOfLines={1}>
            Avg ticket: ₹{orders.length ? Math.round(totalRevenue / orders.length).toLocaleString('en-IN') : 0}
          </Text>
        </View>

        {/* Registered Community */}
        <View style={styles.kpiCard}>
          <View style={styles.kpiTopRow}>
            <View style={[styles.kpiIcon, { backgroundColor: '#8b5cf6' }]}>
              <Ionicons name="people-outline" size={18} color="#ffffff" />
            </View>
            <View
              style={[
                styles.kpiBadge,
                { backgroundColor: '#f5f3ff', borderColor: '#ddd6fe' },
              ]}
            >
              <Text style={[styles.kpiBadgeText, { color: '#7c3aed' }]}>
                {adminCount} Admins
              </Text>
            </View>
          </View>
          <Text style={styles.kpiValue} numberOfLines={1}>
            {profiles.length} Users
          </Text>
          <Text style={styles.kpiLabel}>Registered Members</Text>
          <Text style={styles.kpiSub} numberOfLines={1}>
            {customerCount} Customers
          </Text>
        </View>
      </View>

      {/* Critical Inventory Shortage Alert / All Optimal Reassurance */}
      {lowStockItems.length > 0 ? (
        <View style={styles.alertBox}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
              <Ionicons name="warning" size={18} color="#d97706" />
              <View style={{ flex: 1 }}>
                <Text style={styles.alertTitle}>
                  Critical Shortage ({lowStockItems.length} Products)
                </Text>
                <Text style={styles.alertSub}>Units remaining at or below 3</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => onNavigate('products')}>
              <Text style={styles.alertLink}>View All</Text>
            </TouchableOpacity>
          </View>

          {lowStockItems.slice(0, 3).map((item) => (
            <View key={item.id} style={styles.lowStockRow}>
              <Image source={{ uri: item.image_url }} style={styles.lowStockImg} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.lowStockTitle} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.lowStockMeta}>
                  ₹{item.price.toLocaleString('en-IN')} · {item.brand}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View
                  style={[
                    styles.lowStockBadge,
                    { backgroundColor: item.stock === 0 ? '#fee2e2' : '#fef3c7' },
                  ]}
                >
                  <Text
                    style={[
                      styles.lowStockBadgeText,
                      { color: item.stock === 0 ? '#b91c1c' : '#b45309' },
                    ]}
                  >
                    {item.stock === 0 ? '0 Left' : `${item.stock} left`}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => onEditProduct(item)}
                  style={styles.restockBtn}
                >
                  <Text style={styles.restockBtnText}>Restock</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.optimalBox}>
          <Ionicons name="shield-checkmark" size={20} color="#059669" />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.optimalTitle}>Inventory Levels Optimal</Text>
            <Text style={styles.optimalSub}>All devices exceed the safety buffer threshold</Text>
          </View>
          <View style={styles.optimalBadge}>
            <Text style={styles.optimalBadgeText}>100% Ready</Text>
          </View>
        </View>
      )}

      {/* Command Shortcuts Grid */}
      <Text style={[styles.sectionHeader, { marginTop: 14, marginBottom: 8 }]}>
        Command Shortcuts
      </Text>
      <View style={styles.shortcutGrid}>
        <TouchableOpacity
          onPress={onAddProduct}
          style={[styles.shortcutCard, { backgroundColor: '#000000', borderColor: '#000000' }]}
        >
          <View style={styles.shortcutTopRow}>
            <View style={[styles.shortcutIconWrap, { backgroundColor: colors.primary }]}>
              <Ionicons name="add" size={16} color={colors.black} />
            </View>
            <Ionicons name="arrow-forward" size={14} color={colors.primary} />
          </View>
          <Text style={[styles.shortcutTitle, { color: '#ffffff' }]}>List New Product</Text>
          <Text style={[styles.shortcutSub, { color: '#94a3b8' }]}>
            Upload certified pre-owned tech
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onNavigate('products')}
          style={styles.shortcutCard}
        >
          <View style={styles.shortcutTopRow}>
            <View style={[styles.shortcutIconWrap, { backgroundColor: '#eff6ff' }]}>
              <Ionicons name="cube" size={16} color="#3b82f6" />
            </View>
            <Ionicons name="chevron-forward" size={14} color="#94a3b8" />
          </View>
          <Text style={styles.shortcutTitle}>Manage Products</Text>
          <Text style={styles.shortcutSub}>{products.length} models listed</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onNavigate('orders')}
          style={styles.shortcutCard}
        >
          <View style={styles.shortcutTopRow}>
            <View style={[styles.shortcutIconWrap, { backgroundColor: '#fffbeb' }]}>
              <Ionicons name="receipt" size={16} color="#f59e0b" />
            </View>
            <Ionicons name="chevron-forward" size={14} color="#94a3b8" />
          </View>
          <Text style={styles.shortcutTitle}>Customer Orders</Text>
          <Text style={styles.shortcutSub}>{orders.length} orders recorded</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onNavigate('users')}
          style={styles.shortcutCard}
        >
          <View style={styles.shortcutTopRow}>
            <View style={[styles.shortcutIconWrap, { backgroundColor: '#f5f3ff' }]}>
              <Ionicons name="people" size={16} color="#8b5cf6" />
            </View>
            <Ionicons name="chevron-forward" size={14} color="#94a3b8" />
          </View>
          <Text style={styles.shortcutTitle}>User Permissions</Text>
          <Text style={styles.shortcutSub}>{profiles.length} member accounts</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onNavigate('brands')}
          style={styles.shortcutCard}
        >
          <View style={styles.shortcutTopRow}>
            <View style={[styles.shortcutIconWrap, { backgroundColor: '#eff6ff' }]}>
              <Ionicons name="business" size={16} color="#2563eb" />
            </View>
            <Ionicons name="chevron-forward" size={14} color="#94a3b8" />
          </View>
          <Text style={styles.shortcutTitle}>Brands & Models</Text>
          <Text style={styles.shortcutSub}>Catalog & trade-in specs</Text>
        </TouchableOpacity>
      </View>

      {/* Category Distribution Breakdown */}
      <View style={styles.categoryCard}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={styles.categoryCardTitle}>Inventory Distribution</Text>
            <Text style={styles.categoryCardSub}>Category stock breakdown</Text>
          </View>
          <View style={styles.skuBadge}>
            <Text style={styles.skuBadgeText}>{products.length} Total SKUs</Text>
          </View>
        </View>

        {/* Multi-segment progress bar */}
        <View style={styles.categoryBarWrap}>
          {categoryEntries.map(([cat, count], idx) => {
            const pct = products.length ? (count / products.length) * 100 : 0;
            return (
              <View
                key={cat}
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  backgroundColor: barColors[idx % barColors.length],
                }}
              />
            );
          })}
        </View>

        {/* Category Chips */}
        <View style={styles.categoryChipRow}>
          {categoryEntries.map(([cat, count], idx) => (
            <View key={cat} style={styles.categoryChip}>
              <View
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 4,
                  backgroundColor: barColors[idx % barColors.length],
                }}
              />
              <Text style={styles.categoryChipText}>
                {cat}: <Text style={{ fontWeight: '800' }}>{count}</Text>
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Recent Orders Live Feed */}
      <View style={styles.categoryCard}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <View>
            <Text style={styles.categoryCardTitle}>Recent Customer Orders</Text>
            <Text style={styles.categoryCardSub}>Latest storefront checkouts</Text>
          </View>
          <TouchableOpacity
            onPress={() => onNavigate('orders')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
          >
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#2563eb' }}>View All</Text>
            <Ionicons name="chevron-forward" size={12} color="#2563eb" />
          </TouchableOpacity>
        </View>

        {orders.length === 0 ? (
          <Text style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', paddingVertical: 14 }}>
            No customer orders recorded yet.
          </Text>
        ) : (
          orders.slice(0, 4).map((order) => {
            const dateStr = new Date(order.created_at).toLocaleDateString('en-IN', {
              month: 'short',
              day: 'numeric',
            });
            const itemCount = order.order_items?.length || 1;
            return (
              <View key={order.id} style={styles.recentOrderRow}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.recentOrderId}>#{order.id.slice(0, 8)}</Text>
                    <View style={styles.orderStatusPill}>
                      <Text style={styles.orderStatusPillText}>
                        {order.status || 'Delivered'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.recentOrderSub}>
                    {dateStr} · {itemCount} {itemCount === 1 ? 'item' : 'items'}
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.recentOrderPrice}>
                    ₹{order.total?.toLocaleString('en-IN') || '0'}
                  </Text>
                  <Text style={styles.recentOrderPaid}>Paid Online</Text>
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

/* ========================================================================================
   PRODUCTS VIEW
======================================================================================== */
function ProductsView({
  onAddProduct,
  onEditProduct,
  refreshSignal,
}: {
  onAddProduct?: () => void;
  onEditProduct?: (p: ProductRow) => void;
  refreshSignal?: number;
}) {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const toast = useToast();

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.products.getAll();
      if (data) {
        setProducts(data as ProductRow[]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts, refreshSignal]);

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Delete Product', `Are you sure you want to delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.products.delete(id);
            setProducts((prev) => prev.filter((p) => p.id !== id));
            toast.info(`"${name}" was deleted from inventory`, 'Product Deleted');
          } catch (err: any) {
            toast.error(err?.message || 'Failed to delete product', 'Error');
          }
        },
      },
    ]);
  };

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={{ flex: 1 }}>
      {/* Search and Add Bar */}
      <View style={styles.productSearchBar}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#94a3b8" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search products or brands..."
            placeholderTextColor="#94a3b8"
            style={styles.searchInput}
          />
        </View>
        <TouchableOpacity
          onPress={() => {
            if (onAddProduct) {
              onAddProduct();
            }
          }}
          style={styles.addBtn}
        >
          <Ionicons name="add" size={24} color={colors.black} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={40} color="#94a3b8" />
          <Text style={styles.emptyText}>No products found</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.productList}>
          {filtered.map((p) => (
            <View key={p.id} style={styles.productCard}>
              <Image source={{ uri: p.image_url }} style={styles.productImg} />
              <View style={styles.productDetails}>
                <View style={styles.productHeaderRow}>
                  <Text style={styles.productTitle} numberOfLines={1}>
                    {p.name}
                  </Text>
                  <View style={styles.actionIcons}>
                    <TouchableOpacity
                      onPress={() => {
                        if (onEditProduct) {
                          onEditProduct(p);
                        }
                      }}
                      style={styles.actionBtn}
                    >
                      <Ionicons name="pencil" size={14} color="#3b82f6" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(p.id, p.name)}
                      style={[styles.actionBtn, { backgroundColor: '#fee2e2' }]}
                    >
                      <Ionicons name="trash" size={14} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.productMeta}>
                  {p.brand} · {p.category} · {p.condition}
                </Text>

                <View style={styles.priceStockRow}>
                  <View style={styles.priceRow}>
                    <Text style={styles.currentPrice}>₹{p.price.toLocaleString('en-IN')}</Text>
                    {p.original_price ? (
                      <Text style={styles.originalPrice}>
                        ₹{p.original_price.toLocaleString('en-IN')}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={[styles.stockBadge, p.stock <= 3 && styles.lowStock]}>
                    {p.stock} in stock
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

interface SpecItem {
  id: string;
  key: string;
  value: string;
}

const BRAND_MODELS: Record<string, string[]> = {
  Apple: ['iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15', 'iPhone 14 Pro', 'iPhone 13', 'MacBook Pro 14"', 'MacBook Air M2', 'iPad Pro 11"', 'Apple Watch Ultra'],
  Samsung: ['Galaxy S24 Ultra', 'Galaxy S24+', 'Galaxy S24', 'Galaxy Z Fold 5', 'Galaxy Tab S9'],
  Google: ['Pixel 8 Pro', 'Pixel 8', 'Pixel 7a', 'Pixel Fold'],
  OnePlus: ['OnePlus 12', 'OnePlus 12R', 'OnePlus Open'],
  Sony: ['WH-1000XM5', 'Alpha A7 IV', 'Xperia 1 V'],
  Dell: ['XPS 15', 'XPS 13 Plus', 'Alienware m16'],
  Lenovo: ['ThinkPad X1 Carbon', 'Legion Pro 7i', 'Yoga 9i'],
  HP: ['Spectre x360', 'Envy 16', 'Omen 16'],
  Asus: ['ROG Zephyrus G14', 'Zenbook 14 OLED'],
};

const PHOTO_PRESETS: Record<string, string[]> = {
  Phones: [
    'https://images.pexels.com/photos/18311092/pexels-photo-18311092.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/404280/pexels-photo-404280.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/699122/pexels-photo-699122.jpeg?auto=compress&cs=tinysrgb&w=800',
  ],
  Smartphones: [
    'https://images.pexels.com/photos/18311092/pexels-photo-18311092.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/404280/pexels-photo-404280.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/699122/pexels-photo-699122.jpeg?auto=compress&cs=tinysrgb&w=800',
  ],
  Laptops: [
    'https://images.pexels.com/photos/18105/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/303383/pexels-photo-303383.jpeg?auto=compress&cs=tinysrgb&w=800',
  ],
  Audio: [
    'https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/577769/pexels-photo-577769.jpeg?auto=compress&cs=tinysrgb&w=800',
  ],
  Wearables: [
    'https://images.pexels.com/photos/437037/pexels-photo-437037.jpeg?auto=compress&cs=tinysrgb&w=800',
  ],
  Tablets: [
    'https://images.pexels.com/photos/1334597/pexels-photo-1334597.jpeg?auto=compress&cs=tinysrgb&w=800',
  ],
  Cameras: [
    'https://images.pexels.com/photos/51383/photo-camera-subject-photographer-51383.jpeg?auto=compress&cs=tinysrgb&w=800',
  ],
};

const ALL_CATEGORIES = ['Smartphones', 'Laptops', 'Tablets', 'Audio', 'Wearables', 'Cameras'];
const ALL_BRANDS = ['Apple', 'Samsung', 'Google', 'OnePlus', 'Sony', 'Dell', 'HP', 'Lenovo', 'Asus'];
const CONDITION_GRADES = ['A+ (Pristine)', 'A (Like New)', 'B+ (Excellent)', 'B (Good)', 'C (Fair)'];
const STORE_STATUSES = [
  { id: 'Available', label: '🟢 Available' },
  { id: 'Out of Stock', label: '🔴 Out of Stock' },
  { id: 'Reserved', label: '🟡 Reserved' },
];

function ProductModal({
  visible,
  product,
  onClose,
  onSaved,
}: {
  visible: boolean;
  product: ProductRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  // General Details
  const toast = useToast();
  const [title, setTitle] = useState(product?.name ?? '');
  const [category, setCategory] = useState(
    product?.category === 'Phones' ? 'Smartphones' : product?.category ?? 'Smartphones'
  );
  const [brand, setBrand] = useState(product?.brand ?? 'Apple');
  const [model, setModel] = useState('');

  // Pricing & Inventory
  const [sellingPrice, setSellingPrice] = useState(product ? String(product.price) : '');
  const [originalMsrp, setOriginalMsrp] = useState(product ? String(product.original_price) : '');
  const [stockQty, setStockQty] = useState(product ? String(product.stock) : '1');
  const [storeStatus, setStoreStatus] = useState('Available');

  // Hardware Attributes
  const [storage, setStorage] = useState('256GB');
  const [color, setColor] = useState('Space Black');
  const [conditionGrade, setConditionGrade] = useState('A+ (Pristine)');
  const [batteryHealth, setBatteryHealth] = useState('100');
  const [conditionTitle, setConditionTitle] = useState('Brand New Condition');
  const [conditionDescription, setConditionDescription] = useState('Clean Condition');
  const [highlights, setHighlights] = useState('Mobile & Box\nClean Condition');

  // Key-Value Specifications
  const [specsList, setSpecsList] = useState<SpecItem[]>([
    { id: '1', key: 'Display', value: '6.7-inch Super Retina' },
    { id: '2', key: 'Battery Health', value: '100%' },
  ]);

  // Product Photography
  const [imageTab, setImageTab] = useState<'url' | 'upload'>('url');
  const [inputImageUrl, setInputImageUrl] = useState('');
  const [images, setImages] = useState<string[]>(
    product?.image_url ? [product.image_url] : []
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addSpec = () => {
    setSpecsList((prev) => [...prev, { id: String(Date.now()), key: '', value: '' }]);
  };

  const removeSpec = (id: string) => {
    setSpecsList((prev) => prev.filter((s) => s.id !== id));
  };

  const updateSpec = (id: string, field: 'key' | 'value', val: string) => {
    setSpecsList((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: val } : s))
    );
  };

  const addImage = () => {
    if (!inputImageUrl.trim()) return;
    setImages((prev) => [...prev, inputImageUrl.trim()]);
    setInputImageUrl('');
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const loadPresets = () => {
    const list = PHOTO_PRESETS[category] || PHOTO_PRESETS.Phones;
    setImages(list);
  };

  const handleSave = async () => {
    if (!title.trim() || !brand.trim() || !sellingPrice) {
      setError('Please fill Product Title, Brand, and Selling Price.');
      return;
    }

    const primaryImage =
      images[0] ||
      product?.image_url ||
      'https://images.pexels.com/photos/18311092/pexels-photo-18311092.jpeg?auto=compress&cs=tinysrgb&w=800';

    let normalizedCondition = 'Good';
    if (conditionGrade.includes('Pristine') || conditionGrade.includes('Like New')) {
      normalizedCondition = 'Like New';
    } else if (conditionGrade.includes('Excellent')) {
      normalizedCondition = 'Excellent';
    } else if (conditionGrade.includes('Fair')) {
      normalizedCondition = 'Fair';
    }

    const combinedSpecs: string[] = [];
    if (storage) combinedSpecs.push(`Storage: ${storage}`);
    if (color) combinedSpecs.push(`Color: ${color}`);
    if (batteryHealth) combinedSpecs.push(`Battery: ${batteryHealth}%`);
    specsList.forEach((s) => {
      if (s.key.trim() && s.value.trim()) {
        combinedSpecs.push(`${s.key.trim()}: ${s.value.trim()}`);
      }
    });

    const highlightLines = highlights.split('\n').map((h) => h.trim()).filter(Boolean);
    highlightLines.forEach((h) => combinedSpecs.push(`Highlight: ${h}`));

    setSaving(true);
    setError(null);

    const payload = {
      name: title.trim(),
      brand: brand.trim(),
      category: category === 'Smartphones' ? 'Phones' : category,
      original_price: parseInt(originalMsrp) || parseInt(sellingPrice),
      price: parseInt(sellingPrice),
      condition: normalizedCondition,
      warranty_months: 6,
      image_url: primaryImage,
      stock: parseInt(stockQty) || 1,
      description:
        conditionDescription.trim() || conditionTitle.trim() || 'Certified pre-owned device.',
      specs: combinedSpecs,
    };

    try {
      if (product) {
        await api.products.update(product.id, payload);
        toast.success(`"${title}" has been updated`, 'Product Updated');
      } else {
        await api.products.create(payload);
        toast.success(`"${title}" is now live in store`, 'Product Published');
      }
      onSaved();
    } catch (err: any) {
      setError(err?.message || 'Failed to save product');
      toast.error(err?.message || 'Failed to save product', 'Save Failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.uploadModalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
              <View style={styles.purpleIconBox}>
                <Ionicons name="cube-outline" size={20} color="#7c3aed" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.uploadModalTitle}>
                  {product ? 'Edit Product' : 'List New Product'}
                </Text>
                <Text style={styles.uploadModalSub}>
                  Add certified pre-owned tech to the live storefront
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.uploadCloseBtn}>
              <Ionicons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Scrollable Form Body */}
          <ScrollView
            contentContainerStyle={styles.uploadModalScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {error && (
              <View style={styles.uploadErrorBox}>
                <Ionicons name="alert-circle" size={16} color="#ef4444" />
                <Text style={styles.uploadErrorText}>{error}</Text>
              </View>
            )}

            {/* 1. GENERAL DETAILS */}
            <View style={styles.uploadCard}>
              <Text style={styles.uploadCardTitle}>1. GENERAL DETAILS</Text>

              <Text style={styles.uploadLabel}>Product Title</Text>
              <TextInput
                style={styles.uploadInput}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Apple iPhone 15 Pro (256GB Natural Titanium)"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.uploadLabel}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {ALL_CATEGORIES.map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setCategory(c)}
                    style={[styles.chipPill, category === c && styles.chipPillActive]}
                  >
                    <Text style={[styles.chipText, category === c && styles.chipTextActive]}>
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.uploadLabel}>Brand</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {ALL_BRANDS.map((b) => (
                  <TouchableOpacity
                    key={b}
                    onPress={() => {
                      setBrand(b);
                      setModel('');
                    }}
                    style={[styles.chipPill, brand === b && styles.chipPillActive]}
                  >
                    <Text style={[styles.chipText, brand === b && styles.chipTextActive]}>
                      {b}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.uploadLabel}>Device Model</Text>
              {BRAND_MODELS[brand] ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                  {BRAND_MODELS[brand].map((m) => (
                    <TouchableOpacity
                      key={m}
                      onPress={() => setModel(m)}
                      style={[styles.chipPill, model === m && styles.chipPillActive]}
                    >
                      <Text style={[styles.chipText, model === m && styles.chipTextActive]}>
                        {m}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <TextInput
                  style={styles.uploadInput}
                  value={model}
                  onChangeText={setModel}
                  placeholder="Enter device model"
                  placeholderTextColor="#94a3b8"
                />
              )}
            </View>

            {/* 2. PRICING & INVENTORY */}
            <View style={styles.uploadCard}>
              <Text style={styles.uploadCardTitle}>2. PRICING & INVENTORY</Text>

              <View style={styles.grid2}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.uploadLabel}>Selling Price (₹)</Text>
                  <View style={styles.currencyInputWrap}>
                    <Text style={styles.currencyPrefix}>₹</Text>
                    <TextInput
                      style={styles.currencyInput}
                      value={sellingPrice}
                      onChangeText={setSellingPrice}
                      keyboardType="numeric"
                      placeholder="74999"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.uploadLabel}>Original MSRP (₹)</Text>
                  <View style={styles.currencyInputWrap}>
                    <Text style={styles.currencyPrefix}>₹</Text>
                    <TextInput
                      style={styles.currencyInput}
                      value={originalMsrp}
                      onChangeText={setOriginalMsrp}
                      keyboardType="numeric"
                      placeholder="134900"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                </View>
              </View>

              <View style={styles.grid2}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.uploadLabel}>Stock Qty</Text>
                  <TextInput
                    style={styles.uploadInput}
                    value={stockQty}
                    onChangeText={setStockQty}
                    keyboardType="numeric"
                    placeholder="1"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.uploadLabel}>Store Status</Text>
                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                    {STORE_STATUSES.map((st) => (
                      <TouchableOpacity
                        key={st.id}
                        onPress={() => setStoreStatus(st.id)}
                        style={[
                          styles.statusSmallPill,
                          storeStatus === st.id && styles.statusSmallPillActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusSmallText,
                            storeStatus === st.id && styles.statusSmallTextActive,
                          ]}
                        >
                          {st.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </View>

            {/* 3. HARDWARE ATTRIBUTES */}
            <View style={styles.uploadCard}>
              <Text style={styles.uploadCardTitle}>3. HARDWARE ATTRIBUTES</Text>

              <View style={styles.grid3}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.uploadLabel}>Storage</Text>
                  <TextInput
                    style={styles.uploadInput}
                    value={storage}
                    onChangeText={setStorage}
                    placeholder="e.g. 256GB"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.uploadLabel}>Color</Text>
                  <TextInput
                    style={styles.uploadInput}
                    value={color}
                    onChangeText={setColor}
                    placeholder="Space Black"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
                <View style={{ flex: 1.2 }}>
                  <Text style={styles.uploadLabel}>Condition Grade</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                    {CONDITION_GRADES.map((g) => (
                      <TouchableOpacity
                        key={g}
                        onPress={() => setConditionGrade(g)}
                        style={[
                          styles.chipPill,
                          conditionGrade === g && styles.chipPillActive,
                          { paddingHorizontal: 8 },
                        ]}
                      >
                        <Text style={[styles.chipText, conditionGrade === g && styles.chipTextActive]}>
                          {g}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <Text style={styles.uploadLabel}>Battery Health (%)</Text>
              <TextInput
                style={styles.uploadInput}
                value={batteryHealth}
                onChangeText={setBatteryHealth}
                keyboardType="numeric"
                placeholder="100"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.uploadLabel}>Device Condition Title</Text>
              <TextInput
                style={styles.uploadInput}
                value={conditionTitle}
                onChangeText={setConditionTitle}
                placeholder="Brand New Condition"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.uploadLabel}>Condition Description</Text>
              <TextInput
                style={[styles.uploadInput, styles.multilineInput]}
                value={conditionDescription}
                onChangeText={setConditionDescription}
                multiline
                numberOfLines={2}
                placeholder="Clean Condition"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.uploadLabel}>Custom Product Highlights</Text>
              <Text style={styles.uploadHelperText}>Enter one message per line.</Text>
              <TextInput
                style={[styles.uploadInput, styles.multilineInput, { height: 74 }]}
                value={highlights}
                onChangeText={setHighlights}
                multiline
                numberOfLines={3}
                placeholder="Mobile & Box&#10;Clean Condition"
                placeholderTextColor="#94a3b8"
              />

              {/* Specifications Header */}
              <View style={styles.specHeaderRow}>
                <Text style={styles.uploadLabel}>Specifications</Text>
                <TouchableOpacity onPress={addSpec} style={styles.addSpecBtn}>
                  <Ionicons name="add" size={14} color="#0f172a" />
                  <Text style={styles.addSpecBtnText}>Add Specification</Text>
                </TouchableOpacity>
              </View>

              {/* Dynamic Specifications List */}
              {specsList.map((spec) => (
                <View key={spec.id} style={styles.specInputRow}>
                  <TextInput
                    style={styles.specKeyInput}
                    value={spec.key}
                    onChangeText={(val) => updateSpec(spec.id, 'key', val)}
                    placeholder="Display"
                    placeholderTextColor="#94a3b8"
                  />
                  <TextInput
                    style={styles.specValInput}
                    value={spec.value}
                    onChangeText={(val) => updateSpec(spec.id, 'value', val)}
                    placeholder="6.7-inch Super Reti"
                    placeholderTextColor="#94a3b8"
                  />
                  <TouchableOpacity
                    onPress={() => removeSpec(spec.id)}
                    style={styles.specTrashBtn}
                  >
                    <Ionicons name="trash-outline" size={16} color="#94a3b8" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* 4. PRODUCT PHOTOGRAPHY */}
            <View style={styles.uploadCard}>
              <View style={styles.photoHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.uploadCardTitle}>Product Photography *</Text>
                  <Text style={styles.uploadHelperText}>
                    Upload angle shots or paste web image links
                  </Text>
                </View>
                <TouchableOpacity onPress={loadPresets} style={styles.presetsBtn}>
                  <Ionicons name="sparkles" size={13} color="#475569" />
                  <Text style={styles.presetsBtnText}>Presets</Text>
                </TouchableOpacity>
              </View>

              {/* Photography Tabs */}
              <View style={styles.photoTabsRow}>
                <TouchableOpacity
                  onPress={() => setImageTab('url')}
                  style={[styles.photoTab, imageTab === 'url' && styles.photoTabActive]}
                >
                  <Ionicons
                    name="link"
                    size={14}
                    color={imageTab === 'url' ? '#ffc400' : '#64748b'}
                  />
                  <Text
                    style={[styles.photoTabText, imageTab === 'url' && styles.photoTabTextActive]}
                  >
                    Image URL
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setImageTab('upload')}
                  style={[styles.photoTab, imageTab === 'upload' && styles.photoTabActive]}
                >
                  <Ionicons
                    name="cloud-upload"
                    size={14}
                    color={imageTab === 'upload' ? '#ffc400' : '#64748b'}
                  />
                  <Text
                    style={[styles.photoTabText, imageTab === 'upload' && styles.photoTabTextActive]}
                  >
                    Upload File
                  </Text>
                </TouchableOpacity>
              </View>

              {imageTab === 'url' ? (
                <View style={styles.photoInputRow}>
                  <View style={styles.photoInputWrap}>
                    <Ionicons name="link-outline" size={15} color="#94a3b8" />
                    <TextInput
                      style={styles.photoUrlInput}
                      value={inputImageUrl}
                      onChangeText={setInputImageUrl}
                      placeholder="Paste image link (https://..."
                      placeholderTextColor="#94a3b8"
                      autoCapitalize="none"
                    />
                  </View>
                  <TouchableOpacity onPress={addImage} style={styles.photoAddBtn}>
                    <Ionicons name="checkmark" size={14} color="#ffc400" />
                    <Text style={styles.photoAddBtnText}>Add</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ alignItems: 'center', paddingVertical: 14, backgroundColor: '#0b1120', borderRadius: radius.md, borderWidth: 1, borderColor: '#334155', marginVertical: 4 }}>
                  <ImagePickerButton
                    onImageUploaded={(url) => setImages((prev) => [...prev, url])}
                    label="Camera Photo / Gallery Pick"
                    aspect={[4, 3]}
                    buttonStyle={{ backgroundColor: '#ffc400', paddingVertical: 10, paddingHorizontal: 16 }}
                  />
                  <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>
                    Take camera photo or pick from gallery • Auto cloud upload
                  </Text>
                </View>
              )}

              {/* Thumbnails Strip */}
              {images.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbStrip}>
                  {images.map((img, i) => (
                    <View key={i} style={styles.thumbWrap}>
                      <Image source={{ uri: img }} style={styles.thumbImage} />
                      <TouchableOpacity
                        onPress={() => removeImage(i)}
                        style={styles.thumbRemoveBadge}
                      >
                        <Ionicons name="close" size={12} color="#ffffff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
          </ScrollView>

          {/* Modal Fixed Footer */}
          <View style={styles.uploadFooterBar}>
            <Text style={styles.footerNoteText}>
              Visible on store immediately upon publishing
            </Text>
            <View style={styles.footerActionRow}>
              <TouchableOpacity onPress={onClose} style={styles.cancelUploadBtn}>
                <Text style={styles.cancelUploadBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                style={styles.publishBtn}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#ffc400" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={14} color="#ffc400" />
                    <Text style={styles.publishBtnText}>Publish Listing</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ========================================================================================
   ORDERS VIEW
======================================================================================== */
function OrdersView() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.orders.getAll();
        setOrders(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (orders.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="cart-outline" size={40} color="#94a3b8" />
        <Text style={styles.emptyText}>No customer orders yet</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.tabContent}>
      {orders.map((o) => (
        <View key={o.id} style={styles.orderCard}>
          <View style={styles.orderTopRow}>
            <Text style={styles.orderDate}>
              {new Date(o.created_at).toLocaleDateString()}
            </Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{o.status.toUpperCase()}</Text>
            </View>
          </View>
          <View style={styles.orderPriceRow}>
            <Text style={styles.orderSubtotal}>${o.subtotal}</Text>
            {o.savings > 0 && (
              <Text style={styles.orderSavings}>Saved ${o.savings}</Text>
            )}
          </View>
          <View style={styles.orderItemsList}>
            {(o.order_items || []).map((item: any) => (
              <View key={item.id} style={styles.itemRow}>
                <Text style={styles.itemTitle}>
                  {item.product_name} × {item.quantity}
                </Text>
                <Text style={styles.itemPrice}>${item.price * item.quantity}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

/* ========================================================================================
   USERS VIEW
======================================================================================== */
function UsersView() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const toast = useToast();

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.users.getAll();
      if (data) {
        setProfiles(data as Profile[]);
      }
    } catch (err) {
      console.error('Failed to fetch profiles in mobile admin:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const handleRoleToggle = (targetUser: Profile) => {
    const nextRole = targetUser.role === 'admin' ? 'customer' : 'admin';
    const actionPrompt =
      nextRole === 'admin'
        ? `Make "${targetUser.email}" an Admin?`
        : `Demote "${targetUser.email}" to Customer?`;

    Alert.alert('Confirm Role Change', actionPrompt, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: nextRole === 'admin' ? 'Promote' : 'Demote',
        style: nextRole === 'admin' ? 'default' : 'destructive',
        onPress: async () => {
          setUpdatingId(targetUser.id);
          try {
            await api.users.updateRole(targetUser.id, nextRole as 'admin' | 'customer');
            setProfiles((prev) =>
              prev.map((p) => (p.id === targetUser.id ? { ...p, role: nextRole } : p))
            );
            toast.success(`${targetUser.email} is now ${nextRole.toUpperCase()}`, 'Role Updated');
          } catch (err: any) {
            toast.error(err?.message || 'Could not update role.', 'Permission Error');
          } finally {
            setUpdatingId(null);
          }
        },
      },
    ]);
  };

  const filtered = profiles.filter(
    (p) =>
      p.email.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={{ flex: 1 }}>
      {/* Search Header */}
      <View style={styles.productSearchBar}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#94a3b8" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search users by email..."
            placeholderTextColor="#94a3b8"
            style={styles.searchInput}
            autoCapitalize="none"
          />
        </View>
        <TouchableOpacity onPress={fetchProfiles} style={styles.addBtn}>
          <Ionicons name="refresh" size={20} color={colors.black} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="people-outline" size={40} color="#94a3b8" />
          <Text style={styles.emptyText}>No registered users found</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.tabContent}>
          {filtered.map((user) => {
            const isAdmin = user.role === 'admin';
            const isUpdating = updatingId === user.id;

            return (
              <View key={user.id} style={styles.orderCard}>
                <View style={styles.orderTopRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons
                      name={isAdmin ? 'shield-checkmark' : 'person'}
                      size={16}
                      color={isAdmin ? colors.primary : '#64748b'}
                    />
                    <Text style={[styles.productTitle, { fontSize: fontSize.sm }]}>
                      {user.email}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: isAdmin ? '#fef3c7' : '#e2e8f0',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color: isAdmin ? '#b45309' : '#334155',
                        },
                      ]}
                    >
                      {user.role.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={{ marginVertical: 6 }}>
                  <Text style={styles.orderDate}>
                    ID: {user.id.slice(0, 10)}... · Joined: {new Date(user.created_at).toLocaleDateString()}
                  </Text>
                </View>

                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'flex-end',
                    paddingTop: 8,
                    borderTopWidth: 1,
                    borderTopColor: colors.borderLight,
                  }}
                >
                  <TouchableOpacity
                    onPress={() => handleRoleToggle(user)}
                    disabled={isUpdating}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 5,
                      backgroundColor: isAdmin ? '#fee2e2' : '#000000',
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: radius.sm,
                    }}
                  >
                    {isUpdating ? (
                      <ActivityIndicator size="small" color={isAdmin ? '#ef4444' : colors.primary} />
                    ) : (
                      <>
                        <Ionicons
                          name={isAdmin ? 'arrow-down-circle' : 'shield-checkmark'}
                          size={14}
                          color={isAdmin ? '#ef4444' : colors.primary}
                        />
                        <Text
                          style={{
                            fontSize: fontSize.xs,
                            fontWeight: fontWeight.bold,
                            color: isAdmin ? '#ef4444' : colors.primary,
                          }}
                        >
                          {isAdmin ? 'Make User' : 'Make Admin'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

/* ========================================================================================
   STYLES
======================================================================================== */
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: '#0f172a',
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: '#ffffff',
  },
  headerSub: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  tabNav: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabItemActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: '#94a3b8',
    letterSpacing: 1,
  },
  tabTextActive: {
    color: colors.primary,
  },
  content: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabContent: {
    padding: spacing.md,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    marginTop: 8,
    color: '#64748b',
    fontSize: fontSize.sm,
  },
  sectionHeader: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  telemetryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    marginRight: 8,
  },
  telemetryTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  telemetrySub: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 1,
  },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  syncBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  kpiCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'space-between',
  },
  kpiTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  kpiIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
  },
  kpiBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  kpiValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 2,
  },
  kpiSub: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 1,
  },
  alertBox: {
    backgroundColor: '#fffbeb',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
    marginBottom: 14,
  },
  alertTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400e',
  },
  alertSub: {
    fontSize: 10,
    color: '#b45309',
    marginTop: 1,
  },
  alertLink: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400e',
    textDecorationLine: 'underline',
  },
  lowStockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    padding: 8,
    borderRadius: 10,
    marginTop: 6,
  },
  lowStockImg: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },
  lowStockTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
  },
  lowStockMeta: {
    fontSize: 10,
    color: '#94a3b8',
  },
  lowStockBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  lowStockBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  restockBtn: {
    backgroundColor: '#000000',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  restockBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffc400',
  },
  optimalBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    marginBottom: 14,
  },
  optimalTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#065f46',
  },
  optimalSub: {
    fontSize: 10,
    color: '#047857',
    marginTop: 1,
  },
  optimalBadge: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  optimalBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065f46',
  },
  shortcutGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  shortcutCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  shortcutTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  shortcutIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  shortcutSub: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  categoryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
  },
  categoryCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  categoryCardSub: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 1,
  },
  skuBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  skuBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  categoryBarWrap: {
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden',
    flexDirection: 'row',
    marginVertical: 10,
  },
  categoryChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryChipText: {
    fontSize: 10,
    color: '#475569',
  },
  recentOrderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  recentOrderId: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  orderStatusPill: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  orderStatusPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1d4ed8',
  },
  recentOrderSub: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  recentOrderPrice: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
  },
  recentOrderPaid: {
    fontSize: 9,
    fontWeight: '700',
    color: '#059669',
  },
  productSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    height: 42,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  addBtn: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productList: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: radius.lg,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  productImg: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  productDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  productHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
    flex: 1,
  },
  actionIcons: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtn: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productMeta: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginVertical: 2,
  },
  priceStockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  currentPrice: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  originalPrice: {
    fontSize: 10,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  stockBadge: {
    fontSize: 10,
    fontWeight: fontWeight.semibold,
    color: '#10b981',
  },
  lowStock: {
    color: '#f59e0b',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    overflow: 'hidden',
  },
  uploadModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  purpleIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#f3e8ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadModalTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: '#0f172a',
  },
  uploadModalSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  uploadCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
  uploadModalScroll: {
    padding: spacing.md,
    paddingBottom: 24,
  },
  uploadErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    padding: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  uploadErrorText: {
    color: '#ef4444',
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    flex: 1,
  },
  uploadCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: spacing.md,
  },
  uploadCardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  uploadLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
    marginTop: 8,
  },
  uploadHelperText: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 6,
  },
  uploadInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 13,
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  multilineInput: {
    height: 60,
    textAlignVertical: 'top',
    paddingTop: 8,
  },
  chipRow: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  chipPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 6,
    backgroundColor: '#f8fafc',
  },
  chipPillActive: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  chipText: {
    fontSize: 11,
    fontWeight: fontWeight.medium,
    color: '#475569',
  },
  chipTextActive: {
    color: '#ffc400',
    fontWeight: fontWeight.bold,
  },
  grid2: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  grid3: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  currencyInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    paddingLeft: 12,
  },
  currencyPrefix: {
    fontSize: 14,
    color: '#94a3b8',
    marginRight: 4,
  },
  currencyInput: {
    flex: 1,
    height: 42,
    fontSize: 13,
    color: '#0f172a',
  },
  statusSmallPill: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  statusSmallPillActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  statusSmallText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: fontWeight.medium,
  },
  statusSmallTextActive: {
    color: '#ffffff',
    fontWeight: fontWeight.bold,
  },
  specHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  addSpecBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  addSpecBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  specInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  specKeyInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
    fontSize: 12,
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  specValInput: {
    flex: 1.6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
    fontSize: 12,
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  specTrashBtn: {
    padding: 6,
  },
  photoHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  presetsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  presetsBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  photoTabsRow: {
    flexDirection: 'row',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 8,
    marginBottom: 10,
  },
  photoTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  photoTabActive: {
    backgroundColor: '#000000',
  },
  photoTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  photoTabTextActive: {
    color: '#ffc400',
    fontWeight: '700',
  },
  photoInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  photoInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 40,
    backgroundColor: '#ffffff',
    gap: 6,
  },
  photoUrlInput: {
    flex: 1,
    fontSize: 12,
    color: '#0f172a',
  },
  photoAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#000000',
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
  },
  photoAddBtnText: {
    color: '#ffc400',
    fontSize: 12,
    fontWeight: '700',
  },
  uploadPlaceholder: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadPlaceholderText: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
  },
  thumbStrip: {
    flexDirection: 'row',
    marginTop: 10,
  },
  thumbWrap: {
    width: 62,
    height: 62,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#f8fafc',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  thumbRemoveBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadFooterBar: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  footerNoteText: {
    fontSize: 10,
    color: '#94a3b8',
    marginBottom: 8,
    textAlign: 'center',
  },
  footerActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    alignItems: 'center',
  },
  cancelUploadBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  cancelUploadBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  publishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#000000',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  publishBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffc400',
  },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  orderTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderDate: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  statusBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  statusText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: '#1d4ed8',
  },
  orderPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginVertical: 6,
  },
  orderSubtotal: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.black,
    color: colors.text,
  },
  orderSavings: {
    fontSize: fontSize.xs,
    color: '#10b981',
    fontWeight: fontWeight.semibold,
  },
  orderItemsList: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 6,
    gap: 4,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  itemTitle: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  itemPrice: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  routeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#090d16',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  routePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0f172a',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 196, 0, 0.3)',
  },
  routePillLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#ffc400',
    letterSpacing: 0.5,
  },
  routePillPath: {
    fontSize: 11,
    fontWeight: '700',
    color: '#f8fafc',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  liveSyncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  liveSyncText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#10b981',
    letterSpacing: 0.5,
  },
});
