import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
  SafeAreaView,
  KeyboardAvoidingView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

type SecurityTab = 'email_link' | 'direct_change';

interface SecurityScreenProps {
  onBack?: () => void;
}

export default function SecurityScreen({ onBack }: SecurityScreenProps = {}) {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const toast = useToast();
  const { user, token: authToken, loginWithToken } = useAuth();

  // Route / Query params (e.g. from /security?token=xyz&email=abc)
  const paramToken = route?.params?.token || '';
  const paramEmail = route?.params?.email || '';

  // Extract query params on Web if deep-linked directly via URL
  const initialUrlToken = useMemo(() => {
    if (paramToken) return paramToken;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('token') || '';
    }
    return '';
  }, [paramToken]);

  const initialUrlEmail = useMemo(() => {
    if (paramEmail) return paramEmail;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('email') || '';
    }
    return '';
  }, [paramEmail]);

  const [activeTab, setActiveTab] = useState<SecurityTab>('email_link');

  // Email link request state
  const [requestEmail, setRequestEmail] = useState(user?.email || initialUrlEmail || '');
  const [requestLoading, setRequestLoading] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);

  // Token verification & reset state
  const [resetToken, setResetToken] = useState(initialUrlToken);
  const [validatingToken, setValidatingToken] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [verifiedEmail, setVerifiedEmail] = useState(initialUrlEmail);

  // Password fields for Reset
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // Direct Change state (for signed-in users)
  const [currentPassword, setCurrentPassword] = useState('');
  const [directNewPassword, setDirectNewPassword] = useState('');
  const [directConfirmPassword, setDirectConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showDirectNewPassword, setShowDirectNewPassword] = useState(false);
  const [directChangeLoading, setDirectChangeLoading] = useState(false);

  // If token is present in URL/params, validate it automatically
  useEffect(() => {
    if (resetToken && resetToken.trim()) {
      handleValidateToken(resetToken.trim(), initialUrlEmail);
    }
  }, [resetToken]);

  const handleValidateToken = async (tok: string, mail?: string) => {
    try {
      setValidatingToken(true);
      const res = await api.auth.verifyResetToken(tok, mail || requestEmail || undefined);
      setTokenValid(true);
      if (res?.email) setVerifiedEmail(res.email);
    } catch (err: any) {
      setTokenValid(false);
      toast.error(err?.message || 'Verification link is invalid or expired.');
    } finally {
      setValidatingToken(false);
    }
  };

  const handleSendVerificationLink = async () => {
    const targetEmail = requestEmail.trim();
    if (!targetEmail || !targetEmail.includes('@')) {
      toast.error('Please enter a valid email address.');
      return;
    }

    try {
      setRequestLoading(true);
      setDevResetUrl(null);

      // Determine clean redirect origin
      let redirectUrl: string | undefined;
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        redirectUrl = window.location.origin;
      }

      const res = await api.auth.requestPasswordReset(targetEmail, redirectUrl);

      setLinkSent(true);
      toast.success('Verification link dispatched to your email.');

      if (res?.resetUrl) {
        setDevResetUrl(res.resetUrl);
      }
      if (res?.token) {
        // Offer instant testing mode shortcut
        setResetToken(res.token);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Unable to send verification link.');
    } finally {
      setRequestLoading(false);
    }
  };

  const handleApplyNewPassword = async () => {
    if (!resetToken.trim()) {
      toast.error('Verification token is required.');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New password and confirmation do not match.');
      return;
    }

    try {
      setResetLoading(true);
      const res = await api.auth.resetPassword({
        token: resetToken.trim(),
        newPassword: newPassword.trim(),
        email: verifiedEmail || requestEmail || undefined,
      });

      toast.success('Your password has been changed successfully!');

      if (res?.token && res?.user) {
        await loginWithToken(res.token, res.user);
      }

      // Reset form fields
      setResetToken('');
      setTokenValid(null);
      setNewPassword('');
      setConfirmPassword('');
      setLinkSent(false);

      // Navigate to Account or Home
      setTimeout(() => {
        navigation.navigate('MainTabs', { screen: 'Account' });
      }, 1200);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update password.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleDirectPasswordChange = async () => {
    if (!currentPassword) {
      toast.error('Please enter your current password.');
      return;
    }
    if (directNewPassword.length < 6) {
      toast.error('New password must be at least 6 characters long.');
      return;
    }
    if (directNewPassword !== directConfirmPassword) {
      toast.error('New password and confirmation do not match.');
      return;
    }

    try {
      setDirectChangeLoading(true);
      await api.auth.changePassword({
        currentPassword: currentPassword.trim(),
        newPassword: directNewPassword.trim(),
      });

      toast.success('Password updated successfully!');
      setCurrentPassword('');
      setDirectNewPassword('');
      setDirectConfirmPassword('');
    } catch (err: any) {
      toast.error(err?.message || 'Could not change password.');
    } finally {
      setDirectChangeLoading(false);
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (navigation?.canGoBack && navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.href = '/';
      return;
    }
    navigation.navigate('MainTabs', { screen: 'Account' });
  };

  // Password strength helper
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: '', color: '#94a3b8' };
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 9) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 1) return { score: 25, label: 'Weak', color: '#ef4444' };
    if (score === 2) return { score: 50, label: 'Fair', color: '#f59e0b' };
    if (score === 3) return { score: 75, label: 'Good', color: '#10b981' };
    return { score: 100, label: 'Strong', color: '#059669' };
  };

  const resetStrength = getPasswordStrength(newPassword);
  const directStrength = getPasswordStrength(directNewPassword);

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Navigation Bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={styles.headerTitleRow}>
            <Ionicons name="shield-checkmark" size={18} color="#000000" />
            <Text style={styles.headerTitle}>Account Security</Text>
          </View>
          <Text style={styles.headerSubtitle}>Password & Verification Protection</Text>
        </View>

        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Segmented Tab Selector */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              onPress={() => setActiveTab('email_link')}
              style={[styles.tabButton, activeTab === 'email_link' && styles.tabButtonActive]}
              activeOpacity={0.8}
            >
              <Ionicons
                name="mail-outline"
                size={16}
                color={activeTab === 'email_link' ? '#000000' : '#64748b'}
              />
              <Text style={[styles.tabButtonText, activeTab === 'email_link' && styles.tabButtonTextActive]}>
                Email Verification Link
              </Text>
            </TouchableOpacity>

            {authToken && (
              <TouchableOpacity
                onPress={() => setActiveTab('direct_change')}
                style={[styles.tabButton, activeTab === 'direct_change' && styles.tabButtonActive]}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="key-outline"
                  size={16}
                  color={activeTab === 'direct_change' ? '#000000' : '#64748b'}
                />
                <Text style={[styles.tabButtonText, activeTab === 'direct_change' && styles.tabButtonTextActive]}>
                  Current Password
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* TAB 1: Email Verification Link Flow */}
          {activeTab === 'email_link' && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardIconCircle}>
                  <Ionicons name="mail" size={20} color="#000000" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>Email-Verified Password Reset</Text>
                  <Text style={styles.cardDesc}>
                    Receive a secure, single-use verification link to update your password.
                  </Text>
                </View>
              </View>

              {/* Step A: Request Link */}
              {!resetToken && (
                <View style={styles.formSection}>
                  <Text style={styles.inputLabel}>Account Email Address</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="at-outline" size={16} color="#64748b" style={{ marginRight: 8 }} />
                    <TextInput
                      value={requestEmail}
                      onChangeText={setRequestEmail}
                      placeholder="Enter your registered email"
                      placeholderTextColor="#94a3b8"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      style={styles.textInput}
                    />
                  </View>

                  <TouchableOpacity
                    onPress={handleSendVerificationLink}
                    disabled={requestLoading}
                    style={[styles.primaryBtn, requestLoading && { opacity: 0.7 }]}
                    activeOpacity={0.85}
                  >
                    {requestLoading ? (
                      <ActivityIndicator size="small" color="#000000" />
                    ) : (
                      <>
                        <Ionicons name="paper-plane-outline" size={16} color="#000000" />
                        <Text style={styles.primaryBtnText}>Send Verification Link</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {linkSent && (
                    <View style={styles.successNoticeBox}>
                      <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                      <Text style={styles.successNoticeText}>
                        Verification link dispatched! Please check your inbox (and spam folder). The link is valid for 30 minutes.
                      </Text>
                    </View>
                  )}

                  {/* Development mode direct shortcut */}
                  {devResetUrl && (
                    <View style={styles.devBox}>
                      <Text style={styles.devBoxTitle}>Developer Verification Link</Text>
                      <Text style={styles.devBoxUrl} numberOfLines={2}>
                        {devResetUrl}
                      </Text>
                      <TouchableOpacity
                        onPress={() => {
                          const url = new URL(devResetUrl);
                          const token = url.searchParams.get('token') || '';
                          if (token) setResetToken(token);
                        }}
                        style={styles.devBoxBtn}
                      >
                        <Text style={styles.devBoxBtnText}>Test & Apply Link Now →</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Manual token input toggle */}
                  <View style={{ marginTop: 18, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 14 }}>
                    <Text style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>
                      Already have a verification code or link token?
                    </Text>
                    <View style={styles.inputWrap}>
                      <Ionicons name="keypad-outline" size={16} color="#64748b" style={{ marginRight: 8 }} />
                      <TextInput
                        value={resetToken}
                        onChangeText={setResetToken}
                        placeholder="Paste verification token here"
                        placeholderTextColor="#94a3b8"
                        autoCapitalize="none"
                        style={styles.textInput}
                      />
                    </View>
                  </View>
                </View>
              )}

              {/* Step B: New Password Form (When Token is Present) */}
              {resetToken.length > 0 && (
                <View style={styles.formSection}>
                  <View style={styles.tokenStatusBanner}>
                    {validatingToken ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <ActivityIndicator size="small" color="#ffc400" />
                        <Text style={{ fontSize: 12, color: '#0f172a' }}>Verifying security token...</Text>
                      </View>
                    ) : tokenValid ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="shield-checkmark" size={16} color="#10b981" />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#065f46' }}>
                          Token Verified for {verifiedEmail || 'Account'}
                        </Text>
                      </View>
                    ) : tokenValid === false ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="alert-circle" size={16} color="#ef4444" />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#991b1b' }}>
                          Invalid or Expired Token
                        </Text>
                      </View>
                    ) : null}

                    <TouchableOpacity onPress={() => setResetToken('')} style={{ padding: 4 }}>
                      <Text style={{ fontSize: 11, color: '#64748b', textDecorationLine: 'underline' }}>Change Email</Text>
                    </TouchableOpacity>
                  </View>

                  {/* New Password Field */}
                  <Text style={styles.inputLabel}>New Password</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="lock-closed-outline" size={16} color="#64748b" style={{ marginRight: 8 }} />
                    <TextInput
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholder="Minimum 6 characters"
                      placeholderTextColor="#94a3b8"
                      secureTextEntry={!showNewPassword}
                      autoCapitalize="none"
                      style={styles.textInput}
                    />
                    <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} style={{ padding: 4 }}>
                      <Ionicons name={showNewPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#64748b" />
                    </TouchableOpacity>
                  </View>

                  {/* Strength indicator */}
                  {newPassword.length > 0 && (
                    <View style={styles.strengthWrap}>
                      <View style={styles.strengthBarTrack}>
                        <View style={[styles.strengthBarFill, { width: `${resetStrength.score}%`, backgroundColor: resetStrength.color }]} />
                      </View>
                      <Text style={[styles.strengthLabel, { color: resetStrength.color }]}>{resetStrength.label}</Text>
                    </View>
                  )}

                  {/* Confirm Password Field */}
                  <Text style={[styles.inputLabel, { marginTop: 12 }]}>Confirm New Password</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="checkmark-done-outline" size={16} color="#64748b" style={{ marginRight: 8 }} />
                    <TextInput
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Re-enter your new password"
                      placeholderTextColor="#94a3b8"
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                      style={styles.textInput}
                    />
                    <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={{ padding: 4 }}>
                      <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#64748b" />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    onPress={handleApplyNewPassword}
                    disabled={resetLoading || tokenValid === false}
                    style={[styles.primaryBtn, (resetLoading || tokenValid === false) && { opacity: 0.6 }]}
                    activeOpacity={0.85}
                  >
                    {resetLoading ? (
                      <ActivityIndicator size="small" color="#000000" />
                    ) : (
                      <>
                        <Ionicons name="key" size={16} color="#000000" />
                        <Text style={styles.primaryBtnText}>Set New Password & Sign In</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* TAB 2: Direct Password Change (Signed-in) */}
          {activeTab === 'direct_change' && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardIconCircle}>
                  <Ionicons name="shield" size={20} color="#000000" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>Change Account Password</Text>
                  <Text style={styles.cardDesc}>
                    Update your password by confirming your current active credentials.
                  </Text>
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.inputLabel}>Current Password</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="lock-closed-outline" size={16} color="#64748b" style={{ marginRight: 8 }} />
                  <TextInput
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    placeholder="Enter your current password"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry={!showCurrentPassword}
                    autoCapitalize="none"
                    style={styles.textInput}
                  />
                  <TouchableOpacity onPress={() => setShowCurrentPassword(!showCurrentPassword)} style={{ padding: 4 }}>
                    <Ionicons name={showCurrentPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#64748b" />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.inputLabel, { marginTop: 12 }]}>New Password</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="key-outline" size={16} color="#64748b" style={{ marginRight: 8 }} />
                  <TextInput
                    value={directNewPassword}
                    onChangeText={setDirectNewPassword}
                    placeholder="Minimum 6 characters"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry={!showDirectNewPassword}
                    autoCapitalize="none"
                    style={styles.textInput}
                  />
                  <TouchableOpacity onPress={() => setShowDirectNewPassword(!showDirectNewPassword)} style={{ padding: 4 }}>
                    <Ionicons name={showDirectNewPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#64748b" />
                  </TouchableOpacity>
                </View>

                {directNewPassword.length > 0 && (
                  <View style={styles.strengthWrap}>
                    <View style={styles.strengthBarTrack}>
                      <View style={[styles.strengthBarFill, { width: `${directStrength.score}%`, backgroundColor: directStrength.color }]} />
                    </View>
                    <Text style={[styles.strengthLabel, { color: directStrength.color }]}>{directStrength.label}</Text>
                  </View>
                )}

                <Text style={[styles.inputLabel, { marginTop: 12 }]}>Confirm New Password</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="checkmark-done-outline" size={16} color="#64748b" style={{ marginRight: 8 }} />
                  <TextInput
                    value={directConfirmPassword}
                    onChangeText={setDirectConfirmPassword}
                    placeholder="Re-enter your new password"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry
                    autoCapitalize="none"
                    style={styles.textInput}
                  />
                </View>

                <TouchableOpacity
                  onPress={handleDirectPasswordChange}
                  disabled={directChangeLoading}
                  style={[styles.primaryBtn, directChangeLoading && { opacity: 0.6 }]}
                  activeOpacity={0.85}
                >
                  {directChangeLoading ? (
                    <ActivityIndicator size="small" color="#000000" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={16} color="#000000" />
                      <Text style={styles.primaryBtnText}>Update Password</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Security Standards & Policy Card */}
          <View style={styles.securityChecklistCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Ionicons name="lock-closed" size={18} color="#ffc400" />
              <Text style={styles.checklistHeader}>RenewX Security Standards</Text>
            </View>

            <View style={styles.checkItem}>
              <Ionicons name="checkmark-circle" size={15} color="#10b981" />
              <Text style={styles.checkText}>256-bit AES encryption & bcrypt password hashing</Text>
            </View>
            <View style={styles.checkItem}>
              <Ionicons name="checkmark-circle" size={15} color="#10b981" />
              <Text style={styles.checkText}>Cryptographic single-use email verification tokens (30 min expiry)</Text>
            </View>
            <View style={styles.checkItem}>
              <Ionicons name="checkmark-circle" size={15} color="#10b981" />
              <Text style={styles.checkText}>Automatic session token invalidation upon credential update</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 9,
  },
  tabButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  tabButtonTextActive: {
    color: '#000000',
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  cardIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffc400',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  cardDesc: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 16,
  },
  formSection: {
    marginTop: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ffc400',
    borderRadius: 12,
    height: 46,
    marginTop: 6,
    shadowColor: '#ffc400',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000000',
  },
  successNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
  },
  successNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#166534',
    lineHeight: 17,
  },
  devBox: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
  },
  devBoxTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffc400',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  devBoxUrl: {
    fontSize: 11,
    color: '#cbd5e1',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 4,
  },
  devBoxBtn: {
    marginTop: 8,
    paddingVertical: 5,
  },
  devBoxBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38bdf8',
  },
  tokenStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  strengthWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: -6,
    marginBottom: 10,
  },
  strengthBarTrack: {
    flex: 1,
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  securityChecklistCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  checklistHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  checkText: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
    lineHeight: 16,
  },
});
