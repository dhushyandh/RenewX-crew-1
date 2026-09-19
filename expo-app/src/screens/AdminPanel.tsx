import React, { useState, useEffect, useCallback } from 'react';
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
  SafeAreaView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { type ProductRow, type Profile } from '@/lib/supabase';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme';
import { api } from '@/services/api';
import { useToast } from '@/context/ToastContext';
import { confirmAction } from '@/lib/confirmAction';
import BrandsView from '@/components/admin/BrandsView';

type AdminView = 'dashboard' | 'products' | 'brands' | 'orders' | 'users' | 'tradeIns';

const CATEGORIES = ['All', 'Smartphones', 'Laptops', 'Tablets', 'Audio', 'Wearables', 'Cameras'];

const STATUS_OPTIONS = [
  { id: 'pending', label: 'Pending', color: '#64748b', bg: '#f1f5f9' },
  { id: 'verified', label: 'Verified', color: '#2563eb', bg: '#eff6ff' },
  { id: 'processing', label: 'Processing', color: '#0284c7', bg: '#f0f9ff' },
  { id: 'shipped', label: 'Shipped', color: '#7c3aed', bg: '#f5f3ff' },
  { id: 'out_for_delivery', label: 'Out for Delivery', color: '#d97706', bg: '#fffbeb' },
  { id: 'delivered', label: 'Delivered', color: '#16a34a', bg: '#f0fdf4' },
  { id: 'cancelled', label: 'Cancelled', color: '#dc2626', bg: '#fef2f2' },
];

