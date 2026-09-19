import { useEffect, useState } from 'react';
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '@/theme';
import { api } from '@/services/api';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';

interface CategoryItem {
  id: string;
  name: string;
  maxPrice: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const categories: CategoryItem[] = [
  {
    id: 'phones',
    name: 'Smartphones',
    maxPrice: '₹75,000',
    icon: 'phone-portrait-outline',
  },
  {
    id: 'macbooks',
    name: 'MacBooks',
    maxPrice: '₹1,25,000',
    icon: 'laptop-outline',
  },
  {
    id: 'laptops',
    name: 'Windows Laptops',
    maxPrice: '₹65,000',
    icon: 'desktop-outline',
  },
  {
    id: 'tablets',
    name: 'Tablets & iPads',
    maxPrice: '₹48,000',
    icon: 'tablet-portrait-outline',
  },
  {
    id: 'smartwatches',
    name: 'Smartwatches & Audio',
    maxPrice: '₹24,000',
    icon: 'watch-outline',
  },
];

export default function SellScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Category
  const [selectedCat, setSelectedCat] = useState<CategoryItem>(categories[0]);

  // Step 2: Brand, Model, Storage
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedStorage, setSelectedStorage] = useState('');
  const [brands, setBrands] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [storageOptions, setStorageOptions] = useState<string[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);

  // Step 3: Condition
  const [screenCond, setScreenCond] = useState<'flawless' | 'good' | 'cracked'>('flawless');
  const [bodyCond, setBodyCond] = useState<'likenew' | 'fair' | 'dented'>('likenew');
  const [switchesOn, setSwitchesOn] = useState(true);
  const [touchWorking, setTouchWorking] = useState(true);
  const [cameraClear, setCameraClear] = useState(true);
  const [batteryHealthy, setBatteryHealthy] = useState(true);
  const [hasBox, setHasBox] = useState(true);
  const [hasCharger, setHasCharger] = useState(true);
  const [hasBill, setHasBill] = useState(true);

  // Step 4: Contact & Pickup details
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userPincode, setUserPincode] = useState('');
  const [userAddress, setUserAddress] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [bookingId, setBookingId] = useState('');

  useEffect(() => {
    let active = true;
    setCatalogLoading(true);
    setBrands([]);
    setModels([]);
    setStorageOptions([]);
    setSelectedBrand('');
    setSelectedModel('');
    setSelectedStorage('');

    api.brands.getAll({ category: selectedCat.name }).then((rows: any[]) => {
      if (!active) return;
      const next = Array.isArray(rows) ? rows : [];
      setBrands(next);
      setSelectedBrand(next[0]?.name || '');
    }).catch((err: any) => {
      if (active) Alert.alert('Catalog unavailable', err?.message || 'Unable to load brands. Please try again.');
    }).finally(() => {
      if (active) setCatalogLoading(false);
    });

    return () => { active = false; };
  }, [selectedCat.name]);

  useEffect(() => {
    if (!selectedBrand) return;
    let active = true;
    setCatalogLoading(true);
    setModels([]);
    setStorageOptions([]);
    setSelectedModel('');
    setSelectedStorage('');

    const brand = brands.find((item) => item.name === selectedBrand);
    api.models.getAll({
      category: selectedCat.name,
      brand_id: brand?.id || 'all',
    }).then((rows: any[]) => {
      if (!active) return;
      const next = Array.isArray(rows) ? rows : [];
      setModels(next);
      const first = next[0];
      setSelectedModel(first?.name || '');
      const options = Array.isArray(first?.storage_options) ? first.storage_options : [];
      setStorageOptions(options);
      setSelectedStorage(options[0] || '');
    }).catch((err: any) => {
      if (active) Alert.alert('Model catalog unavailable', err?.message || 'Unable to load device models.');
    }).finally(() => {
      if (active) setCatalogLoading(false);
    });

    return () => { active = false; };
  }, [selectedCat.name, selectedBrand, brands]);

  useEffect(() => {
    const selected = models.find((item) => item.name === selectedModel);
    const options = Array.isArray(selected?.storage_options) ? selected.storage_options : [];
    setStorageOptions(options);
    if (!options.includes(selectedStorage)) setSelectedStorage(options[0] || '');
  }, [models, selectedModel]);

  const [quoteAmount, setQuoteAmount] = useState(0);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedBrand || !selectedModel || !selectedStorage) {
      setQuoteAmount(0);
      setQuoteError(null);
      setQuoteLoading(false);
      return;
    }

    let active = true;
    setQuoteLoading(true);
    setQuoteError(null);

    api.tradeIn.getQuote({
      category: selectedCat.name,
      brand: selectedBrand,
      model: selectedModel,
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
    }).then((result: any) => {
      if (!active) return;
      setQuoteAmount(Number(result?.valuation || 0));
    }).catch((err: any) => {
      if (!active) return;
      setQuoteAmount(0);
      setQuoteError(err?.message || 'Unable to calculate the current estimate.');
    }).finally(() => {
      if (active) setQuoteLoading(false);
    });

    return () => { active = false; };
  }, [
    selectedCat.name,
    selectedBrand,
    selectedModel,
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

  const handleBookPickup = async () => {
    if (!userName.trim() || !userPhone.trim() || !userPincode.trim()) {
      toast.warning('Please enter your name, phone number, and pickup pincode.', 'Missing Details');
      return;
    }

    if (quoteLoading || !quoteAmount) {
      toast.warning('Please wait for the latest device valuation.', 'Valuation unavailable');
      return;
    }
    if (!user) {
      toast.error('Please sign in before submitting a sell request.', 'Sign in required');
      return;
    }

    try {
      const res = await api.tradeIn.createPickup({
        category: selectedCat.name,
        brand: selectedBrand,
        model: selectedModel,
        storage: selectedStorage,
        valuationAmount: quoteAmount,
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
        },
      });

      setBookingId(res?.id || res?.pickupId || res?.trackingNumber || 'Submitted');
      setIsSubmitted(true);
      toast.success(`Sell request submitted for ₹${quoteAmount.toLocaleString('en-IN')}. Awaiting admin approval.`, 'Request Submitted');
    } catch (err: any) {
      console.warn('[SellScreen] Pickup submission failed:', err);
      toast.error(err?.message || 'Unable to submit your sell request. Please try again.', 'Submission Failed');
    }
  };

  const handleReset = () => {
    setIsSubmitted(false);
    setStep(1);
    setUserName('');
    setUserPhone('');
    setUserPincode('');
    setUserAddress('');
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
      {/* Header Bar */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle}>Sell Old Device</Text>
          <View style={styles.instantCashPill}>
            <Ionicons name="flash" size={12} color="#059669" />
            <Text style={styles.instantCashText}>Instant Cash</Text>
          </View>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            backgroundColor: '#f1f5f9',
            paddingHorizontal: 7,
            paddingVertical: 2,
            borderRadius: 6,
            marginLeft: 'auto',
          }}>
            <Ionicons name="link-outline" size={11} color="#64748b" />
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#475569', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
              /sell
            </Text>
          </View>
        </View>
        <Text style={styles.headerSubtitle}>Submit your device • Get reviewed • Receive your approved offer</Text>
      </View>

      {/* Stepper Wizard Bar */}
      <View style={styles.stepperContainer}>
        {[
          { num: 1, label: 'Category' },
          { num: 2, label: 'Model' },
          { num: 3, label: 'Condition' },
          { num: 4, label: 'Quote' },
        ].map((item, index) => {
          const isActive = step === item.num;
          const isDone = step > item.num;
          return (
            <View key={item.num} style={styles.stepItemWrapper}>
              <TouchableOpacity
                onPress={() => {
                  if (item.num <= step) setStep(item.num as any);
                }}
                style={styles.stepTouch}
              >
                <View
                  style={[
                    styles.stepCircle,
                    isActive && styles.stepCircleActive,
                    isDone && styles.stepCircleDone,
                  ]}
                >
                  {isDone ? (
                    <Ionicons name="checkmark" size={12} color="#ffffff" />
                  ) : (
                    <Text
                      style={[
                        styles.stepNumber,
                        isActive && styles.stepNumberActive,
                      ]}
                    >
                      {item.num}
                    </Text>
                  )}
                </View>
                <Text style={[styles.stepLabel, isActive && styles.stepLabelActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
              {index < 3 && (
                <View
                  style={[
                    styles.stepConnector,
                    step > item.num && styles.stepConnectorActive,
                  ]}
                />
              )}
            </View>
          );
        })}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollBody, { paddingBottom: 120 }]}
      >
        {/* STEP 1: Select Category */}
        {step === 1 && (
          <View style={styles.stepSection}>
            <Text style={styles.sectionHeading}>Select Your Device Category</Text>
            <Text style={styles.sectionSub}>Choose what you want to trade-in for instant cash</Text>

            <View style={styles.categoryGrid}>
              {categories.map((cat) => {
                const isSel = selectedCat.id === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.categoryCard, isSel && styles.categoryCardActive]}
                    onPress={() => {
                      setSelectedCat(cat);
                      const brands = brandList[cat.id] || ['Apple'];
                      setSelectedBrand(brands[0]);
                      setSelectedModel(cat.popularModels[0]);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.categoryIconCircle, isSel && styles.categoryIconCircleActive]}>
                      <Ionicons
                        name={cat.icon}
                        size={24}
                        color={isSel ? '#0a0a0a' : '#4b5563'}
                      />
                    </View>
                    <Text style={[styles.categoryName, isSel && styles.categoryNameActive]}>
                      {cat.name}
                    </Text>
                    <View style={styles.maxPricePill}>
                      <Text style={styles.maxPriceText}>Up to {cat.maxPrice}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.nextButton}
              onPress={() => setStep(2)}
              activeOpacity={0.85}
            >
              <Text style={styles.nextButtonText}>Continue to Model Details</Text>
              <Ionicons name="arrow-forward" size={18} color="#000000" />
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 2: Brand, Model & Storage */}
        {step === 2 && (
          <View style={styles.stepSection}>
            <Text style={styles.sectionHeading}>Select Brand & Model</Text>
            <Text style={styles.sectionSub}>Choose a device from the live RenewX catalog</Text>

            {/* Brand Pills */}
            <Text style={styles.fieldLabel}>Brand</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsScroll}>
              {(brandList[selectedCat.id] || ['Apple', 'Samsung', 'Dell']).map((b) => (
                <TouchableOpacity
                  key={b}
                  style={[styles.chipPill, selectedBrand === b.name && styles.chipPillActive]}
                  onPress={() => setSelectedBrand(b.name)}
                >
                  <Text style={[styles.chipText, selectedBrand === b && styles.chipTextActive]}>
                    {b}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Popular Models */}
            <Text style={styles.fieldLabel}>Select Model</Text>
            <View style={styles.modelList}>
              {models.map((model) => {
                const m = model.name;
                const isSel = selectedModel === m;
                return (
                  <TouchableOpacity
                    key={m}
                    style={[styles.modelItem, isSel && styles.modelItemActive]}
                    onPress={() => setSelectedModel(m)}
                  >
                    <Ionicons
                      name={isSel ? 'radio-button-on' : 'radio-button-off'}
                      size={18}
                      color={isSel ? '#ffc400' : '#9ca3af'}
                    />
                    <Text style={[styles.modelItemText, isSel && styles.modelItemTextActive]}>
                      {m}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Storage capacity */}
            <Text style={styles.fieldLabel}>Storage Capacity</Text>
            <View style={styles.storageRow}>
              {storageOptions.map((st) => (
                <TouchableOpacity
                  key={st}
                  style={[styles.storageChip, selectedStorage === st && styles.storageChipActive]}
                  onPress={() => setSelectedStorage(st)}
                >
                  <Text style={[styles.storageText, selectedStorage === st && styles.storageTextActive]}>
                    {st}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setStep(1)}
              >
                <Ionicons name="arrow-back" size={18} color="#4b5563" />
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.nextButton, { flex: 1 }]}
                onPress={() => setStep(3)}
              >
                <Text style={styles.nextButtonText}>Check Condition</Text>
                <Ionicons name="arrow-forward" size={18} color="#000000" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* STEP 3: Condition Questions */}
        {step === 3 && (
          <View style={styles.stepSection}>
            <Text style={styles.sectionHeading}>Device Condition</Text>
            <Text style={styles.sectionSub}>Honest answers ensure 100% price match during pickup</Text>

            {/* Screen Condition */}
            <Text style={styles.fieldLabel}>Screen Condition</Text>
            <View style={styles.optionCardsRow}>
              {[
                { key: 'flawless', label: 'Flawless', desc: 'No scratches' },
                { key: 'good', label: 'Good', desc: 'Minor hairline scuffs' },
                { key: 'cracked', label: 'Cracked', desc: 'Broken glass/lines' },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.condCard, screenCond === opt.key && styles.condCardActive]}
                  onPress={() => setScreenCond(opt.key as any)}
                >
                  <Text style={[styles.condCardTitle, screenCond === opt.key && styles.condCardTitleActive]}>
                    {opt.label}
                  </Text>
                  <Text style={styles.condCardDesc}>{opt.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Body Condition */}
            <Text style={styles.fieldLabel}>Body & Edges</Text>
            <View style={styles.optionCardsRow}>
              {[
                { key: 'likenew', label: 'Like New', desc: 'Zero dents' },
                { key: 'fair', label: 'Normal Wear', desc: 'Tiny chips/scuffs' },
                { key: 'dented', label: 'Heavy Dents', desc: 'Visible drops' },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.condCard, bodyCond === opt.key && styles.condCardActive]}
                  onPress={() => setBodyCond(opt.key as any)}
                >
                  <Text style={[styles.condCardTitle, bodyCond === opt.key && styles.condCardTitleActive]}>
                    {opt.label}
                  </Text>
                  <Text style={styles.condCardDesc}>{opt.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Functional Checkboxes */}
            <Text style={styles.fieldLabel}>Functional Checks</Text>
            <View style={styles.checkCard}>
              <TouchableOpacity
                style={styles.checkItem}
                onPress={() => setSwitchesOn(!switchesOn)}
              >
                <Ionicons
                  name={switchesOn ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={switchesOn ? '#059669' : '#9ca3af'}
                />
                <Text style={styles.checkLabel}>Device turns on and charges normally</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkItem}
                onPress={() => setTouchWorking(!touchWorking)}
              >
                <Ionicons
                  name={touchWorking ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={touchWorking ? '#059669' : '#9ca3af'}
                />
                <Text style={styles.checkLabel}>Touchscreen and buttons respond well</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkItem}
                onPress={() => setCameraClear(!cameraClear)}
              >
                <Ionicons
                  name={cameraClear ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={cameraClear ? '#059669' : '#9ca3af'}
                />
                <Text style={styles.checkLabel}>Front & Back cameras work clearly</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkItem}
                onPress={() => setBatteryHealthy(!batteryHealthy)}
              >
                <Ionicons
                  name={batteryHealthy ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={batteryHealthy ? '#059669' : '#9ca3af'}
                />
                <Text style={styles.checkLabel}>Battery health is 80% or above</Text>
              </TouchableOpacity>
            </View>

            {/* Accessories Extra Bonus */}
            <Text style={styles.fieldLabel}>Original Accessories (Higher Payout)</Text>
            <View style={styles.accessoriesRow}>
              <TouchableOpacity
                style={[styles.accessoryChip, hasBox && styles.accessoryChipActive]}
                onPress={() => setHasBox(!hasBox)}
              >
                <Ionicons name="cube-outline" size={16} color={hasBox ? '#065f46' : '#6b7280'} />
                <Text style={[styles.accessoryText, hasBox && styles.accessoryTextActive]}>
                  Original Box (+₹800)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.accessoryChip, hasCharger && styles.accessoryChipActive]}
                onPress={() => setHasCharger(!hasCharger)}
              >
                <Ionicons name="flash-outline" size={16} color={hasCharger ? '#065f46' : '#6b7280'} />
                <Text style={[styles.accessoryText, hasCharger && styles.accessoryTextActive]}>
                  Original Charger (+₹1,000)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.accessoryChip, hasBill && styles.accessoryChipActive]}
                onPress={() => setHasBill(!hasBill)}
              >
                <Ionicons name="receipt-outline" size={16} color={hasBill ? '#065f46' : '#6b7280'} />
                <Text style={[styles.accessoryText, hasBill && styles.accessoryTextActive]}>
                  Purchase Bill (+₹500)
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setStep(2)}
              >
                <Ionicons name="arrow-back" size={18} color="#4b5563" />
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.nextButton, { flex: 1 }]}
                onPress={() => setStep(4)}
              >
                <Text style={styles.nextButtonText}>Calculate Instant Quote</Text>
                <Ionicons name="sparkles" size={18} color="#000000" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* STEP 4: Instant Cash Quote & Doorstep Pickup */}
        {step === 4 && (
          <View style={styles.stepSection}>
            {!isSubmitted ? (
              <>
                {/* Instant Quote Card */}
                <View style={styles.valuationCard}>
                  <View style={styles.valuationHeader}>
                    <Text style={styles.valuationSub}>ESTIMATED DEVICE VALUE</Text>
                    <View style={styles.guaranteeTag}>
                      <Ionicons name="shield-checkmark" size={11} color="#059669" />
                      <Text style={styles.guaranteeTagText}>Pending review</Text>
                    </View>
                  </View>

                  <View style={styles.cashAmountRow}>
                    <Text style={styles.cashSymbol}>₹</Text>
                    {quoteLoading ? (
                      <Text style={styles.cashAmount}>Calculating…</Text>
                    ) : (
                      <Text style={styles.cashAmount}>₹{quoteAmount.toLocaleString('en-IN')}</Text>
                    )}
                  </View>

                  <Text style={styles.deviceSpecSummary}>
                    {selectedBrand} • {selectedModel} ({selectedStorage})
                  </Text>

                  <View style={styles.perksList}>
                    <View style={styles.perkItem}>
                      <Ionicons name="home-outline" size={14} color="#ffc400" />
                      <Text style={styles.perkText}>Admin reviews your device request</Text>
                    </View>
                    <View style={styles.perkItem}>
                      <Ionicons name="cash-outline" size={14} color="#ffc400" />
                      <Text style={styles.perkText}>Approved amount is shown in your request</Text>
                    </View>
                    <View style={styles.perkItem}>
                      <Ionicons name="lock-closed-outline" size={14} color="#ffc400" />
                      <Text style={styles.perkText}>Track approval and pickup status in the app</Text>
                    </View>
                  </View>
                </View>

                {/* Pickup Booking Form */}
                <Text style={[styles.sectionHeading, { marginTop: 16 }]}>Submit Sell Request</Text>
                <Text style={styles.sectionSub}>Enter your details. Pickup is arranged after admin approval.</Text>

                <View style={styles.formContainer}>
                  <Text style={styles.inputLabel}>Full Name</Text>
                  <TextInput
                    placeholder="Enter your name"
                    value={userName}
                    onChangeText={setUserName}
                    style={styles.textInput}
                  />

                  <Text style={styles.inputLabel}>Phone Number (For OTP & Pickup Call)</Text>
                  <TextInput
                    placeholder="10-digit mobile number"
                    value={userPhone}
                    onChangeText={setUserPhone}
                    keyboardType="phone-pad"
                    style={styles.textInput}
                  />

                  <Text style={styles.inputLabel}>Pickup Pincode</Text>
                  <TextInput
                    placeholder="e.g. 600001 or 560001"
                    value={userPincode}
                    onChangeText={setUserPincode}
                    keyboardType="number-pad"
                    style={styles.textInput}
                  />

                  <Text style={styles.inputLabel}>Complete Address</Text>
                  <TextInput
                    placeholder="Flat / House No, Street, Landmark"
                    value={userAddress}
                    onChangeText={setUserAddress}
                    multiline
                    numberOfLines={2}
                    style={[styles.textInput, { height: 60, textAlignVertical: 'top' }]}
                  />

                  <TouchableOpacity
                    style={styles.confirmPickupButton}
                    onPress={handleBookPickup}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="checkmark-circle" size={20} color="#000000" />
                    <Text style={styles.confirmPickupText}>
                      Submit Sell Request & Get ₹{quoteAmount.toLocaleString('en-IN')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              /* Success Confirmation */
              <View style={styles.successCard}>
                <View style={styles.successIconCircle}>
                  <Ionicons name="checkmark-done" size={40} color="#ffffff" />
                </View>
                <Text style={styles.successTitle}>Sell Request Submitted</Text>
                <Text style={styles.successSub}>
                  Your request is submitted. We will review it and update you when it is approved.
                </Text>

                <View style={styles.bookingDetailsBox}>
                  <View style={styles.bookingRow}>
                    <Text style={styles.bookingLabel}>Request ID:</Text>
                    <Text style={styles.bookingVal}>{bookingId}</Text>
                  </View>
                  <View style={styles.bookingRow}>
                    <Text style={styles.bookingLabel}>Device:</Text>
                    <Text style={styles.bookingVal}>{selectedModel}</Text>
                  </View>
                  <View style={styles.bookingRow}>
                    <Text style={styles.bookingLabel}>Valuation Offer:</Text>
                    <Text style={[styles.bookingVal, { color: '#059669', fontWeight: '800' }]}>
                      ₹{quoteAmount.toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <View style={styles.bookingRow}>
                    <Text style={styles.bookingLabel}>Customer:</Text>
                    <Text style={styles.bookingVal}>{userName} ({userPhone})</Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
                  <Text style={styles.resetButtonText}>Sell Another Device</Text>
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
    backgroundColor: '#f8f7f2',
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ebe7dd',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  instantCashPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  instantCashText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 3,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee9de',
  },
  stepItemWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stepTouch: {
    alignItems: 'center',
    gap: 3,
  },
  stepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#d1d5db',
  },
  stepCircleActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  stepCircleDone: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  stepNumber: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b7280',
  },
  stepNumberActive: {
    color: '#ffc400',
    fontWeight: '800',
  },
  stepLabel: {
    fontSize: 10,
    color: '#9ca3af',
    fontWeight: '600',
  },
  stepLabelActive: {
    color: '#0f172a',
    fontWeight: '800',
  },
  stepConnector: {
    flex: 1,
    height: 2,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 4,
    marginBottom: 12,
  },
  stepConnectorActive: {
    backgroundColor: '#059669',
  },
  scrollBody: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  stepSection: {},
  sectionHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  sectionSub: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
    marginBottom: 16,
  },
  categoryGrid: {
    gap: 10,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#e8e4da',
    gap: 12,
  },
  categoryCardActive: {
    borderColor: '#0f172a',
    backgroundColor: '#fefce8',
  },
  categoryIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIconCircleActive: {
    backgroundColor: '#ffc400',
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1f2937',
    flex: 1,
  },
  categoryNameActive: {
    color: '#0f172a',
    fontWeight: '800',
  },
  maxPricePill: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  maxPriceText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ffc400',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  catalogHint: { fontSize: 10, color: colors.textMuted, marginBottom: 6 },
  nextButtonDisabled: { opacity: 0.5 },
  nextButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000000',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#374151',
    marginTop: 12,
    marginBottom: 8,
  },
  pillsScroll: {
    marginBottom: 10,
  },
  chipPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginRight: 8,
  },
  chipPillActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4b5563',
  },
  chipTextActive: {
    color: '#ffc400',
    fontWeight: '800',
  },
  modelList: {
    gap: 8,
  },
  modelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  modelItemActive: {
    borderColor: '#ffc400',
    backgroundColor: '#fffbeb',
  },
  modelItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  modelItemTextActive: {
    fontWeight: '800',
    color: '#0f172a',
  },
  storageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  storageChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  storageChipActive: {
    backgroundColor: '#ffc400',
    borderColor: '#ffc400',
  },
  storageText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  storageTextActive: {
    color: '#000000',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4b5563',
  },
  optionCardsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  condCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  condCardActive: {
    borderColor: '#0f172a',
    backgroundColor: '#fffbeb',
  },
  condCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#374151',
  },
  condCardTitleActive: {
    color: '#0f172a',
  },
  condCardDesc: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 2,
  },
  checkCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 10,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkLabel: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
    flex: 1,
  },
  accessoriesRow: {
    gap: 8,
  },
  accessoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  accessoryChipActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  accessoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4b5563',
  },
  accessoryTextActive: {
    color: '#065f46',
    fontWeight: '800',
  },
  valuationCard: {
    backgroundColor: '#0f172a',
    borderRadius: 18,
    padding: 18,
  },
  valuationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  valuationSub: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ffc400',
    letterSpacing: 0.5,
  },
  guaranteeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#064e3b',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  guaranteeTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#6ee7b7',
  },
  cashAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 10,
  },
  cashSymbol: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffc400',
  },
  cashAmount: {
    fontSize: 34,
    fontWeight: '900',
    color: '#ffffff',
    marginLeft: 2,
  },
  deviceSpecSummary: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
    marginBottom: 14,
  },
  perksList: {
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 12,
    gap: 8,
  },
  perkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  perkText: {
    fontSize: 12,
    color: '#e2e8f0',
    fontWeight: '500',
  },
  formContainer: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginTop: 10,
    gap: 8,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4b5563',
  },
  textInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#111827',
  },
  confirmPickupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ffc400',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 10,
  },
  confirmPickupText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#000000',
  },
  successCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  successSub: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  bookingDetailsBox: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  bookingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bookingLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  bookingVal: {
    fontSize: 12,
    color: '#0f172a',
    fontWeight: '700',
  },
  resetButton: {
    backgroundColor: '#0f172a',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  resetButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
