import React, { useRef, useState } from 'react';
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
import { useSafeHeaderTop } from '@/lib/useSafeHeaderTop';
import { colors, fontFamily, fontSize, fontWeight, radius, spacing } from '@/theme';

const LOGO_IMG = require('@/assets/logo.png');

const PRESET_AVATARS = [
  'https://api.dicebear.com/9.x/avataaars/png?seed=RenewX1&size=256&backgroundColor=fff3bf',
  'https://api.dicebear.com/9.x/avataaars/png?seed=RenewX2&size=256&backgroundColor=c0aede',
  'https://api.dicebear.com/9.x/avataaars/png?seed=RenewX3&size=256&backgroundColor=b6e3f4',
  'https://api.dicebear.com/9.x/avataaars/png?seed=RenewX4&size=256&backgroundColor=d1d4f9',
  'https://api.dicebear.com/9.x/avataaars/png?seed=RenewX5&size=256&backgroundColor=ffd5dc',
];

export default function OnboardingProfileScreen() {
  const safeTop = useSafeHeaderTop();
  const { user, completeProfileSetup, dismissProfileSetup, signOut } = useAuth();
  const toast = useToast();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [city, setCity] = useState(user?.city || '');
  const [address, setAddress] = useState(user?.address || '');
  const [pincode, setPincode] = useState(user?.pincode || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');

  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [locating, setLocating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Interactive 2-3 seconds Loading State
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [loadingType, setLoadingType] = useState<'save' | 'skip'>('save');

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const userEmail = user?.email || '';

  // 1. Pick Image from Device Gallery
  const handlePickImage = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Please allow photo library access to upload your profile photo.');
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (result.canceled || !result.assets?.[0]) return;
      await uploadAsset(result.assets[0]);
    } catch (err: any) {
      Alert.alert('Upload Error', err?.message || 'Failed to select photo');
    }
  };

  const uploadAsset = async (asset: ImagePicker.ImagePickerAsset) => {
    try {
      setUploadingImage(true);

      let dataUri = '';
      if (asset.base64) {
        const mime = asset.mimeType || 'image/jpeg';
        dataUri = asset.base64.startsWith('data:') ? asset.base64 : `data:${mime};base64,${asset.base64}`;
      } else if (Platform.OS === 'web' && asset.uri) {
        try {
          const response = await fetch(asset.uri);
          const blob = await response.blob();
          dataUri = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch (e) {
          console.warn('[Onboarding] Web blob conversion failed:', e);
        }
      }

      if (dataUri) {
        const res = await api.upload.base64(dataUri, 'avatar.jpg');
        if (res?.url) {
          setAvatarUrl(res.url);
          toast.success('Photo uploaded!');
          return;
        }
      }

      // Fallback to standard multipart upload
      const res = await api.upload.image({
        uri: asset.uri,
        name: 'avatar.jpg',
        type: asset.mimeType || 'image/jpeg',
      });
      if (res?.url) {
        setAvatarUrl(res.url);
        toast.success('Photo uploaded!');
      }
    } catch (err: any) {
      console.error('[Onboarding] Avatar upload failed:', err);
      toast.warning('Could not upload photo. Using default initial.');
    } finally {
      setUploadingImage(false);
    }
  };

  // 2. Auto-detect location for optional delivery address
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
      const places = await Location.reverseGeocodeAsync(loc.coords);
      const place = places[0];
      if (!place) {
        toast.warning('Could not resolve address from coordinates.');
        return;
      }

      if (place.city || place.subregion) {
        setCity(place.city || place.subregion || '');
      }
      if (place.postalCode) {
        setPincode(place.postalCode.replace(/\D/g, '').slice(0, 6));
      }
      const formattedStreet = [place.name, place.street, place.district].filter(Boolean).join(', ');
      if (formattedStreet) {
        setAddress(formattedStreet);
      }
      toast.success('Location filled successfully.');
    } catch (err: any) {
      toast.warning('Unable to detect current location.');
    } finally {
      setLocating(false);
    }
  };

  // 3. Validation: Only Full Name and Phone are required! Delivery details are OPTIONAL.
  const validate = () => {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) {
      errs.fullName = 'Full name is required';
    }
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length !== 10) {
      errs.phone = '10-digit mobile number is required';
    }

    // Delivery address fields are strictly optional!
    const cleanPin = pincode.replace(/\D/g, '');
    if (cleanPin && cleanPin.length !== 6) {
      errs.pincode = 'Pincode must be exactly 6 digits';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // 4. Interactive 2-3 Seconds Loading Sequence
  const startInteractiveLoading = (type: 'save' | 'skip', onComplete: () => Promise<void>) => {
    setIsCreatingAccount(true);
    setLoadingType(type);
    setLoadingStage(0);

    // Fade in
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();

    // Pulse animation
    pulseAnim.setValue(1);
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Smooth Progress bar animation across 2.5s
    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: 100,
      duration: 2500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    // Live stages: 0s -> 0.75s -> 1.55s -> 2.35s
    setTimeout(() => setLoadingStage(1), 750);
    setTimeout(() => setLoadingStage(2), 1550);
    setTimeout(() => setLoadingStage(3), 2350);

    // Complete at 2.65 seconds (exactly 2-3s interactive duration)
    setTimeout(async () => {
      try {
        await onComplete();
      } catch (err: any) {
        setIsCreatingAccount(false);
        toast.error(err?.message || 'Could not complete account setup. Please retry.');
      }
    }, 2650);
  };

  const handleSaveAndContinue = async () => {
    if (uploadingImage) {
      toast.warning('Please wait for your photo to finish uploading.');
      return;
    }
    if (!validate()) {
      toast.warning('Please enter your name and mobile number.');
      return;
    }

    const updates: Partial<AppUser> = {
      full_name: fullName.trim(),
      phone: phone.replace(/\D/g, ''),
      city: city.trim() || '',
      address: address.trim() || '',
      pincode: pincode.replace(/\D/g, '') || '',
      avatar_url: avatarUrl.trim() || '',
      profile_completed: true,
    };

    // Trigger API update in parallel
    const apiPromise = api.users.updateProfile(updates).catch((err: any): any => {
      console.warn('[Onboarding] Profile update background warning:', err);
      return null;
    });

    startInteractiveLoading('save', async () => {
      const serverRes = await apiPromise;
      const serverData = serverRes?.data || serverRes;
      const finalUpdates: Partial<AppUser> = {
        ...updates,
        ...(serverData?.avatar_url ? { avatar_url: serverData.avatar_url } : {}),
      };
      await completeProfileSetup(finalUpdates);
      toast.success('Welcome to RenewX!');
    });
  };

  const handleSkip = () => {
    startInteractiveLoading('skip', async () => {
      dismissProfileSetup();
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(safeTop + 8, 20) },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Top Minimal Navigation Bar */}
        <View style={styles.topBar}>
          <View style={styles.brandRow}>
            <Image source={LOGO_IMG} style={styles.brandLogo} resizeMode="contain" />
            <Text style={styles.brandName}>RenewX</Text>
          </View>
          <TouchableOpacity
            onPress={handleSkip}
            disabled={isCreatingAccount}
            style={styles.skipBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.skipBtnText}>Skip for now</Text>
            <Ionicons name="chevron-forward" size={14} color="#71717a" />
          </TouchableOpacity>
        </View>

        {/* Minimal Header Section with Progress Badge */}
        <View style={styles.headerBox}>
          <View style={styles.stepBadge}>
            <View style={styles.stepDot} />
            <Text style={styles.stepBadgeText}>PROFILE SETUP</Text>
          </View>
          <Text style={styles.mainTitle}>Let's get you set up</Text>
          <Text style={styles.subTitle}>
            Add your personal info to activate 1-click orders and certified trade-in tracking.
          </Text>
        </View>

        {/* Interactive Avatar Card */}
        <View style={styles.avatarCard}>
          <View style={styles.avatarLeft}>
            <View style={styles.avatarStage}>
              {uploadingImage ? (
                <ActivityIndicator size="small" color="#0f172a" />
              ) : avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} resizeMode="cover" />
              ) : (
                <Text style={styles.avatarInitial}>
                  {(fullName.trim().charAt(0) || userEmail.charAt(0) || 'U').toUpperCase()}
                </Text>
              )}
              <TouchableOpacity
                style={styles.cameraIconBtn}
                onPress={handlePickImage}
                disabled={uploadingImage || isCreatingAccount}
                activeOpacity={0.85}
              >
                <Ionicons name="camera" size={13} color="#0f172a" />
              </TouchableOpacity>
            </View>
            <View style={styles.avatarTextCol}>
              <Text style={styles.avatarHeading}>Profile photo</Text>
              <Text style={styles.avatarSubHeading}>Upload or pick an avatar</Text>
            </View>
          </View>

          {/* Interactive Presets Carousel */}
          <View style={styles.avatarPresetsRow}>
            {PRESET_AVATARS.map((url, i) => {
              const isSelected = avatarUrl === url;
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.presetCircle, isSelected && styles.presetCircleSelected]}
                  onPress={() => setAvatarUrl(url)}
                  disabled={isCreatingAccount}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: url }} style={styles.presetImg} />
                  {isSelected && (
                    <View style={styles.presetActiveCheck}>
                      <Ionicons name="checkmark" size={10} color="#000" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 1. PERSONAL DETAILS SECTION (Required) */}
        <View style={styles.cardSection}>
          <View style={styles.cardSectionHeader}>
            <View style={styles.headerIconBubble}>
              <Ionicons name="person-outline" size={16} color="#0f172a" />
            </View>
            <View style={styles.headerTitleBox}>
              <Text style={styles.cardSectionTitle}>Personal details</Text>
              <Text style={styles.cardSectionSubtitle}>Required for account verification</Text>
            </View>
            <View style={styles.requiredPill}>
              <Text style={styles.requiredPillText}>REQUIRED</Text>
            </View>
          </View>

          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <View
              style={[
                styles.inputBox,
                focusedField === 'fullName' && styles.inputBoxFocused,
                !!errors.fullName && styles.inputBoxError,
              ]}
            >
              <Ionicons
                name="person-outline"
                size={17}
                color={focusedField === 'fullName' ? '#0f172a' : '#8e8e93'}
              />
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                placeholderTextColor="#9ca3af"
                value={fullName}
                onFocus={() => setFocusedField('fullName')}
                onBlur={() => setFocusedField(null)}
                onChangeText={(v) => {
                  setFullName(v);
                  if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: '' }));
                }}
                autoCapitalize="words"
                editable={!isCreatingAccount}
              />
              {!!fullName && (
                <TouchableOpacity onPress={() => setFullName('')}>
                  <Ionicons name="close-circle" size={16} color="#c4c4c8" />
                </TouchableOpacity>
              )}
            </View>
            {!!errors.fullName && <Text style={styles.fieldErrorText}>{errors.fullName}</Text>}
          </View>

          {/* Mobile Number */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Mobile Phone</Text>
            <View
              style={[
                styles.inputBox,
                focusedField === 'phone' && styles.inputBoxFocused,
                !!errors.phone && styles.inputBoxError,
              ]}
            >
              <View style={styles.countryCodeBadge}>
                <Text style={styles.flagEmoji}>🇮🇳</Text>
                <Text style={styles.countryCodeText}>+91</Text>
              </View>
              <View style={styles.inputDivider} />
              <TextInput
                style={styles.input}
                placeholder="10-digit mobile number"
                placeholderTextColor="#9ca3af"
                value={phone}
                onFocus={() => setFocusedField('phone')}
                onBlur={() => setFocusedField(null)}
                onChangeText={(v) => {
                  setPhone(v.replace(/\D/g, '').slice(0, 10));
                  if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }));
                }}
                keyboardType="phone-pad"
                maxLength={10}
                editable={!isCreatingAccount}
              />
              {!!phone && (
                <TouchableOpacity onPress={() => setPhone('')}>
                  <Ionicons name="close-circle" size={16} color="#c4c4c8" />
                </TouchableOpacity>
              )}
            </View>
            {!!errors.phone && <Text style={styles.fieldErrorText}>{errors.phone}</Text>}
          </View>
        </View>

        {/* 2. DELIVERY ADDRESS SECTION (Optional) */}
        <View style={styles.cardSection}>
          <View style={styles.cardSectionHeader}>
            <View style={styles.headerIconBubble}>
              <Ionicons name="location-outline" size={16} color="#0f172a" />
            </View>
            <View style={styles.headerTitleBox}>
              <Text style={styles.cardSectionTitle}>Delivery address</Text>
              <Text style={styles.cardSectionSubtitle}>Optional • Can be added anytime at checkout</Text>
            </View>
            <View style={styles.optionalPill}>
              <Text style={styles.optionalPillText}>OPTIONAL</Text>
            </View>
          </View>

          {/* Auto-detect Location Pill Button */}
          <TouchableOpacity
            style={styles.detectLocationBtn}
            onPress={handleDetectLocation}
            disabled={locating || isCreatingAccount}
            activeOpacity={0.8}
          >
            {locating ? (
              <ActivityIndicator size="small" color="#0f172a" />
            ) : (
              <Ionicons name="navigate-outline" size={15} color="#0f172a" />
            )}
            <Text style={styles.detectLocationText}>
              {locating ? 'Detecting current location...' : 'Auto-fill from current location'}
            </Text>
          </TouchableOpacity>

          {/* Street / Flat address */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              Street address <Text style={styles.optionalTag}>(Optional)</Text>
            </Text>
            <View
              style={[
                styles.inputBox,
                focusedField === 'address' && styles.inputBoxFocused,
              ]}
            >
              <Ionicons
                name="home-outline"
                size={17}
                color={focusedField === 'address' ? '#0f172a' : '#8e8e93'}
              />
              <TextInput
                style={styles.input}
                placeholder="Flat / house no., building, street"
                placeholderTextColor="#9ca3af"
                value={address}
                onFocus={() => setFocusedField('address')}
                onBlur={() => setFocusedField(null)}
                onChangeText={setAddress}
                editable={!isCreatingAccount}
              />
              {!!address && (
                <TouchableOpacity onPress={() => setAddress('')}>
                  <Ionicons name="close-circle" size={16} color="#c4c4c8" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Two Columns: City & Pincode */}
          <View style={styles.twoColumnRow}>
            {/* City */}
            <View style={[styles.inputGroup, styles.flex1]}>
              <Text style={styles.inputLabel}>
                City <Text style={styles.optionalTag}>(Optional)</Text>
              </Text>
              <View
                style={[
                  styles.inputBox,
                  focusedField === 'city' && styles.inputBoxFocused,
                ]}
              >
                <Ionicons
                  name="business-outline"
                  size={16}
                  color={focusedField === 'city' ? '#0f172a' : '#8e8e93'}
                />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Mumbai"
                  placeholderTextColor="#9ca3af"
                  value={city}
                  onFocus={() => setFocusedField('city')}
                  onBlur={() => setFocusedField(null)}
                  onChangeText={setCity}
                  autoCapitalize="words"
                  editable={!isCreatingAccount}
                />
              </View>
            </View>

            {/* Pincode */}
            <View style={[styles.inputGroup, styles.flex1]}>
              <Text style={styles.inputLabel}>
                Pincode <Text style={styles.optionalTag}>(Optional)</Text>
              </Text>
              <View
                style={[
                  styles.inputBox,
                  focusedField === 'pincode' && styles.inputBoxFocused,
                  !!errors.pincode && styles.inputBoxError,
                ]}
              >
                <Ionicons
                  name="pin-outline"
                  size={16}
                  color={focusedField === 'pincode' ? '#0f172a' : '#8e8e93'}
                />
                <TextInput
                  style={styles.input}
                  placeholder="6 digits"
                  placeholderTextColor="#9ca3af"
                  value={pincode}
                  onFocus={() => setFocusedField('pincode')}
                  onBlur={() => setFocusedField(null)}
                  onChangeText={(v) => {
                    setPincode(v.replace(/\D/g, '').slice(0, 6));
                    if (errors.pincode) setErrors((prev) => ({ ...prev, pincode: '' }));
                  }}
                  keyboardType="number-pad"
                  maxLength={6}
                  editable={!isCreatingAccount}
                />
              </View>
              {!!errors.pincode && <Text style={styles.fieldErrorText}>{errors.pincode}</Text>}
            </View>
          </View>
        </View>

        {/* Primary CTA Button */}
        <TouchableOpacity
          style={[styles.completeBtn, (isCreatingAccount || uploadingImage) && styles.btnDisabled]}
          onPress={handleSaveAndContinue}
          disabled={isCreatingAccount || uploadingImage}
          activeOpacity={0.88}
        >
          {uploadingImage ? (
            <ActivityIndicator size="small" color="#0f172a" />
          ) : (
            <>
              <Text style={styles.completeBtnText}>Complete & Explore RenewX</Text>
              <Ionicons name="arrow-forward" size={17} color="#0f172a" />
            </>
          )}
        </TouchableOpacity>

        {/* Secondary Skip Action */}
        <TouchableOpacity
          onPress={handleSkip}
          disabled={isCreatingAccount}
          style={styles.secondarySkipBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.secondarySkipText}>I'll set up my address later</Text>
        </TouchableOpacity>

        {/* Account Switch */}
        <TouchableOpacity
          onPress={() => signOut()}
          disabled={isCreatingAccount}
          style={styles.signOutBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.signOutBtnText}>Use a different account</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ========================================================================= */}
      {/* 🚀 INTERACTIVE 2-3 SECONDS ACCOUNT CREATION LOADING OVERLAY                */}
      {/* ========================================================================= */}
      {isCreatingAccount && (
        <Animated.View style={[styles.loadingOverlay, { opacity: fadeAnim }]}>
          {/* Top Brand Chip */}
          <View style={styles.loadingTopBadge}>
            <View style={styles.loadingTopBadgeDot} />
            <Text style={styles.loadingTopBadgeText}>RENEWX ACCOUNT SETUP</Text>
          </View>

          {/* Center Stage: Animated Pulsing Ring & Avatar */}
          <View style={styles.loadingCenterStage}>
            <Animated.View
              style={[
                styles.loadingPulseGlow,
                { transform: [{ scale: pulseAnim }] },
              ]}
            />
            <View style={styles.loadingAvatarRing}>
              {loadingStage === 3 ? (
                <View style={styles.loadingSuccessBadge}>
                  <Ionicons name="checkmark" size={38} color="#0f172a" />
                </View>
              ) : avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={styles.loadingAvatarImg}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.loadingAvatarInitial}>
                  {(fullName.trim().charAt(0) || userEmail.charAt(0) || 'U').toUpperCase()}
                </Text>
              )}
            </View>
          </View>

          {/* Dynamic Live Headline & Subtitle */}
          <View style={styles.loadingTextBox}>
            <Text style={styles.loadingMainTitle}>
              {loadingType === 'skip'
                ? loadingStage === 0
                  ? 'Preparing your session...'
                  : loadingStage === 1
                    ? 'Personalizing live catalog...'
                    : loadingStage === 2
                      ? 'Configuring device warranty...'
                      : 'Welcome to RenewX! ✨'
                : loadingStage === 0
                  ? 'Creating your account...'
                  : loadingStage === 1
                    ? 'Securing profile & preferences...'
                    : loadingStage === 2
                      ? 'Activating 6-month warranty...'
                      : 'All set! Welcome to RenewX ✨'}
            </Text>
            <Text style={styles.loadingSubTitle}>
              {loadingType === 'skip'
                ? 'Setting up your guest session and verified marketplace deals'
                : loadingStage === 0
                  ? 'Encrypting and saving your verified member profile'
                  : loadingStage === 1
                    ? 'Activating 1-click checkout and express delivery preferences'
                    : loadingStage === 2
                      ? 'Unlocking certified buyer protection & trade-in valuation'
                      : 'Launching your personalized RenewX hub...'}
            </Text>
          </View>

          {/* Interactive 3-Step Live Checklist */}
          <View style={styles.loadingChecklist}>
            {[
              { label: 'Profile verification', stage: 0 },
              { label: 'Account & security preferences', stage: 1 },
              { label: '6-month warranty activation', stage: 2 },
            ].map((item, idx) => {
              const isDone = loadingStage > item.stage;
              const isCurrent = loadingStage === item.stage;
              return (
                <View key={idx} style={styles.loadingCheckItem}>
                  <View
                    style={[
                      styles.loadingCheckIconWrap,
                      isDone && styles.loadingCheckIconWrapDone,
                      isCurrent && styles.loadingCheckIconWrapCurrent,
                    ]}
                  >
                    {isDone ? (
                      <Ionicons name="checkmark" size={13} color="#0f172a" />
                    ) : isCurrent ? (
                      <ActivityIndicator size="small" color="#ffc400" />
                    ) : (
                      <View style={styles.loadingCheckDotPending} />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.loadingCheckText,
                      isDone && styles.loadingCheckTextDone,
                      isCurrent && styles.loadingCheckTextCurrent,
                    ]}
                  >
                    {item.label}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Smooth Animated Progress Bar */}
          <View style={styles.loadingProgressBox}>
            <View style={styles.loadingProgressBarTrack}>
              <Animated.View
                style={[
                  styles.loadingProgressBarFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 100],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
            <View style={styles.loadingProgressMeta}>
              <Text style={styles.loadingProgressLabel}>Configuring your experience</Text>
              <Text style={styles.loadingProgressPercent}>
                {loadingStage === 0
                  ? '25%'
                  : loadingStage === 1
                    ? '55%'
                    : loadingStage === 2
                      ? '85%'
                      : '100%'}
              </Text>
            </View>
          </View>
        </Animated.View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafaf9',
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: 48,
    maxWidth: 580,
    width: '100%',
    alignSelf: 'center',
  },

  /* Top Navigation Bar */
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  brandLogo: {
    width: 28,
    height: 28,
    borderRadius: 7,
  },
  brandName: {
    fontSize: 16,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    backgroundColor: '#f4f4f5',
  },
  skipBtnText: {
    fontSize: 12,
    fontFamily: fontFamily.medium,
    fontWeight: fontWeight.medium,
    color: '#52525b',
  },

  /* Header Box */
  headerBox: {
    marginBottom: 20,
  },
  stepBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fef3c7',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.full,
    marginBottom: 10,
  },
  stepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f59e0b',
  },
  stepBadgeText: {
    fontSize: 10,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: '#b45309',
    letterSpacing: 0.6,
  },
  mainTitle: {
    fontSize: 26,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: '#0f172a',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subTitle: {
    fontSize: 14,
    fontFamily: fontFamily.regular,
    color: '#52525b',
    lineHeight: 20,
  },

  /* Avatar Card */
  avatarCard: {
    backgroundColor: '#ffffff',
    borderRadius: radius.xl,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  avatarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  avatarStage: {
    position: 'relative',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff3bf',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffc400',
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarInitial: {
    fontSize: 26,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: '#0f172a',
  },
  cameraIconBtn: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#e4e4e7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  avatarTextCol: {
    flex: 1,
  },
  avatarHeading: {
    fontSize: 14,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: '#0f172a',
  },
  avatarSubHeading: {
    fontSize: 12,
    fontFamily: fontFamily.regular,
    color: '#71717a',
    marginTop: 2,
  },
  avatarPresetsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f4f4f5',
  },
  presetCircle: {
    position: 'relative',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f4f4f5',
    borderWidth: 2,
    borderColor: '#e4e4e7',
    overflow: 'hidden',
  },
  presetCircleSelected: {
    borderColor: '#ffc400',
    borderWidth: 2.5,
  },
  presetImg: {
    width: '100%',
    height: '100%',
  },
  presetActiveCheck: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#ffc400',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Card Section */
  cardSection: {
    backgroundColor: '#ffffff',
    borderRadius: radius.xl,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f4f4f5',
  },
  headerIconBubble: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: '#f4f4f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTitleBox: {
    flex: 1,
  },
  cardSectionTitle: {
    fontSize: 15,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: '#0f172a',
  },
  cardSectionSubtitle: {
    fontSize: 11,
    fontFamily: fontFamily.regular,
    color: '#71717a',
    marginTop: 1,
  },
  requiredPill: {
    backgroundColor: '#f4f4f5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  requiredPillText: {
    fontSize: 9,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: '#3f3f46',
    letterSpacing: 0.5,
  },
  optionalPill: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#d1fae5',
  },
  optionalPillText: {
    fontSize: 9,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: '#059669',
    letterSpacing: 0.5,
  },

  /* Input Styling */
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: fontFamily.medium,
    fontWeight: fontWeight.medium,
    color: '#3f3f46',
    marginBottom: 6,
  },
  optionalTag: {
    fontSize: 11,
    fontFamily: fontFamily.regular,
    fontWeight: fontWeight.regular,
    color: '#a1a1aa',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fbfbfb',
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: '#e4e4e7',
    height: 48,
    paddingHorizontal: 12,
    gap: 9,
  },
  inputBoxFocused: {
    borderColor: '#ffc400',
    backgroundColor: '#ffffff',
    shadowColor: '#ffc400',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 2,
  },
  inputBoxError: {
    borderColor: '#ef4444',
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: fontFamily.medium,
    color: '#0f172a',
    height: '100%',
  },
  countryCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  flagEmoji: {
    fontSize: 14,
  },
  countryCodeText: {
    fontSize: 13,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: '#0f172a',
  },
  inputDivider: {
    width: 1,
    height: 18,
    backgroundColor: '#e4e4e7',
    marginRight: 2,
  },
  fieldErrorText: {
    fontSize: 11,
    fontFamily: fontFamily.medium,
    color: '#ef4444',
    marginTop: 4,
    marginLeft: 2,
  },

  /* Two Column Layout */
  twoColumnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  flex1: {
    flex: 1,
  },

  /* Auto Detect Location Button */
  detectLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    paddingVertical: 10,
    borderRadius: radius.md,
    marginBottom: 14,
  },
  detectLocationText: {
    fontSize: 12,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: '#92400e',
  },

  /* Bottom Actions */
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: radius.full,
    backgroundColor: '#ffc400',
    marginTop: 6,
    shadowColor: '#ffc400',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  completeBtnText: {
    fontSize: 15,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: '#0f172a',
  },
  btnDisabled: {
    opacity: 0.6,
  },

  secondarySkipBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  secondarySkipText: {
    fontSize: 13,
    fontFamily: fontFamily.medium,
    fontWeight: fontWeight.medium,
    color: '#71717a',
  },

  signOutBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  signOutBtnText: {
    fontSize: 12,
    fontFamily: fontFamily.medium,
    fontWeight: fontWeight.medium,
    color: '#a1a1aa',
  },

  /* ========================================================================= */
  /* 🌟 FULL SCREEN INTERACTIVE LOADING OVERLAY STYLES                        */
  /* ========================================================================= */
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0a0e1a',
    zIndex: 99999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  loadingTopBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#131b2e',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 36,
  },
  loadingTopBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffc400',
  },
  loadingTopBadgeText: {
    fontSize: 10,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: '#ffc400',
    letterSpacing: 0.8,
  },

  /* Center Stage */
  loadingCenterStage: {
    position: 'relative',
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  loadingPulseGlow: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255, 196, 0, 0.18)',
  },
  loadingAvatarRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#161f33',
    borderWidth: 3,
    borderColor: '#ffc400',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#ffc400',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 8,
  },
  loadingAvatarImg: {
    width: 78,
    height: 78,
    borderRadius: 39,
  },
  loadingAvatarInitial: {
    fontSize: 32,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: '#ffc400',
  },
  loadingSuccessBadge: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#ffc400',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Headings */
  loadingTextBox: {
    alignItems: 'center',
    marginBottom: 32,
  },
  loadingMainTitle: {
    fontSize: 22,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  loadingSubTitle: {
    fontSize: 13,
    fontFamily: fontFamily.regular,
    color: '#94a3b8',
    textAlign: 'center',
    maxWidth: 290,
    lineHeight: 18,
  },

  /* Checklist */
  loadingChecklist: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#131b2e',
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    gap: 12,
    marginBottom: 32,
  },
  loadingCheckItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  loadingCheckIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingCheckIconWrapCurrent: {
    backgroundColor: 'rgba(255, 196, 0, 0.15)',
    borderWidth: 1,
    borderColor: '#ffc400',
  },
  loadingCheckIconWrapDone: {
    backgroundColor: '#ffc400',
  },
  loadingCheckDotPending: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#475569',
  },
  loadingCheckText: {
    fontSize: 13,
    fontFamily: fontFamily.medium,
    fontWeight: fontWeight.medium,
    color: '#64748b',
  },
  loadingCheckTextCurrent: {
    color: '#ffc400',
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
  },
  loadingCheckTextDone: {
    color: '#f1f5f9',
    fontFamily: fontFamily.medium,
  },

  /* Progress Bar */
  loadingProgressBox: {
    width: '100%',
    maxWidth: 320,
  },
  loadingProgressBarTrack: {
    height: 4,
    backgroundColor: '#1e293b',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  loadingProgressBarFill: {
    height: '100%',
    backgroundColor: '#ffc400',
    borderRadius: 2,
  },
  loadingProgressMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  loadingProgressLabel: {
    fontSize: 11,
    fontFamily: fontFamily.regular,
    color: '#64748b',
  },
  loadingProgressPercent: {
    fontSize: 11,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: '#ffc400',
  },
});
