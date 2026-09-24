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
import { useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import BrandsView from '@/components/admin/BrandsView';
import ImagePickerButton from '@/components/ImagePickerButton';
import * as Clipboard from 'expo-clipboard';
import { sanitizeImageUrl } from '@/lib/imageUtils';
import { useSafeHeaderTop } from '@/lib/useSafeHeaderTop';


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
  const { isAdmin, loading: authLoading } = useAuth();

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
      {/* Minimal Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={styles.headerTitleRow}>
            <Image
              source={require('@/assets/logo.png')}
              style={styles.headerLogoImage}
              resizeMode="contain"
            />
            <Text style={styles.headerTitle}>RenewX Admin</Text>
            <View style={styles.adminBadge}>
              <Text style={styles.adminBadgeText}>PORTAL</Text>
            </View>
          </View>
          <Text style={styles.headerSubtitle}>Management Portal</Text>
        </View>

        <TouchableOpacity onPress={handleExit} style={styles.addActionButton} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={18} color="#000" />
          <Text style={styles.addActionButtonText}>Exit</Text>
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
    </View>
  );
}



function TradeInsView() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isSmallScreen = screenWidth < 768;

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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

  const load = useCallback(async () => {
    setLoading(true);
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
    }
  }, [statusFilter, toast]);

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
        image_url: imageUrl || 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&q=80',
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

  if (loading) return <View style={styles.centerBox}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <View style={{ flex: 1, position: 'relative' }}>
      <View style={styles.searchBarContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color="#94a3b8" />
          <TextInput value={search} onChangeText={setSearch} placeholder="Search device, customer or phone..." placeholderTextColor="#94a3b8" style={styles.searchInput} />
        </View>
        <TouchableOpacity onPress={load} style={styles.addButtonMini}><Ionicons name="refresh" size={18} color="#000" /></TouchableOpacity>
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

      {filtered.length === 0 ? (
        <View style={styles.centerBox}><Ionicons name="pricetag-outline" size={38} color="#94a3b8" /><Text style={styles.emptyNote}>{search ? 'No requests match your search.' : 'No sell requests found.'}</Text></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 100, gap: 14 }} showsVerticalScrollIndicator={false}>
          {filtered.map((item) => {
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
          })}
        </ScrollView>
      )}

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
                      { label: 'Warranty', val: false, custom: 'Expired' },
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
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [sellRequests, setSellRequests] = useState<any[]>([]);

  const loadStats = useCallback(async () => {
    try {
      const [prods, ords, sell] = await Promise.all([
        api.products.getAll().catch((): any[] => []),
        api.orders.getAll().catch((): any[] => []),
        api.tradeIn.getAll().catch((): any[] => []),
      ]);
      setProducts((prods as ProductRow[]) || []);
      setOrders(ords || []);
      setSellRequests((sell as any[]) || []);
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

      {/* Recent Sell Requests */}
      <View style={styles.cardContainer}>
        <View style={styles.cardTopRow}>
          <View>
            <Text style={styles.cardHeaderTitle}>Recent Sell Requests</Text>
            <Text style={styles.cardHeaderSub}>Latest device resale submissions</Text>
          </View>
          <TouchableOpacity onPress={() => onNavigate('tradeIns')} style={styles.viewAllBtn}>
            <Text style={styles.viewAllText}>View All</Text>
            <Ionicons name="chevron-forward" size={12} color="#2563eb" />
          </TouchableOpacity>
        </View>

        {sellRequests.length === 0 ? (
          <Text style={styles.emptyNote}>No sell requests recorded yet.</Text>
        ) : (
          sellRequests.slice(0, 5).map((item) => {
            const status = String(item.status || 'pending');
            const statusStyle =
              status === 'approved'
                ? { color: '#15803d', backgroundColor: '#dcfce7' }
                : status === 'rejected'
                ? { color: '#b91c1c', backgroundColor: '#fee2e2' }
                : { color: '#b45309', backgroundColor: '#fef3c7' };
            return (
              <TouchableOpacity
                key={String(item.id || item._id)}
                style={styles.recentOrderRow}
                onPress={() => onNavigate('tradeIns')}
                activeOpacity={0.8}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.orderIdText}>
                    {String(item.brand || 'Device')} {String(item.model || '')}
                  </Text>
                  <Text style={styles.orderMetaText}>
                    {String(item.customer_name || item.customer_phone || 'Customer')}
                  </Text>
                </View>
                <View style={[styles.statusTag, { backgroundColor: statusStyle.backgroundColor }]}>
                  <Text style={[styles.statusTagText, { color: statusStyle.color }]}>
                    {status.replace(/_/g, ' ').toUpperCase()}
                  </Text>
                </View>
              </TouchableOpacity>
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
  const [search, setSearch] = useState('');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [shippingDrafts, setShippingDrafts] = useState<Record<string, { courier: string; courierPhone: string; tracking: string }>>({});
  const toast = useToast();

  const fetchOrders = useCallback(async () => {
    setLoading(true);
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
    }
  }, [toast]);

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

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.searchBarContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color="#94a3b8" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search order ID, customer or phone..."
            placeholderTextColor="#94a3b8"
            style={styles.searchInput}
          />
        </View>
        <TouchableOpacity onPress={fetchOrders} style={styles.addButtonMini}>
          <Ionicons name="refresh" size={18} color="#000" />
        </TouchableOpacity>
      </View>

      <View style={{ height: 42, marginVertical: 8 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.md, gap: 6 }}>
          {['all', 'pending', 'verified', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'].map((st) => {
            const active = filterStatus === st;
            return (
              <TouchableOpacity key={st} onPress={() => setFilterStatus(st)} style={[styles.filterChip, active && styles.filterChipActive]}>
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {st === 'all' ? 'All' : st.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {filtered.length === 0 ? (
        <View style={styles.centerBox}>
          <Ionicons name="receipt-outline" size={38} color="#94a3b8" />
          <Text style={styles.emptyNote}>{search ? 'No orders match your search.' : 'No orders found.'}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 100, gap: 12 }} showsVerticalScrollIndicator={false}>
          {filtered.map((order) => {
            const orderId = String(order.id || order._id);
            const isCod = order.payment_method === 'cod';
            const statusMatch = STATUS_OPTIONS.find((x) => x.id === order.status);
            const isUpdating = updatingOrderId === orderId;
            const draft = shippingDrafts[orderId] || { courier: String(order.courier || ''), tracking: String(order.tracking_number || '') };
            return (
              <View key={orderId} style={styles.orderCardBox}>
                <View style={styles.orderCardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.orderNumberTitle}>Order #{orderId.slice(-8).toUpperCase()}</Text>
                    <Text style={styles.orderDateSubtitle}>
                      {new Date(order.created_at || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
                  </View>
                  <View style={{ width: 150 }}>
                    <SelectPicker
                      value={String(order.status || 'pending')}
                      options={statusPickerOptions}
                      placeholder="Order status"
                      disabled={isUpdating}
                      onChange={(value) => handleUpdateStatus(orderId, value)}
                    />
                  </View>
                </View>

                <View style={styles.orderCustomerRow}>
                  <Ionicons name="person-outline" size={14} color="#64748b" />
                  <Text style={styles.orderCustomerText}>
                    {order.customer_info?.name || order.customer_name || 'Customer'} • {order.customer_info?.phone || order.phone || 'No phone'}
                  </Text>
                </View>
                {order.customer_info?.address ? <Text style={styles.orderAddressText}>{order.customer_info.address}</Text> : null}
                {order.customer_info?.pincode ? <Text style={styles.orderAddressText}>PIN {order.customer_info.pincode}</Text> : null}

                <View style={styles.orderItemsBox}>
                  {(order.order_items || []).map((item: any, i: number) => (
                    <View key={i} style={styles.orderItemLine}>
                      <Text style={styles.orderItemName} numberOfLines={1}>{item.product_name || item.name || 'Product'} × {item.quantity}</Text>
                      <Text style={styles.orderItemPrice}>₹{Number(item.price * item.quantity).toLocaleString('en-IN')}</Text>
                    </View>
                  ))}
                </View>

                <View style={{ marginTop: 4 }}>
                  <Text style={styles.inputLabel}>Shipping</Text>
                  <View style={styles.formRowTwo}>
                    <TextInput
                      value={draft.courier}
                      onChangeText={(v) => setShippingDrafts((p) => ({ ...p, [orderId]: { ...draft, courier: v } }))}
                      placeholder="Courier service / company"
                      placeholderTextColor="#94a3b8"
                      style={[styles.formInput, { flex: 1 }]}
                    />
                    <TextInput
                      value={draft.courierPhone}
                      onChangeText={(v) => setShippingDrafts((p) => ({ ...p, [orderId]: { ...draft, courierPhone: v } }))}
                      placeholder="Courier mobile"
                      placeholderTextColor="#94a3b8"
                      keyboardType="phone-pad"
                      style={[styles.formInput, { flex: 1 }]}
                    />
                    <TextInput
                      value={draft.tracking}
                      onChangeText={(v) => setShippingDrafts((p) => ({ ...p, [orderId]: { ...draft, tracking: v } }))}
                      placeholder="Tracking number"
                      placeholderTextColor="#94a3b8"
                      style={[styles.formInput, { flex: 1 }]}
                    />
                  </View>
                  <TouchableOpacity
                    disabled={isUpdating}
                    onPress={() => applyStatus(orderId, order.status || 'pending')}
                    style={{ marginTop: 8, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingVertical: 9, alignItems: 'center' }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '800', color: colors.text }}>Save shipping details</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.orderCardFooter}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={[styles.methodTag, isCod ? styles.codTag : styles.razorpayTag]}>
                      <Text style={[styles.methodTagText, isCod ? styles.codTagText : styles.razorpayTagText]}>{isCod ? 'COD' : 'ONLINE'}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDeleteOrder(orderId)}
                      disabled={isUpdating}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: radius.sm,
                        backgroundColor: '#fef2f2',
                        borderWidth: 1,
                        borderColor: '#fecaca',
                        opacity: isUpdating ? 0.5 : 1,
                      }}
                    >
                      {isUpdating ? (
                        <ActivityIndicator size={12} color="#dc2626" />
                      ) : (
                        <Ionicons name="trash-outline" size={13} color="#dc2626" />
                      )}
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#dc2626' }}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.orderGrandTotal}>₹{Number(order.subtotal || order.total || 0).toLocaleString('en-IN')}</Text>
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
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [editRole, setEditRole] = useState<'admin' | 'customer'>('customer');
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

  const handleRoleChange = (targetUser: Profile, nextRole: 'admin' | 'customer') => {
    const userId = String(targetUser.id || (targetUser as any)._id || '');
    if (!userId || nextRole === targetUser.role) return;

    confirmAction(
      'Change User Role',
      `Change ${targetUser.email} to ${nextRole === 'admin' ? 'ADMIN' : 'CUSTOMER'}?`,
      async () => {
        try {
          setUpdatingId(userId);
          const updated = await api.users.updateRole(userId, nextRole);
          const savedRole = updated?.role || updated?.data?.role || nextRole;
          setProfiles((prev) =>
            prev.map((p) =>
              String(p.id || (p as any)._id) === userId ? { ...p, role: savedRole } : p
            )
          );
          toast.success(`${targetUser.email} is now ${savedRole}`, 'Role Updated');
        } catch (err: any) {
          toast.error(err?.message || 'Failed to update user role');
          await fetchUsers();
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
                  <View style={{ width: 105 }}>
                    <SelectPicker
                      value={isAdmin ? 'admin' : 'customer'}
                      options={[
                        { value: 'customer', label: 'User' },
                        { value: 'admin', label: 'Admin' },
                      ]}
                      placeholder="Role"
                      disabled={isUpdating}
                      onChange={(value) => {
                        const nextRole = value as 'admin' | 'customer';
                        if (nextRole === (isAdmin ? 'admin' : 'customer')) return;
                        handleRoleChange(user, nextRole);
                      }}
                    />
                  </View>
                  <TouchableOpacity
                    onPress={() => openEditUser(user)}
                    disabled={isUpdating}
                    style={styles.iconActionBtn}
                  >
                    <Ionicons name="pencil-outline" size={16} color="#2563eb" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteUser(user)}
                    disabled={isUpdating}
                    style={styles.iconActionBtn}
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

  // 1. General Details
  const [title, setTitle] = useState(product?.name ?? '');
  const [category, setCategory] = useState(product?.category ?? 'Smartphones');
  const [brand, setBrand] = useState(product?.brand ?? '');
  const [model, setModel] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [isCustomModelActive, setIsCustomModelActive] = useState(false);

  // 2. Pricing & Inventory
  const [sellingPrice, setSellingPrice] = useState(product ? String(product.price) : '');
  const [originalMsrp, setOriginalMsrp] = useState(product ? String(product.original_price) : '');
  const [stockQty, setStockQty] = useState(product ? String(product.stock) : '');
  const [storeStatus, setStoreStatus] = useState('');

  // 3. Hardware Attributes
  const [storage, setStorage] = useState('');
  const [color, setColor] = useState('');
  const [conditionGrade, setConditionGrade] = useState('');
  const [batteryHealth, setBatteryHealth] = useState('');
  const [conditionTitle, setConditionTitle] = useState('');
  const [conditionDescription, setConditionDescription] = useState('');
  const [highlights, setHighlights] = useState('');

  // Dynamic Specifications
  const [specsList, setSpecsList] = useState<SpecItem[]>([]);

  // 4. Product Photography
  const [imageTab, setImageTab] = useState<'url' | 'upload'>('url');
  const [inputImageUrl, setInputImageUrl] = useState('');
  const [images, setImages] = useState<string[]>(
    product?.image_url ? [product.image_url] : []
  );

  const [catalogLoading, setCatalogLoading] = useState(false);
  const [dbBrandRows, setDbBrandRows] = useState<any[]>([]);
  const [dbBrands, setDbBrands] = useState<string[]>([]);
  const [dbModels, setDbModels] = useState<any[]>([]);
  const [customBrand, setCustomBrand] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live Brands & Models from the backend. No demo/fallback catalog is used.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCatalogLoading(true);
      try {
        const brandsRes = await api.brands.getAll({ category });
        if (cancelled) return;
        const rows = Array.isArray(brandsRes) ? brandsRes : [];
        setDbBrandRows(rows);
        setDbBrands(Array.from(new Set(rows.map((b: any) => String(b?.name || '').trim()).filter(Boolean))));
      } catch (err: any) {
        if (!cancelled) {
          setDbBrandRows([]);
          setDbBrands([]);
          setError(err?.message || 'Unable to load brands. Please retry.');
        }
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [category]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!brand) {
        setDbModels([]);
        return;
      }
      setCatalogLoading(true);
      try {
        const selectedBrand = dbBrandRows.find((b: any) => String(b?.name || '').toLowerCase() === brand.toLowerCase());
        const params: any = { category };
        if (selectedBrand?.id) params.brand_id = String(selectedBrand.id);
        const modelsRes = await api.models.getAll(params);
        if (cancelled) return;
        const rows = Array.isArray(modelsRes) ? modelsRes : [];
        const filtered = rows.filter((m: any) => {
          if (!selectedBrand?.id) {
            const modelBrand = String(m?.brand_name || m?.brand || '').toLowerCase();
            return !modelBrand || modelBrand === brand.toLowerCase();
          }
          return !m?.brand_id || String(m.brand_id) === String(selectedBrand.id);
        });
        setDbModels(Array.from(new Set(filtered.map((m: any) => String(m?.name || '').trim()).filter(Boolean))));
      } catch (err: any) {
        if (!cancelled) {
          setDbModels([]);
          setError(err?.message || 'Unable to load models. Please retry.');
        }
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [brand, category, dbBrandRows]);

  // Pre-fill on editing product
  useEffect(() => {
    if (product) {
      setTitle(product.name || '');
      setCategory(product.category || 'Smartphones');
      setBrand(product.brand || '');
      setSellingPrice(product.price ? String(product.price) : '');
      setOriginalMsrp(product.original_price ? String(product.original_price) : '');
      setStockQty(product.stock !== undefined ? String(product.stock) : '1');
      setConditionDescription(product.description || '');
      if (product.image_url) setImages([product.image_url]);

      if (Array.isArray(product.specs)) {
        const remainingSpecs: SpecItem[] = [];
        const extractedHighlights: string[] = [];
        product.specs.forEach((s) => {
          if (typeof s !== 'string') return;
          if (s.startsWith('Storage: ')) setStorage(s.replace('Storage: ', ''));
          else if (s.startsWith('Color: ')) setColor(s.replace('Color: ', ''));
          else if (s.startsWith('Battery: ')) setBatteryHealth(s.replace('Battery: ', '').replace('%', ''));
          else if (s.startsWith('Highlight: ')) extractedHighlights.push(s.replace('Highlight: ', ''));
          else if (s.includes(': ')) {
            const [k, ...v] = s.split(': ');
            remainingSpecs.push({ id: String(Math.random()), key: k, value: v.join(': ') });
          }
        });
        if (extractedHighlights.length) setHighlights(extractedHighlights.join('\n'));
        if (remainingSpecs.length) setSpecsList(remainingSpecs);
      }
    }
  }, [product]);

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

  const addImage = (overrideUrl?: string) => {
    const raw = typeof overrideUrl === 'string' ? overrideUrl : inputImageUrl;
    if (!raw || !raw.trim()) return;
    const clean = sanitizeImageUrl(raw);
    if (!clean) return;
    setImages((prev) => [...prev, clean]);
    setInputImageUrl('');
  };

  const handlePasteClipboard = async () => {
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && (navigator as any).clipboard?.read) {
        try {
          const items = await (navigator as any).clipboard.read();
          for (const item of items) {
            const imageType = item.types.find((t: string) => t.startsWith('image/'));
            if (imageType) {
              const blob = await item.getType(imageType);
              const reader = new FileReader();
              reader.onload = async () => {
                const base64Data = reader.result as string;
                if (base64Data) {
                  addImage(base64Data);
                  toast.success('Pasted image from clipboard');
                }
              };
              reader.readAsDataURL(blob);
              return;
            }
          }
        } catch {
          // fallback
        }
      }

      const str = await Clipboard.getStringAsync();
      if (str && str.trim()) {
        const clean = sanitizeImageUrl(str);
        if (clean) {
          addImage(clean);
          toast.success('Pasted image from clipboard');
          return;
        }
      }
      toast.info('No image or image URL found in clipboard');
    } catch {
      toast.error('Could not access clipboard');
    }
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };


  const handleSave = async () => {
    if (!title.trim() || !brand.trim() || !sellingPrice.trim()) {
      setError('Please fill Product Title, Brand, and Selling Price.');
      return;
    }

    const primaryImage = images[0] || product?.image_url || '';
    if (!primaryImage) {
      setError('Add at least one product image URL or upload an image.');
      return;
    }
    if (!Number.isFinite(Number(sellingPrice)) || Number(sellingPrice) <= 0) {
      setError('Enter a valid selling price.');
      return;
    }
    if (!Number.isInteger(Number(stockQty)) || Number(stockQty) < 0) {
      setError('Enter a valid stock quantity.');
      return;
    }

    let normalizedCondition = 'Good';
    if (conditionGrade.includes('Pristine') || conditionGrade.includes('Like New')) {
      normalizedCondition = 'Like New';
    } else if (conditionGrade.includes('Excellent')) {
      normalizedCondition = 'Excellent';
    } else if (conditionGrade.includes('Fair')) {
      normalizedCondition = 'Fair';
    }

    const combinedSpecs: string[] = [];
    if (storage.trim()) combinedSpecs.push(`Storage: ${storage.trim()}`);
    if (color.trim()) combinedSpecs.push(`Color: ${color.trim()}`);
    if (batteryHealth.trim()) combinedSpecs.push(`Battery: ${batteryHealth.trim()}%`);
    specsList.forEach((s) => {
      if (s.key.trim() && s.value.trim()) {
        combinedSpecs.push(`${s.key.trim()}: ${s.value.trim()}`);
      }
    });

    highlights
      .split('\n')
      .map((h) => h.trim())
      .filter(Boolean)
      .forEach((h) => combinedSpecs.push(`Highlight: ${h}`));

    setSaving(true);
    setError(null);

    const payload = {
      name: title.trim(),
      brand: brand.trim(),
      model: (isCustomModelActive ? customModel : model).trim() || undefined,
      category: category,
      original_price: parseInt(originalMsrp) || parseInt(sellingPrice),
      price: parseInt(sellingPrice),
      condition: normalizedCondition,
      image_url: primaryImage,
      images: images.length ? images : [primaryImage],
      stock: isNaN(parseInt(stockQty, 10)) ? 1 : Math.max(0, parseInt(stockQty, 10)),
      description: conditionDescription.trim() || conditionTitle.trim() || 'Certified pre-owned device.',
      specs: combinedSpecs,
    };

    try {
      if (product?.id) {
        await api.products.update(product.id, payload);
        toast.success('Product updated');
      } else {
        await api.products.create(payload);
        toast.success('Product created');
      }
      onSaved();
    } catch (err: any) {
      setError(err?.message || 'Could not save product. Please try again.');
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const brandOptions = [
    ...dbBrands.map((name) => ({ label: name, value: name })),
    { label: 'Add Brand Manually', value: '__CUSTOM_BRAND__' },
  ];

  const modelOptions = [
    ...dbModels.map((m: any) => ({
      label: typeof m === 'string' ? m : m?.name || String(m),
      value: typeof m === 'string' ? m : m?.name || String(m),
    })),
    { label: 'Add Model Manually', value: '__CUSTOM_MODEL__' },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalBackdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalSheetContainer}>
          {/* Top Modal Header */}
          <View style={styles.fullModalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
              <View style={styles.purpleIconBox}>
                <Ionicons name="cube-outline" size={22} color="#7c3aed" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fullModalTitle}>
                  {product ? 'Edit Product' : 'List New Product'}
                </Text>
                <Text style={styles.fullModalSubtitle}>
                  Add certified pre-owned tech to the live storefront
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.fullCloseBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.fullModalScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {error && (
              <View style={styles.fullErrorBanner}>
                <Ionicons name="alert-circle" size={16} color="#ef4444" />
                <Text style={styles.fullErrorText}>{error}</Text>
              </View>
            )}

            {/* 1. GENERAL DETAILS */}
            <View style={styles.fullCardSection}>
              <Text style={styles.fullSectionHeader}>1. GENERAL DETAILS</Text>

              <View style={styles.formGroup}>
                <Text style={styles.formFieldLabel}>Product Title</Text>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="e.g. Apple iPhone 15 Pro (256GB Natural Titanium)"
                  placeholderTextColor="#94a3b8"
                  style={styles.formTextInput}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formFieldLabel}>Category</Text>
                <SelectPicker
                  value={category}
                  options={CATEGORY_OPTIONS}
                  onChange={(val) => setCategory(val)}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formFieldLabel}>Brand</Text>
                <SelectPicker
                  value={brand}
                  options={brandOptions}
                  placeholder="Select a brand"
                  onChange={(val) => {
                    if (val === '__CUSTOM_BRAND__') {
                      setBrand('');
                      setCustomBrand('');
                      setModel('');
                      setIsCustomModelActive(false);
                      return;
                    }
                    setBrand(val);
                    setCustomBrand('');
                    setModel('');
                    setIsCustomModelActive(false);
                  }}
                />
                {dbBrands.length === 0 && (
                  <Text style={styles.formHelperText}>
                    No brands found for this category. Add the brand manually below.
                  </Text>
                )}
                {dbBrands.length === 0 || customBrand || (brand && !dbBrands.includes(brand)) ? (
                  <TextInput
                    value={customBrand || brand}
                    onChangeText={(text) => {
                      setCustomBrand(text);
                      setBrand(text);
                    }}
                    placeholder="Enter brand name"
                    placeholderTextColor="#94a3b8"
                    style={[styles.formTextInput, { marginTop: 8 }]}
                  />
                ) : null}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formFieldLabel}>Device Model</Text>
                <SelectPicker
                  value={isCustomModelActive ? '__CUSTOM__' : model}
                  options={modelOptions}
                  placeholder={brand ? 'Select a model' : 'Select a brand first'}
                  disabled={!brand}
                  onChange={(val) => {
                    if (val === '__CUSTOM_MODEL__') {
                      setIsCustomModelActive(true);
                      setModel('');
                      setCustomModel('');
                    } else {
                      setIsCustomModelActive(false);
                      setCustomModel('');
                      setModel(val);
                    }
                  }}
                />
                {dbModels.length === 0 && brand ? (
                  <Text style={styles.formHelperText}>
                    No models found for this brand. Add the model manually below.
                  </Text>
                ) : null}
                {isCustomModelActive && (
                  <TextInput
                    value={customModel}
                    onChangeText={(t) => {
                      setCustomModel(t);
                      setModel(t);
                    }}
                    placeholder="Enter custom model name"
                    placeholderTextColor="#94a3b8"
                    style={[styles.formTextInput, { marginTop: 8 }]}
                  />
                )}
              </View>
            </View>

            {/* 2. PRICING & INVENTORY */}
            <View style={styles.fullCardSection}>
              <Text style={styles.fullSectionHeader}>2. PRICING & INVENTORY</Text>

              <View style={styles.formRowTwo}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formFieldLabel}>Selling Price (₹)</Text>
                  <View style={styles.currencyInputContainer}>
                    <Text style={styles.currencyPrefix}>₹</Text>
                    <TextInput
                      value={sellingPrice}
                      onChangeText={setSellingPrice}
                      keyboardType="numeric"
                      placeholder="74999"
                      placeholderTextColor="#94a3b8"
                      style={styles.currencyFieldInput}
                    />
                  </View>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.formFieldLabel}>Original MSRP (₹)</Text>
                  <View style={styles.currencyInputContainer}>
                    <Text style={styles.currencyPrefix}>₹</Text>
                    <TextInput
                      value={originalMsrp}
                      onChangeText={setOriginalMsrp}
                      keyboardType="numeric"
                      placeholder="134900"
                      placeholderTextColor="#94a3b8"
                      style={styles.currencyFieldInput}
                    />
                  </View>
                </View>
              </View>

              <View style={[styles.formRowTwo, { marginTop: 12 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formFieldLabel}>Stock Qty</Text>
                  <TextInput
                    value={stockQty}
                    onChangeText={setStockQty}
                    keyboardType="numeric"
                    placeholder="1"
                    placeholderTextColor="#94a3b8"
                    style={styles.formTextInput}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.formFieldLabel}>Store Status</Text>
                  <SelectPicker
                    value={storeStatus}
                    options={STORE_STATUSES}
                    onChange={setStoreStatus}
                  />
                </View>
              </View>
            </View>

            {/* 3. HARDWARE ATTRIBUTES */}
            <View style={styles.fullCardSection}>
              <Text style={styles.fullSectionHeader}>3. HARDWARE ATTRIBUTES</Text>

              <View style={styles.formRowThree}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formFieldLabel}>Storage</Text>
                  <TextInput
                    value={storage}
                    onChangeText={setStorage}
                    placeholder="e.g. 256GB"
                    placeholderTextColor="#94a3b8"
                    style={styles.formTextInput}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formFieldLabel}>Color</Text>
                  <TextInput
                    value={color}
                    onChangeText={setColor}
                    placeholder="Space Black"
                    placeholderTextColor="#94a3b8"
                    style={styles.formTextInput}
                  />
                </View>
                <View style={{ flex: 1.2 }}>
                  <Text style={styles.formFieldLabel}>Condition Grade</Text>
                  <SelectPicker
                    value={conditionGrade}
                    options={CONDITION_GRADES}
                    onChange={setConditionGrade}
                  />
                </View>
              </View>

              <View style={{ marginTop: 12 }}>
                <Text style={styles.formFieldLabel}>Battery Health (%)</Text>
                <TextInput
                  value={batteryHealth}
                  onChangeText={setBatteryHealth}
                  keyboardType="numeric"
                  placeholder="100"
                  placeholderTextColor="#94a3b8"
                  style={styles.formTextInput}
                />
              </View>

              <View style={{ marginTop: 12 }}>
                <Text style={styles.formFieldLabel}>Device Condition Title</Text>
                <TextInput
                  value={conditionTitle}
                  onChangeText={setConditionTitle}
                  placeholder="Brand New Condition"
                  placeholderTextColor="#94a3b8"
                  style={styles.formTextInput}
                />
              </View>

              <View style={{ marginTop: 12 }}>
                <Text style={styles.formFieldLabel}>Condition Description</Text>
                <TextInput
                  value={conditionDescription}
                  onChangeText={setConditionDescription}
                  placeholder="Clean Condition"
                  placeholderTextColor="#94a3b8"
                  multiline
                  numberOfLines={2}
                  style={[styles.formTextInput, { minHeight: 60, textAlignVertical: 'top' }]}
                />
              </View>

              <View style={{ marginTop: 12 }}>
                <Text style={styles.formFieldLabel}>Custom Product Highlights</Text>
                <Text style={styles.formHelperText}>Enter one message per line.</Text>
                <TextInput
                  value={highlights}
                  onChangeText={setHighlights}
                  placeholder={'Mobile & Box\nClean Condition'}
                  placeholderTextColor="#94a3b8"
                  multiline
                  numberOfLines={3}
                  style={[styles.formTextInput, { minHeight: 74, textAlignVertical: 'top' }]}
                />
              </View>

              {/* Dynamic Specifications */}
              <View style={{ marginTop: 16 }}>
                <View style={styles.specHeaderRow}>
                  <Text style={styles.formFieldLabel}>Specifications</Text>
                  <TouchableOpacity onPress={addSpec} style={styles.addSpecBtn}>
                    <Text style={styles.addSpecBtnText}>+ Add Specification</Text>
                  </TouchableOpacity>
                </View>

                {specsList.map((spec) => (
                  <View key={spec.id} style={styles.specInputRow}>
                    <TextInput
                      value={spec.key}
                      onChangeText={(t) => updateSpec(spec.id, 'key', t)}
                      placeholder="Display"
                      placeholderTextColor="#94a3b8"
                      style={styles.specKeyInput}
                    />
                    <TextInput
                      value={spec.value}
                      onChangeText={(t) => updateSpec(spec.id, 'value', t)}
                      placeholder="6.7-inch Super Reti"
                      placeholderTextColor="#94a3b8"
                      style={styles.specValInput}
                    />
                    <TouchableOpacity onPress={() => removeSpec(spec.id)} style={styles.specTrashBtn}>
                      <Ionicons name="trash-outline" size={16} color="#94a3b8" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>

            {/* 4. PRODUCT PHOTOGRAPHY */}
            <View style={styles.fullCardSection}>
              <View style={styles.photoHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fullSectionHeader}>Product Photography *</Text>
                  <Text style={styles.formHelperText}>Upload product images or paste an image URL</Text>
                </View>
              </View>

              <View style={styles.photoTabsRow}>
                <TouchableOpacity
                  onPress={() => setImageTab('url')}
                  style={[styles.photoTabPill, imageTab === 'url' && styles.photoTabPillActive]}
                >
                  <Ionicons name="link-outline" size={14} color={imageTab === 'url' ? '#ffc400' : '#64748b'} />
                  <Text style={[styles.photoTabText, imageTab === 'url' && styles.photoTabTextActive]}>
                    Image URL
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setImageTab('upload')}
                  style={[styles.photoTabPill, imageTab === 'upload' && styles.photoTabPillActive]}
                >
                  <Ionicons name="cloud-upload-outline" size={14} color={imageTab === 'upload' ? '#ffc400' : '#64748b'} />
                  <Text style={[styles.photoTabText, imageTab === 'upload' && styles.photoTabTextActive]}>
                    Upload File
                  </Text>
                </TouchableOpacity>
              </View>

              {imageTab === 'url' ? (
                <View>
                  <View style={styles.photoUrlBar}>
                    <View style={styles.photoUrlInputWrap}>
                      <Ionicons name="link-outline" size={16} color="#94a3b8" style={{ marginRight: 6 }} />
                      <TextInput
                        value={inputImageUrl}
                        onChangeText={setInputImageUrl}
                        placeholder="Paste image URL (https://... or data:image/...)"
                        placeholderTextColor="#94a3b8"
                        autoCapitalize="none"
                        style={styles.photoUrlInput}
                      />
                      {inputImageUrl.length > 0 && (
                        <TouchableOpacity onPress={() => setInputImageUrl('')} style={{ padding: 4 }}>
                          <Ionicons name="close-circle" size={14} color="#94a3b8" />
                        </TouchableOpacity>
                      )}
                    </View>
                    <TouchableOpacity onPress={() => addImage()} style={styles.photoAddBtn} activeOpacity={0.85}>
                      <Ionicons name="checkmark" size={15} color="#ffc400" />
                      <Text style={styles.photoAddBtnText}>Add</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handlePasteClipboard} style={styles.photoPasteBtn} activeOpacity={0.85}>
                      <Ionicons name="clipboard-outline" size={15} color="#ffffff" />
                      <Text style={styles.photoPasteBtnText}>Paste</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Immediate Live Preview when user pastes or types a URL */}
                  {inputImageUrl.trim().length > 0 && (
                    <View style={styles.livePhotoPreviewCard}>
                      <Image
                        source={{ uri: sanitizeImageUrl(inputImageUrl) }}
                        style={styles.livePhotoThumb}
                        resizeMode="cover"
                        {...(Platform.OS === 'web' ? { referrerPolicy: 'no-referrer' } as any : {})}
                      />
                      <View style={{ flex: 1, paddingHorizontal: 10 }}>
                        <Text style={styles.livePhotoPreviewTitle}>Detected Image</Text>
                        <Text style={styles.livePhotoPreviewUrl} numberOfLines={1} ellipsizeMode="middle">
                          {sanitizeImageUrl(inputImageUrl)}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => addImage()} style={styles.livePhotoAddBtn} activeOpacity={0.85}>
                        <Ionicons name="add" size={14} color="#000000" />
                        <Text style={styles.livePhotoAddBtnText}>Add Photo</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.uploadBoxWrap}>
                  <ImagePickerButton
                    onImageUploaded={(url) => setImages((prev) => [...prev, url])}
                    label="Camera Photo / Gallery Pick"
                    aspect={[4, 3]}
                    buttonStyle={{ backgroundColor: '#0a0a0a', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12 }}
                  />
                  <Text style={styles.uploadSubtext}>Pick from camera/photos with instant cloud attachment</Text>
                </View>
              )}

              {/* Thumbnails */}
              {images.length > 0 && (
                <View style={styles.thumbStrip}>
                  {images.map((img, i) => (
                    <View key={i} style={styles.thumbCard}>
                      <Image
                        source={{ uri: img }}
                        style={styles.thumbImage}
                        resizeMode="cover"
                        {...(Platform.OS === 'web' ? { referrerPolicy: 'no-referrer' } as any : {})}
                      />
                      <TouchableOpacity onPress={() => removeImage(i)} style={styles.thumbDeleteBadge}>
                        <Ionicons name="close" size={12} color="#ffffff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>

          {/* Sticky Bottom Action Bar */}
          <View style={styles.fullModalFooter}>
            <Text style={styles.footerNoticeText}>
              Changes are saved to the live catalog
            </Text>
            <View style={styles.footerActionsRight}>
              <TouchableOpacity onPress={onClose} style={styles.cancelModalBtn} activeOpacity={0.7}>
                <Text style={styles.cancelModalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                style={styles.publishModalBtn}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#ffc400" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={15} color="#ffc400" />
                    <Text style={styles.publishModalBtnText}>
                      {product ? 'Update Product' : 'Publish Listing'}
                    </Text>
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
});
