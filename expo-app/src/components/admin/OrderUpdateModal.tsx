import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { api } from '@/services/api';
import { useToast } from '@/context/ToastContext';
import { ProductImage } from '@/components/ui';
import { renewxColors, renewxShadows, renewxTextStyle } from '@/design-system';

export interface OrderUpdateModalProps {
  visible: boolean;
  order: any | null;
  onClose: () => void;
  onOrderUpdated: (updatedOrder: any) => void;
  onDownloadInvoice?: (order: any) => void;
  onDeleteOrder?: (orderId: string) => void;
}

type ModalTab = 'fulfillment' | 'items' | 'customer' | 'invoice';

const PIPELINE_STATUSES = [
  {
    id: 'pending',
    label: 'Pending',
    icon: 'time-outline' as const,
    color: '#D97706',
    bg: '#FEF3C7',
    description: 'Order placed, awaiting confirmation',
  },
  {
    id: 'processing',
    label: 'Processing',
    icon: 'sync-outline' as const,
    color: '#2563EB',
    bg: '#EFF6FF',
    description: 'Packaging & quality inspection',
  },
  {
    id: 'shipped',
    label: 'Shipped',
    icon: 'airplane-outline' as const,
    color: '#7C3AED',
    bg: '#F5F3FF',
    description: 'Dispatched with courier partner',
  },
  {
    id: 'out_for_delivery',
    label: 'Out for Delivery',
    icon: 'bicycle-outline' as const,
    color: '#EA580C',
    bg: '#FFF7ED',
    description: 'Courier partner is out delivering',
  },
  {
    id: 'delivered',
    label: 'Delivered',
    icon: 'checkmark-circle-outline' as const,
    color: '#16A34A',
    bg: '#F0FDF4',
    description: 'Package delivered to customer',
  },
];

const CANCELLED_STATUS = {
  id: 'cancelled',
  label: 'Cancelled',
  icon: 'close-circle-outline' as const,
  color: '#DC2626',
  bg: '#FEF2F2',
  description: 'Order cancelled & stock restored',
};

const COURIER_PRESETS = [
  'Blue Dart',
  'Delhivery',
  'DTDC',
  'India Post',
  'Shadowfax',
  'Ekart',
  'XpressBees',
];

const CANCELLATION_REASONS = [
  'Customer requested cancellation',
  'Item out of stock / defect found',
  'Address unserviceable / phone unverified',
  'Duplicate order placed',
  'Payment verification failed',
];

