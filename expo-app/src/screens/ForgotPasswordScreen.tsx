import React, { useState, useEffect } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/theme';
import { renewxColors, renewxShadows, renewxTextStyle } from '@/design-system';
import { api } from '@/services/api';
import { useToast } from '@/context/ToastContext';
import { useSafeHeaderTop } from '@/lib/useSafeHeaderTop';
import { clientObservability } from '@/services/observability';

interface ForgotPasswordScreenProps {
  onBack?: () => void;
  initialEmail?: string;
}

export default function ForgotPasswordScreen({ onBack, initialEmail = '' }: ForgotPasswordScreenProps = {}) {
  const safeTop = useSafeHeaderTop();
  const navigation = useNavigation<any>();
  const toast = useToast();

  const [email, setEmail] = useState(initialEmail);
  const [submitting, setSubmitting] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

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

  const validateEmail = (val: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  };

  const handleSubmit = async () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      toast.error('Please enter your email address.');
      return;
    }

    if (!validateEmail(cleanEmail)) {
      toast.error('Please enter a valid email address.');
      return;
    }

    try {
      setSubmitting(true);

      // Determine client origin for reset link redirection
      let redirectUrl = 'https://renewx.expo.app';
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
        redirectUrl = window.location.origin;
      }

      await api.auth.requestPasswordReset(cleanEmail, redirectUrl);

      clientObservability.addBreadcrumb({
        category: 'auth',
        message: 'Password reset link requested',
        data: { email: cleanEmail },
      });

      setSubmittedEmail(cleanEmail);
      setIsSuccess(true);
      setResendCooldown(45); // 45-second cooldown before resend
      toast.success('Password reset link sent to your email.');
    } catch (err: any) {
      const msg = err?.message || 'Failed to dispatch reset link. Please try again.';
      toast.error(msg);
      clientObservability.captureException(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || submitting) return;
    await handleSubmit();
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
          {/* Header Navigation Bar */}
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

          {!isSuccess ? (
            /* Form View: Enter Email */
            <View style={styles.innerCard}>
              <View style={styles.iconCircle}>
                <Ionicons name="key-outline" size={32} color={renewxColors.black} />
              </View>

              <Text style={styles.title}>Forgot Password?</Text>
              <Text style={styles.subtitle}>
                No worries! Enter your account email below and we'll send you a secure link to reset your password.
              </Text>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Registered Email Address</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="mail-outline"
                    size={18}
                    color={renewxColors.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="name@example.com"
                    placeholderTextColor="#94A3B8"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    returnKeyType="send"
                    onSubmitEditing={handleSubmit}
                    editable={!submitting}
                  />
                  {email.length > 0 && !submitting && (
                    <TouchableOpacity
                      onPress={() => setEmail('')}
                      style={styles.clearIconBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="close-circle" size={16} color="#94a3b8" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, submitting && styles.disabledButton]}
                onPress={handleSubmit}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <View style={styles.buttonLoadingRow}>
                    <ActivityIndicator size="small" color={renewxColors.black} />
                    <Text style={styles.primaryButtonText}>Sending Reset Link...</Text>
                  </View>
                ) : (
                  <View style={styles.buttonRow}>
                    <Ionicons name="paper-plane-outline" size={18} color={renewxColors.black} />
                    <Text style={styles.primaryButtonText}>Send Reset Link</Text>
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.footerNoteRow}>
                <Ionicons name="shield-checkmark-outline" size={14} color="#64748b" />
                <Text style={styles.footerNoteText}>
                  Protected by RenewX 256-bit secure identity verification
                </Text>
              </View>
            </View>
          ) : (
            /* Success View: Email Sent Confirmation */
            <View style={styles.innerCard}>
              <View style={styles.successIconCircle}>
                <Ionicons name="mail-unread" size={36} color={renewxColors.emerald} />
              </View>

              <Text style={styles.title}>Check Your Email</Text>
              <Text style={styles.subtitle}>
                We have sent a secure password reset link to:
              </Text>

              <View style={styles.emailPill}>
                <Ionicons name="at" size={16} color={renewxColors.black} />
                <Text style={styles.emailPillText}>{submittedEmail}</Text>
              </View>

              <View style={styles.instructionsBox}>
                <View style={styles.instructionItem}>
                  <Ionicons name="checkmark-circle-outline" size={18} color={renewxColors.emerald} />
                  <Text style={styles.instructionText}>
                    Click the link in the email to set a new password.
                  </Text>
                </View>
                <View style={styles.instructionItem}>
                  <Ionicons name="time-outline" size={18} color={renewxColors.warning} />
                  <Text style={styles.instructionText}>
                    The reset link will expire in <Text style={styles.instructionHighlight}>30 minutes</Text>.
                  </Text>
                </View>
                <View style={styles.instructionItem}>
                  <Ionicons name="alert-circle-outline" size={18} color="#64748b" />
                  <Text style={styles.instructionText}>
                    Check your spam or junk folder if you don't see it in your inbox.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleBackToSignIn}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryButtonText}>Return to Sign In</Text>
              </TouchableOpacity>

              <View style={styles.resendSection}>
                <Text style={styles.resendPrompt}>Didn't receive the email?</Text>
                <TouchableOpacity
                  onPress={handleResend}
                  disabled={resendCooldown > 0 || submitting}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.resendLink,
                      (resendCooldown > 0 || submitting) && styles.resendLinkDisabled,
                    ]}
                  >
                    {resendCooldown > 0
                      ? `Resend available in ${resendCooldown}s`
                      : 'Click here to resend'}
                  </Text>
                </TouchableOpacity>
              </View>
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
    backgroundColor: renewxColors.background,
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
    backgroundColor: renewxColors.surface,
    borderWidth: 1,
    borderColor: renewxColors.border,
  },
  backButtonText: {
    fontSize: 13,
    ...renewxTextStyle('semibold'),
    color: renewxColors.black,
    marginLeft: 6,
  },
  brandBadge: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    backgroundColor: renewxColors.black,
  },
  brandBadgeText: {
    fontSize: 14,
    ...renewxTextStyle('extraBold'),
    color: renewxColors.white,
    letterSpacing: -0.4,
  },
  brandAccent: {
    color: renewxColors.yellow,
  },
  innerCard: {
    backgroundColor: renewxColors.surface,
    borderRadius: 24,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: renewxColors.border,
    ...(renewxShadows.elevated as object),
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: renewxColors.yellowSoft,
    borderWidth: 1.5,
    borderColor: renewxColors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  successIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: renewxColors.mint,
    borderWidth: 1.5,
    borderColor: renewxColors.mintBorder,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    ...renewxTextStyle('extraBold'),
    color: renewxColors.black,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    ...renewxTextStyle('regular'),
    color: renewxColors.textSecondary,
    textAlign: 'center',
    marginBottom: 26,
    paddingHorizontal: 8,
  },
  formGroup: {
    marginBottom: 22,
  },
  inputLabel: {
    fontSize: 12,
    ...renewxTextStyle('bold'),
    color: renewxColors.black,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: renewxColors.background,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: renewxColors.border,
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
    color: renewxColors.black,
    ...renewxTextStyle('medium'),
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  clearIconBtn: {
    padding: 4,
  },
  primaryButton: {
    backgroundColor: renewxColors.yellow,
    borderWidth: 1,
    borderColor: renewxColors.yellowDark,
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    ...(renewxShadows.card as object),
  },
  disabledButton: {
    opacity: 0.65,
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
    ...renewxTextStyle('extraBold'),
    color: renewxColors.black,
    letterSpacing: 0.2,
  },
  footerNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 20,
  },
  footerNoteText: {
    fontSize: 11.5,
    ...renewxTextStyle('regular'),
    color: renewxColors.textMuted,
  },
  emailPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: renewxColors.surfaceMuted,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: renewxColors.border,
  },
  emailPillText: {
    fontSize: 14,
    ...renewxTextStyle('bold'),
    color: renewxColors.black,
  },
  instructionsBox: {
    backgroundColor: renewxColors.background,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: renewxColors.border,
    marginBottom: 24,
    gap: 12,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  instructionText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    ...renewxTextStyle('regular'),
    color: renewxColors.textSecondary,
  },
  instructionHighlight: {
    ...renewxTextStyle('bold'),
    color: renewxColors.black,
  },
  resendSection: {
    alignItems: 'center',
    marginTop: 20,
  },
  resendPrompt: {
    fontSize: 13,
    ...renewxTextStyle('regular'),
    color: renewxColors.textMuted,
    marginBottom: 4,
  },
  resendLink: {
    fontSize: 13,
    ...renewxTextStyle('bold'),
    color: renewxColors.emerald,
    textDecorationLine: 'underline',
  },
  resendLinkDisabled: {
    color: '#94A3B8',
    textDecorationLine: 'none',
  },
});
