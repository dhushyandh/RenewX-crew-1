import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  Platform,
  Switch,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useToast } from '@/context/ToastContext';
import { api } from '@/services/api';
import { getCategoryDeviceImage } from '@/lib/imageUtils';
import { useSafeHeaderTop } from '@/lib/useSafeHeaderTop';
import { confirmAction } from '@/lib/confirmAction';
import { initialBrands, type BrandItem } from '@/data/brandsData';

export interface ProductRow {
  id: string;
  name: string;
  brand: string;
  model?: string;
  category: string;
  price: number;
  original_price?: number;
  stock: number;
  condition: string;
  image_url: string;
  images?: string[];
  description?: string;
  specs?: string[];
  created_at?: string;
}

interface ProductModalProps {
  visible: boolean;
  product: ProductRow | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function AddProductModal({
  visible,
  product,
  onClose,
  onSaved,
}: ProductModalProps) {
  const toast = useToast();
  const safeTop = useSafeHeaderTop();
  const { width: windowWidth } = useWindowDimensions();
  const isSplitView = windowWidth >= 960;
  const [deleting, setDeleting] = useState(false);

  const handleDeleteProduct = () => {
    if (!product) return;
    const prodId = product.id || (product as any)._id;
    if (!prodId) return;

    confirmAction(
      'Delete Product',
      `Are you sure you want to permanently delete "${product.name || 'this product'}"? This action cannot be undone.`,
      async () => {
        try {
          setDeleting(true);
          await api.products.delete(prodId);
          toast.success(`"${product.name || 'Product'}" was deleted successfully.`, 'Product Removed');
          onSaved();
          onClose();
        } catch (err: any) {
          toast.error(err?.message || 'Failed to delete product', 'Error');
        } finally {
          setDeleting(false);
        }
      }
    );
  };

  // 1. Form States initialized with mockup defaults if new product
  const [productName, setProductName] = useState(
    product?.name || (product ? '' : 'Apple iPhone 14 Pro')
  );
  const [brand, setBrand] = useState(product?.brand || (product ? '' : 'Apple'));
  const [model, setModel] = useState(product?.model || (product ? '' : 'iPhone 14 Pro'));
  const [category, setCategory] = useState(product?.category || (product ? '' : 'Smartphones'));

  // Available brands list: initial static brands + any created via Admin API
  const [availableBrands, setAvailableBrands] = useState<BrandItem[]>(initialBrands);

  useEffect(() => {
    let active = true;
    api.brands
      .getAll()
      .then((res: any) => {
        if (!active) return;
        const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
        if (list.length > 0) {
          const merged = [...initialBrands];
          list.forEach((b: any) => {
            const name = b.name || b.brandName;
            if (name && !merged.some((m) => m.name.toLowerCase() === name.toLowerCase())) {
              merged.push({
                id: b.id || b._id || name.toLowerCase(),
                name,
                logo: b.logo || b.logo_url || b.imageUrl || b.image_url || '',
                category: b.category || 'SMARTPHONES',
                description: b.description || '',
              });
            }
          });
          setAvailableBrands(merged);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Compute selected brand logo
  const selectedBrandLogo = useMemo(() => {
    if (!brand) return undefined;
    const found = availableBrands.find(
      (b) => b.name.toLowerCase() === brand.toLowerCase() || b.id.toLowerCase() === brand.toLowerCase()
    );
    return found?.logo || found?.logo_url;
  }, [brand, availableBrands]);

  // Images state
  const [images, setImages] = useState<string[]>(
    product?.image_url
      ? [product.image_url, ...(product.images || []).filter((img) => img !== product.image_url)]
      : []
  );
  const [addImageModal, setAddImageModal] = useState(false);
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);

  // Helper to upload a single picked asset to server or fallback
  const uploadAsset = async (asset: ImagePicker.ImagePickerAsset): Promise<string> => {
    const fileName = asset.fileName || `product-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
    const mimeType = asset.mimeType || 'image/jpeg';

    // 1. Try base64 upload to server if base64 is available
    if (asset.base64) {
      try {
        const res = await api.upload.base64(asset.base64, fileName, mimeType);
        if (res?.url) return res.url;
      } catch (e) {
        console.warn('[AddProductModal] base64 upload to server failed:', e);
      }
    }

    // 2. Try multipart image upload if uri is available
    if (asset.uri) {
      try {
        const res = await api.upload.image({
          uri: asset.uri,
          name: fileName,
          type: mimeType,
        });
        if (res?.url) return res.url;
      } catch (e) {
        console.warn('[AddProductModal] multipart upload failed:', e);
      }
    }

    // 3. Robust fallback: if base64 exists, format as direct data URI
    if (asset.base64) {
      return asset.base64.startsWith('data:')
        ? asset.base64
        : `data:${mimeType};base64,${asset.base64}`;
    }

    // 4. Fallback to asset.uri
    return asset.uri;
  };

  const handlePickFromGallery = async () => {
    if (images.length >= 8) {
      toast.info('Maximum 8 images allowed per product');
      return;
    }

    try {
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permission Required', 'Please allow photo gallery access in settings to upload images.');
          return;
        }
      }

      const remainingSlots = Math.max(1, 8 - images.length);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: remainingSlots,
        quality: 0.85,
        base64: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      setUploadingImages(true);
      const newUrls: string[] = [];

      for (let i = 0; i < result.assets.length; i++) {
        setUploadProgressText(`Uploading ${i + 1} of ${result.assets.length}...`);
        try {
          const uploadedUrl = await uploadAsset(result.assets[i]);
          if (uploadedUrl) newUrls.push(uploadedUrl);
        } catch (uploadErr) {
          console.warn('Failed to upload asset:', uploadErr);
        }
      }

      if (newUrls.length > 0) {
        setImages((prev) => [...prev, ...newUrls].slice(0, 8));
        toast.success(`${newUrls.length} image(s) added successfully`);
      }
    } catch (err: any) {
      Alert.alert('Upload Error', err?.message || 'Could not pick images from gallery.');
    } finally {
      setUploadingImages(false);
      setUploadProgressText('');
    }
  };

  const handleTakePhoto = async () => {
    if (images.length >= 8) {
      toast.info('Maximum 8 images allowed per product');
      return;
    }

    try {
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permission Required', 'Please allow camera access in device settings to take product photos.');
          return;
        }
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        base64: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      setUploadingImages(true);
      setUploadProgressText('Processing photo...');

      const uploadedUrl = await uploadAsset(result.assets[0]);
      if (uploadedUrl) {
        setImages((prev) => [...prev, uploadedUrl].slice(0, 8));
        toast.success('Photo captured and attached');
      }
    } catch (err: any) {
      Alert.alert('Camera Error', err?.message || 'Could not launch camera.');
    } finally {
      setUploadingImages(false);
      setUploadProgressText('');
    }
  };

  const handleOpenImagePicker = () => {
    if (images.length >= 8) {
      toast.info('Maximum 8 images allowed');
      return;
    }
    if (Platform.OS === 'web') {
      handlePickFromGallery();
    } else {
      Alert.alert(
        'Upload Product Image',
        'Choose how you want to add this photo:',
        [
          { text: '📁 Photo Gallery', onPress: handlePickFromGallery },
          { text: '📷 Take Photo', onPress: handleTakePhoto },
          { text: '🔗 Image URL', onPress: () => setAddImageModal(true) },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  };

  const handleSetCover = (index: number) => {
    if (index <= 0 || index >= images.length) return;
    setImages((prev) => {
      const selected = prev[index];
      const rest = prev.filter((_, i) => i !== index);
      return [selected, ...rest];
    });
    toast.success('Set as primary cover photo');
  };

  const handleReplaceImage = async (index: number) => {
    try {
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permission Required', 'Please allow photo gallery access in settings.');
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: false,
        quality: 0.85,
        base64: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      setUploadingImages(true);
      setUploadProgressText('Replacing image...');
      const uploadedUrl = await uploadAsset(result.assets[0]);

      if (uploadedUrl) {
        setImages((prev) => {
          const next = [...prev];
          next[index] = uploadedUrl;
          return next;
        });
        toast.success('Image replaced successfully');
      }
    } catch (err: any) {
      Alert.alert('Replace Error', err?.message || 'Could not replace image.');
    } finally {
      setUploadingImages(false);
      setUploadProgressText('');
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    toast.info('Image removed');
  };

  const handleAddImage = () => {
    const trimmed = customImageUrl.trim();
    if (trimmed) {
      if (images.length >= 8) {
        toast.info('Maximum 8 images allowed');
        return;
      }
      setImages((prev) => [...prev, trimmed].slice(0, 8));
      setCustomImageUrl('');
      setAddImageModal(false);
      toast.success('Image link attached');
    }
  };

  // 2. Specifications
  const [storage, setStorage] = useState('128 GB');
  const [color, setColor] = useState('Deep Purple');
  const [condition, setCondition] = useState('Excellent');
  const [batteryHealth, setBatteryHealth] = useState('Above 85%');
  const [boxAccessories, setBoxAccessories] = useState('With charger & cable');
  const [imei, setImei] = useState('');

  // Description
  const [description, setDescription] = useState(
    product?.description ||
      'Apple iPhone 14 Pro in excellent condition. Fully functional, minimal signs of previous use. Comes with original charger and cable.'
  );

  // 3. Pricing & Stock
  const [sellingPrice, setSellingPrice] = useState(product ? String(product.price) : '53999');
  const [mrp, setMrp] = useState(product ? String(product.original_price || '') : '74900');
  const [stock, setStock] = useState(product ? Number(product.stock) || 1 : 5);

  // Calculated discount
  const discountPercent = useMemo(() => {
    const sp = parseFloat(sellingPrice) || 0;
    const orig = parseFloat(mrp) || 0;
    if (orig > sp && sp > 0) {
      return Math.round(((orig - sp) / orig) * 100);
    }
    return 28;
  }, [sellingPrice, mrp]);

  // Active step in stepper
  const [activeStep, setActiveStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Dropdown Picker Modal
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerModal, setPickerModal] = useState<{
    visible: boolean;
    title: string;
    options: { label: string; value: string; color?: string; icon?: string; logo?: string }[];
    onSelect: (val: string) => void;
  }>({
    visible: false,
    title: '',
    options: [],
    onSelect: () => {},
  });

  const openPicker = (
    title: string,
    options: { label: string; value: string; color?: string; icon?: string; logo?: string }[],
    onSelect: (val: string) => void
  ) => {
    setPickerSearch('');
    setPickerModal({ visible: true, title, options, onSelect });
  };

  const filteredPickerOptions = useMemo(() => {
    if (!pickerSearch.trim()) return pickerModal.options;
    const q = pickerSearch.trim().toLowerCase();
    return pickerModal.options.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [pickerModal.options, pickerSearch]);


  const handleSaveProduct = async (asDraft = false) => {
    if (!productName.trim()) {
      Alert.alert('Required', 'Please enter a product name.');
      return;
    }
    const priceNum = parseInt(sellingPrice, 10);
    if (isNaN(priceNum) || priceNum <= 0) {
      Alert.alert('Required', 'Please enter a valid selling price.');
      return;
    }

    setSaving(true);
    const payload = {
      name: productName.trim(),
      brand: brand.trim() || 'Apple',
      model: model.trim() || 'iPhone 14 Pro',
      category: category.trim() || 'Smartphones',
      price: priceNum,
      original_price: parseInt(mrp, 10) || Math.round(priceNum * 1.38),
      stock: Math.max(0, stock),
      condition: condition.trim() || 'Excellent',
      image_url: images[0] || '',
      images: images.length > 0 ? images : undefined,
      description: description.trim(),
      specs: [
        `Storage: ${storage}`,
        `Color: ${color}`,
        `Battery Health: ${batteryHealth}`,
        `Accessories: ${boxAccessories}`,
        imei ? `IMEI: ${imei}` : '',
      ].filter(Boolean),
    };

    try {
      if (product?.id) {
        await api.products.update(product.id, payload);
        toast.success('Product updated successfully');
      } else {
        await api.products.create(payload);
        toast.success(asDraft ? 'Product saved as draft' : 'Product published to store');
      }
      onSaved();
    } catch (err: any) {
      Alert.alert('Save Failed', err?.message || 'Could not save product.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={newProdStyles.screenContainer}>
        {/* Top Header */}
        <View style={[newProdStyles.topBar, { paddingTop: safeTop }]}>
          <TouchableOpacity
            onPress={onClose}
            style={newProdStyles.backBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={20} color="#0F172A" />
          </TouchableOpacity>

          <View style={newProdStyles.topBarCenter}>
            <Text style={newProdStyles.topBarTitle} numberOfLines={1}>
              {product ? 'Edit Product' : 'Add New Product'}
            </Text>
            <View style={newProdStyles.topBarBadgeRow}>
              <View style={newProdStyles.adminDot} />
              <Text style={newProdStyles.topBarSubtitle}>RenewX Admin Inventory</Text>
            </View>
          </View>

          <View style={newProdStyles.topBarRight}>
            {product && (
              <TouchableOpacity
                style={[newProdStyles.topBarDeleteBtn, deleting && { opacity: 0.6 }]}
                onPress={handleDeleteProduct}
                disabled={deleting || saving}
                activeOpacity={0.8}
                accessibilityLabel="Delete Product"
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#DC2626" />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={15} color="#DC2626" style={{ marginRight: 4 }} />
                    <Text style={newProdStyles.topBarDeleteText}>Delete</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[newProdStyles.topBarSaveBtn, (saving || deleting) && newProdStyles.topBarSaveBtnDisabled]}
              onPress={() => handleSaveProduct(false)}
              disabled={saving || deleting}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#0F172A" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={15} color="#0F172A" style={{ marginRight: 4 }} />
                  <Text style={newProdStyles.topBarSaveText}>{product ? 'Update' : 'Publish'}</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onClose}
              style={newProdStyles.topBarCloseBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={18} color="#64748B" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Content Area (Split on large screens, single column on mobile) */}
        <View style={newProdStyles.mainSplitArea}>
          {/* LEFT COLUMN: The Product Addition Form */}
          <ScrollView
            style={newProdStyles.formColumn}
            contentContainerStyle={newProdStyles.formContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Title & Subtitle */}
            <Text style={newProdStyles.pageTitle}>
              {product ? 'Edit Product' : 'Add New Product'}
            </Text>
            <Text style={newProdStyles.pageSubtitle}>
              Upload product details and it will be visible to customers.
            </Text>

            {/* Stepper Progress Bar (1: Product Details, 2: Specifications, 3: Pricing & Stock, 4: Review & Publish) */}
            <View style={newProdStyles.stepperRow}>
              {[
                { step: 1, label: 'Product Details' },
                { step: 2, label: 'Specifications' },
                { step: 3, label: 'Pricing & Stock' },
                { step: 4, label: 'Review & Publish' },
              ].map((s, idx) => {
                const isCurrent = activeStep === s.step;
                const isPassed = activeStep > s.step;
                return (
                  <React.Fragment key={s.step}>
                    <TouchableOpacity
                      style={newProdStyles.stepNode}
                      onPress={() => setActiveStep(s.step)}
                      activeOpacity={0.8}
                    >
                      <View
                        style={[
                          newProdStyles.stepCircle,
                          isCurrent && newProdStyles.stepCircleActive,
                          isPassed && newProdStyles.stepCirclePassed,
                        ]}
                      >
                        <Text
                          style={[
                            newProdStyles.stepNumber,
                            isCurrent && newProdStyles.stepNumberActive,
                            isPassed && newProdStyles.stepNumberPassed,
                          ]}
                        >
                          {s.step}
                        </Text>
                      </View>
                      <Text
                        style={[
                          newProdStyles.stepLabel,
                          isCurrent && newProdStyles.stepLabelActive,
                        ]}
                        numberOfLines={1}
                      >
                        {s.label}
                      </Text>
                    </TouchableOpacity>

                    {idx < 3 && (
                      <View
                        style={[
                          newProdStyles.stepConnectingLine,
                          activeStep > s.step && newProdStyles.stepConnectingLineActive,
                        ]}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </View>

            {/* 1. Product Image */}
            <View style={newProdStyles.sectionBox}>
              <View style={newProdStyles.sectionHeaderRow}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={newProdStyles.sectionHeaderTitle}>Product Image</Text>
                  <Text style={newProdStyles.sectionSubtitle}>
                    Upload clear device photos from different angles (max 8 images)
                  </Text>
                </View>
                <View
                  style={[
                    newProdStyles.photoCountBadge,
                    images.length > 0 && newProdStyles.photoCountBadgeActive,
                  ]}
                >
                  <View
                    style={[
                      newProdStyles.photoCountDot,
                      images.length > 0 && newProdStyles.photoCountDotActive,
                    ]}
                  />
                  <Text style={newProdStyles.photoCountText}>
                    {images.length} / 8 Photos
                  </Text>
                </View>
              </View>

              {/* Uploading Status Banner */}
              {uploadingImages && (
                <View style={newProdStyles.uploadingBar}>
                  <ActivityIndicator size="small" color="#0F172A" />
                  <Text style={newProdStyles.uploadingBarText}>
                    {uploadProgressText || 'Uploading images...'}
                  </Text>
                </View>
              )}

              {/* Product Images Strip with exact design from reference */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={newProdStyles.productCardsScrollContent}
              >
                {/* 1. Uploaded Images */}
                {images.map((imgUri, index) => {
                  const isCover = index === 0;
                  return (
                    <View key={index} style={newProdStyles.productPhotoCard}>
                      <TouchableOpacity
                        onPress={() => setPreviewModalUrl(imgUri)}
                        activeOpacity={0.9}
                        style={newProdStyles.productPhotoImgWrap}
                      >
                        <Image source={{ uri: imgUri }} style={newProdStyles.productPhotoImg} resizeMode="contain" />

                        {isCover ? (
                          <View style={newProdStyles.cardCoverBadge}>
                            <Ionicons name="star" size={9} color="#0F172A" />
                            <Text style={newProdStyles.cardCoverBadgeText}>Cover</Text>
                          </View>
                        ) : (
                          <View style={newProdStyles.cardIndexBadge}>
                            <Text style={newProdStyles.cardIndexBadgeText}>#{index + 1}</Text>
                          </View>
                        )}

                        <TouchableOpacity
                          style={newProdStyles.cardDeleteBtn}
                          onPress={() => handleRemoveImage(index)}
                          activeOpacity={0.8}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <Ionicons name="close" size={13} color="#FFFFFF" />
                        </TouchableOpacity>
                      </TouchableOpacity>

                      <View style={newProdStyles.cardBottomActions}>
                        {!isCover ? (
                          <TouchableOpacity
                            style={newProdStyles.cardMakeCoverBtn}
                            onPress={() => handleSetCover(index)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="star-outline" size={11} color="#0F172A" />
                            <Text style={newProdStyles.cardMakeCoverText}>Make Cover</Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={newProdStyles.cardReplaceBtn}
                            onPress={() => handleReplaceImage(0)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="swap-horizontal-outline" size={11} color="#64748B" />
                            <Text style={newProdStyles.cardReplaceText}>Replace</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}

                {/* 2. Exact Dashed Upload Card matching user's design */}
                {images.length < 8 && (
                  <TouchableOpacity
                    style={newProdStyles.userRefUploadCard}
                    onPress={handleOpenImagePicker}
                    activeOpacity={0.8}
                    disabled={uploadingImages}
                  >
                    <View style={newProdStyles.userRefYellowCircle}>
                      <Ionicons name="camera" size={24} color="#0F172A" />
                    </View>
                    <Text style={newProdStyles.userRefCardTitle}>Product Image</Text>
                    <Text style={newProdStyles.userRefCardSub}>
                      {images.length === 0 ? 'Add Photo' : `Slot ${images.length + 1} of 8`}
                    </Text>
                  </TouchableOpacity>
                )}
              </ScrollView>

              {/* Action Toolbar & Guidance */}
              <View style={newProdStyles.imageSectionBottomRow}>
                <View style={newProdStyles.imageSectionPillsRow}>
                  <TouchableOpacity
                    style={newProdStyles.quickSourcePill}
                    onPress={handlePickFromGallery}
                    activeOpacity={0.8}
                    disabled={uploadingImages || images.length >= 8}
                  >
                    <Ionicons name="images-outline" size={13} color="#0F172A" />
                    <Text style={newProdStyles.quickSourcePillText}>Browse Files</Text>
                  </TouchableOpacity>

                  {Platform.OS !== 'web' && (
                    <TouchableOpacity
                      style={newProdStyles.quickSourcePill}
                      onPress={handleTakePhoto}
                      activeOpacity={0.8}
                      disabled={uploadingImages || images.length >= 8}
                    >
                      <Ionicons name="camera-outline" size={13} color="#0F172A" />
                      <Text style={newProdStyles.quickSourcePillText}>Camera</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={newProdStyles.quickSourcePill}
                    onPress={() => setAddImageModal(true)}
                    activeOpacity={0.8}
                    disabled={uploadingImages || images.length >= 8}
                  >
                    <Ionicons name="link-outline" size={13} color="#0F172A" />
                    <Text style={newProdStyles.quickSourcePillText}>Paste URL</Text>
                  </TouchableOpacity>
                </View>

                <Text style={newProdStyles.imageSectionHint}>
                  First image is storefront cover • Square 1:1 recommended
                </Text>
              </View>
            </View>

            {/* 2. Basic Information */}
            <View style={newProdStyles.sectionBox}>
              <Text style={newProdStyles.sectionHeaderTitle}>2. Basic Information</Text>

              <View style={newProdStyles.gridRow}>
                {/* Product Name */}
                <View style={newProdStyles.gridItem}>
                  <Text style={newProdStyles.inputLabel}>
                    Product Name <Text style={newProdStyles.asterisk}>*</Text>
                  </Text>
                  <TextInput
                    style={newProdStyles.textInputBox}
                    value={productName}
                    onChangeText={setProductName}
                    placeholder="e.g. Apple iPhone 14 Pro"
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                {/* Brand */}
                <View style={newProdStyles.gridItem}>
                  <Text style={newProdStyles.inputLabel}>
                    Brand <Text style={newProdStyles.asterisk}>*</Text>
                  </Text>
                  <TouchableOpacity
                    style={newProdStyles.selectBox}
                    onPress={() =>
                      openPicker(
                        'Select Brand',
                        availableBrands.map((b) => ({
                          label: b.name,
                          value: b.name,
                          logo: b.logo || b.logo_url || b.imageUrl || b.image_url,
                          icon: b.name.toLowerCase() === 'apple' ? 'logo-apple' : undefined,
                        })),
                        setBrand
                      )
                    }
                    activeOpacity={0.8}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      {selectedBrandLogo ? (
                        <View style={newProdStyles.selectedBrandLogoBox}>
                          <Image
                            source={{ uri: selectedBrandLogo }}
                            style={newProdStyles.selectedBrandLogoImg}
                            resizeMode="contain"
                          />
                        </View>
                      ) : brand && brand.toLowerCase() === 'apple' ? (
                        <Ionicons name="logo-apple" size={16} color="#0F172A" style={{ marginRight: 8 }} />
                      ) : (
                        <Ionicons name="pricetag-outline" size={16} color="#64748B" style={{ marginRight: 8 }} />
                      )}
                      <Text style={newProdStyles.selectBoxText} numberOfLines={1}>
                        {brand || 'Select Brand'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-down" size={16} color="#64748B" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={newProdStyles.gridRow}>
                {/* Model */}
                <View style={newProdStyles.gridItem}>
                  <Text style={newProdStyles.inputLabel}>
                    Model <Text style={newProdStyles.asterisk}>*</Text>
                  </Text>
                  <TextInput
                    style={newProdStyles.textInputBox}
                    value={model}
                    onChangeText={setModel}
                    placeholder="iPhone 14 Pro"
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                {/* Category */}
                <View style={newProdStyles.gridItem}>
                  <Text style={newProdStyles.inputLabel}>
                    Category <Text style={newProdStyles.asterisk}>*</Text>
                  </Text>
                  <TouchableOpacity
                    style={newProdStyles.selectBox}
                    onPress={() =>
                      openPicker(
                        'Select Category',
                        [
                          { label: 'Smartphones', value: 'Smartphones', icon: 'phone-portrait-outline' },
                          { label: 'Laptops', value: 'Laptops', icon: 'laptop-outline' },
                          { label: 'Audio', value: 'Audio', icon: 'headset-outline' },
                          { label: 'Tablets', value: 'Tablets', icon: 'tablet-portrait-outline' },
                          { label: 'Watches', value: 'Watches', icon: 'watch-outline' },
                        ],
                        setCategory
                      )
                    }
                    activeOpacity={0.8}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="phone-portrait-outline" size={16} color="#0F172A" style={{ marginRight: 6 }} />
                      <Text style={newProdStyles.selectBoxText}>{category || 'Smartphones'}</Text>
                    </View>
                    <Ionicons name="chevron-down" size={16} color="#64748B" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* 3. Specifications */}
            <View style={newProdStyles.sectionBox}>
              <Text style={newProdStyles.sectionHeaderTitle}>3. Specifications</Text>

              {/* Row 1: Storage & Color */}
              <View style={newProdStyles.gridRow}>
                <View style={newProdStyles.gridItem}>
                  <Text style={newProdStyles.inputLabel}>
                    Storage <Text style={newProdStyles.asterisk}>*</Text>
                  </Text>
                  <TouchableOpacity
                    style={newProdStyles.selectBox}
                    onPress={() =>
                      openPicker(
                        'Select Storage',
                        [
                          { label: '128 GB', value: '128 GB' },
                          { label: '256 GB', value: '256 GB' },
                          { label: '512 GB', value: '512 GB' },
                          { label: '1 TB', value: '1 TB' },
                          { label: '64 GB', value: '64 GB' },
                        ],
                        setStorage
                      )
                    }
                    activeOpacity={0.8}
                  >
                    <Text style={newProdStyles.selectBoxText}>{storage}</Text>
                    <Ionicons name="chevron-down" size={16} color="#64748B" />
                  </TouchableOpacity>
                </View>

                <View style={newProdStyles.gridItem}>
                  <Text style={newProdStyles.inputLabel}>
                    Color <Text style={newProdStyles.asterisk}>*</Text>
                  </Text>
                  <TouchableOpacity
                    style={newProdStyles.selectBox}
                    onPress={() =>
                      openPicker(
                        'Select Color',
                        [
                          { label: 'Deep Purple', value: 'Deep Purple', color: '#4E3C56' },
                          { label: 'Gold', value: 'Gold', color: '#F5E7D3' },
                          { label: 'Silver', value: 'Silver', color: '#E2E4E7' },
                          { label: 'Space Black', value: 'Space Black', color: '#2B2B2D' },
                          { label: 'Blue', value: 'Blue', color: '#3B82F6' },
                          { label: 'Midnight', value: 'Midnight', color: '#1E293B' },
                        ],
                        setColor
                      )
                    }
                    activeOpacity={0.8}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={[newProdStyles.colorDotSmall, { backgroundColor: '#4E3C56' }]} />
                      <Text style={newProdStyles.selectBoxText}>{color}</Text>
                    </View>
                    <Ionicons name="chevron-down" size={16} color="#64748B" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Row 2: Condition & Battery Health */}
              <View style={newProdStyles.gridRow}>
                <View style={newProdStyles.gridItem}>
                  <Text style={newProdStyles.inputLabel}>
                    Condition <Text style={newProdStyles.asterisk}>*</Text>
                  </Text>
                  <TouchableOpacity
                    style={newProdStyles.selectBox}
                    onPress={() =>
                      openPicker(
                        'Select Condition',
                        [
                          { label: 'Excellent', value: 'Excellent' },
                          { label: 'Good', value: 'Good' },
                          { label: 'Fair', value: 'Fair' },
                          { label: 'Like New', value: 'Like New' },
                        ],
                        setCondition
                      )
                    }
                    activeOpacity={0.8}
                  >
                    <Text style={newProdStyles.selectBoxText}>{condition}</Text>
                    <Ionicons name="chevron-down" size={16} color="#64748B" />
                  </TouchableOpacity>
                </View>

                <View style={newProdStyles.gridItem}>
                  <Text style={newProdStyles.inputLabel}>Battery Health</Text>
                  <TouchableOpacity
                    style={newProdStyles.selectBox}
                    onPress={() =>
                      openPicker(
                        'Select Battery Health',
                        [
                          { label: 'Above 85%', value: 'Above 85%' },
                          { label: '90%+', value: '90%+' },
                          { label: '100% (New Battery)', value: '100%' },
                          { label: '80% - 85%', value: '80% - 85%' },
                        ],
                        setBatteryHealth
                      )
                    }
                    activeOpacity={0.8}
                  >
                    <Text style={newProdStyles.selectBoxText}>{batteryHealth}</Text>
                    <Ionicons name="chevron-down" size={16} color="#64748B" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Row 3: Box & Accessories + IMEI */}
              <View style={newProdStyles.gridRow}>
                <View style={newProdStyles.gridItem}>
                  <Text style={newProdStyles.inputLabel}>Box & Accessories</Text>
                  <TouchableOpacity
                    style={newProdStyles.selectBox}
                    onPress={() =>
                      openPicker(
                        'Box & Accessories',
                        [
                          { label: 'With charger & cable', value: 'With charger & cable' },
                          { label: 'With original box & accessories', value: 'With original box & accessories' },
                          { label: 'Device only', value: 'Device only' },
                        ],
                        setBoxAccessories
                      )
                    }
                    activeOpacity={0.8}
                  >
                    <Text style={newProdStyles.selectBoxText} numberOfLines={1}>
                      {boxAccessories}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color="#64748B" />
                  </TouchableOpacity>
                </View>

                <View style={newProdStyles.gridItem}>
                  <Text style={newProdStyles.inputLabel}>IMEI (Optional)</Text>
                  <TextInput
                    style={newProdStyles.textInputBox}
                    value={imei}
                    onChangeText={setImei}
                    placeholder="Enter IMEI number"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              {/* Additional Details: Description with character count */}
              <View style={{ marginTop: 14 }}>
                <Text style={newProdStyles.inputLabel}>
                  Description <Text style={newProdStyles.asterisk}>*</Text>
                </Text>
                <TextInput
                  style={newProdStyles.textAreaBox}
                  value={description}
                  onChangeText={(t) => setDescription(t.slice(0, 500))}
                  placeholder="Enter detailed description of device..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={4}
                />
                <Text style={newProdStyles.charCountText}>
                  {description.length}/500
                </Text>
              </View>
            </View>

            {/* 4. Pricing & Stock */}
            <View style={newProdStyles.sectionBox}>
              <Text style={newProdStyles.sectionHeaderTitle}>4. Pricing & Stock</Text>

              <View style={newProdStyles.gridRow}>
                {/* Selling Price */}
                <View style={newProdStyles.gridItem}>
                  <Text style={newProdStyles.inputLabel}>
                    Selling Price <Text style={newProdStyles.asterisk}>*</Text>
                  </Text>
                  <TextInput
                    style={newProdStyles.textInputBox}
                    value={sellingPrice}
                    onChangeText={setSellingPrice}
                    keyboardType="numeric"
                    placeholder="53999"
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                {/* MRP */}
                <View style={newProdStyles.gridItem}>
                  <Text style={newProdStyles.inputLabel}>MRP</Text>
                  <TextInput
                    style={newProdStyles.textInputBox}
                    value={mrp}
                    onChangeText={setMrp}
                    keyboardType="numeric"
                    placeholder="74900"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              <View style={newProdStyles.gridRow}>
                {/* Discount (%) */}
                <View style={newProdStyles.gridItem}>
                  <Text style={newProdStyles.inputLabel}>Discount (%)</Text>
                  <View style={newProdStyles.discountDisplayBox}>
                    <Text style={newProdStyles.discountNumberText}>{discountPercent}</Text>
                    <Text style={newProdStyles.discountPercentSymbol}>%</Text>
                  </View>
                </View>

                {/* Stock Quantity */}
                <View style={newProdStyles.gridItem}>
                  <Text style={newProdStyles.inputLabel}>
                    Stock Quantity <Text style={newProdStyles.asterisk}>*</Text>
                  </Text>
                  <View style={newProdStyles.stockStepperBox}>
                    <TextInput
                      style={newProdStyles.stockInputText}
                      value={String(stock)}
                      onChangeText={(t) => setStock(Math.max(0, parseInt(t, 10) || 0))}
                      keyboardType="numeric"
                    />
                    <View style={newProdStyles.stepperArrowsCol}>
                      <TouchableOpacity
                        onPress={() => setStock((s) => s + 1)}
                        style={newProdStyles.stepperArrowBtn}
                      >
                        <Ionicons name="chevron-up" size={14} color="#0F172A" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setStock((s) => Math.max(0, s - 1))}
                        style={newProdStyles.stepperArrowBtn}
                      >
                        <Ionicons name="chevron-down" size={14} color="#0F172A" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            </View>



            {/* Bottom Actions Bar (Matching Mockup: Save as Draft & Publish Product) */}
            <View style={newProdStyles.bottomActionsRow}>
              {product && (
                <TouchableOpacity
                  style={[newProdStyles.bottomDeleteBtn, deleting && { opacity: 0.6 }]}
                  onPress={handleDeleteProduct}
                  disabled={deleting || saving}
                  activeOpacity={0.8}
                >
                  {deleting ? (
                    <ActivityIndicator size="small" color="#DC2626" />
                  ) : (
                    <>
                      <Ionicons name="trash-outline" size={16} color="#DC2626" style={{ marginRight: 6 }} />
                      <Text style={newProdStyles.bottomDeleteText}>Delete Product</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={newProdStyles.saveDraftBtn}
                onPress={() => handleSaveProduct(true)}
                disabled={saving || deleting}
                activeOpacity={0.8}
              >
                <Ionicons name="document-text-outline" size={17} color="#0F172A" style={{ marginRight: 6 }} />
                <Text style={newProdStyles.saveDraftText}>Save as Draft</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={newProdStyles.publishProductBtn}
                onPress={() => handleSaveProduct(false)}
                disabled={saving || deleting}
                activeOpacity={0.88}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#000000" />
                ) : (
                  <>
                    <Text style={newProdStyles.publishProductText}>{product ? 'Update Product' : 'Publish Product'}</Text>
                    <Ionicons name="arrow-forward" size={16} color="#000000" style={{ marginLeft: 6 }} />
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>

          {/* RIGHT COLUMN: Live Product Preview (Matching Mockup Preview on large screens) */}
          {isSplitView && (
            <ScrollView
              style={newProdStyles.previewColumn}
              contentContainerStyle={newProdStyles.previewContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={newProdStyles.previewHeading}>Live Product Preview</Text>
              <Text style={newProdStyles.previewSubtitle}>
                This is how the product will appear to customers.
              </Text>

              {/* Render accurate phone container mockup */}
              <View style={newProdStyles.phoneFrame}>
                {/* Image showcase */}
                <View style={newProdStyles.previewImageContainer}>
                  <Image
                    source={
                      images[0] && typeof images[0] === 'string'
                        ? { uri: images[0] }
                        : getCategoryDeviceImage(category, productName)
                    }
                    style={newProdStyles.previewMainImg}
                    resizeMode="contain"
                  />
                  <View style={newProdStyles.previewCounterPill}>
                    <Text style={newProdStyles.previewCounterText}>1 / {images.length || 1}</Text>
                  </View>
                </View>

                {/* Details */}
                <Text style={newProdStyles.previewTitleText}>{productName || 'Apple iPhone 14 Pro'}</Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 6 }}>
                  <View style={newProdStyles.previewConditionPill}>
                    <Text style={newProdStyles.previewConditionText}>Pre-Owned • {condition}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="star" size={12} color="#F59E0B" />
                    <Text style={newProdStyles.previewRatingText}> 4.6 (1.2K reviews)</Text>
                  </View>
                </View>

                {/* Price */}
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
                  <Text style={newProdStyles.previewPriceText}>
                    ₹{Number(sellingPrice || 53999).toLocaleString('en-IN')}
                  </Text>
                  {mrp ? (
                    <Text style={newProdStyles.previewMrpText}>
                      ₹{Number(mrp).toLocaleString('en-IN')}
                    </Text>
                  ) : null}
                  <View style={newProdStyles.previewDiscountPill}>
                    <Text style={newProdStyles.previewDiscountText}>{discountPercent}% OFF</Text>
                  </View>
                </View>
                <Text style={newProdStyles.previewTaxesSub}>Inclusive of all taxes</Text>

                {/* Storage pill preview */}
                <Text style={newProdStyles.previewSectionLabel}>Storage</Text>
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
                  {['128 GB', '256 GB', '512 GB'].map((sz) => (
                    <View
                      key={sz}
                      style={[
                        newProdStyles.previewStoragePill,
                        storage === sz && newProdStyles.previewStoragePillActive,
                      ]}
                    >
                      <Text style={[newProdStyles.previewStorageText, storage === sz && { fontWeight: '800' }]}>
                        {sz}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Color swatches preview */}
                <Text style={newProdStyles.previewSectionLabel}>Color</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                  {[
                    { name: 'Deep Purple', hex: '#4E3C56' },
                    { name: 'Gold', hex: '#F5E7D3' },
                    { name: 'Silver', hex: '#E2E4E7' },
                    { name: 'Space Black', hex: '#2B2B2D' },
                  ].map((c) => (
                    <View key={c.name} style={{ alignItems: 'center' }}>
                      <View
                        style={[
                          newProdStyles.previewSwatchCircle,
                          { backgroundColor: c.hex },
                          color === c.name && { borderColor: '#FACC15', borderWidth: 2 },
                        ]}
                      />
                      <Text style={newProdStyles.previewSwatchLabel}>{c.name}</Text>
                    </View>
                  ))}
                </View>

                {/* Buttons */}
                <TouchableOpacity style={newProdStyles.previewCartBtn}>
                  <Ionicons name="cart" size={16} color="#000000" style={{ marginRight: 6 }} />
                  <Text style={newProdStyles.previewCartBtnText}>Add to Cart</Text>
                </TouchableOpacity>

                <TouchableOpacity style={newProdStyles.previewWishlistBtn}>
                  <Ionicons name="heart-outline" size={16} color="#0F172A" style={{ marginRight: 6 }} />
                  <Text style={newProdStyles.previewWishlistBtnText}>Add to Wishlist</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>

        {/* Dropdown Options Modal */}
        <Modal
          visible={pickerModal.visible}
          transparent
          animationType="fade"
          onRequestClose={() => setPickerModal((p) => ({ ...p, visible: false }))}
        >
          <View style={newProdStyles.pickerOverlay}>
            <View style={newProdStyles.pickerCard}>
              <View style={newProdStyles.pickerHeader}>
                <Text style={newProdStyles.pickerTitle}>{pickerModal.title}</Text>
                <TouchableOpacity
                  onPress={() => setPickerModal((p) => ({ ...p, visible: false }))}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={20} color="#0F172A" />
                </TouchableOpacity>
              </View>

              {pickerModal.options.length > 5 && (
                <View style={newProdStyles.pickerSearchBox}>
                  <Ionicons name="search-outline" size={16} color="#64748B" style={{ marginRight: 6 }} />
                  <TextInput
                    style={newProdStyles.pickerSearchInput}
                    placeholder="Search brand or option..."
                    placeholderTextColor="#94A3B8"
                    value={pickerSearch}
                    onChangeText={setPickerSearch}
                    autoCapitalize="none"
                  />
                  {pickerSearch ? (
                    <TouchableOpacity onPress={() => setPickerSearch('')}>
                      <Ionicons name="close-circle" size={16} color="#94A3B8" />
                    </TouchableOpacity>
                  ) : null}
                </View>
              )}

              <ScrollView style={{ maxHeight: 340 }} keyboardShouldPersistTaps="handled">
                {filteredPickerOptions.length === 0 ? (
                  <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, color: '#64748B' }}>No matching options</Text>
                  </View>
                ) : (
                  filteredPickerOptions.map((opt) => {
                    const isSelected =
                      (pickerModal.title.includes('Brand') && brand === opt.value) ||
                      (pickerModal.title.includes('Category') && category === opt.value) ||
                      (pickerModal.title.includes('Storage') && storage === opt.value) ||
                      (pickerModal.title.includes('Condition') && condition === opt.value);
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        style={[newProdStyles.pickerOptionRow, isSelected && newProdStyles.pickerOptionRowSelected]}
                        onPress={() => {
                          pickerModal.onSelect(opt.value);
                          setPickerModal((p) => ({ ...p, visible: false }));
                        }}
                        activeOpacity={0.7}
                      >
                        {opt.logo ? (
                          <View style={newProdStyles.pickerBrandLogoBox}>
                            <Image
                              source={{ uri: opt.logo }}
                              style={newProdStyles.pickerBrandLogoImg}
                              resizeMode="contain"
                            />
                          </View>
                        ) : opt.icon ? (
                          <Ionicons name={opt.icon as any} size={20} color="#0F172A" style={{ marginRight: 10 }} />
                        ) : opt.color ? (
                          <View style={[newProdStyles.colorDotSmall, { backgroundColor: opt.color }]} />
                        ) : (
                          <Ionicons name="pricetag-outline" size={18} color="#94A3B8" style={{ marginRight: 10 }} />
                        )}
                        <Text
                          style={[
                            newProdStyles.pickerOptionLabel,
                            isSelected && newProdStyles.pickerOptionLabelSelected,
                          ]}
                        >
                          {opt.label}
                        </Text>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={18} color="#16A34A" style={{ marginLeft: 'auto' }} />
                        )}
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Add Image Link / Source Modal */}
        <Modal
          visible={addImageModal}
          transparent
          animationType="fade"
          onRequestClose={() => setAddImageModal(false)}
        >
          <View style={newProdStyles.pickerOverlay}>
            <View style={newProdStyles.pickerCard}>
              <View style={newProdStyles.pickerHeader}>
                <Text style={newProdStyles.pickerTitle}>Add Product Image</Text>
                <TouchableOpacity onPress={() => setAddImageModal(false)}>
                  <Ionicons name="close" size={20} color="#0F172A" />
                </TouchableOpacity>
              </View>

              <Text style={newProdStyles.inputLabel}>Image Direct URL</Text>
              <TextInput
                style={newProdStyles.textInputBox}
                value={customImageUrl}
                onChangeText={setCustomImageUrl}
                placeholder="https://images.unsplash.com/... or CDN link"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
              />

              {/* Live Preview Box if URL entered */}
              {customImageUrl.trim().length > 10 && (
                <View style={newProdStyles.modalLivePreviewBox}>
                  <Text style={newProdStyles.modalLivePreviewLabel}>Live Preview:</Text>
                  <View style={newProdStyles.modalLivePreviewImgWrap}>
                    <Image
                      source={{ uri: customImageUrl.trim() }}
                      style={newProdStyles.modalLivePreviewImg}
                      resizeMode="contain"
                    />
                  </View>
                </View>
              )}

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                <TouchableOpacity
                  style={[newProdStyles.saveDraftBtn, { flex: 1 }]}
                  onPress={() => {
                    setCustomImageUrl('');
                    setAddImageModal(false);
                  }}
                >
                  <Text style={newProdStyles.saveDraftText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    newProdStyles.publishProductBtn,
                    { flex: 1 },
                    !customImageUrl.trim() && { opacity: 0.5 },
                  ]}
                  onPress={handleAddImage}
                  disabled={!customImageUrl.trim()}
                >
                  <Text style={newProdStyles.publishProductText}>Add to Product</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Fullscreen Image Preview Lightbox */}
        <Modal
          visible={!!previewModalUrl}
          transparent
          animationType="fade"
          onRequestClose={() => setPreviewModalUrl(null)}
        >
          <View style={newProdStyles.lightboxOverlay}>
            <View style={newProdStyles.lightboxHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="image-outline" size={18} color="#FFFFFF" />
                <Text style={newProdStyles.lightboxTitle}>Product Image Preview</Text>
              </View>
              <TouchableOpacity
                onPress={() => setPreviewModalUrl(null)}
                style={newProdStyles.lightboxCloseBtn}
              >
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={newProdStyles.lightboxImgWrap}>
              {previewModalUrl && (
                <Image
                  source={{ uri: previewModalUrl }}
                  style={newProdStyles.lightboxImg}
                  resizeMode="contain"
                />
              )}
            </View>

            <View style={newProdStyles.lightboxFooter}>
              {previewModalUrl && images[0] !== previewModalUrl && (
                <TouchableOpacity
                  style={newProdStyles.lightboxMakeCoverBtn}
                  onPress={() => {
                    const idx = images.indexOf(previewModalUrl);
                    if (idx > 0) handleSetCover(idx);
                    setPreviewModalUrl(null);
                  }}
                >
                  <Ionicons name="star" size={15} color="#0F172A" />
                  <Text style={newProdStyles.lightboxMakeCoverText}>Set as Primary Cover</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={newProdStyles.lightboxDoneBtn}
                onPress={() => setPreviewModalUrl(null)}
              >
                <Text style={newProdStyles.lightboxDoneText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

const newProdStyles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    zIndex: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  topBarBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  adminDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  topBarSubtitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topBarDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 16,
  },
  topBarDeleteText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  topBarSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FACC15',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
  },
  topBarSaveBtnDisabled: {
    backgroundColor: '#E2E8F0',
  },
  topBarSaveText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  topBarCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Split Area
  mainSplitArea: {
    flex: 1,
    flexDirection: 'row',
  },
  formColumn: {
    flex: 1,
  },
  formContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    marginBottom: 16,
  },

  // Stepper
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  stepNode: {
    alignItems: 'center',
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepCircleActive: {
    backgroundColor: '#FACC15',
  },
  stepCirclePassed: {
    backgroundColor: '#16A34A',
  },
  stepNumber: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  stepNumberActive: {
    color: '#000000',
  },
  stepNumberPassed: {
    color: '#FFFFFF',
  },
  stepLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },
  stepLabelActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  stepConnectingLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginTop: -16,
    marginHorizontal: 4,
  },
  stepConnectingLineActive: {
    backgroundColor: '#16A34A',
  },

  // Section Box
  sectionBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 16,
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 12,
  },

  // Section Header & Counter Badge
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  photoCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  photoCountBadgeActive: {
    backgroundColor: '#FEF9C3',
    borderColor: '#FDE047',
  },
  photoCountDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#94A3B8',
    marginRight: 6,
  },
  photoCountDotActive: {
    backgroundColor: '#CA8A04',
  },
  photoCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },

  // Uploading banner
  uploadingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF9C3',
    borderWidth: 1,
    borderColor: '#FDE047',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 12,
    gap: 8,
  },
  uploadingBarText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#854D0E',
  },

  // PRODUCT IMAGES SCROLL CONTENT
  productCardsScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingRight: 10,
    gap: 12,
  },

  // EXACT USER-REQUESTED DASHED UPLOAD CARD
  userRefUploadCard: {
    width: 126,
    height: 148,
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  userRefYellowCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FEF08A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#CA8A04',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  userRefCardTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  userRefCardSub: {
    fontSize: 10.5,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },

  // UPLOADED PRODUCT PHOTO CARD
  productPhotoCard: {
    width: 126,
    height: 148,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    position: 'relative',
  },
  productPhotoImgWrap: {
    width: '100%',
    height: 114,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    padding: 6,
  },
  productPhotoImg: {
    width: '100%',
    height: '100%',
  },
  cardCoverBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF08A',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
    gap: 3,
    borderWidth: 1,
    borderColor: '#FDE047',
  },
  cardCoverBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.2,
  },
  cardIndexBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cardIndexBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cardDeleteBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBottomActions: {
    height: 34,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cardMakeCoverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
  },
  cardMakeCoverText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardReplaceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
  },
  cardReplaceText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },

  // BOTTOM ROW TOOLBAR & GUIDANCE
  imageSectionBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  imageSectionPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickSourcePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 5,
  },
  quickSourcePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  imageSectionHint: {
    fontSize: 10.5,
    color: '#94A3B8',
  },

  // LIVE PREVIEW IN URL MODAL
  modalLivePreviewBox: {
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  modalLivePreviewLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
  modalLivePreviewImgWrap: {
    width: 140,
    height: 120,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 6,
  },
  modalLivePreviewImg: {
    width: '100%',
    height: '100%',
  },

  // LIGHTBOX VIEWER MODAL
  lightboxOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    justifyContent: 'space-between',
    padding: 20,
  },
  lightboxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 36 : 10,
  },
  lightboxTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  lightboxCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxImgWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  lightboxImg: {
    width: '100%',
    height: '100%',
    maxWidth: 600,
    maxHeight: 500,
  },
  lightboxFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
  },
  lightboxMakeCoverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FACC15',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  lightboxMakeCoverText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  lightboxDoneBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  lightboxDoneText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Form Grids
  gridRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  gridItem: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 5,
  },
  asterisk: {
    color: '#EF4444',
  },
  textInputBox: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  selectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: '#FFFFFF',
  },
  selectBoxText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  colorDotSmall: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 6,
  },
  textAreaBox: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 10,
    fontSize: 12.5,
    color: '#0F172A',
    minHeight: 70,
    textAlignVertical: 'top',
  },
  charCountText: {
    alignSelf: 'flex-end',
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 4,
  },

  // Discount & Stock
  discountDisplayBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: '#F8FAFC',
  },
  discountNumberText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  discountPercentSymbol: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  stockStepperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 2,
    backgroundColor: '#FFFFFF',
  },
  stockInputText: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
    paddingVertical: 6,
  },
  stepperArrowsCol: {
    alignItems: 'center',
  },
  stepperArrowBtn: {
    padding: 2,
  },
  returnEligibleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#FFFFFF',
  },
  returnSubtext: {
    fontSize: 10.5,
    color: '#64748B',
  },

  // Bottom Actions
  bottomActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  bottomDeleteBtn: {
    flex: 1,
    minWidth: 140,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FECACA',
    borderRadius: 12,
    paddingVertical: 12,
    backgroundColor: '#FEF2F2',
  },
  bottomDeleteText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  saveDraftBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  saveDraftText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  publishProductBtn: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FACC15',
    borderRadius: 12,
    paddingVertical: 12,
  },
  publishProductText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000000',
  },

  // RIGHT PREVIEW COLUMN
  previewColumn: {
    width: 380,
    borderLeftWidth: 1,
    borderLeftColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  previewContent: {
    padding: 18,
  },
  previewHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  previewSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    marginBottom: 14,
  },
  phoneFrame: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    padding: 14,
    backgroundColor: '#FFFFFF',
  },
  previewImageContainer: {
    height: 180,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 10,
  },
  previewMainImg: {
    width: '80%',
    height: '80%',
  },
  previewCounterPill: {
    position: 'absolute',
    bottom: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  previewCounterText: {
    fontSize: 9.5,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  previewTitleText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  previewConditionPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  previewConditionText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
  },
  previewRatingText: {
    fontSize: 10.5,
    color: '#64748B',
  },
  previewPriceText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  previewMrpText: {
    fontSize: 12,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  previewDiscountPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  previewDiscountText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  previewTaxesSub: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 10,
  },
  previewSectionLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  previewStoragePill: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  previewStoragePillActive: {
    borderColor: '#FACC15',
    backgroundColor: '#FEFCE8',
  },
  previewStorageText: {
    fontSize: 10,
    color: '#0F172A',
  },
  previewSwatchCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    marginBottom: 2,
  },
  previewSwatchLabel: {
    fontSize: 8.5,
    color: '#64748B',
  },
  previewCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FACC15',
    borderRadius: 20,
    paddingVertical: 9,
    marginTop: 8,
  },
  previewCartBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000000',
  },
  previewWishlistBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingVertical: 8,
    marginTop: 6,
  },
  previewWishlistBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0F172A',
  },

  // Picker Modal
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pickerCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  pickerSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 10,
  },
  pickerSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    padding: 0,
  },
  pickerOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  pickerOptionRowSelected: {
    backgroundColor: '#F0FDF4',
  },
  pickerOptionLabel: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#0F172A',
  },
  pickerOptionLabelSelected: {
    fontWeight: '800',
    color: '#15803D',
  },
  pickerBrandLogoBox: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    padding: 2,
  },
  pickerBrandLogoImg: {
    width: '100%',
    height: '100%',
  },
  selectedBrandLogoBox: {
    width: 24,
    height: 24,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    padding: 2,
  },
  selectedBrandLogoImg: {
    width: '100%',
    height: '100%',
  },
});
