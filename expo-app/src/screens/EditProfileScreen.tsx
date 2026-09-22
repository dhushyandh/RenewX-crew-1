import React, { useState } from 'react';
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
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { api } from '@/services/api';
import { colors, spacing, radius, fontFamily } from '@/theme';
import { useSafeHeaderTop } from '@/lib/useSafeHeaderTop';

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const safeTop = useSafeHeaderTop();
  const navigation = useNavigation();
  const { user, updateUser } = useAuth();
  const toast = useToast();

  // Profile fields
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [address, setAddress] = useState(user?.address || '');
  const [city, setCity] = useState(user?.city || '');
  const [stateName, setStateName] = useState(user?.state || '');
  const [pincode, setPincode] = useState(user?.pincode || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Email verification state
  const [showEmailChange, setShowEmailChange] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [verificationPending, setVerificationPending] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [codeSentTo, setCodeSentTo] = useState('');

  // 1. Pick & Upload Profile Image
  const handlePickImage = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Please grant permission to access your photo library to set an avatar.');
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
        const res = await api.upload.image({ uri: asset.uri, name: 'avatar.jpg', type: 'image/jpeg' });
        uploadedUrl = res.url;
      }

      if (uploadedUrl) {
        setAvatarUrl(uploadedUrl);
        toast.show({ title: 'Photo Uploaded', message: 'Remember to save changes to keep your new profile picture.', type: 'success' });
      }
    } catch (err: any) {
      Alert.alert('Upload Failed', err?.message || 'Could not upload selected photo. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemovePhoto = () => {
    setAvatarUrl('');
  };

  // 2. Save Full Profile Details
  const handleSaveProfile = async () => {
    const trimmedName = fullName.trim();
    if (!trimmedName) {
      Alert.alert('Validation Error', 'Please enter your full name.');
      return;
    }

    setSavingProfile(true);
    try {
      const res = await api.users.updateProfile({
        full_name: trimmedName,
        avatar_url: avatarUrl.trim(),
        phone: phone.trim(),
        bio: bio.trim(),
        address: address.trim(),
        city: city.trim(),
        state: stateName.trim(),
        pincode: pincode.trim(),
      });

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
        });
      }

      toast.show({
        title: 'Profile Updated',
        message: 'Your profile details have been saved successfully.',
        type: 'success',
      });
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Update Failed', err?.message || 'Unable to update profile. Please try again.');
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
      const res = await api.users.requestEmailVerification(trimmed);
      setCodeSentTo(trimmed);
      setVerificationPending(true);
      setVerificationCode('');
      toast.show({
        title: 'Verification Code Sent',
        message: `A 6-digit code was sent to ${trimmed}. Check your inbox.`,
        type: 'success',
      });
    } catch (err: any) {
      Alert.alert('Request Failed', err?.message || 'Could not send verification code.');
    } finally {
      setSendingCode(false);
    }
  };

  // 4. Verify Code and Commit Email Change
  const handleVerifyEmailCode = async () => {
    const cleanCode = verificationCode.trim();
    if (!cleanCode || cleanCode.length !== 6) {
      Alert.alert('Validation Error', 'Please enter the 6-digit verification code sent to your new email.');
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
        title: 'Email Verified & Updated',
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
      style={[styles.container, { paddingTop: safeTop }]}
    >
      {/* Sleek Header Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <View style={styles.navTextContainer}>
          <Text style={styles.navTitle}>Edit Profile</Text>
          <Text style={styles.navSub}>Personal details & verified email</Text>
        </View>
        <TouchableOpacity
          style={[styles.navSaveBtn, savingProfile && styles.btnDisabled]}
          onPress={handleSaveProfile}
          disabled={savingProfile}
          activeOpacity={0.8}
        >
          {savingProfile ? (
            <ActivityIndicator size="small" color="#000000" />
          ) : (
            <>
              <Ionicons name="checkmark" size={14} color="#000000" />
              <Text style={styles.navSaveText}>Save</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets?.bottom || 0, 24) + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Luxury Avatar Section */}
        <View style={styles.avatarCard}>
          <View style={styles.avatarGlow} />
          <View style={styles.avatarWrapper}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImg} resizeMode="cover" />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {(fullName?.charAt(0) || user?.email?.charAt(0) || 'U').toUpperCase()}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.cameraBadge}
              onPress={handlePickImage}
              disabled={uploadingImage}
              activeOpacity={0.85}
            >
              {uploadingImage ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <Ionicons name="camera" size={16} color="#000000" />
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.avatarTip}>
            {uploadingImage ? 'Uploading photo...' : 'Tap the camera button to change your photo'}
          </Text>

          <View style={styles.avatarActionsRow}>
            <TouchableOpacity
              style={styles.actionPill}
              onPress={handlePickImage}
              disabled={uploadingImage}
              activeOpacity={0.75}
            >
              <Ionicons name="image-outline" size={14} color="#0f172a" />
              <Text style={styles.actionPillText}>{uploadingImage ? 'Uploading...' : 'Choose from Library'}</Text>
            </TouchableOpacity>

            {avatarUrl ? (
              <TouchableOpacity
                style={[styles.actionPill, styles.actionPillDestructive]}
                onPress={handleRemovePhoto}
                activeOpacity={0.75}
              >
                <Ionicons name="trash-outline" size={14} color="#dc2626" />
                <Text style={[styles.actionPillText, { color: '#dc2626' }]}>Remove</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Section 1: Personal Information */}
        <Text style={styles.sectionHeader}>Personal Details</Text>
        <View style={styles.formCard}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <View style={styles.inputWrapper}>
              <View style={styles.inputIconBox}>
                <Ionicons name="person-outline" size={18} color="#64748b" />
              </View>
              <TextInput
                style={styles.textInput}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your full name"
                placeholderTextColor="#94a3b8"
                autoCapitalize="words"
              />
              {fullName.length > 0 && (
                <TouchableOpacity
                  onPress={() => setFullName('')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={18} color="#cbd5e1" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.dividerLine} />

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <View style={styles.inputWrapper}>
              <View style={styles.inputIconBox}>
                <Ionicons name="call-outline" size={18} color="#64748b" />
              </View>
              <TextInput
                style={styles.textInput}
                value={phone}
                onChangeText={setPhone}
                placeholder="+91 98765 43210"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
              />
              {phone.length > 0 && (
                <TouchableOpacity
                  onPress={() => setPhone('')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={18} color="#cbd5e1" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.dividerLine} />

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Bio / About</Text>
            <View style={[styles.inputWrapper, { height: 'auto', minHeight: 48, paddingVertical: 8, alignItems: 'flex-start' }]}>
              <View style={[styles.inputIconBox, { marginTop: 4 }]}>
                <Ionicons name="document-text-outline" size={18} color="#64748b" />
              </View>
              <TextInput
                style={[styles.textInput, { minHeight: 40, textAlignVertical: 'top' }]}
                value={bio}
                onChangeText={setBio}
                placeholder="A brief line about yourself"
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={2}
              />
            </View>
          </View>

          <View style={styles.dividerLine} />

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Account Status</Text>
            <View style={styles.roleCard}>
              <View style={[styles.roleIconCircle, { backgroundColor: user?.role === 'admin' ? '#fef3c7' : '#ecfdf5' }]}>
                <Ionicons
                  name={user?.role === 'admin' ? 'shield-checkmark' : 'sparkles'}
                  size={18}
                  color={user?.role === 'admin' ? '#d97706' : '#059669'}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.roleTitle}>
                  {user?.role === 'admin' ? 'Administrator Account' : 'Verified Member Account'}
                </Text>
                <Text style={styles.roleSub}>
                  {user?.role === 'admin'
                    ? 'Full permissions to manage store and orders'
                    : 'Authorized to shop, sell devices and track orders'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Section 2: Address & Shipping Details */}
        <Text style={styles.sectionHeader}>Address & Delivery Details</Text>
        <View style={styles.formCard}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Street / Building / Flat</Text>
            <View style={styles.inputWrapper}>
              <View style={styles.inputIconBox}>
                <Ionicons name="home-outline" size={18} color="#64748b" />
              </View>
              <TextInput
                style={styles.textInput}
                value={address}
                onChangeText={setAddress}
                placeholder="House / Apartment no., Street name"
                placeholderTextColor="#94a3b8"
              />
            </View>
          </View>

          <View style={styles.dividerLine} />

          <View style={styles.twoColumnRow}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 6 }]}>
              <Text style={styles.inputLabel}>City</Text>
              <View style={styles.inputWrapper}>
                <View style={styles.inputIconBox}>
                  <Ionicons name="business-outline" size={17} color="#64748b" />
                </View>
                <TextInput
                  style={styles.textInput}
                  value={city}
                  onChangeText={setCity}
                  placeholder="e.g. Chennai"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 6 }]}>
              <Text style={styles.inputLabel}>PIN / Postal Code</Text>
              <View style={styles.inputWrapper}>
                <View style={styles.inputIconBox}>
                  <Ionicons name="pin-outline" size={17} color="#64748b" />
                </View>
                <TextInput
                  style={styles.textInput}
                  value={pincode}
                  onChangeText={setPincode}
                  placeholder="600001"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          <View style={styles.dividerLine} />

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>State / Region</Text>
            <View style={styles.inputWrapper}>
              <View style={styles.inputIconBox}>
                <Ionicons name="map-outline" size={18} color="#64748b" />
              </View>
              <TextInput
                style={styles.textInput}
                value={stateName}
                onChangeText={setStateName}
                placeholder="e.g. Tamil Nadu"
                placeholderTextColor="#94a3b8"
              />
            </View>
          </View>
        </View>

        {/* Section 2: Email & Verification */}
        <Text style={styles.sectionHeader}>Email & Security</Text>
        <View style={styles.formCard}>
          {/* Current Email Display */}
          <View style={styles.emailDisplayRow}>
            <View style={styles.emailIconCircle}>
              <Ionicons name="mail" size={18} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.emailDisplayLabel}>Active Email</Text>
              <Text style={styles.emailDisplayValue}>{user?.email}</Text>
            </View>
            <View style={styles.activePill}>
              <Ionicons name="checkmark-circle" size={12} color="#059669" />
              <Text style={styles.activePillText}>Verified</Text>
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
              <Ionicons name="swap-horizontal" size={16} color="#0f172a" />
              <Text style={styles.changeEmailToggleText}>Change Email Address</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.changeEmailSection}>
              <View style={styles.securityNotice}>
                <Ionicons name="shield-checkmark-outline" size={16} color="#0369a1" />
                <Text style={styles.securityNoticeText}>
                  For security, your current email remains active until you confirm the 6-digit code sent to the new address.
                </Text>
              </View>

              {!verificationPending ? (
                /* Step 1: Input New Email */
                <View>
                  <Text style={styles.inputLabel}>New Email Address</Text>
                  <View style={styles.inputWrapper}>
                    <View style={styles.inputIconBox}>
                      <Ionicons name="mail-outline" size={18} color="#64748b" />
                    </View>
                    <TextInput
                      style={styles.textInput}
                      value={newEmail}
                      onChangeText={setNewEmail}
                      placeholder="name@example.com"
                      placeholderTextColor="#94a3b8"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>

                  <View style={styles.actionBtnRow}>
                    <TouchableOpacity
                      style={[styles.sendCodeBtn, sendingCode && styles.btnDisabled]}
                      onPress={handleRequestEmailCode}
                      disabled={sendingCode}
                      activeOpacity={0.85}
                    >
                      {sendingCode ? (
                        <ActivityIndicator size="small" color="#000000" />
                      ) : (
                        <>
                          <Ionicons name="send" size={14} color="#000000" style={{ marginRight: 6 }} />
                          <Text style={styles.sendCodeBtnText}>Send 6-Digit Code</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.cancelActionBtn}
                      onPress={() => {
                        setShowEmailChange(false);
                        setNewEmail('');
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.cancelActionBtnText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                /* Step 2: Verification Code Input */
                <View style={styles.codeVerifyContainer}>
                  <View style={styles.codeHeaderRow}>
                    <View style={styles.stepBadge}>
                      <Text style={styles.stepBadgeText}>STEP 2 OF 2</Text>
                    </View>
                    <Text style={styles.sentToText} numberOfLines={1}>
                      Sent to: <Text style={styles.sentToBold}>{codeSentTo}</Text>
                    </Text>
                  </View>

                  <Text style={styles.inputLabel}>Enter 6-Digit Code</Text>
                  <TextInput
                    style={styles.otpInput}
                    value={verificationCode}
                    onChangeText={setVerificationCode}
                    placeholder="• • • • • •"
                    placeholderTextColor="#cbd5e1"
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                  />

                  <View style={styles.actionBtnRow}>
                    <TouchableOpacity
                      style={[styles.verifySubmitBtn, verifyingCode && styles.btnDisabled]}
                      onPress={handleVerifyEmailCode}
                      disabled={verifyingCode}
                      activeOpacity={0.85}
                    >
                      {verifyingCode ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                          <Text style={styles.verifySubmitBtnText}>Verify & Save</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.resendActionBtn}
                      onPress={handleRequestEmailCode}
                      disabled={sendingCode}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.resendActionBtnText}>Resend</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Big Bottom Save CTA */}
        <TouchableOpacity
          style={[styles.bigPrimaryBtn, savingProfile && styles.btnDisabled]}
          onPress={handleSaveProfile}
          disabled={savingProfile}
          activeOpacity={0.85}
        >
          {savingProfile ? (
            <ActivityIndicator size="small" color="#000000" style={{ marginRight: 8 }} />
          ) : (
            <Ionicons name="checkmark-circle" size={19} color="#000000" style={{ marginRight: 8 }} />
          )}
          <Text style={styles.bigPrimaryBtnText}>
            {savingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f7f2',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#ebe7dd',
    backgroundColor: '#f8f7f2',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e8e4da',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  navTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  navTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 20,
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  navSub: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  navSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffc400',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#ffc400',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  navSaveText: {
    fontFamily: fontFamily.bold,
    color: '#000000',
    fontSize: 13,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  avatarCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e8e4da',
    marginBottom: 20,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarGlow: {
    position: 'absolute',
    top: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 196, 0, 0.08)',
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarImg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: '#ffc400',
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#ffc400',
  },
  avatarInitial: {
    fontFamily: fontFamily.bold,
    fontSize: 34,
    color: '#ffffff',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#ffc400',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#ffffff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  avatarTip: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: '#64748b',
    marginBottom: 14,
  },
  avatarActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  actionPillDestructive: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  actionPillText: {
    fontFamily: fontFamily.semibold,
    fontSize: 12,
    color: '#0f172a',
  },
  sectionHeader: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginLeft: 6,
    marginBottom: 8,
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e8e4da',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  inputGroup: {
    marginBottom: 8,
  },
  inputLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: 12,
    color: '#475569',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    height: 48,
  },
  inputIconBox: {
    width: 24,
    alignItems: 'center',
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: '#0f172a',
  },
  dividerLine: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 12,
  },
  twoColumnRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  roleIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: '#0f172a',
  },
  roleSub: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  emailDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emailIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emailDisplayLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    color: '#64748b',
    textTransform: 'uppercase',
  },
  emailDisplayValue: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: '#0f172a',
    marginTop: 1,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  activePillText: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    color: '#059669',
  },
  changeEmailToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingVertical: 11,
    marginTop: 12,
  },
  changeEmailToggleText: {
    fontFamily: fontFamily.semibold,
    fontSize: 13,
    color: '#0f172a',
  },
  changeEmailSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  securityNoticeText: {
    flex: 1,
    fontFamily: fontFamily.medium,
    fontSize: 11,
    lineHeight: 16,
    color: '#0369a1',
  },
  actionBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  sendCodeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffc400',
    paddingVertical: 12,
    borderRadius: 12,
  },
  sendCodeBtnText: {
    fontFamily: fontFamily.bold,
    color: '#000000',
    fontSize: 13,
  },
  cancelActionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cancelActionBtnText: {
    fontFamily: fontFamily.semibold,
    color: '#64748b',
    fontSize: 13,
  },
  codeVerifyContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  codeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  stepBadge: {
    backgroundColor: '#ffc400',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  stepBadgeText: {
    fontFamily: fontFamily.bold,
    fontSize: 9,
    color: '#000000',
    letterSpacing: 0.5,
  },
  sentToText: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: '#64748b',
    flex: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
  sentToBold: {
    fontFamily: fontFamily.bold,
    color: '#0f172a',
  },
  otpInput: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#ffc400',
    borderRadius: 12,
    height: 52,
    fontSize: 22,
    fontFamily: fontFamily.bold,
    letterSpacing: 8,
    textAlign: 'center',
    color: '#0f172a',
    marginBottom: 6,
  },
  verifySubmitBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    paddingVertical: 12,
    borderRadius: 12,
  },
  verifySubmitBtnText: {
    fontFamily: fontFamily.bold,
    color: '#ffffff',
    fontSize: 13,
  },
  resendActionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  resendActionBtnText: {
    fontFamily: fontFamily.bold,
    color: '#0f172a',
    fontSize: 13,
  },
  bigPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffc400',
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#ffc400',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
    marginTop: 6,
  },
  bigPrimaryBtnText: {
    fontFamily: fontFamily.bold,
    color: '#000000',
    fontSize: 15,
  },
});

