import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { useToast } from '@/context/ToastContext';
import type { Product } from '@/types';
import { renewxFontFamily, renewxRadius } from '@/design-system';

export default function PromotionsManagementView() {
  const toast = useToast();

  const [title, setTitle] = useState('🔥 Weekend Device Deals 🔥');
  const [body, setBody] = useState('Blockbuster deals on selected devices • Limited stock');

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [selectedProduct1, setSelectedProduct1] = useState<Product | null>(null);
  const [selectedProduct2, setSelectedProduct2] = useState<Product | null>(null);

  const [pickerTarget, setPickerTarget] = useState<'product1' | 'product2' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [sending, setSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError?: boolean } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch real products from inventory
  const loadInventory = useCallback(async () => {
    try {
      setLoadingProducts(true);
      const res: any = await api.products.getAll();
      const list: Product[] = Array.isArray(res) ? res : res?.data || [];
      setProducts(list);
      if (list.length >= 2) {
        setSelectedProduct1((prev) => prev || list[0]);
        setSelectedProduct2((prev) => prev || list[1]);
      } else if (list.length === 1) {
        setSelectedProduct1((prev) => prev || list[0]);
      }
    } catch (err: any) {
      setStatusMessage({
        text: err?.message || 'Failed loading live products for promotion',
        isError: true,
      });
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadInventory();
    setRefreshing(false);
  }, [loadInventory]);

  // Filter products for the picker modal
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase().trim();
    return products.filter((p) => {
      const nameMatch = p.name?.toLowerCase().includes(q);
      const brandMatch = (p as any).brand?.toLowerCase().includes(q);
      const catMatch = p.category?.toLowerCase().includes(q);
      return nameMatch || brandMatch || catMatch;
    });
  }, [products, searchQuery]);

  const handleSelectProduct = (product: Product) => {
    if (pickerTarget === 'product1') {
      if (selectedProduct2 && String(selectedProduct2.id) === String(product.id)) {
        Alert.alert('Notice', 'Please choose two different products for the rich promotion.');
        return;
      }
      setSelectedProduct1(product);
    } else if (pickerTarget === 'product2') {
      if (selectedProduct1 && String(selectedProduct1.id) === String(product.id)) {
        Alert.alert('Notice', 'Please choose two different products for the rich promotion.');
        return;
      }
      setSelectedProduct2(product);
    }
    setPickerTarget(null);
    setSearchQuery('');
  };

  const handleConfirmSend = () => {
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();

    if (!trimmedTitle) {
      Alert.alert('Validation Error', 'Please enter a promotion title.');
      return;
    }
    if (!trimmedBody) {
      Alert.alert('Validation Error', 'Please enter a promotion message.');
      return;
    }
    if (!selectedProduct1?.id) {
      Alert.alert('Validation Error', 'Please select Product 1.');
      return;
    }
    if (!selectedProduct2?.id) {
      Alert.alert('Validation Error', 'Please select Product 2.');
      return;
    }
    if (String(selectedProduct1.id) === String(selectedProduct2.id)) {
      Alert.alert('Validation Error', 'Product 1 and Product 2 must be different devices.');
      return;
    }

    Alert.alert(
      'Confirm Broadcast',
      `Dispatch rich push notification "${trimmedTitle}" featuring "${selectedProduct1.name}" and "${selectedProduct2.name}" to all customer devices?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Broadcast',
          style: 'default',
          onPress: executeSend,
        },
      ]
    );
  };

  const executeSend = async () => {
    try {
      setSending(true);
      setStatusMessage(null);

      const res = await api.notifications.sendPromotion({
        title: title.trim(),
        body: body.trim(),
        product1Id: String(selectedProduct1!.id),
        product2Id: String(selectedProduct2!.id),
      });

      const count = res?.data?.recipientsCount || 0;
      const inApp = res?.data?.inAppCount || 0;
      const msg = `🎉 Broadcast dispatched! Sent to ${count} active Android device(s) and ${inApp} customer inboxes.`;

      setStatusMessage({ text: msg, isError: false });
      toast.success('Promotion Sent', `Dispatched to ${count} device(s)`);
    } catch (err: any) {
      const errText = err?.message || 'Failed to dispatch promotional notification';
      setStatusMessage({ text: errText, isError: true });
      toast.error('Failed', errText);
    } finally {
      setSending(false);
    }
  };

  const p1Price = selectedProduct1?.price ? `₹${Number(selectedProduct1.price).toLocaleString('en-IN')}` : '₹--';
  const p1OldPrice = (selectedProduct1 as any)?.original_price
    ? `₹${Number((selectedProduct1 as any).original_price).toLocaleString('en-IN')}`
    : '';
  const p1Img = (selectedProduct1 as any)?.image_url || selectedProduct1?.image || (Array.isArray(selectedProduct1?.images) ? selectedProduct1?.images[0] : '');

  const p2Price = selectedProduct2?.price ? `₹${Number(selectedProduct2.price).toLocaleString('en-IN')}` : '₹--';
  const p2OldPrice = (selectedProduct2 as any)?.original_price
    ? `₹${Number((selectedProduct2 as any).original_price).toLocaleString('en-IN')}`
    : '';
  const p2Img = (selectedProduct2 as any)?.image_url || selectedProduct2?.image || (Array.isArray(selectedProduct2?.images) ? selectedProduct2?.images[0] : '');

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
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
      {/* Header Info */}
      <View style={styles.header}>
        <View style={styles.headerIconWrap}>
          <Ionicons name="megaphone-outline" size={24} color="#D97706" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Rich Promotional Notifications</Text>
          <Text style={styles.headerSubtitle}>
            Broadcast dual-product Android notifications with custom RemoteViews layouts and deep links.
          </Text>
        </View>
      </View>

      {/* Status Alert Banner */}
      {statusMessage && (
        <View style={[styles.statusBanner, statusMessage.isError ? styles.statusBannerError : styles.statusBannerSuccess]}>
          <Ionicons
            name={statusMessage.isError ? 'alert-circle' : 'checkmark-circle'}
            size={20}
            color={statusMessage.isError ? '#DC2626' : '#16A34A'}
          />
          <Text style={[styles.statusText, statusMessage.isError ? styles.statusTextError : styles.statusTextSuccess]}>
            {statusMessage.text}
          </Text>
        </View>
      )}

      {/* FORM INPUTS */}
      <View style={styles.card}>
        <Text style={styles.sectionHeading}>1. Campaign Content</Text>

        <Text style={styles.fieldLabel}>Notification Title ({title.length}/100)</Text>
        <TextInput
          style={styles.textInput}
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. 🔥 Weekend Device Deals 🔥"
          placeholderTextColor="#94A3B8"
          maxLength={100}
        />

        <Text style={styles.fieldLabel}>Message / Subtitle ({body.length}/200)</Text>
        <TextInput
          style={[styles.textInput, { height: 74, textAlignVertical: 'top' }]}
          value={body}
          onChangeText={setBody}
          placeholder="e.g. Blockbuster deals on selected devices"
          placeholderTextColor="#94A3B8"
          multiline
          maxLength={200}
        />

        {/* PRODUCT PICKERS */}
        <Text style={[styles.sectionHeading, { marginTop: 20 }]}>2. Select 2 Featured Devices</Text>

        <View style={styles.pickerRow}>
          {/* PRODUCT 1 SELECTOR */}
          <View style={styles.pickerCol}>
            <Text style={styles.subFieldLabel}>Product 1</Text>
            <TouchableOpacity
              style={styles.productSelectCard}
              onPress={() => setPickerTarget('product1')}
              activeOpacity={0.8}
            >
              {selectedProduct1 ? (
                <View style={styles.selectedProductContent}>
                  {p1Img ? (
                    <Image source={{ uri: p1Img }} style={styles.selectedThumb} resizeMode="contain" />
                  ) : (
                    <View style={styles.thumbPlaceholder}>
                      <Ionicons name="phone-portrait-outline" size={24} color="#94A3B8" />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.selectedName} numberOfLines={1}>
                      {selectedProduct1.name}
                    </Text>
                    <Text style={styles.selectedPrice}>{p1Price}</Text>
                  </View>
                  <Ionicons name="chevron-down" size={16} color="#64748B" />
                </View>
              ) : (
                <View style={styles.emptySelectContent}>
                  <Ionicons name="add-circle-outline" size={22} color="#D97706" />
                  <Text style={styles.emptySelectText}>Choose Product 1</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* PRODUCT 2 SELECTOR */}
          <View style={styles.pickerCol}>
            <Text style={styles.subFieldLabel}>Product 2</Text>
            <TouchableOpacity
              style={styles.productSelectCard}
              onPress={() => setPickerTarget('product2')}
              activeOpacity={0.8}
            >
              {selectedProduct2 ? (
                <View style={styles.selectedProductContent}>
                  {p2Img ? (
                    <Image source={{ uri: p2Img }} style={styles.selectedThumb} resizeMode="contain" />
                  ) : (
                    <View style={styles.thumbPlaceholder}>
                      <Ionicons name="phone-portrait-outline" size={24} color="#94A3B8" />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.selectedName} numberOfLines={1}>
                      {selectedProduct2.name}
                    </Text>
                    <Text style={styles.selectedPrice}>{p2Price}</Text>
                  </View>
                  <Ionicons name="chevron-down" size={16} color="#64748B" />
                </View>
              ) : (
                <View style={styles.emptySelectContent}>
                  <Ionicons name="add-circle-outline" size={22} color="#D97706" />
                  <Text style={styles.emptySelectText}>Choose Product 2</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* LIVE ANDROID NOTIFICATION PREVIEW */}
      <View style={styles.card}>
        <View style={styles.previewHeaderRow}>
          <Text style={styles.sectionHeading}>3. Android Expanded Notification Preview</Text>
          <View style={styles.previewLivePill}>
            <View style={styles.liveDot} />
            <Text style={styles.previewLiveText}>Live Preview</Text>
          </View>
        </View>

        {/* Android Shade Container */}
        <View style={styles.androidShade}>
          {/* Notification Header */}
          <View style={styles.notifHeaderRow}>
            <View style={styles.brandBadgePill}>
              <Text style={styles.brandBadgeText}>RenewX</Text>
            </View>
            <Text style={styles.notifMetaText}>• now</Text>
            <View style={{ flex: 1 }} />
            <Ionicons name="chevron-up" size={15} color="#94A3B8" />
          </View>

          {/* Title & Body */}
          <Text style={styles.notifTitle} numberOfLines={1}>
            {title || '🔥 Weekend Device Deals 🔥'}
          </Text>
          <Text style={styles.notifBody} numberOfLines={1}>
            {body || 'Blockbuster deals on selected devices'}
          </Text>

          {/* Expanded 2-Product Cards Layout */}
          <View style={styles.notifCardsRow}>
            {/* Card 1 */}
            <View style={styles.notifCard}>
              <View style={styles.notifImageWrap}>
                {p1Img ? (
                  <Image source={{ uri: p1Img }} style={styles.notifImage} resizeMode="contain" />
                ) : (
                  <Ionicons name="phone-portrait-outline" size={36} color="#CBD5E1" />
                )}
              </View>
              <View style={styles.notifCardInfo}>
                <Text style={styles.notifCardName} numberOfLines={1}>
                  {selectedProduct1?.name || 'iPhone 14 Pro'}
                </Text>
                <View style={styles.notifPriceRow}>
                  <Text style={styles.notifCardPrice}>{p1Price}</Text>
                  {p1OldPrice ? <Text style={styles.notifCardOldPrice}>{p1OldPrice}</Text> : null}
                </View>
              </View>
              <View style={styles.notifYellowFooter}>
                <Text style={styles.notifYellowFooterText}>View Deal →</Text>
              </View>
            </View>

            {/* Card 2 */}
            <View style={styles.notifCard}>
              <View style={styles.notifImageWrap}>
                {p2Img ? (
                  <Image source={{ uri: p2Img }} style={styles.notifImage} resizeMode="contain" />
                ) : (
                  <Ionicons name="phone-portrait-outline" size={36} color="#CBD5E1" />
                )}
              </View>
              <View style={styles.notifCardInfo}>
                <Text style={styles.notifCardName} numberOfLines={1}>
                  {selectedProduct2?.name || 'Galaxy S23'}
                </Text>
                <View style={styles.notifPriceRow}>
                  <Text style={styles.notifCardPrice}>{p2Price}</Text>
                  {p2OldPrice ? <Text style={styles.notifCardOldPrice}>{p2OldPrice}</Text> : null}
                </View>
              </View>
              <View style={styles.notifYellowFooter}>
                <Text style={styles.notifYellowFooterText}>View Deal →</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* DISPATCH ACTION BUTTON */}
      <TouchableOpacity
        style={[styles.sendButton, sending && styles.sendButtonDisabled]}
        onPress={handleConfirmSend}
        disabled={sending}
        activeOpacity={0.85}
      >
        {sending ? (
          <View style={styles.buttonInner}>
            <ActivityIndicator size="small" color="#000000" />
            <Text style={styles.sendButtonText}>Broadcasting to devices...</Text>
          </View>
        ) : (
          <View style={styles.buttonInner}>
            <Ionicons name="paper-plane" size={18} color="#000000" />
            <Text style={styles.sendButtonText}>Broadcast Rich Notification</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* PRODUCT SELECTION MODAL */}
      <Modal
        visible={pickerTarget !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setPickerTarget(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Select {pickerTarget === 'product1' ? 'Product 1' : 'Product 2'}
              </Text>
              <TouchableOpacity onPress={() => setPickerTarget(null)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color="#0F172A" />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.modalSearchBox}>
              <Ionicons name="search" size={17} color="#94A3B8" />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search products by title, brand, category..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={17} color="#94A3B8" />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Product List */}
            {loadingProducts ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color="#FACC15" />
                <Text style={styles.modalLoadingText}>Loading verified inventory...</Text>
              </View>
            ) : filteredProducts.length === 0 ? (
              <View style={styles.modalEmpty}>
                <Ionicons name="cube-outline" size={36} color="#CBD5E1" />
                <Text style={styles.modalEmptyText}>No matching products found</Text>
              </View>
            ) : (
              <ScrollView style={styles.productListScroll}>
                {filteredProducts.map((p) => {
                  const pId = String(p.id);
                  const isSelected =
                    (pickerTarget === 'product1' && selectedProduct1?.id === p.id) ||
                    (pickerTarget === 'product2' && selectedProduct2?.id === p.id);
                  const thumb = (p as any)?.image_url || p.image || (Array.isArray(p.images) ? p.images[0] : '');

                  return (
                    <TouchableOpacity
                      key={pId}
                      style={[styles.productItemRow, isSelected && styles.productItemRowSelected]}
                      onPress={() => handleSelectProduct(p)}
                      activeOpacity={0.7}
                    >
                      {thumb ? (
                        <Image source={{ uri: thumb }} style={styles.itemThumb} resizeMode="contain" />
                      ) : (
                        <View style={styles.thumbPlaceholder}>
                          <Ionicons name="phone-portrait-outline" size={20} color="#94A3B8" />
                        </View>
                      )}
                      <View style={{ flex: 1, marginHorizontal: 10 }}>
                        <Text style={styles.itemName} numberOfLines={1}>
                          {p.name}
                        </Text>
                        <Text style={styles.itemCategory}>
                          {p.category || 'Device'} • {(p as any).specs?.[0] || 'Certified'}
                        </Text>
                      </View>
                      <Text style={styles.itemPrice}>
                        ₹{Number(p.price || 0).toLocaleString('en-IN')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  headerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#92400E',
    fontFamily: renewxFontFamily.bold,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 2,
    lineHeight: 16,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  statusBannerSuccess: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  statusBannerError: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  statusText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  statusTextSuccess: {
    color: '#15803D',
  },
  statusTextError: {
    color: '#B91C1C',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: renewxFontFamily.bold,
    marginBottom: 10,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginTop: 8,
    marginBottom: 4,
  },
  subFieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  pickerRow: {
    flexDirection: 'row',
    gap: 12,
  },
  pickerCol: {
    flex: 1,
  },
  productSelectCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 10,
    minHeight: 74,
    justifyContent: 'center',
  },
  selectedProductContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  thumbPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  selectedPrice: {
    fontSize: 12,
    fontWeight: '800',
    color: '#16A34A',
    marginTop: 2,
  },
  emptySelectContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  emptySelectText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
  },

  /* Preview Styles */
  previewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  previewLivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  previewLiveText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#166534',
  },
  androidShade: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  notifHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  brandBadgePill: {
    backgroundColor: '#FEF08A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FACC15',
  },
  brandBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000000',
  },
  notifMetaText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  notifBody: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 10,
  },
  notifCardsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  notifCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  notifImageWrap: {
    height: 96,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  notifImage: {
    width: '100%',
    height: '100%',
  },
  notifCardInfo: {
    padding: 8,
  },
  notifCardName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  notifPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  notifCardPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  notifCardOldPrice: {
    fontSize: 10,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  notifYellowFooter: {
    height: 24,
    backgroundColor: '#FFC400',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifYellowFooterText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#000000',
  },

  /* Send Button */
  sendButton: {
    backgroundColor: '#FFC400',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 2,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sendButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#000000',
    fontFamily: renewxFontFamily.bold,
  },

  /* Modal Styles */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 12,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 0,
  },
  modalLoading: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 8,
  },
  modalLoadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  modalEmpty: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 8,
  },
  modalEmptyText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  productListScroll: {
    maxHeight: 380,
  },
  productItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    borderRadius: 10,
  },
  productItemRowSelected: {
    backgroundColor: '#FEF9C3',
  },
  itemThumb: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  itemCategory: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
});
