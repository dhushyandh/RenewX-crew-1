import React, { useState, useMemo, useRef, useEffect } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { api } from '@/services/api';
import { colors, spacing, radius, fontSize, fontWeight } from '@/theme';
import { renewxColors, renewxShadows, renewxTextStyle } from '@/design-system';
import { useSafeHeaderTop } from '@/lib/useSafeHeaderTop';
import HomeHeader from '@/components/HomeHeader';

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const safeTop = useSafeHeaderTop();
  const navigation = useNavigation<any>();
  const { user, updateUser, refreshUser } = useAuth();
  const toast = useToast();

  // Profile fields state
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [address, setAddress] = useState(user?.address || '');
  const [city, setCity] = useState(user?.city || 'Bangalore');
  const [stateName, setStateName] = useState(user?.state || 'Karnataka');
  const [pincode, setPincode] = useState(user?.pincode || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Sync latest user details pulled fresh from DB
  const initialSyncDone = useRef(false);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const freshUser = await refreshUser?.();
        if (freshUser && isMounted && !initialSyncDone.current) {
          initialSyncDone.current = true;
          if (freshUser.full_name !== undefined) setFullName(freshUser.full_name || '');
          if (freshUser.avatar_url !== undefined) setAvatarUrl(freshUser.avatar_url || '');
          if (freshUser.phone !== undefined) setPhone(freshUser.phone || '');
          if (freshUser.bio !== undefined) setBio(freshUser.bio || '');
          if (freshUser.address !== undefined) setAddress(freshUser.address || '');
          if (freshUser.city !== undefined) setCity(freshUser.city || 'Bangalore');
          if (freshUser.state !== undefined) setStateName(freshUser.state || 'Karnataka');
          if (freshUser.pincode !== undefined) setPincode(freshUser.pincode || '');
        }
      } catch {}
    })();
    return () => {
      isMounted = false;
    };
  }, [refreshUser]);

  // Email verification state
  const [showEmailChange, setShowEmailChange] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [verificationPending, setVerificationPending] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [codeSentTo, setCodeSentTo] = useState('');

  // Calculate profile completion percentage
  const completionPercentage = useMemo(() => {
    let score = 0;
    if (fullName.trim()) score += 20;
    if (user?.email) score += 20;
    if (phone.trim()) score += 20;
    if (address.trim()) score += 20;
    if (pincode.trim()) score += 10;
    if (avatarUrl.trim()) score += 10;
    return Math.min(score, 100);
  }, [fullName, user?.email, phone, address, pincode, avatarUrl]);

  // 1. Pick & Upload Profile Photo
  const handlePickImage = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission Required',
            'Please grant permission to access your photo library to set an avatar.'
          );
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

      const asset = result.assets[0];
      setUploadingImage(true);

      let uploadedUrl = '';
      if (asset.base64) {
        const res = await api.upload.base64(asset.base64, 'avatar.jpg', 'image/jpeg');
        uploadedUrl = res.url;
      } else if (asset.uri) {
        const res = await api.upload.image({
          uri: asset.uri,
          name: 'avatar.jpg',
          type: 'image/jpeg',
        });
        uploadedUrl = res.url;
      }

      if (uploadedUrl) {
        setAvatarUrl(uploadedUrl);
        toast.show({
          title: 'Photo Uploaded',
          message: 'Remember to tap Save Changes below to update your profile.',
          type: 'success',
        });
      }
    } catch (err: any) {
      Alert.alert(
        'Upload Failed',
        err?.message || 'Could not upload selected photo. Please try again.'
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemovePhoto = () => {
    setAvatarUrl('');
    toast.show({
      title: 'Photo Removed',
      message: 'Tap Save Changes to commit.',
      type: 'info',
    });
  };

  // 2. Save Full Profile Details to DB
  const handleSaveProfile = async () => {
    const trimmedName = fullName.trim();
    if (!trimmedName) {
      Alert.alert('Required', 'Please enter your full name.');
      return;
    }

    setSavingProfile(true);
    try {
      const payload = {
        full_name: trimmedName,
        avatar_url: avatarUrl.trim(),
        phone: phone.trim(),
        bio: bio.trim(),
        address: address.trim(),
        city: city.trim() || 'Bangalore',
        state: stateName.trim() || 'Karnataka',
        pincode: pincode.trim(),
      };

      // 1. Save directly into MongoDB database
      const res = await api.users.updateProfile(payload);

      // 2. Synchronize local AuthContext state
      if (res?.data) {
        await updateUser({
          full_name: res.data.full_name,
          avatar_url: res.data.avatar_url,
          phone: res.data.phone,
          bio: res.data.bio,
          address: res.data.address,
          city: res.data.city,
          state: res.data.state,
          pincode: res.data.pincode,
          saved_addresses: res.data.saved_addresses,
        });

        // Update local AsyncStorage addresses cache if address changed
        if (res.data.saved_addresses) {
          await AsyncStorage.setItem(
            '@renewx_saved_addresses',
            JSON.stringify(res.data.saved_addresses)
          ).catch(() => {});
        }
        await refreshUser?.();
      }

      toast.show({
        title: 'Profile Saved',
        message: 'Your profile and delivery coordinates have been updated in the database.',
        type: 'success',
      });
      navigation.goBack();
    } catch (err: any) {
      Alert.alert(
        'Save Failed',
        err?.message || 'Unable to update profile in database. Please try again.'
      );
    } finally {
      setSavingProfile(false);
    }
  };

  // 3. Request Email Verification Code
  const handleRequestEmailCode = async () => {
    const trimmed = newEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!trimmed || !emailRegex.test(trimmed)) {
      Alert.alert('Invalid Email', 'Please enter a valid new email address.');
      return;
    }

    if (trimmed === user?.email?.toLowerCase()) {
      Alert.alert('Same Email', 'The entered email is already your current email address.');
      return;
    }

    setSendingCode(true);
    try {
      await api.users.requestEmailVerification(trimmed);
      setCodeSentTo(trimmed);
      setVerificationPending(true);
      setVerificationCode('');
      toast.show({
        title: 'Verification Code Sent',
        message: `A 6-digit confirmation code was sent to ${trimmed}. Check your inbox.`,
        type: 'success',
      });
    } catch (err: any) {
      Alert.alert('Request Failed', err?.message || 'Could not send verification code.');
    } finally {
      setSendingCode(false);
    }
  };

  // 4. Verify Code and Commit Email Change to DB
  const handleVerifyEmailCode = async () => {
    const cleanCode = verificationCode.trim();
    if (!cleanCode || cleanCode.length !== 6) {
      Alert.alert(
        'Validation Error',
        'Please enter the 6-digit verification code sent to your new email.'
      );
      return;
    }

    setVerifyingCode(true);
    try {
      const res = await api.users.verifyEmailUpdate(cleanCode);
      if (res?.data) {
        await updateUser({
          email: res.data.email,
        });
      }

      toast.show({
        title: 'Email Updated in DB',
        message: `Your account email is now ${res?.data?.email || codeSentTo}.`,
        type: 'success',
      });

      setShowEmailChange(false);
      setVerificationPending(false);
      setNewEmail('');
      setVerificationCode('');
      setCodeSentTo('');
    } catch (err: any) {
      Alert.alert('Verification Failed', err?.message || 'Invalid or expired code. Please try again.');
    } finally {
      setVerifyingCode(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      {/* Top Bar Header */}
      <HomeHeader
        mode="standard"
        title="Edit Profile"
        onBack={() => navigation.goBack()}
        rightComponent={
          <TouchableOpacity
            style={[styles.headerSaveBtn, savingProfile && styles.btnDisabled]}
            onPress={handleSaveProfile}
            disabled={savingProfile}
            activeOpacity={0.8}
          >
            {savingProfile ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-sharp" size={16} color="#FFFFFF" />
                <Text style={styles.headerSaveBtnText}>Save</Text>
              </>
            )}
          </TouchableOpacity>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets?.bottom || 0, 24) + 60 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* 1. HERO AVATAR & COMPLETION CARD */}
        <View style={styles.heroCard}>
          <View style={styles.avatarSection}>
            <View style={styles.avatarOuterRing}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} resizeMode="cover" />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarFallbackLetter}>
                    {(fullName?.charAt(0) || user?.email?.charAt(0) || 'U').toUpperCase()}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.cameraIconBadge}
                onPress={handlePickImage}
                disabled={uploadingImage}
                activeOpacity={0.85}
              >
                {uploadingImage ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="camera" size={16} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.heroInfoCol}>
              <Text style={styles.heroName} numberOfLines={1}>
                {fullName || 'Your Name'}
              </Text>
              <Text style={styles.heroEmail} numberOfLines={1}>
                {user?.email || ''}
              </Text>

              {/* Photo Action Buttons */}
              <View style={styles.photoActionsRow}>
                <TouchableOpacity
                  style={styles.photoBtn}
                  onPress={handlePickImage}
                  disabled={uploadingImage}
                  activeOpacity={0.7}
                >
                  <Ionicons name="image-outline" size={13} color="#0F172A" />
                  <Text style={styles.photoBtnText}>
                    {uploadingImage ? 'Uploading...' : 'Change Photo'}
                  </Text>
                </TouchableOpacity>

                {avatarUrl ? (
                  <TouchableOpacity
                    style={[styles.photoBtn, styles.photoBtnRemove]}
                    onPress={handleRemovePhoto}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={13} color={renewxColors.error} />
                    <Text style={[styles.photoBtnText, styles.photoBtnRemoveText]}>Remove</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </View>

          {/* Profile Completion Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressHeaderRow}>
              <Text style={styles.progressTitle}>Profile Strength</Text>
              <Text style={styles.progressPercent}>{completionPercentage}%</Text>
            </View>
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${completionPercentage}%` },
                  completionPercentage >= 80 && styles.progressBarFillHigh,
                ]}
              />
            </View>
            <Text style={styles.progressTip}>
              {completionPercentage >= 100
                ? 'Your profile is fully completed and optimized for express delivery!'
                : 'Add address, phone number & avatar to enable 1-click doorstep delivery.'}
            </Text>
          </View>
        </View>

        {/* 2. PERSONAL DETAILS CARD */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionHeaderIcon}>
            <Ionicons name="person" size={16} color="#059669" />
          </View>
          <Text style={styles.sectionTitle}>Personal Information</Text>
        </View>

        <View style={styles.cardContainer}>
          {/* Full Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Full Name <Text style={styles.asterisk}>*</Text>
            </Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={18} color="#94A3B8" />
              <TextInput
                style={styles.textInput}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your full name"
                placeholderTextColor="#94A3B8"
                autoCapitalize="words"
              />
              {fullName.length > 0 && (
                <TouchableOpacity onPress={() => setFullName('')}>
                  <Ionicons name="close-circle" size={16} color="#CBD5E1" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.fieldDivider} />

          {/* Mobile Phone */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Mobile Phone</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="call-outline" size={18} color="#94A3B8" />
              <TextInput
                style={styles.textInput}
                value={phone}
                onChangeText={(val) => setPhone(val.replace(/\D/g, ''))}
                placeholder="10-digit mobile number"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                maxLength={10}
              />
              {phone.length > 0 && (
                <TouchableOpacity onPress={() => setPhone('')}>
                  <Ionicons name="close-circle" size={16} color="#CBD5E1" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.fieldDivider} />

          {/* Bio / About */}
          <View style={styles.fieldGroup}>
            <View style={styles.fieldLabelRow}>
              <Text style={styles.fieldLabel}>Bio / Status</Text>
              <Text style={styles.charCount}>{bio.length}/150</Text>
            </View>
            <View style={[styles.inputContainer, styles.bioInputContainer]}>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={18}
                color="#94A3B8"
                style={{ marginTop: 2 }}
              />
              <TextInput
                style={[styles.textInput, styles.bioInput]}
                value={bio}
                onChangeText={(val) => setBio(val.slice(0, 150))}
                placeholder="Brief note about your tech interests..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={2}
              />
            </View>
          </View>

          <View style={styles.fieldDivider} />

          {/* Account Role & Tier */}
          <View style={styles.roleBanner}>
            <View
              style={[
                styles.roleBadgeCircle,
                { backgroundColor: user?.role === 'admin' ? '#FEF3C7' : '#ECFDF5' },
              ]}
            >
              <Ionicons
                name={user?.role === 'admin' ? 'shield-checkmark' : 'sparkles'}
                size={16}
                color={user?.role === 'admin' ? '#D97706' : '#059669'}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.roleTitle}>
                {user?.role === 'admin' ? 'RenewX Administrator' : 'RenewX Verified Customer'}
              </Text>
              <Text style={styles.roleSub}>
                {user?.role === 'admin'
                  ? 'Authorized with management and store administration privileges'
                  : 'Full access to pre-owned marketplace, instant trade-ins & live tracking'}
              </Text>
            </View>
          </View>
        </View>

        {/* 3. PRIMARY DELIVERY ADDRESS CARD */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionHeaderIcon}>
            <Ionicons name="location" size={16} color="#059669" />
          </View>
          <Text style={styles.sectionTitle}>Primary Delivery Address</Text>
          <TouchableOpacity
            style={styles.sectionLinkBtn}
            onPress={() => navigation.navigate('ManageAddresses')}
            activeOpacity={0.7}
          >
            <Text style={styles.sectionLinkBtnText}>Manage All</Text>
            <Ionicons name="chevron-forward" size={14} color="#059669" />
          </TouchableOpacity>
        </View>

        <View style={styles.cardContainer}>
          {/* Street Address */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Flat / Building / Street</Text>
            <View style={[styles.inputContainer, { height: 60, alignItems: 'flex-start', paddingTop: 8 }]}>
              <Ionicons name="home-outline" size={18} color="#94A3B8" style={{ marginTop: 2 }} />
              <TextInput
                style={[styles.textInput, { height: '100%', textAlignVertical: 'top' }]}
                value={address}
                onChangeText={setAddress}
                placeholder="House / Apartment no., Street name, Locality"
                placeholderTextColor="#94A3B8"
                multiline
              />
            </View>
          </View>

          <View style={styles.fieldDivider} />

          {/* City & PIN Code 2-Column Row */}
          <View style={styles.twoColRow}>
            <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.fieldLabel}>City</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="business-outline" size={18} color="#94A3B8" />
                <TextInput
                  style={styles.textInput}
                  value={city}
                  onChangeText={setCity}
                  placeholder="Bangalore"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            <View style={[styles.fieldGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.fieldLabel}>PIN Code</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={18} color="#94A3B8" />
                <TextInput
                  style={styles.textInput}
                  value={pincode}
                  onChangeText={(val) => setPincode(val.replace(/\D/g, ''))}
                  placeholder="560001"
                  placeholderTextColor="#94A3B8"
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>
            </View>
          </View>

          <View style={styles.fieldDivider} />

          {/* State */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>State / Region</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="map-outline" size={18} color="#94A3B8" />
              <TextInput
                style={styles.textInput}
                value={stateName}
                onChangeText={setStateName}
                placeholder="Karnataka"
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>

          <View style={styles.fieldDivider} />

          <View style={styles.addressTipRow}>
            <Ionicons name="information-circle-outline" size={16} color="#059669" />
            <Text style={styles.addressTipText}>
              Please enter your primary delivery address. This address will be used for all your orders and deliveries.
            </Text>
          </View>
        </View>

        {/* 4. EMAIL & SECURITY CARD */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionHeaderIcon}>
            <Ionicons name="shield-checkmark" size={16} color="#059669" />
          </View>
          <Text style={styles.sectionTitle}>Account & Credentials</Text>
        </View>

        <View style={styles.cardContainer}>
          {/* Active Email Display */}
          <View style={styles.activeEmailRow}>
            <View style={styles.activeEmailIconCircle}>
              <Ionicons name="mail" size={18} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.activeEmailLabel}>Registered Email</Text>
              <Text style={styles.activeEmailValue}>{user?.email}</Text>
            </View>
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={12} color="#059669" />
              <Text style={styles.verifiedBadgeText}>VERIFIED</Text>
            </View>
          </View>

          {!showEmailChange ? (
            <TouchableOpacity
              style={styles.changeEmailToggle}
              onPress={() => {
                setShowEmailChange(true);
                setNewEmail('');
                setVerificationPending(false);
              }}
              activeOpacity={0.75}
            >
              <Ionicons name="swap-horizontal" size={16} color="#0F172A" />
              <Text style={styles.changeEmailToggleText}>Change Email Address</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.changeEmailContainer}>
              <View style={styles.securityAlert}>
                <Ionicons name="shield-checkmark" size={16} color="#0284C7" />
                <Text style={styles.securityAlertText}>
                  Your current email remains active until you verify the 6-digit code sent to your new address.
                </Text>
              </View>

              {!verificationPending ? (
                /* Step 1: Input New Email */
                <View>
                  <Text style={styles.fieldLabel}>New Email Address</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="mail-outline" size={18} color="#94A3B8" />
                    <TextInput
                      style={styles.textInput}
                      value={newEmail}
                      onChangeText={setNewEmail}
                      placeholder="newemail@example.com"
                      placeholderTextColor="#94A3B8"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>

                  <View style={styles.emailActionsRow}>
                    <TouchableOpacity
                      style={[styles.sendCodeBtn, sendingCode && styles.btnDisabled]}
                      onPress={handleRequestEmailCode}
                      disabled={sendingCode}
                      activeOpacity={0.85}
                    >
                      {sendingCode ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons name="send" size={13} color="#FFFFFF" style={{ marginRight: 6 }} />
                          <Text style={styles.sendCodeBtnText}>Send 6-Digit Code</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.cancelEmailBtn}
                      onPress={() => {
                        setShowEmailChange(false);
                        setNewEmail('');
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.cancelEmailBtnText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                /* Step 2: Verification Code Input */
                <View>
                  <View style={styles.stepHeaderRow}>
                    <View style={styles.stepBadge}>
                      <Text style={styles.stepBadgeText}>STEP 2 OF 2</Text>
                    </View>
                    <Text style={styles.sentToText} numberOfLines={1}>
                      Code sent to: <Text style={styles.sentToTextBold}>{codeSentTo}</Text>
                    </Text>
                  </View>

                  <Text style={styles.fieldLabel}>Enter 6-Digit Confirmation Code</Text>
                  <TextInput
                    style={styles.otpInput}
                    value={verificationCode}
                    onChangeText={setVerificationCode}
                    placeholder="• • • • • •"
                    placeholderTextColor="#CBD5E1"
                    keyboardType="number-pad"
                    maxLength={6}
                  />

                  <View style={styles.emailActionsRow}>
                    <TouchableOpacity
                      style={[styles.verifyBtn, verifyingCode && styles.btnDisabled]}
                      onPress={handleVerifyEmailCode}
                      disabled={verifyingCode}
                      activeOpacity={0.85}
                    >
                      {verifyingCode ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                          <Text style={styles.verifyBtnText}>Verify & Save to DB</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.resendBtn}
                      onPress={handleRequestEmailCode}
                      disabled={sendingCode}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.resendBtnText}>Resend</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}

          <View style={styles.fieldDivider} />

          {/* Quick link to Security / Password screen */}
          <TouchableOpacity
            style={styles.securityNavRow}
            onPress={() => navigation.navigate('Security')}
            activeOpacity={0.7}
          >
            <View style={styles.securityNavIconBox}>
              <Ionicons name="key-outline" size={18} color="#0F172A" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.securityNavTitle}>Password & Security</Text>
              <Text style={styles.securityNavSub}>Change password, 2FA, session devices</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* 5. BOTTOM SAVE CTA BUTTON */}
        <TouchableOpacity
          style={[styles.bigSaveBtn, savingProfile && styles.btnDisabled]}
          onPress={handleSaveProfile}
          disabled={savingProfile}
          activeOpacity={0.85}
        >
          {savingProfile ? (
            <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
          ) : (
            <Ionicons name="save-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
          )}
          <Text style={styles.bigSaveBtnText}>
            {savingProfile ? 'Saving to Database...' : 'Save Profile Changes'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: renewxColors.background,
  },
  scrollContent: {
    padding: spacing.md,
  },

  // Header Save Button
  headerSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: renewxColors.emerald,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    gap: 4,
  },
  headerSaveBtnText: {
    fontSize: fontSize.xs,
    ...renewxTextStyle('bold'),
    color: renewxColors.white,
  },
  btnDisabled: {
    opacity: 0.65,
  },

  // Hero Card
  heroCard: {
    backgroundColor: renewxColors.surface,
    borderRadius: radius.xxl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: renewxColors.border,
    ...(renewxShadows.card as object),
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarOuterRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    borderColor: renewxColors.emerald,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    position: 'relative',
    backgroundColor: renewxColors.surfaceMuted,
  },
  avatarImage: {
    width: 76,
    height: 76,
    borderRadius: 38,
  },
  avatarFallback: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: renewxColors.black,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallbackLetter: {
    fontSize: 30,
    ...renewxTextStyle('bold'),
    color: renewxColors.white,
  },
  cameraIconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: renewxColors.emerald,
    borderWidth: 2,
    borderColor: renewxColors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroInfoCol: {
    flex: 1,
  },
  heroName: {
    fontSize: fontSize.lg,
    ...renewxTextStyle('bold'),
    color: renewxColors.black,
    marginBottom: 2,
  },
  heroEmail: {
    fontSize: fontSize.xs,
    ...renewxTextStyle('regular'),
    color: renewxColors.textMuted,
    marginBottom: 8,
  },
  photoActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: renewxColors.surfaceMuted,
    borderRadius: radius.full,
    gap: 4,
  },
  photoBtnRemove: {
    backgroundColor: '#FEF2F2',
  },
  photoBtnText: {
    fontSize: fontSize.xs,
    ...renewxTextStyle('semibold'),
    color: renewxColors.black,
  },
  photoBtnRemoveText: {
    color: renewxColors.error,
  },

  // Progress Bar
  progressContainer: {
    backgroundColor: renewxColors.background,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: renewxColors.border,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressTitle: {
    fontSize: fontSize.xs,
    ...renewxTextStyle('bold'),
    color: renewxColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressPercent: {
    fontSize: fontSize.xs,
    ...renewxTextStyle('bold'),
    color: renewxColors.emerald,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: renewxColors.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: renewxColors.yellow,
    borderRadius: 3,
  },
  progressBarFillHigh: {
    backgroundColor: renewxColors.emerald,
  },
  progressTip: {
    fontSize: fontSize.xs,
    ...renewxTextStyle('regular'),
    color: renewxColors.textMuted,
    lineHeight: 16,
  },

  // Section Headers
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    paddingHorizontal: 2,
    marginTop: spacing.sm,
  },
  sectionHeaderIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: renewxColors.mint,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  sectionTitle: {
    flex: 1,
    fontSize: fontSize.sm,
    ...renewxTextStyle('bold'),
    color: renewxColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  sectionLinkBtnText: {
    fontSize: fontSize.xs,
    ...renewxTextStyle('bold'),
    color: renewxColors.emerald,
  },

  // Card Containers
  cardContainer: {
    backgroundColor: renewxColors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: renewxColors.border,
    ...(renewxShadows.card as object),
  },
  fieldGroup: {
    marginVertical: 4,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: fontSize.xs,
    ...renewxTextStyle('semibold'),
    color: renewxColors.textSecondary,
    marginBottom: 6,
  },
  asterisk: {
    color: renewxColors.error,
  },
  charCount: {
    fontSize: 10.5,
    ...renewxTextStyle('medium'),
    color: '#94A3B8',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: renewxColors.background,
    borderWidth: 1,
    borderColor: renewxColors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  textInput: {
    flex: 1,
    fontSize: fontSize.sm,
    ...renewxTextStyle('regular'),
    color: renewxColors.black,
    paddingVertical: 0,
    ...Platform.select({ web: { outlineStyle: 'none' } as any }),
  },
  bioInputContainer: {
    height: 'auto',
    minHeight: 54,
    paddingVertical: 8,
    alignItems: 'flex-start',
  },
  bioInput: {
    minHeight: 38,
    textAlignVertical: 'top',
  },
  twoColRow: {
    flexDirection: 'row',
  },
  fieldDivider: {
    height: 1,
    backgroundColor: renewxColors.surfaceMuted,
    marginVertical: spacing.sm,
  },

  // Role Banner
  roleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: renewxColors.background,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: 10,
    marginTop: 4,
  },
  roleBadgeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleTitle: {
    fontSize: fontSize.xs,
    ...renewxTextStyle('bold'),
    color: renewxColors.black,
  },
  roleSub: {
    fontSize: 10.5,
    ...renewxTextStyle('regular'),
    color: renewxColors.textMuted,
    lineHeight: 14,
    marginTop: 1,
  },

  // Address Tip
  addressTipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: renewxColors.mintLight,
    borderWidth: 1,
    borderColor: renewxColors.mintBorder,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: 8,
  },
  addressTipText: {
    flex: 1,
    fontSize: fontSize.xs,
    ...renewxTextStyle('regular'),
    color: renewxColors.mintDark,
    lineHeight: 16,
  },

  // Active Email Row
  activeEmailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: renewxColors.background,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 10,
    marginBottom: spacing.sm,
  },
  activeEmailIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: renewxColors.mint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeEmailLabel: {
    fontSize: 10.5,
    color: renewxColors.textMuted,
    textTransform: 'uppercase',
    ...renewxTextStyle('semibold'),
  },
  activeEmailValue: {
    fontSize: fontSize.sm,
    ...renewxTextStyle('bold'),
    color: renewxColors.black,
    marginTop: 1,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: renewxColors.mint,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: renewxColors.mintBorder,
    gap: 4,
  },
  verifiedBadgeText: {
    fontSize: 9.5,
    ...renewxTextStyle('bold'),
    color: renewxColors.emerald,
    letterSpacing: 0.5,
  },

  changeEmailToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: renewxColors.surfaceMuted,
    borderRadius: radius.md,
    gap: 6,
  },
  changeEmailToggleText: {
    fontSize: fontSize.xs,
    ...renewxTextStyle('bold'),
    color: renewxColors.black,
  },

  changeEmailContainer: {
    backgroundColor: renewxColors.background,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: renewxColors.border,
  },
  securityAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderRadius: radius.sm,
    padding: spacing.sm,
    gap: 8,
    marginBottom: spacing.md,
  },
  securityAlertText: {
    flex: 1,
    fontSize: 11.5,
    ...renewxTextStyle('regular'),
    color: '#0369A1',
    lineHeight: 15,
  },
  emailActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing.md,
  },
  sendCodeBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: renewxColors.black,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  sendCodeBtnText: {
    fontSize: fontSize.xs,
    ...renewxTextStyle('bold'),
    color: renewxColors.white,
  },
  cancelEmailBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: renewxColors.surfaceMuted,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  cancelEmailBtnText: {
    fontSize: fontSize.xs,
    ...renewxTextStyle('semibold'),
    color: renewxColors.textSecondary,
  },
  stepHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  stepBadge: {
    backgroundColor: renewxColors.emerald,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: radius.sm,
  },
  stepBadgeText: {
    fontSize: 9.5,
    ...renewxTextStyle('bold'),
    color: renewxColors.white,
  },
  sentToText: {
    fontSize: fontSize.xs,
    ...renewxTextStyle('regular'),
    color: renewxColors.textSecondary,
  },
  sentToTextBold: {
    ...renewxTextStyle('bold'),
    color: renewxColors.black,
  },
  otpInput: {
    height: 48,
    backgroundColor: renewxColors.surface,
    borderWidth: 1.5,
    borderColor: renewxColors.emerald,
    borderRadius: radius.md,
    textAlign: 'center',
    fontSize: fontSize.lg,
    ...renewxTextStyle('bold'),
    letterSpacing: 8,
    color: renewxColors.black,
    ...Platform.select({ web: { outlineStyle: 'none' } as any }),
  },
  verifyBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: renewxColors.emerald,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  verifyBtnText: {
    fontSize: fontSize.xs,
    ...renewxTextStyle('bold'),
    color: renewxColors.white,
  },
  resendBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: renewxColors.surfaceMuted,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  resendBtnText: {
    fontSize: fontSize.xs,
    ...renewxTextStyle('semibold'),
    color: renewxColors.textSecondary,
  },

  // Security Nav Row
  securityNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 10,
  },
  securityNavIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: renewxColors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  securityNavTitle: {
    fontSize: fontSize.sm,
    ...renewxTextStyle('bold'),
    color: renewxColors.black,
  },
  securityNavSub: {
    fontSize: 11.5,
    ...renewxTextStyle('regular'),
    color: renewxColors.textMuted,
    marginTop: 1,
  },

  // Big Bottom Save CTA
  bigSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: renewxColors.emerald,
    paddingVertical: 14,
    borderRadius: radius.xl,
    marginTop: spacing.sm,
    ...(renewxShadows.elevated as object),
  },
  bigSaveBtnText: {
    fontSize: fontSize.md,
    ...renewxTextStyle('bold'),
    color: renewxColors.white,
    letterSpacing: 0.3,
  },
});
