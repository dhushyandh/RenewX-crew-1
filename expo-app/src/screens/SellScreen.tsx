import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { api } from '@/services/api';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';

interface CategoryItem {
  id: string;
  name: string;
  maxPrice: string;
  ceilingNum: number;
  icon: keyof typeof Ionicons.glyphMap;
  subtitle: string;
}

const CATEGORIES: CategoryItem[] = [
  {
    id: 'phones',
    name: 'Smartphones',
    maxPrice: '₹85,000',
    ceilingNum: 85000,
    icon: 'phone-portrait-outline',
    subtitle: 'iPhones, Galaxy S-series, Pixels & more',
  },
  {
    id: 'macbooks',
    name: 'MacBooks',
    maxPrice: '₹1,65,000',
    ceilingNum: 165000,
    icon: 'laptop-outline',
    subtitle: 'M1, M2, M3 Pro & Intel Silicon',
  },
  {
    id: 'laptops',
    name: 'Windows Laptops',
    maxPrice: '₹75,000',
    ceilingNum: 75000,
    icon: 'desktop-outline',
    subtitle: 'Dell, Lenovo, HP, ASUS & Gaming',
  },
  {
    id: 'tablets',
    name: 'Tablets & iPads',
    maxPrice: '₹60,000',
    ceilingNum: 60000,
    icon: 'tablet-portrait-outline',
    subtitle: 'iPad Pro, Air, Mini & Galaxy Tabs',
  },
  {
    id: 'wearables',
    name: 'Wearables & Audio',
    maxPrice: '₹35,000',
    ceilingNum: 35000,
    icon: 'watch-outline',
    subtitle: 'Apple Watch, Galaxy Watch & AirPods',
  },
  {
    id: 'cameras',
    name: 'Cameras',
    maxPrice: '₹95,000',
    ceilingNum: 95000,
    icon: 'camera-outline',
    subtitle: 'Sony Alpha, Canon EOS & DSLRs',
  },
];

const STANDARD_STORAGES = ['64 GB', '128 GB', '256 GB', '512 GB', '1 TB'];

const DEFAULT_BRANDS: Record<string, string[]> = {
  Smartphones: ['Apple', 'Samsung', 'OnePlus', 'Google', 'Xiaomi', 'Realme', 'Vivo', 'Motorola'],
  MacBooks: ['Apple'],
  'Windows Laptops': ['Dell', 'HP', 'Lenovo', 'ASUS', 'Acer', 'MSI'],
  'Tablets & iPads': ['Apple', 'Samsung', 'Lenovo', 'OnePlus'],
  'Wearables & Audio': ['Apple', 'Samsung', 'Sony', 'Bose', 'Noise', 'Boat'],
  Cameras: ['Sony', 'Canon', 'Nikon', 'Fujifilm', 'GoPro'],
};

const DEFAULT_MODELS: Record<string, string[]> = {
  Apple: [
    'iPhone 15 Pro Max',
    'iPhone 15 Pro',
    'iPhone 15',
    'iPhone 14 Pro Max',
    'iPhone 14 Pro',
    'iPhone 13',
    'iPhone 12',
    'MacBook Pro 16" (M3 Max)',
    'MacBook Pro 14" (M2 Pro)',
    'MacBook Air 15" (M2)',
    'iPad Pro 12.9" (M2)',
    'iPad Air 5th Gen',
  ],
  Samsung: [
    'Galaxy S24 Ultra',
    'Galaxy S24+',
    'Galaxy S24',
    'Galaxy S23 Ultra',
    'Galaxy Z Fold 5',
    'Galaxy Z Flip 5',
    'Galaxy Tab S9 Ultra',
  ],
  OnePlus: ['OnePlus 12', 'OnePlus 12R', 'OnePlus Open', 'OnePlus 11 5G', 'OnePlus 10 Pro'],
  Google: ['Pixel 8 Pro', 'Pixel 8', 'Pixel 7 Pro', 'Pixel 7a', 'Pixel Fold'],
  Dell: ['XPS 15 (9530)', 'XPS 13 Plus', 'Alienware m16', 'Inspiron 16'],
  Sony: ['Sony Alpha A7 IV', 'Sony Alpha A7 III', 'WH-1000XM5', 'WF-1000XM5'],
};

const STEPS = [
  { num: 1, label: 'Category', short: 'Category' },
  { num: 2, label: 'Brand', short: 'Brand' },
  { num: 3, label: 'Model', short: 'Model' },
  { num: 4, label: 'Specs & Condition', short: 'Specs' },
  { num: 5, label: 'Upload Photos', short: 'Photos' },
  { num: 6, label: 'Expected Price', short: 'Price' },
  { num: 7, label: 'Pickup Details', short: 'Pickup' },
  { num: 8, label: 'Review', short: 'Review' },
];


type ApiRecord = Record<string, any>;

const unwrapRows = (response: any): ApiRecord[] => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.results)) return response.results;
  if (Array.isArray(response?.items)) return response.items;
  return [];
};

const recordId = (item: ApiRecord) =>
  String(item?.id ?? item?._id ?? item?.brand_id ?? item?.brandId ?? item?.model_id ?? item?.modelId ?? item?.name ?? '');

const recordName = (item: ApiRecord) =>
  String(item?.name ?? item?.brand_name ?? item?.brandName ?? item?.model_name ?? item?.modelName ?? '').trim();

const normalizeName = (value: any) =>
  String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

const getBrandId = (brand: ApiRecord | undefined) =>
  brand ? String(brand?.id ?? brand?._id ?? brand?.brand_id ?? brand?.brandId ?? '') : '';

const getModelBrandId = (model: ApiRecord) =>
  String(model?.brand_id ?? model?.brandId ?? model?.brand?.id ?? model?.brand?._id ?? '');

const getModelCategory = (model: ApiRecord) =>
  String(model?.category ?? model?.category_name ?? model?.categoryName ?? model?.category?.name ?? '').trim();

const getStorageOptions = (model: ApiRecord): string[] => {
  const raw =
    model?.storage_options ??
    model?.storageOptions ??
    model?.storages ??
    model?.storage ??
    [];

  if (Array.isArray(raw)) {
    return raw
      .map((value) => String(value).trim())
      .filter(Boolean);
  }

  if (typeof raw === 'string' && raw.trim()) {
    return raw.split(',').map((value) => value.trim()).filter(Boolean);
  }

  return [];
};

