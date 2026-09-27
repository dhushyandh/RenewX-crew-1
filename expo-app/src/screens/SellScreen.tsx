import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { api } from '@/services/api';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { useSafeHeaderTop } from '@/lib/useSafeHeaderTop';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme';

type Category = {
  id: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  subtitle: string;
};

type Brand = {
  id: string;
  name: string;
  logoUrl?: string;
};

type Model = {
  id: string;
  name: string;
  storage_options?: string[];
};

type PhotoSlot = 'front' | 'back' | 'edges' | 'billBox';

const CATEGORIES: Category[] = [
  { id: 'phones', name: 'Smartphones', icon: 'phone-portrait-outline', subtitle: 'iPhone, Galaxy, Pixel & more' },
  { id: 'macbooks', name: 'MacBooks', icon: 'laptop-outline', subtitle: 'MacBook Air & Pro' },
  { id: 'laptops', name: 'Laptops', icon: 'desktop-outline', subtitle: 'Dell, HP, Lenovo, ASUS' },
  { id: 'tablets', name: 'Tablets & iPads', icon: 'tablet-portrait-outline', subtitle: 'iPad, Galaxy Tab & more' },
  { id: 'wearables', name: 'Wearables', icon: 'watch-outline', subtitle: 'Watches & smart devices' },
  { id: 'gaming', name: 'Gaming', icon: 'game-controller-outline', subtitle: 'Consoles & handhelds' },
  { id: 'audio', name: 'Audio', icon: 'headset-outline', subtitle: 'Headphones & earbuds' },
  { id: 'cameras', name: 'Cameras', icon: 'camera-outline', subtitle: 'Sony, Canon, Nikon & more' },
];

const BRAND_LOGOS: Record<string, string> = {
  Apple: 'https://cdn.simpleicons.org/apple',
  Samsung: 'https://cdn.simpleicons.org/samsung',
  OnePlus: 'https://cdn.simpleicons.org/oneplus',
  Google: 'https://cdn.simpleicons.org/google',
  Xiaomi: 'https://cdn.simpleicons.org/xiaomi',
  Realme: 'https://cdn.simpleicons.org/realme',
  Vivo: 'https://cdn.simpleicons.org/vivo',
  Motorola: 'https://cdn.simpleicons.org/motorola',
  Dell: 'https://cdn.simpleicons.org/dell',
  HP: 'https://cdn.simpleicons.org/hp',
  Lenovo: 'https://cdn.simpleicons.org/lenovo',
  ASUS: 'https://cdn.simpleicons.org/asus',
  Acer: 'https://cdn.simpleicons.org/acer',
  MSI: 'https://cdn.simpleicons.org/msi',
  Sony: 'https://cdn.simpleicons.org/sony',
  Canon: 'https://cdn.simpleicons.org/canon',
  Nikon: 'https://cdn.simpleicons.org/nikon',
  Fujifilm: 'https://cdn.simpleicons.org/fujifilm',
  GoPro: 'https://cdn.simpleicons.org/gopro',
  Bose: 'https://cdn.simpleicons.org/bose',
  'Nothing': 'https://cdn.simpleicons.org/nothing',
  'Nintendo': 'https://cdn.simpleicons.org/nintendo',
  Xbox: 'https://cdn.simpleicons.org/xbox',
  PlayStation: 'https://cdn.simpleicons.org/playstation',
};

const STANDARD_STORAGES = ['64 GB', '128 GB', '256 GB', '512 GB', '1 TB'];
const DRAFT_KEY = '@renewx_sell_draft_v3';

const STEPS = [
  { id: 1, title: 'Category', icon: 'grid-outline' as const },
  { id: 2, title: 'Brand', icon: 'pricetag-outline' as const },
  { id: 3, title: 'Model', icon: 'phone-portrait-outline' as const },
  { id: 4, title: 'Specs', icon: 'options-outline' as const },
  { id: 5, title: 'Photos', icon: 'camera-outline' as const },
  { id: 6, title: 'Price', icon: 'cash-outline' as const },
  { id: 7, title: 'Pickup', icon: 'location-outline' as const },
  { id: 8, title: 'Review', icon: 'checkmark-circle-outline' as const },
];

const unwrapRows = (response: any): any[] => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.results)) return response.results;
  if (Array.isArray(response?.items)) return response.items;
  return [];
};

const getBrandLogo = (name: string) => BRAND_LOGOS[name] || `https://api.dicebear.com/9.x/initials/png?seed=${encodeURIComponent(name)}&backgroundColor=ffc400&textColor=111111`;

