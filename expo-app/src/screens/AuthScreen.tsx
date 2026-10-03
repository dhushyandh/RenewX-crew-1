import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Animated,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { api } from '@/services/api';
import { useSafeHeaderTop } from '@/lib/useSafeHeaderTop';
import RenewXLogo from '@/components/RenewXLogo';

const LOGO_IMG = require('@/assets/logo.png');
const HERO_IMG = require('@/assets/onboarding_hero.jpg');

type AuthStep = 'splash' | 'email' | 'otp' | 'password' | 'signing_in';

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

interface AuthScreenProps {
  onForgotPassword?: () => void;
}

const GADGET_ACCESSORIES = require('@/assets/categories/accessories.png');
const GADGET_GAMING = require('@/assets/categories/gaming.png');
const GADGET_LAPTOP = require('@/assets/categories/laptop.png');
const GADGET_MAC = require('@/assets/categories/mac.png');
const GADGET_SMARTPHONE = require('@/assets/categories/smartphone.png');
const GADGET_SMARTWATCH = require('@/assets/categories/smartwatch.png');
const GADGET_TABLETS = require('@/assets/categories/tablets.png');

// Symmetrical gadget layout around center branding using authentic RenewX category assets
const CURATED_GADGETS = [
  {
    id: 'phone',
    icon: 'phone-portrait-outline' as const,
    source: GADGET_SMARTPHONE,
    top: '3%',
    left: '8%',
    rotate: '-10deg',
  },
  {
    id: 'laptop',
    icon: 'laptop-outline' as const,
    source: GADGET_LAPTOP,
    top: '0%',
    left: '39%',
    rotate: '4deg',
  },
  {
    id: 'mac',
    icon: 'desktop-outline' as const,
    source: GADGET_MAC,
    top: '3%',
    right: '8%',
    rotate: '10deg',
  },
  {
    id: 'watch',
    icon: 'watch-outline' as const,
    source: GADGET_SMARTWATCH,
    top: '35%',
    left: '3%',
    rotate: '12deg',
  },
  {
    id: 'tablets',
    icon: 'tablet-portrait-outline' as const,
    source: GADGET_TABLETS,
    top: '35%',
    right: '3%',
    rotate: '-12deg',
  },
  {
    id: 'gaming',
    icon: 'game-controller-outline' as const,
    source: GADGET_GAMING,
    bottom: '10%',
    left: '10%',
    rotate: '-8deg',
  },
  {
    id: 'accessories',
    icon: 'headset-outline' as const,
    source: GADGET_ACCESSORIES,
    bottom: '10%',
    right: '10%',
    rotate: '10deg',
  },
];

