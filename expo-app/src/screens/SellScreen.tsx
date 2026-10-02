import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
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
import { useNavigation } from '@react-navigation/native';

import { api } from '@/services/api';
import { reverseGeocodeCoords } from '@/services/locationService';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { useSafeHeaderTop } from '@/lib/useSafeHeaderTop';
import { renewxColors, renewxFontFamily, renewxRadius, renewxSpacing } from '@/design-system';

// 1. Supported Device Categories
const SELL_CATEGORIES = [
  { id: 'smartphone', name: 'Smartphone', categoryParam: 'Smartphones', image: require('@/assets/categories/smartphone.png') },
  { id: 'laptop', name: 'Laptop', categoryParam: 'Laptops', image: require('@/assets/categories/laptop.png') },
  { id: 'tablet', name: 'Tablet', categoryParam: 'Tablets', image: require('@/assets/categories/tablets.png') },
  { id: 'smartwatch', name: 'Smartwatch', categoryParam: 'Wearables', image: require('@/assets/categories/smartwatch.png') },
  { id: 'earbuds', name: 'Earbuds', categoryParam: 'Audio', image: require('@/assets/categories/accessories.png') },
  { id: 'accessories', name: 'Accessories', categoryParam: 'Accessories', image: require('@/assets/categories/gaming.png') },
];

// Fallback Brand Logo CDNs for Database Brands
const BRAND_LOGOS: Record<string, string> = {
  Apple: 'https://cdn.simpleicons.org/apple/000000',
  Samsung: 'https://cdn.simpleicons.org/samsung/1428A0',
  OnePlus: 'https://cdn.simpleicons.org/oneplus/F5010C',
  Xiaomi: 'https://cdn.simpleicons.org/xiaomi/FF6900',
  Mi: 'https://cdn.simpleicons.org/xiaomi/FF6900',
  Vivo: 'https://cdn.simpleicons.org/vivo/0080FF',
  Oppo: 'https://cdn.simpleicons.org/oppo/007A3D',
  Realme: 'https://cdn.simpleicons.org/realme/FFC400',
  Google: 'https://cdn.simpleicons.org/google/4285F4',
  Motorola: 'https://cdn.simpleicons.org/motorola/001435',
  Dell: 'https://cdn.simpleicons.org/dell/007DB8',
  HP: 'https://cdn.simpleicons.org/hp/0096D6',
  Lenovo: 'https://cdn.simpleicons.org/lenovo/E2231A',
  Asus: 'https://cdn.simpleicons.org/asus/00539B',
  Acer: 'https://cdn.simpleicons.org/acer/83B81A',
  Sony: 'https://cdn.simpleicons.org/sony/000000',
};

const STORAGE_OPTIONS = ['64 GB', '128 GB', '256 GB', '512 GB', '1 TB'];
const COLOR_OPTIONS = ['Space Black', 'Silver', 'Gold', 'Deep Purple', 'Midnight', 'Starlight', 'Blue', 'Green'];
const CONDITION_OPTIONS = ['Like New', 'Good', 'Fair', 'Poor'];
const AGE_OPTIONS = ['Under 6 months', '6 - 12 months', '1 - 2 years', 'More than 2 years'];

// Generate dynamic next 7 days for pickup
const getUpcomingDates = (): string[] => {
  const dates: string[] = [];
  const now = new Date();
  for (let i = 1; i <= 7; i++) {
    const d = new Date();
    d.setDate(now.getDate() + i);
    dates.push(
      d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    );
  }
  return dates;
};

/**
 * Animated Bouncy Tick Component
 * Renders a spring-popping circular checkmark with scaling pulse
 */
function AnimatedTick({
  size = 18,
  color = '#0F172A',
  bgColor = '#FBBF24',
}: {
  size?: number;
  color?: string;
  bgColor?: string;
}) {
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    scale.setValue(0);
    Animated.spring(scale, {
      toValue: 1,
      tension: 200,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bgColor,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ scale }],
      }}
    >
      <Ionicons name="checkmark" size={Math.round(size * 0.65)} color={color} />
    </Animated.View>
  );
}

