import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import CheckoutStepper from '@/components/CheckoutStepper';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme';
import { useSafeHeaderTop } from '@/lib/useSafeHeaderTop';

interface SavedAddress {
  id: string;
  name: string;
  phone: string;
  address: string;
  pincode: string;
  tag?: string;
}

const SAVED_ADDRESSES_KEY = '@renewx_saved_addresses';

export default function CheckoutScreen() {
  const safeTop = useSafeHeaderTop();
  const navigation = useNavigation<any>();
  const { items, subtotal, hydrated } = useCart();
  const { user } = useAuth();

  const [name, setName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('');
  const [saveAddressForLater, setSaveAddressForLater] = useState(true);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [locating, setLocating] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);

  const itemCount = useMemo(() => items.reduce((n, item) => n + item.quantity, 0), [items]);

  // Load saved addresses from local storage
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(SAVED_ADDRESSES_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSavedAddresses(parsed);
            // Pre-fill if fields are currently empty
            if (!address && parsed[0]?.address) {
              setAddress(parsed[0].address);
              if (parsed[0].pincode) setPincode(parsed[0].pincode);
              if (parsed[0].phone) setPhone(parsed[0].phone);
              if (parsed[0].name && !name) setName(parsed[0].name);
            }
          }
        }
      } catch {
        // Ignore storage errors
      }
    })();
  }, []);

  // GPS Auto-detect location handler
  const handleUseGps = async () => {
    try {
      setLocating(true);

      // Request foreground location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'Please enable location services in your device settings to auto-fill your delivery address via GPS.',
        );
        return;
      }

      // Fetch precise GPS coordinates
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = loc.coords;

      // Reverse geocode via expo-location
      const geocoded = await Location.reverseGeocodeAsync({ latitude, longitude });

      if (geocoded && geocoded.length > 0) {
        const g = geocoded[0];
        const parts = [
          g.name,
          g.streetNumber,
          g.street,
          g.district || g.subregion,
          g.city,
          g.region,
        ].filter(Boolean);

        const fullStreet = parts.join(', ');
        if (fullStreet) {
          setAddress(fullStreet);
          setErrors((prev) => ({ ...prev, address: '' }));
        }

        if (g.postalCode) {
          const cleanPin = g.postalCode.replace(/\D/g, '').slice(0, 6);
          setPincode(cleanPin);
          setErrors((prev) => ({ ...prev, pincode: '' }));
        }

        Alert.alert('GPS Location Detected', 'Address & PIN code populated successfully.');
      } else {
        // Fallback: OpenStreetMap reverse geocode
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
          { headers: { 'User-Agent': 'RenewX-Mobile-App' } },
        );
        const data = await res.json();
        if (data?.display_name) {
          setAddress(data.display_name);
          setErrors((prev) => ({ ...prev, address: '' }));
          if (data.address?.postcode) {
            setPincode(data.address.postcode.replace(/\D/g, '').slice(0, 6));
            setErrors((prev) => ({ ...prev, pincode: '' }));
          }
          Alert.alert('GPS Location Detected', 'Address auto-filled from GPS.');
        }
      }
    } catch (err: any) {
      Alert.alert(
        'GPS Detection Failed',
        err?.message || 'Could not fetch current GPS location. Please enter your address manually.',
      );
    } finally {
      setLocating(false);
    }
  };

  const handleSelectSavedAddress = (saved: SavedAddress) => {
    if (saved.name) setName(saved.name);
    if (saved.phone) setPhone(saved.phone);
    if (saved.address) setAddress(saved.address);
    if (saved.pincode) setPincode(saved.pincode);
    setErrors({});
  };

  const handleProceedToConfirm = async () => {
    // Normalization
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const cleanPincode = pincode.replace(/\D/g, '').slice(0, 6);
    const cleanName = name.trim();
    const cleanAddress = address.trim();

    const newErrors: Record<string, string> = {};

    if (!cleanName || cleanName.length < 2) {
      newErrors.name = 'Enter full recipient name (min. 2 characters).';
    }

    if (cleanPhone.length !== 10) {
      newErrors.phone = 'Enter a valid 10-digit mobile number.';
    }

    if (!cleanAddress || cleanAddress.length < 6) {
      newErrors.address = 'Enter complete address (house no., street, area).';
    }

    if (cleanPincode.length !== 6) {
      newErrors.pincode = 'Enter a valid 6-digit postal PIN code.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstErrorMessage = Object.values(newErrors)[0];
      Alert.alert('Incomplete Address Details', firstErrorMessage);
      return;
    }

    if (!items.length) {
      Alert.alert('Cart is empty', 'Add a product before checking out.');
      return;
    }

    // Save to local storage if user selected save
    if (saveAddressForLater) {
      try {
        const addressToSave: SavedAddress = {
          name: cleanName,
          phone: cleanPhone,
          address: cleanAddress,
          pincode: cleanPincode,
          tag: 'Default',
        };
        const updated = [
          addressToSave,
          ...savedAddresses.filter((a) => a.address !== cleanAddress),
        ].slice(0, 5);
        await AsyncStorage.setItem(SAVED_ADDRESSES_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
    }

    // Move to Step 2: Payment
    navigation.navigate('Payment', {
      customerInfo: {
        name: cleanName,
        phone: cleanPhone,
        address: cleanAddress,
        pincode: cleanPincode,
      },
    });
  };

  if (!hydrated) {
    return (
      <View style={[styles.loading, { paddingTop: safeTop }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: safeTop }]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Cart'))}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>

          <View>
            <Text style={styles.title}>Delivery Address</Text>
            <Text style={styles.subtitle}>Where should we ship your order?</Text>
          </View>
        </View>

        {/* Progress Stepper: Step 1 Active */}
        <CheckoutStepper currentStep={1} />

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* GPS Auto-Fill Action Banner */}
          <View style={styles.gpsBanner}>
            <View style={styles.gpsBannerTextRow}>
              <View style={styles.gpsIconCircle}>
                <Ionicons name="navigate" size={18} color="#0284c7" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.gpsBannerTitle}>Auto-Fill via GPS</Text>
                <Text style={styles.gpsBannerSubtitle}>Detect your street address & PIN code instantly</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.gpsButton}
              onPress={handleUseGps}
              disabled={locating}
              activeOpacity={0.85}
            >
              {locating ? (
                <ActivityIndicator size="small" color="#0f172a" />
              ) : (
                <>
                  <Ionicons name="locate" size={16} color="#0f172a" />
                  <Text style={styles.gpsButtonText}>Use Current Location</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Saved Addresses Quick Picker */}
          {savedAddresses.length > 0 ? (
            <View style={styles.savedSection}>
              <Text style={styles.savedSectionTitle}>Saved Addresses</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.savedList}>
                {savedAddresses.map((saved, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.savedCard,
                      address.trim() === saved.address.trim() && styles.savedCardSelected,
                    ]}
                    onPress={() => handleSelectSavedAddress(saved)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.savedCardTop}>
                      <Ionicons
                        name="home-outline"
                        size={14}
                        color={address.trim() === saved.address.trim() ? '#0f172a' : '#64748b'}
                      />
                      <Text style={styles.savedCardName} numberOfLines={1}>{saved.name}</Text>
                    </View>
                    <Text style={styles.savedCardAddress} numberOfLines={2}>{saved.address}</Text>
                    <Text style={styles.savedCardPin}>PIN: {saved.pincode}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {/* Address Form Card */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Shipping Information</Text>

            {/* Full Name */}
            <Text style={styles.fieldLabel}>Recipient Full Name *</Text>
            <TextInput
              value={name}
              onChangeText={(val) => {
                setName(val);
                if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
              }}
              placeholder="e.g. Rahul Sharma"
              placeholderTextColor="#94a3b8"
              style={[styles.input, errors.name && styles.inputError]}
              autoCapitalize="words"
            />
            {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}

            {/* Mobile Number */}
            <Text style={styles.fieldLabel}>Mobile Number * (for delivery SMS & tracking)</Text>
            <View style={styles.phoneInputRow}>
              <View style={styles.phonePrefix}>
                <Text style={styles.phonePrefixText}>+91</Text>
              </View>
              <TextInput
                value={phone}
                onChangeText={(val) => {
                  setPhone(val);
                  if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }));
                }}
                placeholder="10-digit mobile number"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
                style={[styles.input, styles.phoneInputFlex, errors.phone && styles.inputError]}
              />
            </View>
            {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}

            {/* Complete Address */}
            <Text style={styles.fieldLabel}>Complete Delivery Address *</Text>
            <TextInput
              value={address}
              onChangeText={(val) => {
                setAddress(val);
                if (errors.address) setErrors((prev) => ({ ...prev, address: '' }));
              }}
              placeholder="Flat/House No., Building, Street, Area, Landmark"
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={3}
              style={[styles.input, styles.address, errors.address && styles.inputError]}
            />
            {errors.address ? <Text style={styles.errorText}>{errors.address}</Text> : null}

            {/* Pincode */}
            <Text style={styles.fieldLabel}>Postal PIN Code * (6 digits)</Text>
            <TextInput
              value={pincode}
              onChangeText={(val) => {
                setPincode(val);
                if (errors.pincode) setErrors((prev) => ({ ...prev, pincode: '' }));
              }}
              placeholder="e.g. 600028"
              placeholderTextColor="#94a3b8"
              keyboardType="number-pad"
              maxLength={7}
              style={[styles.input, errors.pincode && styles.inputError]}
            />
            {errors.pincode ? <Text style={styles.errorText}>{errors.pincode}</Text> : null}

            {/* Save Address Toggle */}
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setSaveAddressForLater((prev) => !prev)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, saveAddressForLater && styles.checkboxActive]}>
                {saveAddressForLater && <Ionicons name="checkmark" size={14} color="#000000" />}
              </View>
              <Text style={styles.checkboxLabel}>Save this address for faster future checkouts</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Summary Card */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Overview</Text>

            <View style={styles.row}>
              <Text style={styles.label}>{itemCount} items in cart</Text>
              <Text style={styles.value}>₹{subtotal.toLocaleString('en-IN')}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Express Delivery</Text>
              <Text style={styles.free}>FREE</Text>
            </View>

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Payable</Text>
              <Text style={styles.total}>₹{subtotal.toLocaleString('en-IN')}</Text>
            </View>
          </View>

          {/* Assurance Notice */}
          <View style={styles.notice}>
            <Ionicons name="shield-checkmark" size={18} color="#059669" />
            <Text style={styles.noticeText}>
              All RenewX deliveries are contactless, insured, and verified with tamper-evident packaging.
            </Text>
          </View>
        </ScrollView>

        {/* Sticky Footer */}
        <View style={styles.footer}>
          <View>
            <Text style={styles.footerLabel}>Total Amount</Text>
            <Text style={styles.footerTotal}>₹{subtotal.toLocaleString('en-IN')}</Text>
          </View>

          <TouchableOpacity
            style={styles.place}
            onPress={handleProceedToConfirm}
            activeOpacity={0.88}
          >
            <Text style={styles.placeText}>Proceed to Payment</Text>
            <Ionicons name="arrow-forward" size={18} color="#000" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  content: {
    padding: spacing.md,
    paddingBottom: 130,
  },
  gpsBanner: {
    backgroundColor: '#f0f9ff',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#bae6fd',
    gap: 12,
  },
  gpsBannerTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  gpsIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0369a1',
  },
  gpsBannerSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  gpsButton: {
    backgroundColor: '#ffc400',
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'flex-start',
  },
  gpsButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  savedSection: {
    marginBottom: spacing.md,
  },
  savedSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  savedList: {
    gap: 10,
    paddingRight: 10,
  },
  savedCard: {
    backgroundColor: '#ffffff',
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    width: 200,
  },
  savedCardSelected: {
    borderColor: '#ffc400',
    backgroundColor: '#fffbeb',
  },
  savedCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  savedCardName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
    flex: 1,
  },
  savedCardAddress: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 15,
    marginBottom: 4,
  },
  savedCardPin: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  section: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
    marginTop: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    backgroundColor: '#fff',
    fontSize: fontSize.sm,
  },
  inputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  errorText: {
    fontSize: 11,
    color: '#ef4444',
    fontWeight: '600',
    marginTop: 3,
    marginBottom: 4,
    marginLeft: 2,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  phonePrefix: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  phonePrefixText: {
    fontSize: fontSize.sm,
    fontWeight: '800',
    color: '#0f172a',
  },
  phoneInputFlex: {
    flex: 1,
  },
  address: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    paddingVertical: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  checkboxActive: {
    backgroundColor: '#ffc400',
    borderColor: '#ffc400',
  },
  checkboxLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: { fontSize: fontSize.sm, color: colors.textSecondary },
  value: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.text },
  free: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: '#10b981' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    marginTop: 6,
  },
  totalLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  total: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.black,
    color: colors.text,
  },
  notice: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: '#ecfdf5',
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  noticeText: {
    flex: 1,
    fontSize: 11,
    color: '#065f46',
    lineHeight: 16,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerLabel: { fontSize: 10, color: colors.textMuted },
  footerTotal: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.black,
    color: colors.text,
  },
  place: {
    backgroundColor: '#ffc400',
    borderRadius: radius.md,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    flexDirection: 'row',
    gap: 8,
  },
  placeText: {
    color: '#000',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
});