export default function AuthScreen({ onForgotPassword }: AuthScreenProps = {}) {
  const safeTop = useSafeHeaderTop();
  const navigation = useNavigation<any>();
  const toast = useToast();
  const auth = useAuth() as any;
  const { signIn, signUp, signInWithGoogle, loginWithToken } = auth;

  const handleForgotPassword = () => {
    if (onForgotPassword) {
      onForgotPassword();
      return;
    }
    try {
      navigation.navigate('ForgotPassword');
    } catch (navErr) {
      console.warn('[AuthScreen] Could not navigate to ForgotPassword:', navErr);
    }
  };

  const [step, setStep] = useState<AuthStep>('splash');
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [signInWithOtpMode, setSignInWithOtpMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [legalModal, setLegalModal] = useState<'terms' | 'privacy' | null>(null);

  // 6-digit OTP verification state
  const [otpCode, setOtpCode] = useState('');
  const [isOtpFocused, setIsOtpFocused] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);

  const emailInputRef = useRef<TextInput | null>(null);
  const passwordInputRef = useRef<TextInput | null>(null);
  const confirmPasswordInputRef = useRef<TextInput | null>(null);
  const otpInputRef = useRef<TextInput | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const passwordsMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  // Gentle float animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.025,
          duration: 3200,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 3200,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    ).start();
  }, [pulseAnim]);

  // Resend OTP countdown
  useEffect(() => {
    if (step !== 'otp') return;
    if (resendTimer <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [step, resendTimer]);

  // Focus OTP input when arriving at OTP step
  useEffect(() => {
    if (step === 'otp') {
      const timer = setTimeout(() => {
        otpInputRef.current?.focus();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [step]);

  // 1. Create Account Submit -> Send Verification Code
  const handleSignUpSubmit = async () => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password;
    const cleanConfirm = confirmPassword;
    const cleanName = fullName.trim();

    if (!cleanEmail) {
      setError('Please enter your email address.');
      setErrorCode(null);
      return;
    }
    if (!isValidEmail(cleanEmail)) {
      setError('Please enter a valid email address.');
      setErrorCode(null);
      return;
    }
    if (!cleanPass) {
      setError('Please enter a password.');
      setErrorCode(null);
      return;
    }
    if (cleanPass.length < 6) {
      setError('Password must be at least 6 characters long.');
      setErrorCode(null);
      return;
    }
    if (!cleanConfirm) {
      setError('Please confirm your password.');
      setErrorCode(null);
      return;
    }
    if (cleanPass !== cleanConfirm) {
      setError('Passwords do not match. Please re-enter.');
      setErrorCode(null);
      return;
    }

    setLoading(true);
    setError(null);
    setErrorCode(null);

    try {
      await api.auth.sendAuthOtp(cleanEmail, 'sign_up', cleanPass, cleanName);
      setResendTimer(30);
      setCanResend(false);
      setOtpCode('');
      setStep('otp');
      toast.success(`Verification code sent to ${cleanEmail}`, 'Check Your Email');
    } catch (err: any) {
      const code = err?.code;
      const msg = err?.message || 'Could not send verification code. Please check your email and retry.';
      setErrorCode(code || null);
      setError(msg);

      if (code === 'EMAIL_ALREADY_EXISTS') {
        toast.warning(
          'An account with this email already exists. Please sign in instead.',
          'Account Exists'
        );
      } else {
        toast.error(msg, 'Registration Error');
      }
    } finally {
      setLoading(false);
    }
  };

  // 2. Sign In Submit (Password or OTP)
  const handleSignInSubmit = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please enter your email address.');
      setErrorCode(null);
      return;
    }
    if (!isValidEmail(cleanEmail)) {
      setError('Please enter a valid email address.');
      setErrorCode(null);
      return;
    }

    if (signInWithOtpMode) {
      // OTP sign in flow
      setLoading(true);
      setError(null);
      setErrorCode(null);
      try {
        await api.auth.sendAuthOtp(cleanEmail, 'sign_in');
        setResendTimer(30);
        setCanResend(false);
        setOtpCode('');
        setStep('otp');
        toast.success(`Verification code sent to ${cleanEmail}`, 'Code Sent');
      } catch (err: any) {
        const code = err?.code;
        const msg = err?.message || 'Could not send verification code.';
        setErrorCode(code || null);
        setError(msg);
        toast.error(msg, 'Error');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Password sign in flow
    if (!password) {
      setError('Please enter your password.');
      setErrorCode(null);
      return;
    }

    setLoading(true);
    setError(null);
    setErrorCode(null);

    try {
      const res = await signIn(cleanEmail, password);
      if (res?.error) {
        setError(res.error);
        if (res.error.toLowerCase().includes('not verified') || res.error.toLowerCase().includes('verification')) {
          setErrorCode('EMAIL_NOT_VERIFIED');
        }
        toast.error(res.error, 'Login Failed');
      }
    } catch (err: any) {
      const msg = err?.message || 'Authentication failed.';
      setError(msg);
      toast.error(msg, 'Login Failed');
    } finally {
      setLoading(false);
    }
  };

  // 3. Handle OTP Digit Entry (bulletproof single-input listener)
  const handleOtpChange = (val: string) => {
    setError(null);
    const cleaned = val.replace(/[^0-9]/g, '').slice(0, 6);
    setOtpCode(cleaned);

    if (cleaned.length === 6) {
      handleVerifyCode(cleaned);
    }
  };

  // 4. Verify OTP Code
  const handleVerifyCode = async (codeToVerify?: string) => {
    const code = (codeToVerify ?? otpCode).trim();
    if (code.length < 6) {
      setError('Please enter all 6 digits of the code.');
      return;
    }

    setLoading(true);
    setError(null);
    setStep('signing_in');

    try {
      const cleanEmail = email.trim().toLowerCase();
      const res = await api.auth.verifyAuthOtp(cleanEmail, code);

      if (res?.token && res?.user) {
        toast.success(
          isSignUp ? 'Account created and verified! Welcome to RenewX.' : 'Logged in successfully!',
          'Welcome to RenewX'
        );
        await loginWithToken(res.token, res.user);
      } else {
        throw new Error('Verification succeeded but session token was missing.');
      }
    } catch (err: any) {
      setStep('otp');
      setError(err?.message || 'Invalid or expired verification code. Please check your inbox.');
      toast.error(err?.message || 'Invalid or expired verification code.', 'Verification Failed');
      setTimeout(() => {
        otpInputRef.current?.focus();
      }, 150);
    } finally {
      setLoading(false);
    }
  };

  // 5. Resend OTP
  const handleResendOtp = async () => {
    if (!canResend || loading) return;
    setLoading(true);
    setError(null);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const intent = isSignUp ? 'sign_up' : 'sign_in';
      await api.auth.sendAuthOtp(
        cleanEmail,
        intent,
        isSignUp ? password : undefined,
        isSignUp ? fullName : undefined
      );
      setResendTimer(30);
      setCanResend(false);
      setOtpCode('');
      setTimeout(() => {
        otpInputRef.current?.focus();
      }, 100);
      toast.success('A new 6-digit code has been sent to your email.', 'Code Resent');
    } catch (err: any) {
      setError(err?.message || 'Failed to resend code.');
      toast.error(err?.message || 'Failed to resend code.', 'Error');
    } finally {
      setLoading(false);
    }
  };

  // 6. Trigger verification email when unverified login detected
  const handleSendVerificationForUnverified = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;
    setLoading(true);
    try {
      await api.auth.sendAuthOtp(cleanEmail, 'sign_in');
      setResendTimer(30);
      setCanResend(false);
      setOtpCode('');
      setStep('otp');
      toast.success(`Verification code sent to ${cleanEmail}`, 'Code Sent');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send verification code.', 'Error');
    } finally {
      setLoading(false);
    }
  };

  // 7. Google Sign-In
  const handleGoogleSignIn = async () => {
    if (typeof signInWithGoogle !== 'function') {
      setError('Google sign-in is not available.');
      return;
    }
    setGoogleLoading(true);
    setError(null);

    try {
      const res = await signInWithGoogle();
      if (res?.error) {
        setError(res.error);
      } else {
        toast.success('Signed in with Google successfully!', 'Welcome');
        try {
          navigation.reset({
            index: 0,
            routes: [{ name: 'MainTabs' }],
          });
        } catch {
          // Handled by App.tsx user state listener
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Google sign-in failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.rootContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* ========================================================================= */}
      {/* 1. PRODUCTION-READY SPLASH / WELCOME SCREEN                                 */}
      {/* ========================================================================= */}
      {step === 'splash' && (
        <View style={[styles.splashContainer, { paddingTop: safeTop }]}>
          {/* Top Bar */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 14, width: '100%' }}>
            <RenewXLogo size="md" showTagline={true} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 24, paddingBottom: 32, width: '100%' }}>
            {/* Header Title matching Mockup */}
            <View style={{ alignItems: 'center', marginTop: 10, marginBottom: 12 }}>
              <Text style={{ fontSize: 26, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5 }}>Welcome to</Text>
              <Text style={{ fontSize: 30, fontWeight: '900', color: '#0F172A', letterSpacing: -0.6 }}>RenewX</Text>
              <Text style={{ fontSize: 13.5, color: '#64748B', textAlign: 'center', lineHeight: 20, marginTop: 6, fontWeight: '500' }}>
                Buy certified refurbished devices,{'\n'}sell your old ones, and upgrade{'\n'}to what you love.
              </Text>
            </View>

            {/* Glowing Hero Image matching Mockup */}
            <View style={{ alignItems: 'center', justifyContent: 'center', position: 'relative', width: 280, height: 210, marginVertical: 10 }}>
              <View style={{ position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: '#FEF08A', opacity: 0.55 }} />
              <Image source={HERO_IMG} style={{ width: '100%', height: '100%', borderRadius: 18 }} resizeMode="contain" />
            </View>

            {/* Mandatory Auth Actions: Login, Get started, Continue with Google */}
            <View style={{ width: '100%', maxWidth: 380, marginTop: 12 }}>
              {/* 1. Login */}
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#FACC15',
                  borderRadius: 14,
                  paddingVertical: 15,
                  marginBottom: 12,
                  shadowColor: '#FACC15',
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.28,
                  shadowRadius: 6,
                  elevation: 3,
                }}
                onPress={() => {
                  setIsSignUp(false);
                  setSignInWithOtpMode(false);
                  setError(null);
                  setErrorCode(null);
                  setStep('email');
                }}
                activeOpacity={0.88}
                accessibilityRole="button"
                accessibilityLabel="Login to your account"
              >
                <Ionicons name="log-in-outline" size={20} color="#0F172A" style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A', letterSpacing: -0.2 }}>Login</Text>
              </TouchableOpacity>

              {/* 2. Get started */}
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#0F172A',
                  borderRadius: 14,
                  paddingVertical: 15,
                  marginBottom: 16,
                  shadowColor: '#000000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 5,
                  elevation: 2,
                }}
                onPress={() => {
                  setIsSignUp(true);
                  setSignInWithOtpMode(false);
                  setError(null);
                  setErrorCode(null);
                  setStep('email');
                }}
                activeOpacity={0.88}
                accessibilityRole="button"
                accessibilityLabel="Get started and create account"
              >
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.2 }}>Get started</Text>
                <Ionicons name="arrow-forward" size={18} color="#FACC15" style={{ marginLeft: 8 }} />
              </TouchableOpacity>

              {/* Divider */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: '#E2E8F0' }} />
                <Text style={{ marginHorizontal: 12, fontSize: 12, color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>or</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: '#E2E8F0' }} />
              </View>

              {/* 3. Continue with Google */}
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#FFFFFF',
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: '#E2E8F0',
                  paddingVertical: 14,
                  marginBottom: 10,
                }}
                onPress={handleGoogleSignIn}
                disabled={googleLoading}
                activeOpacity={0.88}
                accessibilityRole="button"
                accessibilityLabel="Continue with Google"
              >
                {googleLoading ? (
                  <ActivityIndicator size="small" color="#0F172A" />
                ) : (
                  <>
                    <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                      <Ionicons name="logo-google" size={17} color="#EA4335" />
                    </View>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#0F172A' }}>Continue with Google</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      )}

      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* 2. AUTH FORM MODAL (CREATE ACCOUNT & SIGN IN)                             */}
      {/* ========================================================================= */}
      {step === 'email' && (
        <ScrollView
          contentContainerStyle={[styles.modalSheetContent, { paddingTop: Math.max(safeTop, 16) }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header Bar */}
          <View style={styles.modalTopBar}>
            <TouchableOpacity
              style={styles.closeRoundBtn}
              onPress={() => {
                setError(null);
                setErrorCode(null);
                setStep('splash');
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color="#0f172a" />
            </TouchableOpacity>
            <Text style={styles.modalHostText}>renewx.in</Text>
            <View style={{ width: 38 }} />
          </View>

          {/* Official Logo Frame */}
          <View style={styles.logoStage}>
            <Image source={LOGO_IMG} style={styles.modalBrandLogo} resizeMode="contain" />
          </View>

          {/* Title & Subtitle */}
          <Text style={styles.sheetTitle}>
            {isSignUp ? 'Create your account' : 'Sign in to RenewX'}
          </Text>
          <TouchableOpacity
            onPress={() => {
              setIsSignUp(!isSignUp);
              setSignInWithOtpMode(false);
              setPassword('');
              setConfirmPassword('');
              setError(null);
              setErrorCode(null);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.sheetSubtitle}>
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
            </Text>
          </TouchableOpacity>

          {/* ================= CREATE ACCOUNT FORM ================= */}
          {isSignUp ? (
            <>
              {/* Full Name Input (Optional) */}
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Full Name (Optional)</Text>
                <TextInput
                  style={styles.pillInput}
                  placeholder="e.g. Alex Johnson"
                  placeholderTextColor="#94a3b8"
                  value={fullName}
                  onChangeText={(v) => {
                    setFullName(v);
                    setError(null);
                  }}
                  autoCapitalize="words"
                  editable={!loading}
                  returnKeyType="next"
                  onSubmitEditing={() => emailInputRef.current?.focus()}
                />
              </View>

              {/* Email Address */}
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <TextInput
                  ref={emailInputRef}
                  style={styles.pillInput}
                  placeholder="name@example.com"
                  placeholderTextColor="#94a3b8"
                  value={email}
                  onChangeText={(v) => {
                    setEmail(v);
                    setError(null);
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!loading}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordInputRef.current?.focus()}
                />
              </View>

              {/* Password */}
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={styles.passwordRow}>
                  <TextInput
                    ref={passwordInputRef}
                    style={[styles.pillInput, { flex: 1, borderWidth: 0, height: '100%' }]}
                    placeholder="At least 6 characters"
                    placeholderTextColor="#94a3b8"
                    value={password}
                    onChangeText={(v) => {
                      setPassword(v);
                      setError(null);
                    }}
                    secureTextEntry={!showPassword}
                    editable={!loading}
                    returnKeyType="next"
                    onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowPassword(!showPassword)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#64748b"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Confirm Password */}
              <View style={styles.inputWrapper}>
                <View style={styles.labelRowWithStatus}>
                  <Text style={styles.inputLabel}>Confirm Password</Text>
                  {confirmPassword.length > 0 && (
                    <Text
                      style={[
                        styles.inlineStatusText,
                        passwordsMatch ? styles.matchText : styles.mismatchText,
                      ]}
                    >
                      {passwordsMatch ? '✓ Passwords match' : '✕ Passwords do not match'}
                    </Text>
                  )}
                </View>
                <View
                  style={[
                    styles.passwordRow,
                    passwordsMismatch && styles.inputRowError,
                  ]}
                >
                  <TextInput
                    ref={confirmPasswordInputRef}
                    style={[styles.pillInput, { flex: 1, borderWidth: 0, height: '100%' }]}
                    placeholder="Re-enter your password"
                    placeholderTextColor="#94a3b8"
                    value={confirmPassword}
                    onChangeText={(v) => {
                      setConfirmPassword(v);
                      setError(null);
                    }}
                    secureTextEntry={!showConfirmPassword}
                    editable={!loading}
                    returnKeyType="done"
                    onSubmitEditing={handleSignUpSubmit}
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#64748b"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </>
          ) : (
            /* ================= SIGN IN FORM ================= */
            <>
              {/* Email Address */}
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <TextInput
                  ref={emailInputRef}
                  style={styles.pillInput}
                  placeholder="name@example.com"
                  placeholderTextColor="#94a3b8"
                  value={email}
                  onChangeText={(v) => {
                    setEmail(v);
                    setError(null);
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!loading}
                  returnKeyType={signInWithOtpMode ? 'done' : 'next'}
                  onSubmitEditing={() => {
                    if (signInWithOtpMode) {
                      handleSignInSubmit();
                    } else {
                      passwordInputRef.current?.focus();
                    }
                  }}
                />
              </View>

              {/* Password (if not OTP sign in) */}
              {!signInWithOtpMode && (
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <View style={styles.passwordRow}>
                    <TextInput
                      ref={passwordInputRef}
                      style={[styles.pillInput, { flex: 1, borderWidth: 0, height: '100%' }]}
                      placeholder="Enter your password"
                      placeholderTextColor="#94a3b8"
                      value={password}
                      onChangeText={(v) => {
                        setPassword(v);
                        setError(null);
                      }}
                      secureTextEntry={!showPassword}
                      editable={!loading}
                      returnKeyType="done"
                      onSubmitEditing={handleSignInSubmit}
                    />
                    <TouchableOpacity
                      style={styles.eyeBtn}
                      onPress={() => setShowPassword(!showPassword)}
                      activeOpacity={0.7}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color="#64748b"
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Forgot password */}
              {!signInWithOtpMode && (
                <TouchableOpacity
                  style={styles.forgotPasswordWrap}
                  onPress={handleForgotPassword}
                  activeOpacity={0.7}
                >
                  <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* Error Banner */}
          {error && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color="#dc2626" />
              <View style={{ flex: 1 }}>
                <Text style={styles.errorBannerText}>{error}</Text>
                {errorCode === 'EMAIL_ALREADY_EXISTS' && (
                  <TouchableOpacity
                    style={styles.switchModeBannerBtn}
                    onPress={() => {
                      setIsSignUp(false);
                      setSignInWithOtpMode(false);
                      setError(null);
                      setErrorCode(null);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.switchModeBannerBtnText}>Switch to Sign In →</Text>
                  </TouchableOpacity>
                )}
                {errorCode === 'EMAIL_NOT_VERIFIED' && (
                  <TouchableOpacity
                    style={styles.switchModeBannerBtn}
                    onPress={handleSendVerificationForUnverified}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.switchModeBannerBtnText}>Send Verification Code Now →</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Primary Action Button */}
          <TouchableOpacity
            style={[styles.continueBtn, loading && styles.btnDisabled]}
            onPress={isSignUp ? handleSignUpSubmit : handleSignInSubmit}
            disabled={loading}
            activeOpacity={0.88}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#0f172a" />
            ) : (
              <Text style={styles.continueBtnText}>
                {isSignUp
                  ? 'Verify Email & Create Account'
                  : signInWithOtpMode
                    ? 'Send Verification Code'
                    : 'Sign In'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Sign In Alternative: Toggle between Password vs OTP */}
          {!isSignUp && (
            <TouchableOpacity
              style={styles.textOptionBtn}
              onPress={() => {
                setSignInWithOtpMode(!signInWithOtpMode);
                setError(null);
                setErrorCode(null);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.textOptionBtnText}>
                {signInWithOtpMode
                  ? 'Sign in with password instead'
                  : 'Sign in with email verification code'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Google Sign In option */}
          <TouchableOpacity
            style={[styles.googlePillBtn, { width: '100%', maxWidth: 400, marginTop: 14 }]}
            onPress={handleGoogleSignIn}
            disabled={googleLoading}
            activeOpacity={0.8}
          >
            <Ionicons name="logo-google" size={16} color="#0f172a" />
            <Text style={styles.googlePillText}>Continue with Google</Text>
          </TouchableOpacity>

          <Text style={styles.sheetTerms}>
            By continuing, you agree to the{' '}
            <Text
              style={styles.sheetTermsLink}
              onPress={() => setLegalModal('terms')}
            >
              terms
            </Text>{' '}
            and acknowledge the{' '}
            <Text
              style={styles.sheetTermsLink}
              onPress={() => setLegalModal('privacy')}
            >
              privacy policy
            </Text>
            .
          </Text>
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* 3. VERIFY EMAIL (OTP - 6 DIGITS SENT TO EMAIL)                            */}
      {/* ========================================================================= */}
      {step === 'otp' && (
        <ScrollView
          contentContainerStyle={[styles.modalSheetContent, { paddingTop: Math.max(safeTop, 16) }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header Bar */}
          <View style={styles.modalTopBar}>
            <TouchableOpacity
              style={styles.closeRoundBtn}
              onPress={() => {
                setError(null);
                setErrorCode(null);
                setStep('email');
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={20} color="#0f172a" />
            </TouchableOpacity>
            <Text style={styles.modalHostText}>renewx.in</Text>
            <View style={{ width: 38 }} />
          </View>

          {/* Official Logo & Envelope Graphic */}
          <View style={styles.otpHeroStage}>
            <View style={styles.otpBadgeCircle}>
              <Image source={LOGO_IMG} style={styles.otpBrandLogo} resizeMode="contain" />
              <View style={styles.otpMailIndicator}>
                <Ionicons name="mail" size={12} color="#ffffff" />
              </View>
            </View>
          </View>

          {/* Heading */}
          <Text style={styles.sheetTitle}>Verify your email</Text>
          <Text style={styles.otpSubtitle}>
            Enter the 6-digit verification code sent to{'\n'}
            <Text style={styles.otpEmailHighlight}>{email}</Text>
          </Text>

          {/* 6 Digits Bulletproof Interactive Input Container */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => otpInputRef.current?.focus()}
            style={styles.otpInputContainer}
          >
            {/* Native Input Covering the whole cell zone */}
            <TextInput
              ref={otpInputRef}
              value={otpCode}
              onChangeText={handleOtpChange}
              keyboardType="number-pad"
              maxLength={6}
              textContentType="none"
              autoComplete="off"
              autoFocus
              onFocus={() => setIsOtpFocused(true)}
              onBlur={() => setIsOtpFocused(false)}
              style={styles.hiddenOtpInput}
              caretHidden
              selectTextOnFocus={false}
            />

            {/* 6 Visual Display Boxes */}
            <View style={styles.otpBoxesRow} pointerEvents="none">
              {[0, 1, 2, 3, 4, 5].map((idx) => {
                const char = otpCode[idx] || '';
                const isCurrent = isOtpFocused && otpCode.length === idx;
                const isFilled = Boolean(char);

                return (
                  <View
                    key={idx}
                    style={[
                      styles.otpBox,
                      isFilled && styles.otpBoxFilled,
                      isCurrent && styles.otpBoxActive,
                      error && styles.otpBoxError,
                    ]}
                  >
                    <Text style={styles.otpBoxChar}>{char}</Text>
                    {isCurrent && !char && <View style={styles.otpCursor} />}
                  </View>
                );
              })}
            </View>
          </TouchableOpacity>

          {error && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color="#ef4444" />
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          )}

          {/* Verify & Continue Button */}
          <TouchableOpacity
            style={[
              styles.continueBtn,
              (otpCode.length < 6 || loading) && styles.btnDisabled,
            ]}
            onPress={() => handleVerifyCode(otpCode)}
            disabled={otpCode.length < 6 || loading}
            activeOpacity={0.88}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#0f172a" />
            ) : (
              <Text style={styles.continueBtnText}>
                {isSignUp ? 'Verify & Create Account' : 'Verify & Continue'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Change email or password */}
          <TouchableOpacity
            style={styles.changeEmailBtn}
            onPress={() => {
              setError(null);
              setErrorCode(null);
              setStep('email');
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.changeEmailBtnText}>Change email or password</Text>
          </TouchableOpacity>

          {/* Resend button */}
          <View style={styles.resendArea}>
            <TouchableOpacity
              onPress={handleResendOtp}
              disabled={!canResend || loading}
              activeOpacity={0.7}
            >
              <Text style={[styles.resendText, canResend && styles.resendTextActive]}>
                {canResend ? 'Resend code' : `Resend code in ${resendTimer}s`}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* 4. SIGNING YOU IN (LOADER)                                                */}
      {/* ========================================================================= */}
      {step === 'signing_in' && (
        <View style={[styles.signingInContainer, { paddingTop: safeTop }]}>
          <View style={styles.signingInLogoStage}>
            <Image source={LOGO_IMG} style={styles.signingInLogo} resizeMode="contain" />
          </View>

          <Text style={styles.signingInTitle}>
            {isSignUp ? 'Creating your account...' : 'Signing you in...'}
          </Text>
          <Text style={styles.signingInEmail}>{email}</Text>

          <View style={styles.signingInLoaderBox}>
            <ActivityIndicator size="large" color="#ffc400" />
          </View>
        </View>
      )}

      {/* ========================================================================= */}
      {/* 5. LEGAL POLICY MODAL (TERMS & PRIVACY)                                   */}
      {/* ========================================================================= */}
      <Modal
        visible={legalModal !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setLegalModal(null)}
      >
        <View style={styles.legalModalBackdrop}>
          <View style={styles.legalModalCard}>
            <View style={styles.legalModalHeader}>
              <View style={styles.legalModalTitleWrap}>
                <Ionicons
                  name={legalModal === 'terms' ? 'document-text-outline' : 'shield-checkmark-outline'}
                  size={20}
                  color="#0f172a"
                />
                <Text style={styles.legalModalTitle}>
                  {legalModal === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setLegalModal(null)}
                style={styles.legalModalCloseBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.legalModalBody} showsVerticalScrollIndicator={false}>
              {legalModal === 'terms' ? (
                <>
                  <Text style={styles.legalSectionTitle}>1. Acceptance of Terms</Text>
                  <Text style={styles.legalParagraph}>
                    By accessing or using the RenewX platform, mobile application, and related services, you agree to be bound by these Terms of Service. If you do not agree, please do not use our services.
                  </Text>
                  <Text style={styles.legalSectionTitle}>2. Pre-Owned Electronics</Text>
                  <Text style={styles.legalParagraph}>
                    Every device sold through RenewX is verified through our rigorous 32-point inspection process. Products are pre-owned and sold as-is without any additional post-purchase warranty unless provided directly by the original manufacturer.
                  </Text>
                  <Text style={styles.legalSectionTitle}>3. Buyback & Trade-In</Text>
                  <Text style={styles.legalParagraph}>
                    Instant price quotes for trade-ins are tentative and contingent upon physical device inspection by our authorized technicians to confirm cosmetic grade and functional state.
                  </Text>
                  <Text style={styles.legalSectionTitle}>4. User Accounts & Security</Text>
                  <Text style={styles.legalParagraph}>
                    You are responsible for safeguarding your login credentials and maintaining accurate account details. Unauthorized activity should be reported to security@renewx.in immediately.
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.legalSectionTitle}>1. Information We Collect</Text>
                  <Text style={styles.legalParagraph}>
                    We collect essential information required to fulfill orders, authenticate identity, verify trade-in devices, and improve platform experience, including name, email address, shipping address, and device diagnostic details.
                  </Text>
                  <Text style={styles.legalSectionTitle}>2. Data Security & Encryption</Text>
                  <Text style={styles.legalParagraph}>
                    All sensitive user data is encrypted in transit using industry-standard TLS 1.3 and at rest with AES-256 encryption. We never store raw payment card data on our servers.
                  </Text>
                  <Text style={styles.legalSectionTitle}>3. Third-Party Disclosures</Text>
                  <Text style={styles.legalParagraph}>
                    We only share necessary customer data with verified logistics partners and payment gateways strictly to fulfill transactions and comply with regulatory requirements. We never sell your personal information.
                  </Text>
                  <Text style={styles.legalSectionTitle}>4. Your Privacy Rights</Text>
                  <Text style={styles.legalParagraph}>
                    You may access, update, or request deletion of your account information at any time from your RenewX Account Settings or by reaching privacy@renewx.in.
                  </Text>
                </>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.legalModalActionBtn}
              onPress={() => setLegalModal(null)}
              activeOpacity={0.88}
            >
              <Text style={styles.legalModalActionBtnText}>I Understand</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  // 1. SPLASH SCREEN
  splashContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'space-between',
  },
  topLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  topBrandLogo: {
    width: 24,
    height: 24,
    borderRadius: 6,
  },
  topBrandName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  topBrandAccent: {
    color: '#ffc400',
  },

  gadgetField: {
    flex: 1,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
  },
  gadgetCard: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    padding: 7,
    boxShadow: '0 10px 28px rgba(15, 23, 42, 0.12)',
    elevation: 8,
    borderWidth: 1.5,
    borderColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gadgetImage: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  gadgetIconBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ffc400',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },

  centerHero: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    zIndex: 10,
  },
  centerLogoFrame: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
    elevation: 6,
    borderWidth: 1.5,
    borderColor: '#f1f5f9',
    marginBottom: 0,
  },
  centerLogoImage: {
    width: 44,
    height: 44,
  },
  heroTextSection: {
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  bottomHeroTitle: {
    fontSize: 23,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
    lineHeight: 29,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  bottomHeroSubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '600',
    maxWidth: 300,
  },

  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: 28,
    gap: 12,
  },
  primaryBigBtn: {
    backgroundColor: '#0f172a',
    height: 54,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 6px 20px rgba(15, 23, 42, 0.2)',
    elevation: 6,
  },
  primaryBigBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  secondaryBigBtn: {
    backgroundColor: '#ffffff',
    height: 54,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  secondaryBigBtnText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  googlePillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 9999,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  googlePillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  termsNotice: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 4,
  },
  termsLink: {
    color: '#64748b',
    textDecorationLine: 'underline',
  },

  // 2. MODAL SHEET
  modalSheetContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: 'center',
    minHeight: '100%',
  },
  modalTopBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  closeRoundBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHostText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },

  logoStage: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 20px rgba(15, 23, 42, 0.08)',
    elevation: 4,
    borderWidth: 1.5,
    borderColor: '#f1f5f9',
    marginBottom: 18,
  },
  modalBrandLogo: {
    width: 38,
    height: 38,
  },

  sheetTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  sheetSubtitle: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 24,
  },

  inputWrapper: {
    width: '100%',
    maxWidth: 400,
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginLeft: 4,
  },
  labelRowWithStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  inlineStatusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  matchText: {
    color: '#16a34a',
  },
  mismatchText: {
    color: '#dc2626',
  },
  inputRowError: {
    borderColor: '#ef4444',
  },
  forgotPasswordWrap: {
    alignSelf: 'flex-end',
    marginTop: -4,
    marginBottom: 12,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  forgotPasswordText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  pillInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    paddingHorizontal: 18,
    height: 56,
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '600',
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    height: 56,
    paddingRight: 14,
  },
  eyeBtn: {
    padding: 6,
  },

  continueBtn: {
    width: '100%',
    maxWidth: 400,
    height: 54,
    borderRadius: 9999,
    backgroundColor: '#ffc400',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 6px 18px rgba(255, 196, 0, 0.45)',
    elevation: 6,
    marginTop: 6,
  },
  continueBtnText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '800',
  },
  btnDisabled: {
    opacity: 0.6,
  },

  textOptionBtn: {
    paddingVertical: 12,
    marginTop: 6,
  },
  textOptionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },

  sheetTerms: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 20,
    maxWidth: 340,
  },
  sheetTermsLink: {
    color: '#64748b',
    textDecorationLine: 'underline',
  },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    marginBottom: 12,
  },
  errorBannerText: {
    color: '#b91c1c',
    fontSize: 13,
    fontWeight: '600',
  },
  switchModeBannerBtn: {
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  switchModeBannerBtnText: {
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: '800',
  },

  // 3. OTP SCREEN
  otpHeroStage: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  otpBadgeCircle: {
    position: 'relative',
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
    elevation: 6,
    borderWidth: 1.5,
    borderColor: '#f1f5f9',
  },
  otpBrandLogo: {
    width: 40,
    height: 40,
  },
  otpMailIndicator: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ffc400',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },

  otpSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  otpEmailHighlight: {
    color: '#0f172a',
    fontWeight: '800',
  },

  otpInputContainer: {
    position: 'relative',
    width: '100%',
    maxWidth: 380,
    marginBottom: 20,
  },
  hiddenOtpInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 0.01,
    zIndex: 10,
    color: 'transparent',
    fontSize: 1,
  },
  otpBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
  },
  otpBox: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxActive: {
    borderColor: '#ffc400',
    backgroundColor: '#ffffff',
    boxShadow: '0 0 0 3px rgba(255, 196, 0, 0.25)',
    elevation: 3,
  },
  otpBoxFilled: {
    borderColor: '#0f172a',
    backgroundColor: '#ffffff',
  },
  otpBoxError: {
    borderColor: '#ef4444',
  },
  otpBoxChar: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
  },
  otpCursor: {
    width: 2,
    height: 24,
    backgroundColor: '#ffc400',
    borderRadius: 1,
  },

  changeEmailBtn: {
    paddingVertical: 10,
  },
  changeEmailBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  resendArea: {
    marginTop: 8,
  },
  resendText: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '600',
  },
  resendTextActive: {
    color: '#f59e0b',
    fontWeight: '800',
  },

  // 4. SIGNING YOU IN
  signingInContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  signingInLogoStage: {
    width: 80,
    height: 80,
    borderRadius: 26,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#f1f5f9',
    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
    elevation: 6,
  },
  signingInLogo: {
    width: 52,
    height: 52,
  },
  signingInTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  signingInEmail: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 24,
  },
  signingInLoaderBox: {
    marginTop: 10,
  },

  // 5. LEGAL MODAL STYLES
  legalModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  legalModalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    boxShadow: '0 -8px 24px rgba(0, 0, 0, 0.15)',
    elevation: 12,
  },
  legalModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  legalModalTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legalModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  legalModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  legalModalBody: {
    paddingVertical: 14,
  },
  legalSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 12,
    marginBottom: 4,
  },
  legalParagraph: {
    fontSize: 13,
    lineHeight: 19,
    color: '#475569',
    marginBottom: 8,
  },
  legalModalActionBtn: {
    backgroundColor: '#0f172a',
    height: 48,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  legalModalActionBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