export default function AdminPanel({ route, onExit }: { route?: any; onExit?: () => void }) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const routeName = route?.name;
  const paramScreen = route?.params?.screen;
  const targetId = route?.params?.id || route?.params?.productId;

  const determineInitialView = (): AdminView => {
    if (routeName === 'AdminBrands' || routeName === 'AdminAddBrand' || routeName === 'AdminAddModel') return 'brands';
    if (routeName === 'AdminProducts' || routeName === 'AdminAddProduct' || routeName === 'AdminEditProduct') return 'products';
    if (routeName === 'AdminOrders') return 'orders';
    if (routeName === 'AdminUsers') return 'users';
    if (routeName === 'AdminTradeIns') return 'tradeIns';
    if (routeName === 'AdminDashboard') return 'dashboard';

    if (paramScreen === 'brands' || paramScreen === 'addBrand' || paramScreen === 'addModel') return 'brands';
    if (paramScreen === 'products' || paramScreen === 'addProduct' || paramScreen === 'editProduct') return 'products';
    if (paramScreen === 'orders') return 'orders';
    if (paramScreen === 'users') return 'users';
    if (paramScreen === 'tradeIns') return 'tradeIns';
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

  useEffect(() => {
    setView(determineInitialView());

    if (routeName === 'AdminAddProduct' || paramScreen === 'addProduct') {
      setEditingProduct(null);
      setModalVisible(true);
    } else if ((routeName === 'AdminEditProduct' || paramScreen === 'editProduct') && targetId) {
      (async () => {
        try {
          const p = await api.products.getById(targetId);
          if (p) {
            setEditingProduct(p);
            setModalVisible(true);
          }
        } catch {
          // ignore
        }
      })();
    }
  }, [routeName, paramScreen, targetId]);

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
    else if (v === 'tradeIns') navigation.navigate('AdminTradeIns');
  };

  const handleAddProduct = () => {
    setEditingProduct(null);
    setModalVisible(true);
  };

  const handleEditProduct = (p: ProductRow) => {
    setEditingProduct(p);
    setModalVisible(true);
  };

  const topPadding = Platform.OS === 'ios' ? insets.top : 10;

  return (
    <SafeAreaView style={[styles.container, { paddingTop: topPadding }]}>
      {/* Minimal Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle}>RenewX Admin</Text>
            <View style={styles.adminBadge}>
              <Text style={styles.adminBadgeText}>PORTAL</Text>
            </View>
          </View>
          <Text style={styles.headerSubtitle}>Store Catalog & Orders</Text>
        </View>

        <TouchableOpacity onPress={handleAddProduct} style={styles.addActionButton} activeOpacity={0.85}>
          <Ionicons name="add" size={18} color="#000" />
          <Text style={styles.addActionButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Clean Segmented Navigation Bar */}
      <View style={styles.tabBarContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBarContent}>
          {[
            { id: 'dashboard', label: 'Overview', icon: 'grid-outline' },
            { id: 'products', label: 'Products', icon: 'cube-outline' },
            { id: 'brands', label: 'Brands', icon: 'pricetag-outline' },
            { id: 'orders', label: 'Orders', icon: 'receipt-outline' },
            { id: 'users', label: 'Users', icon: 'people-outline' },
            { id: 'tradeIns', label: 'Sell Requests', icon: 'pricetag-outline' },
          ].map((item) => {
            const isActive = view === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => handleTabPress(item.id as AdminView)}
                style={[styles.tabButton, isActive && styles.tabButtonActive]}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={item.icon as any}
                  size={15}
                  color={isActive ? colors.primary : '#64748b'}
                />
                <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Content Area */}
      <View style={styles.mainContent}>
        {view === 'dashboard' && (
          <DashboardView
            onNavigate={(v) => handleTabPress(v)}
            onAddProduct={handleAddProduct}
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
        {view === 'tradeIns' && <TradeInsView />}
      </View>

      {/* Add / Edit Product Modal */}
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
    </SafeAreaView>
  );
}



function TradeInsView() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.tradeIn.getAll(statusFilter === 'all' ? undefined : statusFilter);
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const update = async (id: string, status: string) => {
    try {
      setBusyId(id);
      await api.tradeIn.updateStatus(id, status);
      await load();
    } catch (err: any) {
      Alert.alert('Update failed', err?.message || 'Unable to update this sell request.');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <View style={styles.centerBox}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.cardContainer}>
        <View style={styles.cardTopRow}>
          <View>
            <Text style={styles.cardHeaderTitle}>Sell Requests</Text>
            <Text style={styles.cardHeaderSub}>Review customer devices and approve or reject requests.</Text>
          </View>
          <TouchableOpacity onPress={load} style={styles.viewAllBtn}>
            <Ionicons name="refresh-outline" size={14} color="#2563eb" />
            <Text style={styles.viewAllText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
          {['all', 'pending', 'approved', 'rejected', 'scheduled', 'picked_up', 'inspected', 'completed'].map((status) => (
            <TouchableOpacity
              key={status}
              onPress={() => setStatusFilter(status)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 10,
                backgroundColor: statusFilter === status ? '#0f172a' : '#f1f5f9',
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: '800', color: statusFilter === status ? '#ffc400' : '#475569' }}>
                {status === 'all' ? 'All' : status.replace(/_/g, ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {items.length === 0 ? (
          <Text style={styles.emptyNote}>No sell requests found.</Text>
        ) : items.map((item) => {
          const isBusy = busyId === item.id;
          return (
            <View key={item.id} style={{ borderTopWidth: 1, borderTopColor: '#eef2f7', paddingVertical: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="phone-portrait-outline" size={21} color="#0f172a" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '900', color: '#0f172a' }}>{item.brand} {item.model}</Text>
                  <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{item.category} • {item.storage}</Text>
                  <Text style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{item.customer_name} • {item.customer_phone}</Text>
                  <Text style={{ fontSize: 11, color: '#047857', fontWeight: '800', marginTop: 4 }}>₹{Number(item.valuation_amount || 0).toLocaleString('en-IN')}</Text>
                </View>
                <Text style={{ fontSize: 9, fontWeight: '800', color: '#64748b' }}>{String(item.status || 'pending').replace(/_/g, ' ')}</Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                {item.status === 'pending' && (
                  <>
                    <TouchableOpacity disabled={isBusy} onPress={() => update(item.id, 'approved')} style={{ flex: 1, backgroundColor: '#059669', paddingVertical: 10, borderRadius: 10, alignItems: 'center' }}>
                      <Text style={{ color: '#fff', fontSize: 11, fontWeight: '900' }}>{isBusy ? 'Updating…' : 'Approve'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity disabled={isBusy} onPress={() => update(item.id, 'rejected')} style={{ flex: 1, backgroundColor: '#fee2e2', paddingVertical: 10, borderRadius: 10, alignItems: 'center' }}>
                      <Text style={{ color: '#b91c1c', fontSize: 11, fontWeight: '900' }}>Reject</Text>
                    </TouchableOpacity>
                  </>
                )}
                {item.status === 'approved' && (
                  <TouchableOpacity disabled={isBusy} onPress={() => update(item.id, 'scheduled')} style={{ flex: 1, backgroundColor: '#2563eb', paddingVertical: 10, borderRadius: 10, alignItems: 'center' }}>
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '900' }}>Schedule Pickup</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

/* ========================================================================================
   TAB 1: MINIMAL DASHBOARD OVERVIEW
======================================================================================== */
function DashboardView({
  onNavigate,
  onAddProduct,
  refreshSignal,
}: {
  onNavigate: (view: AdminView) => void;
  onAddProduct: () => void;
  refreshSignal: number;
}) {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [orders, setOrders] = useState<any[]>([]);

  const loadStats = useCallback(async () => {
    try {
      const [prods, ords] = await Promise.all([
        api.products.getAll().catch((): any[] => []),
        api.orders.getAll().catch((): any[] => []),
      ]);
      setProducts((prods as ProductRow[]) || []);
      setOrders(ords || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats, refreshSignal]);

  if (loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const totalSales = orders.reduce((acc, o) => acc + (Number(o.subtotal || o.total) || 0), 0);
  const totalStock = products.reduce((acc, p) => acc + (Number(p.stock) || 0), 0);
  const lowStock = products.filter((p) => Number(p.stock) <= 3).length;

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
      {/* 4 Metric Cards */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricLabel}>Total Revenue</Text>
            <View style={[styles.metricIcon, { backgroundColor: '#ecfdf5' }]}>
              <Ionicons name="cash-outline" size={16} color="#059669" />
            </View>
          </View>
          <Text style={styles.metricValue}>₹{totalSales.toLocaleString('en-IN')}</Text>
          <Text style={styles.metricSub}>From customer checkouts</Text>
        </View>

        <View style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricLabel}>Total Orders</Text>
            <View style={[styles.metricIcon, { backgroundColor: '#eff6ff' }]}>
              <Ionicons name="receipt-outline" size={16} color="#2563eb" />
            </View>
          </View>
          <Text style={styles.metricValue}>{orders.length}</Text>
          <Text style={styles.metricSub}>COD & Online payments</Text>
        </View>

        <View style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricLabel}>In-Stock Units</Text>
            <View style={[styles.metricIcon, { backgroundColor: '#fef3c7' }]}>
              <Ionicons name="cube-outline" size={16} color="#d97706" />
            </View>
          </View>
          <Text style={styles.metricValue}>{totalStock}</Text>
          <Text style={styles.metricSub}>{products.length} active listings</Text>
        </View>

        <View style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricLabel}>Low Stock Items</Text>
            <View style={[styles.metricIcon, { backgroundColor: lowStock > 0 ? '#fee2e2' : '#f1f5f9' }]}>
              <Ionicons name="alert-circle-outline" size={16} color={lowStock > 0 ? '#dc2626' : '#64748b'} />
            </View>
          </View>
          <Text style={[styles.metricValue, lowStock > 0 && { color: '#dc2626' }]}>{lowStock}</Text>
          <Text style={styles.metricSub}>{lowStock > 0 ? 'Requires restock' : 'All stocks healthy'}</Text>
        </View>
      </View>

      {/* Quick Action Buttons */}
      <View style={styles.quickActionsContainer}>
        <Text style={styles.sectionHeaderTitle}>Quick Actions</Text>
        <View style={styles.quickActionsRow}>
          <TouchableOpacity style={styles.actionPill} onPress={onAddProduct} activeOpacity={0.85}>
            <Ionicons name="add-circle-outline" size={16} color={colors.text} />
            <Text style={styles.actionPillText}>New Product</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionPill} onPress={() => onNavigate('orders')} activeOpacity={0.85}>
            <Ionicons name="receipt-outline" size={16} color={colors.text} />
            <Text style={styles.actionPillText}>View Orders</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionPill} onPress={() => onNavigate('brands')} activeOpacity={0.85}>
            <Ionicons name="pricetag-outline" size={16} color={colors.text} />
            <Text style={styles.actionPillText}>Brands</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Orders Overview */}
      <View style={styles.cardContainer}>
        <View style={styles.cardTopRow}>
          <View>
            <Text style={styles.cardHeaderTitle}>Recent Orders</Text>
            <Text style={styles.cardHeaderSub}>Latest storefront sales</Text>
          </View>
          <TouchableOpacity onPress={() => onNavigate('orders')} style={styles.viewAllBtn}>
            <Text style={styles.viewAllText}>View All</Text>
            <Ionicons name="chevron-forward" size={12} color="#2563eb" />
          </TouchableOpacity>
        </View>

        {orders.length === 0 ? (
          <Text style={styles.emptyNote}>No orders recorded yet.</Text>
        ) : (
          orders.slice(0, 5).map((order) => {
            const isCod = order.payment_method === 'cod';
            const dateStr = new Date(order.created_at || Date.now()).toLocaleDateString('en-IN', {
              month: 'short',
              day: 'numeric',
            });
            const statusMatch = STATUS_OPTIONS.find((s) => s.id === order.status);

            return (
              <View key={order.id} style={styles.recentOrderRow}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.orderIdText}>#{String(order.id).slice(-8).toUpperCase()}</Text>
                    <View style={[styles.statusTag, { backgroundColor: statusMatch?.bg || '#f1f5f9' }]}>
                      <Text style={[styles.statusTagText, { color: statusMatch?.color || '#475569' }]}>
                        {statusMatch?.label || order.status || 'Verified'}
                      </Text>
                    </View>
                    <View style={[styles.methodTag, isCod ? styles.codTag : styles.razorpayTag]}>
                      <Text style={[styles.methodTagText, isCod ? styles.codTagText : styles.razorpayTagText]}>
                        {isCod ? 'COD' : 'ONLINE'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.orderMetaText}>
                    {order.customer_info?.name || 'Customer'} • {dateStr}
                  </Text>
                </View>

                <Text style={styles.orderTotalAmount}>₹{Number(order.subtotal || 0).toLocaleString('en-IN')}</Text>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

/* ========================================================================================
   TAB 2: MINIMAL PRODUCTS MANAGEMENT
======================================================================================== */
function ProductsView({
  onAddProduct,
  onEditProduct,
  refreshSignal,
}: {
  onAddProduct: () => void;
  onEditProduct: (p: ProductRow) => void;
  refreshSignal: number;
}) {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const toast = useToast();

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.products.getAll();
      setProducts((data as ProductRow[]) || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchListings();
  }, [fetchListings, refreshSignal]);

  const handleDelete = (id: string, name: string) => {
    confirmAction(
      'Delete Product',
      `Are you sure you want to remove "${name}" from inventory?`,
      async () => {
        try {
          await api.products.delete(id);
          setProducts((prev) => prev.filter((p) => p.id !== id && (p as any)._id !== id));
          toast.info(`"${name}" was deleted.`, 'Product Removed');
        } catch (err: any) {
          toast.error(err?.message || 'Failed to delete product', 'Error');
        }
      }
    );
  };

  const filtered = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      selectedCategory === 'All' ||
      p.category === selectedCategory ||
      (selectedCategory === 'Smartphones' && p.category === 'Phones');
    return matchesSearch && matchesCategory;
  });

  return (
    <View style={{ flex: 1 }}>
      {/* Search Input Bar */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color="#94a3b8" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search products or brands..."
            placeholderTextColor="#94a3b8"
            style={styles.searchInput}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity onPress={onAddProduct} style={styles.addButtonMini}>
          <Ionicons name="add" size={20} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Category Pills */}
      <View style={{ height: 42, marginBottom: 8 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.md, gap: 6 }}>
          {CATEGORIES.map((cat) => {
            const isCatActive = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                style={[styles.filterChip, isCatActive && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, isCatActive && styles.filterChipTextActive]}>{cat}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centerBox}>
          <Ionicons name="cube-outline" size={36} color="#94a3b8" />
          <Text style={styles.emptyNote}>No products match your search</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 100, gap: 10 }}>
          {filtered.map((item) => {
            const isLow = Number(item.stock) <= 3;
            const isOut = Number(item.stock) === 0;

            return (
              <View key={item.id} style={styles.productListItem}>
                {item.image_url ? (
                  <Image source={{ uri: item.image_url }} style={styles.productThumb} resizeMode="cover" />
                ) : (
                  <View style={styles.productThumbPlaceholder}>
                    <Ionicons name="image-outline" size={22} color="#94a3b8" />
                  </View>
                )}

                <View style={styles.productItemInfo}>
                  <Text style={styles.productItemTitle} numberOfLines={1}>{item.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 3 }}>
                    <Text style={styles.productBrandBadge}>{item.brand}</Text>
                    <Text style={styles.productItemPrice}>₹{Number(item.price).toLocaleString('en-IN')}</Text>
                  </View>

                  <View style={[styles.stockPill, isOut ? styles.stockOut : isLow ? styles.stockLow : styles.stockOk]}>
                    <Text style={[styles.stockText, isOut ? styles.stockOutText : isLow ? styles.stockLowText : styles.stockOkText]}>
                      {isOut ? 'Out of Stock' : `${item.stock} in stock`}
                    </Text>
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.productActionsRow}>
                  <TouchableOpacity onPress={() => onEditProduct(item)} style={styles.iconActionBtn}>
                    <Ionicons name="pencil" size={16} color="#2563eb" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(item.id || (item as any)._id, item.name)} style={styles.iconActionBtn}>
                    <Ionicons name="trash-outline" size={16} color="#dc2626" />
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
   TAB 4: MINIMAL & FUNCTIONAL ORDERS MANAGEMENT
======================================================================================== */
function OrdersView() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const toast = useToast();

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.orders.getAll();
      setOrders(data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleUpdateStatus = (orderId: string, currentStatus: string) => {
    Alert.alert(
      'Update Order Status',
      `Current: ${currentStatus.toUpperCase()}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Verified',
          onPress: () => applyStatus(orderId, 'verified'),
        },
        {
          text: 'Processing',
          onPress: () => applyStatus(orderId, 'processing'),
        },
        {
          text: 'Shipped',
          onPress: () => applyStatus(orderId, 'shipped'),
        },
        {
          text: 'Delivered',
          onPress: () => applyStatus(orderId, 'delivered'),
        },
        {
          text: 'Cancel Order',
          style: 'destructive',
          onPress: () => applyStatus(orderId, 'cancelled'),
        },
      ]
    );
  };

  const applyStatus = async (orderId: string, status: string) => {
    setUpdatingOrderId(orderId);
    try {
      await api.orders.updateStatus(orderId, status);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status } : o))
      );
      toast.success(`Order status updated to ${status.toUpperCase()}`, 'Status Updated');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update status', 'Error');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const filtered = orders.filter((o) => {
    if (filterStatus === 'all') return true;
    return o.status === filterStatus;
  });

  return (
    <View style={{ flex: 1 }}>
      {/* Filter Chips */}
      <View style={{ height: 42, marginVertical: 8 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.md, gap: 6 }}>
          {['all', 'pending', 'verified', 'processing', 'shipped', 'delivered', 'cancelled'].map((st) => {
            const isActive = filterStatus === st;
            return (
              <TouchableOpacity
                key={st}
                onPress={() => setFilterStatus(st)}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {st.charAt(0).toUpperCase() + st.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centerBox}>
          <Ionicons name="receipt-outline" size={36} color="#94a3b8" />
          <Text style={styles.emptyNote}>No orders found in this category</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 100, gap: 12 }}>
          {filtered.map((order) => {
            const isCod = order.payment_method === 'cod';
            const statusMatch = STATUS_OPTIONS.find((s) => s.id === order.status);
            const isUpdating = updatingOrderId === order.id;

            return (
              <View key={order.id} style={styles.orderCardBox}>
                {/* Header */}
                <View style={styles.orderCardHeader}>
                  <View>
                    <Text style={styles.orderNumberTitle}>Order #{String(order.id).slice(-8).toUpperCase()}</Text>
                    <Text style={styles.orderDateSubtitle}>
                      {new Date(order.created_at || Date.now()).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleUpdateStatus(order.id, order.status || 'pending')}
                    disabled={isUpdating}
                    style={[styles.statusTagAction, { backgroundColor: statusMatch?.bg || '#f1f5f9' }]}
                  >
                    {isUpdating ? (
                      <ActivityIndicator size="small" color={statusMatch?.color || '#000'} />
                    ) : (
                      <>
                        <Text style={[styles.statusTagText, { color: statusMatch?.color || '#475569' }]}>
                          {statusMatch?.label || order.status}
                        </Text>
                        <Ionicons name="chevron-down" size={12} color={statusMatch?.color || '#475569'} />
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Customer Details */}
                <View style={styles.orderCustomerRow}>
                  <Ionicons name="person-outline" size={14} color="#64748b" />
                  <Text style={styles.orderCustomerText}>
                    {order.customer_info?.name || 'Customer'} • +91 {order.customer_info?.phone || 'N/A'} • PIN {order.customer_info?.pincode}
                  </Text>
                </View>

                {order.customer_info?.address ? (
                  <Text style={styles.orderAddressText} numberOfLines={2}>
                    {order.customer_info?.address}
                  </Text>
                ) : null}

                {/* Items List */}
                <View style={styles.orderItemsBox}>
                  {(order.order_items || []).map((item: any, i: number) => (
                    <View key={i} style={styles.orderItemLine}>
                      <Text style={styles.orderItemName} numberOfLines={1}>
                        {item.product_name} × {item.quantity}
                      </Text>
                      <Text style={styles.orderItemPrice}>
                        ₹{Number(item.price * item.quantity).toLocaleString('en-IN')}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Footer */}
                <View style={styles.orderCardFooter}>
                  <View style={[styles.methodTag, isCod ? styles.codTag : styles.razorpayTag]}>
                    <Text style={[styles.methodTagText, isCod ? styles.codTagText : styles.razorpayTagText]}>
                      {isCod ? '💵 Cash on Delivery' : '⚡ Online Paid'}
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.orderGrandTotal}>₹{Number(order.subtotal || 0).toLocaleString('en-IN')}</Text>
                  </View>
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
   TAB 5: MINIMAL USERS MANAGEMENT
======================================================================================== */
function UsersView() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const toast = useToast();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.users.getAll();
      setProfiles((data as Profile[]) || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRoleToggle = (targetUser: Profile) => {
    const nextRole = targetUser.role === 'admin' ? 'customer' : 'admin';
    const userId = targetUser.id || (targetUser as any)._id;
    confirmAction(
      'Change User Role',
      `Set "${targetUser.email}" to ${nextRole.toUpperCase()}?`,
      async () => {
        setUpdatingId(userId);
        try {
          await api.users.updateRole(userId, nextRole);
          setProfiles((prev) =>
            prev.map((p) => ((p.id === userId || (p as any)._id === userId) ? { ...p, role: nextRole } : p))
          );
          toast.success(`${targetUser.email} role changed to ${nextRole}`);
        } catch (err: any) {
          toast.error(err?.message || 'Failed to update user role');
        } finally {
          setUpdatingId(null);
        }
      },
      nextRole === 'admin' ? 'Make Admin' : 'Make Customer'
    );
  };

  const handleDeleteUser = (targetUser: Profile) => {
    const userId = targetUser.id || (targetUser as any)._id;
    confirmAction(
      'Delete User Account',
      `Are you sure you want to permanently delete user "${targetUser.email}"? This action cannot be undone.`,
      async () => {
        setUpdatingId(userId);
        try {
          await api.users.delete(userId);
          setProfiles((prev) => prev.filter((p) => p.id !== userId && (p as any)._id !== userId));
          toast.info(`User ${targetUser.email} removed`, 'User Deleted');
        } catch (err: any) {
          toast.error(err?.message || 'Failed to delete user', 'Error');
        } finally {
          setUpdatingId(null);
        }
      }
    );
  };

  const filtered = profiles.filter((p) =>
    (p.email || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.searchBarContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color="#94a3b8" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search users by email..."
            placeholderTextColor="#94a3b8"
            style={styles.searchInput}
            autoCapitalize="none"
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 100, gap: 8 }}>
          {filtered.map((user) => {
            const userId = user.id || (user as any)._id;
            const isAdmin = user.role === 'admin';
            const isUpdating = updatingId === userId;

            return (
              <View key={userId} style={styles.userCardBox}>
                <View style={styles.userAvatar}>
                  <Text style={styles.userAvatarLetter}>
                    {(user.email || 'U').charAt(0).toUpperCase()}
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.userEmailText}>{user.email}</Text>
                  <Text style={styles.userJoinedText}>
                    Joined: {new Date(user.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <TouchableOpacity
                    onPress={() => handleRoleToggle(user)}
                    disabled={isUpdating}
                    style={[styles.roleBadge, isAdmin ? styles.roleAdmin : styles.roleCustomer]}
                  >
                    {isUpdating ? (
                      <ActivityIndicator size="small" color={isAdmin ? '#b45309' : '#000'} />
                    ) : (
                      <Text style={[styles.roleBadgeText, isAdmin ? styles.roleAdminText : styles.roleCustomerText]}>
                        {isAdmin ? 'ADMIN' : 'CUSTOMER'}
                      </Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleDeleteUser(user)}
                    disabled={isUpdating}
                    style={styles.iconActionBtn}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={16} color="#dc2626" />
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
   CLEAN ADD / EDIT PRODUCT MODAL
======================================================================================== */
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
  const toast = useToast();
  const [name, setName] = useState(product?.name ?? '');
  const [brand, setBrand] = useState(product?.brand ?? 'Apple');
  const [category, setCategory] = useState(product?.category ?? 'Smartphones');
  const [price, setPrice] = useState(product ? String(product.price) : '');
  const [originalPrice, setOriginalPrice] = useState(product ? String(product.original_price) : '');
  const [stock, setStock] = useState(product ? String(product.stock) : '1');
  const [imageUrl, setImageUrl] = useState(product?.image_url ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !price || !brand) {
      Alert.alert('Incomplete Form', 'Please enter product name, brand and price.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        brand: brand.trim(),
        category,
        price: Number(price),
        original_price: Number(originalPrice || price),
        stock: Number(stock || 1),
        image_url: imageUrl.trim(),
        description: description.trim(),
        condition: 'Excellent',
      };

      if (product?.id) {
        await api.products.update(product.id, payload);
        toast.success(`"${name}" was updated.`);
      } else {
        await api.products.create(payload);
        toast.success(`"${name}" created successfully.`);
      }
      onSaved();
    } catch (err: any) {
      Alert.alert('Save Failed', err?.message || 'Could not save product');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>{product ? 'Edit Product' : 'Add New Product'}</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveHeaderBtn}>
              {saving ? <ActivityIndicator size="small" color="#000" /> : <Text style={styles.saveHeaderBtnText}>Save</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: spacing.md, gap: 12 }}>
            <View>
              <Text style={styles.inputLabel}>Product Title</Text>
              <TextInput value={name} onChangeText={setName} placeholder="e.g. iPhone 15 Pro 128GB" style={styles.formInput} />
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Brand</Text>
                <TextInput value={brand} onChangeText={setBrand} placeholder="Apple, Samsung..." style={styles.formInput} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Category</Text>
                <TextInput value={category} onChangeText={setCategory} placeholder="Smartphones, Laptops..." style={styles.formInput} />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Selling Price (₹)</Text>
                <TextInput value={price} onChangeText={setPrice} placeholder="45000" keyboardType="numeric" style={styles.formInput} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Original MSRP (₹)</Text>
                <TextInput value={originalPrice} onChangeText={setOriginalPrice} placeholder="79000" keyboardType="numeric" style={styles.formInput} />
              </View>
              <View style={{ width: 80 }}>
                <Text style={styles.inputLabel}>Stock</Text>
                <TextInput value={stock} onChangeText={setStock} placeholder="1" keyboardType="numeric" style={styles.formInput} />
              </View>
            </View>

            <View>
              <Text style={styles.inputLabel}>Image URL</Text>
              <TextInput value={imageUrl} onChangeText={setImageUrl} placeholder="https://..." style={styles.formInput} />
            </View>

            <View>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput value={description} onChangeText={setDescription} placeholder="Key features, condition details..." multiline style={[styles.formInput, { minHeight: 70 }]} />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

/* ========================================================================================
   STYLES: MINIMAL, CLEAN & POLISHED
======================================================================================== */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: '#ffffff',
    gap: 10,
  },
  backButton: {
    padding: 6,
    borderRadius: radius.full,
    backgroundColor: '#f1f5f9',
  },
  headerCenter: {
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  adminBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  adminBadgeText: {
    fontSize: 9,
    fontWeight: fontWeight.bold,
    color: '#000',
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
  },
  addActionButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addActionButtonText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: '#000',
  },
  tabBarContainer: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: '#f8fafc',
    paddingVertical: 8,
  },
  tabBarContent: {
    paddingHorizontal: spacing.md,
    gap: 6,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tabButtonActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: fontWeight.semibold,
    color: '#64748b',
  },
  tabButtonTextActive: {
    color: '#ffffff',
  },
  mainContent: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContainer: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  metricLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  metricIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.black,
    color: colors.text,
    marginBottom: 2,
  },
  metricSub: {
    fontSize: 10,
    color: colors.textMuted,
  },
  quickActionsContainer: {
    marginBottom: 16,
  },
  sectionHeaderTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionPill: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  actionPillText: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  cardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  cardHeaderSub: {
    fontSize: 11,
    color: colors.textMuted,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    color: '#2563eb',
  },
  emptyNote: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 14,
  },
  recentOrderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  orderIdText: {
    fontSize: 12,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  statusTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  statusTagText: {
    fontSize: 9,
    fontWeight: fontWeight.bold,
  },
  methodTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  methodTagText: {
    fontSize: 9,
    fontWeight: fontWeight.bold,
  },
  codTag: {
    backgroundColor: '#fef3c7',
  },
  codTagText: {
    color: '#b45309',
    fontSize: 9,
    fontWeight: fontWeight.bold,
  },
  razorpayTag: {
    backgroundColor: '#ecfdf5',
  },
  razorpayTagText: {
    color: '#059669',
    fontSize: 9,
    fontWeight: fontWeight.bold,
  },
  orderMetaText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  orderTotalAmount: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    gap: 8,
  },
  searchBarContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    gap: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: radius.md,
    paddingHorizontal: 10,
    height: 38,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.text,
  },
  addButtonMini: {
    width: 38,
    height: 38,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  productListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: radius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  productThumb: {
    width: 54,
    height: 54,
    borderRadius: radius.sm,
    backgroundColor: '#f1f5f9',
  },
  productThumbPlaceholder: {
    width: 54,
    height: 54,
    borderRadius: radius.sm,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productItemInfo: {
    flex: 1,
  },
  productItemTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  productBrandBadge: {
    fontSize: 10,
    color: colors.textMuted,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radius.sm,
  },
  productItemPrice: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  stockPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.sm,
  },
  stockText: {
    fontSize: 9,
    fontWeight: '700' as const,
  },
  stockOk: { backgroundColor: '#ecfdf5' },
  stockOkText: { color: '#059669', fontSize: 9, fontWeight: '700' },
  stockLow: { backgroundColor: '#fef3c7' },
  stockLowText: { color: '#b45309', fontSize: 9, fontWeight: '700' },
  stockOut: { backgroundColor: '#fee2e2' },
  stockOutText: { color: '#dc2626', fontSize: 9, fontWeight: '700' },
  productActionsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  iconActionBtn: {
    padding: 8,
    borderRadius: radius.sm,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  orderCardBox: {
    backgroundColor: '#ffffff',
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderNumberTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  orderDateSubtitle: {
    fontSize: 10,
    color: colors.textMuted,
  },
  statusTagAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  orderCustomerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  orderCustomerText: {
    fontSize: 11,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  orderAddressText: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 16,
  },
  orderItemsBox: {
    backgroundColor: '#f8fafc',
    borderRadius: radius.sm,
    padding: 8,
    gap: 4,
  },
  orderItemLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderItemName: {
    fontSize: 11,
    color: colors.text,
    flex: 1,
  },
  orderItemPrice: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  orderCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  orderGrandTotal: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.black,
    color: colors.text,
  },
  userCardBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: radius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarLetter: {
    color: colors.primary,
    fontWeight: fontWeight.bold,
    fontSize: 14,
  },
  userEmailText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  userJoinedText: {
    fontSize: 10,
    color: colors.textMuted,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
  },
  roleAdmin: { backgroundColor: '#fef3c7' },
  roleAdminText: { color: '#b45309', fontSize: 10, fontWeight: '700' },
  roleCustomer: { backgroundColor: '#f1f5f9' },
  roleCustomerText: { color: '#475569', fontSize: 10, fontWeight: '700' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeBtn: {
    padding: 4,
  },
  modalHeaderTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  saveHeaderBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  saveHeaderBtnText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: '#000',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  formInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: fontSize.xs,
    color: colors.text,
    backgroundColor: '#fff',
  },
});
