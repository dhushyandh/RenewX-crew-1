import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
  SafeAreaView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '@/services/api';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { useSafeHeaderTop } from '@/lib/useSafeHeaderTop';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme';

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
    subtitle: 'iPhones, Galaxy S, Pixels',
  },
  {
    id: 'macbooks',
    name: 'MacBooks',
    maxPrice: '₹1,65,000',
    ceilingNum: 165000,
    icon: 'laptop-outline',
    subtitle: 'M1, M2, M3 & Pro Silicon',
  },
  {
    id: 'laptops',
    name: 'Windows Laptops',
    maxPrice: '₹75,000',
    ceilingNum: 75000,
    icon: 'desktop-outline',
    subtitle: 'Dell, HP, Lenovo, ASUS',
  },
  {
    id: 'tablets',
    name: 'Tablets & iPads',
    maxPrice: '₹60,000',
    ceilingNum: 60000,
    icon: 'tablet-portrait-outline',
    subtitle: 'iPad Pro, Air, Galaxy Tab',
  },
  {
    id: 'wearables',
    name: 'Wearables & Audio',
    maxPrice: '₹35,000',
    ceilingNum: 35000,
    icon: 'watch-outline',
    subtitle: 'Apple Watch, AirPods, Sony',
  },
  {
    id: 'cameras',
    name: 'Cameras',
    maxPrice: '₹95,000',
    ceilingNum: 95000,
    icon: 'camera-outline',
    subtitle: 'Sony Alpha, Canon, Nikon',
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

const SAVED_ADDRESSES_KEY = '@renewx_saved_addresses';

const FLOW_STEPS = [
  { id: 1, title: 'Device', icon: 'phone-portrait-outline' as const },
  { id: 2, title: 'Condition', icon: 'shield-checkmark-outline' as const },
  { id: 3, title: 'Valuation', icon: 'cash-outline' as const },
  { id: 4, title: 'Pickup', icon: 'calendar-outline' as const },
];

const unwrapRows = (response: any): any[] => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.results)) return response.results;
  if (Array.isArray(response?.items)) return response.items;
  return [];
};