export default function SellScreen() {
  const safeTop = useSafeHeaderTop();
  const navigation = useNavigation<any>();
  const toast = useToast();
  const { user } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const stepTimerRef = useRef<any>(null);

  const [step, setStep] = useState(1);

  // Clear pending transition timer on unmount
  useEffect(() => {
    return () => {
      if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
    };
  }, []);

  const handleSelectCategory = (item: Category) => {
    setCategory(item);
    if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
    stepTimerRef.current = setTimeout(() => {
      setStep(2);
    }, 120);
  };

  const handleSelectBrand = (item: Brand) => {
    setBrand(item);
    setCustomBrand('');
    if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
    stepTimerRef.current = setTimeout(() => {
      setStep(3);
    }, 120);
  };

  // Scroll to top whenever moving between steps in the sell flow
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as any });
    }
  }, [step]);

  // Scroll to top whenever navigating or switching to Sell screen
  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' as any });
      }
    }, [])
  );
  const [category, setCategory] = useState<Category | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [brandSearch, setBrandSearch] = useState('');
  const [customBrand, setCustomBrand] = useState('');

  const [models, setModels] = useState<Model[]>([]);
  const [model, setModel] = useState<Model | null>(null);
  const [modelSearch, setModelSearch] = useState('');
  const [customModel, setCustomModel] = useState('');

  const [storage, setStorage] = useState('');
  const [ram, setRam] = useState('');
  const [color, setColor] = useState('');
  const [purchaseYear, setPurchaseYear] = useState('');
  const [screenCondition, setScreenCondition] = useState<'flawless' | 'good' | 'cracked'>('flawless');
  const [bodyCondition, setBodyCondition] = useState<'likenew' | 'fair' | 'dented'>('likenew');
  const [powerOn, setPowerOn] = useState(true);
  const [touchWorking, setTouchWorking] = useState(true);
  const [cameraWorking, setCameraWorking] = useState(true);
  const [batteryHealthy, setBatteryHealthy] = useState(true);
  const [hasBox, setHasBox] = useState(true);
  const [hasCharger, setHasCharger] = useState(true);
  const [hasBill, setHasBill] = useState(true);

  const [photos, setPhotos] = useState<Record<PhotoSlot, string>>({
    front: '',
    back: '',
    edges: '',
    billBox: '',
  });
  const [uploadingPhoto, setUploadingPhoto] = useState<PhotoSlot | null>(null);

  const [valuation, setValuation] = useState(0);
  const [valuationLoading, setValuationLoading] = useState(false);
  const [expectedPrice, setExpectedPrice] = useState('');

  const [name, setName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [locating, setLocating] = useState(false);
  const [pickupMethod, setPickupMethod] = useState<'doorstep' | 'store'>('doorstep');
  const [pickupDate, setPickupDate] = useState<'Today' | 'Tomorrow' | 'Day After'>('Today');
  const [timeSlot, setTimeSlot] = useState<'Morning' | 'Afternoon' | 'Evening'>('Morning');
  const [payoutMethod, setPayoutMethod] = useState<'upi' | 'bank' | 'cash'>('upi');
  const [upiId, setUpiId] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState('');

  const activeBrandName = brand?.name || customBrand.trim();
  const activeModelName = model?.name || customModel.trim();

  const filteredBrands = useMemo(() => {
    const q = brandSearch.trim().toLowerCase();
    return q ? brands.filter((b) => b.name.toLowerCase().includes(q)) : brands;
  }, [brands, brandSearch]);

  const filteredModels = useMemo(() => {
    const q = modelSearch.trim().toLowerCase();
    return q ? models.filter((m) => m.name.toLowerCase().includes(q)) : models;
  }, [models, modelSearch]);

  useEffect(() => {
    AsyncStorage.getItem(DRAFT_KEY).then((raw) => {
      if (!raw) return;
      try {
        const d = JSON.parse(raw);
        if (d.categoryId) setCategory(CATEGORIES.find((c) => c.id === d.categoryId) || null);
        if (d.brandName) setCustomBrand(d.brandName);
        if (d.modelName) setCustomModel(d.modelName);
        if (d.storage) setStorage(d.storage);
        if (d.ram) setRam(d.ram);
        if (d.color) setColor(d.color);
        if (d.purchaseYear) setPurchaseYear(d.purchaseYear);
        if (d.expectedPrice) setExpectedPrice(d.expectedPrice);
        if (d.name) setName(d.name);
        if (d.phone) setPhone(d.phone);
        if (d.address) setAddress(d.address);
        if (d.city) setCity(d.city);
        if (d.pincode) setPincode(d.pincode);
      } catch {}
    });
  }, []);

  useEffect(() => {
    if (!category) return;
    let active = true;
    setBrand(null);
    setBrands([]);
    api.brands.getAll({ category: category.name })
      .then((res: any) => {
        if (!active) return;
        const rows = unwrapRows(res);
        setBrands(rows.filter(Boolean).map((r: any) => {
          const name = String(r.name || r.brand_name || '').trim();
          return { id: String(r.id || r._id || name), name, logoUrl: getBrandLogo(name) };
        }).filter((b: Brand) => b.name));
      })
      .catch(() => {
        if (active) toast.error('Could not load brands. Please try again.');
      });
    return () => { active = false; };
  }, [category?.id]);

  useEffect(() => {
    if (!brand || !category) return;
    let active = true;
    setModel(null);
    setModels([]);
    api.models.getAll({ category: category.name, brand_id: brand.id })
      .then((res: any) => {
        if (!active) return;
        const rows = unwrapRows(res);
        const mapped = rows.map((r: any) => ({
          id: String(r.id || r._id || r.name || r.model_name),
          name: String(r.name || r.model_name || '').trim(),
          storage_options: Array.isArray(r.storage_options || r.storages)
            ? (r.storage_options || r.storages)
            : [],
        })).filter((m: Model) => m.name);
        setModels(mapped);
      })
      .catch(() => {
        if (active) toast.error('Could not load models. Please try again.');
      });
    return () => { active = false; };
  }, [brand?.id, category?.id]);

  useEffect(() => {
    if (!category || !activeBrandName || !activeModelName || !storage) return;
    const timer = setTimeout(() => getLiveValuation(), 350);
    return () => clearTimeout(timer);
  }, [
    category?.id, activeBrandName, activeModelName, storage, ram, color, purchaseYear,
    screenCondition, bodyCondition, powerOn, touchWorking, cameraWorking, batteryHealthy,
    hasBox, hasCharger, hasBill,
  ]);

  useEffect(() => {
    const draft = {
      categoryId: category?.id,
      brandName: activeBrandName,
      modelName: activeModelName,
      storage, ram, color, purchaseYear, expectedPrice,
      name, phone, address, city, pincode,
    };
    AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft)).catch(() => {});
  }, [
    category?.id, activeBrandName, activeModelName, storage, ram, color, purchaseYear,
    expectedPrice, name, phone, address, city, pincode,
  ]);

  const getLiveValuation = async () => {
    setValuationLoading(true);
    try {
      const res = await api.tradeIn.getQuote({
        category: category?.name,
        brand: activeBrandName,
        model: activeModelName,
        storage,
        ram,
        color,
        purchaseYear,
        screenCondition,
        bodyCondition,
        functionalChecks: { switchesOn: powerOn, touchWorking, cameraClear: cameraWorking, batteryHealthy },
        accessories: { hasBox, hasCharger, hasBill },
      });
      const amount = Number(res?.valuation || res?.data?.valuation || 0);
      setValuation(amount);
      if (amount > 0 && !expectedPrice) setExpectedPrice(String(amount));
    } catch {
      setValuation(0);
    } finally {
      setValuationLoading(false);
    }
  };

  const pickPhoto = async (slot: PhotoSlot) => {
    try {
      setUploadingPhoto(slot);
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission required', 'Allow photo access to upload device photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        base64: true,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      let uri = asset.uri;
      if (asset.base64) {
        try {
          const uploaded = await api.upload.base64(asset.base64, `sell-${slot}-${Date.now()}.jpg`, 'image/jpeg');
          uri = uploaded?.url || `data:image/jpeg;base64,${asset.base64}`;
        } catch {
          uri = `data:image/jpeg;base64,${asset.base64}`;
        }
      }
      setPhotos((p) => ({ ...p, [slot]: uri }));
    } catch (error: any) {
      toast.error(error?.message || 'Could not upload photo.');
    } finally {
      setUploadingPhoto(null);
    }
  };

  const useGps = async () => {
    try {
      setLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location permission', 'Enable location permission to auto-fill your pickup details.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const places = await Location.reverseGeocodeAsync(loc.coords);
      const place = places[0];
      if (!place) return;
      setAddress([place.name, place.street, place.subregion || place.district].filter(Boolean).join(', '));
      setCity(place.city || place.subregion || '');
      if (place.postalCode) setPincode(place.postalCode.replace(/\D/g, '').slice(0, 6));
      toast.success('Pickup address detected.');
    } catch {
      toast.error('Could not detect your address.');
    } finally {
      setLocating(false);
    }
  };

  const validateStep = () => {
    if (step === 1 && !category) return 'Select a device category.';
    if (step === 2 && !activeBrandName) return 'Select or enter a brand.';
    if (step === 3 && !activeModelName) return 'Select or enter a model.';
    if (step === 4 && !storage) return 'Select the storage variant.';
    if (step === 5 && Object.values(photos).every(Boolean) === false && false) return 'Upload device photos.';
    if (step === 6) {
      const price = Number(expectedPrice);
      if (!valuation) return 'Live valuation is unavailable. Please retry after checking your device details.';
      if (!Number.isFinite(price) || price <= 0) return 'Enter a valid expected selling price.';
    }
    if (step === 7) {
      if (!name.trim() || phone.replace(/\D/g, '').length !== 10 || !address.trim() || !city.trim() || pincode.replace(/\D/g, '').length !== 6) {
        return 'Enter valid contact and pickup details.';
      }
      if (payoutMethod === 'upi' && !upiId.trim()) return 'Enter your UPI ID.';
      if (payoutMethod === 'bank' && (!bankAccount.trim() || !bankIfsc.trim())) return 'Enter bank account and IFSC.';
    }
    return '';
  };

  const next = () => {
    const error = validateStep();
    if (error) {
      toast.warning(error);
      return;
    }
    if (step < 8) setStep(step + 1);
  };

  const submitSellRequest = async () => {
    const error = validateStep();
    if (error) {
      toast.warning(error);
      return;
    }

    try {
      setSubmitting(true);
      const photoList = Object.values(photos).filter(Boolean);
      const payload = {
        category: category?.name,
        brand: activeBrandName,
        model: activeModelName,
        storage,
        valuationAmount: valuation,
        expectedSellingPrice: Number(expectedPrice),
        customerName: name.trim(),
        customerPhone: phone.replace(/\D/g, '').slice(-10),
        customerEmail: user?.email || '',
        pincode: pincode.replace(/\D/g, '').slice(0, 6),
        city: city.trim(),
        address: address.trim(),
        photos: photoList,
        condition: {
          screen: screenCondition,
          body: bodyCondition,
          ram,
          color,
          purchaseYear,
          powerOn,
          touchWorking,
          cameraWorking,
          batteryHealthy,
          accessories: { hasBox, hasCharger, hasBill },
          photoCount: photoList.length,
          pickupMethod,
          pickupSchedule: { date: pickupDate, time: timeSlot },
          payout: { method: payoutMethod, upiId, bankAccount, bankIfsc },
        },
      };

      const res = await api.tradeIn.createPickup(payload);
      const id = res?.data?.id || res?.data?._id || res?.id;
      setSubmittedId(String(id || ''));
      await AsyncStorage.removeItem(DRAFT_KEY);
      toast.success('Your sell request has been submitted.');
    } catch (error: any) {
      toast.error(error?.message || 'Could not submit your sell request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedId) {
    return (
      <View style={[styles.container, { paddingTop: safeTop }]}>
        <ScrollView contentContainerStyle={styles.successPage}>
          <View style={styles.successIcon}><Ionicons name="checkmark" size={34} color="#000" /></View>
          <Text style={styles.successTitle}>Sell Request Submitted</Text>
          <Text style={styles.successText}>
            Your device has been added as a tracked sell lead. You can follow its progress from submission through review, inspection and payout.
          </Text>

          <View style={styles.referenceCard}>
            <Text style={styles.referenceLabel}>SELL REQUEST ID</Text>
            <Text style={styles.referenceValue}>{submittedId}</Text>
          </View>

          <View style={styles.lifecycleCard}>
            {['Submitted', 'Under review', 'Approved / Rejected', 'Pickup / Inspection', 'Payout / Completed'].map((item, index) => (
              <View key={item} style={styles.lifecycleRow}>
                <View style={[styles.lifecycleDot, index === 0 && styles.lifecycleDotActive]}>
                  {index === 0 && <Ionicons name="checkmark" size={12} color="#000" />}
                </View>
                <Text style={styles.lifecycleText}>{item}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('MySellRequests')}>
            <Text style={styles.primaryButtonText}>Track My Sell Request</Text>
            <Ionicons name="arrow-forward" size={18} color="#000" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkButton} onPress={() => {
            setSubmittedId('');
            setStep(1);
            setCategory(null);
            setBrand(null);
            setModel(null);
          }}>
            <Text style={styles.linkButtonText}>Sell Another Device</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  const progress = step / STEPS.length;

  return (
    <View style={[styles.container, { paddingTop: safeTop }]}>
      <View style={styles.header}>
        <View>
          <View style={styles.titleRow}>
            <Text style={styles.headerTitle}>Sell with RenewX</Text>
            <View style={styles.liveBadge}><View style={styles.liveDot} /><Text style={styles.liveText}>SELL</Text></View>
          </View>
          <Text style={styles.headerSubtitle}>Get a fair value. Schedule pickup. Track every step.</Text>
        </View>
        <TouchableOpacity style={styles.requestsButton} onPress={() => navigation.navigate('MySellRequests')}>
          <Ionicons name="receipt-outline" size={16} color="#111" />
          <Text style={styles.requestsText}>My Requests</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.progressArea}>
        <View style={styles.progressTop}>
          <Text style={styles.progressLabel}>STEP {step} OF {STEPS.length}</Text>
          <Text style={styles.progressPercent}>{Math.round(progress * 100)}%</Text>
        </View>
        <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress * 100}%` }]} /></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stepTabs}>
          {STEPS.map((s) => {
            const active = s.id === step;
            const done = s.id < step;
            return (
              <TouchableOpacity
                key={s.id}
                style={[styles.stepTab, active && styles.stepTabActive, done && styles.stepTabDone]}
                disabled={s.id > step}
                onPress={() => s.id < step && setStep(s.id)}
              >
                <View style={[styles.stepNumber, (active || done) && styles.stepNumberActive]}>
                  {done ? <Ionicons name="checkmark" size={12} color="#000" /> : <Text style={[styles.stepNumberText, active && styles.stepNumberTextActive]}>{s.id}</Text>}
                </View>
                <Text style={[styles.stepTabText, active && styles.stepTabTextActive]}>{s.title}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >

          {step === 1 && (
            <Card title="Choose what you want to sell" subtitle="Start with the device category.">
              <View style={styles.categoryGrid}>
                {CATEGORIES.map((item) => {
                  const active = category?.id === item.id;
                  return (
                    <TouchableOpacity key={item.id} style={[styles.categoryCard, active && styles.categoryCardActive]} onPress={() => handleSelectCategory(item)}>
                      <View style={[styles.categoryIcon, active && styles.categoryIconActive]}>
                        <Ionicons name={item.icon} size={24} color={active ? '#000' : '#555'} />
                      </View>
                      <Text style={[styles.categoryName, active && styles.categoryNameActive]}>{item.name}</Text>
                      <Text style={styles.categorySub}>{item.subtitle}</Text>
                      {active && <Ionicons name="checkmark-circle" size={18} color="#111" style={styles.categoryCheck} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Card>
          )}

          {step === 2 && (
            <Card title="Choose your brand" subtitle="Select a supported brand or enter it manually.">
              <Search value={brandSearch} onChangeText={setBrandSearch} placeholder="Search brand..." />
              <View style={styles.brandGrid}>
                {filteredBrands.map((item) => {
                  const active = brand?.id === item.id;
                  return (
                    <TouchableOpacity key={item.id} style={[styles.brandCard, active && styles.brandCardActive]} onPress={() => handleSelectBrand(item)}>
                      <Image source={{ uri: item.logoUrl || getBrandLogo(item.name) }} style={styles.brandLogo} />
                      <Text style={[styles.brandName, active && styles.brandNameActive]} numberOfLines={1}>{item.name}</Text>
                      {active && <View style={styles.brandCheck}><Ionicons name="checkmark" size={12} color="#000" /></View>}
                    </TouchableOpacity>
                  );
                })}
              </View>
              {filteredBrands.length === 0 && <EmptyState text="No brands found. You can enter the brand manually below." />}
              <Text style={styles.orLabel}>NOT LISTED?</Text>
              <TextInput
                value={customBrand}
                onChangeText={(v) => { setCustomBrand(v); if (v) setBrand(null); }}
                placeholder="Enter brand name"
                placeholderTextColor="#999"
                style={styles.input}
              />
            </Card>
          )}

          {step === 3 && (
            <Card title="Pick your model" subtitle={activeBrandName ? `Models available for ${activeBrandName}.` : 'Choose a brand first.'}>
              <Search value={modelSearch} onChangeText={setModelSearch} placeholder={`Search ${activeBrandName || 'device'} model...`} />
              <View style={styles.modelList}>
                {filteredModels.map((item) => {
                  const active = model?.id === item.id;
                  return (
                    <TouchableOpacity key={item.id} style={[styles.modelRow, active && styles.modelRowActive]} onPress={() => { setModel(item); setCustomModel(''); }}>
                      <View style={[styles.radio, active && styles.radioActive]}>{active && <View style={styles.radioDot} />}</View>
                      <View style={styles.flex}>
                        <Text style={[styles.modelName, active && styles.modelNameActive]}>{item.name}</Text>
                        {!!item.storage_options?.length && <Text style={styles.modelMeta}>{item.storage_options.join(' • ')}</Text>}
                      </View>
                      {active && <Ionicons name="checkmark-circle" size={20} color="#111" />}
                    </TouchableOpacity>
                  );
                })}
              </View>
              {filteredModels.length === 0 && <EmptyState text="No model found. Enter your exact model manually." />}
              <Text style={styles.orLabel}>MODEL NOT LISTED?</Text>
              <TextInput
                value={customModel}
                onChangeText={(v) => { setCustomModel(v); if (v) setModel(null); }}
                placeholder="e.g. iPhone 14 Pro Max 256GB"
                placeholderTextColor="#999"
                style={styles.input}
              />
            </Card>
          )}

          {step === 4 && (
            <Card title="Specs & condition" subtitle="Tell us about the exact device you are selling.">
              <FieldLabel text="Storage" />
              <ChipRow values={model?.storage_options?.length ? model.storage_options : STANDARD_STORAGES} value={storage} onChange={setStorage} />

              <FieldLabel text="RAM (optional)" />
              <TextInput value={ram} onChangeText={setRam} placeholder="e.g. 8 GB" placeholderTextColor="#999" style={styles.input} />

              <View style={styles.twoColumn}>
                <View style={styles.half}><FieldLabel text="Colour" /><TextInput value={color} onChangeText={setColor} placeholder="e.g. Black" placeholderTextColor="#999" style={styles.input} /></View>
                <View style={styles.half}><FieldLabel text="Purchase year" /><TextInput value={purchaseYear} onChangeText={setPurchaseYear} placeholder="e.g. 2024" keyboardType="numeric" maxLength={4} placeholderTextColor="#999" style={styles.input} /></View>
              </View>

              <FieldLabel text="Screen condition" />
              <ChoiceRow values={[['flawless', 'Flawless'], ['good', 'Good'], ['cracked', 'Cracked']]} value={screenCondition} onChange={(v) => setScreenCondition(v as any)} />

              <FieldLabel text="Body condition" />
              <ChoiceRow values={[['likenew', 'Like New'], ['fair', 'Fair'], ['dented', 'Heavy Wear']]} value={bodyCondition} onChange={(v) => setBodyCondition(v as any)} />

              <FieldLabel text="Device diagnostics" />
              {[
                ['Power-on works', powerOn, setPowerOn],
                ['Touch/display works', touchWorking, setTouchWorking],
                ['Camera works', cameraWorking, setCameraWorking],
                ['Battery is healthy', batteryHealthy, setBatteryHealthy],
              ].map(([label, value, setter]) => (
                <TouchableOpacity key={String(label)} style={styles.checkRow} onPress={() => (setter as any)(!(value as boolean))}>
                  <Ionicons name={value ? 'checkbox' : 'square-outline'} size={22} color={value ? '#111' : '#999'} />
                  <Text style={styles.checkText}>{String(label)}</Text>
                </TouchableOpacity>
              ))}

              <FieldLabel text="Accessories" />
              <ChoiceRow values={[['box', 'Original Box'], ['charger', 'Charger'], ['bill', 'Purchase Bill']]}
                value=""
                multi
                selected={{ box: hasBox, charger: hasCharger, bill: hasBill }}
                onMultiChange={(key) => {
                  if (key === 'box') setHasBox(!hasBox);
                  if (key === 'charger') setHasCharger(!hasCharger);
                  if (key === 'bill') setHasBill(!hasBill);
                }}
              />
            </Card>
          )}

          {step === 5 && (
            <Card title="Upload device photos" subtitle="Clear photos help our team verify the device.">
              <View style={styles.photoNotice}>
                <Ionicons name="information-circle-outline" size={18} color="#111" />
                <Text style={styles.photoNoticeText}>Front, back and edge photos are recommended. You can continue without photos if doorstep inspection is available.</Text>
              </View>
              <View style={styles.photoGrid}>
                {([
                  ['front', 'Front', 'phone-portrait-outline'],
                  ['back', 'Back', 'phone-portrait-outline'],
                  ['edges', 'Edges', 'scan-outline'],
                  ['billBox', 'Box / Bill', 'receipt-outline'],
                ] as const).map(([slot, label, icon]) => (
                  <TouchableOpacity key={slot} style={styles.photoCard} onPress={() => pickPhoto(slot)} disabled={uploadingPhoto === slot}>
                    {photos[slot] ? (
                      <Image source={{ uri: photos[slot] }} style={styles.photoImage} />
                    ) : uploadingPhoto === slot ? (
                      <ActivityIndicator color="#111" />
                    ) : (
                      <>
                        <View style={styles.photoIcon}><Ionicons name={icon as any} size={24} color="#555" /></View>
                        <Text style={styles.photoLabel}>{label}</Text>
                        <Text style={styles.photoHint}>Tap to upload</Text>
                      </>
                    )}
                    {!!photos[slot] && <View style={styles.photoDone}><Ionicons name="checkmark" size={12} color="#000" /></View>}
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.photoCount}>{Object.values(photos).filter(Boolean).length}/4 photos added</Text>
            </Card>
          )}

          {step === 6 && (
            <Card title="Set your expected selling price" subtitle="RenewX calculates a live estimated value. You choose the price you expect to receive.">
              <View style={styles.valuationCard}>
                <Text style={styles.valuationLabel}>RENEWX ESTIMATED VALUE</Text>
                {valuationLoading ? <ActivityIndicator color="#ffc400" size="large" /> : valuation > 0 ? (
                  <Text style={styles.valuationAmount}>₹{valuation.toLocaleString('en-IN')}</Text>
                ) : (
                  <Text style={styles.valuationUnavailable}>Unavailable</Text>
                )}
                <Text style={styles.valuationDevice}>{activeBrandName} {activeModelName}{storage ? ` • ${storage}` : ''}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={getLiveValuation} disabled={valuationLoading}>
                  <Ionicons name="refresh-outline" size={15} color="#ffc400" />
                  <Text style={styles.retryText}>Refresh valuation</Text>
                </TouchableOpacity>
              </View>

              <FieldLabel text="Your expected selling price" />
              <View style={styles.priceInput}>
                <Text style={styles.rupee}>₹</Text>
                <TextInput value={expectedPrice} onChangeText={setExpectedPrice} keyboardType="numeric" placeholder="Enter expected price" placeholderTextColor="#999" style={styles.priceTextInput} />
              </View>
              {valuation > 0 && (
                <View style={styles.priceQuickRow}>
                  {[valuation, valuation + 2000, valuation + 5000].map((p) => (
                    <TouchableOpacity key={p} style={styles.quickPrice} onPress={() => setExpectedPrice(String(p))}>
                      <Text style={styles.quickPriceText}>₹{p.toLocaleString('en-IN')}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </Card>
          )}

          {step === 7 && (
            <Card title="Pickup & contact details" subtitle="Choose how and where RenewX should collect your device.">
              <TouchableOpacity style={styles.gpsButton} onPress={useGps} disabled={locating}>
                {locating ? <ActivityIndicator color="#000" /> : <Ionicons name="navigate-outline" size={17} color="#000" />}
                <Text style={styles.gpsText}>{locating ? 'Detecting location...' : 'Use current location'}</Text>
              </TouchableOpacity>

              <FieldLabel text="Full name" /><TextInput value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor="#999" style={styles.input} />
              <FieldLabel text="Phone number" /><TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={10} placeholder="10-digit mobile number" placeholderTextColor="#999" style={styles.input} />
              <FieldLabel text="Pickup address" /><TextInput value={address} onChangeText={setAddress} multiline placeholder="House, street, landmark, area" placeholderTextColor="#999" style={[styles.input, styles.multiline]} />
              <View style={styles.twoColumn}>
                <View style={styles.half}><FieldLabel text="City" /><TextInput value={city} onChangeText={setCity} placeholder="City" placeholderTextColor="#999" style={styles.input} /></View>
                <View style={styles.half}><FieldLabel text="PIN code" /><TextInput value={pincode} onChangeText={setPincode} keyboardType="numeric" maxLength={6} placeholder="6 digits" placeholderTextColor="#999" style={styles.input} /></View>
              </View>

              <FieldLabel text="Pickup method" />
              <ChoiceRow values={[['doorstep', 'Doorstep pickup'], ['store', 'Drop at store']]} value={pickupMethod} onChange={(v) => setPickupMethod(v as any)} />

              <FieldLabel text="Preferred pickup date" />
              <ChoiceRow values={[['Today', 'Today'], ['Tomorrow', 'Tomorrow'], ['Day After', 'Day after']]} value={pickupDate} onChange={(v) => setPickupDate(v as any)} />

              <FieldLabel text="Preferred time" />
              <ChoiceRow values={[['Morning', '10 AM – 1 PM'], ['Afternoon', '2 PM – 5 PM'], ['Evening', '5 PM – 8 PM']]} value={timeSlot} onChange={(v) => setTimeSlot(v as any)} />

              <FieldLabel text="Preferred payout" />
              <ChoiceRow values={[['upi', 'UPI'], ['bank', 'Bank transfer'], ['cash', 'Cash']]} value={payoutMethod} onChange={(v) => setPayoutMethod(v as any)} />

              {payoutMethod === 'upi' && <><FieldLabel text="UPI ID" /><TextInput value={upiId} onChangeText={setUpiId} autoCapitalize="none" placeholder="name@upi" placeholderTextColor="#999" style={styles.input} /></>}
              {payoutMethod === 'bank' && <>
                <FieldLabel text="Bank account number" /><TextInput value={bankAccount} onChangeText={setBankAccount} keyboardType="numeric" placeholder="Account number" placeholderTextColor="#999" style={styles.input} />
                <FieldLabel text="IFSC code" /><TextInput value={bankIfsc} onChangeText={setBankIfsc} autoCapitalize="characters" placeholder="HDFC0001234" placeholderTextColor="#999" style={styles.input} />
              </>}
            </Card>
          )}

          {step === 8 && (
            <Card title="Review & submit" subtitle="Check your details before creating the sell lead.">
              <ReviewSection title="Device" icon="phone-portrait-outline">
                <ReviewRow label="Category" value={category?.name || '—'} />
                <ReviewRow label="Brand" value={activeBrandName || '—'} />
                <ReviewRow label="Model" value={activeModelName || '—'} />
              </ReviewSection>
              <ReviewSection title="Specs & condition" icon="options-outline">
                <ReviewRow label="Storage" value={storage || '—'} />
                <ReviewRow label="RAM / Colour" value={`${ram || '—'} / ${color || '—'}`} />
                <ReviewRow label="Screen" value={screenCondition} />
                <ReviewRow label="Body" value={bodyCondition} />
                <ReviewRow label="Photos" value={`${Object.values(photos).filter(Boolean).length} uploaded`} />
              </ReviewSection>
              <ReviewSection title="Price" icon="cash-outline">
                <ReviewRow label="RenewX estimate" value={valuation ? `₹${valuation.toLocaleString('en-IN')}` : 'Unavailable'} />
                <ReviewRow label="Expected price" value={expectedPrice ? `₹${Number(expectedPrice).toLocaleString('en-IN')}` : '—'} strong />
              </ReviewSection>
              <ReviewSection title="Pickup & payout" icon="location-outline">
                <ReviewRow label="Contact" value={`${name || '—'} • ${phone || '—'}`} />
                <ReviewRow label="Location" value={[address, city, pincode].filter(Boolean).join(', ') || '—'} />
                <ReviewRow label="Pickup" value={`${pickupMethod} • ${pickupDate} • ${timeSlot}`} />
                <ReviewRow label="Payout" value={payoutMethod.toUpperCase()} />
              </ReviewSection>

              <View style={styles.submitNotice}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#111" />
                <Text style={styles.submitNoticeText}>After submission, your lead can move through Submitted → Under review → Approved/Rejected → Pickup/Inspection → Payout/Completed.</Text>
              </View>
            </Card>
          )}

          <View style={styles.bottomActions}>
            {step > 1 && (
              <TouchableOpacity style={styles.backButton} onPress={() => setStep(step - 1)}>
                <Ionicons name="arrow-back" size={17} color="#111" />
                <Text style={styles.backText}>Back</Text>
              </TouchableOpacity>
            )}
            {step < 8 ? (
              <TouchableOpacity style={[styles.primaryButton, step === 1 && styles.fullButton]} onPress={next}>
                <Text style={styles.primaryButtonText}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color="#000" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.primaryButton, styles.submitButton, submitting && styles.disabled]} onPress={submitSellRequest} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#000" /> : <Ionicons name="checkmark-circle-outline" size={19} color="#000" />}
                <Text style={styles.primaryButtonText}>{submitting ? 'Submitting...' : 'Submit Sell Request'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardSubtitle}>{subtitle}</Text>
      <View style={styles.divider} />
      {children}
    </View>
  );
}

function Search({ value, onChangeText, placeholder }: { value: string; onChangeText: (v: string) => void; placeholder: string }) {
  return (
    <View style={styles.search}>
      <Ionicons name="search-outline" size={17} color="#888" />
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#999" style={styles.searchInput} />
      {!!value && <TouchableOpacity onPress={() => onChangeText('')}><Ionicons name="close-circle" size={16} color="#999" /></TouchableOpacity>}
    </View>
  );
}

function FieldLabel({ text }: { text: string }) {
  return <Text style={styles.fieldLabel}>{text}</Text>;
}

function ChipRow({ values, value, onChange }: { values: string[]; value: string; onChange: (v: string) => void }) {
  return <View style={styles.chipWrap}>{values.map((v) => <TouchableOpacity key={v} style={[styles.chip, value === v && styles.chipActive]} onPress={() => onChange(v)}><Text style={[styles.chipText, value === v && styles.chipTextActive]}>{v}</Text></TouchableOpacity>)}</View>;
}

function ChoiceRow({ values, value, onChange, multi, selected, onMultiChange }: {
  values: [string, string][];
  value: string;
  onChange?: (v: string) => void;
  multi?: boolean;
  selected?: Record<string, boolean>;
  onMultiChange?: (v: string) => void;
}) {
  return (
    <View style={styles.choiceWrap}>
      {values.map(([id, label]) => {
        const active = multi ? !!selected?.[id] : value === id;
        return (
          <TouchableOpacity key={id} style={[styles.choice, active && styles.choiceActive]} onPress={() => multi ? onMultiChange?.(id) : onChange?.(id)}>
            <Ionicons name={active ? 'checkmark-circle' : 'ellipse-outline'} size={17} color={active ? '#111' : '#aaa'} />
            <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function EmptyState({ text }: { text: string }) {
  return <View style={styles.empty}><Ionicons name="search-outline" size={20} color="#888" /><Text style={styles.emptyText}>{text}</Text></View>;
}

function ReviewSection({ title, icon, children }: { title: string; icon: keyof typeof Ionicons.glyphMap; children: React.ReactNode }) {
  return (
    <View style={styles.reviewSection}>
      <View style={styles.reviewTitleRow}><Ionicons name={icon} size={17} color="#111" /><Text style={styles.reviewTitle}>{title}</Text></View>
      {children}
    </View>
  );
}

function ReviewRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <View style={styles.reviewRow}><Text style={styles.reviewLabel}>{label}</Text><Text style={[styles.reviewValue, strong && styles.reviewValueStrong]}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f7f2' },
  flex: { flex: 1 },
  header: { backgroundColor: '#fff', paddingHorizontal: spacing.md, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#e8e6df', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  headerTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.black, color: '#111' },
  headerSubtitle: { fontSize: fontSize.xs, color: '#777', marginTop: 3 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ffc400', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5 },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#111' },
  liveText: { fontSize: 8, fontWeight: fontWeight.black, color: '#111' },
  requestsButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 7, borderWidth: 1, borderColor: '#ddd', borderRadius: radius.full, backgroundColor: '#fff' },
  requestsText: { fontSize: 10, fontWeight: fontWeight.bold, color: '#111' },
  progressArea: { backgroundColor: '#fff', paddingHorizontal: spacing.md, paddingTop: 10, borderBottomWidth: 1, borderBottomColor: '#e8e6df' },
  progressTop: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontSize: 9, fontWeight: fontWeight.black, color: '#777', letterSpacing: .5 },
  progressPercent: { fontSize: 9, fontWeight: fontWeight.bold, color: '#111' },
  progressTrack: { height: 4, backgroundColor: '#eee', borderRadius: 3, marginTop: 6 },
  progressFill: { height: 4, backgroundColor: '#ffc400', borderRadius: 3 },
  stepTabs: { gap: 5, paddingVertical: 9 },
  stepTab: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 7, paddingVertical: 5, borderRadius: radius.full, backgroundColor: '#f7f7f5' },
  stepTabActive: { backgroundColor: '#111' },
  stepTabDone: { backgroundColor: '#fff4c2' },
  stepNumber: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e5e5e1' },
  stepNumberActive: { backgroundColor: '#ffc400' },
  stepNumberText: { fontSize: 9, fontWeight: fontWeight.bold, color: '#666' },
  stepNumberTextActive: { color: '#000' },
  stepTabText: { fontSize: 9, color: '#777', fontWeight: fontWeight.semibold },
  stepTabTextActive: { color: '#fff', fontWeight: fontWeight.bold },
  content: { padding: spacing.md, paddingBottom: 110 },
  card: { backgroundColor: '#fff', borderRadius: radius.lg, borderWidth: 1, borderColor: '#e7e5df', padding: spacing.md },
  cardTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.black, color: '#111' },
  cardSubtitle: { fontSize: fontSize.xs, color: '#777', marginTop: 3, lineHeight: 16 },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 15 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  categoryCard: { width: '48.5%', minHeight: 126, borderWidth: 1.5, borderColor: '#e5e3dd', borderRadius: radius.md, padding: 11, backgroundColor: '#fbfbf9', position: 'relative' },
  categoryCardActive: { borderColor: '#ffc400', backgroundColor: '#fff9dc' },
  categoryIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e6e4df', alignItems: 'center', justifyContent: 'center', marginBottom: 9 },
  categoryIconActive: { backgroundColor: '#ffc400', borderColor: '#ffc400' },
  categoryName: { fontSize: 12, fontWeight: fontWeight.bold, color: '#222' },
  categoryNameActive: { color: '#000' },
  categorySub: { fontSize: 9, color: '#888', marginTop: 3, lineHeight: 13 },
  categoryCheck: { position: 'absolute', right: 8, top: 8 },
  search: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: '#ddd', borderRadius: radius.md, backgroundColor: '#fafaf8', paddingHorizontal: 11, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 13, color: '#111' },
  brandGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  brandCard: { width: '31.7%', minHeight: 88, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e1dc', borderRadius: radius.md, backgroundColor: '#fff', padding: 7, position: 'relative' },
  brandCardActive: { borderColor: '#ffc400', backgroundColor: '#fff9dc' },
  brandLogo: { width: 34, height: 34, resizeMode: 'contain', marginBottom: 5 },
  brandName: { fontSize: 10, fontWeight: fontWeight.semibold, color: '#444', maxWidth: '90%', textAlign: 'center' },
  brandNameActive: { color: '#111', fontWeight: fontWeight.bold },
  brandCheck: { position: 'absolute', top: 5, right: 5, width: 17, height: 17, borderRadius: 9, backgroundColor: '#ffc400', alignItems: 'center', justifyContent: 'center' },
  orLabel: { fontSize: 9, fontWeight: fontWeight.black, color: '#999', marginTop: 17, marginBottom: 7, letterSpacing: .6 },
  input: { minHeight: 44, borderWidth: 1, borderColor: '#ddd', borderRadius: radius.md, backgroundColor: '#fafaf8', paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, color: '#111', marginBottom: 10 },
  modelList: { gap: 7 },
  modelRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderWidth: 1, borderColor: '#e2e1dc', borderRadius: radius.md, backgroundColor: '#fff' },
  modelRowActive: { borderColor: '#ffc400', backgroundColor: '#fff9dc' },
  radio: { width: 19, height: 19, borderRadius: 10, borderWidth: 1.5, borderColor: '#bbb', alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: '#111' },
  radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#111' },
  modelName: { fontSize: 12, fontWeight: fontWeight.semibold, color: '#333' },
  modelNameActive: { color: '#111', fontWeight: fontWeight.bold },
  modelMeta: { fontSize: 9, color: '#888', marginTop: 2 },
  fieldLabel: { fontSize: 10, fontWeight: fontWeight.black, color: '#333', marginTop: 9, marginBottom: 7, letterSpacing: .2 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: '#ddd', borderRadius: radius.full, backgroundColor: '#fff' },
  chipActive: { backgroundColor: '#111', borderColor: '#111' },
  chipText: { fontSize: 10, fontWeight: fontWeight.semibold, color: '#555' },
  chipTextActive: { color: '#ffc400' },
  choiceWrap: { gap: 7, marginBottom: 3 },
  choice: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 11, borderWidth: 1, borderColor: '#e1dfd9', borderRadius: radius.md, backgroundColor: '#fff' },
  choiceActive: { borderColor: '#ffc400', backgroundColor: '#fff9dc' },
  choiceText: { fontSize: 11, color: '#555', fontWeight: fontWeight.medium },
  choiceTextActive: { color: '#111', fontWeight: fontWeight.bold },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#f0efeb' },
  checkText: { fontSize: 11, color: '#333', fontWeight: fontWeight.medium },
  twoColumn: { flexDirection: 'row', gap: 9 },
  half: { flex: 1 },
  photoNotice: { flexDirection: 'row', gap: 8, padding: 11, borderRadius: radius.md, backgroundColor: '#fff9dc', borderWidth: 1, borderColor: '#f4df83', marginBottom: 13 },
  photoNoticeText: { flex: 1, fontSize: 10, color: '#555', lineHeight: 15 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  photoCard: { width: '48.5%', aspectRatio: 1.15, borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#ccc', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fafaf8', overflow: 'hidden', position: 'relative' },
  photoIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 7 },
  photoLabel: { fontSize: 11, fontWeight: fontWeight.bold, color: '#444' },
  photoHint: { fontSize: 9, color: '#999', marginTop: 2 },
  photoImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  photoDone: { position: 'absolute', right: 7, top: 7, width: 22, height: 22, borderRadius: 11, backgroundColor: '#ffc400', alignItems: 'center', justifyContent: 'center' },
  photoCount: { fontSize: 10, color: '#777', textAlign: 'center', marginTop: 10 },
  valuationCard: { backgroundColor: '#111', borderRadius: radius.lg, padding: 18, marginBottom: 16, alignItems: 'center' },
  valuationLabel: { color: '#aaa', fontSize: 9, fontWeight: fontWeight.black, letterSpacing: .7 },
  valuationAmount: { color: '#fff', fontSize: 36, fontWeight: fontWeight.black, marginTop: 5 },
  valuationUnavailable: { color: '#fff', fontSize: 24, fontWeight: fontWeight.black, marginTop: 12 },
  valuationDevice: { color: '#aaa', fontSize: 10, marginTop: 3 },
  retryButton: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 12, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: '#333', borderRadius: radius.full },
  retryText: { color: '#ffc400', fontSize: 9, fontWeight: fontWeight.bold },
  priceInput: { flexDirection: 'row', alignItems: 'center', height: 54, borderWidth: 1.5, borderColor: '#ddd', borderRadius: radius.md, backgroundColor: '#fafaf8', paddingHorizontal: 13 },
  rupee: { fontSize: 22, fontWeight: fontWeight.black, color: '#111', marginRight: 6 },
  priceTextInput: { flex: 1, fontSize: 19, fontWeight: fontWeight.bold, color: '#111' },
  priceQuickRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  quickPrice: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radius.sm, backgroundColor: '#f5f4ef', borderWidth: 1, borderColor: '#e1dfd9' },
  quickPriceText: { fontSize: 9, fontWeight: fontWeight.bold, color: '#444' },
  gpsButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7, backgroundColor: '#ffc400', borderRadius: radius.md, paddingVertical: 11, marginBottom: 6 },
  gpsText: { fontSize: 11, fontWeight: fontWeight.black, color: '#000' },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  reviewSection: { borderWidth: 1, borderColor: '#e5e3dd', borderRadius: radius.md, padding: 12, marginBottom: 10, backgroundColor: '#fbfbf9' },
  reviewTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 7 },
  reviewTitle: { fontSize: 12, fontWeight: fontWeight.black, color: '#111' },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#eee' },
  reviewLabel: { fontSize: 10, color: '#888' },
  reviewValue: { flex: 1, textAlign: 'right', fontSize: 10, color: '#333', fontWeight: fontWeight.semibold },
  reviewValueStrong: { fontSize: 12, color: '#111', fontWeight: fontWeight.black },
  submitNotice: { flexDirection: 'row', gap: 8, backgroundColor: '#fff9dc', borderWidth: 1, borderColor: '#f1df8b', borderRadius: radius.md, padding: 11, marginTop: 4 },
  submitNoticeText: { flex: 1, fontSize: 10, color: '#555', lineHeight: 15 },
  empty: { padding: 18, borderWidth: 1, borderColor: '#e4e2dc', borderRadius: radius.md, alignItems: 'center', gap: 7, backgroundColor: '#fafaf8' },
  emptyText: { textAlign: 'center', fontSize: 10, color: '#777' },
  bottomActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  backButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, minWidth: 82, paddingVertical: 13, borderRadius: radius.md, borderWidth: 1, borderColor: '#ddd', backgroundColor: '#fff' },
  backText: { fontSize: 11, fontWeight: fontWeight.bold, color: '#111' },
  primaryButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: radius.md, backgroundColor: '#ffc400' },
  fullButton: { flex: 1 },
  submitButton: { minHeight: 48 },
  primaryButtonText: { fontSize: 12, fontWeight: fontWeight.black, color: '#000' },
  disabled: { opacity: .55 },
  successPage: { padding: spacing.md, alignItems: 'center', paddingBottom: 40 },
  successIcon: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#ffc400', alignItems: 'center', justifyContent: 'center', marginTop: 25 },
  successTitle: { fontSize: 24, fontWeight: fontWeight.black, color: '#111', textAlign: 'center', marginTop: 16 },
  successText: { fontSize: 12, color: '#777', lineHeight: 19, textAlign: 'center', marginTop: 7, maxWidth: 360 },
  referenceCard: { width: '100%', backgroundColor: '#111', borderRadius: radius.lg, padding: 17, alignItems: 'center', marginTop: 20 },
  referenceLabel: { color: '#999', fontSize: 9, fontWeight: fontWeight.black, letterSpacing: .7 },
  referenceValue: { color: '#ffc400', fontSize: 20, fontWeight: fontWeight.black, marginTop: 4 },
  lifecycleCard: { width: '100%', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e4e2dc', borderRadius: radius.lg, padding: 15, marginTop: 12 },
  lifecycleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  lifecycleDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center' },
  lifecycleDotActive: { backgroundColor: '#ffc400' },
  lifecycleText: { fontSize: 11, color: '#444', fontWeight: fontWeight.semibold },
  linkButton: { padding: 12 },
  linkButtonText: { fontSize: 11, fontWeight: fontWeight.bold, color: '#555' },
});
