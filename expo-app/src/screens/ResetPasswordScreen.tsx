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
  KeyboardAvoidingView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/theme';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useSafeHeaderTop } from '@/lib/useSafeHeaderTop';
import { clientObservability } from '@/services/observability';

interface ResetPasswordScreenProps {
  onBack?: () => void;
}

export default function ResetPasswordScreen({ onBack }: ResetPasswordScreenProps = {}) {
  const safeTop = useSafeHeaderTop();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const toast = useToast();
  const { loginWithToken } = useAuth();

  // Extract token and email from route params or Web URL query string
  const paramToken = route?.params?.token || '';
  const paramEmail = route?.params?.email || '';

  const initialToken = useMemo(() => {
    if (paramToken) return String(paramToken).trim();
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      return (searchParams.get('token') || '').trim();
    }
    return '';
  }, [paramToken]);

  const initialEmail = useMemo(() => {
    if (paramEmail) return String(paramEmail).trim();
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      return (searchParams.get('email') || '').trim();
    }
    return '';
  }, [paramEmail]);

  const [token, setToken] = useState(initialToken);
  const [targetEmail, setTargetEmail] = useState(initialEmail);
  const [userName, setUserName] = useState('');

  // Token validation state
  const [isValidatingToken, setIsValidatingToken] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState<boolean | null>(null);
  const [tokenErrorMessage, setTokenErrorMessage] = useState('');

  // Password inputs
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setIsValidatingToken(false);
      setIsTokenValid(false);
      setTokenErrorMessage('No verification token provided in reset link.');
      return;
    }

    let isMounted = true;

    async function validateToken() {
      try {
        setIsValidatingToken(true);
        const res = await api.auth.verifyResetToken(token, targetEmail || undefined);
        if (isMounted) {
          setIsTokenValid(true);
          if (res?.email) setTargetEmail(res.email);
          if (res?.name) setUserName(res.name);
        }
      } catch (err: any) {
        if (isMounted) {
          setIsTokenValid(false);
          const errorMsg =
            err?.message ||
            'This password reset link is invalid or has expired. Please request a new one.';
          setTokenErrorMessage(errorMsg);
        }
      } finally {
        if (isMounted) {
          setIsValidatingToken(false);
        }
      }
    }

    validateToken();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleBackToSignIn = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Auth' as any);
    }
  };

  const handleGoToForgotPassword = () => {
    navigation.navigate('ForgotPassword' as any);
  };

  const handleSubmitNewPassword = async () => {
    if (!token) {
      toast.error('Missing verification token.');
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
      setIsSubmitting(true);

      const res = await api.auth.resetPassword({
        token,
        newPassword: newPassword.trim(),
        email: targetEmail || undefined,
      });

      clientObservability.addBreadcrumb({
        category: 'auth',
        message: 'Password reset successfully executed',
        data: { email: targetEmail },
      });

      setIsSuccess(true);
      toast.success('Your password has been changed successfully!');

      // If server returned auth session token and user profile, automatically log in
      if (res?.token && res?.user) {
        try {
          await loginWithToken(res.token, res.user);
        } catch {
          // If auto login fails, user can proceed to manual sign in
        }
      }
    } catch (err: any) {
      const msg = err?.message || 'Failed to update password. Please try again.';
      toast.error(msg);
      clientObservability.captureException(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(safeTop, 24), paddingBottom: 40 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.cardWrapper}>
          {/* Top Brand Bar */}
          <View style={styles.navRow}>
            <TouchableOpacity
              onPress={handleBackToSignIn}
              style={styles.backButton}
              activeOpacity={0.7}
              accessibilityLabel="Back to sign in"
            >
              <Ionicons name="arrow-back" size={20} color="#0f172a" />
              <Text style={styles.backButtonText}>Back to Sign In</Text>
            </TouchableOpacity>

            <View style={styles.brandBadge}>
              <Text style={styles.brandBadgeText}>
                Renew<Text style={styles.brandAccent}>X</Text>
              </Text>
            </View>
          </View>

          {/* State 1: Verifying Token */}
          {isValidatingToken && (
            <View style={styles.innerCard}>
              <View style={styles.iconCircle}>
                <ActivityIndicator size="large" color="#ffc400" />
              </View>
              <Text style={styles.title}>Verifying Reset Link</Text>
              <Text style={styles.subtitle}>
                Confirming the security token from your email...
              </Text>
            </View>
          )}

          {/* State 2: Invalid or Expired Token */}
          {!isValidatingToken && isTokenValid === false && (
            <View style={styles.innerCard}>
              <View style={styles.errorIconCircle}>
                <Ionicons name="alert-circle" size={38} color="#ef4444" />
              </View>

              <Text style={styles.title}>Link Expired or Invalid</Text>
              <Text style={styles.subtitle}>
                {tokenErrorMessage ||
                  'This password reset link is invalid or has expired. For your security, reset links are single-use and expire after 30 minutes.'}
              </Text>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleGoToForgotPassword}
                activeOpacity={0.85}
              >
                <View style={styles.buttonRow}>
                  <Ionicons name="refresh" size={18} color="#0a0a0a" />
                  <Text style={styles.primaryButtonText}>Request New Reset Link</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleBackToSignIn}
                activeOpacity={0.7}
              >
                <Text style={styles.secondaryButtonText}>Return to Sign In</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* State 3: Token Valid -> Set New Password Form */}
          {!isValidatingToken && isTokenValid === true && !isSuccess && (
            <View style={styles.innerCard}>
              <View style={styles.iconCircle}>
                <Ionicons name="lock-closed" size={32} color="#0f172a" />
              </View>

              <Text style={styles.title}>Create New Password</Text>
              <Text style={styles.subtitle}>
                {userName ? `Hi ${userName}, please ` : 'Please '}enter a new secure password for your RenewX account.
              </Text>

              {targetEmail ? (
                <View style={styles.emailPill}>
                  <Ionicons name="person-circle-outline" size={16} color="#0f172a" />
                  <Text style={styles.emailPillText}>{targetEmail}</Text>
                </View>
              ) : null}

              {/* New Password Input */}
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>New Password</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={18}
                    color="#64748b"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Minimum 6 characters"
                    placeholderTextColor="#94a3b8"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showNewPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isSubmitting}
                  />
                  <TouchableOpacity
                    onPress={() => setShowNewPassword((prev) => !prev)}
                    style={styles.clearIconBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#64748b"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Confirm Password Input */}
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Confirm New Password</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="shield-outline"
                    size={18}
                    color="#64748b"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Re-enter new password"
                    placeholderTextColor="#94a3b8"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isSubmitting}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword((prev) => !prev)}
                    style={styles.clearIconBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#64748b"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Password Match / Length Checklist */}
              <View style={styles.checklistWrap}>
                <View style={styles.checkItem}>
                  <Ionicons
                    name={
                      newPassword.length >= 6
                        ? 'checkmark-circle'
                        : 'ellipse-outline'
                    }
                    size={16}
                    color={newPassword.length >= 6 ? '#10b981' : '#94a3b8'}
                  />
                  <Text
                    style={[
                      styles.checkText,
                      newPassword.length >= 6 && styles.checkTextActive,
                    ]}
                  >
                    At least 6 characters
                  </Text>
                </View>

                <View style={styles.checkItem}>
                  <Ionicons
                    name={
                      confirmPassword.length > 0 &&
                      newPassword === confirmPassword
                        ? 'checkmark-circle'
                        : 'ellipse-outline'
                    }
                    size={16}
                    color={
                      confirmPassword.length > 0 &&
                      newPassword === confirmPassword
                        ? '#10b981'
                        : '#94a3b8'
                    }
                  />
                  <Text
                    style={[
                      styles.checkText,
                      confirmPassword.length > 0 &&
                        newPassword === confirmPassword &&
                        styles.checkTextActive,
                    ]}
                  >
                    Passwords match
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  (isSubmitting ||
                    newPassword.length < 6 ||
                    newPassword !== confirmPassword) &&
                    styles.disabledButton,
                ]}
                onPress={handleSubmitNewPassword}
                disabled={
                  isSubmitting ||
                  newPassword.length < 6 ||
                  newPassword !== confirmPassword
                }
                activeOpacity={0.85}
              >
                {isSubmitting ? (
                  <View style={styles.buttonLoadingRow}>
                    <ActivityIndicator size="small" color="#0a0a0a" />
                    <Text style={styles.primaryButtonText}>Updating Password...</Text>
                  </View>
                ) : (
                  <View style={styles.buttonRow}>
                    <Ionicons name="checkmark-done" size={18} color="#0a0a0a" />
                    <Text style={styles.primaryButtonText}>Save New Password</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* State 4: Password Changed Successfully */}
          {!isValidatingToken && isSuccess && (
            <View style={styles.innerCard}>
              <View style={styles.successIconCircle}>
                <Ionicons name="checkmark-circle" size={42} color="#10b981" />
              </View>

              <Text style={styles.title}>Password Updated!</Text>
              <Text style={styles.subtitle}>
                Your RenewX account password has been updated securely. You can now use your new password to sign in across all devices.
              </Text>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleBackToSignIn}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryButtonText}>Sign In Now</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: '#f8f7f2',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  cardWrapper: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    marginLeft: 6,
    fontFamily: Platform.select({ web: 'Outfit, sans-serif' }),
  },
  brandBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.full,
    backgroundColor: '#0f172a',
  },
  brandBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  brandAccent: {
    color: '#ffc400',
  },
  innerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: '#e6e2d8',
    ...Platform.select({
      web: {
        boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.06), 0 4px 6px -2px rgba(0, 0, 0, 0.03)',
      } as any,
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 14,
        elevation: 4,
      },
    }),
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff8d8',
    borderWidth: 1.5,
    borderColor: '#ffc400',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  successIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#ecfdf5',
    borderWidth: 1.5,
    borderColor: '#a7f3d0',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  errorIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#fef2f2',
    borderWidth: 1.5,
    borderColor: '#fca5a5',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.4,
    fontFamily: Platform.select({ web: 'Outfit, sans-serif' }),
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 22,
    paddingHorizontal: 8,
  },
  emailPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f1f5f9',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignSelf: 'center',
  },
  emailPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  formGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: '#0f172a',
    fontFamily: Platform.select({ web: 'Outfit, sans-serif' }),
  },
  clearIconBtn: {
    padding: 4,
  },
  checklistWrap: {
    marginBottom: 22,
    gap: 8,
    paddingHorizontal: 4,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkText: {
    fontSize: 12,
    color: '#64748b',
  },
  checkTextActive: {
    color: '#065f46',
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#ffc400',
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(255, 196, 0, 0.35)',
      } as any,
      default: {
        shadowColor: '#ffc400',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 3,
      },
    }),
  },
  secondaryButton: {
    marginTop: 12,
    borderRadius: 14,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0a0a0a',
    letterSpacing: 0.2,
    fontFamily: Platform.select({ web: 'Outfit, sans-serif' }),
  },
});