export default function SellScreen() {
  const safeTop = useSafeHeaderTop();
  const navigation = useNavigation<any>();
  const toast = useToast();
  const { user } = useAuth();

  // 4-Step streamlined workflow (1: Device, 2: Condition, 3: Valuation, 4: Pickup)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // STEP 1: Device Info
  const [selectedCat, setSelectedCat] = useState<CategoryItem>(CATEGORIES[0]);
  const [selectedBrand, setSelectedBrand] = useState('Apple');
  const [brandSearch, setBrandSearch] = useState('');
  const [brandsList, setBrandsList] = useState<any[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(false);

  const [selectedModel, setSelectedModel] = useState('iPhone 15 Pro');
  const [modelSearch, setModelSearch] = useState('');
  const [modelsList, setModelsList] = useState<any[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [customModelMode, setCustomModelMode] = useState(false);
  const [customModelName, setCustomModelName] = useState('');

  // STEP 2: Condition & Specs
  const [storageOptions, setStorageOptions] = useState<string[]>(STANDARD_STORAGES);
  const [selectedStorage, setSelectedStorage] = useState('256 GB');
  const [screenCond, setScreenCond] = useState<'flawless' | 'good' | 'cracked'>('flawless');
  const [bodyCond, setBodyCond] = useState<'likenew' | 'fair' | 'dented'>('likenew');

  // Functional health checks
  const [switchesOn, setSwitchesOn] = useState(true);
  const [touchWorking, setTouchWorking] = useState(true);
  const [cameraClear, setCameraClear] = useState(true);
  const [batteryHealthy, setBatteryHealthy] = useState(true);

  // Accessories
  const [hasBox, setHasBox] = useState(true);
  const [hasCharger, setHasCharger] = useState(true);
  const [hasBill, setHasBill] = useState(true);

  // STEP 3: Valuation & Photos
  const [quoteAmount, setQuoteAmount] = useState(48500);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [expectedPrice, setExpectedPrice] = useState('48500');

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
  const [photoSkipped, setPhotoSkipped] = useState(true);
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);

  // STEP 4: Pickup & Payout
  const [userName, setUserName] = useState(user?.full_name || '');
  const [userPhone, setUserPhone] = useState('');
  const [userAddress, setUserAddress] = useState('');
  const [userPincode, setUserPincode] = useState('');
  const [locating, setLocating] = useState(false);

  const [pickupDate, setPickupDate] = useState<'Today' | 'Tomorrow' | 'Day After'>('Today');
  const [timeSlot, setTimeSlot] = useState<'Morning' | 'Afternoon' | 'Evening'>('Morning');
  const [payoutMethod, setPayoutMethod] = useState<'upi' | 'bank' | 'cash'>('upi');
  const [upiId, setUpiId] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');

  // Booking Result
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [bookingRefId, setBookingRefId] = useState('');

  // Preload saved address if available
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(SAVED_ADDRESSES_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed[0]) {
            const first = parsed[0];
            if (!userName && first.name) setUserName(first.name);
            if (!userPhone && first.phone) setUserPhone(first.phone);
            if (!userAddress && first.address) setUserAddress(first.address);
            if (!userPincode && first.pincode) setUserPincode(first.pincode);
          }
        }
      } catch {
        // Ignore storage read error
      }
    })();
  }, []);

  // Fetch brands from database with fallback
  useEffect(() => {
    let active = true;
    setBrandsLoading(true);

    api.brands
      .getAll({ category: selectedCat.name })
      .then((res: any) => {
        if (!active) return;
        const rows = unwrapRows(res);
        const mapped = rows
          .filter((r) => r && (r.name || r.brand_name))
          .map((r) => ({
            id: String(r.id || r._id || r.name),
            name: String(r.name || r.brand_name).trim(),
          }));

        if (mapped.length > 0) {
          setBrandsList(mapped);
          if (!mapped.some((b) => b.name.toLowerCase() === selectedBrand.toLowerCase())) {
            setSelectedBrand(mapped[0].name);
          }
        } else {
          const defaults = (DEFAULT_BRANDS[selectedCat.name] || ['Apple', 'Samsung']).map((b) => ({
            id: b,
            name: b,
          }));
          setBrandsList(defaults);
          setSelectedBrand(defaults[0].name);
        }
      })
      .catch(() => {
        if (!active) return;
        const defaults = (DEFAULT_BRANDS[selectedCat.name] || ['Apple', 'Samsung']).map((b) => ({
          id: b,
          name: b,
        }));
        setBrandsList(defaults);
        setSelectedBrand(defaults[0].name);
      })
      .finally(() => {
        if (active) setBrandsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedCat.name]);

  // Fetch models from database with fallback
  useEffect(() => {
    if (!selectedBrand) return;

    let active = true;
    setModelsLoading(true);
    setCustomModelMode(false);
    setCustomModelName('');

    const brandObj = brandsList.find(
      (b) => b.name.toLowerCase() === selectedBrand.toLowerCase()
    );

    api.models
      .getAll({
        category: selectedCat.name,
        brand_id: brandObj?.id || 'all',
      })
      .then((res: any) => {
        if (!active) return;
        const rows = unwrapRows(res);
        const mapped = rows
          .filter((r) => r && (r.name || r.model_name))
          .map((r) => ({
            id: String(r.id || r._id || r.name),
            name: String(r.name || r.model_name).trim(),
            storage_options: r.storage_options || r.storages || [],
          }));

        if (mapped.length > 0) {
          setModelsList(mapped);
          setSelectedModel(mapped[0].name);
          if (mapped[0].storage_options && mapped[0].storage_options.length > 0) {
            setStorageOptions(mapped[0].storage_options);
            setSelectedStorage(mapped[0].storage_options[0]);
          }
        } else {
          const defaults = (DEFAULT_MODELS[selectedBrand] || ['Standard Model']).map((m) => ({
            id: m,
            name: m,
            storage_options: STANDARD_STORAGES,
          }));
          setModelsList(defaults);
          setSelectedModel(defaults[0].name);
          setStorageOptions(STANDARD_STORAGES);
        }
      })
      .catch(() => {
        if (!active) return;
        const defaults = (DEFAULT_MODELS[selectedBrand] || ['Standard Model']).map((m) => ({
          id: m,
          name: m,
          storage_options: STANDARD_STORAGES,
        }));
        setModelsList(defaults);
        setSelectedModel(defaults[0].name);
        setStorageOptions(STANDARD_STORAGES);
      })
      .finally(() => {
        if (active) setModelsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedBrand, selectedCat.name, brandsList]);

  // Algorithmic local valuation calculation
  const calculateLocalValuation = () => {
    let base = selectedCat.ceilingNum * 0.58;
    const model = (customModelMode ? customModelName : selectedModel).toLowerCase();

    if (model.includes('max') || model.includes('ultra') || model.includes('pro 16')) base += 14000;
    else if (model.includes('pro') || model.includes('plus')) base += 8000;

    if (selectedStorage === '1 TB') base += 9000;
    else if (selectedStorage === '512 GB') base += 5000;
    else if (selectedStorage === '64 GB') base -= 3000;

    if (screenCond === 'good') base -= 4000;
    if (screenCond === 'cracked') base -= 11000;

    if (bodyCond === 'fair') base -= 2500;
    if (bodyCond === 'dented') base -= 6000;

    if (hasBox) base += 800;
    if (hasCharger) base += 1000;
    if (hasBill) base += 500;

    if (!switchesOn) base = Math.round(base * 0.4);
    if (!touchWorking) base -= 3500;
    if (!cameraClear) base -= 2000;
    if (!batteryHealthy) base -= 1500;

    return Math.max(Math.round(base), 3500);
  };

  // Recalculate live quote
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
        functionalChecks: { switchesOn, touchWorking, cameraClear, batteryHealthy },
        accessories: { hasBox, hasCharger, hasBill },
      })
      .then((res: any) => {
        if (!active) return;
        const amt = Number(res?.valuation || res?.data?.valuation || 0);
        const finalAmt = amt > 0 ? amt : calculateLocalValuation();
        setQuoteAmount(finalAmt);
        setExpectedPrice(String(finalAmt));
      })
      .catch(() => {
        if (!active) return;
        const localAmt = calculateLocalValuation();
        setQuoteAmount(localAmt);
        setExpectedPrice(String(localAmt));
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

  // GPS Auto-detect handler
  const handleUseGps = async () => {
    try {
      setLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please enable location permissions to auto-fill your pickup address.');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const geocoded = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      if (geocoded && geocoded.length > 0) {
        const place = geocoded[0];
        const parts = [
          place.name,
          place.street,
          place.subregion || place.district,
          place.city,
          place.region,
        ].filter(Boolean);

        if (parts.length > 0) setUserAddress(parts.join(', '));
        if (place.postalCode) {
          const cleanPin = place.postalCode.replace(/\D/g, '').slice(0, 6);
          if (cleanPin.length === 6) setUserPincode(cleanPin);
        }
        toast.success('Pickup address detected via GPS', 'Location Found');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Could not locate current address.');
    } finally {
      setLocating(false);
    }
  };

  // Convert asset (URI/Blob/Data) to Base64 reliably on Web & Mobile
  const resolveAssetBase64 = async (asset: ImagePicker.ImagePickerAsset): Promise<string> => {
    if (asset.base64 && typeof asset.base64 === 'string' && asset.base64.trim()) {
      return asset.base64.trim();
    }
    if (asset.uri && asset.uri.startsWith('data:')) {
      const parts = asset.uri.split(',');
      return parts[1] || '';
    }
    if (asset.uri) {
      try {
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const res = reader.result as string;
            const b64 = res.includes(',') ? res.split(',')[1] : res;
            resolve(b64 || '');
          };
          reader.onerror = () => resolve('');
          reader.readAsDataURL(blob);
        });
      } catch (err) {
        console.warn('[ImageConversion] Could not convert uri to base64:', err);
      }
    }
    return '';
  };

  // Photo upload
  const handlePhotoUpload = async (slot: 'front' | 'back' | 'edges' | 'billBox') => {
    try {
      setUploadingSlot(slot);
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      });

      if (!res.canceled && res.assets && res.assets[0]) {
        const asset = res.assets[0];
        const base64Data = await resolveAssetBase64(asset);
        let photoUri = '';

        if (base64Data) {
          try {
            const fileName = `device-${slot}-${Date.now()}.jpg`;
            const uploadRes = await api.upload.base64(base64Data, fileName, 'image/jpeg');
            if (uploadRes?.url) {
              photoUri = uploadRes.url;
            } else {
              photoUri = `data:image/jpeg;base64,${base64Data}`;
            }
          } catch (uploadErr) {
            console.warn('[Upload] Cloud storage upload failed, saving as inline data URI:', uploadErr);
            photoUri = `data:image/jpeg;base64,${base64Data}`;
          }
        } else if (asset.uri && !asset.uri.startsWith('blob:')) {
          photoUri = asset.uri;
        }

        if (photoUri) {
          setPhotos((prev) => ({ ...prev, [slot]: photoUri }));
          setPhotoSkipped(false);
          toast.success(`${slot.toUpperCase()} photo uploaded successfully.`);
        } else {
          toast.error('Could not process the selected image. Please try again.');
        }
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

  // Submit Trade-in Request
  const handleConfirmPickup = async () => {
    if (!userName.trim() || !userPhone.trim() || !userAddress.trim() || !userPincode.trim()) {
      toast.warning('Please enter your full contact details, pickup address & pincode.', 'Missing Details');
      return;
    }

    const cleanPhone = userPhone.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      toast.warning('Please enter a valid 10-digit mobile number.', 'Invalid Phone');
      return;
    }

    const cleanPin = userPincode.replace(/\D/g, '').slice(0, 6);
    if (cleanPin.length !== 6) {
      toast.warning('Please enter a valid 6-digit PIN code.', 'Invalid PIN');
      return;
    }

    if (payoutMethod === 'upi' && !upiId.trim()) {
      toast.warning('Please enter your UPI ID (e.g. name@okhdfcbank).', 'UPI ID Required');
      return;
    }

    if (payoutMethod === 'bank' && (!bankAccount.trim() || !bankIfsc.trim())) {
      toast.warning('Please enter bank account number and IFSC code.', 'Bank Details Required');
      return;
    }

    try {
      setIsSubmitting(true);
      const activeModel = customModelMode && customModelName.trim() ? customModelName.trim() : selectedModel;

      // Sanitize all photos: ensure zero blob: URLs reach the backend
      const sanitizedPhotosList: string[] = [];
      const sanitizedPhotoMap: Record<string, string> = {};

      for (const [slotKey, rawUri] of Object.entries(photos)) {
        if (!rawUri || typeof rawUri !== 'string' || !rawUri.trim()) continue;
        let pUri = rawUri.trim();
        if (pUri.startsWith('blob:')) {
          try {
            const resp = await fetch(pUri);
            const b = await resp.blob();
            const b64 = await new Promise<string>((resolve) => {
              const r = new FileReader();
              r.onloadend = () => {
                const res = r.result as string;
                resolve(res.includes(',') ? res.split(',')[1] : res);
              };
              r.onerror = () => resolve('');
              r.readAsDataURL(b);
            });
            if (b64) {
              try {
                const up = await api.upload.base64(b64, `device-${slotKey}-${Date.now()}.jpg`, 'image/jpeg');
                pUri = up?.url || `data:image/jpeg;base64,${b64}`;
              } catch {
                pUri = `data:image/jpeg;base64,${b64}`;
              }
            }
          } catch (e) {
            console.warn('[SellScreen] Pre-submit blob conversion failed:', e);
          }
        }
        if (pUri && !pUri.startsWith('blob:')) {
          sanitizedPhotosList.push(pUri);
          sanitizedPhotoMap[slotKey] = pUri;
        }
      }

      const payload = {
        category: selectedCat.name,
        brand: selectedBrand,
        model: activeModel,
        storage: selectedStorage,
        valuationAmount: quoteAmount,
        expectedSellingPrice: Number(expectedPrice) || quoteAmount,
        customerName: userName.trim(),
        customerPhone: cleanPhone,
        customerEmail: user?.email || '',
        pincode: cleanPin,
        address: userAddress.trim(),
        photos: sanitizedPhotosList,
        condition: {
          screen: screenCond,
          body: bodyCond,
          switchesOn,
          touchWorking,
          cameraClear,
          batteryHealthy,
          accessories: { hasBox, hasCharger, hasBill },
          photoCount: sanitizedPhotosList.length,
          photoSkipped: sanitizedPhotosList.length === 0,
          photos: sanitizedPhotosList,
          photoMap: sanitizedPhotoMap,
          pickupSchedule: { date: pickupDate, time: timeSlot },
          payout: { method: payoutMethod, upiId, bankAccount, bankIfsc },
        },
      };

      const res = await api.tradeIn.createPickup(payload);
      const reqId =
        res?.data?.id ||
        res?.data?._id ||
        res?.id ||
        `RNX-TRD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      setBookingRefId(String(reqId));
      setBookingConfirmed(true);
      toast.success('Pickup scheduled successfully!', 'Trade-in Booked');
    } catch (err: any) {
      toast.error(err?.message || 'Could not schedule pickup. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetWorkflow = () => {
    setBookingConfirmed(false);
    setBookingRefId('');
    setCurrentStep(1);
    setPhotos({ front: '', back: '', edges: '', billBox: '' });
    setPhotoSkipped(true);
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

  // Render Confirmation Screen
  if (bookingConfirmed) {
    return (
      <View style={[styles.container, { paddingTop: safeTop }]}>
        <ScrollView contentContainerStyle={styles.confirmedScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.celebrationCard}>
            <View style={styles.successIconOuter}>
              <View style={styles.successIconInner}>
                <Ionicons name="checkmark" size={38} color="#ffffff" />
              </View>
            </View>

            <View style={styles.liveBadge}>
              <View style={styles.greenPulse} />
              <Text style={styles.liveBadgeText}>PICKUP CONFIRMED</Text>
            </View>

            <Text style={styles.confirmedHeading}>Free Doorstep Pickup Scheduled</Text>
            <Text style={styles.confirmedSub}>
              A certified RenewX technician will inspect your device at your address and transfer cash instantly.
            </Text>

            <View style={styles.refBox}>
              <Text style={styles.refLabel}>TRADE-IN REFERENCE ID</Text>
              <Text style={styles.refCode}>#{bookingRefId.slice(-8).toUpperCase()}</Text>
            </View>

            <View style={styles.confirmedDetailsCard}>
              <View style={styles.confirmedRow}>
                <Text style={styles.confirmedRowKey}>Device</Text>
                <Text style={styles.confirmedRowVal}>
                  {selectedBrand} {customModelMode ? customModelName : selectedModel}
                </Text>
              </View>
              <View style={styles.confirmedRow}>
                <Text style={styles.confirmedRowKey}>Storage & Condition</Text>
                <Text style={styles.confirmedRowVal}>{selectedStorage} • {screenCond.toUpperCase()}</Text>
              </View>
              <View style={styles.confirmedRow}>
                <Text style={styles.confirmedRowKey}>Offer Payout</Text>
                <Text style={[styles.confirmedRowVal, { color: colors.primaryDark, fontWeight: '800' }]}>
                  ₹{Number(expectedPrice || quoteAmount).toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={styles.confirmedRow}>
                <Text style={styles.confirmedRowKey}>Pickup Schedule</Text>
                <Text style={styles.confirmedRowVal}>{formattedDates[pickupDate]} ({timeSlot})</Text>
              </View>
              <View style={[styles.confirmedRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.confirmedRowKey}>Payout Mode</Text>
                <Text style={styles.confirmedRowVal}>
                  {payoutMethod === 'upi' ? `Instant UPI (${upiId || 'PhonePe/GPay'})` : payoutMethod === 'bank' ? 'Bank Transfer' : 'Cash'}
                </Text>
              </View>
            </View>

            <View style={styles.prepNoticeBox}>
              <View style={styles.prepHeader}>
                <Ionicons name="information-circle-outline" size={18} color="#1e293b" />
                <Text style={styles.prepHeading}>Important Preparation Checklist</Text>
              </View>
              <Text style={styles.prepBullet}>• Back up your photos & documents, then log out of iCloud or Google.</Text>
              <Text style={styles.prepBullet}>• Keep original box, charger, and valid ID ready for extra payout.</Text>
              <Text style={styles.prepBullet}>• Technician conducts a fast 5-minute diagnostic before handover.</Text>
            </View>

            <TouchableOpacity
              style={styles.primaryActionButton}
              onPress={() => navigation.navigate('MySellRequests')}
              activeOpacity={0.88}
            >
              <Ionicons name="receipt-outline" size={18} color="#000" />
              <Text style={styles.primaryActionButtonText}>View My Sell Requests</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryActionButton}
              onPress={handleResetWorkflow}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryActionButtonText}>Sell Another Device</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: safeTop }]}>
      {/* Top RenewX Header */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.headerTitle}>Sell Your Device</Text>
              <View style={styles.goldBadge}>
                <Text style={styles.goldBadgeText}>LIVE CASH</Text>
              </View>
            </View>
            <Text style={styles.headerSubtitle}>
              Instant valuation • Free doorstep pickup • Same-day payout
            </Text>
          </View>
          <TouchableOpacity
            style={styles.headerRequestsBtn}
            onPress={() => navigation.navigate('MySellRequests')}
            activeOpacity={0.8}
          >
            <Ionicons name="receipt-outline" size={16} color={colors.text} />
            <Text style={styles.headerRequestsText}>My Requests</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 4-Step Stepper Bar */}
      <View style={styles.stepperContainer}>
        <View style={styles.stepperRow}>
          {FLOW_STEPS.map((s, index) => {
            const isCompleted = s.id < currentStep;
            const isActive = s.id === currentStep;

            return (
              <React.Fragment key={s.id}>
                <TouchableOpacity
                  style={styles.stepItem}
                  onPress={() => {
                    if (s.id < currentStep) setCurrentStep(s.id as any);
                  }}
                  disabled={s.id > currentStep}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.stepCircle,
                      isCompleted && styles.stepCircleCompleted,
                      isActive && styles.stepCircleActive,
                    ]}
                  >
                    {isCompleted ? (
                      <Ionicons name="checkmark" size={14} color="#000" />
                    ) : (
                      <Ionicons
                        name={s.icon}
                        size={13}
                        color={isActive ? colors.primary : '#94a3b8'}
                      />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.stepTitle,
                      isActive && styles.stepTitleActive,
                      isCompleted && styles.stepTitleCompleted,
                    ]}
                  >
                    {s.title}
                  </Text>
                </TouchableOpacity>

                {index < FLOW_STEPS.length - 1 && (
                  <View
                    style={[
                      styles.stepConnector,
                      s.id < currentStep && styles.stepConnectorCompleted,
                    ]}
                  />
                )}
              </React.Fragment>
            );
          })}
        </View>
      </View>

      {/* Selected Summary Ribbon (Steps 2 to 4) */}
      {currentStep > 1 && (
        <View style={styles.selectionRibbon}>
          <View style={styles.selectionRibbonIcon}>
            <Ionicons name="phone-portrait" size={14} color={colors.primaryDark} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.selectionRibbonDevice} numberOfLines={1}>
              {selectedBrand} {customModelMode ? customModelName : selectedModel}
            </Text>
            <Text style={styles.selectionRibbonCategory}>
              {selectedCat.name} • {selectedStorage} • {screenCond.toUpperCase()}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.selectionRibbonEdit}
            onPress={() => setCurrentStep(1)}
          >
            <Text style={styles.selectionRibbonEditText}>Change</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Main Interactive Form Card */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
        >
          {/* ==================== STEP 1: DEVICE (Category + Brand + Model) ==================== */}
          {currentStep === 1 && (
            <View style={styles.stepCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeading}>1. Choose Device Category</Text>
                <Text style={styles.sectionSub}>
                  Select what you want to sell. Real-time pricing applies.
                </Text>
              </View>

              {/* Category Grid */}
              <View style={styles.categoryGrid}>
                {CATEGORIES.map((cat) => {
                  const isSel = selectedCat.id === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[styles.categoryCard, isSel && styles.categoryCardActive]}
                      onPress={() => setSelectedCat(cat)}
                      activeOpacity={0.82}
                    >
                      <View style={[styles.categoryIconCircle, isSel && styles.categoryIconCircleActive]}>
                        <Ionicons
                          name={cat.icon}
                          size={22}
                          color={isSel ? '#000000' : '#475569'}
                        />
                      </View>
                      <Text style={[styles.categoryTitle, isSel && styles.categoryTitleActive]}>
                        {cat.name}
                      </Text>
                      <Text style={styles.categorySubtitle} numberOfLines={1}>
                        {cat.subtitle}
                      </Text>
                      <View style={[styles.categoryPriceTag, isSel && styles.categoryPriceTagActive]}>
                        <Text style={[styles.categoryPriceText, isSel && styles.categoryPriceTextActive]}>
                          Up to {cat.maxPrice}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Brand Selector */}
              <View style={[styles.sectionHeader, { marginTop: 14 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.sectionHeading}>2. Select Brand</Text>
                  {brandsLoading && <ActivityIndicator size="small" color={colors.primaryDark} />}
                </View>
                <Text style={styles.sectionSub}>Available brands for {selectedCat.name}</Text>
              </View>

              {/* Brand Search */}
              <View style={styles.searchBar}>
                <Ionicons name="search-outline" size={16} color="#94a3b8" />
                <TextInput
                  placeholder="Search brand (e.g. Apple, Samsung)..."
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

              {/* Brand Pills */}
              <View style={styles.brandPillsWrap}>
                {filteredBrands.map((b) => {
                  const isSel = selectedBrand.toLowerCase() === b.name.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={b.id || b.name}
                      style={[styles.brandPill, isSel && styles.brandPillActive]}
                      onPress={() => setSelectedBrand(b.name)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.brandPillText, isSel && styles.brandPillTextActive]}>
                        {b.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Model Selector */}
              <View style={[styles.sectionHeader, { marginTop: 16 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.sectionHeading}>3. Select Model</Text>
                  {modelsLoading && <ActivityIndicator size="small" color={colors.primaryDark} />}
                </View>
                <Text style={styles.sectionSub}>Choose exact model variant</Text>
              </View>

              {/* Model Search */}
              {!customModelMode && (
                <View style={styles.searchBar}>
                  <Ionicons name="search-outline" size={16} color="#94a3b8" />
                  <TextInput
                    placeholder={`Search ${selectedBrand} models...`}
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
              )}

              {/* Models List */}
              {!customModelMode ? (
                <View style={styles.modelListWrap}>
                  {filteredModels.slice(0, 10).map((m) => {
                    const isSel = selectedModel.toLowerCase() === m.name.toLowerCase();
                    return (
                      <TouchableOpacity
                        key={m.id || m.name}
                        style={[styles.modelRow, isSel && styles.modelRowActive]}
                        onPress={() => setSelectedModel(m.name)}
                        activeOpacity={0.8}
                      >
                        <View style={[styles.radioCircle, isSel && styles.radioCircleActive]}>
                          {isSel && <View style={styles.radioDot} />}
                        </View>
                        <Text style={[styles.modelRowName, isSel && styles.modelRowNameActive]}>
                          {m.name}
                        </Text>
                        {isSel && (
                          <View style={styles.selectedBadge}>
                            <Text style={styles.selectedBadgeText}>Selected</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}

              {/* Custom Model Toggle */}
              <TouchableOpacity
                style={[styles.customToggleBox, customModelMode && styles.customToggleBoxActive]}
                onPress={() => setCustomModelMode(!customModelMode)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={customModelMode ? 'checkbox' : 'add-circle-outline'}
                  size={18}
                  color={customModelMode ? colors.primaryDark : '#64748b'}
                />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.customToggleTitle}>My model is not listed</Text>
                  <Text style={styles.customToggleDesc}>Type in the exact model name manually</Text>
                </View>
              </TouchableOpacity>

              {customModelMode && (
                <View style={{ marginTop: 8 }}>
                  <TextInput
                    placeholder="Enter device model (e.g. Sony WH-1000XM4)"
                    placeholderTextColor="#94a3b8"
                    value={customModelName}
                    onChangeText={setCustomModelName}
                    style={styles.textInput}
                  />
                </View>
              )}

              {/* Action Button */}
              <TouchableOpacity
                style={[
                  styles.primaryCta,
                  (!selectedModel && (!customModelMode || !customModelName.trim())) && styles.btnDisabled,
                ]}
                onPress={() => {
                  if (customModelMode && !customModelName.trim()) {
                    toast.warning('Please enter your model name.', 'Model Required');
                    return;
                  }
                  setCurrentStep(2);
                }}
                disabled={!selectedModel && (!customModelMode || !customModelName.trim())}
                activeOpacity={0.88}
              >
                <Text style={styles.primaryCtaText}>Next: Condition & Specs</Text>
                <Ionicons name="arrow-forward" size={18} color="#000" />
              </TouchableOpacity>
            </View>
          )}

          {/* ==================== STEP 2: CONDITION & SPECS ==================== */}
          {currentStep === 2 && (
            <View style={styles.stepCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeading}>Storage & Condition</Text>
                <Text style={styles.sectionSub}>
                  Accurate details ensure exact price matching upon doorstep handover.
                </Text>
              </View>

              {/* Storage */}
              <Text style={styles.fieldLabel}>Storage Variant</Text>
              <View style={styles.storageGrid}>
                {storageOptions.map((st) => {
                  const isSel = selectedStorage === st;
                  return (
                    <TouchableOpacity
                      key={st}
                      style={[styles.storageChip, isSel && styles.storageChipActive]}
                      onPress={() => setSelectedStorage(st)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.storageChipText, isSel && styles.storageChipTextActive]}>
                        {st}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Screen Condition */}
              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Screen Condition</Text>
              <View style={styles.conditionCardsRow}>
                {[
                  { id: 'flawless', label: 'Flawless', desc: 'No scratches or spots', icon: 'sparkles-outline' },
                  { id: 'good', label: 'Good', desc: 'Minor hairline scuffs', icon: 'checkmark-outline' },
                  { id: 'cracked', label: 'Cracked', desc: 'Broken / lines on display', icon: 'warning-outline' },
                ].map((item) => {
                  const isSel = screenCond === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.condCard, isSel && styles.condCardActive]}
                      onPress={() => setScreenCond(item.id as any)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={item.icon as any}
                        size={16}
                        color={isSel ? colors.primaryDark : '#64748b'}
                      />
                      <Text style={[styles.condCardTitle, isSel && styles.condCardTitleActive]}>
                        {item.label}
                      </Text>
                      <Text style={styles.condCardDesc}>{item.desc}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Body Condition */}
              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Body & Frame Condition</Text>
              <View style={styles.conditionCardsRow}>
                {[
                  { id: 'likenew', label: 'Like New', desc: 'Flawless pristine body', icon: 'shield-outline' },
                  { id: 'fair', label: 'Fair', desc: 'Light edge scratches', icon: 'ellipsis-horizontal-outline' },
                  { id: 'dented', label: 'Heavy Wear', desc: 'Noticeable dents / chips', icon: 'alert-circle-outline' },
                ].map((item) => {
                  const isSel = bodyCond === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.condCard, isSel && styles.condCardActive]}
                      onPress={() => setBodyCond(item.id as any)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={item.icon as any}
                        size={16}
                        color={isSel ? colors.primaryDark : '#64748b'}
                      />
                      <Text style={[styles.condCardTitle, isSel && styles.condCardTitleActive]}>
                        {item.label}
                      </Text>
                      <Text style={styles.condCardDesc}>{item.desc}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Functional Health Checklist */}
              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Hardware Health Checks</Text>
              <View style={styles.checklistContainer}>
                {[
                  {
                    title: 'Power & Charging Port',
                    desc: 'Device boots up & charges reliably',
                    val: switchesOn,
                    toggle: () => setSwitchesOn(!switchesOn),
                  },
                  {
                    title: 'Touch & Display Responsive',
                    desc: 'No ghost touches, smooth response',
                    val: touchWorking,
                    toggle: () => setTouchWorking(!touchWorking),
                  },
                  {
                    title: 'Camera Clarity (Front & Back)',
                    desc: 'Sharp autofocus with clear glass',
                    val: cameraClear,
                    toggle: () => setCameraClear(!cameraClear),
                  },
                  {
                    title: 'Battery Health',
                    desc: 'Normal battery life without instant drain',
                    val: batteryHealthy,
                    toggle: () => setBatteryHealthy(!batteryHealthy),
                  },
                ].map((check, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.checklistItem, i > 0 && styles.checklistItemDivider]}
                    onPress={check.toggle}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name={check.val ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={check.val ? '#10b981' : '#cbd5e1'}
                    />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.checklistTitle}>{check.title}</Text>
                      <Text style={styles.checklistSub}>{check.desc}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Original Accessories Bonus */}
              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Original Accessories (Bonus Cash)</Text>
              <View style={styles.accessoriesWrap}>
                <TouchableOpacity
                  style={[styles.accItem, hasBox && styles.accItemActive]}
                  onPress={() => setHasBox(!hasBox)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="cube-outline" size={16} color={hasBox ? '#10b981' : '#64748b'} />
                  <Text style={[styles.accText, hasBox && styles.accTextActive]}>Original Box</Text>
                  <Text style={styles.accBadge}>+₹800</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.accItem, hasCharger && styles.accItemActive]}
                  onPress={() => setHasCharger(!hasCharger)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="flash-outline" size={16} color={hasCharger ? '#10b981' : '#64748b'} />
                  <Text style={[styles.accText, hasCharger && styles.accTextActive]}>Charger & Cable</Text>
                  <Text style={styles.accBadge}>+₹1,000</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.accItem, hasBill && styles.accItemActive]}
                  onPress={() => setHasBill(!hasBill)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="receipt-outline" size={16} color={hasBill ? '#10b981' : '#64748b'} />
                  <Text style={[styles.accText, hasBill && styles.accTextActive]}>Purchase Bill</Text>
                  <Text style={styles.accBadge}>+₹500</Text>
                </TouchableOpacity>
              </View>

              {/* Action Buttons */}
              <View style={styles.twoBtnRow}>
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={() => setCurrentStep(1)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="arrow-back" size={16} color={colors.text} />
                  <Text style={styles.secondaryBtnText}>Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.primaryCta, { flex: 1 }]}
                  onPress={() => setCurrentStep(3)}
                  activeOpacity={0.88}
                >
                  <Text style={styles.primaryCtaText}>Next: Live Valuation</Text>
                  <Ionicons name="arrow-forward" size={18} color="#000" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ==================== STEP 3: VALUATION & PHOTOS ==================== */}
          {currentStep === 3 && (
            <View style={styles.stepCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeading}>Instant Valuation</Text>
                <Text style={styles.sectionSub}>
                  Calculated based on active secondary market rates for your device.
                </Text>
              </View>

              {/* Hero RenewX Gold & Midnight Card */}
              <View style={styles.heroValuationBox}>
                <View style={styles.heroValuationTop}>
                  <Text style={styles.heroValuationTag}>LIVE ESTIMATED OFFER</Text>
                  <View style={styles.lockBadge}>
                    <Ionicons name="shield-checkmark" size={12} color="#10b981" />
                    <Text style={styles.lockBadgeText}>7-Day Price Lock</Text>
                  </View>
                </View>

                <View style={styles.amountShowcase}>
                  <Text style={styles.currencyShowcase}>₹</Text>
                  {quoteLoading ? (
                    <ActivityIndicator size="large" color={colors.primary} />
                  ) : (
                    <Text style={styles.amountShowcaseNum}>
                      {quoteAmount.toLocaleString('en-IN')}
                    </Text>
                  )}
                </View>

                <Text style={styles.heroDeviceSubtitle}>
                  {selectedBrand} {customModelMode ? customModelName : selectedModel} • {selectedStorage}
                </Text>

                {/* Breakdown */}
                <View style={styles.breakdownBox}>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownKey}>Base Market Value</Text>
                    <Text style={styles.breakdownVal}>₹{(quoteAmount + 3000).toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownKey}>Screen ({screenCond})</Text>
                    <Text style={[styles.breakdownVal, screenCond !== 'flawless' && { color: '#ef4444' }]}>
                      {screenCond === 'flawless' ? 'Included' : screenCond === 'good' ? '-₹4,000' : '-₹11,000'}
                    </Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownKey}>Body ({bodyCond})</Text>
                    <Text style={[styles.breakdownVal, bodyCond !== 'likenew' && { color: '#ef4444' }]}>
                      {bodyCond === 'likenew' ? 'Included' : bodyCond === 'fair' ? '-₹2,500' : '-₹6,000'}
                    </Text>
                  </View>
                  <View style={[styles.breakdownRow, { borderBottomWidth: 0 }]}>
                    <Text style={styles.breakdownKey}>Accessories Bonus</Text>
                    <Text style={[styles.breakdownVal, { color: '#10b981' }]}>
                      +₹{(hasBox ? 800 : 0) + (hasCharger ? 1000 : 0) + (hasBill ? 500 : 0)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Expected Price Input & Adjusters */}
              <View style={{ marginTop: 14 }}>
                <Text style={styles.fieldLabel}>Your Expected Selling Price (₹)</Text>
                <View style={styles.expectedInputRow}>
                  <Text style={styles.expectedCurrency}>₹</Text>
                  <TextInput
                    placeholder="Expected price"
                    placeholderTextColor="#94a3b8"
                    value={expectedPrice}
                    onChangeText={setExpectedPrice}
                    keyboardType="numeric"
                    style={styles.expectedInput}
                  />
                </View>

                <View style={styles.quickAdjustRow}>
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

              {/* Photos Section (Optional with Doorstep Skip) */}
              <View style={{ marginTop: 18 }}>
                <Text style={styles.fieldLabel}>Device Photography (Optional)</Text>
                <Text style={styles.sectionSub}>Upload photos or choose physical doorstep inspection.</Text>

                <View style={styles.photoGrid}>
                  {[
                    { slot: 'front' as const, title: 'Front Screen' },
                    { slot: 'back' as const, title: 'Back Panel' },
                    { slot: 'edges' as const, title: 'Frame / Edges' },
                    { slot: 'billBox' as const, title: 'Box / Bill' },
                  ].map((p) => {
                    const uri = photos[p.slot];
                    const isUploading = uploadingSlot === p.slot;

                    return (
                      <View key={p.slot} style={styles.photoBox}>
                        {uri ? (
                          <View style={styles.photoImgWrap}>
                            <Image source={{ uri }} style={styles.photoImg} />
                            <TouchableOpacity
                              style={styles.photoDeleteBtn}
                              onPress={() => removePhoto(p.slot)}
                            >
                              <Ionicons name="close" size={12} color="#fff" />
                            </TouchableOpacity>
                            <View style={styles.photoTitlePill}>
                              <Text style={styles.photoTitlePillText}>{p.title}</Text>
                            </View>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.photoEmpty}
                            onPress={() => handlePhotoUpload(p.slot)}
                            disabled={isUploading}
                            activeOpacity={0.75}
                          >
                            {isUploading ? (
                              <ActivityIndicator size="small" color={colors.primaryDark} />
                            ) : (
                              <>
                                <Ionicons name="camera-outline" size={20} color="#64748b" />
                                <Text style={styles.photoEmptyText}>{p.title}</Text>
                                <Text style={styles.photoUploadHint}>Tap to upload</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                </View>

                {/* Skip Photos Card */}
                <TouchableOpacity
                  style={[styles.skipPhotoCard, photoSkipped && styles.skipPhotoCardActive]}
                  onPress={() => setPhotoSkipped(!photoSkipped)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={photoSkipped ? 'checkbox' : 'shield-outline'}
                    size={20}
                    color={photoSkipped ? colors.primaryDark : '#64748b'}
                  />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.skipPhotoTitle}>Skip photos (In-Person Doorstep Diagnostics)</Text>
                    <Text style={styles.skipPhotoDesc}>
                      Our technician will physically verify device health during pickup.
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Action Buttons */}
              <View style={styles.twoBtnRow}>
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={() => setCurrentStep(2)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="arrow-back" size={16} color={colors.text} />
                  <Text style={styles.secondaryBtnText}>Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.primaryCta, { flex: 1 }]}
                  onPress={() => setCurrentStep(4)}
                  activeOpacity={0.88}
                >
                  <Text style={styles.primaryCtaText}>Next: Schedule Pickup</Text>
                  <Ionicons name="arrow-forward" size={18} color="#000" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ==================== STEP 4: PICKUP & PAYOUT ==================== */}
          {currentStep === 4 && (
            <View style={styles.stepCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeading}>Doorstep Pickup & Payout</Text>
                <Text style={styles.sectionSub}>
                  Enter your address, preferred slot, and instant payout destination.
                </Text>
              </View>

              {/* GPS Auto-Fill Button */}
              <TouchableOpacity
                style={styles.gpsButton}
                onPress={handleUseGps}
                disabled={locating}
                activeOpacity={0.85}
              >
                {locating ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Ionicons name="navigate-outline" size={16} color="#000" />
                )}
                <Text style={styles.gpsButtonText}>
                  {locating ? 'Detecting current address...' : 'Auto-fill Pickup Address with GPS'}
                </Text>
              </TouchableOpacity>

              {/* Address Form */}
              <View style={{ gap: 10, marginTop: 10 }}>
                <View>
                  <Text style={styles.fieldLabel}>Contact Name</Text>
                  <TextInput
                    placeholder="Full name"
                    placeholderTextColor="#94a3b8"
                    value={userName}
                    onChangeText={setUserName}
                    style={styles.textInput}
                  />
                </View>

                <View>
                  <Text style={styles.fieldLabel}>Phone Number (10 Digits)</Text>
                  <TextInput
                    placeholder="10-digit mobile number"
                    placeholderTextColor="#94a3b8"
                    value={userPhone}
                    onChangeText={setUserPhone}
                    keyboardType="phone-pad"
                    maxLength={10}
                    style={styles.textInput}
                  />
                </View>

                <View>
                  <Text style={styles.fieldLabel}>Pickup Address</Text>
                  <TextInput
                    placeholder="House/flat no., street, landmark, area"
                    placeholderTextColor="#94a3b8"
                    value={userAddress}
                    onChangeText={setUserAddress}
                    multiline
                    numberOfLines={2}
                    style={[styles.textInput, { height: 68, textAlignVertical: 'top' }]}
                  />
                </View>

                <View>
                  <Text style={styles.fieldLabel}>PIN Code</Text>
                  <TextInput
                    placeholder="6-digit postal code"
                    placeholderTextColor="#94a3b8"
                    value={userPincode}
                    onChangeText={setUserPincode}
                    keyboardType="numeric"
                    maxLength={6}
                    style={styles.textInput}
                  />
                </View>
              </View>

              {/* Pickup Schedule */}
              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Select Pickup Date</Text>
              <View style={styles.scheduleRow}>
                {(['Today', 'Tomorrow', 'Day After'] as const).map((d) => {
                  const isSel = pickupDate === d;
                  return (
                    <TouchableOpacity
                      key={d}
                      style={[styles.schedulePill, isSel && styles.schedulePillActive]}
                      onPress={() => setPickupDate(d)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.schedulePillText, isSel && styles.schedulePillTextActive]}>
                        {formattedDates[d]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Preferred Time Slot</Text>
              <View style={styles.scheduleRow}>
                {[
                  { id: 'Morning' as const, label: '10 AM - 1 PM' },
                  { id: 'Afternoon' as const, label: '2 PM - 5 PM' },
                  { id: 'Evening' as const, label: '5 PM - 8 PM' },
                ].map((slot) => {
                  const isSel = timeSlot === slot.id;
                  return (
                    <TouchableOpacity
                      key={slot.id}
                      style={[styles.schedulePill, isSel && styles.schedulePillActive]}
                      onPress={() => setTimeSlot(slot.id)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.schedulePillText, isSel && styles.schedulePillTextActive]}>
                        {slot.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Payout Method */}
              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>How would you like to receive payment?</Text>
              <View style={styles.payoutGrid}>
                {[
                  { id: 'upi' as const, label: 'Instant UPI', sub: 'GPay / PhonePe / Paytm', icon: 'flash-outline' },
                  { id: 'bank' as const, label: 'Bank Transfer', sub: 'NEFT / IMPS direct', icon: 'card-outline' },
                  { id: 'cash' as const, label: 'Cash on Handover', sub: 'Physical currency', icon: 'cash-outline' },
                ].map((pm) => {
                  const isSel = payoutMethod === pm.id;
                  return (
                    <TouchableOpacity
                      key={pm.id}
                      style={[styles.payoutCard, isSel && styles.payoutCardActive]}
                      onPress={() => setPayoutMethod(pm.id)}
                      activeOpacity={0.82}
                    >
                      <Ionicons
                        name={pm.icon as any}
                        size={18}
                        color={isSel ? colors.primaryDark : '#64748b'}
                      />
                      <Text style={[styles.payoutCardTitle, isSel && styles.payoutCardTitleActive]}>
                        {pm.label}
                      </Text>
                      <Text style={styles.payoutCardSub}>{pm.sub}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Dynamic Payout Inputs */}
              {payoutMethod === 'upi' && (
                <View style={{ marginTop: 10 }}>
                  <Text style={styles.fieldLabel}>Your UPI ID</Text>
                  <TextInput
                    placeholder="e.g. 9876543210@okaxis or user@upi"
                    placeholderTextColor="#94a3b8"
                    value={upiId}
                    onChangeText={setUpiId}
                    autoCapitalize="none"
                    style={styles.textInput}
                  />
                </View>
              )}

              {payoutMethod === 'bank' && (
                <View style={{ gap: 8, marginTop: 10 }}>
                  <View>
                    <Text style={styles.fieldLabel}>Account Number</Text>
                    <TextInput
                      placeholder="Bank account number"
                      placeholderTextColor="#94a3b8"
                      value={bankAccount}
                      onChangeText={setBankAccount}
                      keyboardType="numeric"
                      style={styles.textInput}
                    />
                  </View>
                  <View>
                    <Text style={styles.fieldLabel}>IFSC Code</Text>
                    <TextInput
                      placeholder="e.g. HDFC0000123"
                      placeholderTextColor="#94a3b8"
                      value={bankIfsc}
                      onChangeText={setBankIfsc}
                      autoCapitalize="characters"
                      style={styles.textInput}
                    />
                  </View>
                </View>
              )}

              {/* Final Review Summary Pill */}
              <View style={styles.reviewSummaryBox}>
                <View style={styles.reviewSummaryRow}>
                  <Text style={styles.reviewSummaryKey}>Device</Text>
                  <Text style={styles.reviewSummaryVal}>
                    {selectedBrand} {customModelMode ? customModelName : selectedModel} ({selectedStorage})
                  </Text>
                </View>
                <View style={styles.reviewSummaryRow}>
                  <Text style={styles.reviewSummaryKey}>Final Payout</Text>
                  <Text style={[styles.reviewSummaryVal, { color: colors.primaryDark, fontWeight: '800' }]}>
                    ₹{Number(expectedPrice || quoteAmount).toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={[styles.reviewSummaryRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.reviewSummaryKey}>Pickup Time</Text>
                  <Text style={styles.reviewSummaryVal}>{formattedDates[pickupDate]} ({timeSlot})</Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.twoBtnRow}>
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={() => setCurrentStep(3)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="arrow-back" size={16} color={colors.text} />
                  <Text style={styles.secondaryBtnText}>Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.primaryCta, { flex: 1 }, isSubmitting && styles.btnDisabled]}
                  onPress={handleConfirmPickup}
                  disabled={isSubmitting}
                  activeOpacity={0.88}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color="#000" />
                      <Text style={styles.primaryCtaText}>Confirm & Schedule Pickup</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background, // Warm #f8f7f2
  },

  // Header
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  goldBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  goldBadgeText: {
    fontSize: 9,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  headerRequestsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerRequestsText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },

  // 4-Step Stepper
  stepperContainer: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepItem: {
    alignItems: 'center',
    gap: 4,
    minWidth: 50,
  },
  stepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#f1f5f9',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#0a0a0a',
    borderColor: colors.primary,
    borderWidth: 2,
  },
  stepCircleCompleted: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepTitle: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: fontWeight.medium,
  },
  stepTitleActive: {
    color: colors.text,
    fontWeight: fontWeight.bold,
  },
  stepTitleCompleted: {
    color: colors.text,
    fontWeight: fontWeight.semibold,
  },
  stepConnector: {
    flex: 1,
    height: 2,
    backgroundColor: '#e2e8f0',
    marginBottom: 16,
    marginHorizontal: 4,
  },
  stepConnectorCompleted: {
    backgroundColor: colors.primary,
  },

  // Selected Ribbon
  selectionRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffdf0',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#fef08a',
    gap: 8,
  },
  selectionRibbonIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fef9c3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionRibbonDevice: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  selectionRibbonCategory: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  selectionRibbonEdit: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#ffffff',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#fef08a',
  },
  selectionRibbonEditText: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },

  // Main Scroll & Step Card
  scrollContent: {
    padding: spacing.md,
  },
  stepCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionHeading: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  sectionSub: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },

  // Step 1: Category Grid
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  categoryCard: {
    width: '48.5%',
    backgroundColor: '#fafaf9',
    borderRadius: radius.md,
    padding: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  categoryCardActive: {
    borderColor: colors.primary,
    backgroundColor: '#fffdf0',
  },
  categoryIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryIconCircleActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  categoryTitleActive: {
    color: '#000000',
  },
  categorySubtitle: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: 6,
  },
  categoryPriceTag: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  categoryPriceTagActive: {
    backgroundColor: '#fef08a',
  },
  categoryPriceText: {
    fontSize: 10,
    fontWeight: fontWeight.semibold,
    color: '#475569',
  },
  categoryPriceTextActive: {
    color: '#854d0e',
  },

  // Search Bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    height: 38,
    marginBottom: 8,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.text,
    paddingVertical: 0,
  },

  // Brand Pills
  brandPillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  brandPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: colors.border,
  },
  brandPillActive: {
    backgroundColor: '#0a0a0a',
    borderColor: '#0a0a0a',
  },
  brandPillText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  brandPillTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },

  // Models List
  modelListWrap: {
    gap: 6,
    marginBottom: 10,
  },
  modelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fafaf9',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  modelRowActive: {
    backgroundColor: '#fffdf0',
    borderColor: colors.primary,
  },
  modelRowName: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  modelRowNameActive: {
    fontWeight: fontWeight.bold,
    color: '#000',
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#94a3b8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: colors.primaryDark,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primaryDark,
  },
  selectedBadge: {
    backgroundColor: '#fef08a',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  selectedBadgeText: {
    fontSize: 9,
    fontWeight: fontWeight.bold,
    color: '#854d0e',
  },

  // Custom Model Toggle
  customToggleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    marginTop: 4,
  },
  customToggleBoxActive: {
    backgroundColor: '#fffdf0',
    borderColor: colors.primary,
  },
  customToggleTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  customToggleDesc: {
    fontSize: 10,
    color: colors.textMuted,
  },

  // Step 2: Specs & Condition
  fieldLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: 6,
  },
  storageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  storageChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: colors.border,
  },
  storageChipActive: {
    backgroundColor: '#0a0a0a',
    borderColor: '#0a0a0a',
  },
  storageChipText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  storageChipTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },
  conditionCardsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  condCard: {
    flex: 1,
    backgroundColor: '#fafaf9',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 10,
    alignItems: 'center',
  },
  condCardActive: {
    borderColor: colors.primary,
    backgroundColor: '#fffdf0',
  },
  condCardTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: 4,
  },
  condCardTitleActive: {
    color: '#000000',
  },
  condCardDesc: {
    fontSize: 9,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },

  // Checklist
  checklistContainer: {
    backgroundColor: '#fafaf9',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  checklistItemDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  checklistTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  checklistSub: {
    fontSize: 10,
    color: colors.textMuted,
  },

  // Accessories
  accessoriesWrap: {
    flexDirection: 'row',
    gap: 8,
  },
  accItem: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#fafaf9',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 8,
    gap: 3,
  },
  accItemActive: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  accText: {
    fontSize: 10,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  accTextActive: {
    color: '#047857',
  },
  accBadge: {
    fontSize: 9,
    fontWeight: fontWeight.bold,
    color: '#10b981',
  },

  // Step 3: Valuation Box
  heroValuationBox: {
    backgroundColor: '#0f172a',
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginTop: 4,
  },
  heroValuationTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroValuationTag: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  lockBadgeText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: '#10b981',
  },
  amountShowcase: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 8,
  },
  currencyShowcase: {
    fontSize: 22,
    fontWeight: fontWeight.black,
    color: colors.primary,
  },
  amountShowcaseNum: {
    fontSize: 34,
    fontWeight: fontWeight.black,
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  heroDeviceSubtitle: {
    fontSize: fontSize.xs,
    color: '#94a3b8',
    marginTop: 2,
    marginBottom: 12,
  },
  breakdownBox: {
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 8,
    gap: 5,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  breakdownKey: {
    fontSize: 11,
    color: '#94a3b8',
  },
  breakdownVal: {
    fontSize: 11,
    fontWeight: fontWeight.semibold,
    color: '#f8fafc',
  },

  // Expected price
  expectedInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    height: 44,
  },
  expectedCurrency: {
    fontSize: 18,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginRight: 6,
  },
  expectedInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  quickAdjustRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  adjustPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: colors.border,
  },
  adjustPillText: {
    fontSize: 11,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },

  // Photos
  photoGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
    marginBottom: 10,
  },
  photoBox: {
    flex: 1,
    aspectRatio: 1,
  },
  photoEmpty: {
    flex: 1,
    backgroundColor: '#fafaf9',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  photoEmptyText: {
    fontSize: 9,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginTop: 3,
    textAlign: 'center',
  },
  photoUploadHint: {
    fontSize: 8,
    color: colors.textMuted,
  },
  photoImgWrap: {
    flex: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoDeleteBtn: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoTitlePill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingVertical: 2,
    alignItems: 'center',
  },
  photoTitlePillText: {
    fontSize: 8,
    fontWeight: fontWeight.bold,
    color: '#ffffff',
  },
  skipPhotoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fafaf9',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 10,
  },
  skipPhotoCardActive: {
    backgroundColor: '#fffdf0',
    borderColor: colors.primary,
  },
  skipPhotoTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  skipPhotoDesc: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },

  // Step 4: Pickup & Address
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    marginBottom: 4,
  },
  gpsButtonText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: '#000000',
  },
  textInput: {
    backgroundColor: '#fafaf9',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: fontSize.xs,
    color: colors.text,
  },
  scheduleRow: {
    flexDirection: 'row',
    gap: 6,
  },
  schedulePill: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: radius.md,
    backgroundColor: '#fafaf9',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  schedulePillActive: {
    backgroundColor: '#0a0a0a',
    borderColor: '#0a0a0a',
  },
  schedulePillText: {
    fontSize: 11,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  schedulePillTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },
  payoutGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  payoutCard: {
    flex: 1,
    backgroundColor: '#fafaf9',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 8,
    alignItems: 'center',
  },
  payoutCardActive: {
    borderColor: colors.primary,
    backgroundColor: '#fffdf0',
  },
  payoutCardTitle: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: 4,
    textAlign: 'center',
  },
  payoutCardTitleActive: {
    color: '#000000',
  },
  payoutCardSub: {
    fontSize: 9,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 1,
  },
  reviewSummaryBox: {
    backgroundColor: '#fafaf9',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 10,
    marginTop: 14,
    gap: 4,
  },
  reviewSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  reviewSummaryKey: {
    fontSize: 11,
    color: colors.textMuted,
  },
  reviewSummaryVal: {
    fontSize: 11,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    flex: 1,
    textAlign: 'right',
  },

  // CTA Buttons
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: radius.md,
    marginTop: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryCtaText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.black,
    color: '#000000',
    letterSpacing: 0.2,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  twoBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: radius.md,
  },
  secondaryBtnText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },

  // Confirmation View
  confirmedScroll: {
    padding: spacing.md,
  },
  celebrationCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  successIconOuter: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#d1fae5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  successIconInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.full,
    marginBottom: 8,
  },
  greenPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: '#15803d',
  },
  confirmedHeading: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.black,
    color: colors.text,
    textAlign: 'center',
  },
  confirmedSub: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 18,
  },
  refBox: {
    width: '100%',
    backgroundColor: '#fffdf0',
    borderWidth: 1,
    borderColor: '#fef08a',
    borderRadius: radius.md,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 16,
  },
  refLabel: {
    fontSize: 9,
    fontWeight: fontWeight.bold,
    color: '#854d0e',
    letterSpacing: 0.5,
  },
  refCode: {
    fontSize: 20,
    fontWeight: fontWeight.black,
    color: colors.text,
    letterSpacing: 1,
    marginTop: 2,
  },
  confirmedDetailsCard: {
    width: '100%',
    backgroundColor: '#fafaf9',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    gap: 8,
    marginBottom: 16,
  },
  confirmedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0ede6',
  },
  confirmedRowKey: {
    fontSize: 11,
    color: colors.textMuted,
  },
  confirmedRowVal: {
    fontSize: 11,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    flex: 1,
    textAlign: 'right',
  },
  prepNoticeBox: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 18,
    gap: 4,
  },
  prepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  prepHeading: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: '#1e293b',
  },
  prepBullet: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 16,
  },
  primaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    backgroundColor: colors.primary,
    paddingVertical: 13,
    borderRadius: radius.md,
    marginBottom: 10,
  },
  primaryActionButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.black,
    color: '#000000',
  },
  secondaryActionButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryActionButtonText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
  },
});
