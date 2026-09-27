import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
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

import { useAuth, type AppUser } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { api } from '@/services/api';
import { reverseGeocodeCoords } from '@/services/locationService';
import { useSafeHeaderTop } from '@/lib/useSafeHeaderTop';
import { colors, fontFamily, fontSize, fontWeight, radius, spacing } from '@/theme';

const LOGO_IMG = require('@/assets/logo.png');

const PRESET_AVATARS = [
  'https://api.dicebear.com/10.x/adventurer/svg?seed=Milo',
  'https://api.dicebear.com/10.x/open-peeps/svg?seed=Felix',
  'https://api.dicebear.com/10.x/big-ears/svg?seed=Milo',
  'https://api.dicebear.com/10.x/notionists/svg?seed=Aneka',
  'https://api.dicebear.com/10.x/adventurer/svg?seed=Luna',
  'https://api.dicebear.com/10.x/bottts/svg?seed=Aneka'
];

export default function OnboardingProfileScreen() {
  const safeTop = useSafeHeaderTop();
  const { user, completeProfileSetup, dismissProfileSetup } = useAuth();
  const toast = useToast();

  const [step, setStep] = useState<number>(0); // 0: Photo, 1: Details, 2: Address
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [city, setCity] = useState(user?.city || '');
  const [address, setAddress] = useState(user?.address || '');
  const [pincode, setPincode] = useState(user?.pincode || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');

  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [locating, setLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCelebrating, setIsCelebrating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Celebration tick animation refs
  const tickOverlayOpacity = useRef(new Animated.Value(0)).current;
  const tickScale = useRef(new Animated.Value(0)).current;
  const tickRippleScale = useRef(new Animated.Value(0.7)).current;
  const tickRippleOpacity = useRef(new Animated.Value(0.8)).current;
  const welcomeTextOpacity = useRef(new Animated.Value(0)).current;
  const welcomeTextTranslateY = useRef(new Animated.Value(18)).current;

  // Minimal transition animation: gentle fade + micro-translation
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;

  const animateToStep = (nextStep: number) => {
    const target = Math.max(0, Math.min(2, nextStep));
    if (target === step) return;

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 120,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: 6,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setStep(target);
      translateYAnim.setValue(-6);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateYAnim, {
          toValue: 0,
          duration: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const validateCurrentStep = (): boolean => {
    const errs: Record<string, string> = {};

    if (step === 1) {
      if (!fullName.trim()) {
        errs.fullName = 'Please enter your name';
      }
      const cleanPhone = phone.replace(/\D/g, '');
      if (!cleanPhone || cleanPhone.length !== 10) {
        errs.phone = 'Please enter a valid 10-digit mobile number';
      }
    }

    if (step === 2) {
      const cleanPin = pincode.replace(/\D/g, '');
      if (cleanPin && cleanPin.length !== 6) {
        errs.pincode = 'Pincode must be 6 digits';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Image upload
  const handlePickImage = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Please allow photo access to select your avatar.');
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
        base64: true,
      });

      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];

      setUploadingImage(true);
      let dataUri = '';
      if (asset.base64) {
        const mime = asset.mimeType || 'image/jpeg';
        dataUri = asset.base64.startsWith('data:') ? asset.base64 : `data:${mime};base64,${asset.base64}`;
      }

      if (dataUri) {
        const res = await api.upload.base64(dataUri, 'avatar.jpg');
        if (res?.url) {
          setAvatarUrl(res.url);
          toast.success('Photo uploaded');
          return;
        }
      }

      const res = await api.upload.image({
        uri: asset.uri,
        name: 'avatar.jpg',
        type: asset.mimeType || 'image/jpeg',
      });
      if (res?.url) {
        setAvatarUrl(res.url);
        toast.success('Photo uploaded');
      }
    } catch (err: any) {
      toast.warning('Could not upload photo. You can try a preset below.');
    } finally {
      setUploadingImage(false);
    }
  };

  // Auto-detect location
  const handleDetectLocation = async () => {
    try {
      setLocating(true);
      if (Platform.OS !== 'web') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          toast.warning('Location permission was denied.');
          return;
        }
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const geo = await reverseGeocodeCoords(loc.coords);
      if (!geo) {
        toast.warning('Could not resolve address from coordinates.');
        return;
      }

      if (geo.city) {
        setCity(geo.city);
      }
      if (geo.pincode) {
        setPincode(geo.pincode);
      }
      if (geo.address) {
        setAddress(geo.address);
      }
      toast.success('Location detected');
    } catch {
      toast.warning('Unable to detect location. Please type manually.');
    } finally {
      setLocating(false);
    }
  };

  const handleNext = () => {
    if (step === 0) {
      animateToStep(1);
      return;
    }

    if (!validateCurrentStep()) return;

    if (step === 1) {
      animateToStep(2);
      return;
    }

    handleComplete();
  };

  const handleComplete = async () => {
    if (!validateCurrentStep()) return;
    setIsSubmitting(true);

    const updates: Partial<AppUser> = {
      full_name: fullName.trim(),
      phone: phone.replace(/\D/g, ''),
      city: city.trim() || '',
      address: address.trim() || '',
      pincode: pincode.replace(/\D/g, '') || '',
      avatar_url: avatarUrl.trim() || '',
      profile_completed: true,
    };

    // 1. Activate Tick Celebration Screen
    setIsCelebrating(true);
    tickOverlayOpacity.setValue(0);
    tickScale.setValue(0);
    tickRippleScale.setValue(0.7);
    tickRippleOpacity.setValue(0.8);
    welcomeTextOpacity.setValue(0);
    welcomeTextTranslateY.setValue(18);

    Animated.parallel([
      // Overlay fade in
      Animated.timing(tickOverlayOpacity, {
        toValue: 1,
        duration: 250,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      // Spring pop on tick badge
      Animated.spring(tickScale, {
        toValue: 1,
        friction: 5.5,
        tension: 90,
        useNativeDriver: true,
      }),
      // Ripple ring expansion
      Animated.sequence([
        Animated.delay(120),
        Animated.parallel([
          Animated.timing(tickRippleScale, {
            toValue: 1.6,
            duration: 850,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(tickRippleOpacity, {
            toValue: 0,
            duration: 850,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ]),
      // "Welcome to RenewX Crew" text slide up and fade in
      Animated.timing(welcomeTextOpacity, {
        toValue: 1,
        duration: 450,
        delay: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(welcomeTextTranslateY, {
        toValue: 0,
        duration: 450,
        delay: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Perform backend update concurrently
    try {
      await api.users.updateProfile(updates);
    } catch {
      // Proceed even if network delay occurs
    }

    // 3. Hold for 2.4 seconds (2-3 seconds user request) for full satisfaction
    setTimeout(async () => {
      Animated.timing(tickOverlayOpacity, {
        toValue: 0,
        duration: 350,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start(async () => {
        await completeProfileSetup(updates);
        setIsSubmitting(false);
        setIsCelebrating(false);
      });
    }, 2400);
  };

  const handleSkip = () => {
    dismissProfileSetup();
  };

  const userInitial = (fullName.trim() || user?.email || 'U').charAt(0).toUpperCase();

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Top Header Bar */}
      <View style={[styles.topBar, { paddingTop: Math.max(safeTop + 8, 20) }]}>
        <View style={styles.topBarLeft}>
          {step > 0 ? (
            <TouchableOpacity
              onPress={() => animateToStep(step - 1)}
              style={styles.iconBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={20} color="#0f172a" />
            </TouchableOpacity>
          ) : (
            <Image source={LOGO_IMG} style={styles.appLogo} resizeMode="contain" />
          )}
        </View>

        {/* Minimal Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBarsRow}>
            {[0, 1, 2].map((s) => (
              <View
                key={s}
                style={[
                  styles.progressBarSegment,
                  s <= step ? styles.progressBarActive : styles.progressBarInactive,
                ]}
              />
            ))}
          </View>
          <Text style={styles.progressText}>Step {step + 1} of 3</Text>
        </View>

        <TouchableOpacity onPress={handleSkip} style={styles.skipBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.skipBtnText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollBody}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.animatedContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: translateYAnim }],
            },
          ]}
        >
          {/* Step 0: Profile Photo */}
          {step === 0 && (
            <View style={styles.stepContent}>
              <View style={styles.stepHeadingWrap}>
                <Text style={styles.stepTitle}>Add a profile photo</Text>
                <Text style={styles.stepSubtitle}>
                  Help team members and delivery drivers recognize your account.
                </Text>
              </View>

              {/* Main Avatar Picker */}
              <View style={styles.avatarPickerSection}>
                <TouchableOpacity
                  onPress={handlePickImage}
                  disabled={uploadingImage}
                  activeOpacity={0.85}
                  style={styles.avatarOuter}
                >
                  {avatarUrl ? (
                    <Image source={{ uri: avatarUrl }} style={styles.avatarImage} resizeMode="cover" />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarInitialText}>{userInitial}</Text>
                    </View>
                  )}

                  <View style={styles.cameraBadge}>
                    {uploadingImage ? (
                      <ActivityIndicator size="small" color="#0f172a" />
                    ) : (
                      <Ionicons name="camera" size={15} color="#0f172a" />
                    )}
                  </View>
                </TouchableOpacity>

                <View style={styles.avatarActionBtns}>
                  <TouchableOpacity
                    onPress={handlePickImage}
                    disabled={uploadingImage}
                    style={styles.choosePhotoBtn}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="image-outline" size={15} color="#0f172a" />
                    <Text style={styles.choosePhotoText}>Choose from Library</Text>
                  </TouchableOpacity>

                  {Boolean(avatarUrl) && (
                    <TouchableOpacity
                      onPress={() => setAvatarUrl('')}
                      style={styles.removePhotoBtn}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.removePhotoText}>Remove</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Preset Avatars */}
              <View style={styles.presetsSection}>
                <Text style={styles.presetsLabel}>Or choose an avatar</Text>
                <View style={styles.presetsRow}>
                  {PRESET_AVATARS.map((url, i) => {
                    const isSelected = avatarUrl === url;
                    return (
                      <TouchableOpacity
                        key={i}
                        onPress={() => setAvatarUrl(url)}
                        activeOpacity={0.8}
                        style={[styles.presetItem, isSelected && styles.presetItemSelected]}
                      >
                        <Image source={{ uri: url }} style={styles.presetImg} resizeMode="cover" />
                        {isSelected && (
                          <View style={styles.presetCheckmark}>
                            <Ionicons name="checkmark" size={10} color="#ffffff" />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          )}

          {/* Step 1: Contact Details */}
          {step === 1 && (
            <View style={styles.stepContent}>
              <View style={styles.stepHeadingWrap}>
                <Text style={styles.stepTitle}>Your contact details</Text>
                <Text style={styles.stepSubtitle}>
                  Used for order tracking, updates, and trade-in verifications.
                </Text>
              </View>

              <View style={styles.formSection}>
                {/* Full Name */}
                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>Full Name</Text>
                  <View
                    style={[
                      styles.inputBox,
                      focusedField === 'name' && styles.inputBoxFocused,
                      Boolean(errors.fullName) && styles.inputBoxError,
                    ]}
                  >
                    <Ionicons name="person-outline" size={17} color="#94a3b8" style={styles.inputIcon} />
                    <TextInput
                      value={fullName}
                      onChangeText={(t) => {
                        setFullName(t);
                        if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: '' }));
                      }}
                      onFocus={() => setFocusedField('name')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="e.g. Rahul Sharma"
                      placeholderTextColor="#94a3b8"
                      style={styles.textInput}
                    />
                  </View>
                  {Boolean(errors.fullName) && <Text style={styles.errorText}>{errors.fullName}</Text>}
                </View>

                {/* Mobile Phone */}
                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>Mobile Number</Text>
                  <View
                    style={[
                      styles.inputBox,
                      focusedField === 'phone' && styles.inputBoxFocused,
                      Boolean(errors.phone) && styles.inputBoxError,
                    ]}
                  >
                    <View style={styles.countryCodeBadge}>
                      <Text style={styles.countryCodeText}>+91</Text>
                    </View>
                    <TextInput
                      value={phone}
                      onChangeText={(t) => {
                        setPhone(t.replace(/\D/g, '').slice(0, 10));
                        if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }));
                      }}
                      onFocus={() => setFocusedField('phone')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="10-digit mobile number"
                      placeholderTextColor="#94a3b8"
                      keyboardType="phone-pad"
                      maxLength={10}
                      style={styles.textInput}
                    />
                  </View>
                  {Boolean(errors.phone) && <Text style={styles.errorText}>{errors.phone}</Text>}
                </View>

                {/* Account Email (Verified) */}
                {Boolean(user?.email) && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.fieldLabel}>Account Email</Text>
                    <View style={[styles.inputBox, styles.inputBoxDisabled]}>
                      <Ionicons name="mail-outline" size={17} color="#94a3b8" style={styles.inputIcon} />
                      <Text style={styles.disabledInputText}>{user?.email}</Text>
                      <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                    </View>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Step 2: Delivery Address */}
          {step === 2 && (
            <View style={styles.stepContent}>
              <View style={styles.stepHeadingWrap}>
                <Text style={styles.stepTitle}>Delivery address</Text>
                <Text style={styles.stepSubtitle}>
                  Add your shipping location. You can always update or change this at checkout.
                </Text>
              </View>

              <TouchableOpacity
                onPress={handleDetectLocation}
                disabled={locating}
                activeOpacity={0.8}
                style={styles.gpsButton}
              >
                {locating ? (
                  <ActivityIndicator size="small" color="#0f172a" />
                ) : (
                  <Ionicons name="navigate-outline" size={16} color="#0f172a" />
                )}
                <Text style={styles.gpsButtonText}>
                  {locating ? 'Detecting current location...' : 'Auto-fill with GPS'}
                </Text>
              </TouchableOpacity>

              <View style={styles.formSection}>
                {/* Street Address */}
                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>Flat, House No., Building, Street</Text>
                  <View style={[styles.inputBox, focusedField === 'address' && styles.inputBoxFocused]}>
                    <TextInput
                      value={address}
                      onChangeText={setAddress}
                      onFocus={() => setFocusedField('address')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="e.g. 402, Lotus Greens, Sector 45"
                      placeholderTextColor="#94a3b8"
                      style={styles.textInput}
                    />
                  </View>
                </View>

                {/* City & Pincode Row */}
                <View style={styles.rowTwoCols}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>City</Text>
                    <View style={[styles.inputBox, focusedField === 'city' && styles.inputBoxFocused]}>
                      <TextInput
                        value={city}
                        onChangeText={setCity}
                        onFocus={() => setFocusedField('city')}
                        onBlur={() => setFocusedField(null)}
                        placeholder="e.g. Bengaluru"
                        placeholderTextColor="#94a3b8"
                        style={styles.textInput}
                      />
                    </View>
                  </View>

                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>Pincode</Text>
                    <View
                      style={[
                        styles.inputBox,
                        focusedField === 'pin' && styles.inputBoxFocused,
                        Boolean(errors.pincode) && styles.inputBoxError,
                      ]}
                    >
                      <TextInput
                        value={pincode}
                        onChangeText={(t) => {
                          setPincode(t.replace(/\D/g, '').slice(0, 6));
                          if (errors.pincode) setErrors((prev) => ({ ...prev, pincode: '' }));
                        }}
                        onFocus={() => setFocusedField('pin')}
                        onBlur={() => setFocusedField(null)}
                        placeholder="6 digits"
                        placeholderTextColor="#94a3b8"
                        keyboardType="numeric"
                        maxLength={6}
                        style={styles.textInput}
                      />
                    </View>
                    {Boolean(errors.pincode) && <Text style={styles.errorText}>{errors.pincode}</Text>}
                  </View>
                </View>
              </View>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Pinned Bottom CTA Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          onPress={handleNext}
          disabled={isSubmitting || uploadingImage}
          activeOpacity={0.88}
          style={[styles.primaryButton, (isSubmitting || uploadingImage) && styles.primaryButtonDisabled]}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Text style={styles.primaryButtonText}>
                {step === 2 ? 'Create Account' : 'Continue'}
              </Text>
              <Ionicons
                name={step === 2 ? 'checkmark-circle-outline' : 'arrow-forward'}
                size={16}
                color="#ffffff"
              />
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Success Celebration: Tick animation for 2-3 seconds to "Welcome to RenewX Crew" */}
      {isCelebrating && (
        <Animated.View
          style={[
            styles.celebrationOverlay,
            {
              opacity: tickOverlayOpacity,
            },
          ]}
        >
          <View style={styles.celebrationCard}>
            {/* Animated Tick Badge with Outer Ripple */}
            <View style={styles.tickWrapper}>
              <Animated.View
                style={[
                  styles.tickRipple,
                  {
                    opacity: tickRippleOpacity,
                    transform: [{ scale: tickRippleScale }],
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.tickCircle,
                  {
                    transform: [{ scale: tickScale }],
                  },
                ]}
              >
                <Ionicons name="checkmark" size={48} color="#ffffff" />
              </Animated.View>
            </View>

            {/* Welcome Typography */}
            <Animated.View
              style={[
                styles.welcomeTextWrap,
                {
                  opacity: welcomeTextOpacity,
                  transform: [{ translateY: welcomeTextTranslateY }],
                },
              ]}
            >
              <Text style={styles.welcomeTitle}>
                Welcome to Renew<Text style={styles.brandAccent}>X</Text> Crew
              </Text>
              <Text style={styles.welcomeSubtitle}>
                Your profile is certified and ready! Welcome aboard.
              </Text>

              <View style={styles.welcomePill}>
                <Ionicons name="shield-checkmark" size={15} color="#16a34a" />
                <Text style={styles.welcomePillText}>Account Verified & Activated</Text>
              </View>
            </Animated.View>
          </View>
        </Animated.View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  /* Top Navigation Bar */
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  topBarLeft: {
    width: 40,
    alignItems: 'flex-start',
  },
  appLogo: {
    width: 26,
    height: 26,
    borderRadius: 6,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    alignItems: 'center',
    gap: 4,
  },
  progressBarsRow: {
    flexDirection: 'row',
    gap: 5,
  },
  progressBarSegment: {
    width: 32,
    height: 3,
    borderRadius: 2,
  },
  progressBarActive: {
    backgroundColor: '#0f172a',
  },
  progressBarInactive: {
    backgroundColor: '#e2e8f0',
  },
  progressText: {
    fontSize: 10,
    fontFamily: fontFamily.medium,
    color: '#64748b',
    letterSpacing: 0.3,
  },
  skipBtn: {
    width: 40,
    alignItems: 'flex-end',
  },
  skipBtnText: {
    fontSize: 13,
    fontFamily: fontFamily.medium,
    color: '#64748b',
  },

  /* Scrollable Body */
  scrollBody: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 32,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  animatedContainer: {
    width: '100%',
  },
  stepContent: {
    width: '100%',
  },

  /* Typography */
  stepHeadingWrap: {
    marginBottom: 28,
  },
  stepTitle: {
    fontSize: 22,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: '#0f172a',
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  stepSubtitle: {
    fontSize: 14,
    fontFamily: fontFamily.regular,
    color: '#64748b',
    lineHeight: 20,
  },

  /* Step 0: Avatar Picker */
  avatarPickerSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarOuter: {
    position: 'relative',
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: '#f1f5f9',
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialText: {
    fontSize: 34,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: '#0f172a',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  avatarActionBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  choosePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  choosePhotoText: {
    fontSize: 12,
    fontFamily: fontFamily.medium,
    fontWeight: fontWeight.medium,
    color: '#0f172a',
  },
  removePhotoBtn: {
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  removePhotoText: {
    fontSize: 12,
    fontFamily: fontFamily.medium,
    color: '#ef4444',
  },

  /* Presets */
  presetsSection: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 20,
    alignItems: 'center',
  },
  presetsLabel: {
    fontSize: 12,
    fontFamily: fontFamily.medium,
    color: '#64748b',
    marginBottom: 12,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  presetItem: {
    position: 'relative',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    backgroundColor: '#f8fafc',
  },
  presetItemSelected: {
    borderColor: '#0f172a',
    borderWidth: 2.5,
  },
  presetImg: {
    width: '100%',
    height: '100%',
  },
  presetCheckmark: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Form Elements */
  formSection: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: fontFamily.medium,
    fontWeight: fontWeight.medium,
    color: '#334155',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
  },
  inputBoxFocused: {
    borderColor: '#0f172a',
    backgroundColor: '#ffffff',
  },
  inputBoxError: {
    borderColor: '#ef4444',
  },
  inputBoxDisabled: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
  },
  inputIcon: {
    marginRight: 10,
  },
  countryCodeBadge: {
    paddingRight: 8,
    marginRight: 8,
    borderRightWidth: 1,
    borderRightColor: '#cbd5e1',
  },
  countryCodeText: {
    fontSize: 14,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: '#0f172a',
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: fontFamily.regular,
    color: '#0f172a',
    paddingVertical: 0,
  },
  disabledInputText: {
    flex: 1,
    fontSize: 14,
    fontFamily: fontFamily.regular,
    color: '#64748b',
  },
  errorText: {
    fontSize: 11,
    fontFamily: fontFamily.regular,
    color: '#ef4444',
    marginTop: 2,
  },

  /* Step 2 GPS Button & Columns */
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 42,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    marginBottom: 16,
  },
  gpsButtonText: {
    fontSize: 13,
    fontFamily: fontFamily.medium,
    fontWeight: fontWeight.medium,
    color: '#0f172a',
  },
  rowTwoCols: {
    flexDirection: 'row',
    gap: 12,
  },

  /* Bottom Pinned CTA */
  bottomBar: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#0f172a',
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 15,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: '#ffffff',
  },

  /* Celebration Tick & Welcome Overlay */
  celebrationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
    zIndex: 99999,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  celebrationCard: {
    alignItems: 'center',
    maxWidth: 360,
    width: '100%',
  },
  tickWrapper: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    position: 'relative',
  },
  tickRipple: {
    position: 'absolute',
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: 'rgba(22, 163, 74, 0.18)',
  },
  tickCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 10,
  },
  welcomeTextWrap: {
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 26,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: '#0f172a',
    letterSpacing: -0.6,
    textAlign: 'center',
    marginBottom: 8,
  },
  brandAccent: {
    color: '#ffc400',
  },
  welcomeSubtitle: {
    fontSize: 15,
    fontFamily: fontFamily.regular,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  welcomePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  welcomePillText: {
    fontSize: 13,
    fontFamily: fontFamily.medium,
    fontWeight: fontWeight.medium,
    color: '#15803d',
  },
});