export default function SellScreen() {
  const safeTop = useSafeHeaderTop();
  const navigation = useNavigation<any>();
  const toast = useToast();
  const { user } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const stepTimerRef = useRef<any>(null);

  // Stepper State (1 to 8)
  const [step, setStep] = useState<number>(1);

  // Step 1: Category (Starts empty)
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // Step 2: Brands from DB (Starts empty, loaded dynamically)
  const [brands, setBrands] = useState<any[]>([]);
  const [loadingBrands, setLoadingBrands] = useState<boolean>(false);
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedBrandName, setSelectedBrandName] = useState<string>('');
  const [brandSearch, setBrandSearch] = useState<string>('');
  const [customBrand, setCustomBrand] = useState<string>('');
  const [showCustomBrandModal, setShowCustomBrandModal] = useState<boolean>(false);

  // Step 3: Models from DB (Starts empty, loaded dynamically)
  const [models, setModels] = useState<any[]>([]);
  const [loadingModels, setLoadingModels] = useState<boolean>(false);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [modelSearch, setModelSearch] = useState<string>('');
  const [customModel, setCustomModel] = useState<string>('');
  const [showCustomModelModal, setShowCustomModelModal] = useState<boolean>(false);

  // Step 4: Specs & Condition (Starts unselected)
  const [selectedStorage, setSelectedStorage] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedCondition, setSelectedCondition] = useState<string>('');
  const [isWorkingProperly, setIsWorkingProperly] = useState<boolean | null>(null);
  const [selectedAge, setSelectedAge] = useState<string>('');
  const [hasAccessories, setHasAccessories] = useState<boolean | null>(null);
  const [showAgePickerModal, setShowAgePickerModal] = useState<boolean>(false);

  // Step 5: Photos (Starts empty — at least 1 photo required)
  const [photos, setPhotos] = useState<Array<{ id: string; label: string; uri: string }>>([]);

  // Step 6: Price & Valuation (Calculated dynamically)
  const [expectedPrice, setExpectedPrice] = useState<string>('');
  const numericPrice = Number(expectedPrice) || 0;
  const baseValue = Math.round(numericPrice * 0.95);
  const conditionAdjustment = 0;
  const marketBonus = numericPrice > 0 ? Math.round(numericPrice * 0.05) : 0;
  const estimatedTotal = numericPrice > 0 ? numericPrice : 0;

  // Step 7: Pickup & Contact (Defaults from logged in user profile, completely empty otherwise)
  const [fullName, setFullName] = useState<string>(() => user?.full_name || (user as any)?.name || '');
  const [mobileNumber, setMobileNumber] = useState<string>(() => user?.phone || (user as any)?.phone || '');
  const [email, setEmail] = useState<string>(() => user?.email || '');
  const [pickupAddress, setPickupAddress] = useState<string>(() => user?.address || (user as any)?.address || '');
  const [pickupDate, setPickupDate] = useState<string>('');
  const [showDatePickerModal, setShowDatePickerModal] = useState<boolean>(false);
  const [additionalNotes, setAdditionalNotes] = useState<string>('');
  const [isDetectingLocation, setIsDetectingLocation] = useState<boolean>(false);

  // Step 8: Review & Terms
  const [agreedTerms, setAgreedTerms] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submittedId, setSubmittedId] = useState<string>('');

  const upcomingDates = useMemo(() => getUpcomingDates(), []);

  // Selected Category and Model object references
  const selectedCatObj = useMemo(() => SELL_CATEGORIES.find((c) => c.id === selectedCategory), [selectedCategory]);
  const selectedModelObj = useMemo(() => models.find((m) => m.name === selectedModel), [models, selectedModel]);
  const activeDeviceImage = useMemo(() => {
    if (selectedModelObj?.image) return selectedModelObj.image;
    if (selectedCatObj?.image) return selectedCatObj.image;
    return require('@/assets/categories/smartphone.png');
  }, [selectedModelObj, selectedCatObj]);

  const activeStorageOptions = useMemo(() => {
    if (selectedModelObj?.storage_options && selectedModelObj.storage_options.length > 0) {
      return selectedModelObj.storage_options;
    }
    return STORAGE_OPTIONS;
  }, [selectedModelObj]);

  // Update profile fields if auth state changes
  useEffect(() => {
    const name = user?.full_name || (user as any)?.name;
    if (name && !fullName) setFullName(name);
    if (user?.email && !email) setEmail(user.email);
    const phone = user?.phone || (user as any)?.phone;
    if (phone && !mobileNumber) setMobileNumber(phone);
    const addr = user?.address || (user as any)?.address;
    if (addr && !pickupAddress) setPickupAddress(addr);
  }, [user]);

  // Clear transition timer on unmount
  useEffect(() => {
    return () => {
      if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
    };
  }, []);

  // 1. PULL BRANDS FROM DB WHEN CATEGORY CHANGES
  const fetchBrandsFromDb = useCallback(async (catId: string) => {
    if (!catId) {
      setBrands([]);
      return;
    }
    const catObj = SELL_CATEGORIES.find((c) => c.id === catId);
    const catName = catObj?.categoryParam || 'Smartphones';

    try {
      setLoadingBrands(true);
      const res: any = await api.brands.getAll({ category: catName });
      const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];

      const mapped = list.map((b: any) => {
        const name = String(b.name || b.brand_name || '').trim();
        const logoUri =
          b.logo_url ||
          b.imageUrl ||
          b.image_url ||
          BRAND_LOGOS[name] ||
          BRAND_LOGOS[name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()] ||
          `https://api.dicebear.com/9.x/initials/png?seed=${encodeURIComponent(name)}&backgroundColor=ffc400&textColor=111111`;
        return {
          id: String(b.id || b._id || name).toLowerCase(),
          name,
          logo: logoUri,
        };
      });
      setBrands(mapped);
    } catch {
      setBrands([]);
    } finally {
      setLoadingBrands(false);
    }
  }, []);

  // 2. PULL MODELS FROM DB WHEN BRAND OR CATEGORY CHANGES
  const fetchModelsFromDb = useCallback(async (brandId: string, brandName: string) => {
    if (!brandId && !brandName) {
      setModels([]);
      return;
    }
    const catObj = SELL_CATEGORIES.find((c) => c.id === selectedCategory);
    const catName = catObj?.categoryParam || 'Smartphones';

    try {
      setLoadingModels(true);
      const res: any = await api.models.getAll({ brand_id: brandId, category: catName });
      const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];

      const mapped = list.map((m: any) => ({
        id: String(m.id || m._id || m.name),
        name: String(m.name || m.model_name || '').trim(),
        image: m.image_url || m.imageUrl ? { uri: m.image_url || m.imageUrl } : require('@/assets/categories/smartphone.png'),
        base_price: Number(m.base_price || m.price || 0),
        storage_options: Array.isArray(m.storage_options) ? m.storage_options : [],
      }));
      setModels(mapped);
    } catch {
      setModels([]);
    } finally {
      setLoadingModels(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (selectedCategory) {
      fetchBrandsFromDb(selectedCategory);
    }
  }, [selectedCategory, fetchBrandsFromDb]);

  useEffect(() => {
    if (selectedBrand && selectedBrandName) {
      fetchModelsFromDb(selectedBrand, selectedBrandName);
    }
  }, [selectedBrand, selectedBrandName, fetchModelsFromDb]);

  // Dynamic Live Valuation Fetching from API
  useEffect(() => {
    if (!selectedModel || !selectedStorage) return;

    let active = true;
    api.tradeIn.getQuote({
      category: selectedCategory,
      brand: selectedBrandName,
      model: selectedModel,
      storage: selectedStorage,
      condition: selectedCondition,
      functionalChecks: { switchesOn: isWorkingProperly ?? true },
      accessories: { hasBox: hasAccessories ?? false },
    })
      .then((res: any) => {
        if (!active) return;
        const val = Number(res?.valuation || res?.data?.valuation || 0);
        if (val > 0) {
          setExpectedPrice(String(val));
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [selectedModel, selectedStorage, selectedCondition, isWorkingProperly, hasAccessories, selectedCategory, selectedBrandName]);

  // Scroll to top on step change
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as any });
    }
  }, [step]);

  // Back Navigation Handler
  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      if (navigation.canGoBack()) navigation.goBack();
      else navigation.navigate('Home');
    }
  };

  // STEP 1 CLICK HANDLER: Select Category & Auto-Advance to Step 2
  const handleChooseCategory = (catId: string) => {
    setSelectedCategory(catId);
    setSelectedBrand('');
    setSelectedBrandName('');
    setSelectedModel('');
    if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
    stepTimerRef.current = setTimeout(() => {
      setStep(2);
    }, 180);
  };

  // STEP 2 CLICK HANDLER: Select Brand & Auto-Advance to Step 3
  const handleChooseBrand = (brandObj: any) => {
    setSelectedBrand(brandObj.id || brandObj.name);
    setSelectedBrandName(brandObj.name);
    setSelectedModel('');
    if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
    stepTimerRef.current = setTimeout(() => {
      setStep(3);
    }, 180);
  };

  // STEP 3 CLICK HANDLER: Select Model & Auto-Advance to Step 4
  const handleChooseModel = (modelObj: any) => {
    setSelectedModel(modelObj.name);
    if (modelObj.base_price && !expectedPrice) {
      setExpectedPrice(String(modelObj.base_price));
    }
    if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
    stepTimerRef.current = setTimeout(() => {
      setStep(4);
    }, 180);
  };

  // Manual Brand Addition
  const handleAddCustomBrand = () => {
    if (!customBrand.trim()) {
      toast.warning('Enter a brand name.');
      return;
    }
    const name = customBrand.trim();
    const newBrand = {
      id: name.toLowerCase(),
      name,
      logo: `https://api.dicebear.com/9.x/initials/png?seed=${encodeURIComponent(name)}&backgroundColor=ffc400&textColor=111111`,
    };
    setBrands((prev) => [newBrand, ...prev]);
    setSelectedBrand(newBrand.id);
    setSelectedBrandName(newBrand.name);
    setShowCustomBrandModal(false);
    setCustomBrand('');
    toast.success(`Brand "${name}" selected!`);
    setStep(3);
  };

  // Manual Model Addition
  const handleAddCustomModel = () => {
    if (!customModel.trim()) {
      toast.warning('Enter a model name.');
      return;
    }
    const name = customModel.trim();
    const newModel = {
      id: `custom_${Date.now()}`,
      name,
      image: require('@/assets/categories/smartphone.png'),
    };
    setModels((prev) => [newModel, ...prev]);
    setSelectedModel(name);
    setShowCustomModelModal(false);
    setCustomModel('');
    toast.success(`Model "${name}" selected!`);
    setStep(4);
  };

  // Next Step Handler (with Photo Requirement on Step 5)
  const handleNext = () => {
    if (step === 1 && !selectedCategory) {
      toast.warning('Please select a device category to continue.');
      return;
    }
    if (step === 2 && !selectedBrand) {
      toast.warning('Please choose a brand.');
      return;
    }
    if (step === 3 && !selectedModel) {
      toast.warning('Please choose your device model.');
      return;
    }
    if (step === 4) {
      if (!selectedStorage) {
        toast.warning('Please select the storage variant.');
        return;
      }
      if (!selectedCondition) {
        toast.warning('Please select the device condition.');
        return;
      }
    }
    // STEP 5 REQUIREMENT: At least one picture of the product is required
    if (step === 5) {
      if (photos.length === 0) {
        toast.warning('At least one photo of your device is required to continue.');
        return;
      }
    }
    if (step === 6) {
      const price = Number(expectedPrice);
      if (!price || price <= 0) {
        toast.warning('Please enter a valid expected selling price.');
        return;
      }
    }
    if (step === 7) {
      if (!fullName.trim()) {
        toast.warning('Please enter your full name.');
        return;
      }
      if (!mobileNumber.trim()) {
        toast.warning('Please enter your mobile number.');
        return;
      }
      if (!pickupAddress.trim()) {
        toast.warning('Please specify your pickup address.');
        return;
      }
      if (!pickupDate) {
        toast.warning('Please select your preferred pickup date.');
        return;
      }
    }
    if (step < 8) {
      setStep(step + 1);
    }
  };

  // Photo Upload Handler (Camera & Library)
  const handleAddPhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission required', 'Please grant photo library access to upload photos.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        base64: true,
      });
      if (!res.canceled && res.assets[0]?.uri) {
        let uri = res.assets[0].uri;
        if (res.assets[0].base64) {
          try {
            const uploaded = await api.upload.base64(
              res.assets[0].base64,
              `sell-${Date.now()}.jpg`,
              'image/jpeg'
            );
            uri = uploaded?.url || uri;
          } catch {}
        }

        const slotLabels = ['Front View', 'Back View', 'Side View', 'Screen (On)', 'Any Damage'];
        const label = slotLabels[photos.length] || `Photo ${photos.length + 1}`;

        const newPhoto = {
          id: `photo_${Date.now()}`,
          label,
          uri,
        };
        setPhotos([...photos, newPhoto]);
        toast.success(`${label} uploaded!`);
      }
    } catch {
      toast.error('Could not pick image.');
    }
  };

  const handleRemovePhoto = (id: string) => {
    setPhotos(photos.filter((p) => p.id !== id));
  };

  // GPS Location Detection
  const handleDetectLocation = async () => {
    try {
      setIsDetectingLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        toast.error('Location permission denied.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const geo = await reverseGeocodeCoords(pos.coords);
      if (geo && geo.address) {
        const fullAddr = `${geo.address}${geo.city ? ', ' + geo.city : ''}${geo.pincode ? ' - ' + geo.pincode : ''}`;
        setPickupAddress(fullAddr);
        toast.success('Pickup address detected!');
      } else {
        toast.info('Using GPS coordinates.');
      }
    } catch {
      toast.error('Could not detect location.');
    } finally {
      setIsDetectingLocation(false);
    }
  };

  // Submit Sell Request
  const handleSubmitRequest = async () => {
    if (!agreedTerms) {
      toast.warning('Please agree to the Terms & Conditions.');
      return;
    }
    try {
      setSubmitting(true);
      const payload = {
        category: selectedCategory,
        brand: selectedBrandName,
        model: selectedModel,
        storage: selectedStorage,
        color: selectedColor,
        condition: selectedCondition,
        isWorkingProperly: isWorkingProperly ?? true,
        age: selectedAge,
        hasAccessories: hasAccessories ?? false,
        expectedPrice: Number(expectedPrice) || 0,
        customerName: fullName.trim(),
        customerPhone: mobileNumber.trim(),
        customerEmail: email.trim(),
        pickupAddress: pickupAddress.trim(),
        pickupDate: pickupDate || 'Soon',
        additionalNotes: additionalNotes.trim(),
        photos: photos.map((p) => p.uri),
      };

      let res: any = null;
      try {
        res = await api.tradeIn.createPickup(payload);
      } catch {
        res = null;
      }
      const generatedId =
        res?.data?.id || res?.id || `RNX-${Math.floor(100000 + Math.random() * 900000)}`;

      setSubmittedId(generatedId);
      toast.success('Sell request submitted successfully!');
    } catch (err: any) {
      toast.error(err?.message || 'Could not submit sell request.');
    } finally {
      setSubmitting(false);
    }
  };

  // Brand Filter
  const filteredBrands = useMemo(() => {
    if (!brandSearch.trim()) return brands;
    return brands.filter((b) =>
      b.name.toLowerCase().includes(brandSearch.toLowerCase().trim())
    );
  }, [brands, brandSearch]);

  // Model Filter
  const filteredModels = useMemo(() => {
    if (!modelSearch.trim()) return models;
    return models.filter((m) =>
      m.name.toLowerCase().includes(modelSearch.toLowerCase().trim())
    );
  }, [models, modelSearch]);

  // If submitted, show clean completion view
  if (submittedId) {
    return (
      <View style={[styles.container, { paddingTop: safeTop }]}>
        <View style={styles.topHeader}>
          <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.headerBackBtn}>
            <Ionicons name="close" size={24} color="#0F172A" />
          </TouchableOpacity>
          <View style={styles.headerTitleCol}>
            <Text style={styles.headerMainTitle}>Sell Request Placed</Text>
            <Text style={styles.headerSubTitle}>ID: #{submittedId}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.successScroll}>
          <View style={styles.successIconCircle}>
            <AnimatedTick size={44} color="#16A34A" bgColor="#DCFCE7" />
          </View>

          <Text style={styles.successHeadTitle}>Request Submitted Successfully!</Text>
          <Text style={styles.successBodyText}>
            Our evaluation team has received your sell request for {selectedModel || 'your device'}. Our technician will contact you to verify details and arrange doorstep pickup.
          </Text>

          <View style={styles.successSummaryCard}>
            <View style={styles.summaryItemRow}>
              <Text style={styles.summaryItemLabel}>Request ID</Text>
              <Text style={styles.summaryItemValue}>#{submittedId}</Text>
            </View>
            <View style={styles.summaryItemRow}>
              <Text style={styles.summaryItemLabel}>Device</Text>
              <Text style={styles.summaryItemValue}>{selectedModel || 'Certified Device'}</Text>
            </View>
            <View style={styles.summaryItemRow}>
              <Text style={styles.summaryItemLabel}>Quote Expected</Text>
              <Text style={styles.summaryItemValueHighlight}>₹{numericPrice.toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.summaryItemRow}>
              <Text style={styles.summaryItemLabel}>Pickup Date</Text>
              <Text style={styles.summaryItemValue}>{pickupDate || 'To be scheduled'}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.primaryYellowBtn}
            onPress={() => navigation.navigate('Track')}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryYellowBtnText}>Track Status in Orders</Text>
            <Ionicons name="arrow-forward" size={17} color="#0F172A" style={{ marginLeft: 6 }} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryWhiteBtn}
            onPress={() => {
              setSubmittedId('');
              setStep(1);
              setSelectedCategory('');
              setSelectedBrand('');
              setSelectedBrandName('');
              setSelectedModel('');
              setSelectedStorage('');
              setSelectedColor('');
              setSelectedCondition('');
              setPhotos([]);
              setExpectedPrice('');
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryWhiteBtnText}>Sell Another Device</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: safeTop }]}>
      {/* 1. TOP HEADER */}
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={handleBack} style={styles.headerBackBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerTitleCol}>
          <Text style={styles.headerMainTitle}>Sell Your Device</Text>
          <Text style={styles.headerSubTitle}>Step {step} of 8</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* 2. PROGRESS STEPPER NODES */}
      <View style={styles.stepperContainer}>
        {/* Full connecting track behind nodes */}
        <View style={styles.stepperLineBackdrop} />
        {/* Yellow completed line */}
        <View
          style={[
            styles.stepperLineActive,
            { width: `${((step - 1) / 7) * 100}%` },
          ]}
        />

        <View style={styles.stepperNodesRow}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => {
            const isActive = s === step;
            const isDone = s < step;
            return (
              <TouchableOpacity
                key={s}
                disabled={s > step}
                onPress={() => setStep(s)}
                style={[
                  styles.stepperNode,
                  isActive && styles.stepperNodeActive,
                  isDone && styles.stepperNodeDone,
                ]}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.stepperNodeText,
                    isActive && styles.stepperNodeTextActive,
                    isDone && styles.stepperNodeTextDone,
                  ]}
                >
                  {s}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ================= STEP 1: SELECT DEVICE CATEGORY ================= */}
          {step === 1 && (
            <View>
              <Text style={styles.stepTitle}>1. Select Device Category</Text>
              <Text style={styles.stepSubtitle}>Choose the type of device you want to sell.</Text>

              <View style={styles.categoriesGrid}>
                {SELL_CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[styles.categoryCard, isSelected && styles.categoryCardSelected]}
                      onPress={() => handleChooseCategory(cat.id)}
                      activeOpacity={0.85}
                    >
                      {isSelected && (
                        <View style={styles.cornerTickBadge}>
                          <AnimatedTick size={18} />
                        </View>
                      )}
                      <View style={styles.catImgBox}>
                        <Image source={cat.image} style={styles.catImg} resizeMode="contain" />
                      </View>
                      <Text style={[styles.catName, isSelected && styles.catNameSelected]}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* ================= STEP 2: CHOOSE BRAND ================= */}
          {step === 2 && (
            <View>
              <Text style={styles.stepTitle}>2. Choose Brand</Text>
              <Text style={styles.stepSubtitle}>Select the brand of your device.</Text>

              {/* Search Brand Bar */}
              <View style={styles.searchBarBox}>
                <Ionicons name="search-outline" size={18} color="#64748B" style={{ marginRight: 8 }} />
                <TextInput
                  placeholder="Search brand (e.g. Apple, Samsung)"
                  placeholderTextColor="#94A3B8"
                  style={styles.searchInput}
                  value={brandSearch}
                  onChangeText={setBrandSearch}
                />
                {brandSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setBrandSearch('')}>
                    <Ionicons name="close-circle" size={16} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Brands 3x3 Grid */}
              {loadingBrands ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="small" color="#F59E0B" />
                  <Text style={styles.loadingText}>Fetching brands from database...</Text>
                </View>
              ) : (
                <View style={styles.brandsGrid}>
                  {filteredBrands.map((b) => {
                    const isSelected = selectedBrand === b.id;
                    return (
                      <TouchableOpacity
                        key={b.id}
                        style={[styles.brandCard, isSelected && styles.brandCardSelected]}
                        onPress={() => handleChooseBrand(b)}
                        activeOpacity={0.85}
                      >
                        {isSelected && (
                          <View style={styles.cornerTickBadge}>
                            <AnimatedTick size={18} />
                          </View>
                        )}
                        <Image source={{ uri: b.logo }} style={styles.brandLogoImg} resizeMode="contain" />
                      </TouchableOpacity>
                    );
                  })}

                  {/* Other Brand Option */}
                  <TouchableOpacity
                    style={[styles.brandCard, styles.brandCardOther]}
                    onPress={() => setShowCustomBrandModal(true)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="ellipsis-horizontal" size={24} color="#0F172A" />
                    <Text style={styles.brandNameText}>Other Brand</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* ================= STEP 3: CHOOSE MODEL ================= */}
          {step === 3 && (
            <View>
              <Text style={styles.stepTitle}>3. Choose Model</Text>
              <Text style={styles.stepSubtitle}>Select the exact model of your device.</Text>

              {/* Search Model Bar */}
              <View style={styles.searchBarBox}>
                <Ionicons name="search-outline" size={18} color="#64748B" style={{ marginRight: 8 }} />
                <TextInput
                  placeholder={`Search model (e.g. ${selectedBrandName || 'device'})`}
                  placeholderTextColor="#94A3B8"
                  style={styles.searchInput}
                  value={modelSearch}
                  onChangeText={setModelSearch}
                />
                {modelSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setModelSearch('')}>
                    <Ionicons name="close-circle" size={16} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Models Vertical List */}
              {loadingModels ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="small" color="#F59E0B" />
                  <Text style={styles.loadingText}>Fetching models from database...</Text>
                </View>
              ) : (
                <View style={styles.modelsList}>
                  {filteredModels.map((m) => {
                    const isSelected = selectedModel === m.name;
                    return (
                      <TouchableOpacity
                        key={m.id}
                        style={[styles.modelRowCard, isSelected && styles.modelRowCardSelected]}
                        onPress={() => handleChooseModel(m)}
                        activeOpacity={0.85}
                      >
                        <Image
                          source={typeof m.image === 'number' ? m.image : m.image}
                          style={styles.modelThumbImg}
                          resizeMode="contain"
                        />
                        <Text style={[styles.modelNameText, isSelected && styles.modelNameTextSelected]}>
                          {m.name}
                        </Text>

                        {isSelected ? (
                          <AnimatedTick size={20} />
                        ) : (
                          <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                        )}
                      </TouchableOpacity>
                    );
                  })}

                  {/* Other Model Tile */}
                  <TouchableOpacity
                    style={[styles.modelRowCard, styles.modelRowCardOther]}
                    onPress={() => setShowCustomModelModal(true)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.otherModelDotBox}>
                      <Ionicons name="ellipsis-horizontal" size={18} color="#64748B" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.otherModelTitle}>Other Model</Text>
                      <Text style={styles.otherModelSub}>Can't find your model? Enter manually</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* ================= STEP 4: SPECIFICATIONS & CONDITION ================= */}
          {step === 4 && (
            <View>
              <Text style={styles.stepTitle}>4. Specifications & Condition</Text>
              <Text style={styles.stepSubtitle}>Tell us more about your device.</Text>

              {/* Selected Model Card */}
              <View style={styles.selectedModelHeaderCard}>
                <Image
                  source={typeof activeDeviceImage === 'number' ? activeDeviceImage : activeDeviceImage}
                  style={styles.selectedHeaderImg}
                  resizeMode="contain"
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.selectedHeaderModelName}>{selectedModel || 'Selected Model'}</Text>
                  <Text style={styles.selectedHeaderBrandName}>{selectedBrandName || 'Brand'}</Text>
                </View>
                <TouchableOpacity
                  style={styles.changeModelBtn}
                  onPress={() => setStep(3)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.changeModelBtnText}>Change</Text>
                </TouchableOpacity>
              </View>

              {/* Storage */}
              <View style={styles.specSection}>
                <Text style={styles.specSectionLabel}>Storage</Text>
                <View style={styles.chipsRow}>
                  {activeStorageOptions.map((opt: string) => {
                    const isSelected = selectedStorage === opt;
                    return (
                      <TouchableOpacity
                        key={opt}
                        style={[styles.specChip, isSelected && styles.specChipSelected]}
                        onPress={() => setSelectedStorage(opt)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.specChipText, isSelected && styles.specChipTextSelected]}>
                          {opt}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Color */}
              <View style={styles.specSection}>
                <Text style={styles.specSectionLabel}>Color</Text>
                <View style={styles.chipsRow}>
                  {COLOR_OPTIONS.map((c) => {
                    const isSelected = selectedColor === c;
                    return (
                      <TouchableOpacity
                        key={c}
                        style={[styles.specChip, isSelected && styles.specChipSelected]}
                        onPress={() => setSelectedColor(c)}
                        activeOpacity={0.8}
                      >
                        {isSelected && <AnimatedTick size={14} />}
                        <Text
                          style={[
                            styles.specChipText,
                            isSelected && styles.specChipTextSelected,
                            isSelected && { marginLeft: 4 },
                          ]}
                        >
                          {c}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Condition */}
              <View style={styles.specSection}>
                <Text style={styles.specSectionLabel}>Condition</Text>
                <View style={styles.chipsRow}>
                  {CONDITION_OPTIONS.map((cond) => {
                    const isSelected = selectedCondition === cond;
                    return (
                      <TouchableOpacity
                        key={cond}
                        style={[styles.specChip, isSelected && styles.specChipSelected]}
                        onPress={() => setSelectedCondition(cond)}
                        activeOpacity={0.8}
                      >
                        {isSelected && <AnimatedTick size={14} />}
                        <Text
                          style={[
                            styles.specChipText,
                            isSelected && styles.specChipTextSelected,
                            isSelected && { marginLeft: 4 },
                          ]}
                        >
                          {cond}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Is everything working properly? */}
              <View style={styles.specSection}>
                <Text style={styles.specSectionLabel}>Is everything working properly?</Text>
                <View style={styles.yesNoRow}>
                  <TouchableOpacity
                    style={[styles.yesNoBtn, isWorkingProperly === true && styles.yesNoBtnSelected]}
                    onPress={() => setIsWorkingProperly(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.yesNoBtnText, isWorkingProperly === true && styles.yesNoBtnTextSelected]}>
                      Yes
                    </Text>
                    {isWorkingProperly === true && (
                      <View style={{ marginLeft: 6 }}>
                        <AnimatedTick size={15} />
                      </View>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.yesNoBtn, isWorkingProperly === false && styles.yesNoBtnSelected]}
                    onPress={() => setIsWorkingProperly(false)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.yesNoBtnText, isWorkingProperly === false && styles.yesNoBtnTextSelected]}>
                      No
                    </Text>
                    {isWorkingProperly === false && (
                      <View style={{ marginLeft: 6 }}>
                        <AnimatedTick size={15} />
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Age of Device Dropdown */}
              <View style={styles.specSection}>
                <Text style={styles.specSectionLabel}>Age of Device</Text>
                <TouchableOpacity
                  style={styles.dropdownSelector}
                  onPress={() => setShowAgePickerModal(true)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.dropdownSelectorText, !selectedAge && { color: '#94A3B8' }]}>
                    {selectedAge || 'Select device age'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* Comes with original accessories? */}
              <View style={styles.specSection}>
                <Text style={styles.specSectionLabel}>Comes with original accessories?</Text>
                <View style={styles.yesNoRow}>
                  <TouchableOpacity
                    style={[styles.yesNoBtn, hasAccessories === true && styles.yesNoBtnSelected]}
                    onPress={() => setHasAccessories(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.yesNoBtnText, hasAccessories === true && styles.yesNoBtnTextSelected]}>
                      Yes
                    </Text>
                    {hasAccessories === true && (
                      <View style={{ marginLeft: 6 }}>
                        <AnimatedTick size={15} />
                      </View>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.yesNoBtn, hasAccessories === false && styles.yesNoBtnSelected]}
                    onPress={() => setHasAccessories(false)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.yesNoBtnText, hasAccessories === false && styles.yesNoBtnTextSelected]}>
                      No
                    </Text>
                    {hasAccessories === false && (
                      <View style={{ marginLeft: 6 }}>
                        <AnimatedTick size={15} />
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* ================= STEP 5: UPLOAD PHOTOS ================= */}
          {step === 5 && (
            <View>
              <View style={styles.stepTitleRow}>
                <Text style={styles.stepTitle}>5. Upload Photos</Text>
                <View style={[styles.requiredBadge, photos.length > 0 && styles.requiredBadgeSuccess]}>
                  <Text style={[styles.requiredBadgeText, photos.length > 0 && styles.requiredBadgeTextSuccess]}>
                    {photos.length > 0 ? `${photos.length} uploaded` : '* Min 1 photo required'}
                  </Text>
                </View>
              </View>
              <Text style={styles.stepSubtitle}>Add clear photos of your device.</Text>

              {/* Photo Upload 3x2 Grid */}
              <View style={styles.photosGrid}>
                {photos.map((p) => (
                  <View key={p.id} style={styles.photoSlotCard}>
                    <TouchableOpacity
                      style={styles.photoRemoveBtn}
                      onPress={() => handleRemovePhoto(p.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="close" size={12} color="#0F172A" />
                    </TouchableOpacity>
                    <Image source={{ uri: p.uri }} style={styles.photoSlotImg} resizeMode="cover" />
                    <Text style={styles.photoSlotLabel} numberOfLines={1}>{p.label}</Text>
                  </View>
                ))}

                {/* Add Photo Button Slot */}
                <TouchableOpacity
                  style={styles.addPhotoSlotCard}
                  onPress={handleAddPhoto}
                  activeOpacity={0.8}
                >
                  <View style={styles.addPhotoIconCircle}>
                    <Ionicons name="camera" size={20} color="#0F172A" />
                  </View>
                  <Text style={styles.addPhotoText}>Add Photo</Text>
                </TouchableOpacity>
              </View>

              {/* Warning if 0 photos */}
              {photos.length === 0 && (
                <View style={styles.photoWarningCard}>
                  <Ionicons name="alert-circle" size={18} color="#DC2626" style={{ marginRight: 6 }} />
                  <Text style={styles.photoWarningText}>
                    Please upload at least one photo of your device to proceed.
                  </Text>
                </View>
              )}

              {/* Tips for better valuation */}
              <View style={styles.valuationTipsCard}>
                <View style={styles.tipsHeaderRow}>
                  <Ionicons name="bulb-outline" size={18} color="#0284C7" style={{ marginRight: 6 }} />
                  <Text style={styles.tipsHeaderTitle}>Tips for better valuation</Text>
                </View>
                <Text style={styles.tipBullet}>• Upload clear, well-lit photos</Text>
                <Text style={styles.tipBullet}>• Include all sides and any visible damage</Text>
                <Text style={styles.tipBullet}>• Make sure the device is clean</Text>
              </View>
            </View>
          )}

          {/* ================= STEP 6: PRICE & VALUATION ================= */}
          {step === 6 && (
            <View>
              <Text style={styles.stepTitle}>6. Price & Valuation</Text>
              <Text style={styles.stepSubtitle}>Get an estimated price for your device.</Text>

              {/* Estimated Value Card */}
              <View style={styles.valuationHighlightCard}>
                <View style={styles.valuationPhoneBox}>
                  <Image
                    source={typeof activeDeviceImage === 'number' ? activeDeviceImage : activeDeviceImage}
                    style={styles.valuationPhoneImg}
                    resizeMode="contain"
                  />
                </View>
                <View style={styles.valuationTextCol}>
                  <Text style={styles.valCardLabel}>Estimated Value</Text>
                  <Text style={styles.valCardPriceRange}>
                    {numericPrice > 0
                      ? `₹${Math.round(numericPrice * 0.95).toLocaleString('en-IN')} - ₹${Math.round(numericPrice * 1.05).toLocaleString('en-IN')}`
                      : 'Calculate quote'}
                  </Text>
                  <Text style={styles.valCardExplanation}>Based on your device details and market demand</Text>
                </View>
              </View>

              {/* Expected Selling Price Input */}
              <View style={styles.expectedPriceSection}>
                <Text style={styles.expectedPriceLabel}>Your Expected Selling Price</Text>
                <View style={styles.currencyInputBox}>
                  <Text style={styles.currencyPrefix}>₹</Text>
                  <TextInput
                    style={styles.currencyInput}
                    value={expectedPrice}
                    onChangeText={setExpectedPrice}
                    keyboardType="numeric"
                    placeholder="Enter expected amount (e.g. 45000)"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              {/* Price May Vary Info Alert */}
              <View style={styles.priceVaryNoticeCard}>
                <View style={styles.shieldNoticeIcon}>
                  <Ionicons name="shield-checkmark" size={18} color="#D97706" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.priceVaryTitle}>Final price may vary</Text>
                  <Text style={styles.priceVarySub}>
                    The final price will be confirmed after physical inspection of your device.
                  </Text>
                </View>
              </View>

              {/* Price Breakdown */}
              <View style={styles.breakdownCard}>
                <Text style={styles.breakdownHeading}>Price Breakdown (Estimated)</Text>

                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Base Value</Text>
                  <Text style={styles.breakdownValue}>₹{baseValue.toLocaleString('en-IN')}</Text>
                </View>

                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Condition Adjustment</Text>
                  <Text style={styles.breakdownValue}>+ ₹0</Text>
                </View>

                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Market Demand Bonus</Text>
                  <Text style={styles.breakdownValueHighlight}>+ ₹{marketBonus.toLocaleString('en-IN')}</Text>
                </View>

                <View style={styles.breakdownDivider} />

                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownTotalLabel}>Estimated Value</Text>
                  <Text style={styles.breakdownTotalValue}>₹{estimatedTotal.toLocaleString('en-IN')}</Text>
                </View>
              </View>
            </View>
          )}

          {/* ================= STEP 7: PICKUP & CONTACT DETAILS ================= */}
          {step === 7 && (
            <View>
              <Text style={styles.stepTitle}>7. Pickup & Contact Details</Text>
              <Text style={styles.stepSubtitle}>Enter your pickup details.</Text>

              {/* Name & Phone 2-Col */}
              <View style={styles.contactRow2Col}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputFieldLabel}>Full Name</Text>
                  <View style={styles.iconInputBox}>
                    <Ionicons name="person-outline" size={17} color="#64748B" style={{ marginRight: 6 }} />
                    <TextInput
                      style={styles.textInputPure}
                      value={fullName}
                      onChangeText={setFullName}
                      placeholder="Your Full Name"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.inputFieldLabel}>Mobile Number</Text>
                  <View style={styles.iconInputBox}>
                    <Ionicons name="call-outline" size={17} color="#64748B" style={{ marginRight: 6 }} />
                    <TextInput
                      style={styles.textInputPure}
                      value={mobileNumber}
                      onChangeText={setMobileNumber}
                      keyboardType="phone-pad"
                      placeholder="Mobile Number"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>
              </View>

              {/* Email */}
              <View style={styles.inputSection}>
                <Text style={styles.inputFieldLabel}>Email</Text>
                <View style={styles.iconInputBox}>
                  <Ionicons name="mail-outline" size={17} color="#64748B" style={{ marginRight: 6 }} />
                  <TextInput
                    style={styles.textInputPure}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    placeholder="email@example.com"
                    placeholderTextColor="#94A3B8"
                  />
                  <Ionicons name="lock-closed-outline" size={15} color="#94A3B8" />
                </View>
              </View>

              {/* Pickup Address Box */}
              <View style={styles.inputSection}>
                <Text style={styles.inputFieldLabel}>Pickup Address</Text>
                <View style={styles.pickupAddressCard}>
                  <View style={styles.addressRowTop}>
                    <Ionicons name="location-outline" size={20} color="#0F172A" style={{ marginRight: 8, marginTop: 2 }} />
                    <TextInput
                      style={[styles.textInputPure, { minHeight: 40, lineHeight: 18 }]}
                      multiline
                      value={pickupAddress}
                      onChangeText={setPickupAddress}
                      placeholder="Enter flat / house no., street, area, city & pincode"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.useCurrentLocBtn}
                    onPress={handleDetectLocation}
                    activeOpacity={0.8}
                  >
                    {isDetectingLocation ? (
                      <ActivityIndicator size="small" color="#0F172A" style={{ marginRight: 6 }} />
                    ) : (
                      <Ionicons name="locate" size={16} color="#0F172A" style={{ marginRight: 6 }} />
                    )}
                    <Text style={styles.useCurrentLocText}>Use Current Location</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Preferred Pickup Date */}
              <View style={styles.inputSection}>
                <Text style={styles.inputFieldLabel}>Preferred Pickup Date</Text>
                <TouchableOpacity
                  style={styles.dateSelectorBox}
                  onPress={() => setShowDatePickerModal(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="calendar-outline" size={18} color="#0F172A" style={{ marginRight: 8 }} />
                  <Text style={[styles.dateSelectorText, !pickupDate && { color: '#94A3B8' }]}>
                    {pickupDate || 'Select preferred date'}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color="#64748B" style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>
              </View>

              {/* Additional Notes (Optional) */}
              <View style={styles.inputSection}>
                <Text style={styles.inputFieldLabel}>Additional Notes (Optional)</Text>
                <View style={[styles.iconInputBox, { height: 46 }]}>
                  <TextInput
                    style={styles.textInputPure}
                    value={additionalNotes}
                    onChangeText={setAdditionalNotes}
                    placeholder="Any special instructions for pickup agent?"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>
            </View>
          )}

          {/* ================= STEP 8: REVIEW & SUBMIT ================= */}
          {step === 8 && (
            <View>
              <Text style={styles.stepTitle}>8. Review & Submit</Text>
              <Text style={styles.stepSubtitle}>Please review your details before submitting.</Text>

              {/* Review Card */}
              <View style={styles.reviewCard}>
                {/* Category */}
                <View style={styles.reviewRow}>
                  <View style={styles.reviewRowLeft}>
                    <Ionicons name="phone-portrait-outline" size={16} color="#64748B" style={{ marginRight: 6 }} />
                    <Text style={styles.reviewRowLabel}>Device Category</Text>
                  </View>
                  <Text style={styles.reviewRowValue}>
                    {SELL_CATEGORIES.find((c) => c.id === selectedCategory)?.name || 'Not selected'}
                  </Text>
                  <TouchableOpacity onPress={() => setStep(1)} style={styles.reviewEditBtn}>
                    <Ionicons name="pencil" size={12} color="#D97706" style={{ marginRight: 2 }} />
                    <Text style={styles.reviewEditText}>Edit</Text>
                  </TouchableOpacity>
                </View>

                {/* Brand */}
                <View style={styles.reviewRow}>
                  <View style={styles.reviewRowLeft}>
                    <Ionicons name="pricetag-outline" size={16} color="#64748B" style={{ marginRight: 6 }} />
                    <Text style={styles.reviewRowLabel}>Brand</Text>
                  </View>
                  <Text style={styles.reviewRowValue}>{selectedBrandName || 'Not selected'}</Text>
                  <TouchableOpacity onPress={() => setStep(2)} style={styles.reviewEditBtn}>
                    <Ionicons name="pencil" size={12} color="#D97706" style={{ marginRight: 2 }} />
                    <Text style={styles.reviewEditText}>Edit</Text>
                  </TouchableOpacity>
                </View>

                {/* Model */}
                <View style={styles.reviewRow}>
                  <View style={styles.reviewRowLeft}>
                    <Ionicons name="phone-portrait-outline" size={16} color="#64748B" style={{ marginRight: 6 }} />
                    <Text style={styles.reviewRowLabel}>Model</Text>
                  </View>
                  <Text style={styles.reviewRowValue}>{selectedModel || 'Not selected'}</Text>
                  <TouchableOpacity onPress={() => setStep(3)} style={styles.reviewEditBtn}>
                    <Ionicons name="pencil" size={12} color="#D97706" style={{ marginRight: 2 }} />
                    <Text style={styles.reviewEditText}>Edit</Text>
                  </TouchableOpacity>
                </View>

                {/* Specifications */}
                <View style={[styles.reviewRow, { alignItems: 'flex-start' }]}>
                  <View style={[styles.reviewRowLeft, { marginTop: 2 }]}>
                    <Ionicons name="options-outline" size={16} color="#64748B" style={{ marginRight: 6 }} />
                    <Text style={styles.reviewRowLabel}>Specifications</Text>
                  </View>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.reviewRowValueMultiline}>
                      {selectedStorage || '—'} · {selectedColor || '—'} · {selectedCondition || '—'} Condition
                    </Text>
                    <Text style={styles.reviewRowSubMultiline}>
                      {selectedAge || 'Age not specified'} · Accessories: {hasAccessories ? 'Yes' : 'No'}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setStep(4)} style={styles.reviewEditBtn}>
                    <Ionicons name="pencil" size={12} color="#D97706" style={{ marginRight: 2 }} />
                    <Text style={styles.reviewEditText}>Edit</Text>
                  </TouchableOpacity>
                </View>

                {/* Uploaded Photos */}
                <View style={styles.reviewRow}>
                  <View style={styles.reviewRowLeft}>
                    <Ionicons name="images-outline" size={16} color="#64748B" style={{ marginRight: 6 }} />
                    <Text style={styles.reviewRowLabel}>Uploaded Photos</Text>
                  </View>
                  <Text style={styles.reviewRowValue}>{photos.length} photo{photos.length === 1 ? '' : 's'}</Text>
                  <TouchableOpacity onPress={() => setStep(5)} style={styles.reviewEditBtn}>
                    <Ionicons name="pencil" size={12} color="#D97706" style={{ marginRight: 2 }} />
                    <Text style={styles.reviewEditText}>Edit</Text>
                  </TouchableOpacity>
                </View>

                {/* Expected Price */}
                <View style={styles.reviewRow}>
                  <View style={styles.reviewRowLeft}>
                    <Ionicons name="cash-outline" size={16} color="#64748B" style={{ marginRight: 6 }} />
                    <Text style={styles.reviewRowLabel}>Expected Price</Text>
                  </View>
                  <Text style={styles.reviewRowValue}>
                    ₹{numericPrice.toLocaleString('en-IN')}
                  </Text>
                  <TouchableOpacity onPress={() => setStep(6)} style={styles.reviewEditBtn}>
                    <Ionicons name="pencil" size={12} color="#D97706" style={{ marginRight: 2 }} />
                    <Text style={styles.reviewEditText}>Edit</Text>
                  </TouchableOpacity>
                </View>

                {/* Pickup Details */}
                <View style={[styles.reviewRow, { alignItems: 'flex-start', borderBottomWidth: 0 }]}>
                  <View style={[styles.reviewRowLeft, { marginTop: 2 }]}>
                    <Ionicons name="location-outline" size={16} color="#64748B" style={{ marginRight: 6 }} />
                    <Text style={styles.reviewRowLabel}>Pickup Details</Text>
                  </View>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.reviewRowValueMultiline}>{pickupAddress || 'Address not specified'}</Text>
                    <Text style={[styles.reviewRowSubMultiline, { marginTop: 3, fontWeight: '700', color: '#0F172A' }]}>
                      Pickup Date: {pickupDate || 'Not selected'}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setStep(7)} style={styles.reviewEditBtn}>
                    <Ionicons name="pencil" size={12} color="#D97706" style={{ marginRight: 2 }} />
                    <Text style={styles.reviewEditText}>Edit</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Terms Checkbox */}
              <TouchableOpacity
                style={styles.termsRow}
                onPress={() => setAgreedTerms(!agreedTerms)}
                activeOpacity={0.8}
              >
                <View style={[styles.checkboxBox, agreedTerms && styles.checkboxBoxChecked]}>
                  {agreedTerms && <AnimatedTick size={14} />}
                </View>
                <Text style={styles.termsText}>
                  I agree to the <Text style={{ color: '#2563EB', textDecorationLine: 'underline' }}>Terms & Conditions</Text> and confirm that the information provided is correct.
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* BOTTOM NAVIGATION BUTTONS ROW */}
          <View style={styles.bottomNavRow}>
            {step > 1 && (
              <TouchableOpacity
                style={styles.backButtonWhite}
                onPress={handleBack}
                activeOpacity={0.8}
              >
                <Text style={styles.backButtonWhiteText}>Back</Text>
              </TouchableOpacity>
            )}

            {step < 8 ? (
              <TouchableOpacity
                style={[styles.nextButtonYellow, step === 1 && { flex: 1 }]}
                onPress={handleNext}
                activeOpacity={0.85}
              >
                <Text style={styles.nextButtonYellowText}>Next</Text>
                <Ionicons name="arrow-forward" size={17} color="#0F172A" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.submitButtonYellow}
                onPress={handleSubmitRequest}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#0F172A" />
                ) : (
                  <>
                    <Text style={styles.submitButtonYellowText}>Submit Sell Request</Text>
                    <Ionicons name="arrow-forward" size={17} color="#0F172A" style={{ marginLeft: 6 }} />
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* MODAL 1: AGE PICKER */}
      <Modal visible={showAgePickerModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <Text style={styles.modalHeading}>Select Device Age</Text>
            {AGE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={styles.modalOptionRow}
                onPress={() => {
                  setSelectedAge(opt);
                  setShowAgePickerModal(false);
                }}
              >
                <Text style={styles.modalOptionText}>{opt}</Text>
                {selectedAge === opt && <AnimatedTick size={18} />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowAgePickerModal(false)}>
              <Text style={styles.modalCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: DATE PICKER */}
      <Modal visible={showDatePickerModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <Text style={styles.modalHeading}>Preferred Pickup Date</Text>
            {upcomingDates.map((d) => (
              <TouchableOpacity
                key={d}
                style={styles.modalOptionRow}
                onPress={() => {
                  setPickupDate(d);
                  setShowDatePickerModal(false);
                }}
              >
                <Text style={styles.modalOptionText}>{d}</Text>
                {pickupDate === d && <AnimatedTick size={18} />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowDatePickerModal(false)}>
              <Text style={styles.modalCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: CUSTOM BRAND */}
      <Modal visible={showCustomBrandModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <Text style={styles.modalHeading}>Enter Brand Name</Text>
            <TextInput
              style={styles.modalTextInput}
              placeholder="e.g. Asus, Acer, Nothing, Sony"
              placeholderTextColor="#94A3B8"
              value={customBrand}
              onChangeText={setCustomBrand}
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { flex: 1, marginTop: 0 }]}
                onPress={() => setShowCustomBrandModal(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.nextButtonYellow, { flex: 1, height: 42 }]}
                onPress={handleAddCustomBrand}
              >
                <Text style={styles.nextButtonYellowText}>Add Brand</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 4: CUSTOM MODEL */}
      <Modal visible={showCustomModelModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <Text style={styles.modalHeading}>Enter Model Name</Text>
            <TextInput
              style={styles.modalTextInput}
              placeholder="e.g. iPhone 12 Mini, Galaxy S24"
              placeholderTextColor="#94A3B8"
              value={customModel}
              onChangeText={setCustomModel}
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { flex: 1, marginTop: 0 }]}
                onPress={() => setShowCustomModelModal(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.nextButtonYellow, { flex: 1, height: 42 }]}
                onPress={handleAddCustomModel}
              >
                <Text style={styles.nextButtonYellowText}>Add Model</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  /* TOP HEADER */
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleCol: {
    alignItems: 'center',
  },
  headerMainTitle: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 16.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubTitle: {
    marginTop: 2,
    fontFamily: renewxFontFamily.regular,
    fontSize: 11.5,
    color: '#64748B',
  },

  /* STEPPER NODES */
  stepperContainer: {
    position: 'relative',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  stepperLineBackdrop: {
    position: 'absolute',
    top: 23,
    left: 30,
    right: 30,
    height: 2.5,
    backgroundColor: '#E2E8F0',
  },
  stepperLineActive: {
    position: 'absolute',
    top: 23,
    left: 30,
    height: 2.5,
    backgroundColor: '#FBBF24',
  },
  stepperNodesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepperNode: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  stepperNodeActive: {
    backgroundColor: '#FBBF24',
    borderColor: '#F59E0B',
    transform: [{ scale: 1.15 }],
  },
  stepperNodeDone: {
    backgroundColor: '#FEF08A',
    borderColor: '#FDE047',
  },
  stepperNodeText: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 10,
    color: '#94A3B8',
  },
  stepperNodeTextActive: {
    color: '#0F172A',
    fontWeight: '900',
  },
  stepperNodeTextDone: {
    color: '#0F172A',
    fontWeight: '700',
  },

  /* SCROLL CONTENT */
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 120,
  },
  stepTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepTitle: {
    fontFamily: renewxFontFamily.extraBold,
    fontSize: 19,
    fontWeight: '900',
    color: '#0F172A',
  },
  stepSubtitle: {
    marginTop: 4,
    marginBottom: 18,
    fontFamily: renewxFontFamily.regular,
    fontSize: 13,
    color: '#64748B',
  },
  requiredBadge: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  requiredBadgeSuccess: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  requiredBadgeText: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 10,
    color: '#DC2626',
    fontWeight: '800',
  },
  requiredBadgeTextSuccess: {
    color: '#16A34A',
  },

  /* SEARCH BAR */
  searchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontFamily: renewxFontFamily.regular,
    fontSize: 13,
    color: '#0F172A',
    padding: 0,
    ...Platform.select({ web: { outlineStyle: 'none' } as any }),
  },

  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    gap: 8,
  },
  loadingText: {
    fontFamily: renewxFontFamily.medium,
    fontSize: 12,
    color: '#64748B',
  },

  /* STEP 1: CATEGORY GRID */
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: '31%',
    aspectRatio: 0.9,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    padding: 8,
  },
  categoryCardSelected: {
    borderColor: '#FDE047',
    borderWidth: 2,
    backgroundColor: '#FFFDF5',
  },
  catImgBox: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  catImg: {
    width: '100%',
    height: '100%',
  },
  catName: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
  },
  catNameSelected: {
    color: '#0F172A',
    fontWeight: '800',
  },
  cornerTickBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    zIndex: 5,
  },

  /* STEP 2: BRANDS GRID */
  brandsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  brandCard: {
    width: '31.3%',
    height: 64,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    padding: 10,
  },
  brandCardSelected: {
    borderColor: '#FDE047',
    borderWidth: 2,
    backgroundColor: '#FFFDF5',
  },
  brandCardOther: {
    borderStyle: 'dashed',
  },
  brandLogoImg: {
    width: '80%',
    height: '80%',
  },
  brandNameText: {
    marginTop: 2,
    fontFamily: renewxFontFamily.bold,
    fontSize: 10,
    color: '#64748B',
  },

  /* STEP 3: MODELS LIST */
  modelsList: {
    gap: 10,
  },
  modelRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  modelRowCardSelected: {
    borderColor: '#FDE047',
    borderWidth: 2,
    backgroundColor: '#FFFDF5',
  },
  modelThumbImg: {
    width: 32,
    height: 38,
  },
  modelNameText: {
    flex: 1,
    fontFamily: renewxFontFamily.bold,
    fontSize: 13.5,
    fontWeight: '700',
    color: '#334155',
  },
  modelNameTextSelected: {
    color: '#0F172A',
    fontWeight: '800',
  },
  modelRowCardOther: {
    borderStyle: 'dashed',
  },
  otherModelDotBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otherModelTitle: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 13,
    color: '#0F172A',
  },
  otherModelSub: {
    fontFamily: renewxFontFamily.regular,
    fontSize: 10.5,
    color: '#64748B',
  },

  /* STEP 4: SPECS & CONDITION */
  selectedModelHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    marginBottom: 18,
    gap: 12,
  },
  selectedHeaderImg: {
    width: 36,
    height: 44,
  },
  selectedHeaderModelName: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  selectedHeaderBrandName: {
    fontFamily: renewxFontFamily.regular,
    fontSize: 12,
    color: '#64748B',
  },
  changeModelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  changeModelBtnText: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 11.5,
    color: '#0F172A',
  },

  specSection: {
    marginBottom: 16,
  },
  specSectionLabel: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  specChipSelected: {
    backgroundColor: '#FEF08A',
    borderColor: '#FDE047',
  },
  specChipText: {
    fontFamily: renewxFontFamily.semibold,
    fontSize: 12,
    color: '#475569',
  },
  specChipTextSelected: {
    color: '#0F172A',
    fontWeight: '800',
  },
  yesNoRow: {
    flexDirection: 'row',
    gap: 10,
  },
  yesNoBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  yesNoBtnSelected: {
    backgroundColor: '#FEF08A',
    borderColor: '#FDE047',
  },
  yesNoBtnText: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 13,
    color: '#475569',
  },
  yesNoBtnTextSelected: {
    color: '#0F172A',
    fontWeight: '800',
  },
  dropdownSelector: {
    height: 44,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownSelectorText: {
    fontFamily: renewxFontFamily.regular,
    fontSize: 13,
    color: '#0F172A',
  },

  /* STEP 5: PHOTOS GRID */
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  photoSlotCard: {
    width: '31.3%',
    aspectRatio: 0.9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoSlotImg: {
    width: '100%',
    height: '75%',
  },
  photoSlotLabel: {
    marginTop: 4,
    fontFamily: renewxFontFamily.medium,
    fontSize: 9.5,
    color: '#64748B',
    textAlign: 'center',
  },
  photoRemoveBtn: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  addPhotoSlotCard: {
    width: '31.3%',
    aspectRatio: 0.9,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FEF08A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  addPhotoText: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 11,
    color: '#0F172A',
  },
  photoWarningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  photoWarningText: {
    fontFamily: renewxFontFamily.semibold,
    fontSize: 12,
    color: '#DC2626',
    flex: 1,
  },
  valuationTipsCard: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 14,
    padding: 14,
  },
  tipsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  tipsHeaderTitle: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 13,
    fontWeight: '800',
    color: '#0369A1',
  },
  tipBullet: {
    fontFamily: renewxFontFamily.regular,
    fontSize: 11.5,
    color: '#475569',
    lineHeight: 18,
  },

  /* STEP 6: PRICE & VALUATION */
  valuationHighlightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 14,
    marginBottom: 16,
  },
  valuationPhoneBox: {
    width: 58,
    height: 72,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  valuationPhoneImg: {
    width: '100%',
    height: '100%',
  },
  valuationTextCol: {
    flex: 1,
  },
  valCardLabel: {
    fontFamily: renewxFontFamily.medium,
    fontSize: 11.5,
    color: '#64748B',
  },
  valCardPriceRange: {
    fontFamily: renewxFontFamily.extraBold,
    fontSize: 21,
    fontWeight: '900',
    color: '#0F172A',
    marginVertical: 2,
  },
  valCardExplanation: {
    fontFamily: renewxFontFamily.regular,
    fontSize: 10.5,
    color: '#64748B',
  },
  expectedPriceSection: {
    marginBottom: 14,
  },
  expectedPriceLabel: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  currencyInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
  },
  currencyPrefix: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 16,
    color: '#0F172A',
    marginRight: 8,
  },
  currencyInput: {
    flex: 1,
    fontFamily: renewxFontFamily.bold,
    fontSize: 16,
    color: '#0F172A',
    padding: 0,
    ...Platform.select({ web: { outlineStyle: 'none' } as any }),
  },
  priceVaryNoticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFDF5',
    borderWidth: 1,
    borderColor: '#FEF08A',
    borderRadius: 12,
    padding: 12,
    gap: 10,
    marginBottom: 16,
  },
  shieldNoticeIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FEF08A',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  priceVaryTitle: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 12.5,
    fontWeight: '800',
    color: '#B45309',
  },
  priceVarySub: {
    marginTop: 2,
    fontFamily: renewxFontFamily.regular,
    fontSize: 11,
    color: '#78350F',
    lineHeight: 15,
  },
  breakdownCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
  },
  breakdownHeading: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  breakdownLabel: {
    fontFamily: renewxFontFamily.regular,
    fontSize: 12,
    color: '#64748B',
  },
  breakdownValue: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 12.5,
    color: '#0F172A',
  },
  breakdownValueHighlight: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 12.5,
    color: '#16A34A',
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 8,
  },
  breakdownTotalLabel: {
    fontFamily: renewxFontFamily.extraBold,
    fontSize: 13.5,
    fontWeight: '900',
    color: '#0F172A',
  },
  breakdownTotalValue: {
    fontFamily: renewxFontFamily.extraBold,
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },

  /* STEP 7: PICKUP & CONTACT */
  contactRow2Col: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  inputSection: {
    marginBottom: 12,
  },
  inputFieldLabel: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 5,
  },
  iconInputBox: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  textInputPure: {
    flex: 1,
    fontFamily: renewxFontFamily.regular,
    fontSize: 12.5,
    color: '#0F172A',
    padding: 0,
    ...Platform.select({ web: { outlineStyle: 'none' } as any }),
  },
  pickupAddressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
  },
  addressRowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  addressCardText: {
    flex: 1,
    fontFamily: renewxFontFamily.regular,
    fontSize: 12,
    color: '#334155',
    lineHeight: 17,
  },
  useCurrentLocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FEF08A',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  useCurrentLocText: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  dateSelectorBox: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  dateSelectorText: {
    fontFamily: renewxFontFamily.medium,
    fontSize: 12.5,
    color: '#0F172A',
  },

  /* STEP 8: REVIEW & SUBMIT */
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 14,
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  reviewRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 130,
  },
  reviewRowLabel: {
    fontFamily: renewxFontFamily.semibold,
    fontSize: 12,
    color: '#64748B',
  },
  reviewRowValue: {
    flex: 1,
    fontFamily: renewxFontFamily.bold,
    fontSize: 12.5,
    color: '#0F172A',
  },
  reviewRowValueMultiline: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 12,
    color: '#0F172A',
  },
  reviewRowSubMultiline: {
    marginTop: 2,
    fontFamily: renewxFontFamily.regular,
    fontSize: 11,
    color: '#64748B',
  },
  reviewEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  reviewEditText: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 11,
    color: '#D97706',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 6,
  },
  checkboxBox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxBoxChecked: {
    backgroundColor: '#FBBF24',
    borderColor: '#F59E0B',
  },
  termsText: {
    flex: 1,
    fontFamily: renewxFontFamily.regular,
    fontSize: 11.5,
    color: '#475569',
    lineHeight: 16,
  },

  /* BOTTOM NAVIGATION BAR */
  bottomNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 24,
  },
  backButtonWhite: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonWhiteText: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 14,
    color: '#0F172A',
  },
  nextButtonYellow: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FBBF24',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonYellowText: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  submitButtonYellow: {
    flex: 1.6,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FBBF24',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonYellowText: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },

  /* MODALS */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalBox: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
  },
  modalHeading: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 14,
  },
  modalOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalOptionText: {
    fontFamily: renewxFontFamily.semibold,
    fontSize: 13.5,
    color: '#334155',
  },
  modalTextInput: {
    height: 44,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#0F172A',
    ...Platform.select({ web: { outlineStyle: 'none' } as any }),
  },
  modalCancelBtn: {
    marginTop: 14,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 13,
    color: '#64748B',
  },

  /* SUCCESS SCREEN */
  successScroll: {
    padding: 24,
    alignItems: 'center',
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 16,
  },
  successHeadTitle: {
    fontFamily: renewxFontFamily.extraBold,
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
  },
  successBodyText: {
    marginTop: 8,
    fontFamily: renewxFontFamily.regular,
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  successSummaryCard: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 20,
    gap: 8,
  },
  summaryItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryItemLabel: {
    fontFamily: renewxFontFamily.medium,
    fontSize: 12,
    color: '#64748B',
  },
  summaryItemValue: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 12.5,
    color: '#0F172A',
  },
  summaryItemValueHighlight: {
    fontFamily: renewxFontFamily.extraBold,
    fontSize: 14,
    color: '#16A34A',
  },
  primaryYellowBtn: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FBBF24',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  primaryYellowBtnText: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  secondaryWhiteBtn: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryWhiteBtnText: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 13.5,
    color: '#0F172A',
  },
});
