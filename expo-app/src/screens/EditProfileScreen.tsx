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
import { colors, spacing, radius } from '@/theme';
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

  // 2. Save Name and Avatar
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
      });

      if (res?.data) {
        await updateUser({
          full_name: res.data.full_name,
          avatar_url: res.data.avatar_url,
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
      {/* Top Navigation Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.navTitle}>Edit Profile</Text>
          <Text style={styles.navSub}>Manage personal info & verified email</Text>
        </View>
        <TouchableOpacity
          style={[styles.navSaveBtn, savingProfile && styles.btnDisabled]}
          onPress={handleSaveProfile}
          disabled={savingProfile}
        >
          {savingProfile ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.navSaveText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets?.bottom || 0, 24) + 40 }]}
      >
        {/* Avatar Section */}
        <View style={styles.avatarCard}>
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
              activeOpacity={0.8}
            >
              {uploadingImage ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Ionicons name="camera" size={16} color="#ffffff" />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.avatarActionsRow}>
            <TouchableOpacity style={styles.actionPill} onPress={handlePickImage} disabled={uploadingImage}>
              <Ionicons name="image-outline" size={14} color="#059669" />
              <Text style={styles.actionPillText}>{uploadingImage ? 'Uploading...' : 'Choose Photo'}</Text>
            </TouchableOpacity>

            {avatarUrl ? (
              <TouchableOpacity style={[styles.actionPill, styles.actionPillDestructive]} onPress={handleRemovePhoto}>
                <Ionicons name="trash-outline" size={14} color="#dc2626" />
                <Text style={[styles.actionPillText, { color: '#dc2626' }]}>Remove</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Basic Information Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Basic Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={18} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your full name"
                placeholderTextColor="#94a3b8"
                autoCapitalize="words"
              />
              {fullName.length > 0 && (
                <TouchableOpacity onPress={() => setFullName('')}>
                  <Ionicons name="close-circle" size={16} color="#cbd5e1" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Account Level</Text>
            <View style={styles.roleCard}>
              <Ionicons
                name={user?.role === 'admin' ? 'shield-checkmark' : 'person-circle'}
                size={20}
                color={user?.role === 'admin' ? '#d97706' : '#2563eb'}
              />
              <Text style={styles.roleText}>
                {user?.role === 'admin' ? 'Administrator Account' : 'Verified Member'}
              </Text>
            </View>
          </View>
        </View>

        {/* Email Address & Verification Section */}
        <View style={styles.sectionCard}>
          <View style={styles.headingRow}>
            <Text style={styles.sectionHeading}>Email Address</Text>
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={13} color="#059669" />
              <Text style={styles.verifiedBadgeText}>Active & Verified</Text>
            </View>
          </View>

          {/* Current Email Display */}
          <View style={styles.currentEmailBox}>
            <View style={styles.emailIconBox}>
              <Ionicons name="mail" size={18} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.currentEmailLabel}>Current Email</Text>
              <Text style={styles.currentEmailValue}>{user?.email}</Text>
            </View>
            {!showEmailChange && (
              <TouchableOpacity
                style={styles.changeEmailBtn}
                onPress={() => {
                  setShowEmailChange(true);
                  setNewEmail('');
                  setVerificationPending(false);
                }}
              >
                <Text style={styles.changeEmailBtnText}>Change</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Expandable Email Change with Verification */}
          {showEmailChange && (
            <View style={styles.emailChangeContainer}>
              <View style={styles.noticeBox}>
                <Ionicons name="information-circle-outline" size={16} color="#2563eb" style={{ marginTop: 1 }} />
                <Text style={styles.noticeText}>
                  To protect your account, your active email will not change until you verify the new address via a 6-digit code.
                </Text>
              </View>

              {!verificationPending ? (
                /* Step 1: Input New Email & Request Code */
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>New Email Address</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="mail-outline" size={18} color="#64748b" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      value={newEmail}
                      onChangeText={setNewEmail}
                      placeholder="e.g. name@example.com"
                      placeholderTextColor="#94a3b8"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>

                  <View style={styles.emailBtnRow}>
                    <TouchableOpacity
                      style={[styles.primaryActionBtn, sendingCode && styles.btnDisabled]}
                      onPress={handleRequestEmailCode}
                      disabled={sendingCode}
                    >
                      {sendingCode ? (
                        <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 6 }} />
                      ) : (
                        <Ionicons name="send-outline" size={15} color="#ffffff" style={{ marginRight: 6 }} />
                      )}
                      <Text style={styles.primaryActionBtnText}>
                        {sendingCode ? 'Sending Code...' : 'Send Verification Code'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={() => {
                        setShowEmailChange(false);
                        setNewEmail('');
                      }}
                    >
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                /* Step 2: Enter 6-Digit Verification Code */
                <View style={styles.verificationBox}>
                  <View style={styles.verifyHeaderRow}>
                    <View style={styles.verifyBadge}>
                      <Ionicons name="key-outline" size={14} color="#059669" />
                      <Text style={styles.verifyBadgeText}>Step 2 of 2</Text>
                    </View>
                    <Text style={styles.codeSentInfo}>
                      Code sent to: <Text style={{ fontWeight: '800', color: '#0f172a' }}>{codeSentTo}</Text>
                    </Text>
                  </View>

                  <Text style={styles.inputLabel}>Enter 6-Digit Code</Text>
                  <TextInput
                    style={styles.otpInput}
                    value={verificationCode}
                    onChangeText={setVerificationCode}
                    placeholder="000000"
                    placeholderTextColor="#cbd5e1"
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                  />

                  <View style={styles.emailBtnRow}>
                    <TouchableOpacity
                      style={[styles.primaryActionBtn, verifyingCode && styles.btnDisabled]}
                      onPress={handleVerifyEmailCode}
                      disabled={verifyingCode}
                    >
                      {verifyingCode ? (
                        <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 6 }} />
                      ) : (
                        <Ionicons name="checkmark-circle-outline" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                      )}
                      <Text style={styles.primaryActionBtnText}>
                        {verifyingCode ? 'Verifying...' : 'Verify & Update Email'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.resendBtn}
                      onPress={handleRequestEmailCode}
                      disabled={sendingCode}
                    >
                      <Text style={styles.resendBtnText}>Resend</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Primary Save Changes Button */}
        <TouchableOpacity
          style={[styles.bigSaveBtn, savingProfile && styles.btnDisabled]}
          onPress={handleSaveProfile}
          disabled={savingProfile}
          activeOpacity={0.85}
        >
          {savingProfile ? (
            <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
          ) : (
            <Ionicons name="save-outline" size={18} color="#ffffff" style={{ marginRight: 8 }} />
          )}
          <Text style={styles.bigSaveBtnText}>
            {savingProfile ? 'Saving Details...' : 'Save Profile Changes'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  navSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  navSaveBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navSaveText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  btnDisabled: {
    opacity: 0.65,
  },
  scrollContent: {
    padding: spacing.md,
  },
  avatarCard: {
    backgroundColor: '#ffffff',
    borderRadius: radius.lg,
    padding: 24,
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarImg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: '#059669',
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#059669',
  },
  avatarInitial: {
    fontSize: 38,
    fontWeight: '900',
    color: '#ffffff',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#059669',
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
  avatarActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  actionPillDestructive: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  actionPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: radius.lg,
    padding: 18,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  verifiedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 12,
    height: 46,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '600',
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  roleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  currentEmailBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    padding: 14,
  },
  emailIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentEmailLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
    textTransform: 'uppercase',
  },
  currentEmailValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 1,
  },
  changeEmailBtn: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  changeEmailBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  emailChangeContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  noticeText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    color: '#1e40af',
    fontWeight: '500',
  },
  emailBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryActionBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cancelBtnText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '700',
  },
  resendBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  resendBtnText: {
    color: '#059669',
    fontSize: 13,
    fontWeight: '800',
  },
  verificationBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    padding: 16,
  },
  verifyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  verifyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  verifyBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  codeSentInfo: {
    fontSize: 11,
    color: '#64748b',
  },
  otpInput: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#059669',
    borderRadius: 12,
    height: 52,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 10,
    textAlign: 'center',
    color: '#0f172a',
    marginBottom: 6,
  },
  bigSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
    marginTop: 6,
  },
  bigSaveBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
});