export default function OrderUpdateModal({
  visible,
  order,
  onClose,
  onOrderUpdated,
  onDownloadInvoice,
  onDeleteOrder,
}: OrderUpdateModalProps) {
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<ModalTab>('fulfillment');
  const [selectedStatus, setSelectedStatus] = useState<string>('pending');
  const [courier, setCourier] = useState<string>('');
  const [trackingNumber, setTrackingNumber] = useState<string>('');
  const [courierPhone, setCourierPhone] = useState<string>('');
  const [estimatedDelivery, setEstimatedDelivery] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [issueRefund, setIssueRefund] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (order) {
      setSelectedStatus(String(order.status || 'pending'));
      setCourier(String(order.courier || ''));
      setTrackingNumber(String(order.tracking_number || order.trackingNumber || ''));
      setCourierPhone(String(order.courier_phone || order.courierPhone || ''));
      setEstimatedDelivery(String(order.estimated_delivery || order.estimatedDelivery || ''));
      setReason(String(order.cancellation_reason || order.reason || ''));
      setIssueRefund(true);
      setActiveTab('fulfillment');
    }
  }, [order]);

  if (!order) return null;

  const orderId = String(order.id || order._id || '');
  const shortId = orderId.slice(-8).toUpperCase();
  const invoiceNumber = `RX-INV-${shortId}`;
  const rawDate = order.created_at || order.createdAt || new Date().toISOString();
  const formattedDate = new Date(rawDate).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const customerName = order.customer_info?.name || order.customer_name || 'Customer';
  const customerPhone = order.customer_info?.phone || order.phone || '';
  const customerAddress = order.customer_info?.address || order.address || 'Address not provided';
  const customerPincode = order.customer_info?.pincode || order.pincode || '';
  const whatsappOptIn = order.customer_info?.whatsapp_consent !== false;

  const totalAmount = Number(order.subtotal || order.total || 0);
  const savings = Number(order.savings || 0);
  const taxableAmount = Math.round(totalAmount / 1.18);
  const gstAmount = totalAmount - taxableAmount;
  const cgst = Math.round(gstAmount / 2);
  const sgst = gstAmount - cgst;

  const paymentMethod = String(order.payment_method || order.paymentMethod || 'COD').toUpperCase();
  const paymentStatus = String(order.payment_status || order.paymentStatus || 'pending');
  const razorpayPaymentId = order.razorpay_payment_id || order.razorpayPaymentId || '';
  const razorpayOrderId = order.razorpay_order_id || order.razorpayOrderId || '';

  const orderItems: any[] = order.order_items || order.items || [];
  const currentStatus = String(order.status || 'pending');
  const currentStatusMeta = PIPELINE_STATUSES.find((s) => s.id === currentStatus) || {
    label: currentStatus.replace(/_/g, ' ').toUpperCase(),
    color: '#64748B',
    bg: '#F1F5F9',
  };

  const hasStatusChanged = selectedStatus !== currentStatus;

  const handleCopy = async (text: string, label: string) => {
    if (!text) return;
    await Clipboard.setStringAsync(text);
    toast.success(`${label} copied to clipboard`);
  };

  const handleCallCustomer = () => {
    if (!customerPhone) return;
    Linking.openURL(`tel:${customerPhone.replace(/\D/g, '')}`);
  };

  const handleOpenWhatsApp = () => {
    if (!customerPhone) return;
    const clean = customerPhone.replace(/\D/g, '');
    const phone = clean.startsWith('91') ? clean : `91${clean}`;
    Linking.openURL(`https://wa.me/${phone}?text=Hi%20${encodeURIComponent(customerName)},%20regarding%20your%20RenewX%20order%20%23${shortId}...`);
  };

  const handlePasteTracking = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text) {
        setTrackingNumber(text.trim());
        toast.info('Pasted tracking number');
      }
    } catch {
      // ignore
    }
  };

  const handleSave = async () => {
    setSubmitting(true);
    try {
      const isPaid = paymentStatus.toLowerCase() === 'paid';
      const updated = await api.orders.updateStatus(
        orderId,
        selectedStatus,
        courier.trim() || undefined,
        trackingNumber.trim() || undefined,
        courierPhone.trim() || undefined,
        estimatedDelivery.trim() || undefined,
        reason.trim() || undefined,
        selectedStatus === 'cancelled' && isPaid ? issueRefund : undefined,
      );

      toast.success(
        `Order #${shortId} moved to ${selectedStatus.replace(/_/g, ' ')}`,
        'Order Updated'
      );

      onOrderUpdated({
        ...order,
        ...(updated || {}),
        status: selectedStatus,
        courier: courier.trim(),
        tracking_number: trackingNumber.trim(),
        courier_phone: courierPhone.trim(),
        estimated_delivery: estimatedDelivery.trim(),
        cancellation_reason: reason.trim(),
      });
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update order status');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Top MNC Command Header */}
          <View style={styles.topBar}>
            <View style={{ flex: 1 }}>
              <View style={styles.headerIdRow}>
                <Text style={styles.orderNumberText}>#{shortId}</Text>
                <TouchableOpacity
                  onPress={() => handleCopy(orderId, 'Full Order ID')}
                  style={styles.copyIdBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="copy-outline" size={13} color="#64748B" />
                </TouchableOpacity>

                <View style={[styles.liveStatusPill, { backgroundColor: currentStatusMeta.bg }]}>
                  <View style={[styles.liveStatusDot, { backgroundColor: currentStatusMeta.color }]} />
                  <Text style={[styles.liveStatusText, { color: currentStatusMeta.color }]}>
                    {currentStatusMeta.label}
                  </Text>
                </View>
              </View>

              <Text style={styles.headerTimestamp}>
                Placed {formattedDate} · ₹{totalAmount.toLocaleString('en-IN')} via {paymentMethod}
              </Text>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color="#475569" />
            </TouchableOpacity>
          </View>

          {/* MNC Navigation Tabs */}
          <View style={styles.navTabsBar}>
            {[
              { id: 'fulfillment', label: 'Fulfillment', icon: 'airplane-outline' },
              { id: 'items', label: `Items (${orderItems.length})`, icon: 'cube-outline' },
              { id: 'customer', label: 'Customer', icon: 'person-outline' },
              { id: 'invoice', label: 'Tax Invoice', icon: 'document-text-outline' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => setActiveTab(tab.id as ModalTab)}
                  style={[styles.navTabItem, isActive && styles.navTabItemActive]}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={tab.icon as any}
                    size={13}
                    color={isActive ? '#0F172A' : '#64748B'}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[styles.navTabText, isActive && styles.navTabTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {/* =========================================================================
                TAB 1: FULFILLMENT & LIFECYCLE
               ========================================================================= */}
            {activeTab === 'fulfillment' && (
              <View style={styles.tabContentBlock}>
                {/* WhatsApp Live Guarantee Banner */}
                <View style={styles.whatsappBanner}>
                  <View style={styles.whatsappBannerIconWrap}>
                    <Ionicons name="logo-whatsapp" size={16} color="#16A34A" />
                  </View>
                  <View style={{ flex: 1, paddingRight: 4 }}>
                    <Text style={styles.whatsappBannerTitle}>
                      {whatsappOptIn ? 'WhatsApp Dispatch Ready' : 'WhatsApp Delivery Disabled'}
                    </Text>
                    <Text style={styles.whatsappBannerSub}>
                      {whatsappOptIn
                        ? `A branded WhatsApp notification will be dispatched automatically to +${customerPhone.replace(/\D/g, '')} upon saving.`
                        : 'Customer has opted out of WhatsApp updates. Only internal and in-app states will update.'}
                    </Text>
                  </View>
                  {customerPhone ? (
                    <TouchableOpacity onPress={handleOpenWhatsApp} style={styles.quickChatBtn}>
                      <Ionicons name="chatbubble-outline" size={13} color="#16A34A" />
                      <Text style={styles.quickChatText}>Chat</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                {/* Stepper Pipeline Cards */}
                <Text style={styles.sectionHeader}>SELECT TARGET LIFECYCLE STAGE</Text>
                <View style={styles.stepperGrid}>
                  {PIPELINE_STATUSES.map((st) => {
                    const isSelected = selectedStatus === st.id;
                    const isCurrent = currentStatus === st.id;

                    return (
                      <TouchableOpacity
                        key={st.id}
                        onPress={() => setSelectedStatus(st.id)}
                        style={[
                          styles.stepCard,
                          isSelected && { borderColor: st.color, backgroundColor: st.bg },
                          isCurrent && !isSelected && styles.stepCardCurrent,
                        ]}
                        activeOpacity={0.7}
                      >
                        <View style={styles.stepCardTop}>
                          <View
                            style={[
                              styles.stepIconWrap,
                              { backgroundColor: isSelected ? st.color : '#E2E8F0' },
                            ]}
                          >
                            <Ionicons
                              name={st.icon}
                              size={14}
                              color={isSelected ? '#FFFFFF' : '#475569'}
                            />
                          </View>
                          {isSelected ? (
                            <View style={[styles.checkCircle, { backgroundColor: st.color }]}>
                              <Ionicons name="checkmark" size={11} color="#FFFFFF" />
                            </View>
                          ) : isCurrent ? (
                            <Text style={styles.currentTag}>ACTIVE</Text>
                          ) : null}
                        </View>
                        <Text style={[styles.stepTitle, isSelected && { color: st.color, ...renewxTextStyle('bold') }]}>
                          {st.label}
                        </Text>
                        <Text style={styles.stepDesc} numberOfLines={1}>
                          {st.description}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Cancelled Secondary Card */}
                <TouchableOpacity
                  onPress={() => setSelectedStatus('cancelled')}
                  style={[
                    styles.cancelStrip,
                    selectedStatus === 'cancelled' && {
                      borderColor: CANCELLED_STATUS.color,
                      backgroundColor: CANCELLED_STATUS.bg,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Ionicons
                      name={CANCELLED_STATUS.icon}
                      size={18}
                      color={selectedStatus === 'cancelled' ? CANCELLED_STATUS.color : '#94A3B8'}
                    />
                    <View>
                      <Text
                        style={[
                          styles.cancelStripTitle,
                          selectedStatus === 'cancelled' && { color: CANCELLED_STATUS.color },
                        ]}
                      >
                        Cancel Order & Release Inventory
                      </Text>
                      <Text style={styles.cancelStripDesc}>
                        Marks order as cancelled and dispatches support notice
                      </Text>
                    </View>
                  </View>
                  {selectedStatus === 'cancelled' && (
                    <View style={[styles.checkCircle, { backgroundColor: CANCELLED_STATUS.color }]}>
                      <Ionicons name="checkmark" size={11} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>

                {/* Conditional Courier & Tracking Drawer */}
                {(selectedStatus === 'shipped' || selectedStatus === 'out_for_delivery') && (
                  <View style={styles.courierDrawer}>
                    <View style={styles.drawerHeaderRow}>
                      <Ionicons name="cube-outline" size={15} color="#7C3AED" />
                      <Text style={styles.drawerTitle}>Dispatch & Tracking Metadata</Text>
                    </View>

                    <Text style={styles.drawerSublabel}>Courier Partner</Text>
                    <View style={styles.courierChipsRow}>
                      {COURIER_PRESETS.map((p) => {
                        const isSelected = courier.toLowerCase() === p.toLowerCase();
                        return (
                          <TouchableOpacity
                            key={p}
                            onPress={() => setCourier(p)}
                            style={[styles.presetChip, isSelected && styles.presetChipActive]}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.presetChipText,
                                isSelected && styles.presetChipTextActive,
                              ]}
                            >
                              {p}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <TextInput
                      value={courier}
                      onChangeText={setCourier}
                      placeholder="Or custom carrier name..."
                      placeholderTextColor="#94A3B8"
                      style={styles.drawerInput}
                    />

                    <View style={styles.inputHeaderWithAction}>
                      <Text style={styles.drawerSublabel}>AWB / Tracking Number</Text>
                      <TouchableOpacity onPress={handlePasteTracking} style={styles.pasteBtn}>
                        <Ionicons name="clipboard-outline" size={12} color="#2563EB" />
                        <Text style={styles.pasteBtnText}>Paste</Text>
                      </TouchableOpacity>
                    </View>

                    <TextInput
                      value={trackingNumber}
                      onChangeText={setTrackingNumber}
                      placeholder="e.g. BD9823419082IN"
                      placeholderTextColor="#94A3B8"
                      style={styles.drawerInput}
                    />

                    <Text style={[styles.drawerSublabel, { marginTop: 10 }]}>
                      Delivery Agent Phone (Optional)
                    </Text>
                    <TextInput
                      value={courierPhone}
                      onChangeText={setCourierPhone}
                      placeholder="e.g. +91 98765 43210"
                      placeholderTextColor="#94A3B8"
                      keyboardType="phone-pad"
                      style={styles.drawerInput}
                    />
                  </View>
                )}

                {/* Conditional Cancellation Reason Drawer */}
                {selectedStatus === 'cancelled' && (
                  <View style={[styles.courierDrawer, { borderColor: '#FECACA' }]}>
                    <View style={styles.drawerHeaderRow}>
                      <Ionicons name="alert-circle-outline" size={15} color="#DC2626" />
                      <Text style={[styles.drawerTitle, { color: '#DC2626' }]}>
                        Cancellation Reason (Included in WhatsApp message)
                      </Text>
                    </View>

                    <View style={styles.courierChipsRow}>
                      {CANCELLATION_REASONS.map((r) => {
                        const isSelected = reason === r;
                        return (
                          <TouchableOpacity
                            key={r}
                            onPress={() => setReason(r)}
                            style={[
                              styles.presetChip,
                              isSelected && { backgroundColor: '#FEF2F2', borderColor: '#DC2626' },
                            ]}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.presetChipText,
                                isSelected && { color: '#DC2626', ...renewxTextStyle('bold') },
                              ]}
                            >
                              {r}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <TextInput
                      value={reason}
                      onChangeText={setReason}
                      placeholder="Provide specific details for the customer..."
                      placeholderTextColor="#94A3B8"
                      style={styles.drawerInput}
                    />

                    {paymentStatus === 'paid' && (
                      <TouchableOpacity
                        onPress={() => setIssueRefund(!issueRefund)}
                        style={[
                          styles.refundToggleCard,
                          issueRefund && styles.refundToggleCardActive,
                        ]}
                        activeOpacity={0.8}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                          <Ionicons
                            name={issueRefund ? "checkbox" : "square-outline"}
                            size={20}
                            color={issueRefund ? "#059669" : "#94A3B8"}
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.refundToggleTitle}>
                              Initiate Instant Razorpay Refund (₹{totalAmount.toLocaleString('en-IN')})
                            </Text>
                            <Text style={styles.refundToggleSubtitle}>
                              Calls Razorpay API to return funds to customer and triggers refund confirmation WhatsApp.
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Primary Action Button */}
                <TouchableOpacity
                  onPress={handleSave}
                  disabled={submitting}
                  style={[
                    styles.primarySaveBtn,
                    submitting && { opacity: 0.7 },
                  ]}
                  activeOpacity={0.85}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.primarySaveBtnText}>
                        {hasStatusChanged
                          ? `Commit Status: "${selectedStatus.replace(/_/g, ' ').toUpperCase()}"`
                          : 'Save Details & Dispatch Updates'}
                      </Text>
                      <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* =========================================================================
                TAB 2: ORDER ITEMS & FINANCIALS
               ========================================================================= */}
            {activeTab === 'items' && (
              <View style={styles.tabContentBlock}>
                <Text style={styles.sectionHeader}>ITEMIZED PRODUCTS ({orderItems.length})</Text>

                <View style={styles.itemsCardContainer}>
                  {orderItems.length === 0 ? (
                    <View style={styles.emptyItemsBox}>
                      <Ionicons name="cube-outline" size={24} color="#94A3B8" />
                      <Text style={styles.emptyItemsText}>No items found in order metadata</Text>
                    </View>
                  ) : (
                    orderItems.map((item, index) => {
                      const itemName = item.product_name || item.name || 'Certified Gadget';
                      const itemQty = Number(item.quantity || item.qty || 1);
                      const itemPrice = Number(item.price || 0);
                      const itemTotal = itemPrice * itemQty;

                      return (
                        <View key={index} style={styles.itemRowCard}>
                          <View style={styles.itemImgThumbWrap}>
                            <ProductImage
                              source={item.image_url || item.image}
                              name={itemName}
                              style={styles.itemImgThumb}
                              resizeMode="contain"
                            />
                          </View>

                          <View style={{ flex: 1, paddingRight: 8 }}>
                            <Text style={styles.itemTitleText} numberOfLines={2}>
                              {itemName}
                            </Text>
                            <Text style={styles.itemSkuText}>
                              PID: {String(item.product_id || 'PROD').slice(-8).toUpperCase()} · Qty: {itemQty}
                            </Text>
                          </View>

                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.itemPriceText}>
                              ₹{itemTotal.toLocaleString('en-IN')}
                            </Text>
                            <Text style={styles.itemUnitPriceText}>
                              ₹{itemPrice.toLocaleString('en-IN')} / unit
                            </Text>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>

                {/* Financial Summary Breakdown (MNC Store Format) */}
                <Text style={[styles.sectionHeader, { marginTop: 16 }]}>PAYMENT & FINANCIAL AUDIT</Text>
                <View style={styles.financialCard}>
                  <View style={styles.financialRow}>
                    <Text style={styles.financialLabel}>Taxable Value (Excl. GST)</Text>
                    <Text style={styles.financialValue}>₹{taxableAmount.toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={styles.financialRow}>
                    <Text style={styles.financialLabel}>CGST (9%)</Text>
                    <Text style={styles.financialValue}>₹{cgst.toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={styles.financialRow}>
                    <Text style={styles.financialLabel}>SGST (9%)</Text>
                    <Text style={styles.financialValue}>₹{sgst.toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={styles.financialRow}>
                    <Text style={styles.financialLabel}>Standard Delivery Fee</Text>
                    <Text style={[styles.financialValue, { color: '#16A34A' }]}>FREE</Text>
                  </View>
                  {savings > 0 && (
                    <View style={styles.financialRow}>
                      <Text style={styles.financialLabel}>Total Discounts / Savings</Text>
                      <Text style={[styles.financialValue, { color: '#16A34A' }]}>
                        -₹{savings.toLocaleString('en-IN')}
                      </Text>
                    </View>
                  )}

                  <View style={styles.financialDivider} />

                  <View style={styles.financialTotalRow}>
                    <Text style={styles.financialTotalLabel}>Grand Total Amount</Text>
                    <Text style={styles.financialTotalValue}>
                      ₹{totalAmount.toLocaleString('en-IN')}
                    </Text>
                  </View>

                  <View style={styles.paymentMetaBox}>
                    <View style={styles.paymentMetaItem}>
                      <Text style={styles.paymentMetaLabel}>Method</Text>
                      <Text style={styles.paymentMetaValue}>{paymentMethod}</Text>
                    </View>
                    <View style={styles.paymentMetaItem}>
                      <Text style={styles.paymentMetaLabel}>Payment Status</Text>
                      <Text
                        style={[
                          styles.paymentMetaValue,
                          { color: paymentStatus === 'paid' ? '#16A34A' : '#D97706' },
                        ]}
                      >
                        {paymentStatus.toUpperCase()}
                      </Text>
                    </View>
                    {razorpayPaymentId ? (
                      <View style={styles.paymentMetaItem}>
                        <Text style={styles.paymentMetaLabel}>Transaction ID</Text>
                        <Text style={styles.paymentMetaValue} numberOfLines={1}>
                          {razorpayPaymentId}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>
            )}

            {/* =========================================================================
                TAB 3: CUSTOMER & SHIPPING
               ========================================================================= */}
            {activeTab === 'customer' && (
              <View style={styles.tabContentBlock}>
                <Text style={styles.sectionHeader}>CUSTOMER INFORMATION</Text>
                <View style={styles.customerProfileCard}>
                  <View style={styles.profileHeaderRow}>
                    <View style={styles.profileAvatar}>
                      <Text style={styles.profileAvatarText}>
                        {customerName.slice(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.customerNameLarge}>{customerName}</Text>
                      <Text style={styles.customerSinceText}>RenewX Certified Customer</Text>
                    </View>
                  </View>

                  <View style={styles.contactActionsRow}>
                    {customerPhone ? (
                      <>
                        <TouchableOpacity
                          onPress={handleCallCustomer}
                          style={styles.contactActionBtn}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="call-outline" size={14} color="#0F172A" />
                          <Text style={styles.contactActionText}>Call</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={handleOpenWhatsApp}
                          style={[styles.contactActionBtn, { borderColor: '#BBF7D0', backgroundColor: '#F0FDF4' }]}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="logo-whatsapp" size={14} color="#16A34A" />
                          <Text style={[styles.contactActionText, { color: '#16A34A' }]}>WhatsApp</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleCopy(customerPhone, 'Customer Phone')}
                          style={styles.contactActionBtn}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="copy-outline" size={14} color="#0F172A" />
                          <Text style={styles.contactActionText}>Copy</Text>
                        </TouchableOpacity>
                      </>
                    ) : null}
                  </View>

                  <View style={styles.infoFieldRow}>
                    <Ionicons name="call" size={14} color="#64748B" />
                    <Text style={styles.infoFieldText}>{customerPhone || 'Not available'}</Text>
                  </View>

                  <View style={styles.infoFieldRow}>
                    <Ionicons name="logo-whatsapp" size={14} color={whatsappOptIn ? '#16A34A' : '#94A3B8'} />
                    <Text style={[styles.infoFieldText, { color: whatsappOptIn ? '#16A34A' : '#64748B' }]}>
                      {whatsappOptIn
                        ? 'WhatsApp order tracking enabled by customer'
                        : 'Customer did not opt into WhatsApp order notifications'}
                    </Text>
                  </View>
                </View>

                {/* Delivery Address Card */}
                <Text style={[styles.sectionHeader, { marginTop: 16 }]}>FULFILLMENT DELIVERY ADDRESS</Text>
                <View style={styles.addressCard}>
                  <View style={styles.addressTopRow}>
                    <Ionicons name="location-outline" size={16} color="#0F172A" />
                    <Text style={styles.addressCardTitle}>Shipping Address</Text>
                    <TouchableOpacity
                      onPress={() => handleCopy(`${customerName}, ${customerAddress}, Pincode: ${customerPincode}`, 'Full Address')}
                      style={styles.copyAddressBtn}
                    >
                      <Ionicons name="copy-outline" size={12} color="#2563EB" />
                      <Text style={styles.copyAddressText}>Copy Address</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.fullAddressText}>
                    {customerAddress}
                  </Text>
                  {customerPincode ? (
                    <View style={styles.pincodeBadge}>
                      <Text style={styles.pincodeText}>PINCODE: {customerPincode}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            )}

            {/* =========================================================================
                TAB 4: DIGITAL TAX INVOICE
               ========================================================================= */}
            {activeTab === 'invoice' && (
              <View style={styles.tabContentBlock}>
                {/* Actions Toolbar */}
                <View style={styles.invoiceToolbar}>
                  <View>
                    <Text style={styles.invoiceDocTitle}>TAX INVOICE</Text>
                    <Text style={styles.invoiceDocSub}>{invoiceNumber}</Text>
                  </View>

                  {onDownloadInvoice && (
                    <TouchableOpacity
                      onPress={() => onDownloadInvoice(order)}
                      style={styles.downloadInvoiceBtn}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="download-outline" size={15} color="#FFFFFF" />
                      <Text style={styles.downloadInvoiceBtnText}>Download PDF</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Invoice Document Paper Container */}
                <View style={styles.invoicePaper}>
                  {/* Seller & Buyer Headers */}
                  <View style={styles.invoiceSectionHeaderRow}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={styles.invoiceBrand}>RENEWX CREW</Text>
                      <Text style={styles.invoiceMncAddress}>
                        RenewX Tech Labs Pvt. Ltd.{'\n'}
                        GSTIN: 33AAACR1234F1Z5{'\n'}
                        Bangalore, Karnataka, India
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.invoiceMetaKey}>Invoice No: {invoiceNumber}</Text>
                      <Text style={styles.invoiceMetaKey}>Date: {formattedDate.split(',')[0]}</Text>
                      <Text style={styles.invoiceMetaKey}>Place: Karnataka (29)</Text>
                    </View>
                  </View>

                  <View style={styles.invoiceDivider} />

                  <View style={styles.invoiceBillToBox}>
                    <Text style={styles.invoiceSubheading}>BILLED & SHIPPED TO:</Text>
                    <Text style={styles.invoiceCustomerName}>{customerName}</Text>
                    <Text style={styles.invoiceCustomerDetail}>
                      {customerAddress} · PIN: {customerPincode}{'\n'}
                      Phone: {customerPhone}
                    </Text>
                  </View>

                  {/* Items Table */}
                  <View style={styles.invoiceTable}>
                    <View style={styles.tableHeadRow}>
                      <Text style={[styles.tableHeadCell, { flex: 2 }]}>DESCRIPTION</Text>
                      <Text style={[styles.tableHeadCell, { flex: 0.6, textAlign: 'center' }]}>QTY</Text>
                      <Text style={[styles.tableHeadCell, { flex: 1.2, textAlign: 'right' }]}>AMOUNT</Text>
                    </View>

                    {orderItems.map((item, idx) => {
                      const itemTitle = item.product_name || item.name || 'Certified Device';
                      const qty = Number(item.quantity || 1);
                      const amount = Number(item.price || 0) * qty;

                      return (
                        <View key={idx} style={styles.tableDataRow}>
                          <View style={{ flex: 2 }}>
                            <Text style={styles.tableItemName}>{itemTitle}</Text>
                            <Text style={styles.tableHsnText}>HSN: 85171300 · 1 Year Warranty</Text>
                          </View>
                          <Text style={[styles.tableDataCell, { flex: 0.6, textAlign: 'center' }]}>{qty}</Text>
                          <Text style={[styles.tableDataCell, { flex: 1.2, textAlign: 'right', ...renewxTextStyle('bold') }]}>
                            ₹{amount.toLocaleString('en-IN')}
                          </Text>
                        </View>
                      );
                    })}
                  </View>

                  {/* Tax Summary Table */}
                  <View style={styles.invoiceTotalsCard}>
                    <View style={styles.totalsRow}>
                      <Text style={styles.totalsLabel}>Taxable Amount</Text>
                      <Text style={styles.totalsVal}>₹{taxableAmount.toLocaleString('en-IN')}</Text>
                    </View>
                    <View style={styles.totalsRow}>
                      <Text style={styles.totalsLabel}>CGST @ 9%</Text>
                      <Text style={styles.totalsVal}>₹{cgst.toLocaleString('en-IN')}</Text>
                    </View>
                    <View style={styles.totalsRow}>
                      <Text style={styles.totalsLabel}>SGST @ 9%</Text>
                      <Text style={styles.totalsVal}>₹{sgst.toLocaleString('en-IN')}</Text>
                    </View>
                    <View style={styles.totalsDivider} />
                    <View style={styles.grandTotalRow}>
                      <Text style={styles.grandTotalLabel}>Invoice Total</Text>
                      <Text style={styles.grandTotalVal}>₹{totalAmount.toLocaleString('en-IN')}</Text>
                    </View>
                  </View>

                  <Text style={styles.invoiceFooterNote}>
                    * This is a computer-generated tax invoice verified under the Information Technology Act.
                  </Text>
                </View>
              </View>
            )}

            {/* Bottom Actions Row (Delete & Close) */}
            <View style={styles.bottomBar}>
              {onDeleteOrder && (
                <TouchableOpacity
                  onPress={() => {
                    onClose();
                    onDeleteOrder(orderId);
                  }}
                  style={styles.deleteOrderBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={14} color="#DC2626" />
                  <Text style={styles.deleteOrderBtnText}>Delete Order Record</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity onPress={onClose} style={styles.dismissBtn} activeOpacity={0.7}>
                <Text style={styles.dismissBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 18,
  },
  modalCard: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '94%',
    backgroundColor: renewxColors.surface,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
    ...(renewxShadows.floating as object),
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: renewxColors.surfaceMuted,
  },
  headerIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orderNumberText: {
    fontSize: 15,
    color: renewxColors.black,
    letterSpacing: 0.5,
    ...renewxTextStyle('extraBold'),
  },
  copyIdBtn: {
    padding: 3,
  },
  liveStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 4,
  },
  liveStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveStatusText: {
    fontSize: 10.5,
    textTransform: 'uppercase',
    ...renewxTextStyle('bold'),
  },
  headerTimestamp: {
    fontSize: 11.5,
    color: renewxColors.textMuted,
    marginTop: 3,
    ...renewxTextStyle('regular'),
  },
  closeBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: renewxColors.background,
    borderWidth: 1,
    borderColor: renewxColors.border,
  },
  navTabsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: renewxColors.background,
    borderRadius: 12,
    padding: 3,
    marginTop: 10,
    marginBottom: 12,
  },
  navTabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 9,
  },
  navTabItemActive: {
    backgroundColor: renewxColors.surface,
    ...(renewxShadows.card as object),
  },
  navTabText: {
    fontSize: 11.5,
    color: renewxColors.textMuted,
    ...renewxTextStyle('semibold'),
  },
  navTabTextActive: {
    color: renewxColors.black,
    ...renewxTextStyle('bold'),
  },
  modalScroll: {
    flexGrow: 1,
  },
  tabContentBlock: {
    paddingBottom: 10,
  },
  whatsappBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: renewxColors.mintLight,
    borderWidth: 1,
    borderColor: renewxColors.mintBorder,
    borderRadius: 14,
    padding: 10,
    marginBottom: 14,
  },
  whatsappBannerIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: renewxColors.mint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  whatsappBannerTitle: {
    fontSize: 12,
    color: renewxColors.mintDark,
    ...renewxTextStyle('bold'),
  },
  whatsappBannerSub: {
    fontSize: 10.5,
    color: renewxColors.emerald,
    lineHeight: 14,
    marginTop: 1,
    ...renewxTextStyle('regular'),
  },
  quickChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: renewxColors.surface,
    borderWidth: 1,
    borderColor: renewxColors.mintBorder,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  quickChatText: {
    fontSize: 11,
    color: renewxColors.emerald,
    ...renewxTextStyle('bold'),
  },
  sectionHeader: {
    fontSize: 10.5,
    color: renewxColors.textMuted,
    letterSpacing: 0.7,
    marginBottom: 8,
    ...renewxTextStyle('extraBold'),
  },
  stepperGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  stepCard: {
    width: '48.5%',
    backgroundColor: renewxColors.surface,
    borderWidth: 1.5,
    borderColor: renewxColors.border,
    borderRadius: 14,
    padding: 10,
  },
  stepCardCurrent: {
    borderColor: renewxColors.borderStrong,
    backgroundColor: renewxColors.background,
  },
  stepCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  stepIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentTag: {
    fontSize: 10,
    color: renewxColors.textMuted,
    backgroundColor: renewxColors.border,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    ...renewxTextStyle('extraBold'),
  },
  stepTitle: {
    fontSize: 12,
    color: renewxColors.black,
    marginBottom: 1,
    ...renewxTextStyle('semibold'),
  },
  stepDesc: {
    fontSize: 10,
    color: renewxColors.textMuted,
    ...renewxTextStyle('regular'),
  },
  cancelStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: renewxColors.border,
    borderRadius: 14,
    padding: 10,
    marginBottom: 14,
  },
  cancelStripTitle: {
    fontSize: 12.5,
    color: renewxColors.textMuted,
    ...renewxTextStyle('semibold'),
  },
  cancelStripDesc: {
    fontSize: 10.5,
    color: '#94A3B8',
    ...renewxTextStyle('regular'),
  },
  courierDrawer: {
    backgroundColor: renewxColors.background,
    borderWidth: 1,
    borderColor: renewxColors.border,
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
  },
  drawerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  drawerTitle: {
    fontSize: 12,
    color: renewxColors.black,
    ...renewxTextStyle('bold'),
  },
  drawerSublabel: {
    fontSize: 11,
    color: renewxColors.textSecondary,
    marginBottom: 6,
    ...renewxTextStyle('semibold'),
  },
  courierChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  presetChip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: renewxColors.surface,
    borderWidth: 1,
    borderColor: renewxColors.border,
  },
  presetChipActive: {
    backgroundColor: '#F5F3FF',
    borderColor: '#7C3AED',
  },
  presetChipText: {
    fontSize: 11,
    color: renewxColors.textSecondary,
    ...renewxTextStyle('medium'),
  },
  presetChipTextActive: {
    color: '#7C3AED',
    ...renewxTextStyle('bold'),
  },
  drawerInput: {
    backgroundColor: renewxColors.surface,
    borderWidth: 1,
    borderColor: renewxColors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 12,
    color: renewxColors.black,
    ...renewxTextStyle('regular'),
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  refundToggleCard: {
    marginTop: 10,
    padding: 11,
    borderRadius: 12,
    backgroundColor: renewxColors.background,
    borderWidth: 1.5,
    borderColor: renewxColors.borderStrong,
  },
  refundToggleCardActive: {
    backgroundColor: renewxColors.mintLight,
    borderColor: renewxColors.emerald,
  },
  refundToggleTitle: {
    fontSize: 12,
    color: renewxColors.black,
    ...renewxTextStyle('bold'),
  },
  refundToggleSubtitle: {
    fontSize: 10.5,
    color: renewxColors.textMuted,
    marginTop: 2,
    lineHeight: 14,
    ...renewxTextStyle('regular'),
  },
  inputHeaderWithAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  pasteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  pasteBtnText: {
    fontSize: 11,
    color: renewxColors.info,
    ...renewxTextStyle('bold'),
  },
  primarySaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: renewxColors.black,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 4,
    ...(renewxShadows.elevated as object),
  },
  primarySaveBtnText: {
    fontSize: 13,
    color: renewxColors.white,
    ...renewxTextStyle('bold'),
  },
  itemsCardContainer: {
    backgroundColor: renewxColors.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: renewxColors.border,
    overflow: 'hidden',
  },
  emptyItemsBox: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyItemsText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 6,
    ...renewxTextStyle('regular'),
  },
  itemRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: renewxColors.surfaceMuted,
    backgroundColor: renewxColors.surface,
  },
  itemImgThumbWrap: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: renewxColors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: renewxColors.border,
  },
  itemImgThumb: {
    width: 36,
    height: 36,
  },
  itemTitleText: {
    fontSize: 12.5,
    color: renewxColors.black,
    lineHeight: 16,
    ...renewxTextStyle('semibold'),
  },
  itemSkuText: {
    fontSize: 10.5,
    color: renewxColors.textMuted,
    marginTop: 2,
    ...renewxTextStyle('regular'),
  },
  itemPriceText: {
    fontSize: 12.5,
    color: renewxColors.black,
    ...renewxTextStyle('bold'),
  },
  itemUnitPriceText: {
    fontSize: 10,
    color: '#94A3B8',
    ...renewxTextStyle('regular'),
  },
  financialCard: {
    backgroundColor: renewxColors.surface,
    borderWidth: 1,
    borderColor: renewxColors.border,
    borderRadius: 16,
    padding: 14,
  },
  financialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 7,
  },
  financialLabel: {
    fontSize: 11.5,
    color: renewxColors.textMuted,
    ...renewxTextStyle('regular'),
  },
  financialValue: {
    fontSize: 11.5,
    color: renewxColors.black,
    ...renewxTextStyle('semibold'),
  },
  financialDivider: {
    height: 1,
    backgroundColor: renewxColors.border,
    marginVertical: 8,
  },
  financialTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  financialTotalLabel: {
    fontSize: 13,
    color: renewxColors.black,
    ...renewxTextStyle('extraBold'),
  },
  financialTotalValue: {
    fontSize: 16,
    color: renewxColors.black,
    ...renewxTextStyle('extraBold'),
  },
  paymentMetaBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: renewxColors.background,
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
  },
  paymentMetaItem: {
    flex: 1,
  },
  paymentMetaLabel: {
    fontSize: 10,
    color: '#94A3B8',
    textTransform: 'uppercase',
    ...renewxTextStyle('bold'),
  },
  paymentMetaValue: {
    fontSize: 11,
    color: renewxColors.black,
    marginTop: 2,
    ...renewxTextStyle('bold'),
  },
  customerProfileCard: {
    backgroundColor: renewxColors.surface,
    borderWidth: 1,
    borderColor: renewxColors.border,
    borderRadius: 16,
    padding: 14,
  },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  profileAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: renewxColors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    fontSize: 13,
    color: renewxColors.white,
    ...renewxTextStyle('extraBold'),
  },
  customerNameLarge: {
    fontSize: 14,
    color: renewxColors.black,
    ...renewxTextStyle('bold'),
  },
  customerSinceText: {
    fontSize: 11,
    color: renewxColors.textMuted,
    ...renewxTextStyle('regular'),
  },
  contactActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: renewxColors.surfaceMuted,
  },
  contactActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: renewxColors.background,
    borderWidth: 1,
    borderColor: renewxColors.border,
    paddingVertical: 7,
    borderRadius: 8,
  },
  contactActionText: {
    fontSize: 11.5,
    color: renewxColors.black,
    ...renewxTextStyle('semibold'),
  },
  infoFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 7,
  },
  infoFieldText: {
    fontSize: 12,
    color: renewxColors.textSecondary,
    ...renewxTextStyle('regular'),
  },
  addressCard: {
    backgroundColor: renewxColors.surface,
    borderWidth: 1,
    borderColor: renewxColors.border,
    borderRadius: 16,
    padding: 14,
  },
  addressTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  addressCardTitle: {
    fontSize: 12.5,
    color: renewxColors.black,
    flex: 1,
    ...renewxTextStyle('bold'),
  },
  copyAddressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  copyAddressText: {
    fontSize: 11,
    color: renewxColors.info,
    ...renewxTextStyle('bold'),
  },
  fullAddressText: {
    fontSize: 12,
    color: renewxColors.textSecondary,
    lineHeight: 18,
    ...renewxTextStyle('regular'),
  },
  pincodeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: renewxColors.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 8,
  },
  pincodeText: {
    fontSize: 10.5,
    color: renewxColors.black,
    ...renewxTextStyle('bold'),
  },
  invoiceToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  invoiceDocTitle: {
    fontSize: 13,
    color: renewxColors.black,
    letterSpacing: 0.5,
    ...renewxTextStyle('extraBold'),
  },
  invoiceDocSub: {
    fontSize: 11,
    color: renewxColors.textMuted,
    ...renewxTextStyle('regular'),
  },
  downloadInvoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: renewxColors.black,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  downloadInvoiceBtnText: {
    fontSize: 12,
    color: renewxColors.white,
    ...renewxTextStyle('bold'),
  },
  invoicePaper: {
    backgroundColor: renewxColors.surface,
    borderWidth: 1,
    borderColor: renewxColors.borderStrong,
    borderRadius: 14,
    padding: 14,
  },
  invoiceSectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  invoiceBrand: {
    fontSize: 14,
    color: renewxColors.black,
    ...renewxTextStyle('black'),
  },
  invoiceMncAddress: {
    fontSize: 10,
    color: renewxColors.textMuted,
    lineHeight: 14,
    marginTop: 2,
    ...renewxTextStyle('regular'),
  },
  invoiceMetaKey: {
    fontSize: 10,
    color: renewxColors.textSecondary,
    lineHeight: 14,
    ...renewxTextStyle('regular'),
  },
  invoiceDivider: {
    height: 1,
    backgroundColor: renewxColors.border,
    marginVertical: 10,
  },
  invoiceBillToBox: {
    marginBottom: 10,
  },
  invoiceSubheading: {
    fontSize: 10,
    color: '#94A3B8',
    letterSpacing: 0.5,
    ...renewxTextStyle('extraBold'),
  },
  invoiceCustomerName: {
    fontSize: 12.5,
    color: renewxColors.black,
    marginTop: 2,
    ...renewxTextStyle('bold'),
  },
  invoiceCustomerDetail: {
    fontSize: 10.5,
    color: renewxColors.textSecondary,
    lineHeight: 15,
    ...renewxTextStyle('regular'),
  },
  invoiceTable: {
    borderWidth: 1,
    borderColor: renewxColors.border,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 10,
  },
  tableHeadRow: {
    flexDirection: 'row',
    backgroundColor: renewxColors.background,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: renewxColors.border,
  },
  tableHeadCell: {
    fontSize: 10,
    color: renewxColors.textMuted,
    ...renewxTextStyle('extraBold'),
  },
  tableDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: renewxColors.surfaceMuted,
  },
  tableItemName: {
    fontSize: 11,
    color: renewxColors.black,
    ...renewxTextStyle('semibold'),
  },
  tableHsnText: {
    fontSize: 9.5,
    color: '#94A3B8',
    ...renewxTextStyle('regular'),
  },
  tableDataCell: {
    fontSize: 11,
    color: renewxColors.textSecondary,
    ...renewxTextStyle('regular'),
  },
  invoiceTotalsCard: {
    paddingHorizontal: 8,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  totalsLabel: {
    fontSize: 10.5,
    color: renewxColors.textMuted,
    ...renewxTextStyle('regular'),
  },
  totalsVal: {
    fontSize: 10.5,
    color: renewxColors.black,
    ...renewxTextStyle('semibold'),
  },
  totalsDivider: {
    height: 1,
    backgroundColor: renewxColors.border,
    marginVertical: 4,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  grandTotalLabel: {
    fontSize: 12,
    color: renewxColors.black,
    ...renewxTextStyle('extraBold'),
  },
  grandTotalVal: {
    fontSize: 13,
    color: renewxColors.black,
    ...renewxTextStyle('extraBold'),
  },
  invoiceFooterNote: {
    fontSize: 9.5,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
    ...renewxTextStyle('regular'),
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: renewxColors.surfaceMuted,
  },
  deleteOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  deleteOrderBtnText: {
    fontSize: 11.5,
    color: renewxColors.error,
    ...renewxTextStyle('semibold'),
  },
  dismissBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  dismissBtnText: {
    fontSize: 12,
    color: renewxColors.textMuted,
    ...renewxTextStyle('semibold'),
  },
});