export default function SellScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { user } = useAuth();

  // Wizard state: 1 to 8
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8>(1);

  // STEP 1: Category
  const [selectedCat, setSelectedCat] = useState<CategoryItem>(CATEGORIES[0]);

  // STEP 2: Brand
  const [brandSearch, setBrandSearch] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('Apple');
  const [brandsList, setBrandsList] = useState<any[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(false);

  // STEP 3: Model
  const [modelSearch, setModelSearch] = useState('');
  const [selectedModel, setSelectedModel] = useState('iPhone 15 Pro');
  const [customModelMode, setCustomModelMode] = useState(false);
  const [customModelName, setCustomModelName] = useState('');
  const [modelsList, setModelsList] = useState<any[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);

  // STEP 4: Specs & Condition
  const [storageOptions, setStorageOptions] = useState<string[]>(STANDARD_STORAGES);
  const [selectedStorage, setSelectedStorage] = useState('256 GB');
  const [screenCond, setScreenCond] = useState<'flawless' | 'good' | 'cracked'>('flawless');
  const [bodyCond, setBodyCond] = useState<'likenew' | 'fair' | 'dented'>('likenew');
  const [switchesOn, setSwitchesOn] = useState(true);
  const [touchWorking, setTouchWorking] = useState(true);
  const [cameraClear, setCameraClear] = useState(true);
  const [batteryHealthy, setBatteryHealthy] = useState(true);
  const [hasBox, setHasBox] = useState(true);
  const [hasCharger, setHasCharger] = useState(true);
  const [hasBill, setHasBill] = useState(true);

  // STEP 5: Upload Photos
  const [photos, setPhotos] = useState<{
    front: string;
    back: string;
    edges: string;
    billBox: string;
  }>({
    front: '',
    back: '',
    edges: '',
    billBox: '',
  });
  const [photoSkipped, setPhotoSkipped] = useState(false);
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);

  // STEP 6: Expected Price & Valuation
  const [quoteAmount, setQuoteAmount] = useState(48500);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [expectedPrice, setExpectedPrice] = useState('48500');

  // STEP 7: Pickup Details
  const [userName, setUserName] = useState(user?.full_name || '');
  const [userPhone, setUserPhone] = useState('');
  const [userAddress, setUserAddress] = useState('');
  const [userPincode, setUserPincode] = useState('');
  const [pickupDate, setPickupDate] = useState<'Today' | 'Tomorrow' | 'Day After'>('Today');
  const [timeSlot, setTimeSlot] = useState<'Morning' | 'Afternoon' | 'Evening'>('Morning');
  const [payoutMethod, setPayoutMethod] = useState<'upi' | 'bank' | 'cash'>('upi');
  const [upiId, setUpiId] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');

  // STEP 8: Review & Booking
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [bookingRefId, setBookingRefId] = useState('');

  // 1. Fetch brands from the real catalog database.
  // IMPORTANT: an empty DB response stays empty; no demo brands are injected.
  useEffect(() => {
    let active = true;
    setBrandsLoading(true);
    setBrandsList([]);
    setSelectedBrand('');
    setBrandSearch('');

    api.brands
      .getAll({ category: selectedCat.name })
      .then((response: any) => {
        if (!active) return;

        const rows = unwrapRows(response)
          .filter((row) => recordName(row))
          .map((row) => ({
            ...row,
            id: recordId(row),
            name: recordName(row),
          }));

        // Some APIs return the whole catalog even when a category filter is supplied.
        // If category information exists on a row, keep only matching rows.
        const categoryRows = rows.filter((row) => {
          const rowCategory = String(
            (row as any)?.category ??
            (row as any)?.category_name ??
            (row as any)?.categoryName ??
            (row as any)?.category?.name ??
            ''
          ).trim();

          return !rowCategory || normalizeName(rowCategory) === normalizeName(selectedCat.name);
        });

        const unique = Array.from(
          new Map(categoryRows.map((row) => [normalizeName(row.name), row])).values()
        );

        setBrandsList(unique);

        if (selectedBrand && unique.some((brand) => normalizeName(brand.name) === normalizeName(selectedBrand))) {
          return;
        }

        setSelectedBrand(unique[0]?.name ?? '');
      })
      .catch((error) => {
        if (!active) return;
        console.warn('[SellScreen] Failed to load brands:', error);
        setBrandsList([]);
        setSelectedBrand('');
        toast.error('Could not load brands from the catalog. Please try again.');
      })
      .finally(() => {
        if (active) setBrandsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedCat.name]);

  // 2. Fetch models from the real catalog database.
  // The selected brand ID is preferred; client-side matching protects us when
  // the backend returns a broader catalog or uses _id/brandId instead of id.
  useEffect(() => {
    if (!selectedBrand) {
      setModelsList([]);
      setSelectedModel('');
      return;
    }

    let active = true;
    setModelsLoading(true);
    setModelsList([]);
    setSelectedModel('');
    setModelSearch('');
    setCustomModelMode(false);
    setCustomModelName('');
    setStorageOptions(STANDARD_STORAGES);
    setSelectedStorage('256 GB');

    const brandObj = brandsList.find(
      (brand) => normalizeName(brand.name) === normalizeName(selectedBrand)
    );
    const brandId = getBrandId(brandObj);

    api.models
      .getAll({
        category: selectedCat.name,
        brand_id: brandId || 'all',
      })
      .then((response: any) => {
        if (!active) return;

        const rows = unwrapRows(response)
          .filter((row) => recordName(row))
          .map((row) => ({
            ...row,
            id: recordId(row),
            name: recordName(row),
          }));

        const filtered = rows.filter((model) => {
          const modelBrandId = getModelBrandId(model);
          const modelBrandName = String(
            (model as any)?.brand_name ??
            (model as any)?.brandName ??
            (model as any)?.brand?.name ??
            ''
          ).trim();

          const modelCategory = getModelCategory(model);

          const brandMatches =
            !modelBrandId ||
            !brandId ||
            modelBrandId === brandId ||
            normalizeName(modelBrandName) === normalizeName(selectedBrand);

          const categoryMatches =
            !modelCategory ||
            normalizeName(modelCategory) === normalizeName(selectedCat.name);

          return brandMatches && categoryMatches;
        });

        const unique = Array.from(
          new Map(filtered.map((model) => [normalizeName(model.name), model])).values()
        );

        setModelsList(unique);

        const first = unique[0];
        if (first) {
          setSelectedModel(first.name);

          const storages = getStorageOptions(first);
          if (storages.length) {
            setStorageOptions(storages);
            setSelectedStorage(storages[0]);
          }
        }
      })
      .catch((error) => {
        if (!active) return;
        console.warn('[SellScreen] Failed to load models:', error);
        setModelsList([]);
        setSelectedModel('');
        toast.error('Could not load models from the catalog. Please try again.');
      })
      .finally(() => {
        if (active) setModelsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedBrand, selectedCat.name, brandsList]);

  // 3. Algorithmic Quote Calculation
  useEffect(() => {
    let active = true;
    setQuoteLoading(true);

    const activeModel = customModelMode && customModelName.trim() ? customModelName.trim() : selectedModel;

    api.tradeIn
      .getQuote({
        category: selectedCat.name,
        brand: selectedBrand,
        model: activeModel,
        storage: selectedStorage,
        screenCondition: screenCond,
        bodyCondition: bodyCond,
        functionalChecks: {
          switchesOn,
          touchWorking,
          cameraClear,
          batteryHealthy,
        },
        accessories: {
          hasBox,
          hasCharger,
          hasBill,
        },
      })
      .then((res: any) => {
        if (!active) return;
        const amt = Number(res?.valuation || res?.data?.valuation || 0);
        const finalAmt = amt > 0 ? amt : calculateLocalValuation();
        setQuoteAmount(finalAmt);
        setExpectedPrice(finalAmt.toString());
      })
      .catch(() => {
        if (!active) return;
        const localAmt = calculateLocalValuation();
        setQuoteAmount(localAmt);
        setExpectedPrice(localAmt.toString());
      })
      .finally(() => {
        if (active) setQuoteLoading(false);
      });

    return () => {
      active = false;
    };
  }, [
    selectedCat,
    selectedBrand,
    selectedModel,
    customModelMode,
    customModelName,
    selectedStorage,
    screenCond,
    bodyCond,
    switchesOn,
    touchWorking,
    cameraClear,
    batteryHealthy,
    hasBox,
    hasCharger,
    hasBill,
  ]);

  const calculateLocalValuation = () => {
    let base = selectedCat.ceilingNum * 0.55;
    const model = (customModelMode ? customModelName : selectedModel).toLowerCase();
    if (model.includes('max') || model.includes('ultra') || model.includes('pro 16')) base += 14000;
    else if (model.includes('pro') || model.includes('plus')) base += 8000;

    if (selectedStorage === '1 TB') base += 9000;
    else if (selectedStorage === '512 GB') base += 5000;
    else if (selectedStorage === '64 GB') base -= 4000;

    if (screenCond === 'good') base -= 4500;
    if (screenCond === 'cracked') base -= 12000;

    if (bodyCond === 'fair') base -= 3000;
    if (bodyCond === 'dented') base -= 6500;

    if (hasBox) base += 800;
    if (hasCharger) base += 1000;
    if (hasBill) base += 500;

    if (!switchesOn) base = Math.round(base * 0.4);
    if (!touchWorking) base -= 4000;
    if (!cameraClear) base -= 2500;
    if (!batteryHealthy) base -= 2000;

    return Math.max(Math.round(base), 3500);
  };

  const filteredBrands = useMemo(() => {
    if (!brandSearch.trim()) return brandsList;
    const q = brandSearch.toLowerCase();
    return brandsList.filter((b) => b.name.toLowerCase().includes(q));
  }, [brandsList, brandSearch]);

  const filteredModels = useMemo(() => {
    if (!modelSearch.trim()) return modelsList;
    const q = modelSearch.toLowerCase();
    return modelsList.filter((m) => m.name.toLowerCase().includes(q));
  }, [modelsList, modelSearch]);

  const handlePhotoUpload = async (slot: 'front' | 'back' | 'edges' | 'billBox') => {
    try {
      setUploadingSlot(slot);
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!res.canceled && res.assets && res.assets[0]) {
        const asset = res.assets[0];
        if (asset.base64) {
          try {
            const uploaded = await api.upload.base64(
              asset.base64,
              `sell-${slot}-${Date.now()}.jpg`,
              asset.mimeType || 'image/jpeg'
            );
            if (uploaded?.url) {
              setPhotos((prev) => ({ ...prev, [slot]: uploaded.url }));
              setPhotoSkipped(false);
              return;
            }
          } catch (e) {
            console.log('Local URI fallback for photo:', e);
          }
        }
        setPhotos((prev) => ({ ...prev, [slot]: asset.uri }));
        setPhotoSkipped(false);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Could not attach image');
    } finally {
      setUploadingSlot(null);
    }
  };

  const removePhoto = (slot: 'front' | 'back' | 'edges' | 'billBox') => {
    setPhotos((prev) => ({ ...prev, [slot]: '' }));
  };

  const handleConfirmPickup = async () => {
    if (!userName.trim() || !userPhone.trim() || !userAddress.trim() || !userPincode.trim()) {
      toast.warning('Please enter your full contact details, pickup address & pincode.', 'Missing Details');
      setStep(7);
      return;
    }

    if (payoutMethod === 'upi' && !upiId.trim()) {
      toast.warning('Please provide your UPI ID for instant payout.', 'UPI ID Required');
      setStep(7);
      return;
    }

    if (payoutMethod === 'bank' && (!bankAccount.trim() || !bankIfsc.trim())) {
      toast.warning('Please enter bank account number and IFSC code.', 'Bank Details Required');
      setStep(7);
      return;
    }

    try {
      setIsSubmitting(true);
      const activeModel = customModelMode && customModelName.trim() ? customModelName.trim() : selectedModel;

      const payload = {
        category: selectedCat.name,
        brand: selectedBrand,
        model: activeModel,
        storage: selectedStorage,
        valuationAmount: quoteAmount,
        expectedSellingPrice: Number(expectedPrice) || quoteAmount,
        customerName: userName.trim(),
        customerPhone: userPhone.trim(),
        pincode: userPincode.trim(),
        address: userAddress.trim(),
        condition: {
          screen: screenCond,
          body: bodyCond,
          switchesOn,
          touchWorking,
          cameraClear,
          batteryHealthy,
          hasBox,
          hasCharger,
          hasBill,
          photos,
          photoSkipped,
          pickupDate,
          timeSlot,
          payoutMethod,
          payoutDetail:
            payoutMethod === 'upi'
              ? upiId.trim()
              : payoutMethod === 'bank'
              ? { account: bankAccount.trim(), ifsc: bankIfsc.trim() }
              : 'Cash',
        },
      };

      const res = await api.tradeIn.createPickup(payload);
      const refId = res?.id || res?.pickupId || `RNX-SELL-${Date.now().toString().slice(-6)}`;
      setBookingRefId(refId);
      setBookingConfirmed(true);
      toast.success(`Doorstep pickup scheduled. Reference: ${refId}`, 'Pickup Confirmed');
    } catch (err: any) {
      console.warn('[SellScreen] Pickup booking failed:', err);
      toast.error(
        err?.message || 'We could not schedule the pickup. Please try again.',
        'Pickup Booking Failed'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetWorkflow = () => {
    setBookingConfirmed(false);
    setBookingRefId('');
    setStep(1);
    setPhotos({ front: '', back: '', edges: '', billBox: '' });
    setPhotoSkipped(false);
    setCustomModelMode(false);
    setCustomModelName('');
  };

  const formattedDates = useMemo(() => {
    const d0 = new Date();
    const d1 = new Date(Date.now() + 86400000);
    const d2 = new Date(Date.now() + 172800000);
    const opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' };
    return {
      Today: `Today (${d0.toLocaleDateString('en-IN', opts)})`,
      Tomorrow: `Tomorrow (${d1.toLocaleDateString('en-IN', opts)})`,
      'Day After': `Day After (${d2.toLocaleDateString('en-IN', opts)})`,
    };
  }, []);

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 14) }]}>
      {/* Top Header - Minimal & Clean */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Sell Device</Text>
          <View style={styles.headerBadge}>
            <View style={styles.greenDot} />
            <Text style={styles.headerBadgeText}>Doorstep Payout</Text>
          </View>
        </View>
        <Text style={styles.headerSubtitle}>
          Get a real catalog-backed quote in a few simple steps
        </Text>
      </View>

      {/* Stepper Wizard Bar - Sleek & Compact */}
      <View style={styles.stepperContainer}>
        <View style={styles.stepperMetaRow}>
          <Text style={styles.stepperStepName}>
            Step {step} of 8: <Text style={styles.stepperCurrentTitle}>{STEPS[step - 1].label}</Text>
          </Text>
          <Text style={styles.stepperPercent}>{Math.round((step / 8) * 100)}%</Text>
        </View>

        {/* Minimal Progress Line */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${(step / 8) * 100}%` }]} />
        </View>

        {/* Horizontal Mini Step Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.stepChipsScroll}
        >
          {STEPS.map((s) => {
            const isActive = step === s.num;
            const isDone = step > s.num;
            return (
              <TouchableOpacity
                key={s.num}
                style={[
                  styles.stepPill,
                  isActive && styles.stepPillActive,
                  isDone && styles.stepPillDone,
                ]}
                onPress={() => {
                  if (s.num <= step) setStep(s.num as any);
                }}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.stepPillDot,
                    isActive && styles.stepPillDotActive,
                    isDone && styles.stepPillDotDone,
                  ]}
                >
                  {isDone ? (
                    <Ionicons name="checkmark" size={9} color="#ffffff" />
                  ) : (
                    <Text
                      style={[
                        styles.stepPillNum,
                        isActive && styles.stepPillNumActive,
                      ]}
                    >
                      {s.num}
                    </Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.stepPillLabel,
                    isActive && styles.stepPillLabelActive,
                    isDone && styles.stepPillLabelDone,
                  ]}
                >
                  {s.short}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Content Area */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 110 }]}
      >
        {/* ==================== STEP 1: CATEGORY ==================== */}
        {step === 1 && (
          <View style={styles.card}>
            {/* Minimalist Ceiling Notice */}
            <View style={styles.ceilingNotice}>
              <View style={styles.ceilingIconBox}>
                <Ionicons name="flash-outline" size={18} color="#0f172a" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ceilingHeading}>Live Trade-In Ceiling</Text>
                <Text style={styles.ceilingValue}>Valuations up to ₹1,65,000</Text>
                <Text style={styles.ceilingDescription}>
                  Instant doorstep diagnostic & same-day digital payout.
                </Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Select Device Category</Text>
            <Text style={styles.sectionSubtitle}>Start with the device type. Brands and models come directly from our catalog.</Text>

            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => {
                const isSel = selectedCat.id === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.categoryCard, isSel && styles.categoryCardActive]}
                    onPress={() => setSelectedCat(cat)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.categoryIconCircle, isSel && styles.categoryIconCircleActive]}>
                      <Ionicons
                        name={cat.icon}
                        size={20}
                        color={isSel ? '#0f172a' : '#64748b'}
                      />
                    </View>
                    <Text style={[styles.categoryTitle, isSel && styles.categoryTitleActive]}>
                      {cat.name}
                    </Text>
                    <Text style={styles.categorySubtitle}>{cat.subtitle}</Text>
                    <View style={styles.categoryCeilingTag}>
                      <Text style={styles.categoryCeilingText}>Up to {cat.maxPrice}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => setStep(2)}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>Continue to Brand</Text>
              <Ionicons name="arrow-forward" size={16} color="#ffffff" />
            </TouchableOpacity>
          </View>
        )}

        {/* ==================== STEP 2: BRAND ==================== */}
        {step === 2 && (
          <View style={styles.card}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>Select Brand</Text>
                <Text style={styles.sectionSubtitle}>
                  Live catalog • {selectedCat.name}
                </Text>
              </View>
              {brandsLoading && <ActivityIndicator size="small" color="#0f172a" />}
            </View>

            {/* Minimal Search Bar */}
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={16} color="#94a3b8" />
              <TextInput
                placeholder={`Search catalog brands`}
                placeholderTextColor="#94a3b8"
                value={brandSearch}
                onChangeText={setBrandSearch}
                style={styles.searchInput}
              />
              {brandSearch.length > 0 && (
                <TouchableOpacity onPress={() => setBrandSearch('')}>
                  <Ionicons name="close-circle" size={16} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>

            {/* Brand Grid */}
            {brandsLoading ? (
              <View style={styles.loadingCatalog}>
                <ActivityIndicator size="small" color="#111827" />
                <Text style={styles.loadingCatalogText}>Loading brands from catalog…</Text>
              </View>
            ) : null}

            <View style={styles.brandsGrid}>
              {filteredBrands.map((b) => {
                const isSel = selectedBrand === b.name;
                const initial = b.name.charAt(0).toUpperCase();
                return (
                  <TouchableOpacity
                    key={b.id || b.name}
                    style={[styles.brandCard, isSel && styles.brandCardActive]}
                    onPress={() => setSelectedBrand(b.name)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.brandAvatar, isSel && styles.brandAvatarActive]}>
                      <Text style={[styles.brandAvatarText, isSel && styles.brandAvatarTextActive]}>
                        {initial}
                      </Text>
                    </View>
                    <Text style={[styles.brandName, isSel && styles.brandNameActive]}>
                      {b.name}
                    </Text>
                    {isSel && (
                      <Ionicons name="checkmark" size={14} color="#0f172a" style={{ marginLeft: 'auto' }} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {filteredBrands.length === 0 && !brandsLoading && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No brand found matching "{brandSearch}"</Text>
                <TouchableOpacity
                  style={styles.emptyActionButton}
                  onPress={() => setBrandSearch('')}
                >
                  <Text style={styles.emptyActionText}>Clear search</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.outlineButton} onPress={() => setStep(1)}>
                <Ionicons name="arrow-back" size={16} color="#475569" />
                <Text style={styles.outlineButtonText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryButton, { flex: 1 }, !selectedBrand && styles.buttonDisabled]}
                onPress={() => setStep(3)}
                disabled={!selectedBrand}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryButtonText}>Continue to Model</Text>
                <Ionicons name="arrow-forward" size={16} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ==================== STEP 3: MODEL ==================== */}
        {step === 3 && (
          <View style={styles.card}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>Select Model</Text>
                <Text style={styles.sectionSubtitle}>
                  Live catalog • {selectedBrand} • {selectedCat.name}
                </Text>
              </View>
              {modelsLoading && <ActivityIndicator size="small" color="#0f172a" />}
            </View>

            {/* Search Bar */}
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={16} color="#94a3b8" />
              <TextInput
                placeholder={`Search catalog models`}
                placeholderTextColor="#94a3b8"
                value={modelSearch}
                onChangeText={setModelSearch}
                style={styles.searchInput}
              />
              {modelSearch.length > 0 && (
                <TouchableOpacity onPress={() => setModelSearch('')}>
                  <Ionicons name="close-circle" size={16} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>

            {/* Model List */}
            {!customModelMode && (
              <View style={styles.modelList}>
                {filteredModels.map((m) => {
                  const isSel = selectedModel === m.name;
                  return (
                    <TouchableOpacity
                      key={m.id || m.name}
                      style={[styles.modelRow, isSel && styles.modelRowActive]}
                      onPress={() => {
                        setSelectedModel(m.name);
                        const storages = getStorageOptions(m);
                        if (storages.length) {
                          setStorageOptions(storages);
                          setSelectedStorage(storages[0]);
                        } else {
                          setStorageOptions(STANDARD_STORAGES);
                          setSelectedStorage('256 GB');
                        }
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.radioCircle, isSel && styles.radioCircleActive]}>
                        {isSel && <View style={styles.radioDot} />}
                      </View>
                      <Text style={[styles.modelTitle, isSel && styles.modelTitleActive]}>
                        {m.name}
                      </Text>
                      {isSel && (
                        <View style={styles.selectedTag}>
                          <Text style={styles.selectedTagText}>Selected</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {filteredModels.length === 0 && !modelsLoading && !customModelMode && (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="cube-outline" size={20} color="#64748b" />
                </View>
                <Text style={styles.emptyTitle}>No catalog model found</Text>
                <Text style={styles.emptyText}>
                  {modelSearch.trim()
                    ? `No model matches “${modelSearch.trim()}”.`
                    : `No ${selectedBrand} models are available for ${selectedCat.name} yet.`}
                </Text>
              </View>
            )}

            {/* Custom Model Card */}
            <TouchableOpacity
              style={[styles.customToggleCard, customModelMode && styles.customToggleCardActive]}
              onPress={() => setCustomModelMode(!customModelMode)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={customModelMode ? 'checkbox-outline' : 'add-circle-outline'}
                size={18}
                color={customModelMode ? '#0f172a' : '#64748b'}
              />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.customToggleTitle}>My model is not listed here</Text>
                <Text style={styles.customToggleSubtitle}>Enter exact model name manually</Text>
              </View>
            </TouchableOpacity>

            {customModelMode && (
              <View style={{ marginBottom: 16 }}>
                <Text style={styles.inputLabel}>Custom Device Model</Text>
                <TextInput
                  placeholder="e.g. Sony WH-1000XM4 or Lenovo ThinkPad X1"
                  placeholderTextColor="#94a3b8"
                  value={customModelName}
                  onChangeText={setCustomModelName}
                  style={styles.minimalTextInput}
                />
              </View>
            )}

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.outlineButton} onPress={() => setStep(2)}>
                <Ionicons name="arrow-back" size={16} color="#475569" />
                <Text style={styles.outlineButtonText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  { flex: 1 },
                  (!selectedModel && (!customModelMode || !customModelName.trim())) && styles.buttonDisabled,
                ]}
                onPress={() => {
                  if (customModelMode && !customModelName.trim()) {
                    toast.warning('Please enter your custom model name.', 'Model Required');
                    return;
                  }
                  setStep(4);
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryButtonText}>Continue to Specs</Text>
                <Ionicons name="arrow-forward" size={16} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ==================== STEP 4: SPECS & CONDITION ==================== */}
        {step === 4 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Specs & Condition</Text>
            <Text style={styles.sectionSubtitle}>
              Honest inputs guarantee a price match during pickup
            </Text>

            {/* 1. Storage Variant */}
            <Text style={styles.inputLabel}>Storage Variant</Text>
            <View style={styles.storagePillsRow}>
              {storageOptions.map((st) => {
                const isSel = selectedStorage === st;
                return (
                  <TouchableOpacity
                    key={st}
                    style={[styles.storagePill, isSel && styles.storagePillActive]}
                    onPress={() => setSelectedStorage(st)}
                  >
                    <Text style={[styles.storagePillText, isSel && styles.storagePillTextActive]}>
                      {st}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 2. Screen Condition */}
            <Text style={styles.inputLabel}>Screen Condition</Text>
            <View style={styles.segmentedOptionsRow}>
              {[
                { key: 'flawless', label: 'Flawless', desc: 'No scratches' },
                { key: 'good', label: 'Good', desc: 'Minor hairline' },
                { key: 'cracked', label: 'Cracked', desc: 'Broken / lines' },
              ].map((opt) => {
                const isSel = screenCond === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[styles.segmentedBox, isSel && styles.segmentedBoxActive]}
                    onPress={() => setScreenCond(opt.key as any)}
                  >
                    <Text style={[styles.segmentedTitle, isSel && styles.segmentedTitleActive]}>
                      {opt.label}
                    </Text>
                    <Text style={styles.segmentedDesc}>{opt.desc}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 3. Body Condition */}
            <Text style={styles.inputLabel}>Body Condition</Text>
            <View style={styles.segmentedOptionsRow}>
              {[
                { key: 'likenew', label: 'Like New', desc: 'No dents' },
                { key: 'fair', label: 'Fair', desc: 'Light scuffs' },
                { key: 'dented', label: 'Heavy Wear', desc: 'Noticeable dents' },
              ].map((opt) => {
                const isSel = bodyCond === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[styles.segmentedBox, isSel && styles.segmentedBoxActive]}
                    onPress={() => setBodyCond(opt.key as any)}
                  >
                    <Text style={[styles.segmentedTitle, isSel && styles.segmentedTitleActive]}>
                      {opt.label}
                    </Text>
                    <Text style={styles.segmentedDesc}>{opt.desc}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 4. Functional Health Checklist */}
            <Text style={styles.inputLabel}>Functional Checks</Text>
            <View style={styles.checklistGroup}>
              {[
                {
                  label: 'Power & charging',
                  sub: 'Powers on and charges normally',
                  value: switchesOn,
                  toggle: () => setSwitchesOn(!switchesOn),
                },
                {
                  label: 'Touch responsiveness',
                  sub: 'Responds properly across screen',
                  value: touchWorking,
                  toggle: () => setTouchWorking(!touchWorking),
                },
                {
                  label: 'Camera clarity',
                  sub: 'Front and back cameras work clear',
                  value: cameraClear,
                  toggle: () => setCameraClear(!cameraClear),
                },
                {
                  label: 'Battery health',
                  sub: 'Battery healthy and charges stably',
                  value: batteryHealthy,
                  toggle: () => setBatteryHealthy(!batteryHealthy),
                },
              ].map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.checklistItem, idx > 0 && styles.checklistItemBorder]}
                  onPress={item.toggle}
                >
                  <Ionicons
                    name={item.value ? 'checkmark-circle' : 'ellipse-outline'}
                    size={18}
                    color={item.value ? '#10b981' : '#cbd5e1'}
                  />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.checkTitle}>{item.label}</Text>
                    <Text style={styles.checkSub}>{item.sub}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* 5. Accessories Bonus */}
            <Text style={styles.inputLabel}>Original Accessories</Text>
            <View style={styles.accessoriesList}>
              <TouchableOpacity
                style={[styles.accessoryItem, hasBox && styles.accessoryItemActive]}
                onPress={() => setHasBox(!hasBox)}
              >
                <Ionicons name="cube-outline" size={16} color={hasBox ? '#10b981' : '#64748b'} />
                <Text style={[styles.accessoryName, hasBox && styles.accessoryNameActive]}>
                  Original Box
                </Text>
                <Text style={styles.accessoryPill}>+₹800</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.accessoryItem, hasCharger && styles.accessoryItemActive]}
                onPress={() => setHasCharger(!hasCharger)}
              >
                <Ionicons name="flash-outline" size={16} color={hasCharger ? '#10b981' : '#64748b'} />
                <Text style={[styles.accessoryName, hasCharger && styles.accessoryNameActive]}>
                  Original Charger
                </Text>
                <Text style={styles.accessoryPill}>+₹1,000</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.accessoryItem, hasBill && styles.accessoryItemActive]}
                onPress={() => setHasBill(!hasBill)}
              >
                <Ionicons name="receipt-outline" size={16} color={hasBill ? '#10b981' : '#64748b'} />
                <Text style={[styles.accessoryName, hasBill && styles.accessoryNameActive]}>
                  Purchase Invoice
                </Text>
                <Text style={styles.accessoryPill}>+₹500</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.outlineButton} onPress={() => setStep(3)}>
                <Ionicons name="arrow-back" size={16} color="#475569" />
                <Text style={styles.outlineButtonText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryButton, { flex: 1 }]}
                onPress={() => setStep(5)}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryButtonText}>Continue to Photos</Text>
                <Ionicons name="arrow-forward" size={16} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ==================== STEP 5: UPLOAD PHOTOS ==================== */}
        {step === 5 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Device Photography</Text>
            <Text style={styles.sectionSubtitle}>
              Upload 4 photos or choose in-person technician doorstep inspection
            </Text>

            <View style={styles.photoGrid}>
              {[
                { slot: 'front' as const, title: 'Front Display' },
                { slot: 'back' as const, title: 'Back Panel' },
                { slot: 'edges' as const, title: 'Edges / Frame' },
                { slot: 'billBox' as const, title: 'Bill / Box' },
              ].map((item) => {
                const imgUri = photos[item.slot];
                const isUploading = uploadingSlot === item.slot;
                return (
                  <View key={item.slot} style={styles.photoSlotBox}>
                    {imgUri ? (
                      <View style={styles.photoFilledWrap}>
                        <Image source={{ uri: imgUri }} style={styles.photoImg as any} />
                        <TouchableOpacity
                          style={styles.photoRemoveBadge}
                          onPress={() => removePhoto(item.slot)}
                        >
                          <Ionicons name="close" size={12} color="#ffffff" />
                        </TouchableOpacity>
                        <View style={styles.photoSlotNamePlate}>
                          <Text style={styles.photoSlotNameText}>{item.title}</Text>
                        </View>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.photoEmptyBox}
                        onPress={() => handlePhotoUpload(item.slot)}
                        disabled={isUploading}
                        activeOpacity={0.8}
                      >
                        {isUploading ? (
                          <ActivityIndicator size="small" color="#0f172a" />
                        ) : (
                          <>
                            <Ionicons name="camera-outline" size={20} color="#64748b" />
                            <Text style={styles.photoEmptyTitle}>{item.title}</Text>
                            <Text style={styles.photoEmptyAction}>Tap to upload</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Skip photo option */}
            <TouchableOpacity
              style={[styles.skipCard, photoSkipped && styles.skipCardActive]}
              onPress={() => setPhotoSkipped(!photoSkipped)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={photoSkipped ? 'checkbox-outline' : 'shield-outline'}
                size={18}
                color={photoSkipped ? '#10b981' : '#64748b'}
              />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.skipCardTitle}>
                  Skip photo upload (Doorstep physical inspection)
                </Text>
                <Text style={styles.skipCardDesc}>
                  Our certified field agent will inspect and verify your device during pickup.
                </Text>
              </View>
            </TouchableOpacity>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.outlineButton} onPress={() => setStep(4)}>
                <Ionicons name="arrow-back" size={16} color="#475569" />
                <Text style={styles.outlineButtonText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryButton, { flex: 1 }]}
                onPress={() => setStep(6)}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryButtonText}>Continue to Price</Text>
                <Ionicons name="arrow-forward" size={16} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ==================== STEP 6: EXPECTED PRICE ==================== */}
        {step === 6 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Instant Valuation</Text>
            <Text style={styles.sectionSubtitle}>
              Fair pricing computed from active market rates and device health
            </Text>

            {/* Clean Valuation Container */}
            <View style={styles.valuationPanel}>
              <View style={styles.valuationTopRow}>
                <Text style={styles.valuationTag}>Estimated Offer</Text>
                <View style={styles.priceLockTag}>
                  <Ionicons name="shield-checkmark" size={12} color="#059669" />
                  <Text style={styles.priceLockTagText}>7-Day Price Lock</Text>
                </View>
              </View>

              <View style={styles.amountDisplayRow}>
                <Text style={styles.rupeeSign}>₹</Text>
                {quoteLoading ? (
                  <ActivityIndicator size="small" color="#0f172a" />
                ) : (
                  <Text style={styles.amountNumber}>{quoteAmount.toLocaleString('en-IN')}</Text>
                )}
              </View>

              <Text style={styles.deviceSpecSub}>
                {selectedBrand} • {customModelMode ? customModelName : selectedModel} ({selectedStorage})
              </Text>

              {/* Minimal itemized list */}
              <View style={styles.breakdownTable}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownKey}>Base Market Value</Text>
                  <Text style={styles.breakdownVal}>₹{(quoteAmount + 3500).toLocaleString('en-IN')}</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownKey}>Screen ({screenCond})</Text>
                  <Text style={[styles.breakdownVal, screenCond !== 'flawless' && { color: '#dc2626' }]}>
                    {screenCond === 'flawless' ? 'Included' : screenCond === 'good' ? '-₹4,500' : '-₹12,000'}
                  </Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownKey}>Body ({bodyCond})</Text>
                  <Text style={[styles.breakdownVal, bodyCond !== 'likenew' && { color: '#dc2626' }]}>
                    {bodyCond === 'likenew' ? 'Included' : bodyCond === 'fair' ? '-₹3,000' : '-₹6,500'}
                  </Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownKey}>Accessories Bonus</Text>
                  <Text style={[styles.breakdownVal, { color: '#10b981' }]}>
                    +₹{(hasBox ? 800 : 0) + (hasCharger ? 1000 : 0) + (hasBill ? 500 : 0)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Expected Price Input */}
            <View style={styles.expectedFieldWrap}>
              <Text style={styles.inputLabel}>Your Expected Selling Price (₹)</Text>
              <View style={styles.expectedInputRow}>
                <Text style={styles.currencyLabel}>₹</Text>
                <TextInput
                  placeholder="Expected price"
                  placeholderTextColor="#94a3b8"
                  value={expectedPrice}
                  onChangeText={setExpectedPrice}
                  keyboardType="numeric"
                  style={styles.expectedInput}
                />
              </View>

              {/* Quick Adjust Chips */}
              <View style={styles.adjustRow}>
                <TouchableOpacity
                  style={styles.adjustPill}
                  onPress={() => setExpectedPrice(quoteAmount.toString())}
                >
                  <Text style={styles.adjustPillText}>Match Valuation</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.adjustPill}
                  onPress={() => setExpectedPrice((quoteAmount + 2000).toString())}
                >
                  <Text style={styles.adjustPillText}>+₹2,000</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.adjustPill}
                  onPress={() => setExpectedPrice((quoteAmount + 5000).toString())}
                >
                  <Text style={styles.adjustPillText}>+₹5,000</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.outlineButton} onPress={() => setStep(5)}>
                <Ionicons name="arrow-back" size={16} color="#475569" />
                <Text style={styles.outlineButtonText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryButton, { flex: 1 }]}
                onPress={() => setStep(7)}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryButtonText}>Continue to Pickup</Text>
                <Ionicons name="arrow-forward" size={16} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ==================== STEP 7: PICKUP DETAILS ==================== */}
        {step === 7 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Pickup & Payment</Text>
            <Text style={styles.sectionSubtitle}>
              Schedule free doorstep pickup and select your preferred payout method
            </Text>

            <View style={styles.inputsStack}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                placeholder="e.g. John Doe"
                placeholderTextColor="#94a3b8"
                value={userName}
                onChangeText={setUserName}
                style={styles.minimalTextInput}
              />

              <Text style={styles.inputLabel}>Mobile Number</Text>
              <TextInput
                placeholder="10-digit mobile number"
                placeholderTextColor="#94a3b8"
                value={userPhone}
                onChangeText={setUserPhone}
                keyboardType="phone-pad"
                style={styles.minimalTextInput}
              />

              <Text style={styles.inputLabel}>Pickup Address</Text>
              <TextInput
                placeholder="Street address, apartment, flat no..."
                placeholderTextColor="#94a3b8"
                value={userAddress}
                onChangeText={setUserAddress}
                multiline
                numberOfLines={2}
                style={[styles.minimalTextInput, { height: 64, textAlignVertical: 'top' }]}
              />

              <Text style={styles.inputLabel}>Pincode</Text>
              <TextInput
                placeholder="e.g. 560001"
                placeholderTextColor="#94a3b8"
                value={userPincode}
                onChangeText={setUserPincode}
                keyboardType="numeric"
                maxLength={6}
                style={styles.minimalTextInput}
              />
            </View>

            {/* Date Selection */}
            <Text style={styles.inputLabel}>Select Date</Text>
            <View style={styles.selectorRow}>
              {(['Today', 'Tomorrow', 'Day After'] as const).map((d) => {
                const isSel = pickupDate === d;
                return (
                  <TouchableOpacity
                    key={d}
                    style={[styles.selectorBox, isSel && styles.selectorBoxActive]}
                    onPress={() => setPickupDate(d)}
                  >
                    <Text style={[styles.selectorTitle, isSel && styles.selectorTitleActive]}>
                      {formattedDates[d]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Time Slot Selection */}
            <Text style={styles.inputLabel}>Time Slot</Text>
            <View style={styles.selectorRow}>
              {[
                { key: 'Morning' as const, label: '10 AM - 1 PM' },
                { key: 'Afternoon' as const, label: '2 PM - 5 PM' },
                { key: 'Evening' as const, label: '5 PM - 8 PM' },
              ].map((t) => {
                const isSel = timeSlot === t.key;
                return (
                  <TouchableOpacity
                    key={t.key}
                    style={[styles.selectorBox, isSel && styles.selectorBoxActive]}
                    onPress={() => setTimeSlot(t.key)}
                  >
                    <Text style={[styles.selectorTitle, isSel && styles.selectorTitleActive]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Payout Selection */}
            <Text style={styles.inputLabel}>Payout Method</Text>
            <View style={styles.selectorRow}>
              {[
                { key: 'upi' as const, label: 'UPI (GPay / PhonePe)' },
                { key: 'bank' as const, label: 'Bank Transfer' },
                { key: 'cash' as const, label: 'Cash on Handover' },
              ].map((p) => {
                const isSel = payoutMethod === p.key;
                return (
                  <TouchableOpacity
                    key={p.key}
                    style={[styles.selectorBox, isSel && styles.selectorBoxActive]}
                    onPress={() => setPayoutMethod(p.key)}
                  >
                    <Text style={[styles.selectorTitle, isSel && styles.selectorTitleActive]}>
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {payoutMethod === 'upi' && (
              <View style={{ marginBottom: 14 }}>
                <Text style={styles.inputLabel}>UPI ID</Text>
                <TextInput
                  placeholder="e.g. mobile@okaxis or user@upi"
                  placeholderTextColor="#94a3b8"
                  value={upiId}
                  onChangeText={setUpiId}
                  autoCapitalize="none"
                  style={styles.minimalTextInput}
                />
              </View>
            )}

            {payoutMethod === 'bank' && (
              <View style={{ marginBottom: 14 }}>
                <Text style={styles.inputLabel}>Account Number</Text>
                <TextInput
                  placeholder="Bank account number"
                  placeholderTextColor="#94a3b8"
                  value={bankAccount}
                  onChangeText={setBankAccount}
                  keyboardType="numeric"
                  style={styles.minimalTextInput}
                />
                <Text style={styles.inputLabel}>IFSC Code</Text>
                <TextInput
                  placeholder="e.g. HDFC0000123"
                  placeholderTextColor="#94a3b8"
                  value={bankIfsc}
                  onChangeText={setBankIfsc}
                  autoCapitalize="characters"
                  style={styles.minimalTextInput}
                />
              </View>
            )}

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.outlineButton} onPress={() => setStep(6)}>
                <Ionicons name="arrow-back" size={16} color="#475569" />
                <Text style={styles.outlineButtonText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryButton, { flex: 1 }]}
                onPress={() => {
                  if (!userName.trim() || !userPhone.trim() || !userAddress.trim() || !userPincode.trim()) {
                    toast.warning('Please complete all contact and address fields.', 'Missing Details');
                    return;
                  }
                  setStep(8);
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryButtonText}>Review Summary</Text>
                <Ionicons name="arrow-forward" size={16} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ==================== STEP 8: REVIEW ==================== */}
        {step === 8 && (
          <View style={styles.card}>
            {!bookingConfirmed ? (
              <>
                <Text style={styles.sectionTitle}>Review & Confirm</Text>
                <Text style={styles.sectionSubtitle}>
                  Please review your trade-in submission before confirming pickup
                </Text>

                <View style={styles.summaryCard}>
                  <View style={styles.summaryTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.summaryDeviceTitle}>
                        {selectedBrand} {customModelMode ? customModelName : selectedModel}
                      </Text>
                      <Text style={styles.summaryDeviceMeta}>
                        {selectedCat.name} • {selectedStorage}
                      </Text>
                    </View>
                    <View style={styles.summaryPriceBadge}>
                      <Text style={styles.summaryPriceTag}>Offer</Text>
                      <Text style={styles.summaryPriceNum}>
                        ₹{Number(expectedPrice || quoteAmount).toLocaleString('en-IN')}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.summaryDivider} />

                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryKey}>Screen / Body</Text>
                    <Text style={styles.summaryValue}>
                      {screenCond.toUpperCase()} • {bodyCond.toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryKey}>Accessories</Text>
                    <Text style={styles.summaryValue}>
                      {[hasBox ? 'Box' : null, hasCharger ? 'Charger' : null, hasBill ? 'Bill' : null]
                        .filter(Boolean)
                        .join(', ') || 'None'}
                    </Text>
                  </View>

                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryKey}>Photos</Text>
                    <Text style={styles.summaryValue}>
                      {photoSkipped ? 'Technician Doorstep Inspection' : '4 angles attached'}
                    </Text>
                  </View>

                  <View style={styles.summaryDivider} />

                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryKey}>Pickup To</Text>
                    <Text style={styles.summaryValue}>{userName} ({userPhone})</Text>
                  </View>

                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryKey}>Address</Text>
                    <Text style={styles.summaryValue}>{userAddress} - {userPincode}</Text>
                  </View>

                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryKey}>Schedule</Text>
                    <Text style={styles.summaryValue}>{formattedDates[pickupDate]} ({timeSlot})</Text>
                  </View>

                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryKey}>Payment Method</Text>
                    <Text style={styles.summaryValue}>
                      {payoutMethod === 'upi' ? `UPI (${upiId})` : payoutMethod === 'bank' ? 'Bank Transfer' : 'Cash'}
                    </Text>
                  </View>
                </View>

                <View style={styles.buttonRow}>
                  <TouchableOpacity style={styles.outlineButton} onPress={() => setStep(7)}>
                    <Ionicons name="arrow-back" size={16} color="#475569" />
                    <Text style={styles.outlineButtonText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.primaryButton, { flex: 1 }, isSubmitting && styles.buttonDisabled]}
                    onPress={handleConfirmPickup}
                    disabled={isSubmitting}
                    activeOpacity={0.85}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle-outline" size={16} color="#ffffff" />
                        <Text style={styles.primaryButtonText}>Confirm & Book Pickup</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.confirmedContainer}>
                <View style={styles.confirmedCircle}>
                  <Ionicons name="checkmark" size={28} color="#059669" />
                </View>
                <Text style={styles.confirmedHeading}>Pickup Scheduled</Text>
                <Text style={styles.confirmedSub}>
                  Our executive will inspect your device and transfer payment at handover.
                </Text>

                <View style={styles.refBox}>
                  <Text style={styles.refLabel}>Booking Reference</Text>
                  <Text style={styles.refCode}>{bookingRefId}</Text>
                </View>

                <View style={styles.nextStepsBox}>
                  <Text style={styles.nextStepsHeading}>Before the technician arrives:</Text>
                  <Text style={styles.nextStepBullet}>• Back up your personal data and sign out of Apple/Google accounts.</Text>
                  <Text style={styles.nextStepBullet}>• Keep original accessories and ID proof ready.</Text>
                  <Text style={styles.nextStepBullet}>• Quick 5-minute diagnostic testing followed by instant payment.</Text>
                </View>

                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleResetWorkflow}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryButtonText}>Sell Another Device</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f7fb',
  },

  // Minimal Header
  header: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#475569',
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '400',
    color: '#64748b',
    marginTop: 3,
  },

  // Stepper Header
  stepperContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  stepperMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepperStepName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
  },
  stepperCurrentTitle: {
    fontWeight: '600',
    color: '#0f172a',
  },
  stepperPercent: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  progressTrack: {
    height: 3,
    backgroundColor: '#f1f5f9',
    borderRadius: 1.5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0f172a',
    borderRadius: 1.5,
  },
  stepChipsScroll: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  stepPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  stepPillActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  stepPillDone: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  stepPillDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepPillDotActive: {
    backgroundColor: '#ffffff',
  },
  stepPillDotDone: {
    backgroundColor: '#10b981',
  },
  stepPillNum: {
    fontSize: 9,
    fontWeight: '600',
    color: '#64748b',
  },
  stepPillNumActive: {
    color: '#0f172a',
  },
  stepPillLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748b',
  },
  stepPillLabelActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  stepPillLabelDone: {
    color: '#15803d',
  },

  // Main Card & Body
  scrollContent: {
    padding: 14,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e8ebf0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '400',
    color: '#64748b',
    marginTop: 2,
    marginBottom: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  // Step 1: Category & Ceiling
  ceilingNotice: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  ceilingIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ceilingHeading: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  ceilingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginTop: 1,
  },
  ceilingDescription: {
    fontSize: 11,
    fontWeight: '400',
    color: '#64748b',
    marginTop: 2,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categoryCard: {
    width: '48.5%',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
  },
  categoryCardActive: {
    borderColor: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  categoryIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  categoryIconCircleActive: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  categoryTitleActive: {
    color: '#0f172a',
  },
  categorySubtitle: {
    fontSize: 10,
    fontWeight: '400',
    color: '#64748b',
    marginTop: 2,
    marginBottom: 8,
  },
  categoryCeilingTag: {
    backgroundColor: '#f1f5f9',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryCeilingText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#475569',
  },

  // Step 2: Brands
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    fontWeight: '400',
    color: '#0f172a',
  },
  brandsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  brandCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '48.5%',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 11,
  },
  brandCardActive: {
    borderColor: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  brandAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandAvatarActive: {
    backgroundColor: '#0f172a',
  },
  brandAvatarText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  brandAvatarTextActive: {
    color: '#ffffff',
  },
  brandName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#334155',
    flex: 1,
  },
  brandNameActive: {
    color: '#0f172a',
    fontWeight: '600',
  },
  emptyContainer: {
    paddingVertical: 18,
    alignItems: 'center',
  },


  loadingCatalog: {
    minHeight: 72,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e8ebf0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 7,
  },

  loadingCatalogText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },

  emptyIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  emptyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 3,
  },

  emptyText: {
    fontSize: 12,
    fontWeight: '400',
    color: '#64748b',
  },
  emptyActionButton: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },
  emptyActionText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#0f172a',
  },

  // Step 3: Models
  modelList: {
    gap: 6,
    marginBottom: 12,
  },
  modelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
  },
  modelRowActive: {
    borderColor: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  radioCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: '#0f172a',
  },
  radioDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#0f172a',
  },
  modelTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#334155',
    flex: 1,
  },
  modelTitleActive: {
    color: '#0f172a',
    fontWeight: '600',
  },
  selectedTag: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  selectedTagText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#475569',
  },
  customToggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
  },
  customToggleCardActive: {
    borderColor: '#0f172a',
    backgroundColor: '#ffffff',
  },
  customToggleTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#334155',
  },
  customToggleSubtitle: {
    fontSize: 10,
    fontWeight: '400',
    color: '#64748b',
  },

  // Inputs
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
    marginTop: 6,
  },
  minimalTextInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === 'ios' ? 8 : 6,
    fontSize: 12,
    fontWeight: '400',
    color: '#0f172a',
    marginBottom: 6,
  },

  // Step 4: Specs & Condition
  storagePillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  storagePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  storagePillActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  storagePillText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#475569',
  },
  storagePillTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  segmentedOptionsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  segmentedBox: {
    flex: 1,
    padding: 9,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  segmentedBoxActive: {
    borderColor: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  segmentedTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  segmentedTitleActive: {
    color: '#0f172a',
  },
  segmentedDesc: {
    fontSize: 9,
    fontWeight: '400',
    color: '#64748b',
    marginTop: 2,
    textAlign: 'center',
  },
  checklistGroup: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  checklistItemBorder: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  checkTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1e293b',
  },
  checkSub: {
    fontSize: 10,
    fontWeight: '400',
    color: '#64748b',
  },
  accessoriesList: {
    gap: 6,
    marginBottom: 16,
  },
  accessoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  accessoryItemActive: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  accessoryName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#334155',
    flex: 1,
  },
  accessoryNameActive: {
    color: '#15803d',
    fontWeight: '600',
  },
  accessoryPill: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10b981',
  },

  // Step 5: Photos
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  photoSlotBox: {
    width: '48.5%',
    aspectRatio: 1.1,
  },
  photoEmptyBox: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  photoEmptyTitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#334155',
    marginTop: 4,
  },
  photoEmptyAction: {
    fontSize: 9,
    fontWeight: '400',
    color: '#94a3b8',
    marginTop: 2,
  },
  photoFilledWrap: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoRemoveBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoSlotNamePlate: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15,23,42,0.7)',
    paddingVertical: 3,
    alignItems: 'center',
  },
  photoSlotNameText: {
    fontSize: 9,
    fontWeight: '500',
    color: '#ffffff',
  },
  skipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  skipCardActive: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  skipCardTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#334155',
  },
  skipCardDesc: {
    fontSize: 10,
    fontWeight: '400',
    color: '#64748b',
    marginTop: 1,
  },

  // Step 6: Valuation
  valuationPanel: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  valuationTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  valuationTag: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  priceLockTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  priceLockTagText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#15803d',
  },
  amountDisplayRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
    marginVertical: 4,
  },
  rupeeSign: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0f172a',
  },
  amountNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  deviceSpecSub: {
    fontSize: 11,
    fontWeight: '400',
    color: '#64748b',
    marginBottom: 10,
  },
  breakdownTable: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  breakdownKey: {
    fontSize: 11,
    fontWeight: '400',
    color: '#64748b',
  },
  breakdownVal: {
    fontSize: 11,
    fontWeight: '500',
    color: '#0f172a',
  },
  expectedFieldWrap: {
    marginBottom: 16,
  },
  expectedInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  currencyLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginRight: 4,
  },
  expectedInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    paddingVertical: 6,
  },
  adjustRow: {
    flexDirection: 'row',
    gap: 6,
  },
  adjustPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },
  adjustPillText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#334155',
  },

  // Step 7: Pickup & Form
  inputsStack: {
    marginBottom: 10,
  },
  selectorRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  selectorBox: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorBoxActive: {
    borderColor: '#0f172a',
    backgroundColor: '#ffffff',
  },
  selectorTitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#475569',
    textAlign: 'center',
  },
  selectorTitleActive: {
    color: '#0f172a',
    fontWeight: '600',
  },

  // Step 8: Review & Confirm
  summaryCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryDeviceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  summaryDeviceMeta: {
    fontSize: 11,
    fontWeight: '400',
    color: '#64748b',
    marginTop: 1,
  },
  summaryPriceBadge: {
    alignItems: 'flex-end',
  },
  summaryPriceTag: {
    fontSize: 9,
    fontWeight: '500',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  summaryPriceNum: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  summaryKey: {
    fontSize: 11,
    fontWeight: '400',
    color: '#64748b',
  },
  summaryValue: {
    fontSize: 11,
    fontWeight: '500',
    color: '#0f172a',
    flex: 1,
    textAlign: 'right',
    marginLeft: 8,
  },

  // Success Screen
  confirmedContainer: {
    alignItems: 'center',
    paddingVertical: 18,
  },
  confirmedCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  confirmedHeading: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
  },
  confirmedSub: {
    fontSize: 12,
    fontWeight: '400',
    color: '#64748b',
    textAlign: 'center',
    marginTop: 3,
    marginBottom: 14,
  },
  refBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 14,
  },
  refLabel: {
    fontSize: 9,
    fontWeight: '500',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  refCode: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  nextStepsBox: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    marginBottom: 18,
  },
  nextStepsHeading: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  nextStepBullet: {
    fontSize: 11,
    fontWeight: '400',
    color: '#64748b',
    lineHeight: 16,
    marginBottom: 2,
  },

  // Shared Buttons
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  outlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  outlineButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#475569',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0f172a',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  primaryButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
