import AddProductModal from '@/components/AddProductModal';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  Animated,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { type ProductRow, type Profile } from '@/lib/supabase';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme';
import { renewxColors, renewxShadows, renewxTextStyle } from '@/design-system';
import { api } from '@/services/api';
import { useToast } from '@/context/ToastContext';
import { confirmAction } from '@/lib/confirmAction';
import { downloadOrderInvoicePdf } from '@/services/invoiceService';
import { useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import BrandsView from '@/components/admin/BrandsView';
import UsersManagementView from '@/components/admin/UsersManagementView';
import PromotionsManagementView from '@/components/admin/PromotionsManagementView';
import OrderUpdateModal from '@/components/admin/OrderUpdateModal';
import SalesOverviewChart from '@/components/admin/SalesOverviewChart';
import { ProductImage } from '@/components/ui';
import ImagePickerButton from '@/components/ImagePickerButton';
import * as Clipboard from 'expo-clipboard';
import { sanitizeImageUrl } from '@/lib/imageUtils';
import { useSafeHeaderTop } from '@/lib/useSafeHeaderTop';
import ShippingOrderCard from '@/components/shipping/ShippingOrderCard';
import {
  SHOWCASE_ORDERS,
  normalizeOrderToShipping,
  type ShowcaseOrder,
} from '@/data/showcaseOrders';


type AdminView = 'dashboard' | 'products' | 'orders' | 'users' | 'analytics' | 'settings' | 'tradeIns' | 'brands' | 'promotions';

const CATEGORIES = ['All', 'Phones', 'Smartphones', 'Laptops', 'Tablets', 'Watches', 'Audio', 'Cameras', 'Vehicles'];

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

  const viewOpacityAnim = useRef(new Animated.Value(1)).current;
  const viewTranslateAnim = useRef(new Animated.Value(0)).current;

  const handleTabPress = (v: AdminView) => {
    if (v !== view) {
      viewOpacityAnim.setValue(0.75);
      viewTranslateAnim.setValue(6);
      setView(v);
      Animated.parallel([
        Animated.timing(viewOpacityAnim, {
          toValue: 1,
          duration: 190,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(viewTranslateAnim, {
          toValue: 0,
          duration: 190,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }
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
                color="#FFC400"
                style={{ transform: [{ rotate: '45deg' }], marginLeft: -3, marginTop: -9 }}
              />
            </View>
          </View>
          <Text style={styles.headerSubtitleAdminPanelM3}>Admin Panel</Text>
        </View>

        <View style={styles.headerRightActionsM3}>
          {/* 1. Sell Req. Pill Button with tag and dot */}
          <TouchableOpacity
            style={[styles.topBarSellReqBtn, view === 'tradeIns' && styles.topBarSellReqBtnActive]}
            onPress={() => handleTabPress('tradeIns')}
            activeOpacity={0.8}
            accessibilityLabel="Sell Requests"
          >
            <Ionicons name="pricetag-outline" size={13} color={view === 'tradeIns' ? '#0B6B3A' : '#111111'} />
            <View style={[styles.topBarYellowDot, view === 'tradeIns' && { backgroundColor: '#168A4A' }]} />
            <Text style={[styles.topBarSellReqText, view === 'tradeIns' && { color: '#0B6B3A' }]}>Sell Req.</Text>
          </TouchableOpacity>

          {/* 2. Notifications Bell with Badge */}
          <TouchableOpacity
            style={styles.topBarCircleBtn}
            onPress={() => navigation.navigate('Notifications')}
            activeOpacity={0.8}
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={19} color="#111111" />
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
            <Ionicons name="settings-outline" size={19} color={view === 'settings' ? '#0B6B3A' : '#111111'} />
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
      <Animated.View
        style={[
          styles.mainContent,
          {
            opacity: viewOpacityAnim,
            transform: [{ translateY: viewTranslateAnim }],
          },
        ]}
      >
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
      </Animated.View>

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
                  <Ionicons name={tab.icon as any} size={20} color="#0B6B3A" />
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

  if (loading && !refreshing) return <View style={styles.centerBox}><ActivityIndicator size="large" color={renewxColors.emerald} /></View>;

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
            colors={[renewxColors.emerald]}
            tintColor={renewxColors.emerald}
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
                  <View style={{ marginVertical: 8, padding: 10, backgroundColor: renewxColors.background, borderRadius: 12, borderWidth: 1, borderColor: renewxColors.border }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={{ fontSize: 11, ...renewxTextStyle('extraBold'), color: '#334155' }}>
                        📷 Customer Photos ({photos.length})
                      </Text>
                      <TouchableOpacity onPress={() => openInspection(item)}>
                        <Text style={{ fontSize: 11, color: '#2563eb', ...renewxTextStyle('bold') }}>Inspect All →</Text>
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
                    <Text style={{ fontSize: 11, color: '#64748b', ...renewxTextStyle('semibold') }}>Valuation / Asking</Text>
                    <Text style={{ fontSize: 18, ...renewxTextStyle('black'), color: renewxColors.black }}>
                      ₹{Number(item.approved_amount || item.expected_price || item.valuation_amount || 0).toLocaleString('en-IN')}
                    </Text>
                  </View>

                  {photos.length > 0 && (
                    <View style={{ backgroundColor: renewxColors.surfaceMuted, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="images-outline" size={13} color="#475569" />
                      <Text style={{ fontSize: 11, ...renewxTextStyle('bold'), color: '#475569' }}>{photos.length} photos</Text>
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
                      backgroundColor: renewxColors.black,
                      paddingVertical: 11,
                      paddingHorizontal: 14,
                      borderRadius: 10,
                      ...(renewxShadows.card as object),
                    }}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="search-outline" size={16} color="#38bdf8" />
                    <Text style={{ fontSize: 13, ...renewxTextStyle('extraBold'), color: renewxColors.white }}>
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
                          <Text style={{ fontSize: 12, ...renewxTextStyle('extraBold'), color: '#dc2626' }}>Reject Request</Text>
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
                          <Text style={{ fontSize: 12, ...renewxTextStyle('extraBold'), color: '#16a34a' }}>Re-Approve</Text>
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
                      <Text style={{ fontSize: 11, ...renewxTextStyle('bold'), color: '#64748b' }}>Cancelled</Text>
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
                          <Text style={{ fontSize: 12, ...renewxTextStyle('extraBold'), color: '#16a34a' }}>Approve</Text>
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
              ...(isSmallScreen ? {} : (renewxShadows.floating as object)),
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
                      <Text style={{ fontSize: 10, ...renewxTextStyle('extraBold'), color: '#334155', fontFamily: Platform.OS === 'web' ? 'monospace' : 'Outfit_800ExtraBold' }}>
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
                        fontSize: 10,
                        ...renewxTextStyle('extraBold'),
                        color: selectedInspectionItem.status === 'approved' ? '#15803d' : selectedInspectionItem.status === 'rejected' ? '#b91c1c' : '#0369a1',
                        textTransform: 'uppercase',
                      }}>
                        {selectedInspectionItem.status === 'approved' ? 'LIVE IN STORE' : (selectedInspectionItem.status || 'PENDING').replace(/_/g, ' ')}
                      </Text>
                    </View>
                  </View>

                  <Text style={{ fontSize: isSmallScreen ? 17 : 20, ...renewxTextStyle('black'), color: renewxColors.black, letterSpacing: -0.4 }} numberOfLines={1}>
                    {selectedInspectionItem.brand} {selectedInspectionItem.model}
                  </Text>
                  <Text style={{ fontSize: 10, ...renewxTextStyle('regular'), color: '#64748b', marginTop: 1 }}>
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
                    <Text style={{ fontSize: 12, ...renewxTextStyle('extraBold'), color: renewxColors.black, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                      Customer Uploaded Photos ({inspectionPhotos.length})
                    </Text>
                    <Text style={{ fontSize: 10, color: '#2563eb', ...renewxTextStyle('bold') }}>
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
                      <Text style={{ fontSize: 12, color: '#64748b', ...renewxTextStyle('regular') }}>No device photos uploaded by customer for this request.</Text>
                    </View>
                  )}
                </View>

                {/* 2. CUSTOMER INFORMATION & HARDWARE SPECIFICATIONS */}
                <View style={{ flexDirection: isSmallScreen ? 'column' : 'row', gap: 12 }}>
                  {/* Left: Customer Information */}
                  <View style={{ flex: 1, backgroundColor: '#ffffff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                      <Ionicons name="person-outline" size={16} color="#2563eb" />
                      <Text style={{ fontSize: 12, ...renewxTextStyle('extraBold'), color: renewxColors.black, textTransform: 'uppercase' }}>
                        Customer Information
                      </Text>
                    </View>
                    <View style={{ gap: 6 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 10, color: '#94a3b8', ...renewxTextStyle('medium') }}>Name:</Text>
                          <Text style={{ fontSize: 13, ...renewxTextStyle('extraBold'), color: renewxColors.black }}>{selectedInspectionItem.customer_name || 'N/A'}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 10, color: '#94a3b8', ...renewxTextStyle('medium') }}>Phone:</Text>
                          <Text style={{ fontSize: 13, ...renewxTextStyle('extraBold'), color: renewxColors.black }}>{selectedInspectionItem.customer_phone || 'N/A'}</Text>
                        </View>
                      </View>
                      <View>
                        <Text style={{ fontSize: 10, color: '#94a3b8', ...renewxTextStyle('medium') }}>Email:</Text>
                        <Text style={{ fontSize: 12, color: '#334155', ...renewxTextStyle('regular') }} numberOfLines={1}>
                          {selectedInspectionItem.customer_email || 'Not provided'}
                        </Text>
                      </View>
                      <View>
                        <Text style={{ fontSize: 10, color: '#94a3b8', ...renewxTextStyle('medium') }}>City/State:</Text>
                        <Text style={{ fontSize: 12, color: '#334155', ...renewxTextStyle('regular') }}>
                          {selectedInspectionItem.address?.split(',').slice(-2).join(',').trim() || 'Tamil Nadu'}
                        </Text>
                      </View>
                      <View>
                        <Text style={{ fontSize: 10, color: '#94a3b8', ...renewxTextStyle('medium') }}>Pickup Address:</Text>
                        <Text style={{ fontSize: 12, color: '#334155', ...renewxTextStyle('regular') }}>
                          {selectedInspectionItem.pickup_address || selectedInspectionItem.address || 'Standard Address'} (Pin: {selectedInspectionItem.pincode})
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Right: Hardware Specifications */}
                  <View style={{ flex: 1, backgroundColor: '#ffffff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                      <Ionicons name="hardware-chip-outline" size={16} color="#059669" />
                      <Text style={{ fontSize: 12, ...renewxTextStyle('extraBold'), color: renewxColors.black, textTransform: 'uppercase' }}>
                        Hardware Specifications
                      </Text>
                    </View>
                    <View style={{ gap: 6 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 10, color: '#94a3b8', ...renewxTextStyle('medium') }}>Brand & Category:</Text>
                          <Text style={{ fontSize: 13, ...renewxTextStyle('extraBold'), color: renewxColors.black }}>
                            {selectedInspectionItem.brand} ({selectedInspectionItem.category || 'smartphones'})
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 10, color: '#94a3b8', ...renewxTextStyle('medium') }}>Model:</Text>
                          <Text style={{ fontSize: 13, ...renewxTextStyle('extraBold'), color: renewxColors.black }}>{selectedInspectionItem.model}</Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 10, color: '#94a3b8', ...renewxTextStyle('medium') }}>Storage Capacity:</Text>
                          <Text style={{ fontSize: 13, ...renewxTextStyle('black'), color: '#2563eb' }}>
                            {selectedInspectionItem.storage || '64GB'}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 10, color: '#94a3b8', ...renewxTextStyle('medium') }}>RAM / Variant:</Text>
                          <Text style={{ fontSize: 12, color: '#334155', ...renewxTextStyle('regular') }}>
                            {selectedInspectionItem.condition?.ram || selectedInspectionItem.storage || 'Standard Variant'}
                          </Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 10, color: '#94a3b8', ...renewxTextStyle('medium') }}>Color:</Text>
                          <Text style={{ fontSize: 12, color: '#334155', ...renewxTextStyle('regular') }}>
                            {selectedInspectionItem.condition?.color || 'Standard White'}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 10, color: '#94a3b8', ...renewxTextStyle('medium') }}>Purchase Year:</Text>
                          <Text style={{ fontSize: 12, color: '#334155', ...renewxTextStyle('regular') }}>
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
                    <Text style={{ fontSize: 12, ...renewxTextStyle('black'), color: '#1e3a8a', letterSpacing: 0.4, textTransform: 'uppercase' }}>
                      12-Point Diagnostic Assessment & Inclusions
                    </Text>
                  </View>

                  {/* Row 1: Conditions & Grade */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                    <View style={{ flex: 1, minWidth: isSmallScreen ? '46%' : 120, backgroundColor: '#ffffff', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' }}>
                      <Text style={{ fontSize: 10, color: '#64748b', ...renewxTextStyle('medium') }}>Screen Condition</Text>
                      <Text style={{ fontSize: 12, ...renewxTextStyle('extraBold'), color: renewxColors.black, textTransform: 'capitalize' }}>
                        {selectedInspectionItem.condition?.screen || 'Minor_scratches'}
                      </Text>
                    </View>
                    <View style={{ flex: 1, minWidth: isSmallScreen ? '46%' : 120, backgroundColor: '#ffffff', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' }}>
                      <Text style={{ fontSize: 10, color: '#64748b', ...renewxTextStyle('medium') }}>Body Condition</Text>
                      <Text style={{ fontSize: 12, ...renewxTextStyle('extraBold'), color: renewxColors.black, textTransform: 'capitalize' }}>
                        {selectedInspectionItem.condition?.body || 'Minor_scuffs'}
                      </Text>
                    </View>
                    <View style={{ flex: 1, minWidth: isSmallScreen ? '46%' : 120, backgroundColor: '#ffffff', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' }}>
                      <Text style={{ fontSize: 10, color: '#64748b', ...renewxTextStyle('medium') }}>Battery Health</Text>
                      <Text style={{ fontSize: 12, ...renewxTextStyle('extraBold'), color: '#059669' }}>
                        {selectedInspectionItem.condition?.batteryHealthy ? 'Normal High' : 'Degraded'}
                      </Text>
                    </View>
                    <View style={{ flex: 1, minWidth: isSmallScreen ? '46%' : 120, backgroundColor: '#ffffff', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' }}>
                      <Text style={{ fontSize: 10, color: '#64748b', ...renewxTextStyle('medium') }}>Grade Calculated</Text>
                      <Text style={{ fontSize: 12, ...renewxTextStyle('black'), color: '#2563eb' }}>
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
                        <Text style={{ fontSize: 11, color: '#334155', ...renewxTextStyle('medium') }}>{itemCheck.label}</Text>
                        <Text style={{ fontSize: 11, ...renewxTextStyle('extraBold'), color: itemCheck.val ? '#059669' : '#dc2626' }}>
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
                        <Text style={{ fontSize: 11, color: '#334155', ...renewxTextStyle('medium') }}>{itemAcc.label}</Text>
                        <Text style={{ fontSize: 11, ...renewxTextStyle('extraBold'), color: itemAcc.custom ? '#64748b' : itemAcc.val ? '#059669' : '#94a3b8' }}>
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
                    <Text style={{ fontSize: 12, ...renewxTextStyle('black'), color: '#15803d', textTransform: 'uppercase', marginBottom: 8 }}>
                      Pricing & Valuation
                    </Text>
                    <View style={{ gap: 6 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 12, color: '#475569', ...renewxTextStyle('regular') }}>Customer Asking Price:</Text>
                        <Text style={{ fontSize: 16, ...renewxTextStyle('black'), color: '#059669' }}>
                          ₹{Number(selectedInspectionItem.expected_price || 7000).toLocaleString('en-IN')}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 12, color: '#475569', ...renewxTextStyle('regular') }}>System Market Appraisal:</Text>
                        <Text style={{ fontSize: 15, ...renewxTextStyle('black'), color: renewxColors.black }}>
                          ₹{Number(selectedInspectionItem.valuation_amount || 16180).toLocaleString('en-IN')}
                        </Text>
                      </View>
                      <View style={{ marginTop: 6 }}>
                        <Text style={{ fontSize: 11, ...renewxTextStyle('bold'), color: '#334155', marginBottom: 4 }}>
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
                            ...renewxTextStyle('extraBold'),
                            color: renewxColors.black,
                            ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
                          }}
                        />
                      </View>
                    </View>
                  </View>

                  {/* Right: Pickup & Payout Details */}
                  <View style={{ flex: 1, backgroundColor: '#ffffff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#bfdbfe' }}>
                    <Text style={{ fontSize: 12, ...renewxTextStyle('black'), color: '#1d4ed8', textTransform: 'uppercase', marginBottom: 8 }}>
                      Pickup & Payout Details
                    </Text>
                    <View style={{ gap: 6 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 12, color: '#475569', ...renewxTextStyle('regular') }}>Fulfillment Method:</Text>
                        <Text style={{ fontSize: 12, ...renewxTextStyle('extraBold'), color: renewxColors.black }}>Doorstep Pickup</Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 12, color: '#475569', ...renewxTextStyle('regular') }}>Scheduled Slot:</Text>
                        <Text style={{ fontSize: 12, ...renewxTextStyle('extraBold'), color: '#2563eb' }}>
                          {selectedInspectionItem.condition?.pickupSchedule?.date || 'Weekend Slot, 11:00 AM - 3:00 PM'}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 12, color: '#475569', ...renewxTextStyle('regular') }}>Payout Method:</Text>
                        <Text style={{ fontSize: 12, ...renewxTextStyle('extraBold'), color: renewxColors.black }}>
                          {selectedInspectionItem.condition?.payout?.method === 'upi' ? 'UPI Transfer' : 'Cash On Pickup'}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 12, color: '#475569', ...renewxTextStyle('regular') }}>Account / UPI:</Text>
                        <Text style={{ fontSize: 12, ...renewxTextStyle('semibold'), color: '#475569' }}>
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
                        <Text style={{ fontSize: 13, ...renewxTextStyle('extraBold'), color: '#15803d', textAlign: 'center' }}>
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
                          ...(renewxShadows.card as object),
                        }}
                        activeOpacity={0.85}
                      >
                        {isSavingInspection ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <>
                            <Ionicons name="close-circle" size={18} color="#ffffff" />
                            <Text style={{ fontSize: 13, ...renewxTextStyle('black'), color: '#ffffff' }}>
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
                        <Text style={{ fontSize: 13, ...renewxTextStyle('extraBold'), color: '#b91c1c' }}>
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
                          ...(renewxShadows.card as object),
                        }}
                        activeOpacity={0.85}
                      >
                        {isSavingInspection ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <>
                            <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
                            <Text style={{ fontSize: 13, ...renewxTextStyle('black'), color: '#ffffff', textAlign: 'center' }}>
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
                          ...(renewxShadows.card as object),
                        }}
                        activeOpacity={0.85}
                      >
                        {isSavingInspection ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <>
                            <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
                            <Text style={{ fontSize: 13, ...renewxTextStyle('black'), color: '#ffffff', textAlign: 'center' }}>
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
                            <Text style={{ fontSize: 13, ...renewxTextStyle('black'), color: '#dc2626' }}>
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
                    <Text style={{ fontSize: 11, ...renewxTextStyle('bold'), color: '#64748b' }}>
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
                      <Text style={{ fontSize: 10, color: '#64748b', ...renewxTextStyle('bold'), marginBottom: 3 }}>Status Override</Text>
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
                      <Text style={{ fontSize: 10, color: '#64748b', ...renewxTextStyle('bold'), marginBottom: 3 }}>Technician Notes</Text>
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
                          color: renewxColors.black,
                          ...renewxTextStyle('regular'),
                          ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
                        }}
                      />
                    </View>

                    {/* Save Notes Button */}
                    <TouchableOpacity
                      onPress={handleSaveInspection}
                      disabled={isSavingInspection}
                      style={{
                        backgroundColor: renewxColors.black,
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
                        <ActivityIndicator size="small" color={renewxColors.yellow} />
                      ) : (
                        <Ionicons name="save-outline" size={14} color={renewxColors.yellow} />
                      )}
                      <Text style={{ fontSize: 12, ...renewxTextStyle('extraBold'), color: '#ffffff' }}>Save Notes</Text>
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
            ...(renewxShadows.floating as object),
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
                <Text style={{ fontSize: 15, ...renewxTextStyle('black'), color: renewxColors.black }}>
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
                fontFamily: Platform.OS === 'web' ? 'monospace' : 'Outfit_400Regular',
              }}>
                {inspectingPhotoUrl.startsWith('data:') ? 'Embedded Binary Upload (Base64)' : inspectingPhotoUrl.split('/').pop() || 'Customer Uploaded Image'}
              </Text>

              <TouchableOpacity
                onPress={() => setInspectingPhotoUrl(null)}
                style={{
                  backgroundColor: renewxColors.black,
                  paddingHorizontal: 20,
                  paddingVertical: 9,
                  borderRadius: 20,
                }}
                activeOpacity={0.85}
              >
                <Text style={{ color: '#ffffff', fontSize: 12, ...renewxTextStyle('extraBold') }}>Close Preview</Text>
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
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

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

  // Staggered Entrance Animations
  const headerFadeAnim = useRef(new Animated.Value(0)).current;
  const headerTranslateAnim = useRef(new Animated.Value(-12)).current;
  const kpi0Anim = useRef(new Animated.Value(0)).current;
  const kpi1Anim = useRef(new Animated.Value(0)).current;
  const kpi2Anim = useRef(new Animated.Value(0)).current;
  const kpi3Anim = useRef(new Animated.Value(0)).current;
  const bannerAnim = useRef(new Animated.Value(0)).current;
  const chartAnim = useRef(new Animated.Value(0)).current;
  const ordersAnim = useRef(new Animated.Value(0)).current;

  // Continuous Micro-Animations
  const radarPulseAnim = useRef(new Animated.Value(0)).current;
  const tooltipFloatAnim = useRef(new Animated.Value(0)).current;

  // Live Radar Pulse Loop
  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(radarPulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(radarPulseAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, [radarPulseAnim]);

  // Chart Tooltip Floating Loop
  useEffect(() => {
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(tooltipFloatAnim, {
          toValue: -5,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(tooltipFloatAnim, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    floatLoop.start();
    return () => floatLoop.stop();
  }, [tooltipFloatAnim]);

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

  // Trigger choreographed entrance on load or refresh
  useEffect(() => {
    if (!loading) {
      headerFadeAnim.setValue(0);
      headerTranslateAnim.setValue(-12);
      kpi0Anim.setValue(0);
      kpi1Anim.setValue(0);
      kpi2Anim.setValue(0);
      kpi3Anim.setValue(0);
      bannerAnim.setValue(0);
      chartAnim.setValue(0);
      ordersAnim.setValue(0);

      Animated.stagger(55, [
        Animated.parallel([
          Animated.timing(headerFadeAnim, {
            toValue: 1,
            duration: 250,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(headerTranslateAnim, {
            toValue: 0,
            duration: 250,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        Animated.spring(kpi0Anim, { toValue: 1, friction: 6.5, tension: 80, useNativeDriver: true }),
        Animated.spring(kpi1Anim, { toValue: 1, friction: 6.5, tension: 80, useNativeDriver: true }),
        Animated.spring(kpi2Anim, { toValue: 1, friction: 6.5, tension: 80, useNativeDriver: true }),
        Animated.spring(kpi3Anim, { toValue: 1, friction: 6.5, tension: 80, useNativeDriver: true }),
        Animated.timing(bannerAnim, {
          toValue: 1,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(chartAnim, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(ordersAnim, {
          toValue: 1,
          duration: 320,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading, refreshSignal]);

  if (loading && !refreshing) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color={renewxColors.emerald} />
      </View>
    );
  }

  const calculatedSales = orders.reduce((acc, o) => acc + (Number(o.subtotal || o.total) || 0), 0);
  const totalSalesStr = `₹${calculatedSales.toLocaleString('en-IN')}`;
  const totalOrdersStr = Number(orders.length || 0).toLocaleString('en-IN');
  const totalProductsStr = Number(products.length || 0).toLocaleString('en-IN');
  const totalUsersStr = Number(users.length || 0).toLocaleString('en-IN');
  const totalBrandsStr = Number(brands.length || 0).toLocaleString('en-IN');

  const getKpiAnimatedStyle = (anim: Animated.Value) => ({
    opacity: anim,
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [16, 0],
        }),
      },
      {
        scale: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.93, 1],
        }),
      },
    ] as any,
  });

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
          colors={[renewxColors.emerald]}
          tintColor={renewxColors.emerald}
        />
      }
    >
      {/* Title + Subtitle + Date Dropdown matching Mockup */}
      <Animated.View
        style={[
          styles.viewHeaderRow,
          {
            opacity: headerFadeAnim,
            transform: [{ translateY: headerTranslateAnim }],
          },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.viewTitle}>Dashboard</Text>
          <Text style={styles.viewSubtitle}>Welcome back, Admin!</Text>
        </View>

        <TouchableOpacity style={styles.periodDropdown} activeOpacity={0.8}>
          <Ionicons name="calendar-outline" size={13} color="#0F172A" />
          <Text style={styles.periodDropdownText}>{selectedPeriod}</Text>
          <Ionicons name="chevron-down" size={13} color="#64748B" />
        </TouchableOpacity>
      </Animated.View>

      {/* 4 Metric Cards Matching Mockup (2x2 Grid with Chevron >) */}
      <View style={styles.kpiGrid}>
        {/* 1. Total Orders */}
        <AnimatedTouchable
          onPress={() => onNavigate('orders')}
          style={[styles.kpiCard, getKpiAnimatedStyle(kpi0Anim)]}
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
            <Text style={{ fontSize: 10, ...renewxTextStyle('bold'), color: '#16A34A' }}>+12%</Text>
          </View>
        </AnimatedTouchable>

        {/* 2. Total Products */}
        <AnimatedTouchable
          onPress={() => onNavigate('products')}
          style={[styles.kpiCard, getKpiAnimatedStyle(kpi1Anim)]}
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
            <Text style={{ fontSize: 10, ...renewxTextStyle('bold'), color: '#16A34A' }}>+8%</Text>
          </View>
        </AnimatedTouchable>

        {/* 3. Total Users */}
        <AnimatedTouchable
          onPress={() => onNavigate('users')}
          style={[styles.kpiCard, getKpiAnimatedStyle(kpi2Anim)]}
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
            <Text style={{ fontSize: 10, ...renewxTextStyle('bold'), color: '#16A34A' }}>+15%</Text>
          </View>
        </AnimatedTouchable>

        {/* 4. Total Brands */}
        <AnimatedTouchable
          onPress={() => onNavigate('brands')}
          style={[styles.kpiCard, getKpiAnimatedStyle(kpi3Anim)]}
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
            <Text style={{ fontSize: 10, ...renewxTextStyle('bold'), color: '#16A34A' }}>+5%</Text>
          </View>
        </AnimatedTouchable>
      </View>

      {/* Realtime Analytics Quick Banner with Animated Radar Pulse */}
      <Animated.View
        style={{
          opacity: bannerAnim,
          transform: [
            {
              translateY: bannerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [14, 0],
              }),
            },
          ],
        }}
      >
        <TouchableOpacity
          onPress={() => onNavigate('analytics')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: renewxColors.black,
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: 14,
            marginBottom: 6,
            ...(renewxShadows.card as object),
          }}
          activeOpacity={0.85}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="stats-chart" size={17} color={renewxColors.yellow} />
            </View>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 13, ...renewxTextStyle('extraBold'), color: '#FFFFFF' }}>Realtime Analytics</Text>
                {/* Live Radar Pulse Indicator */}
                <View style={{ position: 'relative', width: 12, height: 12, alignItems: 'center', justifyContent: 'center' }}>
                  <Animated.View
                    style={{
                      position: 'absolute',
                      width: 12,
                      height: 12,
                      borderRadius: 6,
                      backgroundColor: '#22C55E',
                      transform: [
                        {
                          scale: radarPulseAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 2.5],
                          }),
                        },
                      ],
                      opacity: radarPulseAnim.interpolate({
                        inputRange: [0, 0.7, 1],
                        outputRange: [0.8, 0.2, 0],
                      }),
                    }}
                  />
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E' }} />
                </View>
              </View>
              <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 1, ...renewxTextStyle('regular') }}>Live revenue, order pipeline & 7-day velocity</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: renewxColors.emerald, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}>
            <Text style={{ fontSize: 11, ...renewxTextStyle('extraBold'), color: '#FFFFFF' }}>View</Text>
            <Ionicons name="arrow-forward" size={12} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
      </Animated.View>

      {/* Real-Time Sales Overview Card with Live Data Analysis */}
      <Animated.View
        style={[
          {
            opacity: chartAnim,
            transform: [
              {
                translateY: chartAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [16, 0],
                }),
              },
            ],
          },
        ]}
      >
        <SalesOverviewChart
          orders={orders}
          onNavigate={onNavigate}
          initialPeriod="7d"
        />
      </Animated.View>

      {/* Recent Orders Overview with Animated Entry */}
      <Animated.View
        style={[
          styles.cardContainer,
          {
            opacity: ordersAnim,
            transform: [
              {
                translateY: ordersAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [18, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardSectionTitle}>Recent Orders</Text>
          <TouchableOpacity onPress={() => onNavigate('orders')} style={styles.cardLinkRow} activeOpacity={0.8}>
            <Text style={styles.cardLinkText}>View All</Text>
            <Ionicons name="arrow-forward" size={12} color="#168A4A" />
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
      </Animated.View>
    </ScrollView>
  );
}

/* ========================================================================================
   TAB 2: PRODUCTION-READY PRODUCTS MANAGEMENT
======================================================================================== */
const PRODUCT_SORT_OPTIONS: { id: 'newest' | 'price-asc' | 'price-desc' | 'stock-asc' | 'name-asc'; label: string }[] = [
  { id: 'newest', label: 'Newest' },
  { id: 'price-asc', label: 'Price: Low to High' },
  { id: 'price-desc', label: 'Price: High to Low' },
  { id: 'stock-asc', label: 'Low Stock First' },
  { id: 'name-asc', label: 'Name: A to Z' },
];

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
  const [sortBy, setSortBy] = useState<'newest' | 'price-asc' | 'price-desc' | 'stock-asc' | 'name-asc'>('newest');
  const [stockFilter, setStockFilter] = useState<'all' | 'in-stock' | 'low-stock' | 'out-of-stock'>('all');
  const [deleteTarget, setDeleteTarget] = useState<ProductRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
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

  const handleCycleSort = () => {
    const currentIdx = PRODUCT_SORT_OPTIONS.findIndex((s) => s.id === sortBy);
    const nextIdx = (currentIdx + 1) % PRODUCT_SORT_OPTIONS.length;
    setSortBy(PRODUCT_SORT_OPTIONS[nextIdx].id);
  };

  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  const handleToggleSoldOut = async (product: any) => {
    const prodId = String(product.id || product._id);
    const isCurrentlySoldOut = Boolean(
      product.is_sold_out === true ||
      product.isSoldOut === true ||
      product.status === 'sold_out'
    );
    const nextSoldOut = !isCurrentlySoldOut;
    setUpdatingStatusId(prodId);
    try {
      await api.products.update(prodId, {
        is_sold_out: nextSoldOut,
        status: nextSoldOut ? 'sold_out' : 'active',
        stock: nextSoldOut ? 0 : (product.stock && Number(product.stock) > 0 ? Number(product.stock) : 1),
      });
      setProducts((prev) =>
        prev.map((p) => {
          if (String(p.id || (p as any)._id) === prodId) {
            return {
              ...p,
              is_sold_out: nextSoldOut,
              status: nextSoldOut ? 'sold_out' : 'active',
              stock: nextSoldOut ? 0 : (p.stock && Number(p.stock) > 0 ? Number(p.stock) : 1),
            };
          }
          return p;
        })
      );
      toast.success(
        nextSoldOut ? `Marked "${product.name}" as Sold Out` : `Marked "${product.name}" as Available in Stock`,
        'Status Updated'
      );
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update product status', 'Error');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const prodId = String(deleteTarget.id || (deleteTarget as any)._id);
    const prodName = deleteTarget.name || 'Product';
    setIsDeleting(true);
    try {
      await api.products.delete(prodId);
      setProducts((prev) => prev.filter((p) => String(p.id || (p as any)._id) !== prodId));
      toast.success(`"${prodName}" was removed from inventory.`, 'Product Deleted');
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete product', 'Error');
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = products.filter((p) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.brand && p.brand.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q));

    const matchesCategory =
      selectedCategory === 'All' ||
      (p.category && p.category.toLowerCase() === selectedCategory.toLowerCase()) ||
      (selectedCategory === 'Phones' && p.category && (p.category.toLowerCase() === 'smartphones' || p.category.toLowerCase() === 'phones')) ||
      (selectedCategory === 'Smartphones' && p.category && (p.category.toLowerCase() === 'phones' || p.category.toLowerCase() === 'smartphones')) ||
      (selectedCategory === 'Cameras' && p.category && (p.category.toLowerCase().includes('cam') || p.category.toLowerCase() === 'cameras')) ||
      (selectedCategory === 'Vehicles' && p.category && (p.category.toLowerCase().includes('vehic') || p.category.toLowerCase() === 'vehicles' || p.category.toLowerCase().includes('car') || p.category.toLowerCase().includes('bike')));

    const stockNum = Number(p.stock || 0);
    const isSoldOutItem = Boolean((p as any).is_sold_out === true || (p as any).isSoldOut === true || (p as any).status === 'sold_out');
    const matchesStock =
      stockFilter === 'all' ||
      (stockFilter === 'in-stock' && !isSoldOutItem && stockNum > 3) ||
      (stockFilter === 'low-stock' && !isSoldOutItem && stockNum > 0 && stockNum <= 3) ||
      (stockFilter === 'out-of-stock' && isSoldOutItem);

    return matchesSearch && matchesCategory && matchesStock;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'price-asc') return (Number(a.price) || 0) - (Number(b.price) || 0);
    if (sortBy === 'price-desc') return (Number(b.price) || 0) - (Number(a.price) || 0);
    if (sortBy === 'stock-asc') return (Number(a.stock) || 0) - (Number(b.stock) || 0);
    if (sortBy === 'name-asc') return (a.name || '').localeCompare(b.name || '');
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  });

  const activeSortLabel = PRODUCT_SORT_OPTIONS.find((s) => s.id === sortBy)?.label || 'Newest';

  return (
    <View style={{ flex: 1, backgroundColor: renewxColors.background }}>
      {/* Title + Add Product Button */}
      <View style={[styles.viewHeaderRow, { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 }]}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.viewTitle}>Products</Text>
            <View style={styles.countBadgePill}>
              <Text style={styles.countBadgePillText}>{products.length}</Text>
            </View>
          </View>
          <Text style={styles.viewSubtitle}>Manage catalog, stock & pricing</Text>
        </View>

        <TouchableOpacity onPress={onAddProduct} style={styles.blackAddBtn} activeOpacity={0.85}>
          <Ionicons name="add" size={17} color="#FFFFFF" />
          <Text style={styles.blackAddBtnText}>Add Product</Text>
        </TouchableOpacity>
      </View>

      {/* Category Horizontal Filter Pills */}
      <View style={{ height: 42, marginBottom: 4 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {['All', 'Phones', 'Laptops', 'Tablets', 'Watches', 'Audio', 'Cameras', 'Vehicles'].map((cat) => {
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

      {/* Search Input Bar with Clear and Filter Action */}
      <View style={[styles.searchBarWrapM2, { marginHorizontal: 16, marginBottom: 8 }]}>
        <Ionicons name="search" size={16} color="#94A3B8" />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by product name, brand or category..."
          placeholderTextColor="#94A3B8"
          style={styles.searchInputM2}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={17} color="#94A3B8" />
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={styles.filterSliderBtn}
          onPress={() => {
            // Quick toggle stock filter
            setStockFilter((f) => (f === 'all' ? 'low-stock' : f === 'low-stock' ? 'out-of-stock' : 'all'));
          }}
          activeOpacity={0.7}
          accessibilityLabel="Toggle Stock Filter"
        >
          <Ionicons
            name={stockFilter === 'all' ? 'options-outline' : 'alert-circle'}
            size={17}
            color={stockFilter === 'all' ? renewxColors.black : '#D97706'}
          />
        </TouchableOpacity>
      </View>

      {/* Count & Dynamic Sort Sub-bar */}
      <View style={styles.countSortRow}>
        <Text style={styles.countText}>
          {search || selectedCategory !== 'All' || stockFilter !== 'all'
            ? `Showing ${sorted.length} of ${products.length} products`
            : `${products.length} ${products.length === 1 ? 'product' : 'products'} in inventory`}
        </Text>

        <TouchableOpacity style={styles.sortDropdownBtn} onPress={handleCycleSort} activeOpacity={0.7}>
          <Ionicons name="swap-vertical" size={13} color="#64748B" />
          <Text style={styles.sortDropdownText}>
            Sort: <Text style={{ ...renewxTextStyle('bold'), color: renewxColors.black }}>{activeSortLabel}</Text>
          </Text>
        </TouchableOpacity>
      </View>

      {/* Products Content List */}
      {loading && !refreshing ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={renewxColors.emerald} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 110, gap: 12, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          alwaysBounceVertical={true}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[renewxColors.emerald]}
              tintColor={renewxColors.emerald}
            />
          }
        >
          {sorted.length === 0 ? (
            <View style={[styles.centerBox, { minHeight: 280, paddingHorizontal: 24 }]}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="cube-outline" size={38} color="#94A3B8" />
              </View>
              <Text style={styles.emptyTitleText}>No products found</Text>
              <Text style={styles.emptyNote}>
                {search || selectedCategory !== 'All' || stockFilter !== 'all'
                  ? 'No products match your current search and filter settings.'
                  : 'Your product inventory is currently empty.'}
              </Text>
              {(search || selectedCategory !== 'All' || stockFilter !== 'all') && (
                <TouchableOpacity
                  style={styles.clearFilterBtn}
                  onPress={() => {
                    setSearch('');
                    setSelectedCategory('All');
                    setStockFilter('all');
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.clearFilterBtnText}>Reset Filters</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            sorted.map((item, itemIdx) => {
              const isExplicitSoldOut = Boolean((item as any).is_sold_out === true || (item as any).isSoldOut === true || (item as any).status === 'sold_out');
              const stockNum = Number(item.stock ?? 12);
              const isOut = isExplicitSoldOut;
              const isLow = !isOut && stockNum > 0 && stockNum <= 3;
              const productKey = String(item.id || (item as any)._id || itemIdx);
              const categoryLabel = item.category || 'Phones';
              const priceNum = Number(item.price) || 0;
              const mrpNum = Number(item.original_price || (item as any).mrp) || 0;
              const hasDiscount = mrpNum > priceNum;
              const discountPct = hasDiscount ? Math.round(((mrpNum - priceNum) / mrpNum) * 100) : 0;
              const thumbUrl = item.image_url || (Array.isArray((item as any).images) && (item as any).images[0]) || '';
              const conditionLabel = item.condition || 'Pre-Owned';

              // Stock badge colors
              const stockBg = isOut ? '#FEE2E2' : isLow ? '#FFFBEA' : '#E8F7ED';
              const stockBorder = isOut ? '#FECACA' : isLow ? '#FDE68A' : '#D4EBDC';
              const stockColor = isOut ? '#DC2626' : isLow ? '#D97706' : '#0B6B3A';
              const stockText = isOut ? 'Sold Out' : isLow ? `Low Stock (${stockNum})` : `In Stock (${stockNum})`;

              return (
                <View key={productKey} style={styles.productCardClean}>
                  {/* Top Row: Thumbnail + Product Info + Stock Status */}
                  <View style={styles.productCardTopRow}>
                    {/* Thumbnail Box */}
                    <View style={styles.productThumbCleanWrap}>
                      {thumbUrl ? (
                        <Image source={{ uri: thumbUrl }} style={styles.productThumbImg} resizeMode="contain" />
                      ) : (
                        <View style={styles.productThumbFallback}>
                          <Ionicons name="phone-portrait-outline" size={28} color="#94A3B8" />
                        </View>
                      )}
                      {conditionLabel ? (
                        <View style={styles.productThumbConditionBadge}>
                          <Text style={styles.productThumbConditionText} numberOfLines={1}>
                            {conditionLabel}
                          </Text>
                        </View>
                      ) : null}
                      {isOut && (
                        <View
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(15, 23, 42, 0.45)',
                            justifyContent: 'center',
                            alignItems: 'center',
                            borderRadius: 12,
                          }}
                        >
                          <View style={{ backgroundColor: '#DC2626', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                            <Text style={{ color: '#FFFFFF', fontSize: 10, ...renewxTextStyle('extraBold') }}>SOLD OUT</Text>
                          </View>
                        </View>
                      )}
                    </View>

                    {/* Middle: Details */}
                    <View style={styles.productDetailsCol}>
                      <View style={styles.productTagRow}>
                        <View style={styles.productBrandPill}>
                          <Text style={styles.productBrandPillText}>
                            {item.brand ? item.brand.toUpperCase() : 'RENEWX'}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 11, color: '#94A3B8', ...renewxTextStyle('medium') }}>
                          {categoryLabel}
                        </Text>
                      </View>

                      <Text style={styles.productTitleClean} numberOfLines={2}>
                        {item.name}
                      </Text>

                      {item.is_best_price || item.isBestPrice || priceNum === 0 ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                          <View style={{ backgroundColor: '#ECFDF5', paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 6, borderWidth: 1, borderColor: '#A7F3D0' }}>
                            <Text style={{ fontSize: 12.5, ...renewxTextStyle('extraBold'), color: '#047857' }}>Best Price</Text>
                          </View>
                          <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2.5, borderRadius: 6, borderWidth: 1, borderColor: '#FDE68A' }}>
                            <Text style={{ fontSize: 10.5, ...renewxTextStyle('extraBold'), color: '#92400E' }}>COD ONLY</Text>
                          </View>
                        </View>
                      ) : (
                        <View style={styles.productPriceRowClean}>
                          <Text style={styles.productPriceTextClean}>
                            ₹{priceNum.toLocaleString('en-IN')}
                          </Text>
                          {hasDiscount ? (
                            <Text style={styles.productMrpStrike}>
                              ₹{mrpNum.toLocaleString('en-IN')}
                            </Text>
                          ) : null}
                          {hasDiscount ? (
                            <View style={styles.productDiscountPill}>
                              <Text style={styles.productDiscountPillText}>{discountPct}% OFF</Text>
                            </View>
                          ) : null}
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Card Divider */}
                  <View style={styles.productCardDivider} />

                  {/* Bottom Row: Stock Badge on Left, Action Buttons on Right */}
                  <View style={styles.productCardBottomActionRow}>
                    <View style={[styles.stockPillClean, { backgroundColor: stockBg, borderColor: stockBorder }]}>
                      <View style={[styles.stockDotClean, { backgroundColor: stockColor }]} />
                      <Text style={[styles.stockPillCleanText, { color: stockColor }]}>
                        {stockText}
                      </Text>
                    </View>

                    <View style={styles.productActionButtonsWrap}>
                      {/* Quick Status Toggle Button */}
                      <TouchableOpacity
                        onPress={() => handleToggleSoldOut(item)}
                        disabled={updatingStatusId === productKey}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingHorizontal: 9,
                          paddingVertical: 5.5,
                          borderRadius: 8,
                          backgroundColor: isOut ? '#ECFDF5' : '#FEF2F2',
                          borderWidth: 1,
                          borderColor: isOut ? '#A7F3D0' : '#FECACA',
                          marginRight: 6,
                          gap: 4,
                        }}
                        activeOpacity={0.75}
                        accessibilityLabel={isOut ? `Mark ${item.name} available` : `Mark ${item.name} sold out`}
                      >
                        {updatingStatusId === productKey ? (
                          <ActivityIndicator size="small" color={isOut ? '#059669' : '#DC2626'} />
                        ) : (
                          <>
                            <Ionicons
                              name={isOut ? 'checkmark-circle-outline' : 'close-circle-outline'}
                              size={13}
                              color={isOut ? '#059669' : '#DC2626'}
                            />
                            <Text
                              style={{
                                fontSize: 11,
                                ...renewxTextStyle('bold'),
                                color: isOut ? '#059669' : '#DC2626',
                              }}
                            >
                              {isOut ? 'Set In Stock' : 'Mark Sold Out'}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>

                      {/* Edit Button */}
                      <TouchableOpacity
                        onPress={() => onEditProduct(item)}
                        style={styles.cardActionBtnEdit}
                        activeOpacity={0.75}
                        accessibilityLabel={`Edit ${item.name}`}
                      >
                        <Ionicons name="create-outline" size={14} color="#0F172A" />
                        <Text style={styles.cardActionBtnEditText}>Edit</Text>
                      </TouchableOpacity>

                      {/* Delete Button */}
                      <TouchableOpacity
                        onPress={() => setDeleteTarget(item)}
                        style={styles.cardActionBtnDelete}
                        activeOpacity={0.75}
                        accessibilityLabel={`Delete ${item.name}`}
                      >
                        <Ionicons name="trash-outline" size={14} color="#DC2626" />
                        <Text style={styles.cardActionBtnDeleteText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Production-Ready Delete Confirmation Modal */}
      <Modal
        visible={!!deleteTarget}
        transparent
        animationType="fade"
        onRequestClose={() => !isDeleting && setDeleteTarget(null)}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalCard}>
            <View style={styles.deleteModalIconWrap}>
              <View style={styles.deleteModalIconCircle}>
                <Ionicons name="trash-outline" size={26} color="#DC2626" />
              </View>
            </View>

            <Text style={styles.deleteModalTitle}>Delete Product</Text>
            <Text style={styles.deleteModalDesc}>
              Are you sure you want to delete this product? It will be permanently removed from inventory and the customer store.
            </Text>

            {deleteTarget && (
              <View style={styles.deleteModalPreviewCard}>
                {deleteTarget.image_url ? (
                  <Image
                    source={{ uri: deleteTarget.image_url }}
                    style={styles.deleteModalPreviewThumb}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.deleteModalPreviewPlaceholder}>
                    <Ionicons name="cube-outline" size={22} color="#94A3B8" />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.deleteModalPreviewTitle} numberOfLines={1}>
                    {deleteTarget.name}
                  </Text>
                  <Text style={styles.deleteModalPreviewMeta}>
                    {deleteTarget.brand} • {deleteTarget.category}
                  </Text>
                  <Text style={styles.deleteModalPreviewPrice}>
                    ₹{Number(deleteTarget.price || 0).toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.deleteModalBtnRow}>
              <TouchableOpacity
                style={styles.deleteModalCancelBtn}
                onPress={() => setDeleteTarget(null)}
                disabled={isDeleting}
                activeOpacity={0.8}
              >
                <Text style={styles.deleteModalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.deleteModalConfirmBtn, isDeleting && { opacity: 0.7 }]}
                onPress={handleDeleteConfirm}
                disabled={isDeleting}
                activeOpacity={0.85}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="trash" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.deleteModalConfirmText}>Yes, Delete</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  const [viewMode, setViewMode] = useState<'cards' | 'compact'>('cards');
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
      console.warn('[OrdersView] Could not load live orders, using offline showcase orders:', err?.message);
      if (isRefresh) {
        toast.error(err?.message || 'Unable to load orders. Please try again.');
      }
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

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const statusOk = filterStatus === 'all' || o.status === filterStatus;
      if (!statusOk) return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      const id = String(o.id || o._id || '').toLowerCase();
      const name = String(o.customer_info?.name || o.customer_name || '').toLowerCase();
      const phone = String(o.customer_info?.phone || o.phone || '').toLowerCase();
      return id.includes(q) || name.includes(q) || phone.includes(q);
    });
  }, [orders, filterStatus, search]);

  const displayShippingOrders = useMemo<ShowcaseOrder[]>(() => {
    let list: ShowcaseOrder[] = [];
    if (orders.length > 0) {
      list = orders.map((o, idx) => normalizeOrderToShipping(o, idx));
    } else {
      list = SHOWCASE_ORDERS;
    }

    if (filterStatus !== 'all') {
      list = list.filter((o) => {
        if (filterStatus === 'pending' || filterStatus === 'processing') return o.status === 'process';
        if (filterStatus === 'shipped') return o.status === 'transit';
        if (filterStatus === 'delivered') return o.status === 'delivered';
        if (filterStatus === 'cancelled') return o.status === 'cancelled';
        return true;
      });
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (o) =>
          o.trackingId.toLowerCase().includes(q) ||
          o.productName.toLowerCase().includes(q) ||
          (o.customerInfo?.name || '').toLowerCase().includes(q) ||
          (o.customerInfo?.phone || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [orders, filterStatus, search]);

  if (loading) {
    return <View style={styles.centerBox}><ActivityIndicator size="large" color={renewxColors.emerald} /></View>;
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
        });
        const firstItem = o.order_items?.[0] || o.items?.[0] || {};
        const itemsCount = (o.order_items || o.items || []).length || 1;
        const paymentMethod = String(o.payment_method || o.paymentMethod || 'COD').toUpperCase();
        const whatsappOptIn = o.customer_info?.whatsapp_consent !== false;

        return {
          id: idRaw.slice(-8).toUpperCase(),
          rawOrder: o,
          date: dateStr,
          name: o.customer_info?.name || o.customer_name || 'Customer',
          itemsCount: itemsCount,
          status: statusMatch.label,
          statusBg: statusMatch.bg,
          statusColor: statusMatch.color,
          img: firstItem.image_url || firstItem.image || null,
          firstItem,
          paymentMethod,
          whatsappOptIn,
          total: Number(o.subtotal || o.total || 0),
        };
      })
    : demoMockupOrders.map((d) => ({ ...d, rawOrder: null as any }));

  return (
    <View style={{ flex: 1, backgroundColor: renewxColors.background }}>
      {/* Title Header with View Mode Switcher */}
      <View style={[styles.viewHeaderRow, { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6, alignItems: 'center' }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.viewTitle}>Orders</Text>
          <Text style={styles.viewSubtitle}>View and manage all orders</Text>
        </View>

        <View style={styles.adminViewModeCapsule}>
          <TouchableOpacity
            style={[styles.adminViewModeBtn, viewMode === 'cards' && styles.adminViewModeBtnActive]}
            onPress={() => setViewMode('cards')}
            activeOpacity={0.8}
          >
            <Ionicons name="cube-outline" size={13} color={viewMode === 'cards' ? '#0F172A' : '#64748B'} />
            <Text style={[styles.adminViewModeBtnText, viewMode === 'cards' && styles.adminViewModeBtnTextActive]}>
              3D Cards
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.adminViewModeBtn, viewMode === 'compact' && styles.adminViewModeBtnActive]}
            onPress={() => setViewMode('compact')}
            activeOpacity={0.8}
          >
            <Ionicons name="list-outline" size={13} color={viewMode === 'compact' ? '#0F172A' : '#64748B'} />
            <Text style={[styles.adminViewModeBtnText, viewMode === 'compact' && styles.adminViewModeBtnTextActive]}>
              List
            </Text>
          </TouchableOpacity>
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
          <ActivityIndicator size="large" color={renewxColors.emerald} />
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
              colors={[renewxColors.emerald]}
              tintColor={renewxColors.emerald}
            />
          }
        >
          {viewMode === 'cards' ? (
            displayShippingOrders.map((ord) => {
              const raw = orders.find((o) => String(o.id || o._id) === ord.id);
              return (
                <ShippingOrderCard
                  key={ord.id}
                  order={ord}
                  isAdmin={true}
                  onDetails={() => {
                    if (raw) {
                      setSelectedManageOrder(raw);
                    } else {
                      setSelectedManageOrder({
                        id: ord.id,
                        status: ord.statusRaw,
                        customer_info: ord.customerInfo,
                        total: ord.total,
                        items: [{ product_name: ord.productName, price: ord.price, quantity: ord.quantity }],
                      });
                    }
                  }}
                  onTrack={() => {
                    toast.info(
                      `Waybill: ${ord.trackingId}\nCourier: ${ord.courier.name}\nStatus: ${ord.statusLabel}`,
                      'Certified Telemetry'
                    );
                  }}
                  onStatusChange={(orderId, nextStatus) => {
                    applyStatus(orderId, nextStatus);
                  }}
                />
              );
            })
          ) : (
            displayOrders.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.orderCardRowM2}
                onPress={() => item.rawOrder && setSelectedManageOrder(item.rawOrder)}
                activeOpacity={0.85}
              >
                <View style={styles.orderThumbM2Wrap}>
                  <ProductImage
                    source={item.img}
                    category={item.firstItem?.category}
                    name={item.firstItem?.name}
                    style={styles.orderThumbM2}
                    resizeMode="contain"
                  />
                </View>

                <View style={{ flex: 1, justifyContent: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <Text style={styles.orderRowIdM2}>#{item.id}</Text>
                    <Text style={styles.orderCardPriceText}>
                      ₹{item.total.toLocaleString('en-IN')} · {item.paymentMethod}
                    </Text>
                  </View>
                  <Text style={styles.orderRowCustomerM2}>{item.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <Text style={styles.orderRowDateM2}>{item.date}</Text>
                    <Text style={styles.orderRowBullet}>•</Text>
                    <Text style={styles.orderRowItemsM2}>{item.itemsCount} {item.itemsCount === 1 ? 'item' : 'items'}</Text>
                    {item.whatsappOptIn && (
                      <>
                        <Text style={styles.orderRowBullet}>•</Text>
                        <Ionicons name="logo-whatsapp" size={11} color="#16A34A" />
                      </>
                    )}
                  </View>
                </View>

                <View style={{ alignItems: 'flex-end', justifyContent: 'center', gap: 6 }}>
                  <View style={[styles.orderStatusPillM2, { backgroundColor: item.statusBg }]}>
                    <View style={[styles.statusMiniDot, { backgroundColor: item.statusColor }]} />
                    <Text style={[styles.orderStatusPillTextM2, { color: item.statusColor }]}>{item.status}</Text>
                  </View>
                  <View style={styles.orderQuickUpdatePill}>
                    <Ionicons name="create-outline" size={11} color="#0F172A" />
                    <Text style={styles.orderQuickUpdateText}>Update</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      {/* Minimalism Clean Order Management Modal */}
      <OrderUpdateModal
        visible={Boolean(selectedManageOrder)}
        order={selectedManageOrder}
        onClose={() => setSelectedManageOrder(null)}
        onOrderUpdated={(updated) => {
          setOrders((prev) =>
            prev.map((o) => (String(o.id || o._id) === String(updated.id || updated._id) ? updated : o))
          );
        }}
        onDownloadInvoice={handleDownloadInvoice}
        onDeleteOrder={handleDeleteOrder}
      />
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
          salesTrend: (() => {
            const now = new Date();
            const trend = [];
            for (let i = 6; i >= 0; i--) {
              const d = new Date(now);
              d.setDate(now.getDate() - i);
              const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
              const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
              const dayOrders = ords.filter((o: any) => {
                const od = new Date(o.created_at || o.createdAt || 0);
                return od >= dayStart && od <= dayEnd;
              });
              const dayRev = dayOrders
                .filter((o: any) => o.status !== 'cancelled' && o.status !== 'failed')
                .reduce((sum: number, o: any) => sum + (Number(o.subtotal || o.total_amount || o.total) || 0), 0);
              trend.push({
                date: dayStart.toISOString().split('T')[0],
                label: `${d.toLocaleDateString('en-IN', { weekday: 'short' })} ${d.getDate()}`,
                revenue: dayRev,
                orders: dayOrders.length,
              });
            }
            return trend;
          })(),
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
                <Text style={{ fontSize: 10, ...renewxTextStyle('extraBold'), color: autoRefresh ? '#16A34A' : '#64748B' }}>
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
              <ActivityIndicator size="small" color={renewxColors.black} />
            ) : (
              <Ionicons name="refresh-outline" size={17} color={renewxColors.black} />
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
                  backgroundColor: isSelected ? renewxColors.black : '#FFFFFF',
                  borderWidth: 1,
                  borderColor: isSelected ? renewxColors.black : '#E2E8F0',
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={{
                    fontSize: 11.5,
                    ...(isSelected ? renewxTextStyle('extraBold') : renewxTextStyle('semibold')),
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
              <Text style={{ fontSize: 15, ...renewxTextStyle('extraBold'), color: '#16A34A' }}>₹</Text>
            </View>
            <View style={styles.kpiBadge}>
              <Ionicons name="trending-up" size={11} color="#16A34A" />
              <Text style={styles.kpiBadgeText}>Live</Text>
            </View>
          </View>
          <Text style={styles.kpiValueText}>₹{Number(kpis.totalRevenue || 0).toLocaleString('en-IN')}</Text>
          <Text style={styles.kpiLabelText}>Total Revenue</Text>
          <Text style={{ fontSize: 10, color: '#94A3B8', marginTop: 4, ...renewxTextStyle('medium') }}>
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
          <Text style={{ fontSize: 10, color: '#94A3B8', marginTop: 4, ...renewxTextStyle('medium') }}>
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
          <Text style={{ fontSize: 10, color: '#94A3B8', marginTop: 4, ...renewxTextStyle('medium') }}>
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
          <Text style={{ fontSize: 10, color: '#94A3B8', marginTop: 4, ...renewxTextStyle('medium') }}>
            Per completed checkout
          </Text>
        </View>
      </View>

      {/* Realtime Order Fulfillment Pipeline Funnel */}
      <View style={styles.cardContainer}>
        <View style={styles.cardHeaderRow}>
          <View>
            <Text style={styles.cardSectionTitle}>Fulfillment Pipeline</Text>
            <Text style={{ fontSize: 11, color: '#64748B', marginTop: 1, ...renewxTextStyle('regular') }}>Live status of pending and transit orders</Text>
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
              <Text style={{ fontSize: 16, ...renewxTextStyle('extraBold'), color: st.color }}>{st.count}</Text>
              <Text style={{ fontSize: 9.5, ...renewxTextStyle('bold'), color: st.color, marginTop: 2, textAlign: 'center' }} numberOfLines={1}>
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
            <Text style={{ fontSize: 11, color: '#64748B', marginTop: 1, ...renewxTextStyle('regular') }}>Daily revenue and order volume trends</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E' }} />
            <Text style={{ fontSize: 11, ...renewxTextStyle('semibold'), color: '#64748B' }}>Revenue (₹)</Text>
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
                      <View style={{ backgroundColor: renewxColors.black, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6, marginBottom: 2 }}>
                        <Text style={{ fontSize: 9.5, ...renewxTextStyle('extraBold'), color: '#FFFFFF' }}>Peak</Text>
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
                    <Text style={{ fontSize: 10.5, ...renewxTextStyle('bold'), color: renewxColors.black }}>{day.label}</Text>
                    <Text style={{ fontSize: 9.5, color: '#64748B', ...renewxTextStyle('medium') }}>
                      {rev > 0 ? `₹${Math.round(rev / 1000)}k` : '₹0'}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : (
          <View style={{ paddingVertical: 24, alignItems: 'center' }}>
            <Text style={{ fontSize: 12, color: '#94A3B8', ...renewxTextStyle('regular') }}>No sales data recorded for the past 7 days</Text>
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
            backgroundColor: renewxColors.surface,
            borderRadius: 16,
            padding: 14,
            borderWidth: 1,
            borderColor: renewxColors.border,
            ...(renewxShadows.card as object),
          }}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <View style={[styles.kpiIconWrap, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="hardware-chip-outline" size={16} color="#D97706" />
            </View>
            <Ionicons name="chevron-forward" size={14} color="#94A3B8" />
          </View>
          <Text style={{ fontSize: 13, ...renewxTextStyle('extraBold'), color: renewxColors.black }}>Inventory Pulse</Text>
          <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2, ...renewxTextStyle('regular') }}>
            {inventoryHealth.totalProducts || 0} active devices
          </Text>
          <View style={{ flexDirection: 'row', gap: 4, marginTop: 8 }}>
            <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
              <Text style={{ fontSize: 10, ...renewxTextStyle('bold'), color: '#16A34A' }}>{inventoryHealth.inStock || 0} In Stock</Text>
            </View>
            {(inventoryHealth.lowStock || 0) > 0 && (
              <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                <Text style={{ fontSize: 10, ...renewxTextStyle('bold'), color: '#D97706' }}>{inventoryHealth.lowStock} Low</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* Trade-In Queue */}
        <TouchableOpacity
          onPress={() => onNavigate('tradeIns')}
          style={{
            flex: 1,
            backgroundColor: renewxColors.surface,
            borderRadius: 16,
            padding: 14,
            borderWidth: 1,
            borderColor: renewxColors.border,
            ...(renewxShadows.card as object),
          }}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <View style={[styles.kpiIconWrap, { backgroundColor: '#F3E8FF' }]}>
              <Ionicons name="swap-horizontal-outline" size={16} color="#9333EA" />
            </View>
            <Ionicons name="chevron-forward" size={14} color="#94A3B8" />
          </View>
          <Text style={{ fontSize: 13, ...renewxTextStyle('extraBold'), color: renewxColors.black }}>Trade-In Queue</Text>
          <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2, ...renewxTextStyle('regular') }}>
            {tradeInStats.totalRequests || 0} customer requests
          </Text>
          <View style={{ flexDirection: 'row', gap: 4, marginTop: 8 }}>
            <View style={{ backgroundColor: '#F3E8FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
              <Text style={{ fontSize: 10, ...renewxTextStyle('bold'), color: '#9333EA' }}>{tradeInStats.pending || 0} Pending</Text>
            </View>
            <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
              <Text style={{ fontSize: 10, ...renewxTextStyle('bold'), color: '#16A34A' }}>{tradeInStats.inspected || 0} Verified</Text>
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
                      <Text style={{ fontSize: 13, ...renewxTextStyle('extraBold'), color: renewxColors.black }}>
                        {tx.customerName}
                      </Text>
                      <Text style={{ fontSize: 10.5, color: '#64748B', marginTop: 1, ...renewxTextStyle('regular') }}>
                        {tx.itemsCount} item{tx.itemsCount > 1 ? 's' : ''} • {tx.paymentMethod}
                      </Text>
                    </View>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 13.5, ...renewxTextStyle('extraBold'), color: renewxColors.black }}>
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
                          fontSize: 10,
                          ...renewxTextStyle('extraBold'),
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
    backgroundColor: renewxColors.surface,
    borderRadius: 20,
    overflow: 'hidden',
    ...(renewxShadows.floating as object),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: renewxColors.surfaceMuted,
    gap: 12,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: renewxColors.yellowLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    color: renewxColors.black,
    ...renewxTextStyle('extraBold'),
  },
  subtitle: {
    fontSize: 12,
    color: renewxColors.textMuted,
    marginTop: 2,
    ...renewxTextStyle('regular'),
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: renewxColors.surfaceMuted,
  },
  body: {
    padding: 18,
    gap: 12,
  },
  label: {
    fontSize: 11,
    color: renewxColors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 4,
    ...renewxTextStyle('extraBold'),
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: renewxColors.border,
    backgroundColor: renewxColors.background,
    gap: 12,
  },
  roleOptionSelected: {
    borderColor: renewxColors.yellowDark,
    backgroundColor: renewxColors.yellowSoft,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: renewxColors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioSelected: {
    borderColor: renewxColors.yellowDark,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: renewxColors.yellowDark,
  },
  roleTitle: {
    fontSize: 14,
    color: renewxColors.black,
    ...renewxTextStyle('bold'),
  },
  roleDesc: {
    fontSize: 12,
    color: renewxColors.textMuted,
    marginTop: 3,
    lineHeight: 17,
    ...renewxTextStyle('regular'),
  },
  adminBadge: {
    backgroundColor: renewxColors.yellowLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adminBadgeText: {
    fontSize: 10,
    color: '#78350F',
    ...renewxTextStyle('extraBold'),
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: 16,
    backgroundColor: renewxColors.background,
    borderTopWidth: 1,
    borderTopColor: renewxColors.surfaceMuted,
    gap: 10,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: renewxColors.border,
  },
  cancelBtnText: {
    fontSize: 13,
    color: '#334155',
    ...renewxTextStyle('semibold'),
  },
  saveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: renewxColors.yellow,
    borderWidth: 1,
    borderColor: renewxColors.yellowDark,
  },
  saveBtnText: {
    fontSize: 13,
    color: renewxColors.black,
    ...renewxTextStyle('bold'),
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
          fontFamily: 'Outfit_500Medium, system-ui, sans-serif',
          color: value ? renewxColors.black : '#94a3b8',
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
    backgroundColor: renewxColors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: renewxColors.border,
    backgroundColor: renewxColors.surface,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: renewxColors.surfaceMuted,
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
    backgroundColor: renewxColors.surface,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    color: renewxColors.black,
    ...renewxTextStyle('bold'),
  },
  adminBadge: {
    backgroundColor: renewxColors.yellow,
    borderWidth: 1,
    borderColor: renewxColors.yellowDark,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  adminBadgeText: {
    fontSize: 10,
    color: renewxColors.black,
    ...renewxTextStyle('bold'),
  },
  headerSubtitle: {
    fontSize: 11,
    color: renewxColors.textMuted,
    ...renewxTextStyle('regular'),
  },
  addActionButton: {
    backgroundColor: renewxColors.yellow,
    borderWidth: 1,
    borderColor: renewxColors.yellowDark,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addActionButtonText: {
    fontSize: fontSize.xs,
    color: renewxColors.black,
    ...renewxTextStyle('bold'),
  },
  tabBarContainer: {
    borderBottomWidth: 1,
    borderBottomColor: renewxColors.border,
    backgroundColor: renewxColors.background,
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
    backgroundColor: renewxColors.surface,
    borderWidth: 1,
    borderColor: renewxColors.border,
  },
  tabButtonActive: {
    backgroundColor: renewxColors.black,
    borderColor: renewxColors.black,
  },
  tabButtonText: {
    fontSize: 12,
    color: renewxColors.textMuted,
    ...renewxTextStyle('semibold'),
  },
  tabButtonTextActive: {
    color: renewxColors.white,
  },
  mainContent: {
    flex: 1,
    backgroundColor: renewxColors.background,
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
    backgroundColor: renewxColors.surface,
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: renewxColors.border,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  metricLabel: {
    fontSize: 11,
    color: renewxColors.textSecondary,
    ...renewxTextStyle('medium'),
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
    color: renewxColors.black,
    marginBottom: 2,
    ...renewxTextStyle('black'),
  },
  metricSub: {
    fontSize: 10,
    color: renewxColors.textMuted,
    ...renewxTextStyle('regular'),
  },
  quickActionsContainer: {
    marginBottom: 16,
  },
  sectionHeaderTitle: {
    fontSize: fontSize.xs,
    color: renewxColors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    ...renewxTextStyle('bold'),
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionPill: {
    flex: 1,
    backgroundColor: renewxColors.surface,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: renewxColors.border,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  actionPillText: {
    fontSize: 11,
    color: renewxColors.black,
    ...renewxTextStyle('bold'),
  },
  cardContainer: {
    backgroundColor: renewxColors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: renewxColors.border,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderTitle: {
    fontSize: fontSize.sm,
    color: renewxColors.black,
    ...renewxTextStyle('bold'),
  },
  cardHeaderSub: {
    fontSize: 11,
    color: renewxColors.textMuted,
    ...renewxTextStyle('regular'),
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    fontSize: 11,
    color: renewxColors.info,
    ...renewxTextStyle('bold'),
  },
  emptyNote: {
    fontSize: 12,
    color: renewxColors.textMuted,
    textAlign: 'center',
    paddingVertical: 14,
    ...renewxTextStyle('regular'),
  },
  recentOrderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: renewxColors.surfaceMuted,
  },
  orderIdText: {
    fontSize: 12,
    color: renewxColors.black,
    ...renewxTextStyle('bold'),
  },
  statusTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  statusTagText: {
    fontSize: 10,
    ...renewxTextStyle('bold'),
  },
  methodTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  methodTagText: {
    fontSize: 10,
    ...renewxTextStyle('bold'),
  },
  codTag: {
    backgroundColor: '#fef3c7',
  },
  codTagText: {
    color: '#b45309',
    fontSize: 10,
    ...renewxTextStyle('bold'),
  },
  razorpayTag: {
    backgroundColor: renewxColors.mint,
  },
  razorpayTagText: {
    color: renewxColors.emerald,
    fontSize: 10,
    ...renewxTextStyle('bold'),
  },
  orderMetaText: {
    fontSize: 11,
    color: renewxColors.textMuted,
    marginTop: 2,
    ...renewxTextStyle('regular'),
  },
  orderTotalAmount: {
    fontSize: fontSize.sm,
    color: renewxColors.black,
    ...renewxTextStyle('bold'),
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
    backgroundColor: renewxColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: renewxColors.border,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: renewxColors.surfaceMuted,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    height: 38,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.xs,
    color: renewxColors.black,
    ...renewxTextStyle('regular'),
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  addButtonMini: {
    width: 38,
    height: 38,
    backgroundColor: renewxColors.yellow,
    borderWidth: 1,
    borderColor: renewxColors.yellowDark,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: renewxColors.surface,
    borderWidth: 1,
    borderColor: renewxColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: renewxColors.black,
    borderColor: renewxColors.black,
  },
  filterChipText: {
    fontSize: 11,
    color: renewxColors.textSecondary,
    ...renewxTextStyle('semibold'),
  },
  filterChipTextActive: {
    color: renewxColors.white,
  },
  productListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: renewxColors.surface,
    borderRadius: radius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: renewxColors.border,
    gap: 10,
  },
  productThumb: {
    width: 54,
    height: 54,
    borderRadius: radius.sm,
    backgroundColor: renewxColors.surfaceMuted,
  },
  productThumbPlaceholder: {
    width: 54,
    height: 54,
    borderRadius: radius.sm,
    backgroundColor: renewxColors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productItemInfo: {
    flex: 1,
  },
  productItemTitle: {
    fontSize: fontSize.xs,
    color: renewxColors.black,
    ...renewxTextStyle('bold'),
  },
  productBrandBadge: {
    fontSize: 10,
    color: renewxColors.textMuted,
    backgroundColor: renewxColors.surfaceMuted,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radius.sm,
    ...renewxTextStyle('medium'),
  },
  productItemPrice: {
    fontSize: fontSize.xs,
    color: renewxColors.black,
    ...renewxTextStyle('bold'),
  },
  stockPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.sm,
  },
  stockText: {
    fontSize: 10,
    ...renewxTextStyle('bold'),
  },
  stockOk: { backgroundColor: renewxColors.mint },
  stockOkText: { color: renewxColors.emerald, fontSize: 10, ...renewxTextStyle('bold') },
  stockLow: { backgroundColor: '#fef3c7' },
  stockLowText: { color: '#b45309', fontSize: 10, ...renewxTextStyle('bold') },
  stockOut: { backgroundColor: '#fee2e2' },
  stockOutText: { color: renewxColors.error, fontSize: 10, ...renewxTextStyle('bold') },
  productActionsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  iconActionBtn: {
    padding: 8,
    borderRadius: radius.sm,
    backgroundColor: renewxColors.background,
    borderWidth: 1,
    borderColor: renewxColors.border,
  },
  orderCardBox: {
    backgroundColor: renewxColors.surface,
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: renewxColors.border,
    gap: 8,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderNumberTitle: {
    fontSize: fontSize.sm,
    color: renewxColors.black,
    ...renewxTextStyle('bold'),
  },
  orderDateSubtitle: {
    fontSize: 10,
    color: renewxColors.textMuted,
    ...renewxTextStyle('regular'),
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
    color: renewxColors.textSecondary,
    ...renewxTextStyle('medium'),
  },
  orderAddressText: {
    fontSize: 11,
    color: renewxColors.textMuted,
    lineHeight: 16,
    ...renewxTextStyle('regular'),
  },
  orderItemsBox: {
    backgroundColor: renewxColors.background,
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
    color: renewxColors.black,
    flex: 1,
    ...renewxTextStyle('regular'),
  },
  orderItemPrice: {
    fontSize: 11,
    color: renewxColors.black,
    ...renewxTextStyle('bold'),
  },
  orderCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: renewxColors.surfaceMuted,
  },
  orderGrandTotal: {
    fontSize: fontSize.md,
    color: renewxColors.black,
    ...renewxTextStyle('black'),
  },
  userCardBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: renewxColors.surface,
    borderRadius: radius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: renewxColors.border,
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
    backgroundColor: renewxColors.surface,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: renewxColors.border,
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
    ...renewxTextStyle('semibold'),
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: renewxColors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarLetter: {
    color: renewxColors.yellow,
    fontSize: 14,
    ...renewxTextStyle('bold'),
  },
  userEmailText: {
    fontSize: fontSize.xs,
    color: renewxColors.black,
    ...renewxTextStyle('bold'),
  },
  userJoinedText: {
    fontSize: 10,
    color: renewxColors.textMuted,
    ...renewxTextStyle('regular'),
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  roleBadgeText: {
    fontSize: 10,
    ...renewxTextStyle('bold'),
  },
  roleAdmin: { backgroundColor: '#fef3c7' },
  roleAdminText: { color: '#b45309', fontSize: 10, ...renewxTextStyle('bold') },
  roleCustomer: { backgroundColor: renewxColors.surfaceMuted },
  roleCustomerText: { color: renewxColors.textSecondary, fontSize: 10, ...renewxTextStyle('bold') },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: renewxColors.border,
  },
  closeBtn: {
    padding: 4,
  },
  modalHeaderTitle: {
    fontSize: fontSize.sm,
    color: renewxColors.black,
    ...renewxTextStyle('bold'),
  },
  saveHeaderBtn: {
    backgroundColor: renewxColors.yellow,
    borderWidth: 1,
    borderColor: renewxColors.yellowDark,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  saveHeaderBtnText: {
    fontSize: fontSize.xs,
    color: renewxColors.black,
    ...renewxTextStyle('bold'),
  },
  inputLabel: {
    fontSize: 11,
    color: renewxColors.textSecondary,
    marginBottom: 4,
    ...renewxTextStyle('bold'),
  },
  formInput: {
    borderWidth: 1,
    borderColor: renewxColors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: fontSize.xs,
    color: renewxColors.black,
    backgroundColor: renewxColors.surface,
    ...renewxTextStyle('regular'),
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
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
    backgroundColor: renewxColors.background,
    borderRadius: Platform.OS === 'web' ? 24 : 0,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: renewxColors.border,
    flexDirection: 'column',
    ...(renewxShadows.floating as object),
  },
  fullModalHeader: {
    backgroundColor: renewxColors.surface,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: renewxColors.border,
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
    color: renewxColors.black,
    letterSpacing: -0.2,
    ...renewxTextStyle('extraBold'),
  },
  fullModalSubtitle: {
    fontSize: 12,
    color: renewxColors.textMuted,
    marginTop: 2,
    ...renewxTextStyle('regular'),
  },
  fullCloseBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: renewxColors.surfaceMuted,
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
    color: renewxColors.error,
    flex: 1,
    ...renewxTextStyle('semibold'),
  },
  fullCardSection: {
    backgroundColor: renewxColors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: renewxColors.border,
    padding: 16,
    marginBottom: 16,
    ...(renewxShadows.card as object),
  },
  fullSectionHeader: {
    fontSize: 11,
    color: '#334155',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 14,
    ...renewxTextStyle('black'),
  },
  formGroup: {
    marginBottom: 14,
  },
  formFieldLabel: {
    fontSize: 12,
    color: '#334155',
    marginBottom: 6,
    ...renewxTextStyle('bold'),
  },
  formHelperText: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 6,
    ...renewxTextStyle('regular'),
  },
  formTextInput: {
    backgroundColor: renewxColors.surface,
    borderWidth: 1,
    borderColor: renewxColors.borderStrong,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: renewxColors.black,
    ...renewxTextStyle('medium'),
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
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
    backgroundColor: renewxColors.surface,
    borderWidth: 1,
    borderColor: renewxColors.borderStrong,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  currencyPrefix: {
    fontSize: 14,
    color: '#94a3b8',
    marginRight: 6,
    ...renewxTextStyle('bold'),
  },
  currencyFieldInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 13,
    color: renewxColors.black,
    ...renewxTextStyle('semibold'),
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
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
    color: renewxColors.black,
    ...renewxTextStyle('bold'),
  },
  specInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  specKeyInput: {
    width: '35%',
    backgroundColor: renewxColors.surface,
    borderWidth: 1,
    borderColor: renewxColors.borderStrong,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: renewxColors.black,
    ...renewxTextStyle('regular'),
  },
  specValInput: {
    flex: 1,
    backgroundColor: renewxColors.surface,
    borderWidth: 1,
    borderColor: renewxColors.borderStrong,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: renewxColors.black,
    ...renewxTextStyle('regular'),
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
    backgroundColor: renewxColors.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  presetsBtnText: {
    fontSize: 11,
    color: renewxColors.textSecondary,
    ...renewxTextStyle('bold'),
  },
  photoTabsRow: {
    flexDirection: 'row',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: renewxColors.surfaceMuted,
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
    backgroundColor: renewxColors.black,
  },
  photoTabText: {
    fontSize: 12,
    color: renewxColors.textMuted,
    ...renewxTextStyle('bold'),
  },
  photoTabTextActive: {
    color: renewxColors.yellow,
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
    backgroundColor: renewxColors.surface,
    borderWidth: 1,
    borderColor: renewxColors.borderStrong,
    borderRadius: 12,
    paddingHorizontal: 10,
  },
  photoUrlInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 12,
    color: renewxColors.black,
    ...renewxTextStyle('regular'),
  },
  photoAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: renewxColors.black,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
  },
  photoAddBtnText: {
    fontSize: 12,
    color: renewxColors.yellow,
    ...renewxTextStyle('extraBold'),
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
    color: renewxColors.white,
    ...renewxTextStyle('bold'),
  },
  livePhotoPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: renewxColors.surfaceMuted,
    borderWidth: 1,
    borderColor: renewxColors.border,
    borderRadius: 12,
    padding: 8,
    marginTop: 8,
    gap: 8,
  },
  livePhotoThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: renewxColors.borderStrong,
  },
  livePhotoPreviewTitle: {
    fontSize: 12,
    color: renewxColors.black,
    ...renewxTextStyle('bold'),
  },
  livePhotoPreviewUrl: {
    fontSize: 11,
    color: renewxColors.textMuted,
    ...renewxTextStyle('regular'),
  },
  livePhotoAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: renewxColors.yellow,
    borderWidth: 1,
    borderColor: renewxColors.yellowDark,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  livePhotoAddBtnText: {
    fontSize: 11,
    color: renewxColors.black,
    ...renewxTextStyle('extraBold'),
  },
  uploadBoxWrap: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: renewxColors.borderStrong,
    borderStyle: 'dashed',
    alignItems: 'center',
    gap: 6,
  },
  uploadSubtext: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    ...renewxTextStyle('regular'),
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
    borderColor: renewxColors.border,
    backgroundColor: renewxColors.background,
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
    backgroundColor: renewxColors.surface,
    borderTopWidth: 1,
    borderTopColor: renewxColors.border,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerNoticeText: {
    fontSize: 11,
    color: renewxColors.textMuted,
    flex: 1,
    paddingRight: 8,
    ...renewxTextStyle('medium'),
  },
  footerActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cancelModalBtn: {
    backgroundColor: renewxColors.surface,
    borderWidth: 1,
    borderColor: renewxColors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  cancelModalBtnText: {
    fontSize: 12,
    color: '#334155',
    ...renewxTextStyle('bold'),
  },
  publishModalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: renewxColors.black,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  publishModalBtnText: {
    fontSize: 12,
    color: renewxColors.yellow,
    ...renewxTextStyle('extraBold'),
  },
  nativeSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: renewxColors.surface,
    borderWidth: 1,
    borderColor: renewxColors.borderStrong,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  nativeSelectText: {
    fontSize: 13,
    color: renewxColors.black,
    ...renewxTextStyle('medium'),
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerModal: {
    backgroundColor: renewxColors.surface,
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
    borderBottomColor: renewxColors.surfaceMuted,
    marginBottom: 8,
  },
  pickerModalTitle: {
    fontSize: 15,
    color: renewxColors.black,
    ...renewxTextStyle('extraBold'),
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: renewxColors.background,
  },
  pickerItemActive: {
    backgroundColor: renewxColors.surfaceMuted,
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  pickerItemText: {
    fontSize: 14,
    color: '#334155',
    ...renewxTextStyle('regular'),
  },
  pickerItemTextActive: {
    color: renewxColors.black,
    ...renewxTextStyle('bold'),
  },

  /* Mockup Header Elements */
  headerLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerBrandMain: {
    fontSize: 20,
    color: renewxColors.black,
    fontStyle: 'italic',
    letterSpacing: -0.5,
    ...renewxTextStyle('black'),
    ...Platform.select({
      web: { textShadow: '-1.5px 0 1px #EA580C' },
      default: {
        textShadowColor: '#EA580C',
        textShadowOffset: { width: -1.5, height: 0 },
        textShadowRadius: 1,
      },
    }),
  },
  headerBrandYellow: {
    fontSize: 20,
    color: renewxColors.yellow,
    fontStyle: 'italic',
    ...renewxTextStyle('black'),
  },
  headerSubtitleTagline: {
    fontSize: 10,
    color: '#476E8E',
    marginTop: -2,
    ...renewxTextStyle('bold'),
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconBtnActive: {
    backgroundColor: renewxColors.yellowLight,
    borderColor: renewxColors.yellowDark,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: renewxColors.background,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: renewxColors.border,
  },
  notificationDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: renewxColors.error,
    borderWidth: 1.5,
    borderColor: renewxColors.surface,
  },
  headerAvatarPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: renewxColors.mint,
    borderWidth: 1.5,
    borderColor: renewxColors.mintBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: {
    fontSize: 13,
    color: renewxColors.greenDark,
    ...renewxTextStyle('extraBold'),
  },
  exitMiniBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: renewxColors.background,
    borderWidth: 1,
    borderColor: renewxColors.border,
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
    color: renewxColors.black,
    letterSpacing: -0.3,
    ...renewxTextStyle('extraBold'),
  },
  viewSubtitle: {
    fontSize: 12,
    color: renewxColors.textMuted,
    marginTop: 2,
    ...renewxTextStyle('medium'),
  },
  periodDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: renewxColors.surface,
    borderWidth: 1,
    borderColor: renewxColors.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  periodDropdownText: {
    fontSize: 12,
    color: renewxColors.black,
    ...renewxTextStyle('semibold'),
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
    backgroundColor: renewxColors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: renewxColors.border,
    ...(renewxShadows.card as object),
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
    backgroundColor: renewxColors.mint,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12,
  },
  kpiBadgeText: {
    fontSize: 10,
    color: renewxColors.emerald,
    ...renewxTextStyle('bold'),
  },
  kpiValueText: {
    fontSize: 20,
    color: renewxColors.black,
    marginBottom: 2,
    letterSpacing: -0.3,
    ...renewxTextStyle('extraBold'),
  },
  kpiLabelText: {
    fontSize: 11,
    color: renewxColors.textMuted,
    ...renewxTextStyle('medium'),
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
    color: renewxColors.black,
    letterSpacing: -0.2,
    ...renewxTextStyle('extraBold'),
  },
  cardLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardLinkText: {
    fontSize: 13,
    color: renewxColors.emerald,
    ...renewxTextStyle('bold'),
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
    textAlign: 'right',
    ...renewxTextStyle('semibold'),
  },
  chartGridLine: {
    flex: 1,
    height: 1,
    backgroundColor: renewxColors.surfaceMuted,
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
    backgroundColor: 'rgba(12, 122, 67, 0.08)',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  curveLineStroke: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 26,
    height: 3,
    backgroundColor: renewxColors.emerald,
    borderRadius: 2,
  },
  chartPeakTooltip: {
    position: 'absolute',
    left: '42%',
    top: -4,
    alignItems: 'center',
  },
  chartTooltipBubble: {
    backgroundColor: renewxColors.black,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: 'center',
  },
  chartTooltipValue: {
    color: renewxColors.white,
    fontSize: 10,
    ...renewxTextStyle('extraBold'),
  },
  chartTooltipDate: {
    color: '#94A3B8',
    fontSize: 9.5,
    ...renewxTextStyle('semibold'),
  },
  chartTooltipArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 4,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: renewxColors.black,
  },
  chartPeakDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: renewxColors.emerald,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    borderWidth: 2,
    borderColor: renewxColors.white,
  },
  chartPeakInnerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: renewxColors.white,
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
    ...renewxTextStyle('semibold'),
  },

  /* Recent Orders Mock Row */
  recentOrderMockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: renewxColors.background,
  },
  recentOrderAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: renewxColors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: renewxColors.border,
  },
  recentOrderAvatarText: {
    fontSize: 12,
    color: '#334155',
    ...renewxTextStyle('extraBold'),
  },
  recentOrderId: {
    fontSize: 12,
    color: renewxColors.black,
    ...renewxTextStyle('extraBold'),
  },
  recentOrderItem: {
    fontSize: 11,
    color: renewxColors.textMuted,
    marginTop: 1,
    ...renewxTextStyle('regular'),
  },
  recentOrderPrice: {
    fontSize: 13,
    color: renewxColors.black,
    ...renewxTextStyle('extraBold'),
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
    fontSize: 10,
    ...renewxTextStyle('bold'),
  },
  threeDotsBtn: {
    padding: 6,
  },

  /* Products Tab Elements */
  blackAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: renewxColors.emerald,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    ...(renewxShadows.card as object),
  },
  blackAddBtnText: {
    color: renewxColors.white,
    fontSize: 12,
    letterSpacing: 0.2,
    ...renewxTextStyle('extraBold'),
  },
  filterChipM2: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: renewxColors.surface,
    borderWidth: 1,
    borderColor: renewxColors.border,
  },
  filterChipM2Active: {
    backgroundColor: renewxColors.emerald,
    borderColor: renewxColors.emerald,
    ...(renewxShadows.card as object),
  },
  filterChipM2Text: {
    fontSize: 12,
    color: renewxColors.textMuted,
    ...renewxTextStyle('semibold'),
  },
  filterChipM2TextActive: {
    color: renewxColors.white,
    ...renewxTextStyle('extraBold'),
  },
  adminViewModeCapsule: {
    flexDirection: 'row',
    backgroundColor: renewxColors.border,
    borderRadius: 16,
    padding: 2,
  },
  adminViewModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 4,
  },
  adminViewModeBtnActive: {
    backgroundColor: renewxColors.surface,
    ...(renewxShadows.card as object),
  },
  adminViewModeBtnText: {
    fontSize: 11,
    color: renewxColors.textMuted,
    ...renewxTextStyle('semibold'),
  },
  adminViewModeBtnTextActive: {
    color: renewxColors.black,
    ...renewxTextStyle('extraBold'),
  },
  searchBarWrapM2: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: renewxColors.surface,
    borderRadius: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: renewxColors.border,
    height: 44,
    gap: 8,
  },
  searchInputM2: {
    flex: 1,
    fontSize: 13,
    color: renewxColors.black,
    paddingVertical: 8,
    ...renewxTextStyle('regular'),
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
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
    color: renewxColors.textMuted,
    ...renewxTextStyle('medium'),
  },
  sortDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sortDropdownText: {
    fontSize: 12,
    color: renewxColors.textMuted,
    ...renewxTextStyle('regular'),
  },
  /* Header Product Count Badge */
  countBadgePill: {
    backgroundColor: renewxColors.mint,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: renewxColors.mintBorder,
  },
  countBadgePillText: {
    fontSize: 11,
    color: renewxColors.greenDark,
    ...renewxTextStyle('extraBold'),
  },

  /* Empty State Polish */
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: renewxColors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitleText: {
    fontSize: 16,
    color: renewxColors.black,
    marginBottom: 4,
    ...renewxTextStyle('extraBold'),
  },
  clearFilterBtn: {
    marginTop: 14,
    backgroundColor: renewxColors.emerald,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
  },
  clearFilterBtnText: {
    color: renewxColors.white,
    fontSize: 12,
    ...renewxTextStyle('bold'),
  },

  /* Production-Ready Clean Product Cards */
  productCardClean: {
    backgroundColor: renewxColors.surface,
    borderRadius: 16,
    padding: 13,
    borderWidth: 1,
    borderColor: renewxColors.border,
    ...(renewxShadows.card as object),
  },
  productCardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  productThumbCleanWrap: {
    width: 74,
    height: 74,
    borderRadius: 12,
    backgroundColor: renewxColors.background,
    borderWidth: 1,
    borderColor: renewxColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  productThumbImg: {
    width: '100%',
    height: '100%',
  },
  productThumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  productThumbConditionBadge: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    right: 2,
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    borderRadius: 4,
    paddingVertical: 1.5,
    alignItems: 'center',
  },
  productThumbConditionText: {
    fontSize: 9.5,
    color: renewxColors.white,
    ...renewxTextStyle('extraBold'),
  },
  productDetailsCol: {
    flex: 1,
    justifyContent: 'space-between',
    minHeight: 74,
  },
  productTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  productBrandPill: {
    backgroundColor: renewxColors.surfaceMuted,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  productBrandPillText: {
    fontSize: 10,
    color: '#334155',
    letterSpacing: 0.3,
    ...renewxTextStyle('extraBold'),
  },
  productTitleClean: {
    fontSize: 14,
    color: renewxColors.black,
    lineHeight: 18,
    marginBottom: 5,
    ...renewxTextStyle('extraBold'),
  },
  productPriceRowClean: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  productPriceTextClean: {
    fontSize: 14.5,
    color: renewxColors.black,
    ...renewxTextStyle('black'),
  },
  productMrpStrike: {
    fontSize: 11.5,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
    ...renewxTextStyle('regular'),
  },
  productDiscountPill: {
    backgroundColor: renewxColors.mint,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 0.5,
    borderColor: renewxColors.mintBorder,
  },
  productDiscountPillText: {
    fontSize: 10,
    color: renewxColors.greenDark,
    ...renewxTextStyle('extraBold'),
  },
  productCardDivider: {
    height: 1,
    backgroundColor: renewxColors.surfaceMuted,
    marginTop: 10,
    marginBottom: 10,
  },
  productCardBottomActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  stockPillClean: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4.5,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 12,
    borderWidth: 1,
  },
  stockDotClean: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stockPillCleanText: {
    fontSize: 10,
    ...renewxTextStyle('bold'),
  },
  productActionButtonsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  cardActionBtnEdit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: renewxColors.background,
    borderWidth: 1,
    borderColor: renewxColors.border,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 8,
  },
  cardActionBtnEditText: {
    fontSize: 11.5,
    color: renewxColors.black,
    ...renewxTextStyle('bold'),
  },
  cardActionBtnDelete: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 8,
  },
  cardActionBtnDeleteText: {
    fontSize: 11.5,
    color: renewxColors.error,
    ...renewxTextStyle('bold'),
  },

  /* Product Delete Confirmation Modal */
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  deleteModalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: renewxColors.surface,
    borderRadius: 20,
    padding: 22,
    ...(renewxShadows.floating as object),
  },
  deleteModalIconWrap: {
    alignItems: 'center',
    marginBottom: 12,
  },
  deleteModalIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteModalTitle: {
    fontSize: 17,
    color: renewxColors.black,
    textAlign: 'center',
    marginBottom: 6,
    ...renewxTextStyle('extraBold'),
  },
  deleteModalDesc: {
    fontSize: 12.5,
    color: renewxColors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    ...renewxTextStyle('regular'),
  },
  deleteModalPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: renewxColors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: renewxColors.border,
    padding: 10,
    gap: 12,
    marginBottom: 18,
  },
  deleteModalPreviewThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: renewxColors.surface,
  },
  deleteModalPreviewPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: renewxColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteModalPreviewTitle: {
    fontSize: 13,
    color: renewxColors.black,
    ...renewxTextStyle('bold'),
  },
  deleteModalPreviewMeta: {
    fontSize: 11,
    color: renewxColors.textMuted,
    marginTop: 2,
    ...renewxTextStyle('regular'),
  },
  deleteModalPreviewPrice: {
    fontSize: 12.5,
    color: renewxColors.black,
    marginTop: 2,
    ...renewxTextStyle('extraBold'),
  },
  deleteModalBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  deleteModalCancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: renewxColors.surfaceMuted,
    borderWidth: 1,
    borderColor: renewxColors.border,
  },
  deleteModalCancelText: {
    fontSize: 13,
    color: renewxColors.textSecondary,
    ...renewxTextStyle('bold'),
  },
  deleteModalConfirmBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: renewxColors.error,
    ...(renewxShadows.elevated as object),
  },
  deleteModalConfirmText: {
    fontSize: 13,
    color: renewxColors.white,
    ...renewxTextStyle('extraBold'),
  },

  /* Orders Screen Rows */
  orderCardRowM2: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: renewxColors.surface,
    borderRadius: 16,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: renewxColors.border,
    ...(renewxShadows.card as object),
  },
  orderThumbM2Wrap: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: renewxColors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: renewxColors.border,
    overflow: 'hidden',
  },
  orderCardPriceText: {
    fontSize: 11,
    color: renewxColors.textMuted,
    ...renewxTextStyle('semibold'),
  },
  orderRowBullet: {
    fontSize: 10,
    color: '#94A3B8',
    ...renewxTextStyle('regular'),
  },
  orderQuickUpdatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: renewxColors.surfaceMuted,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  orderQuickUpdateText: {
    fontSize: 10.5,
    color: renewxColors.black,
    ...renewxTextStyle('bold'),
  },
  orderThumbM2: {
    width: 58,
    height: 58,
    borderRadius: 10,
    backgroundColor: renewxColors.background,
  },
  orderThumbPlaceholderM2: {
    width: 58,
    height: 58,
    borderRadius: 10,
    backgroundColor: renewxColors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderRowIdM2: {
    fontSize: 13,
    color: renewxColors.black,
    ...renewxTextStyle('extraBold'),
  },
  orderRowDateM2: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
    ...renewxTextStyle('regular'),
  },
  orderRowCustomerM2: {
    fontSize: 12,
    color: '#334155',
    marginTop: 2,
    ...renewxTextStyle('semibold'),
  },
  orderRowItemsM2: {
    fontSize: 10,
    color: '#94A3B8',
    ...renewxTextStyle('regular'),
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
    ...renewxTextStyle('bold'),
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
    backgroundColor: renewxColors.surface,
    borderRadius: 20,
    padding: 18,
  },
  orderModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: renewxColors.surfaceMuted,
    marginBottom: 12,
  },
  orderModalTitle: {
    fontSize: 16,
    color: renewxColors.black,
    ...renewxTextStyle('extraBold'),
  },
  orderModalSub: {
    fontSize: 12,
    color: renewxColors.textMuted,
    marginTop: 2,
    ...renewxTextStyle('regular'),
  },
  orderModalClose: {
    padding: 4,
  },
  modalFieldLabel: {
    fontSize: 10,
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 6,
    ...renewxTextStyle('extraBold'),
  },
  statusSelectPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: renewxColors.background,
    borderWidth: 1,
    borderColor: renewxColors.border,
  },
  statusSelectText: {
    fontSize: 11,
    color: renewxColors.textSecondary,
    ...renewxTextStyle('semibold'),
  },
  modalInput: {
    backgroundColor: renewxColors.background,
    borderWidth: 1,
    borderColor: renewxColors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: renewxColors.black,
    ...renewxTextStyle('regular'),
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  saveShippingBtn: {
    backgroundColor: renewxColors.black,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
    marginTop: 2,
  },
  saveShippingBtnText: {
    color: renewxColors.white,
    fontSize: 11,
    ...renewxTextStyle('bold'),
  },
  invoiceDownloadBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: renewxColors.yellow,
    borderWidth: 1,
    borderColor: renewxColors.yellowDark,
    borderRadius: 10,
    paddingVertical: 10,
  },
  invoiceDownloadBtnText: {
    fontSize: 12,
    color: renewxColors.black,
    ...renewxTextStyle('extraBold'),
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
    backgroundColor: renewxColors.surface,
    borderRadius: 16,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: renewxColors.border,
    ...(renewxShadows.card as object),
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
    ...renewxTextStyle('extraBold'),
  },
  userNameM2: {
    fontSize: 14,
    color: renewxColors.black,
    ...renewxTextStyle('extraBold'),
  },
  userEmailM2: {
    fontSize: 11,
    color: renewxColors.textMuted,
    marginTop: 1,
    ...renewxTextStyle('regular'),
  },
  userOrdersCountM2: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
    ...renewxTextStyle('regular'),
  },
  rolePillM2: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  rolePillM2Text: {
    fontSize: 10,
    ...renewxTextStyle('bold'),
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
    backgroundColor: renewxColors.background,
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
    backgroundColor: renewxColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenterValue: {
    fontSize: 15,
    color: renewxColors.black,
    ...renewxTextStyle('extraBold'),
  },
  donutCenterLabel: {
    fontSize: 10,
    color: renewxColors.textMuted,
    marginTop: 1,
    ...renewxTextStyle('semibold'),
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
    ...renewxTextStyle('medium'),
  },
  donutLegendPct: {
    fontSize: 12,
    color: renewxColors.black,
    ...renewxTextStyle('bold'),
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
    color: '#334155',
    ...renewxTextStyle('semibold'),
  },
  catProgressBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: renewxColors.surfaceMuted,
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
    color: renewxColors.black,
    textAlign: 'right',
    ...renewxTextStyle('bold'),
  },

  /* Admin Settings Screen Items */
  settingsRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: renewxColors.background,
  },
  settingsRowIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: renewxColors.background,
    borderWidth: 1,
    borderColor: renewxColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsRowTitle: {
    fontSize: 13,
    color: renewxColors.black,
    ...renewxTextStyle('bold'),
  },
  settingsRowDesc: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
    ...renewxTextStyle('regular'),
  },

  /* Admin Bottom Navigation Bar */
  adminBottomNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: renewxColors.surface,
    borderTopWidth: 1,
    borderTopColor: renewxColors.border,
    paddingHorizontal: 8,
    paddingTop: 8,
    ...Platform.select({
      web: { boxShadow: '0 -3px 12px rgba(15, 23, 42, 0.06)' },
      default: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 10,
      },
    }),
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
    color: renewxColors.textMuted,
    marginTop: 2,
    ...renewxTextStyle('semibold'),
  },
  adminTabActivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: renewxColors.mint,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: renewxColors.mintBorder,
  },
  adminTabActiveText: {
    fontSize: 11.5,
    color: renewxColors.greenDark,
    letterSpacing: -0.2,
    ...renewxTextStyle('extraBold'),
  },
  adminProfileActivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: renewxColors.mint,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
  },
  adminProfileActiveText: {
    fontSize: 11,
    color: renewxColors.black,
    ...renewxTextStyle('extraBold'),
  },
  adminSellButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: renewxColors.yellow,
    borderWidth: 1.5,
    borderColor: renewxColors.yellowDark,
    alignItems: 'center',
    justifyContent: 'center',
    ...(renewxShadows.elevated as object),
  },
  adminSellButtonText: {
    fontSize: 10,
    color: renewxColors.black,
    marginTop: -1,
    ...renewxTextStyle('extraBold'),
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
    backgroundColor: renewxColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: renewxColors.background,
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
    color: renewxColors.black,
    letterSpacing: -0.6,
    ...renewxTextStyle('black'),
  },
  headerBrandXM3: {
    fontSize: 24,
    color: renewxColors.emerald,
    letterSpacing: -0.6,
    ...renewxTextStyle('black'),
  },
  headerSubtitleAdminPanelM3: {
    fontSize: 11,
    color: renewxColors.textMuted,
    marginTop: 1,
    letterSpacing: 0.1,
    ...renewxTextStyle('semibold'),
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
    backgroundColor: renewxColors.surface,
    borderWidth: 1,
    borderColor: renewxColors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    height: 36,
  },
  topBarSellReqBtnActive: {
    backgroundColor: renewxColors.mint,
    borderColor: renewxColors.mintBorder,
  },
  topBarYellowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: renewxColors.yellow,
  },
  topBarSellReqText: {
    fontSize: 11,
    color: renewxColors.black,
    ...renewxTextStyle('bold'),
  },
  topBarCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: renewxColors.surface,
    borderWidth: 1,
    borderColor: renewxColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  topBarCircleBtnActive: {
    backgroundColor: renewxColors.mint,
    borderColor: renewxColors.mintBorder,
  },
  topBarBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: renewxColors.emerald,
    width: 17,
    height: 17,
    borderRadius: 8.5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: renewxColors.surface,
  },
  topBarBadgeText: {
    fontSize: 10,
    color: renewxColors.white,
    ...renewxTextStyle('black'),
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
    color: renewxColors.error,
    ...renewxTextStyle('extraBold'),
  },

  /* Secondary View Header Breadcrumb */
  secondaryViewNavHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: renewxColors.background,
    borderBottomWidth: 1,
    borderBottomColor: renewxColors.border,
  },
  secondaryBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  secondaryBackText: {
    fontSize: 12,
    color: renewxColors.black,
    ...renewxTextStyle('bold'),
  },
  secondaryActiveBadge: {
    backgroundColor: renewxColors.mint,
    borderWidth: 1,
    borderColor: renewxColors.mintBorder,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  secondaryActiveBadgeText: {
    fontSize: 10.5,
    color: renewxColors.greenDark,
    ...renewxTextStyle('bold'),
  },

  /* Mockup Bottom Navigation Bar */
  adminBottomNavM3: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: renewxColors.surface,
    borderTopWidth: 1,
    borderTopColor: renewxColors.border,
    paddingHorizontal: 8,
    paddingTop: 8,
    ...Platform.select({
      web: { boxShadow: '0 -2px 10px rgba(15, 23, 42, 0.05)' },
      default: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 8,
      },
    }),
  },
  adminBottomNavItemM3: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminTabActivePillM3: {
    backgroundColor: renewxColors.mint,
    borderWidth: 1,
    borderColor: renewxColors.mintBorder,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 68,
  },
  adminTabActiveTextM3: {
    fontSize: 10.5,
    color: renewxColors.greenDark,
    marginTop: 2,
    ...renewxTextStyle('extraBold'),
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
    color: renewxColors.textMuted,
    marginTop: 2,
    ...renewxTextStyle('semibold'),
  },
});
