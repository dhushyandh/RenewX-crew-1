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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { api } from '@/services/api';
import { useSafeHeaderTop } from '@/lib/useSafeHeaderTop';
import RenewXLogo from '@/components/RenewXLogo';
import AnimatedOrderSuccessTick from '@/components/AnimatedOrderSuccessTick';

const LOGO_IMG = require('@/assets/logo.png');
const HERO_IMG = require('@/assets/onboarding_hero.jpg');
const SPLASH_HERO_TOP = require('../../assets/splash_hero_top.png');

type AuthStep =
  | 'splash'
  | 'email'
  | 'otp'
  | 'password'
  | 'signing_in'
  | 'collect_profile'
  | 'profile_photo'
  | 'account_created';

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

interface AuthScreenProps {
  onForgotPassword?: () => void;
}

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

  // Post-verification account collection states
  const [lockedEmail, setLockedEmail] = useState('');
  const [verifiedSession, setVerifiedSession] = useState<{ token: string; user: any } | null>(null);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [pincode, setPincode] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [profileErrors, setProfileErrors] = useState<{ fullName?: string; phone?: string }>({});

  const emailInputRef = useRef<TextInput | null>(null);
  const passwordInputRef = useRef<TextInput | null>(null);
  const confirmPasswordInputRef = useRef<TextInput | null>(null);
  const otpInputRef = useRef<TextInput | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const passwordsMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  // Scroll to top when step changes (splash -> email -> otp)
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as any });
      try {
        document.body.scrollTop = 0;
        document.documentElement.scrollTop = 0;
        const root = document.getElementById('root');
        if (root) root.scrollTop = 0;
        document.querySelectorAll('[data-focusable="true"], [style*="overflow"], [dir="auto"], div').forEach((el: any) => {
          if (el && typeof el.scrollTop === 'number' && el.scrollTop > 0) {
            el.scrollTop = 0;
          }
        });
      } catch {}
    }
  }, [step]);

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
      await api.auth.sendAuthOtp(cleanEmail, 'sign_up', cleanPass);
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

    try {
      const cleanEmail = email.trim().toLowerCase();
      const res = await api.auth.verifyAuthOtp(cleanEmail, code);

      if (res?.token && res?.user) {
        if (isSignUp) {
          setVerifiedSession({ token: res.token, user: res.user });
          setLockedEmail(res.user.email || cleanEmail);
          setLoading(false);
          setStep('collect_profile');
          toast.success('Email verified successfully! Please enter your details.', 'Verified');
        } else {
          setStep('signing_in');
          toast.success('Logged in successfully!', 'Welcome to RenewX');
          await loginWithToken(res.token, res.user);
        }
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
        isSignUp ? password : undefined
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

  // Step 1: Validate and move to Profile Photo
  const handleProfileDetailsSubmit = () => {
    const cleanName = fullName.trim();
    const cleanPhone = phone.replace(/\D/g, '');
    const errs: { fullName?: string; phone?: string } = {};

    if (!cleanName) {
      errs.fullName = 'Full Name is required';
    }
    if (!cleanPhone || cleanPhone.length < 10) {
      errs.phone = 'Valid 10-digit mobile number is required';
    }

    if (Object.keys(errs).length > 0) {
      setProfileErrors(errs);
      return;
    }

    setProfileErrors({});
    setStep('profile_photo');
  };

  // Step 2: Pick photo from Gallery
  const handlePickFromGallery = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Needed', 'Please allow gallery access to select a profile photo.');
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

      setUploadingPhoto(true);

      if (asset.base64) {
        const mime = asset.mimeType || 'image/jpeg';
        const dataUri = asset.base64.startsWith('data:')
          ? asset.base64
          : `data:${mime};base64,${asset.base64}`;
        try {
          const res = await api.upload.base64(dataUri, 'avatar.jpg');
          if (res?.url) {
            setAvatarUrl(res.url);
            toast.success('Profile photo uploaded!');
            return;
          }
        } catch {
          // fallback to local uri
        }
      }

      if (asset.uri) {
        setAvatarUrl(asset.uri);
        toast.success('Profile photo selected');
      }
    } catch {
      toast.warning('Could not select photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Step 2: Take photo from Camera
  const handlePickFromCamera = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Needed', 'Please allow camera access to take a profile photo.');
          return;
        }
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
        base64: true,
      });

      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];

      setUploadingPhoto(true);

      if (asset.base64) {
        const mime = asset.mimeType || 'image/jpeg';
        const dataUri = asset.base64.startsWith('data:')
          ? asset.base64
          : `data:${mime};base64,${asset.base64}`;
        try {
          const res = await api.upload.base64(dataUri, 'avatar.jpg');
          if (res?.url) {
            setAvatarUrl(res.url);
            toast.success('Profile photo uploaded!');
            return;
          }
        } catch {
          // fallback
        }
      }

      if (asset.uri) {
        setAvatarUrl(asset.uri);
        toast.success('Profile photo captured');
      }
    } catch {
      toast.warning('Could not capture photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Step 2 -> Step 3: Complete Registration & Save Profile
  const handleCompleteRegistration = async () => {
    if (!verifiedSession) return;
    setLoading(true);

    const fullAddressParts = [address.trim(), city.trim(), stateName.trim(), pincode.trim()].filter(Boolean);
    const formattedAddress = fullAddressParts.join(', ');

    const updates: any = {
      full_name: fullName.trim(),
      phone: phone.replace(/\D/g, ''),
      address: formattedAddress || address.trim(),
      city: city.trim(),
      state: stateName.trim(),
      pincode: pincode.trim(),
      avatar_url: avatarUrl.trim() || '',
      profile_completed: true,
    };

    try {
      if (verifiedSession.token) {
        await api.users.updateProfile(updates).catch((err) => {
          console.warn('[AuthScreen] updateProfile non-blocking error:', err);
        });
      }
    } catch (err) {
      console.warn('[AuthScreen] profile sync error:', err);
    } finally {
      setLoading(false);
      setStep('account_created');
    }
  };

  // Step 3: Finish and enter app
  const handleFinishOnboarding = async () => {
    if (!verifiedSession?.token) return;
    const finalUser = {
      ...verifiedSession.user,
      full_name: fullName.trim(),
      phone: phone.replace(/\D/g, ''),
      address: [address.trim(), city.trim(), stateName.trim(), pincode.trim()].filter(Boolean).join(', ') || address.trim(),
      city: city.trim(),
      state: stateName.trim(),
      pincode: pincode.trim(),
      avatar_url: avatarUrl.trim() || '',
      profile_completed: true,
    };
    await loginWithToken(verifiedSession.token, finalUser);
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
      {/* ========================================================================= */}
      {/* 1. PRODUCTION-READY SPLASH / WELCOME SCREEN MATCHING MOCKUP               */}
      {/* ========================================================================= */}
      {step === 'splash' && (
        <View style={styles.splashScreenContainer}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.splashScrollContent,
              { paddingTop: Math.max(safeTop, 8) },
            ]}
          >
            {/* Top Branded Hero Poster: Waves, Logo, Tagline, Devices, and 3 Badges */}
            <View style={styles.splashHeroFrame}>
              <Image
                source={SPLASH_HERO_TOP}
                style={styles.splashHeroImage}
                resizeMode="contain"
              />
            </View>

            {/* Action Buttons Matching Mockup Exactly */}
            <View style={styles.splashActionCol}>
              {/* 1. Yellow Sign In Pill Button */}
              <TouchableOpacity
                style={styles.signInPillBtn}
                onPress={() => {
                  setIsSignUp(false);
                  setSignInWithOtpMode(false);
                  setError(null);
                  setErrorCode(null);
                  setStep('email');
                }}
                activeOpacity={0.88}
                accessibilityRole="button"
                accessibilityLabel="Sign In"
              >
                <View style={styles.btnIconLeftBox}>
                  <Ionicons name="person-outline" size={20} color="#0F172A" />
                </View>
                <Text style={styles.signInPillText}>Sign In</Text>
                <Ionicons name="arrow-forward" size={19} color="#0F172A" />
              </TouchableOpacity>

              {/* 2. White Create Account Pill Button */}
              <TouchableOpacity
                style={styles.createAccountPillBtn}
                onPress={() => {
                  setIsSignUp(true);
                  setSignInWithOtpMode(false);
                  setError(null);
                  setErrorCode(null);
                  setStep('email');
                }}
                activeOpacity={0.88}
                accessibilityRole="button"
                accessibilityLabel="Create Account"
              >
                <View style={styles.btnIconLeftBox}>
                  <Ionicons name="person-add-outline" size={20} color="#0F172A" />
                </View>
                <Text style={styles.createAccountPillText}>Create Account</Text>
                <Ionicons name="arrow-forward" size={19} color="#0F172A" />
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* 3. Continue with Google Pill Button */}
              <TouchableOpacity
                style={styles.googlePillWhiteBtn}
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
                    <View style={styles.googleIconBox}>
                      <Ionicons name="logo-google" size={18} color="#EA4335" />
                    </View>
                    <Text style={styles.googleBtnLabel}>Continue with Google</Text>
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
      {/* 5. POST-VERIFICATION STEP 1: COLLECT PROFILE & OPTIONAL ADDRESS           */}
      {/* ========================================================================= */}
      {step === 'collect_profile' && (
        <ScrollView
          contentContainerStyle={[styles.modalSheetContent, { paddingTop: Math.max(safeTop, 16) }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header Bar */}
          <View style={styles.modalTopBar}>
            <View style={{ width: 38 }} />
            <Text style={styles.modalHostText}>renewx.in</Text>
            <View style={{ width: 38 }} />
          </View>

          {/* Progress / Step Badge */}
          <View style={styles.stepBadgePill}>
            <Text style={styles.stepBadgeText}>STEP 1 OF 2 : PERSONAL DETAILS</Text>
          </View>

          <Text style={styles.sheetTitle}>Complete your profile</Text>
          <Text style={styles.sheetSubtitle}>
            Please provide your name and mobile number to complete your account setup.
          </Text>

          {/* Full Name (Required) */}
          <View style={styles.inputWrapper}>
            <View style={styles.labelRowWithStatus}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <Text style={styles.requiredAsterisk}>*Required</Text>
            </View>
            <View style={[styles.fieldContainer, profileErrors.fullName ? styles.inputRowError : null]}>
              <Ionicons name="person-outline" size={19} color="#64748b" style={styles.fieldIconLeft} />
              <TextInput
                style={styles.fieldInput}
                placeholder="e.g. Alex Johnson"
                placeholderTextColor="#94a3b8"
                value={fullName}
                onChangeText={(v) => {
                  setFullName(v);
                  if (profileErrors.fullName) {
                    setProfileErrors((prev) => ({ ...prev, fullName: undefined }));
                  }
                }}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>
            {profileErrors.fullName && (
              <Text style={styles.fieldErrorText}>{profileErrors.fullName}</Text>
            )}
          </View>

          {/* Mobile Number (Required) */}
          <View style={styles.inputWrapper}>
            <View style={styles.labelRowWithStatus}>
              <Text style={styles.inputLabel}>Mobile Number</Text>
              <Text style={styles.requiredAsterisk}>*Required</Text>
            </View>
            <View style={[styles.fieldContainer, profileErrors.phone ? styles.inputRowError : null]}>
              <View style={styles.phoneCountryBadge}>
                <Text style={styles.phoneCountryText}>🇮🇳 +91</Text>
              </View>
              <TextInput
                style={styles.fieldInput}
                placeholder="10-digit mobile number"
                placeholderTextColor="#94a3b8"
                value={phone}
                onChangeText={(v) => {
                  const cleaned = v.replace(/[^0-9]/g, '').slice(0, 10);
                  setPhone(cleaned);
                  if (profileErrors.phone) {
                    setProfileErrors((prev) => ({ ...prev, phone: undefined }));
                  }
                }}
                keyboardType="phone-pad"
                maxLength={10}
                returnKeyType="next"
              />
            </View>
            {profileErrors.phone && (
              <Text style={styles.fieldErrorText}>{profileErrors.phone}</Text>
            )}
          </View>

          {/* Email Address (LOCKED & VERIFIED) */}
          <View style={styles.inputWrapper}>
            <View style={styles.labelRowWithStatus}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={styles.verifiedGreenBadge}>
                <Ionicons name="shield-checkmark" size={13} color="#16a34a" />
                <Text style={styles.verifiedGreenBadgeText}>Verified via OTP</Text>
              </View>
            </View>
            <View style={[styles.fieldContainer, styles.lockedFieldContainer]}>
              <Ionicons name="lock-closed" size={17} color="#64748b" style={styles.fieldIconLeft} />
              <TextInput
                style={[styles.fieldInput, styles.lockedFieldInput]}
                value={lockedEmail || email}
                editable={false}
              />
              <View style={styles.lockedPillIcon}>
                <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
              </View>
            </View>
            <Text style={styles.fieldHelperText}>
              This email is authenticated and securely locked to your account.
            </Text>
          </View>

          {/* Optional Delivery Address Section */}
          <View style={styles.addressSectionDivider}>
            <View style={styles.dividerLine} />
            <Text style={styles.addressSectionHeading}>DELIVERY ADDRESS (OPTIONAL)</Text>
            <View style={styles.dividerLine} />
          </View>

          <Text style={styles.addressSectionSubtitle}>
            Save your shipping address now for quick one-tap checkout, or skip it for later.
          </Text>

          {/* Street / Flat Address */}
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>House / Flat / Street Address</Text>
            <View style={styles.fieldContainer}>
              <Ionicons name="home-outline" size={18} color="#64748b" style={styles.fieldIconLeft} />
              <TextInput
                style={styles.fieldInput}
                placeholder="e.g. 42 Palm Grove Ave, Apt 3B"
                placeholderTextColor="#94a3b8"
                value={address}
                onChangeText={setAddress}
                autoCapitalize="sentences"
                returnKeyType="next"
              />
            </View>
          </View>

          {/* City & State (Two column row) */}
          <View style={styles.twoColRow}>
            <View style={[styles.inputWrapper, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.inputLabel}>City</Text>
              <View style={styles.fieldContainer}>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="e.g. Chennai"
                  placeholderTextColor="#94a3b8"
                  value={city}
                  onChangeText={setCity}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>
            </View>

            <View style={[styles.inputWrapper, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.inputLabel}>State</Text>
              <View style={styles.fieldContainer}>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="e.g. Tamil Nadu"
                  placeholderTextColor="#94a3b8"
                  value={stateName}
                  onChangeText={setStateName}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>
            </View>
          </View>

          {/* Pincode */}
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Pincode</Text>
            <View style={styles.fieldContainer}>
              <Ionicons name="location-outline" size={18} color="#64748b" style={styles.fieldIconLeft} />
              <TextInput
                style={styles.fieldInput}
                placeholder="6-digit Pincode"
                placeholderTextColor="#94a3b8"
                value={pincode}
                onChangeText={(v) => setPincode(v.replace(/[^0-9]/g, '').slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
                returnKeyType="done"
              />
            </View>
          </View>

          {/* Action Button */}
          <TouchableOpacity
            style={[styles.continueBtn, { marginTop: 20 }]}
            onPress={handleProfileDetailsSubmit}
            activeOpacity={0.88}
          >
            <Text style={styles.continueBtnText}>Next: Profile Photo →</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* 6. POST-VERIFICATION STEP 2: PROFILE PHOTO UPLOAD (OPTIONAL)              */}
      {/* ========================================================================= */}
      {step === 'profile_photo' && (
        <ScrollView
          contentContainerStyle={[styles.modalSheetContent, { paddingTop: Math.max(safeTop, 16) }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header Bar */}
          <View style={styles.modalTopBar}>
            <TouchableOpacity
              style={styles.closeRoundBtn}
              onPress={() => setStep('collect_profile')}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={20} color="#0f172a" />
            </TouchableOpacity>
            <Text style={styles.modalHostText}>renewx.in</Text>
            <View style={{ width: 38 }} />
          </View>

          {/* Progress / Step Badge */}
          <View style={styles.stepBadgePill}>
            <Text style={styles.stepBadgeText}>STEP 2 OF 2 : PROFILE PHOTO</Text>
          </View>

          <Text style={styles.sheetTitle}>Add a profile photo</Text>
          <Text style={styles.sheetSubtitle}>
            Personalize your RenewX account. You can also skip this and add it anytime from your profile.
          </Text>

          {/* 120x120 Circular Avatar Stage */}
          <View style={styles.avatarPickerStage}>
            <View style={styles.avatarOuterRing}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Ionicons name="person" size={54} color="#94a3b8" />
                </View>
              )}

              {uploadingPhoto && (
                <View style={styles.avatarLoadingOverlay}>
                  <ActivityIndicator size="small" color="#0f172a" />
                </View>
              )}

              <TouchableOpacity
                style={styles.avatarCameraBadge}
                onPress={handlePickFromGallery}
                activeOpacity={0.8}
              >
                <Ionicons name="camera" size={16} color="#0f172a" />
              </TouchableOpacity>
            </View>

            {avatarUrl ? (
              <TouchableOpacity
                style={styles.removePhotoBtn}
                onPress={() => setAvatarUrl('')}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={14} color="#ef4444" />
                <Text style={styles.removePhotoText}>Remove photo</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Option Buttons: Gallery & Camera */}
          <View style={styles.photoActionsRow}>
            <TouchableOpacity
              style={styles.photoChoiceBtn}
              onPress={handlePickFromGallery}
              disabled={uploadingPhoto || loading}
              activeOpacity={0.8}
            >
              <Ionicons name="images-outline" size={20} color="#0f172a" />
              <Text style={styles.photoChoiceBtnText}>Choose from Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.photoChoiceBtn}
              onPress={handlePickFromCamera}
              disabled={uploadingPhoto || loading}
              activeOpacity={0.8}
            >
              <Ionicons name="camera-outline" size={20} color="#0f172a" />
              <Text style={styles.photoChoiceBtnText}>Take a Photo</Text>
            </TouchableOpacity>
          </View>

          {/* Primary Action Button */}
          <TouchableOpacity
            style={[styles.continueBtn, { marginTop: 24 }, loading && styles.btnDisabled]}
            onPress={handleCompleteRegistration}
            disabled={loading}
            activeOpacity={0.88}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#0f172a" />
            ) : (
              <Text style={styles.continueBtnText}>Complete Registration →</Text>
            )}
          </TouchableOpacity>

          {/* Skip for now Button */}
          <TouchableOpacity
            style={styles.skipStepBtn}
            onPress={handleCompleteRegistration}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Text style={styles.skipStepBtnText}>Skip for now</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* 7. POST-VERIFICATION STEP 3: ACCOUNT CREATED ANIMATION                    */}
      {/* ========================================================================= */}
      {step === 'account_created' && (
        <ScrollView
          contentContainerStyle={[styles.modalSheetContent, styles.successContentCenter, { paddingTop: Math.max(safeTop, 24) }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Celebratory Tick Animation */}
          <View style={styles.successAnimationWrap}>
            <AnimatedOrderSuccessTick
              size={96}
              showParticles={true}
              autoPlay={true}
            />
          </View>

          <Text style={styles.successHeading}>Account Created Successfully!</Text>
          <Text style={styles.successSubtext}>
            Welcome to <Text style={{ fontWeight: '800', color: '#0F172A' }}>RenewX</Text>, {fullName || 'Valued Member'}!{'\n'}
            Your verified account is ready.
          </Text>

          {/* Account Summary Card */}
          <View style={styles.verifiedSummaryCard}>
            <View style={styles.verifiedCardHeader}>
              <Ionicons name="shield-checkmark" size={18} color="#16a34a" />
              <Text style={styles.verifiedCardHeaderText}>Verified Account Details</Text>
            </View>

            <View style={styles.verifiedDetailRow}>
              <Text style={styles.verifiedDetailLabel}>Full Name</Text>
              <Text style={styles.verifiedDetailValue}>{fullName || 'RenewX User'}</Text>
            </View>

            <View style={styles.verifiedDetailRow}>
              <Text style={styles.verifiedDetailLabel}>Mobile Number</Text>
              <Text style={styles.verifiedDetailValue}>+91 {phone}</Text>
            </View>

            <View style={styles.verifiedDetailRow}>
              <Text style={styles.verifiedDetailLabel}>Email (Verified)</Text>
              <View style={styles.verifiedEmailInline}>
                <Ionicons name="checkmark-circle" size={14} color="#16a34a" style={{ marginRight: 4 }} />
                <Text style={styles.verifiedDetailValue}>{lockedEmail || email}</Text>
              </View>
            </View>

            {address ? (
              <View style={[styles.verifiedDetailRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.verifiedDetailLabel}>Address</Text>
                <Text style={[styles.verifiedDetailValue, { maxWidth: '60%', textAlign: 'right' }]} numberOfLines={2}>
                  {[address, city, stateName, pincode].filter(Boolean).join(', ')}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Get Started Button */}
          <TouchableOpacity
            style={[styles.continueBtn, { width: '100%', maxWidth: 380, marginTop: 24 }]}
            onPress={handleFinishOnboarding}
            activeOpacity={0.88}
          >
            <Text style={styles.continueBtnText}>Explore RenewX →</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* 8. LEGAL POLICY MODAL (TERMS & PRIVACY)                                   */}
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
                    Every device sold through RenewX is verified through our rigorous inspection process. Products are pre-owned and sold strictly as-is. We do not sell refurbished products, and no warranty or return is provided in our service.
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
  splashScreenContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  splashScrollContent: {
    alignItems: 'center',
    paddingBottom: 36,
    width: '100%',
  },
  splashHeroFrame: {
    width: '100%',
    maxWidth: 440,
    aspectRatio: 576 / 690,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashHeroImage: {
    width: '100%',
    height: '100%',
  },
  splashActionCol: {
    width: '100%',
    maxWidth: 380,
    paddingHorizontal: 20,
    marginTop: 8,
  },
  signInPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FACC15',
    borderRadius: 28,
    height: 54,
    paddingHorizontal: 20,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#FACC15',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 4px 14px rgba(250, 204, 21, 0.38)',
      },
    }),
  },
  signInPillText: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
    marginLeft: 14,
    letterSpacing: -0.2,
  },
  createAccountPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 28,
    height: 54,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  createAccountPillText: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
    marginLeft: 14,
    letterSpacing: -0.2,
  },
  btnIconLeftBox: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 11.5,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 1.5,
  },
  googlePillWhiteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 28,
    height: 54,
    paddingHorizontal: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: {
        elevation: 1,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
      },
    }),
  },
  googleIconBox: {
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleBtnLabel: {
    fontSize: 15.5,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.1,
  },
  stepBadgePill: {
    alignSelf: 'center',
    backgroundColor: '#FEF08A',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 9999,
    marginBottom: 10,
  },
  stepBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#854D0E',
    letterSpacing: 0.6,
  },
  requiredAsterisk: {
    fontSize: 11,
    fontWeight: '600',
    color: '#EF4444',
  },
  fieldContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 24,
    height: 52,
    paddingHorizontal: 16,
  },
  fieldIconLeft: {
    marginRight: 10,
  },
  fieldInput: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '500',
    height: '100%',
  },
  fieldErrorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
    marginLeft: 6,
    fontWeight: '600',
  },
  phoneCountryBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 10,
  },
  phoneCountryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  verifiedGreenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
    gap: 4,
  },
  verifiedGreenBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A',
  },
  lockedFieldContainer: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
  },
  lockedFieldInput: {
    color: '#64748B',
    fontWeight: '600',
  },
  lockedPillIcon: {
    marginLeft: 8,
  },
  fieldHelperText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 5,
    marginLeft: 4,
  },
  addressSectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 22,
    marginBottom: 8,
  },
  addressSectionHeading: {
    marginHorizontal: 10,
    fontSize: 11.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  addressSectionSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  twoColRow: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 400,
  },
  avatarPickerStage: {
    alignItems: 'center',
    marginVertical: 20,
  },
  avatarOuterRing: {
    width: 124,
    height: 124,
    borderRadius: 62,
    borderWidth: 3,
    borderColor: '#FACC15',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
      },
    }),
  },
  avatarImg: {
    width: 118,
    height: 118,
    borderRadius: 59,
  },
  avatarFallback: {
    width: 118,
    height: 118,
    borderRadius: 59,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderRadius: 62,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#FACC15',
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  removePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  removePhotoText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
  },
  photoActionsRow: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 400,
    gap: 12,
    marginTop: 6,
  },
  photoChoiceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    height: 48,
    gap: 8,
  },
  photoChoiceBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  skipStepBtn: {
    marginTop: 14,
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipStepBtnText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#64748B',
  },
  successContentCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  successAnimationWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 18,
    height: 130,
  },
  successHeading: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  successSubtext: {
    fontSize: 14.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  verifiedSummaryCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 12,
  },
  verifiedCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 10,
  },
  verifiedCardHeaderText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  verifiedDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  verifiedDetailLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  verifiedDetailValue: {
    fontSize: 13.5,
    color: '#0F172A',
    fontWeight: '700',
  },
  verifiedEmailInline: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
