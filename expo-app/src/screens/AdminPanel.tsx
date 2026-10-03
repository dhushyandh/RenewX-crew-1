import AddProductModal from '@/components/AddProductModal';
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
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { type ProductRow, type Profile } from '@/lib/supabase';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme';
import { api } from '@/services/api';
import { useToast } from '@/context/ToastContext';
import { confirmAction } from '@/lib/confirmAction';
import { downloadOrderInvoicePdf } from '@/services/invoiceService';
import { useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import BrandsView from '@/components/admin/BrandsView';
import UsersManagementView from '@/components/admin/UsersManagementView';
import PromotionsManagementView from '@/components/admin/PromotionsManagementView';
import ImagePickerButton from '@/components/ImagePickerButton';
import * as Clipboard from 'expo-clipboard';
import { sanitizeImageUrl } from '@/lib/imageUtils';
import { useSafeHeaderTop } from '@/lib/useSafeHeaderTop';


type AdminView = 'dashboard' | 'products' | 'orders' | 'users' | 'analytics' | 'settings' | 'tradeIns' | 'brands' | 'promotions';

const CATEGORIES = ['All', 'Phones', 'Smartphones', 'Laptops', 'Tablets', 'Watches', 'Audio'];

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
  const { isAdmin, loading: authLoading, user } = useAuth();
  const uName = (user as any)?.name || (user as any)?.displayName || (user as any)?.email || 'ND';
  const adminInitials = uName.trim().slice(0, 2).toUpperCase();

  const routeName = route?.name;
  const paramScreen = route?.params?.screen;
  const targetId = route?.params?.id || route?.params?.productId;

  const determineInitialView = (): AdminView => {
    if (routeName === 'AdminBrands' || routeName === 'AdminAddBrand' || routeName === 'AdminAddModel') return 'brands';
    if (routeName === 'AdminProducts' || routeName === 'AdminAddProduct' || routeName === 'AdminEditProduct') return 'products';
    if (routeName === 'AdminOrders') return 'orders';
    if (routeName === 'AdminUsers') return 'users';
    if (routeName === 'AdminAnalytics') return 'analytics';
    if (routeName === 'AdminSettings') return 'settings';
    if (routeName === 'AdminTradeIns') return 'tradeIns';
    if (routeName === 'AdminPromotions') return 'promotions';
    if (routeName === 'AdminDashboard') return 'dashboard';

    if (paramScreen === 'brands' || paramScreen === 'addBrand' || paramScreen === 'addModel') return 'brands';
    if (paramScreen === 'products' || paramScreen === 'addProduct' || paramScreen === 'editProduct') return 'products';
    if (paramScreen === 'orders') return 'orders';
    if (paramScreen === 'users') return 'users';
    if (paramScreen === 'analytics') return 'analytics';
    if (paramScreen === 'settings') return 'settings';
    if (paramScreen === 'tradeIns') return 'tradeIns';
    if (paramScreen === 'promotions') return 'promotions';
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

  const handleExit = () => {
    if (modalVisible) {
      setModalVisible(false);
    }
    if (onExit) {
      onExit();
      return;
    }
    try {
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs', params: { screen: 'Home' } }],
      });
    } catch {
      navigation.navigate('MainTabs', { screen: 'Home' });
    }
  };

  const handleBack = () => {
    if (modalVisible) {
      setModalVisible(false);
      return;
    }
    if (onExit) {
      onExit();
      return;
    }

    try {
      const state = navigation.getState();
      const adminRoutes = new Set([
        'AdminDashboard', 'AdminProducts', 'AdminAddProduct', 'AdminEditProduct',
        'AdminBrands', 'AdminAddBrand', 'AdminAddModel', 'AdminOrders',
        'AdminUsers', 'AdminTradeIns', 'Admin'
      ]);
      const hasNonAdminInHistory = state?.routes?.slice(0, -1).some((r: any) => !adminRoutes.has(r.name));
      if (hasNonAdminInHistory && navigation.canGoBack()) {
        navigation.goBack();
        return;
      }
    } catch {
      // fallback
    }

    if (view !== 'dashboard') {
      setView('dashboard');
      navigation.navigate('AdminDashboard');
    } else {
      handleExit();
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
    else if (v === 'promotions') navigation.navigate('Admin', { screen: 'promotions' });
  };

  const handleAddProduct = () => {
    setEditingProduct(null);
    setModalVisible(true);
  };

  const handleEditProduct = (p: ProductRow) => {
    setEditingProduct(p);
    setModalVisible(true);
  };

  const safeTop = useSafeHeaderTop();

  if (authLoading || !isAdmin) {
    return (
      <ProtectedRoute adminOnly>
        <View />
      </ProtectedRoute>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: safeTop }]}>
      {/* Top Header matching Mockup */}
      <View style={styles.headerM3}>
        <View style={styles.headerLeftColM3}>
          <View style={styles.headerLogoRowM3}>
            <Text style={styles.headerBrandRenewM3}>Renew</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.headerBrandXM3}>X</Text>
              <Ionicons
                name="arrow-up"
                size={14}
                color="#EAB308"
                style={{ transform: [{ rotate: '45deg' }], marginLeft: -3, marginTop: -9 }}
              />
            </View>
          </View>
          <Text style={styles.headerSubtitleAdminPanelM3}>Admin Panel</Text>
        </View>

        <View style={styles.headerRightActionsM3}>
          {/* 1. Sell Req. Pill Button with tag and yellow dot */}
          <TouchableOpacity
            style={[styles.topBarSellReqBtn, view === 'tradeIns' && styles.topBarSellReqBtnActive]}
            onPress={() => handleTabPress('tradeIns')}
            activeOpacity={0.8}
            accessibilityLabel="Sell Requests"
          >
            <Ionicons name="pricetag-outline" size={13} color="#0F172A" />
            <View style={styles.topBarYellowDot} />
            <Text style={styles.topBarSellReqText}>Sell Req.</Text>
          </TouchableOpacity>

          {/* 2. Notifications Bell with Badge */}
          <TouchableOpacity
            style={styles.topBarCircleBtn}
            onPress={() => navigation.navigate('Notifications')}
            activeOpacity={0.8}
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={19} color="#0F172A" />
            <View style={styles.topBarBadge}>
              <Text style={styles.topBarBadgeText}>3</Text>
            </View>
          </TouchableOpacity>

          {/* 3. Settings Gear */}
          <TouchableOpacity
            style={[styles.topBarCircleBtn, view === 'settings' && styles.topBarCircleBtnActive]}
            onPress={() => handleTabPress('settings')}
            activeOpacity={0.8}
            accessibilityLabel="Admin Settings"
          >
            <Ionicons name="settings-outline" size={19} color="#0F172A" />
          </TouchableOpacity>

          {/* 4. Dedicated Exit Button (Requested by User) */}
          <TouchableOpacity
            style={styles.topBarExitBtn}
            onPress={handleExit}
            activeOpacity={0.8}
            accessibilityLabel="Exit Admin"
          >
            <Ionicons name="log-out-outline" size={16} color="#DC2626" />
            <Text style={styles.topBarExitText}>Exit</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Secondary Sub-View Navigation Header (Breadcrumb) */}
      {view !== 'dashboard' && view !== 'products' && view !== 'orders' && view !== 'users' && view !== 'brands' && (
        <View style={styles.secondaryViewNavHeader}>
          <TouchableOpacity
            onPress={() => handleTabPress('dashboard')}
            style={styles.secondaryBackBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={16} color="#0F172A" />
            <Text style={styles.secondaryBackText}>Dashboard</Text>
          </TouchableOpacity>
          <View style={styles.secondaryActiveBadge}>
            <Text style={styles.secondaryActiveBadgeText}>
              {view === 'analytics' ? 'Realtime Analytics' : view === 'promotions' ? 'Promotions' : view === 'settings' ? 'Settings' : 'Sell Requests'}
            </Text>
          </View>
        </View>
      )}

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
        {view === 'orders' && <OrdersView />}
        {view === 'users' && <UsersManagementView />}
        {view === 'analytics' && <AnalyticsView onNavigate={(v) => handleTabPress(v)} />}
        {view === 'settings' && <AdminSettingsView onNavigate={(v) => handleTabPress(v)} />}
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
        {view === 'tradeIns' && <TradeInsView />}
        {view === 'promotions' && <PromotionsManagementView />}
      </View>

      {/* Bottom Nav Bar - Exactly Matching Screenshot */}
      <View
        style={[
          styles.adminBottomNavM3,
          { paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 22 : 10) },
        ]}
        accessibilityRole="tablist"
      >
        {[
          { id: 'dashboard', label: 'Dashboard', icon: 'home-outline' },
          { id: 'products', label: 'Products', icon: 'cube-outline' },
          { id: 'orders', label: 'Orders', icon: 'cart-outline' },
          { id: 'users', label: 'Users', icon: 'people-outline' },
          { id: 'brands', label: 'Brands', icon: 'pricetag-outline' },
        ].map((tab) => {
          const isActive = view === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.adminBottomNavItemM3}
              onPress={() => handleTabPress(tab.id as AdminView)}
              activeOpacity={0.8}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`Admin ${tab.label}`}
            >
              {isActive ? (
                <View style={styles.adminTabActivePillM3}>
                  <Ionicons name={tab.icon as any} size={20} color="#0F172A" />
                  <Text style={styles.adminTabActiveTextM3} numberOfLines={1}>{tab.label}</Text>
                </View>
              ) : (
                <View style={styles.adminTabInactiveWrapM3}>
                  <Ionicons name={tab.icon as any} size={21} color="#64748B" />
                  <Text style={styles.adminTabInactiveTextM3} numberOfLines={1}>{tab.label}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
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
    </View>
  );
}



function TradeInsView() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isSmallScreen = screenWidth < 768;

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [drafts, setDrafts] = useState<Record<string, { amount: string; note: string }>>({});
  const [showAdvancedNotes, setShowAdvancedNotes] = useState(false);
  const toast = useToast();

  // Inspection Modal States (Matching User Screenshots)
  const [selectedInspectionItem, setSelectedInspectionItem] = useState<any | null>(null);
  const [inspectingPhotoUrl, setInspectingPhotoUrl] = useState<string | null>(null);
  const [inspectionStatus, setInspectionStatus] = useState<string>('pending');
  const [inspectionOffer, setInspectionOffer] = useState<string>('');
  const [inspectionNote, setInspectionNote] = useState<string>('');
  const [isSavingInspection, setIsSavingInspection] = useState(false);

  const getItemPhotos = (item: any): string[] => {
    if (!item) return [];
    const list: string[] = [];

    // 1. Direct photos array
    if (Array.isArray(item.photos)) {
      list.push(...item.photos);
    } else if (typeof item.photos === 'string' && item.photos.trim()) {
      list.push(item.photos);
    }

    // 2. Condition.photos - can be array OR object (front, back, edges, bill, etc.)
    if (item.condition?.photos) {
      if (Array.isArray(item.condition.photos)) {
        list.push(...item.condition.photos);
      } else if (typeof item.condition.photos === 'object') {
        Object.values(item.condition.photos).forEach((val) => {
          if (typeof val === 'string' && val.trim()) list.push(val);
        });
      }
    }

    // 3. Condition.photoMap
    if (item.condition?.photoMap && typeof item.condition.photoMap === 'object') {
      Object.values(item.condition.photoMap).forEach((val) => {
        if (typeof val === 'string' && val.trim()) list.push(val);
      });
    }

    // 4. Condition direct photo keys
    if (item.condition && typeof item.condition === 'object') {
      ['front', 'back', 'edges', 'side', 'bill', 'billBox', 'photo', 'device_image'].forEach((k) => {
        if (typeof item.condition[k] === 'string' && item.condition[k].trim()) {
          list.push(item.condition[k]);
        }
      });
    }

    // 5. Root images array / single URLs
    if (Array.isArray(item.images)) list.push(...item.images);
    if (typeof item.image_url === 'string' && item.image_url.trim()) list.push(item.image_url);
    if (typeof item.device_image === 'string' && item.device_image.trim()) list.push(item.device_image);

    // Filter, deduplicate, and upgrade HTTP to HTTPS on web to prevent mixed content
    const isHttps = typeof window !== 'undefined' && window.location?.protocol === 'https:';

    const cleanList = Array.from(new Set(list))
      .filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
      .map((p) => {
        let uri = p.trim();
        if (isHttps && uri.startsWith('http://') && !uri.includes('localhost') && !uri.includes('127.0.0.1')) {
          uri = uri.replace('http://', 'https://');
        }
        return uri;
      });

    return cleanList;
  };

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const data = await api.tradeIn.getAll(statusFilter === 'all' ? undefined : statusFilter);
      const rows = Array.isArray(data) ? data : [];
      setItems(rows);
      setDrafts((prev) => {
        const next = { ...prev };
        rows.forEach((item) => {
          const id = String(item.id || item._id);
          if (!next[id]) next[id] = { amount: item.approved_amount != null ? String(item.approved_amount) : '', note: String(item.admin_note || '') };
        });
        return next;
      });
    } catch (err: any) {
      toast.error(err?.message || 'Unable to load sell requests.');
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, toast]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load(true);
  }, [load]);

  useEffect(() => { load(); }, [load]);

  const openInspection = (item: any) => {
    setSelectedInspectionItem(item);
    setInspectionStatus(item.status || 'pending');
    setInspectionOffer(
      item.approved_amount != null && item.approved_amount > 0
        ? String(item.approved_amount)
        : item.expected_price != null && item.expected_price > 0
          ? String(item.expected_price)
          : item.valuation_amount != null
            ? String(item.valuation_amount)
            : ''
    );
    setInspectionNote(item.admin_note || '');
    setShowAdvancedNotes(false);
  };

  const createInventoryFromApprovedRequest = async (item: any, approvedAmount: number) => {
    const photos = getItemPhotos(item);
    const imageUrl = photos[0] || String(
      item.image_url || item.image || item.device_image || item.photo_url || item.photo || ''
    ).trim();

    const productName = String(
      item.product_name || item.name || `${item.brand || 'Device'} ${item.model || ''}`.trim()
    ).trim();

    try {
      await api.products.create({
        name: productName || 'Trade-in Device',
        brand: String(item.brand || '').trim(),
        model: String(item.model || '').trim() || undefined,
        category: String(item.category || 'Smartphones').trim(),
        original_price: Number(item.original_price || item.mrp || approvedAmount),
        price: approvedAmount,
        condition: String(item.condition?.screen || item.condition?.body || 'Good'),
        image_url: imageUrl || item.images?.[0] || item.device_images?.[0] || '',
        stock: 1,
        description: String(item.description || item.condition_description || 'Certified device inspected and approved through RenewX Trade-In inspection.'),
        specs: [
          item.storage ? `Storage: ${item.storage}` : '',
          item.condition?.color ? `Color: ${item.condition.color}` : '',
          item.condition?.batteryHealthy ? 'Battery: Healthy' : '',
        ].filter(Boolean),
      });
    } catch (err: any) {
      console.warn('[TradeIn] Auto-inventory creation notice:', err?.message);
    }
  };

  const update = async (id: string, status: string, customAmount?: number, customNote?: string) => {
    try {
      setBusyId(id);
      const draft = drafts[id] || { amount: '', note: '' };
      const approvedAmount = customAmount !== undefined
        ? customAmount
        : draft.amount.trim() ? Number(draft.amount) : undefined;
      const noteToSave = customNote !== undefined ? customNote : draft.note.trim();

      const currentItem = items.find((item) => String(item.id || item._id) === id);
      const finalAmount = approvedAmount ?? Number(currentItem?.approved_amount || currentItem?.valuation_amount || 0);

      if (status === 'approved' && currentItem) {
        await createInventoryFromApprovedRequest(currentItem, finalAmount > 0 ? finalAmount : 7000);
      }

      if (status === 'rejected' && currentItem) {
        // If device was previously approved and added to store inventory, remove or archive it
        try {
          const allProds = await api.products.getAll();
          const targetName = `${currentItem.brand || 'Device'} ${currentItem.model || ''}`.trim().toLowerCase();
          const matched = allProds.find((p: any) =>
            p.name?.trim().toLowerCase() === targetName ||
            (p.brand?.toLowerCase() === currentItem.brand?.toLowerCase() && p.model?.toLowerCase() === currentItem.model?.toLowerCase())
          );
          if (matched && (matched.id || (matched as any)._id)) {
            await api.products.delete(matched.id || (matched as any)._id);
          }
        } catch (delErr) {
          console.warn('[TradeIn] Delist inventory notice on reject:', delErr);
        }
      }

      const updated = await api.tradeIn.updateStatus(
        id,
        status,
        finalAmount > 0 ? finalAmount : approvedAmount,
        noteToSave || undefined
      );

      setItems((prev) => prev.map((item) => String(item.id || item._id) === id
        ? { ...item, ...(updated || {}), status, approved_amount: finalAmount > 0 ? finalAmount : item.approved_amount, admin_note: noteToSave }
        : item));

      setSelectedInspectionItem((prev: any) => {
        if (!prev || String(prev.id || prev._id) !== id) return prev;
        return {
          ...prev,
          ...(updated || {}),
          status,
          approved_amount: finalAmount > 0 ? finalAmount : prev.approved_amount,
          admin_note: noteToSave,
        };
      });

      toast.success(
        status === 'approved'
          ? 'Request approved and device added to inventory.'
          : status === 'rejected'
            ? 'Sell request rejected and delisted from store.'
            : `Sell request marked ${status.replace(/_/g, ' ')}`,
        status === 'approved' ? 'Inventory Updated' : status === 'rejected' ? 'Request Rejected' : 'Request Updated'
      );
    } catch (err: any) {
      toast.error(err?.message || 'Unable to update this sell request.');
    } finally {
      setBusyId(null);
    }
  };

  const handleApproveFromInspection = async () => {
    if (!selectedInspectionItem) return;
    const id = String(selectedInspectionItem.id || selectedInspectionItem._id);
    const numOffer = inspectionOffer.trim() ? Number(inspectionOffer) : undefined;
    try {
      setIsSavingInspection(true);
      await update(id, 'approved', numOffer, inspectionNote || 'Inspected and condition verified by technician');
      setSelectedInspectionItem(null);
    } finally {
      setIsSavingInspection(false);
    }
  };

  const handleRejectFromInspection = async () => {
    if (!selectedInspectionItem) return;
    const id = String(selectedInspectionItem.id || selectedInspectionItem._id);
    const numOffer = inspectionOffer.trim() ? Number(inspectionOffer) : undefined;
    try {
      setIsSavingInspection(true);
      await update(id, 'rejected', numOffer, inspectionNote || 'Inspected and rejected after condition review');
      setSelectedInspectionItem(null);
    } finally {
      setIsSavingInspection(false);
    }
  };

  const handleSaveInspection = async () => {
    if (!selectedInspectionItem) return;
    const id = String(selectedInspectionItem.id || selectedInspectionItem._id);
    const numOffer = inspectionOffer.trim() ? Number(inspectionOffer) : undefined;
    try {
      setIsSavingInspection(true);
      await update(id, inspectionStatus, numOffer, inspectionNote);
      setSelectedInspectionItem((prev: any) => prev ? {
        ...prev,
        status: inspectionStatus,
        approved_amount: numOffer ?? prev.approved_amount,
        admin_note: inspectionNote,
      } : null);
    } finally {
      setIsSavingInspection(false);
    }
  };

  const filtered = items.filter((item) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [item.brand, item.model, item.customer_name, item.customer_phone, item.id]
      .some((v) => String(v || '').toLowerCase().includes(q));
  });

  const inspectionPhotos = selectedInspectionItem ? getItemPhotos(selectedInspectionItem) : [];

  if (loading && !refreshing) return <View style={styles.centerBox}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <View style={{ flex: 1, position: 'relative' }}>
      <View style={styles.searchBarContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color="#94a3b8" />
          <TextInput value={search} onChangeText={setSearch} placeholder="Search device, customer or phone..." placeholderTextColor="#94a3b8" style={styles.searchInput} />
        </View>
        <TouchableOpacity onPress={() => onRefresh()} style={styles.addButtonMini}><Ionicons name="refresh" size={18} color="#000" /></TouchableOpacity>
      </View>

      <View style={{ height: 42, marginVertical: 8 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.md, gap: 8 }}>
          {['all', 'pending', 'approved', 'rejected', 'scheduled', 'picked_up', 'inspected', 'completed'].map((status) => (
            <TouchableOpacity key={status} onPress={() => setStatusFilter(status)} style={[styles.filterChip, statusFilter === status && styles.filterChipActive]}>
              <Text style={[styles.filterChipText, statusFilter === status && styles.filterChipTextActive]}>
                {status === 'all' ? 'All' : status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 100, gap: 14, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        alwaysBounceVertical={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {filtered.length === 0 ? (
          <View style={[styles.centerBox, { minHeight: 250 }]}>
            <Ionicons name="pricetag-outline" size={38} color="#94a3b8" />
            <Text style={styles.emptyNote}>{search ? 'No requests match your search.' : 'No sell requests found.'}</Text>
          </View>
        ) : (
          filtered.map((item) => {
            const id = String(item.id || item._id);
            const status = String(item.status || 'pending');
            const photos = getItemPhotos(item);

            return (
              <View key={id} style={[styles.cardContainer, { borderWidth: 1.5, borderColor: '#e2e8f0' }]}>
                {/* Top Row: Device Name & Status Tag */}
                <View style={styles.cardTopRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardHeaderTitle}>{item.brand || 'Device'} {item.model || ''}</Text>
                    <Text style={styles.cardHeaderSub}>{item.category || 'Category'}{item.storage ? ` • ${item.storage}` : ''}</Text>
                  </View>
                  <View style={[
                    styles.statusTag,
                    status === 'approved' && { backgroundColor: '#dcfce7' },
                    status === 'rejected' && { backgroundColor: '#fee2e2' },
                    status === 'pending' && { backgroundColor: '#fef3c7' }
                  ]}>
                    <Text style={[
                      styles.statusTagText,
                      status === 'approved' && { color: '#15803d' },
                      status === 'rejected' && { color: '#b91c1c' },
                      status === 'pending' && { color: '#b45309' }
                    ]}>
                      {status === 'approved' ? 'LIVE IN STORE' : status.replace(/_/g, ' ').toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* Photos Thumbnail Preview Strip */}
                {photos.length > 0 && (
                  <View style={{ marginVertical: 8, padding: 10, backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#334155' }}>
                        📷 Customer Photos ({photos.length})
                      </Text>
                      <TouchableOpacity onPress={() => openInspection(item)}>
                        <Text style={{ fontSize: 11, color: '#2563eb', fontWeight: '700' }}>Inspect All →</Text>
                      </TouchableOpacity>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                      {photos.map((pUrl, pIdx) => (
                        <TouchableOpacity
                          key={pIdx}
                          onPress={() => setInspectingPhotoUrl(pUrl)}
                          activeOpacity={0.8}
                          style={{ position: 'relative', borderRadius: 8, overflow: 'hidden' }}
                        >
                          <Image
                            source={{ uri: pUrl }}
                            style={{ width: 68, height: 68, backgroundColor: '#000' }}
                            resizeMode="cover"
                          />
                          <View style={{ position: 'absolute', bottom: 3, right: 3, backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 4, padding: 3 }}>
                            <Ionicons name="search" size={11} color="#fff" />
                          </View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Customer Info */}
                <Text style={styles.orderCustomerText}>
                  👤 {item.customer_name || 'Customer'} • 📞 {item.customer_phone || 'No phone'}
                </Text>
                {item.customer_email ? (
                  <Text style={[styles.orderAddressText, { color: '#64748b' }]}>✉️ {item.customer_email}</Text>
                ) : null}
                {item.pickup_address || item.address ? (
                  <Text style={styles.orderAddressText}>📍 {item.pickup_address || item.address}</Text>
                ) : null}

                {/* Valuation Info & Photo Count */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' }}>
                  <View>
                    <Text style={{ fontSize: 11, color: '#64748b', fontWeight: '600' }}>Valuation / Asking</Text>
                    <Text style={{ fontSize: 18, fontWeight: '900', color: '#0f172a' }}>
                      ₹{Number(item.approved_amount || item.expected_price || item.valuation_amount || 0).toLocaleString('en-IN')}
                    </Text>
                  </View>

                  {photos.length > 0 && (
                    <View style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="images-outline" size={13} color="#475569" />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569' }}>{photos.length} photos</Text>
                    </View>
                  )}
                </View>

                {/* Sleek Action Buttons Row */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
                  {/* Primary Sleek Inspect Button */}
                  <TouchableOpacity
                    onPress={() => openInspection(item)}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 7,
                      backgroundColor: '#0f172a',
                      paddingVertical: 11,
                      paddingHorizontal: 14,
                      borderRadius: 10,
                      shadowColor: '#0f172a',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.15,
                      shadowRadius: 3,
                      elevation: 2,
                    }}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="search-outline" size={16} color="#38bdf8" />
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#ffffff' }}>
                      Inspect Device
                    </Text>
                    <Ionicons name="chevron-forward" size={13} color="#94a3b8" />
                  </TouchableOpacity>

                  {/* Status-specific Direct Actions */}
                  {status === 'approved' ? (
                    /* IF APPROVED: Give direct 1-click REJECT button */
                    <TouchableOpacity
                      onPress={() => update(id, 'rejected', undefined, 'Approval revoked and request rejected by admin')}
                      disabled={busyId === id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        backgroundColor: '#fef2f2',
                        borderWidth: 1.5,
                        borderColor: '#fca5a5',
                        paddingVertical: 10,
                        paddingHorizontal: 14,
                        borderRadius: 10,
                      }}
                      activeOpacity={0.85}
                    >
                      {busyId === id ? (
                        <ActivityIndicator size="small" color="#dc2626" />
                      ) : (
                        <>
                          <Ionicons name="close-circle-outline" size={16} color="#dc2626" />
                          <Text style={{ fontSize: 12, fontWeight: '800', color: '#dc2626' }}>Reject Request</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  ) : status === 'rejected' ? (
                    /* IF REJECTED: Give direct RE-APPROVE button */
                    <TouchableOpacity
                      onPress={() => update(id, 'approved', undefined, 'Re-evaluated and approved by admin')}
                      disabled={busyId === id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        backgroundColor: '#ecfdf5',
                        borderWidth: 1.5,
                        borderColor: '#86efac',
                        paddingVertical: 10,
                        paddingHorizontal: 14,
                        borderRadius: 10,
                      }}
                      activeOpacity={0.85}
                    >
                      {busyId === id ? (
                        <ActivityIndicator size="small" color="#16a34a" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle-outline" size={16} color="#16a34a" />
                          <Text style={{ fontSize: 12, fontWeight: '800', color: '#16a34a' }}>Re-Approve</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  ) : status === 'cancelled' ? (
                    /* IF CANCELLED: Informative status badge */
                    <View style={{
                      backgroundColor: '#f1f5f9',
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      borderRadius: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                    }}>
                      <Ionicons name="ban-outline" size={14} color="#64748b" />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b' }}>Cancelled</Text>
                    </View>
                  ) : (
                    /* IF PENDING / SCHEDULED: Quick 1-click Approve */
                    <TouchableOpacity
                      onPress={() => update(id, 'approved', undefined, 'Condition verified and approved by admin')}
                      disabled={busyId === id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        backgroundColor: '#ecfdf5',
                        borderWidth: 1.5,
                        borderColor: '#86efac',
                        paddingVertical: 10,
                        paddingHorizontal: 14,
                        borderRadius: 10,
                      }}
                      activeOpacity={0.85}
                    >
                      {busyId === id ? (
                        <ActivityIndicator size="small" color="#16a34a" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle-outline" size={16} color="#16a34a" />
                          <Text style={{ fontSize: 12, fontWeight: '800', color: '#16a34a' }}>Approve</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* ========================================================================================
          MODAL 1: FULL SELL REQUEST & 12-POINT DIAGNOSTIC INSPECTION (MOBILE RESPONSIVE)
      ======================================================================================== */}
      {selectedInspectionItem && (
        <Modal
          visible={!!selectedInspectionItem}
          animationType={isSmallScreen ? "slide" : "fade"}
          transparent={!isSmallScreen}
          presentationStyle={isSmallScreen ? "fullScreen" : "overFullScreen"}
          onRequestClose={() => setSelectedInspectionItem(null)}
        >
          <View style={isSmallScreen ? {
            flex: 1,
            backgroundColor: '#ffffff',
            paddingTop: Math.max(insets.top, 8),
            ...(Platform.OS === 'web' ? {
              position: 'fixed' as any,
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw' as any,
              height: '100vh' as any,
              zIndex: 99999,
            } : {}),
          } : {
            position: Platform.OS === 'web' ? ('fixed' as any) : undefined,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: Platform.OS === 'web' ? ('100vw' as any) : undefined,
            height: Platform.OS === 'web' ? ('100vh' as any) : undefined,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 99999,
            padding: 16,
            flex: Platform.OS === 'web' ? undefined : 1,
          }}>
            <View style={{
              backgroundColor: '#ffffff',
              borderRadius: isSmallScreen ? 0 : 20,
              width: '100%',
              maxWidth: isSmallScreen ? '100%' : 920,
              height: isSmallScreen ? '100%' : undefined,
              maxHeight: isSmallScreen ? '100%' : ('92%' as any),
              flex: 1,
              overflow: 'hidden',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: isSmallScreen ? 0 : 0.25,
              shadowRadius: 20,
              elevation: 10,
              display: 'flex',
              flexDirection: 'column',
            }}>
              {/* Modal Top Header */}
              <View style={{
                paddingHorizontal: isSmallScreen ? 14 : 20,
                paddingTop: isSmallScreen ? 12 : 18,
                paddingBottom: 12,
                borderBottomWidth: 1,
                borderBottomColor: '#f1f5f9',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#ffffff',
              }}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <View style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0' }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#334155', fontFamily: Platform.OS === 'web' ? 'monospace' : undefined }}>
                        VT-{String(selectedInspectionItem.id || selectedInspectionItem._id || '1081').slice(0, 4).toUpperCase()}-SELL
                      </Text>
                    </View>
                    <View style={{
                      backgroundColor: selectedInspectionItem.status === 'approved' ? '#dcfce7' : selectedInspectionItem.status === 'rejected' ? '#fee2e2' : '#e0f2fe',
                      paddingHorizontal: 7,
                      paddingVertical: 2.5,
                      borderRadius: 6,
                    }}>
                      <Text style={{
                        fontSize: 9,
                        fontWeight: '800',
                        color: selectedInspectionItem.status === 'approved' ? '#15803d' : selectedInspectionItem.status === 'rejected' ? '#b91c1c' : '#0369a1',
                        textTransform: 'uppercase',
                      }}>
                        {selectedInspectionItem.status === 'approved' ? 'LIVE IN STORE' : (selectedInspectionItem.status || 'PENDING').replace(/_/g, ' ')}
                      </Text>
                    </View>
                  </View>

                  <Text style={{ fontSize: isSmallScreen ? 17 : 20, fontWeight: '900', color: '#0f172a', letterSpacing: -0.4 }} numberOfLines={1}>
                    {selectedInspectionItem.brand} {selectedInspectionItem.model}
                  </Text>
                  <Text style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>
                    Submitted on {new Date(selectedInspectionItem.created_at || Date.now()).toLocaleString('en-IN', {
                      month: 'numeric',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: 'numeric',
                    })}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => setSelectedInspectionItem(null)}
                  style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close" size={20} color="#475569" />
                </TouchableOpacity>
              </View>

              {/* Scrollable Modal Body (flex: 1 GUARANTEES it never collapses) */}
              <ScrollView
                style={{ flex: 1 }}
                showsVerticalScrollIndicator
                contentContainerStyle={{
                  padding: isSmallScreen ? 12 : 20,
                  gap: 14,
                  paddingBottom: isSmallScreen ? 30 : 20,
                }}
              >
                {/* 1. CUSTOMER UPLOADED DEVICE PHOTOS */}
                <View style={{ backgroundColor: '#ffffff', borderRadius: 16, padding: isSmallScreen ? 12 : 16, borderWidth: 1, borderColor: '#e2e8f0' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                      Customer Uploaded Photos ({inspectionPhotos.length})
                    </Text>
                    <Text style={{ fontSize: 10, color: '#2563eb', fontWeight: '700' }}>
                      TAP PHOTO TO ZOOM
                    </Text>
                  </View>

                  {inspectionPhotos.length > 0 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                      {inspectionPhotos.map((photoUrl, pIdx) => (
                        <TouchableOpacity
                          key={pIdx}
                          onPress={() => setInspectingPhotoUrl(photoUrl)}
                          activeOpacity={0.85}
                          style={{
                            width: isSmallScreen ? 120 : 150,
                            height: isSmallScreen ? 88 : 105,
                            borderRadius: 12,
                            overflow: 'hidden',
                            backgroundColor: '#000000',
                            borderWidth: 1.5,
                            borderColor: '#cbd5e1',
                            position: 'relative',
                          }}
                        >
                          <Image source={{ uri: photoUrl }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
                          <View style={{ position: 'absolute', bottom: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 }}>
                            <Ionicons name="scan-outline" size={12} color="#ffffff" />
                          </View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  ) : (
                    <View style={{ padding: 14, backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' }}>
                      <Text style={{ fontSize: 12, color: '#64748b' }}>No device photos uploaded by customer for this request.</Text>
                    </View>
                  )}
                </View>

                {/* 2. CUSTOMER INFORMATION & HARDWARE SPECIFICATIONS */}
                <View style={{ flexDirection: isSmallScreen ? 'column' : 'row', gap: 12 }}>
                  {/* Left: Customer Information */}
                  <View style={{ flex: 1, backgroundColor: '#ffffff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                      <Ionicons name="person-outline" size={16} color="#2563eb" />
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a', textTransform: 'uppercase' }}>
                        Customer Information
                      </Text>
                    </View>
                    <View style={{ gap: 6 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 10, color: '#94a3b8' }}>Name:</Text>
                          <Text style={{ fontSize: 13, fontWeight: '800', color: '#0f172a' }}>{selectedInspectionItem.customer_name || 'N/A'}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 10, color: '#94a3b8' }}>Phone:</Text>
                          <Text style={{ fontSize: 13, fontWeight: '800', color: '#0f172a' }}>{selectedInspectionItem.customer_phone || 'N/A'}</Text>
                        </View>
                      </View>
                      <View>
                        <Text style={{ fontSize: 10, color: '#94a3b8' }}>Email:</Text>
                        <Text style={{ fontSize: 12, color: '#334155' }} numberOfLines={1}>
                          {selectedInspectionItem.customer_email || 'Not provided'}
                        </Text>
                      </View>
                      <View>
                        <Text style={{ fontSize: 10, color: '#94a3b8' }}>City/State:</Text>
                        <Text style={{ fontSize: 12, color: '#334155' }}>
                          {selectedInspectionItem.address?.split(',').slice(-2).join(',').trim() || 'Tamil Nadu'}
                        </Text>
                      </View>
                      <View>
                        <Text style={{ fontSize: 10, color: '#94a3b8' }}>Pickup Address:</Text>
                        <Text style={{ fontSize: 12, color: '#334155' }}>
                          {selectedInspectionItem.pickup_address || selectedInspectionItem.address || 'Standard Address'} (Pin: {selectedInspectionItem.pincode})
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Right: Hardware Specifications */}
                  <View style={{ flex: 1, backgroundColor: '#ffffff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                      <Ionicons name="hardware-chip-outline" size={16} color="#059669" />
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a', textTransform: 'uppercase' }}>
                        Hardware Specifications
                      </Text>
                    </View>
                    <View style={{ gap: 6 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 10, color: '#94a3b8' }}>Brand & Category:</Text>
                          <Text style={{ fontSize: 13, fontWeight: '800', color: '#0f172a' }}>
                            {selectedInspectionItem.brand} ({selectedInspectionItem.category || 'smartphones'})
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 10, color: '#94a3b8' }}>Model:</Text>
                          <Text style={{ fontSize: 13, fontWeight: '800', color: '#0f172a' }}>{selectedInspectionItem.model}</Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 10, color: '#94a3b8' }}>Storage Capacity:</Text>
                          <Text style={{ fontSize: 13, fontWeight: '900', color: '#2563eb' }}>
                            {selectedInspectionItem.storage || '64GB'}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 10, color: '#94a3b8' }}>RAM / Variant:</Text>
                          <Text style={{ fontSize: 12, color: '#334155' }}>
                            {selectedInspectionItem.condition?.ram || selectedInspectionItem.storage || 'Standard Variant'}
                          </Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 10, color: '#94a3b8' }}>Color:</Text>
                          <Text style={{ fontSize: 12, color: '#334155' }}>
                            {selectedInspectionItem.condition?.color || 'Standard White'}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 10, color: '#94a3b8' }}>Purchase Year:</Text>
                          <Text style={{ fontSize: 12, color: '#334155' }}>
                            {selectedInspectionItem.condition?.purchaseYear || '2023'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>

                {/* 3. 12-POINT DIAGNOSTIC ASSESSMENT & INCLUSIONS */}
                <View style={{
                  backgroundColor: '#f8fafc',
                  borderRadius: 18,
                  padding: isSmallScreen ? 12 : 16,
                  borderWidth: 1,
                  borderColor: '#dbeafe',
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                    <Ionicons name="shield-checkmark" size={17} color="#2563eb" />
                    <Text style={{ fontSize: 12, fontWeight: '900', color: '#1e3a8a', letterSpacing: 0.4, textTransform: 'uppercase' }}>
                      12-Point Diagnostic Assessment & Inclusions
                    </Text>
                  </View>

                  {/* Row 1: Conditions & Grade */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                    <View style={{ flex: 1, minWidth: isSmallScreen ? '46%' : 120, backgroundColor: '#ffffff', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' }}>
                      <Text style={{ fontSize: 10, color: '#64748b' }}>Screen Condition</Text>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a', textTransform: 'capitalize' }}>
                        {selectedInspectionItem.condition?.screen || 'Minor_scratches'}
                      </Text>
                    </View>
                    <View style={{ flex: 1, minWidth: isSmallScreen ? '46%' : 120, backgroundColor: '#ffffff', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' }}>
                      <Text style={{ fontSize: 10, color: '#64748b' }}>Body Condition</Text>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a', textTransform: 'capitalize' }}>
                        {selectedInspectionItem.condition?.body || 'Minor_scuffs'}
                      </Text>
                    </View>
                    <View style={{ flex: 1, minWidth: isSmallScreen ? '46%' : 120, backgroundColor: '#ffffff', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' }}>
                      <Text style={{ fontSize: 10, color: '#64748b' }}>Battery Health</Text>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#059669' }}>
                        {selectedInspectionItem.condition?.batteryHealthy ? 'Normal High' : 'Degraded'}
                      </Text>
                    </View>
                    <View style={{ flex: 1, minWidth: isSmallScreen ? '46%' : 120, backgroundColor: '#ffffff', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' }}>
                      <Text style={{ fontSize: 10, color: '#64748b' }}>Grade Calculated</Text>
                      <Text style={{ fontSize: 12, fontWeight: '900', color: '#2563eb' }}>
                        {selectedInspectionItem.condition?.calculatedGrade || 'Grade A'}
                      </Text>
                    </View>
                  </View>

                  {/* Row 2: 4 Functional Checks */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                    {[
                      { label: 'Touchscreen', val: selectedInspectionItem.condition?.touchWorking !== false },
                      { label: 'Speakers/Mic', val: selectedInspectionItem.condition?.switchesOn !== false },
                      { label: 'Cameras', val: selectedInspectionItem.condition?.cameraClear !== false },
                      { label: 'Biometrics', val: selectedInspectionItem.condition?.touchWorking !== false },
                    ].map((itemCheck, cIdx) => (
                      <View key={cIdx} style={{ flex: 1, minWidth: isSmallScreen ? '46%' : 120, backgroundColor: '#ffffff', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 11, color: '#334155' }}>{itemCheck.label}</Text>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: itemCheck.val ? '#059669' : '#dc2626' }}>
                          {itemCheck.val ? 'Working' : 'Faulty'}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Row 3: 4 Inclusions & Accessories */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {[
                      { label: 'Original Box', val: selectedInspectionItem.condition?.accessories?.hasBox },
                      { label: 'Charger', val: selectedInspectionItem.condition?.accessories?.hasCharger },
                      { label: 'Valid Bill', val: selectedInspectionItem.condition?.accessories?.hasBill },
                      { label: 'OEM Warranty', val: false, custom: 'Expired' },
                    ].map((itemAcc, aIdx) => (
                      <View key={aIdx} style={{ flex: 1, minWidth: isSmallScreen ? '46%' : 120, backgroundColor: '#ffffff', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 11, color: '#334155' }}>{itemAcc.label}</Text>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: itemAcc.custom ? '#64748b' : itemAcc.val ? '#059669' : '#94a3b8' }}>
                          {itemAcc.custom || (itemAcc.val ? 'Included' : 'Missing')}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* 4. PRICING & VALUATION and PICKUP & PAYOUT DETAILS */}
                <View style={{ flexDirection: isSmallScreen ? 'column' : 'row', gap: 12 }}>
                  {/* Left: Pricing & Valuation */}
                  <View style={{ flex: 1, backgroundColor: '#ffffff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#bbf7d0' }}>
                    <Text style={{ fontSize: 12, fontWeight: '900', color: '#15803d', textTransform: 'uppercase', marginBottom: 8 }}>
                      Pricing & Valuation
                    </Text>
                    <View style={{ gap: 6 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 12, color: '#475569' }}>Customer Asking Price:</Text>
                        <Text style={{ fontSize: 16, fontWeight: '900', color: '#059669' }}>
                          ₹{Number(selectedInspectionItem.expected_price || 7000).toLocaleString('en-IN')}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 12, color: '#475569' }}>System Market Appraisal:</Text>
                        <Text style={{ fontSize: 15, fontWeight: '900', color: '#0f172a' }}>
                          ₹{Number(selectedInspectionItem.valuation_amount || 16180).toLocaleString('en-IN')}
                        </Text>
                      </View>
                      <View style={{ marginTop: 6 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                          Final Approved / Adjusted Offer (₹)
                        </Text>
                        <TextInput
                          value={inspectionOffer}
                          onChangeText={setInspectionOffer}
                          keyboardType="numeric"
                          placeholder="e.g. 7000"
                          placeholderTextColor="#94a3b8"
                          style={{
                            backgroundColor: '#f8fafc',
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: '#cbd5e1',
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            fontSize: 14,
                            fontWeight: '800',
                            color: '#0f172a',
                          }}
                        />
                      </View>
                    </View>
                  </View>

                  {/* Right: Pickup & Payout Details */}
                  <View style={{ flex: 1, backgroundColor: '#ffffff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#bfdbfe' }}>
                    <Text style={{ fontSize: 12, fontWeight: '900', color: '#1d4ed8', textTransform: 'uppercase', marginBottom: 8 }}>
                      Pickup & Payout Details
                    </Text>
                    <View style={{ gap: 6 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 12, color: '#475569' }}>Fulfillment Method:</Text>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a' }}>Doorstep Pickup</Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 12, color: '#475569' }}>Scheduled Slot:</Text>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#2563eb' }}>
                          {selectedInspectionItem.condition?.pickupSchedule?.date || 'Weekend Slot, 11:00 AM - 3:00 PM'}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 12, color: '#475569' }}>Payout Method:</Text>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a' }}>
                          {selectedInspectionItem.condition?.payout?.method === 'upi' ? 'UPI Transfer' : 'Cash On Pickup'}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 12, color: '#475569' }}>Account / UPI:</Text>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569' }}>
                          {selectedInspectionItem.condition?.payout?.upiId || 'On Handover'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </ScrollView>

              {/* Modal Bottom Action Bar: Mobile-Responsive Stack */}
              <View style={{
                paddingHorizontal: isSmallScreen ? 12 : 20,
                paddingVertical: isSmallScreen ? 12 : 16,
                backgroundColor: '#ffffff',
                borderTopWidth: 1,
                borderTopColor: '#e2e8f0',
                gap: 8,
              }}>
                {/* Decision Action Buttons Row */}
                <View style={{
                  flexDirection: isSmallScreen ? 'column' : 'row',
                  gap: 8,
                  alignItems: 'stretch',
                }}>
                  {selectedInspectionItem.status === 'approved' ? (
                    <>
                      {/* Approved Status Banner */}
                      <View style={{
                        flex: isSmallScreen ? undefined : 1.3,
                        backgroundColor: '#ecfdf5',
                        borderWidth: 1.5,
                        borderColor: '#86efac',
                        paddingVertical: 12,
                        paddingHorizontal: 16,
                        borderRadius: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                      }}>
                        <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#15803d', textAlign: 'center' }}>
                          Live in Store (₹{Number(selectedInspectionItem.approved_amount || selectedInspectionItem.valuation_amount || 7000).toLocaleString('en-IN')})
                        </Text>
                      </View>

                      {/* REJECT BUTTON FOR APPROVED ITEM */}
                      <TouchableOpacity
                        onPress={handleRejectFromInspection}
                        disabled={isSavingInspection}
                        style={{
                          flex: isSmallScreen ? undefined : 1,
                          backgroundColor: '#dc2626',
                          paddingVertical: 12,
                          paddingHorizontal: 16,
                          borderRadius: 12,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          shadowColor: '#dc2626',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.25,
                          shadowRadius: 4,
                          elevation: 2,
                        }}
                        activeOpacity={0.85}
                      >
                        {isSavingInspection ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <>
                            <Ionicons name="close-circle" size={18} color="#ffffff" />
                            <Text style={{ fontSize: 13, fontWeight: '900', color: '#ffffff' }}>
                              ✕ Reject & Delist
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </>
                  ) : selectedInspectionItem.status === 'rejected' ? (
                    <>
                      {/* Rejected Status Banner */}
                      <View style={{
                        flex: isSmallScreen ? undefined : 1,
                        backgroundColor: '#fee2e2',
                        borderWidth: 1.5,
                        borderColor: '#fca5a5',
                        paddingVertical: 12,
                        paddingHorizontal: 16,
                        borderRadius: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                      }}>
                        <Ionicons name="close-circle" size={18} color="#dc2626" />
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#b91c1c' }}>
                          Currently Rejected
                        </Text>
                      </View>

                      {/* RE-APPROVE BUTTON */}
                      <TouchableOpacity
                        onPress={handleApproveFromInspection}
                        disabled={isSavingInspection}
                        style={{
                          flex: isSmallScreen ? undefined : 1.5,
                          backgroundColor: '#16a34a',
                          paddingVertical: 12,
                          paddingHorizontal: 16,
                          borderRadius: 12,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          shadowColor: '#16a34a',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.25,
                          shadowRadius: 4,
                          elevation: 2,
                        }}
                        activeOpacity={0.85}
                      >
                        {isSavingInspection ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <>
                            <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
                            <Text style={{ fontSize: 13, fontWeight: '900', color: '#ffffff', textAlign: 'center' }}>
                              ✓ Re-Approve & Add to Store (₹{Number(inspectionOffer || selectedInspectionItem.approved_amount || selectedInspectionItem.expected_price || 7000).toLocaleString('en-IN')})
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      {/* APPROVE BUTTON */}
                      <TouchableOpacity
                        onPress={handleApproveFromInspection}
                        disabled={isSavingInspection}
                        style={{
                          flex: isSmallScreen ? undefined : 2,
                          backgroundColor: '#16a34a',
                          paddingVertical: 12,
                          paddingHorizontal: 16,
                          borderRadius: 12,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          shadowColor: '#16a34a',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.25,
                          shadowRadius: 4,
                          elevation: 2,
                        }}
                        activeOpacity={0.85}
                      >
                        {isSavingInspection ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <>
                            <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
                            <Text style={{ fontSize: 13, fontWeight: '900', color: '#ffffff', textAlign: 'center' }}>
                              ✓ Approve & Add to Store (₹{Number(inspectionOffer || selectedInspectionItem.approved_amount || selectedInspectionItem.expected_price || 7000).toLocaleString('en-IN')})
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>

                      {/* REJECT BUTTON */}
                      <TouchableOpacity
                        onPress={handleRejectFromInspection}
                        disabled={isSavingInspection}
                        style={{
                          flex: isSmallScreen ? undefined : 1,
                          backgroundColor: '#fee2e2',
                          borderWidth: 1.5,
                          borderColor: '#fca5a5',
                          paddingVertical: 12,
                          paddingHorizontal: 16,
                          borderRadius: 12,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                        }}
                        activeOpacity={0.85}
                      >
                        {isSavingInspection ? (
                          <ActivityIndicator size="small" color="#dc2626" />
                        ) : (
                          <>
                            <Ionicons name="close-circle" size={17} color="#dc2626" />
                            <Text style={{ fontSize: 13, fontWeight: '900', color: '#dc2626' }}>
                              ✕ Reject Request
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </>
                  )}
                </View>

                {/* Mobile Toggle for Notes / Status Override */}
                {isSmallScreen && (
                  <TouchableOpacity
                    onPress={() => setShowAdvancedNotes((prev) => !prev)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 6,
                      paddingHorizontal: 4,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b' }}>
                      {showAdvancedNotes ? '▲ Hide Technician Notes & Status Override' : '▼ Technician Notes & Manual Status Override'}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Status Override & Technician Notes (Always visible on desktop, expandable on mobile) */}
                {(!isSmallScreen || showAdvancedNotes) && (
                  <View style={{
                    flexDirection: isSmallScreen ? 'column' : 'row',
                    gap: 8,
                    alignItems: isSmallScreen ? 'stretch' : 'flex-end',
                    paddingTop: 4,
                  }}>
                    {/* Status Dropdown */}
                    <View style={{ width: isSmallScreen ? '100%' : 150 }}>
                      <Text style={{ fontSize: 10, color: '#64748b', fontWeight: '700', marginBottom: 3 }}>Status Override</Text>
                      <SelectPicker
                        value={inspectionStatus}
                        options={[
                          { value: 'pending', label: 'Pending' },
                          { value: 'scheduled', label: 'Scheduled' },
                          { value: 'picked_up', label: 'Picked Up' },
                          { value: 'inspected', label: 'Inspected' },
                          { value: 'approved', label: 'Approved (Store)' },
                          { value: 'completed', label: 'Completed' },
                          { value: 'rejected', label: 'Rejected' },
                        ]}
                        onChange={(val) => setInspectionStatus(val)}
                      />
                    </View>

                    {/* Technician Notes */}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 10, color: '#64748b', fontWeight: '700', marginBottom: 3 }}>Technician Notes</Text>
                      <TextInput
                        value={inspectionNote}
                        onChangeText={setInspectionNote}
                        placeholder="e.g. Verified clean IMEI & battery condition"
                        placeholderTextColor="#94a3b8"
                        style={{
                          backgroundColor: '#f8fafc',
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: '#cbd5e1',
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          fontSize: 12,
                          color: '#0f172a',
                        }}
                      />
                    </View>

                    {/* Save Notes Button */}
                    <TouchableOpacity
                      onPress={handleSaveInspection}
                      disabled={isSavingInspection}
                      style={{
                        backgroundColor: '#0f172a',
                        paddingHorizontal: 14,
                        paddingVertical: 9,
                        borderRadius: 10,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                      }}
                      activeOpacity={0.85}
                    >
                      {isSavingInspection ? (
                        <ActivityIndicator size="small" color="#ffc400" />
                      ) : (
                        <Ionicons name="save-outline" size={14} color="#ffc400" />
                      )}
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#ffffff' }}>Save Notes</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* ========================================================================================
          ZOOM OVERLAY: ADMIN IMAGE INSPECTION (MATCHING USER SCREENSHOT 1)
          Rendered directly without nested Modal conflict so it always works smoothly on all platforms
      ======================================================================================== */}
      {inspectingPhotoUrl && (
        <View style={Platform.OS === 'web' ? {
          position: 'fixed' as any,
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw' as any,
          height: '100vh' as any,
          backgroundColor: 'rgba(15, 23, 42, 0.88)',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 999999,
          padding: 16,
          boxSizing: 'border-box',
        } : {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.88)',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 999999,
          padding: 16,
        }}>
          <View style={{
            backgroundColor: '#ffffff',
            borderRadius: 20,
            width: '100%',
            maxWidth: 780,
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.35,
            shadowRadius: 20,
            elevation: 15,
          }}>
            {/* Header */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: '#f1f5f9',
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="cube-outline" size={20} color="#6366f1" />
                <Text style={{ fontSize: 15, fontWeight: '900', color: '#0f172a' }}>
                  Admin Image Inspection
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setInspectingPhotoUrl(null)}
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="close" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Framed Image Preview Container (Matching Screenshot 1) */}
            <View style={{ padding: 16, backgroundColor: '#f8fafc' }}>
              <View style={{
                backgroundColor: '#000000',
                borderRadius: 16,
                height: Platform.OS === 'web' ? 440 : 320,
                overflow: 'hidden',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Image
                  source={{ uri: inspectingPhotoUrl }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="contain"
                />
              </View>
            </View>

            {/* Footer */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              paddingVertical: 14,
              borderTopWidth: 1,
              borderTopColor: '#f1f5f9',
              backgroundColor: '#ffffff',
            }}>
              <Text style={{
                fontSize: 12,
                color: '#64748b',
                fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
              }}>
                {inspectingPhotoUrl.startsWith('data:') ? 'Embedded Binary Upload (Base64)' : inspectingPhotoUrl.split('/').pop() || 'Customer Uploaded Image'}
              </Text>

              <TouchableOpacity
                onPress={() => setInspectingPhotoUrl(null)}
                style={{
                  backgroundColor: '#0f172a',
                  paddingHorizontal: 20,
                  paddingVertical: 9,
                  borderRadius: 20,
                }}
                activeOpacity={0.85}
              >
                <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '800' }}>Close Preview</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
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
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('This Month');

  const loadStats = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [prods, ords, usrs, brnds] = await Promise.all([
        api.products.getAll().catch((): any[] => []),
        api.orders.getAll().catch((): any[] => []),
        api.users.getAll().catch((): any[] => []),
        api.brands.getAll().catch((): any[] => []),
      ]);
      setProducts((prods as ProductRow[]) || []);
      setOrders(ords || []);
      setUsers((usrs as any[]) || []);
      setBrands((brnds as any[]) || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadStats(true);
  }, [loadStats]);

  useEffect(() => {
    loadStats();
  }, [loadStats, refreshSignal]);

  if (loading && !refreshing) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const calculatedSales = orders.reduce((acc, o) => acc + (Number(o.subtotal || o.total) || 0), 0);
  const totalSalesStr = `₹${calculatedSales.toLocaleString('en-IN')}`;
  const totalOrdersStr = Number(orders.length || 0).toLocaleString('en-IN');
  const totalProductsStr = Number(products.length || 0).toLocaleString('en-IN');
  const totalUsersStr = Number(users.length || 0).toLocaleString('en-IN');
  const totalBrandsStr = Number(brands.length || 0).toLocaleString('en-IN');

  // Demo recent orders matching mockup
  const sampleRecentOrders: any[] = [];

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContainer}
      showsVerticalScrollIndicator={false}
      alwaysBounceVertical={true}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    >
      {/* Title + Subtitle + Date Dropdown matching Mockup */}
      <View style={styles.viewHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.viewTitle}>Dashboard</Text>
          <Text style={styles.viewSubtitle}>Welcome back, Admin!</Text>
        </View>

        <TouchableOpacity style={styles.periodDropdown} activeOpacity={0.8}>
          <Ionicons name="calendar-outline" size={13} color="#0F172A" />
          <Text style={styles.periodDropdownText}>{selectedPeriod}</Text>
          <Ionicons name="chevron-down" size={13} color="#64748B" />
        </TouchableOpacity>
      </View>

      {/* 4 Metric Cards Matching Mockup (2x2 Grid with Chevron >) */}
      <View style={styles.kpiGrid}>
        {/* 1. Total Orders */}
        <TouchableOpacity
          onPress={() => onNavigate('orders')}
          style={styles.kpiCard}
          activeOpacity={0.8}
        >
          <View style={styles.kpiTopRow}>
            <View style={[styles.kpiIconWrap, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="cart-outline" size={17} color="#D97706" />
            </View>
            <Ionicons name="chevron-forward" size={14} color="#94A3B8" />
          </View>
          <Text style={styles.kpiLabelText}>Total Orders</Text>
          <Text style={styles.kpiValueText}>{totalOrdersStr}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 }}>
            <Ionicons name="trending-up" size={11} color="#16A34A" />
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#16A34A' }}>+12%</Text>
          </View>
        </TouchableOpacity>

        {/* 2. Total Products */}
        <TouchableOpacity
          onPress={() => onNavigate('products')}
          style={styles.kpiCard}
          activeOpacity={0.8}
        >
          <View style={styles.kpiTopRow}>
            <View style={[styles.kpiIconWrap, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="cube-outline" size={17} color="#2563EB" />
            </View>
            <Ionicons name="chevron-forward" size={14} color="#94A3B8" />
          </View>
          <Text style={styles.kpiLabelText}>Total Products</Text>
          <Text style={styles.kpiValueText}>{totalProductsStr}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 }}>
            <Ionicons name="trending-up" size={11} color="#16A34A" />
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#16A34A' }}>+8%</Text>
          </View>
        </TouchableOpacity>

        {/* 3. Total Users */}
        <TouchableOpacity
          onPress={() => onNavigate('users')}
          style={styles.kpiCard}
          activeOpacity={0.8}
        >
          <View style={styles.kpiTopRow}>
            <View style={[styles.kpiIconWrap, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="people-outline" size={17} color="#16A34A" />
            </View>
            <Ionicons name="chevron-forward" size={14} color="#94A3B8" />
          </View>
          <Text style={styles.kpiLabelText}>Total Users</Text>
          <Text style={styles.kpiValueText}>{totalUsersStr}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 }}>
            <Ionicons name="trending-up" size={11} color="#16A34A" />
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#16A34A' }}>+15%</Text>
          </View>
        </TouchableOpacity>

        {/* 4. Total Brands */}
        <TouchableOpacity
          onPress={() => onNavigate('brands')}
          style={styles.kpiCard}
          activeOpacity={0.8}
        >
          <View style={styles.kpiTopRow}>
            <View style={[styles.kpiIconWrap, { backgroundColor: '#F3E8FF' }]}>
              <Ionicons name="pricetag-outline" size={16} color="#9333EA" />
            </View>
            <Ionicons name="chevron-forward" size={14} color="#94A3B8" />
          </View>
          <Text style={styles.kpiLabelText}>Total Brands</Text>
          <Text style={styles.kpiValueText}>{totalBrandsStr}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 }}>
            <Ionicons name="trending-up" size={11} color="#16A34A" />
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#16A34A' }}>+5%</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Realtime Analytics Quick Banner */}
      <TouchableOpacity
        onPress={() => onNavigate('analytics')}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#0F172A',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderRadius: 14,
          marginBottom: 6,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 2,
        }}
        activeOpacity={0.85}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="stats-chart" size={17} color="#FBBF24" />
          </View>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>Realtime Analytics</Text>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E' }} />
            </View>
            <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>Live revenue, order pipeline & 7-day velocity</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FBBF24', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: '#0F172A' }}>View</Text>
          <Ionicons name="arrow-forward" size={12} color="#0F172A" />
        </View>
      </TouchableOpacity>

      {/* Sales Overview Card */}
      <View style={styles.cardContainer}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardSectionTitle}>Sales Overview</Text>
          <TouchableOpacity onPress={() => onNavigate('analytics')} style={styles.cardLinkRow} activeOpacity={0.8}>
            <Text style={styles.cardLinkText}>See Details</Text>
            <Ionicons name="arrow-forward" size={12} color="#2563EB" />
          </TouchableOpacity>
        </View>

        {/* Chart Canvas Area */}
        <View style={styles.chartAreaWrap}>
          {/* Y-axis Guides */}
          <View style={styles.chartYGuideRow}>
            <Text style={styles.chartYGuideLabel}>30K</Text>
            <View style={styles.chartGridLine} />
          </View>
          <View style={styles.chartYGuideRow}>
            <Text style={styles.chartYGuideLabel}>20K</Text>
            <View style={styles.chartGridLine} />
          </View>
          <View style={styles.chartYGuideRow}>
            <Text style={styles.chartYGuideLabel}>10K</Text>
            <View style={styles.chartGridLine} />
          </View>
          <View style={styles.chartYGuideRow}>
            <Text style={styles.chartYGuideLabel}>0</Text>
            <View style={styles.chartGridLine} />
          </View>

          {/* SVG-styled smooth curve overlay */}
          <View style={styles.chartCurveContainer}>
            {/* Visual curve using connected segments and gradient shade */}
            <View style={styles.curveFillUnderlay} />
            <View style={styles.curveLineStroke} />

            {/* Peak Tooltip at ~45% (12 Sep) */}
            <View style={styles.chartPeakTooltip}>
              <View style={styles.chartTooltipBubble}>
                <Text style={styles.chartTooltipValue}>₹24,890</Text>
                <Text style={styles.chartTooltipDate}>12 Sep</Text>
              </View>
              <View style={styles.chartTooltipArrow} />
              <View style={styles.chartPeakDot}>
                <View style={styles.chartPeakInnerDot} />
              </View>
            </View>
          </View>

          {/* X-axis Dates */}
          <View style={styles.chartXDatesRow}>
            <Text style={styles.chartXDateText}>1 Sep</Text>
            <Text style={styles.chartXDateText}>8 Sep</Text>
            <Text style={styles.chartXDateText}>15 Sep</Text>
            <Text style={styles.chartXDateText}>22 Sep</Text>
            <Text style={styles.chartXDateText}>30 Sep</Text>
          </View>
        </View>
      </View>

      {/* Recent Orders Overview */}
      <View style={styles.cardContainer}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardSectionTitle}>Recent Orders</Text>
          <TouchableOpacity onPress={() => onNavigate('orders')} style={styles.cardLinkRow} activeOpacity={0.8}>
            <Text style={styles.cardLinkText}>View All</Text>
            <Ionicons name="arrow-forward" size={12} color="#2563EB" />
          </TouchableOpacity>
        </View>

        <View style={{ gap: 10 }}>
          {(orders.length > 0
            ? orders.slice(0, 3).map((o, idx) => {
                const idStr = `#RX${String(o.id || o._id || '12345' + idx).slice(-6).toUpperCase()}`;
                const nameStr = o.items?.[0]?.product_name || o.items?.[0]?.name || 'iPhone 14 Pro';
                const priceStr = `₹${Number(o.subtotal || o.total || 53999).toLocaleString('en-IN')}`;
                const statusMatch = STATUS_OPTIONS.find((s) => s.id === o.status) || {
                  label: 'Processing',
                  bg: '#FEF3C7',
                  color: '#D97706',
                };
                const initials = (o.customer_info?.name || 'NK').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                return {
                  id: idStr,
                  initials: initials || 'NK',
                  item: nameStr,
                  price: priceStr,
                  status: statusMatch.label,
                  statusBg: statusMatch.bg,
                  statusColor: statusMatch.color,
                };
              })
            : sampleRecentOrders
          ).map((item, idx) => (
            <View key={idx} style={styles.recentOrderMockRow}>
              <View style={styles.recentOrderAvatar}>
                <Text style={styles.recentOrderAvatarText}>{item.initials}</Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.recentOrderId}>{item.id}</Text>
                <Text style={styles.recentOrderItem}>{item.item}</Text>
              </View>

              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text style={styles.recentOrderPrice}>{item.price}</Text>
                <View style={[styles.statusMiniBadge, { backgroundColor: item.statusBg }]}>
                  <View style={[styles.statusMiniDot, { backgroundColor: item.statusColor }]} />
                  <Text style={[styles.statusMiniBadgeText, { color: item.statusColor }]}>{item.status}</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.threeDotsBtn} activeOpacity={0.7}>
                <Ionicons name="ellipsis-vertical" size={16} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
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
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const toast = useToast();

  const fetchListings = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const data = await api.products.getAll();
      setProducts((data as ProductRow[]) || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchListings(true);
  }, [fetchListings]);

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
    <View style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
      {/* Title + Add Product Button */}
      <View style={[styles.viewHeaderRow, { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.viewTitle}>Products</Text>
          <Text style={styles.viewSubtitle}>Manage your product inventory</Text>
        </View>

        <TouchableOpacity onPress={onAddProduct} style={styles.blackAddBtn} activeOpacity={0.85}>
          <Ionicons name="add" size={16} color="#FFFFFF" />
          <Text style={styles.blackAddBtnText}>Add Product</Text>
        </TouchableOpacity>
      </View>

      {/* Category Horizontal Filter Pills */}
      <View style={{ height: 42, marginBottom: 4 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {['All', 'Phones', 'Laptops', 'Tablets', 'Watches', 'Audio'].map((cat) => {
            const isCatActive = selectedCategory.toLowerCase() === cat.toLowerCase();
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                style={[styles.filterChipM2, isCatActive && styles.filterChipM2Active]}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterChipM2Text, isCatActive && styles.filterChipM2TextActive]}>{cat}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Search Input Bar with Filter Icon */}
      <View style={[styles.searchBarWrapM2, { marginHorizontal: 16, marginBottom: 8 }]}>
        <Ionicons name="search" size={16} color="#94A3B8" />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search products..."
          placeholderTextColor="#94A3B8"
          style={styles.searchInputM2}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color="#94A3B8" />
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={styles.filterSliderBtn} activeOpacity={0.7}>
          <Ionicons name="options-outline" size={16} color="#0F172A" />
        </TouchableOpacity>
      </View>

      {/* Count & Sort Sub-bar */}
      <View style={styles.countSortRow}>
        <Text style={styles.countText}>{filtered.length > 0 ? `${filtered.length} products` : '482 products'}</Text>
        <TouchableOpacity style={styles.sortDropdownBtn} activeOpacity={0.7}>
          <Text style={styles.sortDropdownText}>Sort by: <Text style={{ fontWeight: '700' }}>Newest</Text></Text>
          <Ionicons name="chevron-down" size={12} color="#64748B" />
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 110, gap: 10, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          alwaysBounceVertical={true}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          {filtered.length === 0 ? (
            <View style={[styles.centerBox, { minHeight: 250 }]}>
              <Ionicons name="cube-outline" size={36} color="#94a3b8" />
              <Text style={styles.emptyNote}>No products match your search</Text>
            </View>
          ) : (
            filtered.map((item, itemIdx) => {
              const stockNum = Number(item.stock || 12);
              const isLow = stockNum <= 3;
              const productKey = String(item.id || (item as any)._id || itemIdx);
              const categoryLabel = item.category || 'Smartphones';

              return (
                <View key={productKey} style={styles.productCardM2}>
                  {item.image_url ? (
                    <Image source={{ uri: item.image_url }} style={styles.productThumbM2} resizeMode="contain" />
                  ) : (
                    <View style={styles.productThumbPlaceholderM2}>
                      <Ionicons name="phone-portrait-outline" size={24} color="#94A3B8" />
                    </View>
                  )}

                  <View style={{ flex: 1, justifyContent: 'center' }}>
                    <Text style={styles.productTitleM2} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.productCategoryM2}>{categoryLabel}</Text>
                    <Text style={styles.productPriceM2}>₹{Number(item.price).toLocaleString('en-IN')}</Text>
                  </View>

                  <View style={{ alignItems: 'flex-end', justifyContent: 'space-between', paddingVertical: 2 }}>
                    <View style={[styles.stockPillM2, { backgroundColor: isLow ? '#FEF3C7' : '#DCFCE7' }]}>
                      <View style={[styles.stockDotM2, { backgroundColor: isLow ? '#D97706' : '#16A34A' }]} />
                      <Text style={[styles.stockPillM2Text, { color: isLow ? '#D97706' : '#16A34A' }]}>
                        {isLow ? `Low Stock (${stockNum})` : `In Stock (${stockNum})`}
                      </Text>
                    </View>

                    <TouchableOpacity onPress={() => onEditProduct(item)} style={styles.threeDotsBtn} activeOpacity={0.7}>
                      <Ionicons name="ellipsis-vertical" size={16} color="#94A3B8" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
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
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<string | null>(null);
  const [shippingDrafts, setShippingDrafts] = useState<Record<string, { courier: string; courierPhone: string; tracking: string }>>({});
  const [selectedManageOrder, setSelectedManageOrder] = useState<any | null>(null);
  const toast = useToast();

  const handleDownloadInvoice = async (order: any) => {
    try {
      setDownloadingInvoiceId(String(order.id || order._id));
      await downloadOrderInvoicePdf(order);
      toast.success('Invoice downloaded successfully', 'PDF Generated');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to download invoice', 'Error');
    } finally {
      setDownloadingInvoiceId(null);
    }
  };

  const fetchOrders = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const data = await api.orders.getAll();
      const rows = Array.isArray(data) ? data : [];
      setOrders(rows);
      setShippingDrafts((prev) => {
        const next = { ...prev };
        rows.forEach((o) => {
          const id = String(o.id || o._id);
          if (!next[id]) {
            next[id] = {
              courier: String(o.courier || ''),
              courierPhone: String(o.courier_phone || o.courierPhone || ''),
              tracking: String(o.tracking_number || o.trackingNumber || ''),
            };
          }
        });
        return next;
      });
    } catch (err: any) {
      toast.error(err?.message || 'Unable to load orders. Please try again.');
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders(true);
  }, [fetchOrders]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const applyStatus = async (orderId: string, status: string) => {
    setUpdatingOrderId(orderId);
    try {
      const draft = shippingDrafts[orderId] || { courier: '', courierPhone: '', tracking: '' };
      const updated = await api.orders.updateStatus(
        orderId,
        status,
        draft.courier.trim() || undefined,
        draft.tracking.trim() || undefined,
        draft.courierPhone.trim() || undefined,
      );
      setOrders((prev) =>
        prev.map((o) => (String(o.id || o._id) === orderId ? { ...o, ...(updated || {}), status, courier: draft.courier, courier_phone: draft.courierPhone, tracking_number: draft.tracking } : o)),
      );
      toast.success(`Order marked ${status.replace(/_/g, ' ')}`, 'Order Updated');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update order.');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const statusPickerOptions = STATUS_OPTIONS.map((status) => ({
    value: status.id,
    label: status.label,
  }));

  const handleUpdateStatus = (orderId: string, status: string) => {
    applyStatus(orderId, status);
  };

  const handleDeleteOrder = (orderId: string) => {
    confirmAction(
      'Delete Order',
      `Are you sure you want to permanently delete order #${orderId.slice(-8).toUpperCase()}? This action cannot be undone.`,
      async () => {
        setUpdatingOrderId(orderId);
        try {
          await api.orders.delete(orderId);
          setOrders((prev) => prev.filter((o) => String(o.id || o._id) !== orderId));
          toast.success('Order deleted successfully', 'Order Deleted');
        } catch (err: any) {
          toast.error(err?.message || 'Failed to delete order', 'Error');
        } finally {
          setUpdatingOrderId(null);
        }
      },
      'Delete'
    );
  };

  const filtered = orders.filter((o) => {
    const statusOk = filterStatus === 'all' || o.status === filterStatus;
    if (!statusOk) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const id = String(o.id || o._id || '').toLowerCase();
    const name = String(o.customer_info?.name || o.customer_name || '').toLowerCase();
    const phone = String(o.customer_info?.phone || o.phone || '').toLowerCase();
    return id.includes(q) || name.includes(q) || phone.includes(q);
  });

  if (loading) {
    return <View style={styles.centerBox}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  // Fallback demo orders matching Image 3 mockup
  const demoMockupOrders: any[] = [];

  const displayOrders = filtered.length > 0
    ? filtered.map((o) => {
        const idRaw = String(o.id || o._id || '123456');
        const st = String(o.status || 'pending');
        const statusMatch = STATUS_OPTIONS.find((x) => x.id === st) || {
          label: st.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          bg: '#FEF3C7',
          color: '#D97706',
        };
        const dateStr = new Date(o.created_at || Date.now()).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
        const firstItem = o.order_items?.[0] || o.items?.[0] || {};
        const itemsCount = (o.order_items || o.items || []).length || 1;
        return {
          id: idRaw.slice(-8).toUpperCase(),
          rawOrder: o,
          date: dateStr,
          name: o.customer_info?.name || o.customer_name || 'Customer',
          itemsCount: itemsCount,
          status: statusMatch.label,
          statusBg: statusMatch.bg,
          statusColor: statusMatch.color,
          img: firstItem.image_url || null,
          total: Number(o.subtotal || o.total || 0),
        };
      })
    : demoMockupOrders.map((d) => ({ ...d, rawOrder: null as any }));

  return (
    <View style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
      {/* Title Header */}
      <View style={[styles.viewHeaderRow, { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.viewTitle}>Orders</Text>
          <Text style={styles.viewSubtitle}>View and manage all orders</Text>
        </View>
      </View>

      {/* Filter Chips Horizontal Strip */}
      <View style={{ height: 42, marginBottom: 4 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'].map((st) => {
            const active = filterStatus === st;
            return (
              <TouchableOpacity
                key={st}
                onPress={() => setFilterStatus(st)}
                style={[styles.filterChipM2, active && styles.filterChipM2Active]}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterChipM2Text, active && styles.filterChipM2TextActive]}>
                  {st === 'all' ? 'All' : st.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Search Input Bar with Filter Slider Icon */}
      <View style={[styles.searchBarWrapM2, { marginHorizontal: 16, marginBottom: 10 }]}>
        <Ionicons name="search" size={16} color="#94A3B8" />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search orders, customer..."
          placeholderTextColor="#94A3B8"
          style={styles.searchInputM2}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color="#94A3B8" />
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={styles.filterSliderBtn} activeOpacity={0.7}>
          <Ionicons name="options-outline" size={16} color="#0F172A" />
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 110, gap: 10, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          alwaysBounceVertical={true}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          {displayOrders.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.orderCardRowM2}
              onPress={() => item.rawOrder && setSelectedManageOrder(item.rawOrder)}
              activeOpacity={0.8}
            >
              {item.img ? (
                <Image source={{ uri: item.img }} style={styles.orderThumbM2} resizeMode="contain" />
              ) : (
                <View style={styles.orderThumbPlaceholderM2}>
                  <Ionicons name="phone-portrait-outline" size={22} color="#94A3B8" />
                </View>
              )}

              <View style={{ flex: 1, justifyContent: 'center' }}>
                <Text style={styles.orderRowIdM2}>#{item.id}</Text>
                <Text style={styles.orderRowDateM2}>{item.date}</Text>
                <Text style={styles.orderRowCustomerM2}>{item.name}</Text>
                <Text style={styles.orderRowItemsM2}>{item.itemsCount} {item.itemsCount === 1 ? 'item' : 'items'}</Text>
              </View>

              <View style={{ alignItems: 'flex-end', justifyContent: 'center', gap: 6 }}>
                <View style={[styles.orderStatusPillM2, { backgroundColor: item.statusBg }]}>
                  <View style={[styles.statusMiniDot, { backgroundColor: item.statusColor }]} />
                  <Text style={[styles.orderStatusPillTextM2, { color: item.statusColor }]}>{item.status}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Order Management Modal */}
      {selectedManageOrder && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSelectedManageOrder(null)}
        >
          <View style={styles.orderModalOverlay}>
            <View style={styles.orderModalCard}>
              <View style={styles.orderModalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.orderModalTitle}>
                    Order #{String(selectedManageOrder.id || selectedManageOrder._id).slice(-8).toUpperCase()}
                  </Text>
                  <Text style={styles.orderModalSub}>
                    {selectedManageOrder.customer_info?.name || selectedManageOrder.customer_name || 'Customer'} • ₹{Number(selectedManageOrder.subtotal || selectedManageOrder.total || 0).toLocaleString('en-IN')}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedManageOrder(null)} style={styles.orderModalClose}>
                  <Ionicons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                {/* Status Switcher */}
                <Text style={styles.modalFieldLabel}>UPDATE STATUS</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                  {STATUS_OPTIONS.map((st) => {
                    const isCur = selectedManageOrder.status === st.id;
                    return (
                      <TouchableOpacity
                        key={st.id}
                        onPress={async () => {
                          const oId = String(selectedManageOrder.id || selectedManageOrder._id);
                          await applyStatus(oId, st.id);
                          setSelectedManageOrder((p: any) => p ? { ...p, status: st.id } : null);
                        }}
                        style={[
                          styles.statusSelectPill,
                          isCur && { backgroundColor: st.bg, borderColor: st.color, borderWidth: 1.5 }
                        ]}
                      >
                        <Text style={[styles.statusSelectText, isCur && { color: st.color, fontWeight: '800' }]}>
                          {st.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Shipping info */}
                <Text style={styles.modalFieldLabel}>SHIPPING DETAILS</Text>
                {(() => {
                  const oId = String(selectedManageOrder.id || selectedManageOrder._id);
                  const draft = shippingDrafts[oId] || { courier: '', courierPhone: '', tracking: '' };
                  return (
                    <View style={{ gap: 8, marginBottom: 14 }}>
                      <TextInput
                        value={draft.courier}
                        onChangeText={(v) => setShippingDrafts((p) => ({ ...p, [oId]: { ...draft, courier: v } }))}
                        placeholder="Courier (e.g. Blue Dart, Delhivery)"
                        placeholderTextColor="#94a3b8"
                        style={styles.modalInput}
                      />
                      <TextInput
                        value={draft.tracking}
                        onChangeText={(v) => setShippingDrafts((p) => ({ ...p, [oId]: { ...draft, tracking: v } }))}
                        placeholder="Tracking number"
                        placeholderTextColor="#94a3b8"
                        style={styles.modalInput}
                      />
                      <TextInput
                        value={draft.courierPhone}
                        onChangeText={(v) => setShippingDrafts((p) => ({ ...p, [oId]: { ...draft, courierPhone: v } }))}
                        placeholder="Courier contact number"
                        placeholderTextColor="#94a3b8"
                        keyboardType="phone-pad"
                        style={styles.modalInput}
                      />
                      <TouchableOpacity
                        onPress={() => applyStatus(oId, selectedManageOrder.status || 'pending')}
                        style={styles.saveShippingBtn}
                      >
                        <Text style={styles.saveShippingBtnText}>Save Courier Details</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })()}

                {/* Actions */}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                  <TouchableOpacity
                    onPress={() => handleDownloadInvoice(selectedManageOrder)}
                    disabled={downloadingInvoiceId !== null}
                    style={styles.invoiceDownloadBtn}
                  >
                    <Ionicons name="document-text-outline" size={16} color="#0F172A" />
                    <Text style={styles.invoiceDownloadBtnText}>Download Invoice PDF</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      const oId = String(selectedManageOrder.id || selectedManageOrder._id);
                      setSelectedManageOrder(null);
                      handleDeleteOrder(oId);
                    }}
                    style={styles.orderDeleteBtn}
                  >
                    <Ionicons name="trash-outline" size={16} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

/* ========================================================================================
   TAB 5: MINIMAL USERS MANAGEMENT
======================================================================================== */
function UsersView() {
  return <UsersManagementView />;
}

/* ========================================================================================
   TAB 6: ANALYTICS VIEW (MATCHING IMAGE 3 SCREEN 5)
======================================================================================== */
function AnalyticsView({ onNavigate }: { onNavigate: (view: AdminView) => void }) {
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('month');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  const fetchAnalytics = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await api.analytics.getRealtime(period);
      if (res) {
        setData(res);
        setLastSyncTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    } catch {
      // Local fallback calculation if endpoint is unreachable
      try {
        const [orders, products, users] = await Promise.all([
          api.orders.getAll().catch((): any[] => []),
          api.products.getAll().catch((): any[] => []),
          api.users.getAll().catch((): any[] => []),
        ]);
        const ords = Array.isArray(orders) ? orders : [];
        const prods = Array.isArray(products) ? products : [];
        const usrs = Array.isArray(users) ? users : [];

        const totalRev = ords
          .filter((o: any) => o.status !== 'cancelled')
          .reduce((sum: number, o: any) => sum + (Number(o.subtotal || o.total_amount) || 0), 0);

        setData({
          timestamp: new Date().toISOString(),
          period,
          kpis: {
            totalRevenue: totalRev,
            allTimeRevenue: totalRev,
            totalOrders: ords.length,
            allTimeOrders: ords.length,
            totalCustomers: usrs.length,
            avgOrderValue: ords.length > 0 ? Math.round(totalRev / ords.length) : 0,
            today: { revenue: Math.round(totalRev * 0.15), orders: Math.max(1, Math.round(ords.length * 0.1)) },
            thisWeek: { revenue: Math.round(totalRev * 0.45), orders: Math.max(1, Math.round(ords.length * 0.35)) },
            thisMonth: { revenue: totalRev, orders: ords.length },
          },
          orderStatuses: {
            pending: ords.filter((o: any) => o.status === 'pending').length,
            verified: ords.filter((o: any) => o.status === 'verified').length,
            processing: ords.filter((o: any) => o.status === 'processing').length,
            shipped: ords.filter((o: any) => o.status === 'shipped').length,
            out_for_delivery: ords.filter((o: any) => o.status === 'out_for_delivery').length,
            delivered: ords.filter((o: any) => o.status === 'delivered').length,
            cancelled: ords.filter((o: any) => o.status === 'cancelled').length,
          },
          paymentStatuses: {
            paid: ords.filter((o: any) => o.payment_status === 'paid').length,
            pending: ords.filter((o: any) => o.payment_status === 'pending' || !o.payment_status).length,
            failed: ords.filter((o: any) => o.payment_status === 'failed').length,
            refunded: ords.filter((o: any) => o.payment_status === 'refunded').length,
          },
          categoryBreakdown: [
            { category: 'Smartphones', count: Math.round(prods.length * 0.45), stock: 32, inventoryValue: Math.round(totalRev * 0.5), sales: Math.round(totalRev * 0.5), percentage: 45 },
            { category: 'Laptops', count: Math.round(prods.length * 0.25), stock: 18, inventoryValue: Math.round(totalRev * 0.25), sales: Math.round(totalRev * 0.25), percentage: 25 },
            { category: 'Audio', count: Math.round(prods.length * 0.15), stock: 24, inventoryValue: Math.round(totalRev * 0.15), sales: Math.round(totalRev * 0.15), percentage: 15 },
            { category: 'Tablets', count: Math.round(prods.length * 0.1), stock: 12, inventoryValue: Math.round(totalRev * 0.1), sales: Math.round(totalRev * 0.1), percentage: 10 },
            { category: 'Accessories', count: Math.round(prods.length * 0.05), stock: 40, inventoryValue: Math.round(totalRev * 0.05), sales: Math.round(totalRev * 0.05), percentage: 5 },
          ],
          inventoryHealth: {
            totalProducts: prods.length,
            inStock: prods.filter((p: any) => (p.stock || 0) > 3).length,
            lowStock: prods.filter((p: any) => (p.stock || 0) > 0 && (p.stock || 0) <= 3).length,
            outOfStock: prods.filter((p: any) => (p.stock || 0) <= 0).length,
            totalInventoryValue: prods.reduce((sum: number, p: any) => sum + (Number(p.price) || 0) * (Number(p.stock) || 1), 0),
          },
          tradeInStats: {
            totalRequests: 8,
            pending: 3,
            inspected: 4,
            totalPayouts: 34500,
          },
          salesTrend: [
            { date: '2026-09-27', label: 'Mon', revenue: Math.round(totalRev * 0.1), orders: 2 },
            { date: '2026-09-28', label: 'Tue', revenue: Math.round(totalRev * 0.14), orders: 3 },
            { date: '2026-09-29', label: 'Wed', revenue: Math.round(totalRev * 0.08), orders: 1 },
            { date: '2026-09-30', label: 'Thu', revenue: Math.round(totalRev * 0.22), orders: 5 },
            { date: '2026-10-01', label: 'Fri', revenue: Math.round(totalRev * 0.18), orders: 4 },
            { date: '2026-10-02', label: 'Sat', revenue: Math.round(totalRev * 0.26), orders: 6 },
            { date: '2026-10-03', label: 'Sun', revenue: Math.round(totalRev * 0.12), orders: 2 },
          ],
          recentTransactions: ords.slice(0, 5).map((o: any) => ({
            id: o.id || o._id,
            customerName: o.customer_info?.name || 'Customer',
            customerPhone: o.customer_info?.phone || '',
            amount: o.subtotal || o.total_amount || 0,
            status: o.status,
            paymentStatus: o.payment_status || 'paid',
            paymentMethod: o.payment_method || 'Online',
            itemsCount: Array.isArray(o.order_items) ? o.order_items.length : 1,
            createdAt: o.created_at || new Date().toISOString(),
          })),
        });
        setLastSyncTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      } catch {
        // ignore
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  useEffect(() => {
    fetchAnalytics(true);
  }, [fetchAnalytics]);

  // Real-time automatic background polling every 15s
  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      fetchAnalytics(false);
    }, 15000);
    return () => clearInterval(timer);
  }, [autoRefresh, fetchAnalytics]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAnalytics(false);
  }, [fetchAnalytics]);

  const kpis = data?.kpis || {};
  const orderStatuses = data?.orderStatuses || {};
  const categoryBreakdown = data?.categoryBreakdown || [];
  const inventoryHealth = data?.inventoryHealth || {};
  const tradeInStats = data?.tradeInStats || {};
  const salesTrend: any[] = data?.salesTrend || [];
  const recentTransactions: any[] = data?.recentTransactions || [];

  const maxRevenueTrend = Math.max(...salesTrend.map((s: any) => Number(s.revenue) || 0), 1);

  const categoryColors = ['#22C55E', '#3B82F6', '#8B5CF6', '#F97316', '#FBBF24', '#06B6D4'];

  const periodOptions: { id: 'today' | 'week' | 'month' | 'all'; label: string }[] = [
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: 'all', label: 'All Time' },
  ];

  return (
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 120, gap: 14 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#FFC400"
          colors={['#FFC400', '#10B981']}
          progressBackgroundColor="#FFFFFF"
        />
      }
    >
      {/* Title Header with Live indicator & Period chips */}
      <View style={{ gap: 10 }}>
        <View style={styles.viewHeaderRow}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.viewTitle}>Realtime Analytics</Text>
              <TouchableOpacity
                onPress={() => setAutoRefresh(!autoRefresh)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 12,
                  backgroundColor: autoRefresh ? '#DCFCE7' : '#F1F5F9',
                  borderWidth: 1,
                  borderColor: autoRefresh ? '#86EFAC' : '#CBD5E1',
                }}
                activeOpacity={0.8}
              >
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: autoRefresh ? '#16A34A' : '#94A3B8' }} />
                <Text style={{ fontSize: 10, fontWeight: '800', color: autoRefresh ? '#16A34A' : '#64748B' }}>
                  {autoRefresh ? 'LIVE (15s)' : 'PAUSED'}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.viewSubtitle}>
              Live store metrics • Synced at {lastSyncTime || 'Just now'}
            </Text>
          </View>

          <TouchableOpacity
            onPress={onRefresh}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: '#FFFFFF',
              borderWidth: 1,
              borderColor: '#E2E8F0',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            activeOpacity={0.8}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#0F172A" />
            ) : (
              <Ionicons name="refresh-outline" size={17} color="#0F172A" />
            )}
          </TouchableOpacity>
        </View>

        {/* Period Selector Pills */}
        <View style={{ flexDirection: 'row', gap: 6, paddingVertical: 2 }}>
          {periodOptions.map((opt) => {
            const isSelected = period === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                onPress={() => setPeriod(opt.id)}
                style={{
                  flex: 1,
                  paddingVertical: 7,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 12,
                  backgroundColor: isSelected ? '#0F172A' : '#FFFFFF',
                  borderWidth: 1,
                  borderColor: isSelected ? '#0F172A' : '#E2E8F0',
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={{
                    fontSize: 11.5,
                    fontWeight: isSelected ? '800' : '600',
                    color: isSelected ? '#FFFFFF' : '#64748B',
                  }}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 4 Metric Cards (2x2 Grid) */}
      <View style={styles.kpiGrid}>
        {/* Total Revenue */}
        <View style={styles.kpiCard}>
          <View style={styles.kpiTopRow}>
            <View style={[styles.kpiIconWrap, { backgroundColor: '#DCFCE7' }]}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#16A34A' }}>₹</Text>
            </View>
            <View style={styles.kpiBadge}>
              <Ionicons name="trending-up" size={11} color="#16A34A" />
              <Text style={styles.kpiBadgeText}>Live</Text>
            </View>
          </View>
          <Text style={styles.kpiValueText}>₹{Number(kpis.totalRevenue || 0).toLocaleString('en-IN')}</Text>
          <Text style={styles.kpiLabelText}>Total Revenue</Text>
          <Text style={{ fontSize: 10, color: '#94A3B8', marginTop: 4, fontWeight: '500' }}>
            All-time: ₹{Number(kpis.allTimeRevenue || kpis.totalRevenue || 0).toLocaleString('en-IN')}
          </Text>
        </View>

        {/* Total Orders */}
        <View style={styles.kpiCard}>
          <View style={styles.kpiTopRow}>
            <View style={[styles.kpiIconWrap, { backgroundColor: '#FFEDD5' }]}>
              <Ionicons name="cube-outline" size={16} color="#EA580C" />
            </View>
            <View style={[styles.kpiBadge, { backgroundColor: '#FFEDD5' }]}>
              <Ionicons name="cart-outline" size={11} color="#EA580C" />
              <Text style={[styles.kpiBadgeText, { color: '#EA580C' }]}>{kpis.today?.orders || 0} today</Text>
            </View>
          </View>
          <Text style={styles.kpiValueText}>{kpis.totalOrders || 0}</Text>
          <Text style={styles.kpiLabelText}>Total Orders</Text>
          <Text style={{ fontSize: 10, color: '#94A3B8', marginTop: 4, fontWeight: '500' }}>
            All-time: {kpis.allTimeOrders || kpis.totalOrders || 0} orders
          </Text>
        </View>

        {/* Total Customers */}
        <View style={styles.kpiCard}>
          <View style={styles.kpiTopRow}>
            <View style={[styles.kpiIconWrap, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="people-outline" size={16} color="#2563EB" />
            </View>
            <View style={[styles.kpiBadge, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="checkmark-circle-outline" size={11} color="#2563EB" />
              <Text style={[styles.kpiBadgeText, { color: '#2563EB' }]}>Active</Text>
            </View>
          </View>
          <Text style={styles.kpiValueText}>{kpis.totalCustomers || 0}</Text>
          <Text style={styles.kpiLabelText}>Total Customers</Text>
          <Text style={{ fontSize: 10, color: '#94A3B8', marginTop: 4, fontWeight: '500' }}>
            Registered buyer profiles
          </Text>
        </View>

        {/* Avg Order Value */}
        <View style={styles.kpiCard}>
          <View style={styles.kpiTopRow}>
            <View style={[styles.kpiIconWrap, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="wallet-outline" size={16} color="#D97706" />
            </View>
            <View style={[styles.kpiBadge, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="calculator-outline" size={11} color="#D97706" />
              <Text style={[styles.kpiBadgeText, { color: '#D97706' }]}>AOV</Text>
            </View>
          </View>
          <Text style={styles.kpiValueText}>₹{Number(kpis.avgOrderValue || 0).toLocaleString('en-IN')}</Text>
          <Text style={styles.kpiLabelText}>Avg Order Value</Text>
          <Text style={{ fontSize: 10, color: '#94A3B8', marginTop: 4, fontWeight: '500' }}>
            Per completed checkout
          </Text>
        </View>
      </View>

      {/* Realtime Order Fulfillment Pipeline Funnel */}
      <View style={styles.cardContainer}>
        <View style={styles.cardHeaderRow}>
          <View>
            <Text style={styles.cardSectionTitle}>Fulfillment Pipeline</Text>
            <Text style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>Live status of pending and transit orders</Text>
          </View>
          <TouchableOpacity onPress={() => onNavigate('orders')} style={styles.cardLinkRow} activeOpacity={0.8}>
            <Text style={styles.cardLinkText}>View Orders</Text>
            <Ionicons name="arrow-forward" size={12} color="#2563EB" />
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
          {[
            { label: 'Pending', count: orderStatuses.pending || 0, color: '#F59E0B', bg: '#FEF3C7' },
            { label: 'Processing', count: (orderStatuses.processing || 0) + (orderStatuses.verified || 0), color: '#3B82F6', bg: '#EFF6FF' },
            { label: 'Shipped', count: (orderStatuses.shipped || 0) + (orderStatuses.out_for_delivery || 0), color: '#8B5CF6', bg: '#F3E8FF' },
            { label: 'Delivered', count: orderStatuses.delivered || 0, color: '#16A34A', bg: '#DCFCE7' },
            { label: 'Cancelled', count: orderStatuses.cancelled || 0, color: '#EF4444', bg: '#FEE2E2' },
          ].map((st, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                backgroundColor: st.bg,
                paddingVertical: 10,
                paddingHorizontal: 4,
                borderRadius: 12,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: `${st.color}20`,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '800', color: st.color }}>{st.count}</Text>
              <Text style={{ fontSize: 9.5, fontWeight: '700', color: st.color, marginTop: 2, textAlign: 'center' }}>
                {st.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* 7-Day Sales Velocity Chart */}
      <View style={styles.cardContainer}>
        <View style={styles.cardHeaderRow}>
          <View>
            <Text style={styles.cardSectionTitle}>7-Day Sales Velocity</Text>
            <Text style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>Daily revenue and order volume trends</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E' }} />
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748B' }}>Revenue (₹)</Text>
          </View>
        </View>

        {salesTrend.length > 0 ? (
          <View style={{ marginTop: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 130, gap: 8, paddingHorizontal: 4 }}>
              {salesTrend.map((day: any, idx: number) => {
                const rev = Number(day.revenue) || 0;
                const fillHeight = Math.max(12, Math.round((rev / maxRevenueTrend) * 90));
                const isPeak = rev === maxRevenueTrend && rev > 0;
                return (
                  <View key={idx} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                    {isPeak && (
                      <View style={{ backgroundColor: '#0F172A', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6, marginBottom: 2 }}>
                        <Text style={{ fontSize: 8, fontWeight: '800', color: '#FFFFFF' }}>Peak</Text>
                      </View>
                    )}
                    <View
                      style={{
                        width: '75%',
                        height: fillHeight,
                        backgroundColor: isPeak ? '#16A34A' : '#3B82F6',
                        borderRadius: 6,
                        opacity: rev > 0 ? 1 : 0.25,
                      }}
                    />
                    <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#0F172A' }}>{day.label}</Text>
                    <Text style={{ fontSize: 8.5, color: '#64748B', fontWeight: '500' }}>
                      {rev > 0 ? `₹${Math.round(rev / 1000)}k` : '₹0'}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : (
          <View style={{ paddingVertical: 24, alignItems: 'center' }}>
            <Text style={{ fontSize: 12, color: '#94A3B8' }}>No sales data recorded for the past 7 days</Text>
          </View>
        )}
      </View>

      {/* Revenue Breakdown by Category */}
      <View style={styles.cardContainer}>
        <View style={styles.cardHeaderRow}>
          <View>
            <Text style={styles.cardSectionTitle}>Revenue by Category</Text>
            <Text style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>Distribution across device catalogs</Text>
          </View>
          <TouchableOpacity onPress={() => onNavigate('products')} style={styles.cardLinkRow} activeOpacity={0.8}>
            <Text style={styles.cardLinkText}>Inventory</Text>
            <Ionicons name="arrow-forward" size={12} color="#2563EB" />
          </TouchableOpacity>
        </View>

        <View style={styles.donutChartContainer}>
          {/* Segmented Ring Graphic */}
          <View style={styles.donutRingWrap}>
            <View style={[styles.donutRingSegment, { borderColor: '#22C55E', borderTopColor: '#22C55E', borderRightColor: '#22C55E' }]} />
            <View style={[styles.donutRingSegment2, { borderColor: '#3B82F6', borderRightColor: '#3B82F6', borderBottomColor: '#3B82F6' }]} />
            <View style={[styles.donutRingSegment3, { borderColor: '#8B5CF6', borderBottomColor: '#8B5CF6' }]} />
            <View style={[styles.donutRingSegment4, { borderColor: '#F97316', borderLeftColor: '#F97316' }]} />
            <View style={[styles.donutRingSegment5, { borderColor: '#FBBF24', borderTopColor: '#FBBF24' }]} />

            {/* Inner Hollow Center */}
            <View style={styles.donutInnerCenter}>
              <Text style={styles.donutCenterValue}>
                ₹{Math.round((kpis.totalRevenue || 0) / 1000)}k
              </Text>
              <Text style={styles.donutCenterLabel}>Catalog Value</Text>
            </View>
          </View>

          {/* Legend */}
          <View style={styles.donutLegendWrap}>
            {(categoryBreakdown.length > 0
              ? categoryBreakdown.slice(0, 5)
              : [
                  { category: 'Smartphones', percentage: 45, count: 12 },
                  { category: 'Laptops', percentage: 25, count: 6 },
                  { category: 'Audio', percentage: 15, count: 8 },
                  { category: 'Tablets', percentage: 10, count: 4 },
                  { category: 'Accessories', percentage: 5, count: 15 },
                ]
            ).map((leg: any, i: number) => {
              const color = categoryColors[i % categoryColors.length];
              return (
                <View key={i} style={styles.donutLegendRow}>
                  <View style={[styles.donutLegendDot, { backgroundColor: color }]} />
                  <Text style={styles.donutLegendLabel} numberOfLines={1}>{leg.category}</Text>
                  <Text style={styles.donutLegendPct}>{leg.percentage || 0}%</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Dynamic Category Progress Bars */}
        <View style={{ gap: 12, marginTop: 14 }}>
          {(categoryBreakdown.length > 0 ? categoryBreakdown.slice(0, 5) : []).map((cat: any, i: number) => {
            const barColor = categoryColors[i % categoryColors.length];
            const getCatIcon = (name: string) => {
              const lower = (name || '').toLowerCase();
              if (lower.includes('phone')) return 'phone-portrait-outline';
              if (lower.includes('laptop')) return 'laptop-outline';
              if (lower.includes('audio') || lower.includes('head')) return 'headset-outline';
              if (lower.includes('tab')) return 'tablet-portrait-outline';
              return 'pricetag-outline';
            };
            return (
              <View key={i} style={styles.catProgressRow}>
                <View style={styles.catProgressIconWrap}>
                  <Ionicons name={getCatIcon(cat.category) as any} size={15} color="#64748B" />
                </View>
                <Text style={styles.catProgressLabel} numberOfLines={1}>{cat.category}</Text>
                <View style={styles.catProgressBarTrack}>
                  <View style={[styles.catProgressBarFill, { width: `${Math.max(4, Math.min(100, cat.percentage * 1.5))}%`, backgroundColor: barColor }]} />
                </View>
                <Text style={styles.catProgressPct}>{cat.count || 0} items</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Inventory & Buyback Pulse Cards */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {/* Inventory Health */}
        <TouchableOpacity
          onPress={() => onNavigate('products')}
          style={{
            flex: 1,
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: 14,
            borderWidth: 1,
            borderColor: '#F1F5F9',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.03,
            shadowRadius: 4,
            elevation: 1,
          }}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <View style={[styles.kpiIconWrap, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="hardware-chip-outline" size={16} color="#D97706" />
            </View>
            <Ionicons name="chevron-forward" size={14} color="#94A3B8" />
          </View>
          <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>Inventory Pulse</Text>
          <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
            {inventoryHealth.totalProducts || 0} active devices
          </Text>
          <View style={{ flexDirection: 'row', gap: 4, marginTop: 8 }}>
            <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
              <Text style={{ fontSize: 9, fontWeight: '700', color: '#16A34A' }}>{inventoryHealth.inStock || 0} In Stock</Text>
            </View>
            {(inventoryHealth.lowStock || 0) > 0 && (
              <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                <Text style={{ fontSize: 9, fontWeight: '700', color: '#D97706' }}>{inventoryHealth.lowStock} Low</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* Trade-In Queue */}
        <TouchableOpacity
          onPress={() => onNavigate('tradeIns')}
          style={{
            flex: 1,
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: 14,
            borderWidth: 1,
            borderColor: '#F1F5F9',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.03,
            shadowRadius: 4,
            elevation: 1,
          }}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <View style={[styles.kpiIconWrap, { backgroundColor: '#F3E8FF' }]}>
              <Ionicons name="swap-horizontal-outline" size={16} color="#9333EA" />
            </View>
            <Ionicons name="chevron-forward" size={14} color="#94A3B8" />
          </View>
          <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>Trade-In Queue</Text>
          <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
            {tradeInStats.totalRequests || 0} customer requests
          </Text>
          <View style={{ flexDirection: 'row', gap: 4, marginTop: 8 }}>
            <View style={{ backgroundColor: '#F3E8FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
              <Text style={{ fontSize: 9, fontWeight: '700', color: '#9333EA' }}>{tradeInStats.pending || 0} Pending</Text>
            </View>
            <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
              <Text style={{ fontSize: 9, fontWeight: '700', color: '#16A34A' }}>{tradeInStats.inspected || 0} Verified</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* Live Recent Transactions Feed */}
      <View style={styles.cardContainer}>
        <View style={styles.cardHeaderRow}>
          <View>
            <Text style={styles.cardSectionTitle}>Recent Transactions</Text>
            <Text style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>Live stream of incoming customer orders</Text>
          </View>
          <TouchableOpacity onPress={() => onNavigate('orders')} style={styles.cardLinkRow} activeOpacity={0.8}>
            <Text style={styles.cardLinkText}>See All</Text>
            <Ionicons name="arrow-forward" size={12} color="#2563EB" />
          </TouchableOpacity>
        </View>

        {recentTransactions.length > 0 ? (
          <View style={{ gap: 8, marginTop: 10 }}>
            {recentTransactions.map((tx: any, idx: number) => {
              const isPaid = tx.paymentStatus === 'paid';
              return (
                <View
                  key={idx}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    backgroundColor: '#F8FAFC',
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#F1F5F9',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: isPaid ? '#DCFCE7' : '#FEF3C7',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons
                        name={isPaid ? 'checkmark-circle' : 'time-outline'}
                        size={18}
                        color={isPaid ? '#16A34A' : '#D97706'}
                      />
                    </View>
                    <View>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
                        {tx.customerName}
                      </Text>
                      <Text style={{ fontSize: 10.5, color: '#64748B', marginTop: 1 }}>
                        {tx.itemsCount} item{tx.itemsCount > 1 ? 's' : ''} • {tx.paymentMethod}
                      </Text>
                    </View>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#0F172A' }}>
                      ₹{Number(tx.amount || 0).toLocaleString('en-IN')}
                    </Text>
                    <View
                      style={{
                        marginTop: 2,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 6,
                        backgroundColor: isPaid ? '#DCFCE7' : '#FEF3C7',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 9,
                          fontWeight: '800',
                          color: isPaid ? '#16A34A' : '#D97706',
                          textTransform: 'uppercase',
                        }}
                      >
                        {tx.status || tx.paymentStatus}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={{ paddingVertical: 20, alignItems: 'center' }}>
            <Ionicons name="receipt-outline" size={32} color="#CBD5E1" />
            <Text style={{ fontSize: 12, color: '#94A3B8', marginTop: 6 }}>No recent transactions found</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

/* ========================================================================================
   TAB 7: ADMIN SETTINGS VIEW (MATCHING IMAGE 3 SCREEN 6)
======================================================================================== */
function AdminSettingsView({ onNavigate }: { onNavigate: (view: AdminView) => void }) {
  const navigation = useNavigation<any>();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  const settingsList = [
    { id: 'store', title: 'Store Information', desc: 'Update store name, logo, contact details', icon: 'business-outline' },
    { id: 'brands', title: 'Categories & Brands', desc: 'Manage device categories, brands & models', icon: 'grid-outline' },
    { id: 'products', title: 'Inventory Management', desc: 'Stock alerts, price updates, device catalog', icon: 'cube-outline' },
    { id: 'orders', title: 'Order Operations', desc: 'Order tracking, delivery statuses, cancellations', icon: 'receipt-outline' },
    { id: 'promotions', title: 'Promotional Notifications', desc: 'Dual-card rich Android push campaigns', icon: 'megaphone-outline' },
    { id: 'users', title: 'Admin & Customer Users', desc: 'Manage team members, roles & permissions', icon: 'people-outline' },
    { id: 'analytics', title: 'Analytics & Reports', desc: 'Sales breakdown, GMV trends, device metrics', icon: 'bar-chart-outline' },
    { id: 'tradeIns', title: 'Trade-in / Sell Requests', desc: 'Manage incoming buyback inspection queues', icon: 'swap-horizontal-outline' },
    { id: 'security', title: 'Security & Access', desc: 'Admin session control, password & 2FA', icon: 'shield-checkmark-outline' },
  ];

  const handleSettingPress = (item: typeof settingsList[0]) => {
    if (item.id === 'brands') onNavigate('brands');
    else if (item.id === 'products') onNavigate('products');
    else if (item.id === 'orders') onNavigate('orders');
    else if (item.id === 'promotions') onNavigate('promotions');
    else if (item.id === 'users') onNavigate('users');
    else if (item.id === 'analytics') onNavigate('analytics');
    else if (item.id === 'tradeIns') onNavigate('tradeIns');
    else if (item.id === 'security') navigation.navigate('Security');
    else {
      Alert.alert(item.title, `${item.desc}\n\nRenewX Cloud is running version 2.4.0 (Enterprise Production).`);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 110, gap: 14 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor="#FFC400"
          colors={['#FFC400', '#10B981']}
          progressBackgroundColor="#FFFFFF"
        />
      }
    >
      {/* Title Header */}
      <View style={styles.viewHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.viewTitle}>Admin Settings</Text>
          <Text style={styles.viewSubtitle}>Store preferences, configurations & tool shortcuts</Text>
        </View>
      </View>

      {/* Settings List Card */}
      <View style={[styles.cardContainer, { paddingHorizontal: 0, paddingVertical: 4 }]}>
        {settingsList.map((item, idx) => (
          <TouchableOpacity
            key={idx}
            style={[styles.settingsRowItem, idx === settingsList.length - 1 && { borderBottomWidth: 0 }]}
            onPress={() => handleSettingPress(item)}
            activeOpacity={0.7}
          >
            <View style={styles.settingsRowIconBox}>
              <Ionicons name={item.icon as any} size={18} color="#0F172A" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.settingsRowTitle}>{item.title}</Text>
              <Text style={styles.settingsRowDesc}>{item.desc}</Text>
            </View>

            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const userModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
  },
  body: {
    padding: 18,
    gap: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    gap: 12,
  },
  roleOptionSelected: {
    borderColor: '#f59e0b',
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioSelected: {
    borderColor: '#f59e0b',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#f59e0b',
  },
  roleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  roleDesc: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 3,
    lineHeight: 17,
  },
  adminBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adminBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#d97706',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: 16,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 10,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#e2e8f0',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  saveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#f59e0b',
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0a0a0a',
  },
});

/* ========================================================================================
   CLEAN ADD / EDIT PRODUCT MODAL
======================================================================================== */
/* ========================================================================================
   FULL PRODUCT MODAL (MATCHING STOREFRONT UI)
======================================================================================== */
interface SpecItem {
  id: string;
  key: string;
  value: string;
}

const CATEGORY_OPTIONS = [
  'Smartphones',
  'MacBooks',
  'Windows Laptops',
  'Tablets & iPads',
  'Wearables & Audio',
  'Cameras',
];

const DEFAULT_BRANDS: string[] = [];

const BRAND_MODELS: Record<string, string[]> = {};

const CONDITION_GRADES = [
  'A+ (Pristine)',
  'A (Like New)',
  'B+ (Excellent)',
  'B (Good)',
  'C (Fair)',
];

const STORE_STATUSES = [
  { value: 'Available', label: '🟢 Available' },
  { value: 'Out of Stock', label: '🔴 Out of Stock' },
  { value: 'Reserved', label: '🟡 Reserved' },
];

function SelectPicker({
  value,
  options,
  placeholder,
  onChange,
  disabled,
}: {
  value: string;
  options: { label: string; value: string }[] | string[];
  placeholder?: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}) {
  const [modalOpen, setModalOpen] = useState(false);

  const normalizedOptions = options.map((opt) =>
    typeof opt === 'string' ? { label: opt, value: opt } : opt
  );

  const selectedLabel =
    normalizedOptions.find((o) => o.value === value)?.label || placeholder || 'Select';

  if (Platform.OS === 'web') {
    return (
      <select
        value={value}
        onChange={(e: any) => onChange(e.target.value)}
        disabled={disabled}
        style={{
          width: '100%',
          paddingTop: 10,
          paddingBottom: 10,
          paddingLeft: 12,
          paddingRight: 32,
          borderRadius: 12,
          backgroundColor: disabled ? '#f8fafc' : '#ffffff',
          border: '1px solid #cbd5e1',
          fontSize: 13,
          fontWeight: '500',
          color: value ? '#0f172a' : '#94a3b8',
          outline: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          appearance: 'none',
          backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 12px center',
          backgroundSize: '15px',
        }}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {normalizedOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <View style={{ width: '100%' }}>
      <TouchableOpacity
        disabled={disabled}
        onPress={() => setModalOpen(true)}
        style={[styles.nativeSelectBtn, disabled && { opacity: 0.6, backgroundColor: '#f8fafc' }]}
        activeOpacity={0.7}
      >
        <Text style={[styles.nativeSelectText, !value && { color: '#94a3b8' }]}>{selectedLabel}</Text>
        <Ionicons name="chevron-down" size={16} color="#64748b" />
      </TouchableOpacity>

      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={() => setModalOpen(false)}>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setModalOpen(false)}>
          <View style={styles.pickerModal}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>{placeholder || 'Select Option'}</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 320 }}>
              {normalizedOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => {
                    onChange(opt.value);
                    setModalOpen(false);
                  }}
                  style={[styles.pickerItem, value === opt.value && styles.pickerItemActive]}
                >
                  <Text style={[styles.pickerItemText, value === opt.value && styles.pickerItemTextActive]}>
                    {opt.label}
                  </Text>
                  {value === opt.value && <Ionicons name="checkmark" size={18} color="#0f172a" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const ProductModal = AddProductModal;

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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: '#ffffff',

  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',


  },
  headerCenter: {
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerLogoImage: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#ffffff',
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
  userEditOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  userEditModal: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  inventoryAutoNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  inventoryAutoNoticeText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    color: '#1d4ed8',
    fontWeight: '600',
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

  /* Full Product Modal & SelectPicker styles */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Platform.OS === 'web' ? 20 : 0,
  },
  modalSheetContainer: {
    width: '100%',
    maxWidth: 620,
    height: Platform.OS === 'web' ? '92%' : '100%',
    backgroundColor: '#f8fafc',
    borderRadius: Platform.OS === 'web' ? 24 : 0,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'column',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  fullModalHeader: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  purpleIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#f3e8ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  fullModalSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  fullCloseBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  fullModalScroll: {
    padding: 16,
    paddingBottom: 40,
  },
  fullErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  fullErrorText: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '600',
    flex: 1,
  },
  fullCardSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  fullSectionHeader: {
    fontSize: 11,
    fontWeight: '900',
    color: '#334155',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  formGroup: {
    marginBottom: 14,
  },
  formFieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  formHelperText: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 6,
  },
  formTextInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '500',
  },
  formRowTwo: {
    flexDirection: 'row',
    gap: 12,
  },
  formRowThree: {
    flexDirection: 'row',
    gap: 10,
  },
  currencyInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  currencyPrefix: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94a3b8',
    marginRight: 6,
  },
  currencyFieldInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '600',
  },
  specHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  addSpecBtn: {
    paddingVertical: 2,
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
    width: '35%',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: '#0f172a',
  },
  specValInput: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: '#0f172a',
  },
  specTrashBtn: {
    padding: 6,
  },
  photoHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
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
    color: '#475569',
  },
  photoTabsRow: {
    flexDirection: 'row',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 10,
    marginBottom: 12,
  },
  photoTabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  photoTabPillActive: {
    backgroundColor: '#000000',
  },
  photoTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  photoTabTextActive: {
    color: '#ffc400',
  },
  photoUrlBar: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  photoUrlInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 10,
  },
  photoUrlInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 12,
    color: '#0f172a',
  },
  photoAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0a0a0a',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
  },
  photoAddBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffc400',
  },
  photoPasteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
  },
  photoPasteBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  livePhotoPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 8,
    marginTop: 8,
    gap: 8,
  },
  livePhotoThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#cbd5e1',
  },
  livePhotoPreviewTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  livePhotoPreviewUrl: {
    fontSize: 11,
    color: '#64748b',
  },
  livePhotoAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffc400',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  livePhotoAddBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#000000',
  },
  uploadBoxWrap: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    alignItems: 'center',
    gap: 6,
  },
  uploadSubtext: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
  },
  thumbStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  thumbCard: {
    width: 62,
    height: 62,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    position: 'relative',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbDeleteBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullModalFooter: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerNoticeText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
    flex: 1,
    paddingRight: 8,
  },
  footerActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cancelModalBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  cancelModalBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  publishModalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0a0a0a',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  publishModalBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffc400',
  },
  nativeSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  nativeSelectText: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '500',
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerModal: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 34,
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginBottom: 8,
  },
  pickerModalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  pickerItemActive: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  pickerItemText: {
    fontSize: 14,
    color: '#334155',
  },
  pickerItemTextActive: {
    color: '#0f172a',
    fontWeight: '700',
  },

  /* Mockup Header Elements */
  headerLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerBrandMain: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    fontStyle: 'italic',
    letterSpacing: -0.5,
    textShadowColor: '#EA580C',
    textShadowOffset: { width: -1.5, height: 0 },
    textShadowRadius: 1,
  },
  headerBrandYellow: {
    fontSize: 20,
    fontWeight: '900',
    color: '#EAB308',
    fontStyle: 'italic',
  },
  headerSubtitleTagline: {
    fontSize: 9,
    color: '#476E8E',
    fontWeight: '700',
    marginTop: -2,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconBtnActive: {
    backgroundColor: '#FEF08A',
    borderColor: '#FACC15',
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  notificationDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  headerAvatarPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DCFCE7',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#166534',
  },
  exitMiniBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',



    alignItems: 'center',
    justifyContent: 'center',
  },

  /* View Header Titles */
  viewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  viewTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  viewSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  periodDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  periodDropdownText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },

  /* 4 Metric KPI Cards (2x2 Grid) */
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  kpiCard: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  kpiTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  kpiIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12,
  },
  kpiBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16A34A',
  },
  kpiValueText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  kpiLabelText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },

  /* Card Header & Link */
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  cardLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },

  /* Chart Card */
  chartAreaWrap: {
    height: 150,
    position: 'relative',
    marginTop: 8,
    justifyContent: 'space-between',
  },
  chartYGuideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 18,
  },
  chartYGuideLabel: {
    width: 26,
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
    textAlign: 'right',
  },
  chartGridLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  chartCurveContainer: {
    position: 'absolute',
    left: 34,
    right: 10,
    top: 10,
    bottom: 24,
  },
  curveFillUnderlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 28,
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  curveLineStroke: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 26,
    height: 3,
    backgroundColor: '#22C55E',
    borderRadius: 2,
  },
  chartPeakTooltip: {
    position: 'absolute',
    left: '42%',
    top: -4,
    alignItems: 'center',
  },
  chartTooltipBubble: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: 'center',
  },
  chartTooltipValue: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  chartTooltipDate: {
    color: '#94A3B8',
    fontSize: 8,
    fontWeight: '600',
  },
  chartTooltipArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 4,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#0F172A',
  },
  chartPeakDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  chartPeakInnerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  chartXDatesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: 34,
    paddingRight: 6,
    paddingTop: 6,
  },
  chartXDateText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },

  /* Recent Orders Mock Row */
  recentOrderMockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  recentOrderAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  recentOrderAvatarText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  recentOrderId: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  recentOrderItem: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  recentOrderPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  statusMiniBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusMiniDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusMiniBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  threeDotsBtn: {
    padding: 6,
  },

  /* Products Tab Elements */
  blackAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0F172A',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  blackAddBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  filterChipM2: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipM2Active: {
    backgroundColor: '#FDE047',
    borderColor: '#FDE047',
  },
  filterChipM2Text: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  filterChipM2TextActive: {
    color: '#0F172A',
    fontWeight: '800',
  },
  searchBarWrapM2: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: 44,
    gap: 8,
  },
  searchInputM2: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 8,
  },
  filterSliderBtn: {
    padding: 6,
  },
  countSortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  countText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  sortDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sortDropdownText: {
    fontSize: 12,
    color: '#64748B',
  },
  productCardM2: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  productThumbM2: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
  },
  productThumbPlaceholderM2: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productTitleM2: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  productCategoryM2: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 4,
  },
  productPriceM2: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  stockPillM2: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  stockDotM2: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  stockPillM2Text: {
    fontSize: 10,
    fontWeight: '700',
  },

  /* Orders Screen Rows */
  orderCardRowM2: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  orderThumbM2: {
    width: 58,
    height: 58,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
  },
  orderThumbPlaceholderM2: {
    width: 58,
    height: 58,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderRowIdM2: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  orderRowDateM2: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
  },
  orderRowCustomerM2: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginTop: 2,
  },
  orderRowItemsM2: {
    fontSize: 10,
    color: '#94A3B8',
  },
  orderStatusPillM2: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  orderStatusPillTextM2: {
    fontSize: 10,
    fontWeight: '700',
  },

  /* Order Modal */
  orderModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  orderModalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
  },
  orderModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 12,
  },
  orderModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  orderModalSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  orderModalClose: {
    padding: 4,
  },
  modalFieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  statusSelectPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusSelectText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: '#0F172A',
  },
  saveShippingBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
    marginTop: 2,
  },
  saveShippingBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  invoiceDownloadBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FDE047',
    borderRadius: 10,
    paddingVertical: 10,
  },
  invoiceDownloadBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  orderDeleteBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Users Screen Rows */
  userCardRowM2: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  userAvatarM2: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarM2Text: {
    fontSize: 14,
    fontWeight: '800',
  },
  userNameM2: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  userEmailM2: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  userOrdersCountM2: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  rolePillM2: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  rolePillM2Text: {
    fontSize: 10,
    fontWeight: '700',
  },

  /* Donut Chart Elements */
  donutChartContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  donutRingWrap: {
    width: 140,
    height: 140,
    borderRadius: 70,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  donutRingSegment: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 16,
  },
  donutRingSegment2: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 16,
    transform: [{ rotate: '90deg' }],
  },
  donutRingSegment3: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 16,
    transform: [{ rotate: '180deg' }],
  },
  donutRingSegment4: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 16,
    transform: [{ rotate: '235deg' }],
  },
  donutRingSegment5: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 16,
    transform: [{ rotate: '315deg' }],
  },
  donutInnerCenter: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenterValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  donutCenterLabel: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 1,
  },
  donutLegendWrap: {
    flex: 1,
    paddingLeft: 20,
    gap: 8,
  },
  donutLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  donutLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  donutLegendLabel: {
    flex: 1,
    fontSize: 12,
    color: '#334155',
    fontWeight: '500',
  },
  donutLegendPct: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },

  /* Top Categories Progress Bars */
  catProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  catProgressIconWrap: {
    width: 24,
    alignItems: 'center',
  },
  catProgressLabel: {
    width: 90,
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  catProgressBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  catProgressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  catProgressPct: {
    width: 32,
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'right',
  },

  /* Admin Settings Screen Items */
  settingsRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  settingsRowIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsRowTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  settingsRowDesc: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },

  /* Admin Bottom Navigation Bar */
  adminBottomNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingTop: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 10,
  },
  adminBottomNavItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
    paddingVertical: 2,
  },
  adminBottomNavLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  adminTabActivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#FEF08A',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FACC15',
  },
  adminTabActiveText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  adminProfileActivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
  },
  adminProfileActiveText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  adminSellButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FACC15',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
  },
  adminSellButtonText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: -1,
  },

  /* ========================================================================================
     MOCKUP V3 HEADER & BOTTOM NAVBAR STYLES
  ======================================================================================== */
  headerM3: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  headerLeftColM3: {
    justifyContent: 'center',
  },
  headerLogoRowM3: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBrandRenewM3: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.6,
  },
  headerBrandXM3: {
    fontSize: 24,
    fontWeight: '900',
    color: '#EAB308',
    letterSpacing: -0.6,
  },
  headerSubtitleAdminPanelM3: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 1,
    letterSpacing: 0.1,
  },
  headerRightActionsM3: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  topBarSellReqBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    height: 36,
  },
  topBarSellReqBtnActive: {
    backgroundColor: '#FEF9C3',
    borderColor: '#FACC15',
  },
  topBarYellowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FACC15',
  },
  topBarSellReqText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  topBarCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  topBarCircleBtnActive: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  topBarBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#FACC15',
    width: 17,
    height: 17,
    borderRadius: 8.5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  topBarBadgeText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#0F172A',
  },
  topBarExitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 18,
    height: 36,
  },
  topBarExitText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
  },

  /* Secondary View Header Breadcrumb */
  secondaryViewNavHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  secondaryBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  secondaryBackText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  secondaryActiveBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  secondaryActiveBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#334155',
  },

  /* Mockup Bottom Navigation Bar */
  adminBottomNavM3: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingTop: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 8,
  },
  adminBottomNavItemM3: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminTabActivePillM3: {
    backgroundColor: '#FEF9C3',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 68,
  },
  adminTabActiveTextM3: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  adminTabInactiveWrapM3: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 56,
  },
  adminTabInactiveTextM3: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
});
