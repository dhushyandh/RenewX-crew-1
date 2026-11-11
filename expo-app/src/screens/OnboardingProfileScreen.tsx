import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  Image,
  KeyboardAvoidingView,
  Modal,
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
import { useNavigation, useRoute } from '@react-navigation/native';

import { useAuth, type AppUser } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { api } from '@/services/api';
import { useSafeHeaderTop } from '@/lib/useSafeHeaderTop';
import { renewxColors, renewxShadows, renewxTextStyle } from '@/design-system';
import RenewXLogo from '@/components/RenewXLogo';
import AnimatedOrderSuccessTick from '@/components/AnimatedOrderSuccessTick';

const HERO_IMG = require('@/assets/onboarding_hero.jpg');
const { width: SCREEN_WIDTH } = Dimensions.get('window');

export type OnboardingStage =
  | 'splash'
  | 'welcome'
  | 'email_entry'
  | 'email_otp'
  | 'account'
  | 'photo'
  | 'review'
  | 'success';

function isValidEmail(val: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
}

export default function OnboardingProfileScreen() {
  const safeTop = useSafeHeaderTop();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user, completeProfileSetup, signInWithGoogle, signIn, loginWithToken } = useAuth();
  const toast = useToast();

  // Initial stage determination
  const initialStage: OnboardingStage =
    route.params?.initialStage || (user && user.email ? 'account' : 'splash');

  const [stage, setStage] = useState<OnboardingStage>(initialStage);

  // Email Sign-Up & OTP Verification States
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isOtpFocused, setIsOtpFocused] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Locked verified email for Step 1
  const [lockedEmail, setLockedEmail] = useState<string>(
    user?.email || route.params?.email || ''
  );

  // Form Fields (Step 1: Create your account)
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');

  // Photo (Step 2: Add a profile picture)
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Validation / Loading
  const [formErrors, setFormErrors] = useState<{ fullName?: string; phone?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick Login Modal (for "Already have an account? Login" on Screen 2)
  const [loginModalVisible, setLoginModalVisible] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Refs
  const otpInputRef = useRef<TextInput>(null);

  // Screen 1: Splash progress animation
  const splashProgress = useRef(new Animated.Value(0)).current;
  const splashProgressWidth = splashProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  // Stage transition animation
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Screen 6: Checkmark bouncy pop animation
  const checkScale = useRef(new Animated.Value(0)).current;
  const confettiOpacity = useRef(new Animated.Value(0)).current;

  // Handle stage transition with smooth animation
  const transitionTo = useCallback(
    (nextStage: OnboardingStage, direction: 'forward' | 'backward' = 'forward') => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 130,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: direction === 'forward' ? -10 : 10,
          duration: 130,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setStage(nextStage);
        slideAnim.setValue(direction === 'forward' ? 10 : -10);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 200,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 200,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start();
      });
    },
    [fadeAnim, slideAnim]
  );

  // Screen 1: Splash screen auto-advance
  useEffect(() => {
    if (stage === 'splash') {
      Animated.timing(splashProgress, {
        toValue: 1,
        duration: 1800,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished) {
          transitionTo('welcome', 'forward');
        }
      });
    }
  }, [stage, splashProgress, transitionTo]);

  // Resend OTP Countdown
  useEffect(() => {
    if (stage !== 'email_otp') return;
    if (resendTimer <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [stage, resendTimer]);

  // Auto focus OTP input
  useEffect(() => {
    if (stage === 'email_otp') {
      const t = setTimeout(() => {
        otpInputRef.current?.focus();
      }, 200);
      return () => clearTimeout(t);
    }
  }, [stage]);

  // Screen 6: Trigger celebration checkmark animation
  useEffect(() => {
    if (stage === 'success') {
      checkScale.setValue(0);
      confettiOpacity.setValue(0);
      Animated.sequence([
        Animated.spring(checkScale, {
          toValue: 1,
          friction: 4.5,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(confettiOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [stage, checkScale, confettiOpacity]);

  // 1. Submit Email & Password to Send Verification Code
  const handleSendVerificationCode = async () => {
    const cleanEmail = signupEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setAuthError('Please enter your email address');
      return;
    }
    if (!isValidEmail(cleanEmail)) {
      setAuthError('Please enter a valid email address');
      return;
    }
    if (!signupPassword || signupPassword.length < 6) {
      setAuthError('Password must be at least 6 characters long');
      return;
    }

    setAuthLoading(true);
    setAuthError(null);

    try {
      await api.auth.sendAuthOtp(cleanEmail, 'sign_up', signupPassword);
      setResendTimer(30);
      setCanResend(false);
      setOtpCode('');
      toast.success(`Verification code sent to ${cleanEmail}`, 'Check Your Email');
      transitionTo('email_otp', 'forward');
    } catch (err: any) {
      const msg = err?.message || 'Could not send verification code. Please try again.';
      setAuthError(msg);
      toast.error(msg, 'Error');
    } finally {
      setAuthLoading(false);
    }
  };

  // 2. Verify 6-digit OTP Code
  const handleVerifyOtp = async (codeToVerify?: string) => {
    const code = (codeToVerify || otpCode).trim();
    if (code.length !== 6) {
      setAuthError('Please enter the 6-digit verification code');
      return;
    }

    const cleanEmail = signupEmail.trim().toLowerCase();
    setAuthLoading(true);
    setAuthError(null);

    try {
      const res = await api.auth.verifyAuthOtp(cleanEmail, code);
      if (res?.token && res?.user) {
        // Authenticate the user session
        await loginWithToken(res.token, res.user);
        // Lock the verified email
        setLockedEmail(res.user.email || cleanEmail);
        toast.success('Email verified successfully! Complete your profile.', 'Verified');
        // Now advance to Step 1: Create your account
        transitionTo('account', 'forward');
      } else {
        throw new Error('Verification succeeded but session token was missing.');
      }
    } catch (err: any) {
      const msg = err?.message || 'Invalid or expired verification code. Please check your inbox.';
      setAuthError(msg);
      toast.error(msg, 'Verification Failed');
    } finally {
      setAuthLoading(false);
    }
  };

  // 3. Resend Verification Code
  const handleResendOtp = async () => {
    if (!canResend || authLoading) return;
    const cleanEmail = signupEmail.trim().toLowerCase();
    setAuthLoading(true);
    setAuthError(null);

    try {
      await api.auth.sendAuthOtp(cleanEmail, 'sign_up', signupPassword);
      setResendTimer(30);
      setCanResend(false);
      setOtpCode('');
      toast.success(`New verification code sent to ${cleanEmail}`, 'Code Resent');
    } catch (err: any) {
      setAuthError(err?.message || 'Failed to resend code');
    } finally {
      setAuthLoading(false);
    }
  };

  // Step 1 Validation
  const validateStep1 = (): boolean => {
    const errs: { fullName?: string; phone?: string } = {};
    if (!fullName.trim()) {
      errs.fullName = 'Full Name is required';
    }
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      errs.phone = 'Valid 10-digit mobile number required';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Image Picker (Screen 4 / Step 2)
  const handleChoosePhoto = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Needed', 'Please allow gallery access to set your profile picture.');
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
            toast.success('Profile picture updated!');
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

  // Create Account Submit (Screen 5 / Step 3 -> Screen 6 / Step 4)
  const handleCreateAccount = async () => {
    setIsSubmitting(true);
    const updates: Partial<AppUser> = {
      full_name: fullName.trim(),
      phone: phone.replace(/\D/g, ''),
      address: address.trim() || '',
      avatar_url: avatarUrl.trim() || '',
      profile_completed: true,
    };

    try {
      // Sync with backend API if user is authenticated
      if (user) {
        await api.users.updateProfile(updates).catch(() => {});
      }
      await completeProfileSetup(updates);
      transitionTo('success', 'forward');
    } catch {
      await completeProfileSetup(updates);
      transitionTo('success', 'forward');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Skip entire onboarding to Home
  const handleSkipToHome = () => {
    if (navigation.canGoBack()) {
      navigation.navigate('MainTabs', { screen: 'Home' });
    } else {
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
    }
  };

  // Handle Google Sign-in on Welcome screen
  const handleGoogleAuth = async () => {
    try {
      if (typeof signInWithGoogle === 'function') {
        const res = await signInWithGoogle();
        if (res?.error) {
          toast.error(res.error);
        } else {
          if (user?.email) setLockedEmail(user.email);
          transitionTo('account', 'forward');
        }
      } else {
        toast.info('Google sign-in active. Enter account details.');
        transitionTo('account', 'forward');
      }
    } catch {
      transitionTo('account', 'forward');
    }
  };

  // Handle Login Modal Submit
  const handleLoginSubmit = async () => {
    if (!loginEmail.trim() || !loginPassword) {
      toast.warning('Please enter both email and password');
      return;
    }
    setLoginLoading(true);
    try {
      const res = await signIn(loginEmail.trim().toLowerCase(), loginPassword);
      if (res?.error) throw new Error(res.error);
      setLoginModalVisible(false);
      handleSkipToHome();
    } catch (err: any) {
      toast.error(err?.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoginLoading(false);
    }
  };

  // Back button handler
  const handleBack = () => {
    if (stage === 'email_entry') {
      transitionTo('welcome', 'backward');
    } else if (stage === 'email_otp') {
      transitionTo('email_entry', 'backward');
    } else if (stage === 'account') {
      transitionTo('welcome', 'backward');
    } else if (stage === 'photo') {
      transitionTo('account', 'backward');
    } else if (stage === 'review') {
      transitionTo('photo', 'backward');
    } else if (stage === 'welcome') {
      transitionTo('splash', 'backward');
    }
  };

  // Render Step Progress Indicator Bar (4 dashes)
  const renderStepIndicator = (activeStep: number) => {
    return (
      <View style={styles.stepIndicatorRow}>
        {[1, 2, 3, 4].map((stepNum) => {
          const isActive = stepNum <= activeStep;
          return (
            <View
              key={stepNum}
              style={[
                styles.stepDash,
                isActive ? styles.stepDashActive : styles.stepDashInactive,
              ]}
            />
          );
        })}
      </View>
    );
  };

  // Render Universal Top Bar for Steps
  const renderStepTopBar = (activeStep: number) => {
    return (
      <View style={styles.stepTopBar}>
        <View style={styles.stepTopBarHeaderRow}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </TouchableOpacity>

          <RenewXLogo size="md" alignCenter />

          <View style={styles.backBtnPlaceholder} />
        </View>

        {renderStepIndicator(activeStep)}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { paddingTop: safeTop }]}
    >
      <Animated.View
        style={[
          styles.animatedContent,
          {
            opacity: fadeAnim,
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        {/* ========================================================================= */}
        {/* SCREEN 1: SPLASH / LOADING SCREEN                                         */}
        {/* ========================================================================= */}
        {stage === 'splash' && (
          <TouchableOpacity
            style={styles.splashScreen}
            activeOpacity={1}
            onPress={() => transitionTo('welcome', 'forward')}
          >
            <View style={styles.splashLogoWrap}>
              <RenewXLogo size="lg" alignCenter />
            </View>

            <View style={styles.heroGraphicWrap}>
              <View style={styles.heroGraphicGlowAura} />
              <Image source={HERO_IMG} style={styles.heroImage} resizeMode="contain" />
            </View>

            <View style={styles.splashFooter}>
              <View style={styles.progressBarTrack}>
                <Animated.View style={[styles.progressBarFill, { width: splashProgressWidth }]} />
              </View>
              <Text style={styles.splashSubtitle}>Loading your better tomorrow...</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 2: WELCOME TO RENEWX (AUTH CHOICES)                                 */}
        {/* ========================================================================= */}
        {stage === 'welcome' && (
          <View style={styles.welcomeScreen}>
            <View style={styles.welcomeBrandHeader}>
              <RenewXLogo size="md" showTagline={true} />
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.welcomeScrollContent}
            >
              <View style={styles.welcomeTrustPill}>
                <Ionicons name="shield-checkmark" size={13} color={renewxColors.emerald} />
                <Text style={styles.welcomeTrustPillText}>24-Point Certified Devices</Text>
              </View>

              <View style={styles.welcomeTitleBlock}>
                <Text style={styles.welcomeTitleLine1}>Welcome to</Text>
                <Text style={styles.welcomeTitleLine2}>
                  Renew<Text style={{ color: renewxColors.gold }}>X</Text>
                </Text>
                <Text style={styles.welcomeSubtitle}>
                  Buy certified pre-owned devices, sell your old tech, and upgrade to what you love.
                </Text>
              </View>

              <View style={styles.welcomeHeroWrap}>
                <View style={styles.welcomeHeroGlow} />
                <Image source={HERO_IMG} style={styles.welcomeHeroImage} resizeMode="contain" />
              </View>

              <View style={styles.welcomeActionsWrap}>
                {/* 1. Primary Action: Get Started */}
                <TouchableOpacity
                  style={styles.welcomePrimaryCta}
                  onPress={() => {
                    setAuthError(null);
                    transitionTo('email_entry', 'forward');
                  }}
                  activeOpacity={0.88}
                  accessibilityRole="button"
                  accessibilityLabel="Get started and create account"
                >
                  <Text style={styles.welcomePrimaryCtaText}>Get Started</Text>
                  <Ionicons name="arrow-forward" size={18} color={renewxColors.black} style={{ marginLeft: 8 }} />
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>OR</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* 2. Secondary Action: Continue with Google */}
                <TouchableOpacity
                  style={styles.welcomeGoogleBtn}
                  onPress={handleGoogleAuth}
                  activeOpacity={0.88}
                  accessibilityRole="button"
                  accessibilityLabel="Continue with Google"
                >
                  <View style={styles.socialIconWrap}>
                    <Ionicons name="logo-google" size={17} color="#EA4335" />
                  </View>
                  <Text style={styles.welcomeGoogleBtnText}>Continue with Google</Text>
                </TouchableOpacity>

                {/* 3. Sign In Footer Link */}
                <View style={styles.loginFooterRow}>
                  <Text style={styles.loginFooterText}>Already have an account? </Text>
                  <TouchableOpacity
                    onPress={() => setLoginModalVisible(true)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel="Sign in to existing account"
                  >
                    <Text style={styles.loginFooterLink}>Sign In</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        )}

        {/* ========================================================================= */}
        {/* INTERMEDIATE STEP: ENTER EMAIL TO RECEIVE VERIFICATION CODE               */}
        {/* ========================================================================= */}
        {stage === 'email_entry' && (
          <View style={styles.stepScreen}>
            {renderStepTopBar(1)}

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.stepScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.stepHeader}>
                <Text style={styles.stepTitle}>Enter your email</Text>
                <Text style={styles.stepSubtitle}>
                  We'll send a 6-digit verification code to confirm your email address.
                </Text>
              </View>

              <View style={styles.formGroup}>
                {/* Email Address */}
                <Text style={styles.inputLabel}>Email Address</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="mail-outline" size={18} color="#94A3B8" style={styles.inputLeftIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="name@example.com"
                    placeholderTextColor="#94A3B8"
                    value={signupEmail}
                    onChangeText={(v) => {
                      setSignupEmail(v);
                      if (authError) setAuthError(null);
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                {/* Create Password */}
                <Text style={styles.inputLabel}>Create Password</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={18} color="#94A3B8" style={styles.inputLeftIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="At least 6 characters"
                    placeholderTextColor="#94A3B8"
                    value={signupPassword}
                    onChangeText={(v) => {
                      setSignupPassword(v);
                      if (authError) setAuthError(null);
                    }}
                    secureTextEntry={!showSignupPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowSignupPassword(!showSignupPassword)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={showSignupPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color="#94A3B8"
                    />
                  </TouchableOpacity>
                </View>

                {authError && (
                  <View style={styles.errorBannerRow}>
                    <Ionicons name="alert-circle" size={16} color="#EF4444" />
                    <Text style={styles.errorBannerText}>{authError}</Text>
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={styles.bottomCtaBar}>
              <TouchableOpacity
                style={styles.primaryYellowCta}
                onPress={handleSendVerificationCode}
                disabled={authLoading}
                activeOpacity={0.88}
              >
                {authLoading ? (
                  <ActivityIndicator size="small" color="#0F172A" />
                ) : (
                  <Text style={styles.primaryYellowCtaText}>Send Verification Code →</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ========================================================================= */}
        {/* INTERMEDIATE STEP: ENTER 6-DIGIT VERIFICATION CODE (OTP)                  */}
        {/* ========================================================================= */}
        {stage === 'email_otp' && (
          <View style={styles.stepScreen}>
            {renderStepTopBar(1)}

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.stepScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.stepHeader}>
                <Text style={styles.stepTitle}>Verify your email</Text>
                <Text style={styles.stepSubtitle}>
                  Enter the 6-digit verification code sent to{'\n'}
                  <Text style={{ ...renewxTextStyle('bold'), color: renewxColors.black }}>{signupEmail}</Text>
                </Text>
              </View>

              {/* 6 Digits Interactive Boxes */}
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => otpInputRef.current?.focus()}
                style={styles.otpClickableZone}
              >
                <TextInput
                  ref={otpInputRef}
                  value={otpCode}
                  onChangeText={(val) => {
                    const clean = val.replace(/\D/g, '').slice(0, 6);
                    setOtpCode(clean);
                    if (authError) setAuthError(null);
                    if (clean.length === 6) {
                      handleVerifyOtp(clean);
                    }
                  }}
                  keyboardType="number-pad"
                  maxLength={6}
                  onFocus={() => setIsOtpFocused(true)}
                  onBlur={() => setIsOtpFocused(false)}
                  style={styles.hiddenNativeOtpInput}
                  caretHidden
                />

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
                          authError && styles.otpBoxError,
                        ]}
                      >
                        <Text style={styles.otpBoxChar}>{char}</Text>
                        {isCurrent && !char && <View style={styles.otpCursor} />}
                      </View>
                    );
                  })}
                </View>
              </TouchableOpacity>

              {authError && (
                <View style={[styles.errorBannerRow, { marginTop: 16 }]}>
                  <Ionicons name="alert-circle" size={16} color="#EF4444" />
                  <Text style={styles.errorBannerText}>{authError}</Text>
                </View>
              )}

              {/* Resend Code Section */}
              <View style={styles.resendCodeRow}>
                {canResend ? (
                  <TouchableOpacity onPress={handleResendOtp} disabled={authLoading}>
                    <Text style={styles.resendCodeLink}>Resend Verification Code</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.resendCountdownText}>
                    Resend code in <Text style={{ ...renewxTextStyle('bold'), color: renewxColors.black }}>{resendTimer}s</Text>
                  </Text>
                )}
              </View>
            </ScrollView>

            <View style={styles.bottomCtaBar}>
              <TouchableOpacity
                style={styles.primaryYellowCta}
                onPress={() => handleVerifyOtp()}
                disabled={authLoading || otpCode.length !== 6}
                activeOpacity={0.88}
              >
                {authLoading ? (
                  <ActivityIndicator size="small" color="#0F172A" />
                ) : (
                  <Text style={styles.primaryYellowCtaText}>Verify & Continue →</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 3: STEP 1 - CREATE YOUR ACCOUNT (WITH EMAIL LOCKED)                */}
        {/* ========================================================================= */}
        {stage === 'account' && (
          <View style={styles.stepScreen}>
            {renderStepTopBar(1)}

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.stepScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.stepHeader}>
                <Text style={styles.stepTitle}>Create your account</Text>
                <Text style={styles.stepSubtitle}>Enter your details to get started.</Text>
              </View>

              {/* Form Fields */}
              <View style={styles.formGroup}>
                {/* 1. Full Name */}
                <Text style={styles.inputLabel}>Full Name</Text>
                <View style={[styles.inputContainer, formErrors.fullName ? styles.inputError : null]}>
                  <Ionicons name="person-outline" size={18} color="#94A3B8" style={styles.inputLeftIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter your name"
                    placeholderTextColor="#94A3B8"
                    value={fullName}
                    onChangeText={(val) => {
                      setFullName(val);
                      if (formErrors.fullName) setFormErrors((prev) => ({ ...prev, fullName: undefined }));
                    }}
                    autoCapitalize="words"
                  />
                </View>
                {formErrors.fullName && <Text style={styles.errorMsgText}>{formErrors.fullName}</Text>}

                {/* 2. Mobile Number */}
                <Text style={styles.inputLabel}>Mobile Number</Text>
                <View style={[styles.inputContainer, formErrors.phone ? styles.inputError : null]}>
                  <Ionicons name="call-outline" size={18} color="#94A3B8" style={styles.inputLeftIcon} />
                  <Text style={styles.countryCodeText}>+91</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter mobile number"
                    placeholderTextColor="#94A3B8"
                    value={phone}
                    onChangeText={(val) => {
                      setPhone(val);
                      if (formErrors.phone) setFormErrors((prev) => ({ ...prev, phone: undefined }));
                    }}
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                </View>
                {formErrors.phone && <Text style={styles.errorMsgText}>{formErrors.phone}</Text>}

                {/* 3. Email (Locked) - Shows verified email from previous step */}
                <Text style={styles.inputLabel}>Email (Locked)</Text>
                <View style={[styles.inputContainer, styles.inputLocked]}>
                  <Ionicons name="mail-outline" size={18} color="#94A3B8" style={styles.inputLeftIcon} />
                  <TextInput
                    style={[styles.textInput, styles.textInputLocked]}
                    value={lockedEmail || user?.email || 'verified@renewx.in'}
                    editable={false}
                  />
                  <Ionicons name="lock-closed-outline" size={17} color="#94A3B8" style={styles.inputRightIcon} />
                </View>

                {/* 4. Address (Optional) */}
                <Text style={styles.inputLabel}>Address (Optional)</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="location-outline" size={18} color="#94A3B8" style={styles.inputLeftIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter your address"
                    placeholderTextColor="#94A3B8"
                    value={address}
                    onChangeText={setAddress}
                    autoCapitalize="sentences"
                  />
                </View>
              </View>
            </ScrollView>

            {/* Bottom Next Button */}
            <View style={styles.bottomCtaBar}>
              <TouchableOpacity
                style={styles.primaryYellowCta}
                onPress={() => {
                  if (validateStep1()) {
                    transitionTo('photo', 'forward');
                  }
                }}
                activeOpacity={0.88}
              >
                <Text style={styles.primaryYellowCtaText}>Next →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 4: STEP 2 - ADD A PROFILE PICTURE                                   */}
        {/* ========================================================================= */}
        {stage === 'photo' && (
          <View style={styles.stepScreen}>
            {renderStepTopBar(2)}

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.stepScrollContent}
            >
              <View style={styles.stepHeader}>
                <Text style={styles.stepTitle}>Add a profile picture</Text>
                <Text style={styles.stepSubtitle}>This helps personalise your experience.</Text>
              </View>

              {/* Avatar Picker Frame */}
              <View style={styles.avatarPickerSection}>
                <View style={styles.avatarOuterDashedRing}>
                  <TouchableOpacity
                    style={styles.avatarInnerCircle}
                    onPress={handleChoosePhoto}
                    activeOpacity={0.85}
                  >
                    {avatarUrl ? (
                      <Image source={{ uri: avatarUrl }} style={styles.avatarPreviewImg} />
                    ) : (
                      <Ionicons name="camera-outline" size={40} color="#0F172A" />
                    )}

                    {/* Yellow "+" badge at 4 o'clock */}
                    <View style={styles.avatarAddBadge}>
                      <Ionicons name="add" size={20} color="#0F172A" />
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Choose Photo Button */}
                <TouchableOpacity
                  style={styles.choosePhotoBtn}
                  onPress={handleChoosePhoto}
                  disabled={uploadingPhoto}
                  activeOpacity={0.85}
                >
                  {uploadingPhoto ? (
                    <ActivityIndicator size="small" color="#0F172A" />
                  ) : (
                    <>
                      <Ionicons name="images-outline" size={18} color="#0F172A" style={{ marginRight: 8 }} />
                      <Text style={styles.choosePhotoBtnText}>
                        {avatarUrl ? 'Change Photo' : 'Choose Photo'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <Text style={styles.photoOptionalNote}>Optional - You can skip this</Text>
              </View>
            </ScrollView>

            {/* Bottom Two-Button Bar (Skip + Next) */}
            <View style={styles.bottomTwoBtnBar}>
              <TouchableOpacity
                style={styles.secondarySoftBtn}
                onPress={() => transitionTo('review', 'forward')}
                activeOpacity={0.8}
              >
                <Text style={styles.secondarySoftBtnText}>Skip</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.primaryYellowBtnFlex}
                onPress={() => transitionTo('review', 'forward')}
                activeOpacity={0.88}
              >
                <Text style={styles.primaryYellowCtaText}>Next →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 5: STEP 3 - ALMOST THERE! (CONFIRMATION / REVIEW)                   */}
        {/* ========================================================================= */}
        {stage === 'review' && (
          <View style={styles.stepScreen}>
            {renderStepTopBar(3)}

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.stepScrollContent}
            >
              <View style={styles.reviewHeaderRow}>
                <Text style={styles.stepTitle}>Almost there!</Text>
                <Text style={styles.reviewHeaderSub}>Please confirm your details.</Text>
              </View>

              {/* Details Summary Card */}
              <View style={styles.summaryCard}>
                {/* 1. Name */}
                <View style={styles.summaryRow}>
                  <View style={styles.summaryLeftCol}>
                    <Ionicons name="person-outline" size={17} color="#64748B" style={styles.summaryIcon} />
                    <Text style={styles.summaryLabel}>Name</Text>
                  </View>
                  <Text style={styles.summaryValue} numberOfLines={1}>
                    {fullName || 'Not provided'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => transitionTo('account', 'backward')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.summaryActionYellow}>Edit</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.summaryDivider} />

                {/* 2. Mobile Number */}
                <View style={styles.summaryRow}>
                  <View style={styles.summaryLeftCol}>
                    <Ionicons name="call-outline" size={17} color="#64748B" style={styles.summaryIcon} />
                    <Text style={styles.summaryLabel}>Mobile Number</Text>
                  </View>
                  <Text style={styles.summaryValue} numberOfLines={1}>
                    {phone ? `+91 ${phone}` : 'Not provided'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => transitionTo('account', 'backward')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.summaryActionYellow}>Edit</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.summaryDivider} />

                {/* 3. Email (Locked) */}
                <View style={styles.summaryRow}>
                  <View style={styles.summaryLeftCol}>
                    <Ionicons name="mail-outline" size={17} color="#64748B" style={styles.summaryIcon} />
                    <Text style={styles.summaryLabel}>Email</Text>
                  </View>
                  <Text style={styles.summaryValue} numberOfLines={1}>
                    {lockedEmail || user?.email || 'verified@renewx.in'}
                  </Text>
                  <Ionicons name="lock-closed-outline" size={15} color="#94A3B8" />
                </View>

                <View style={styles.summaryDivider} />

                {/* 4. Address */}
                <View style={styles.summaryRow}>
                  <View style={styles.summaryLeftCol}>
                    <Ionicons name="location-outline" size={17} color="#64748B" style={styles.summaryIcon} />
                    <Text style={styles.summaryLabel}>Address</Text>
                  </View>
                  <Text
                    style={[
                      styles.summaryValue,
                      !address ? styles.summaryValueMuted : null,
                    ]}
                    numberOfLines={1}
                  >
                    {address || 'Not provided'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => transitionTo('account', 'backward')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.summaryActionYellow}>{address ? 'Edit' : 'Add'}</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.summaryDivider} />

                {/* 5. Profile Picture */}
                <View style={styles.summaryRow}>
                  <View style={styles.summaryLeftCol}>
                    <Ionicons name="image-outline" size={17} color="#64748B" style={styles.summaryIcon} />
                    <Text style={styles.summaryLabel}>Profile Picture</Text>
                  </View>
                  <Text
                    style={[
                      styles.summaryValue,
                      !avatarUrl ? styles.summaryValueMuted : null,
                    ]}
                  >
                    {avatarUrl ? 'Added' : 'Not added'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => transitionTo('photo', 'backward')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.summaryActionYellow}>{avatarUrl ? 'Edit' : 'Add'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            {/* Bottom Create Account Button */}
            <View style={styles.bottomCtaBar}>
              <TouchableOpacity
                style={styles.primaryYellowCta}
                onPress={handleCreateAccount}
                disabled={isSubmitting}
                activeOpacity={0.88}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#0F172A" />
                ) : (
                  <Text style={styles.primaryYellowCtaText}>Create Account</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 6: STEP 4 - ACCOUNT CREATED SUCCESSFULLY!                          */}
        {/* ========================================================================= */}
        {stage === 'success' && (
          <View style={styles.successScreen}>
            <View style={styles.successCenterWrap}>
              {/* Confetti & Aura background */}
              <Animated.View
                style={[
                  styles.confettiWrap,
                  { opacity: confettiOpacity },
                ]}
              >
                <View style={[styles.confettiDot, { top: -20, left: -40, backgroundColor: renewxColors.yellow, width: 10, height: 10 }]} />
                <View style={[styles.confettiDot, { top: -35, right: -30, backgroundColor: '#10B981', width: 8, height: 14, transform: [{ rotate: '25deg' }] }]} />
                <View style={[styles.confettiDot, { top: 30, left: -60, backgroundColor: '#3B82F6', width: 12, height: 8, transform: [{ rotate: '-15deg' }] }]} />
                <View style={[styles.confettiDot, { top: 40, right: -55, backgroundColor: '#F97316', width: 10, height: 10, borderRadius: 5 }]} />
                <View style={[styles.confettiDot, { top: -10, right: 35, backgroundColor: '#8B5CF6', width: 8, height: 8 }]} />
                <View style={styles.celebrationHalo} />
              </Animated.View>

              {/* Celebratory Animated Checkmark with Glow & Confetti */}
              <View style={{ marginVertical: 12, alignItems: 'center', justifyContent: 'center' }}>
                <AnimatedOrderSuccessTick size={92} showParticles={true} autoPlay={true} />
              </View>

              {/* Success Typography */}
              <Text style={styles.successTitle}>Account Created{'\n'}Successfully!</Text>
              <Text style={styles.successSubtitle}>
                Welcome to <Text style={{ ...renewxTextStyle('extraBold'), color: renewxColors.black }}>RenewX</Text>, {fullName || 'there'}!{'\n'}
                Start exploring certified pre-owned{'\n'}devices at the best prices.
              </Text>
            </View>

            {/* Continue to Home Button */}
            <View style={styles.bottomCtaBar}>
              <TouchableOpacity
                style={styles.primaryYellowCta}
                onPress={handleSkipToHome}
                activeOpacity={0.88}
              >
                <Text style={styles.primaryYellowCtaText}>Continue to Home →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Animated.View>

      {/* ========================================================================= */}
      {/* QUICK LOGIN MODAL (Triggered from Screen 2 "Already have an account?")     */}
      {/* ========================================================================= */}
      <Modal
        visible={loginModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLoginModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setLoginModalVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Sign In to RenewX</Text>
              <TouchableOpacity
                onPress={() => setLoginModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={22} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Email Address</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={18} color="#94A3B8" style={styles.inputLeftIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="name@example.com"
                placeholderTextColor="#94A3B8"
                value={loginEmail}
                onChangeText={setLoginEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <Text style={[styles.inputLabel, { marginTop: 12 }]}>Password</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={18} color="#94A3B8" style={styles.inputLeftIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="••••••••"
                placeholderTextColor="#94A3B8"
                value={loginPassword}
                onChangeText={setLoginPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryYellowCta, { marginTop: 20 }]}
              onPress={handleLoginSubmit}
              disabled={loginLoading}
              activeOpacity={0.88}
            >
              {loginLoading ? (
                <ActivityIndicator size="small" color="#0F172A" />
              ) : (
                <Text style={styles.primaryYellowCtaText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  animatedContent: {
    flex: 1,
  },

  /* ========================================================================= */
  /* SCREEN 1: SPLASH STYLES                                                   */
  /* ========================================================================= */
  splashScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 40,
  },
  splashLogoWrap: {
    alignItems: 'center',
    marginTop: 20,
  },
  heroGraphicWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: SCREEN_WIDTH * 0.85,
    height: SCREEN_WIDTH * 0.85,
    maxHeight: 340,
  },
  heroGraphicGlowAura: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: renewxColors.yellowLight,
    opacity: 0.75,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  splashFooter: {
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  progressBarTrack: {
    width: 140,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: renewxColors.yellow,
    borderRadius: 2,
  },
  splashSubtitle: {
    fontSize: 14,
    ...renewxTextStyle('medium'),
    color: renewxColors.textSecondary,
    letterSpacing: -0.1,
  },

  /* ========================================================================= */
  /* SCREEN 2: WELCOME STYLES                                                  */
  /* ========================================================================= */
  welcomeScreen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  welcomeBrandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8,
    width: '100%',
  },
  welcomeTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  skipBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  skipBtnText: {
    fontSize: 14,
    ...renewxTextStyle('semibold'),
    color: renewxColors.black,
  },
  welcomeScrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  welcomeTrustPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: renewxColors.mint,
    borderWidth: 1,
    borderColor: renewxColors.mintBorder,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    marginTop: 6,
    marginBottom: 10,
  },
  welcomeTrustPillText: {
    fontSize: 11.5,
    ...renewxTextStyle('semibold'),
    color: renewxColors.emerald,
    letterSpacing: 0.2,
  },
  welcomeTitleBlock: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 14,
    maxWidth: 340,
  },
  welcomeTitleLine1: {
    fontSize: 24,
    ...renewxTextStyle('bold'),
    color: renewxColors.textSecondary,
    letterSpacing: -0.4,
  },
  welcomeTitleLine2: {
    fontSize: 34,
    ...renewxTextStyle('black'),
    color: renewxColors.black,
    letterSpacing: -0.8,
    marginTop: -2,
  },
  welcomeSubtitle: {
    fontSize: 14.5,
    ...renewxTextStyle('medium'),
    color: renewxColors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginTop: 10,
  },
  welcomeHeroWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: SCREEN_WIDTH * 0.74,
    height: SCREEN_WIDTH * 0.56,
    maxHeight: 220,
    marginVertical: 10,
  },
  welcomeHeroGlow: {
    position: 'absolute',
    width: 196,
    height: 196,
    borderRadius: 98,
    backgroundColor: renewxColors.yellowLight,
    opacity: 0.75,
  },
  welcomeHeroImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  welcomeActionsWrap: {
    width: '100%',
    maxWidth: 380,
    marginTop: 10,
  },
  welcomePrimaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: renewxColors.yellow,
    borderWidth: 1,
    borderColor: renewxColors.yellowDark,
    borderRadius: 14,
    paddingVertical: 15,
    marginBottom: 16,
    ...Platform.select({
      web: { boxShadow: '0 4px 14px rgba(255, 196, 0, 0.30)' },
      default: {
        shadowColor: renewxColors.yellow,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.28,
        shadowRadius: 6,
        elevation: 3,
      },
    }),
  },
  welcomePrimaryCtaText: {
    fontSize: 16,
    ...renewxTextStyle('extraBold'),
    color: renewxColors.black,
    letterSpacing: -0.2,
  },
  welcomeGoogleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingVertical: 14,
    marginBottom: 18,
  },
  welcomeGoogleBtnText: {
    fontSize: 15,
    ...renewxTextStyle('bold'),
    color: renewxColors.black,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: renewxColors.yellow,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 12,
    ...(renewxShadows.card as object),
  },
  socialIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  googleBtnText: {
    fontSize: 15,
    ...renewxTextStyle('extraBold'),
    color: renewxColors.black,
  },
  appleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 14,
    marginBottom: 16,
  },
  appleBtnText: {
    fontSize: 15,
    ...renewxTextStyle('bold'),
    color: renewxColors.black,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 11.5,
    color: '#64748B',
    ...renewxTextStyle('semibold'),
    letterSpacing: 0.8,
  },
  emailSignUpBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 18,
  },
  emailSignUpBtnText: {
    fontSize: 15,
    ...renewxTextStyle('bold'),
    color: renewxColors.black,
  },
  loginFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  loginFooterText: {
    fontSize: 14,
    color: renewxColors.textSecondary,
    ...renewxTextStyle('medium'),
  },
  loginFooterLink: {
    fontSize: 14,
    color: renewxColors.emerald,
    ...renewxTextStyle('bold'),
  },

  /* ========================================================================= */
  /* COMMON STEPS TOP BAR & INDICATORS                                         */
  /* ========================================================================= */
  stepScreen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  stepTopBar: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  stepTopBarHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnPlaceholder: {
    width: 38,
  },
  stepIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 40,
  },
  stepDash: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    maxWidth: 60,
  },
  stepDashActive: {
    backgroundColor: renewxColors.yellow,
  },
  stepDashInactive: {
    backgroundColor: '#E2E8F0',
  },
  stepScrollContent: {
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 110,
  },
  stepHeader: {
    marginBottom: 20,
  },
  stepTitle: {
    fontSize: 25,
    ...renewxTextStyle('extraBold'),
    color: renewxColors.black,
    letterSpacing: -0.5,
  },
  stepSubtitle: {
    fontSize: 14.5,
    color: renewxColors.textSecondary,
    marginTop: 5,
    ...renewxTextStyle('medium'),
    lineHeight: 21,
  },

  /* ========================================================================= */
  /* OTP INPUT SECTION                                                         */
  /* ========================================================================= */
  otpClickableZone: {
    alignItems: 'center',
    marginVertical: 14,
    position: 'relative',
    height: 60,
    justifyContent: 'center',
  },
  hiddenNativeOtpInput: {
    position: 'absolute',
    opacity: 0.01,
    width: '100%',
    height: '100%',
    fontSize: 1,
    color: 'transparent',
  },
  otpBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
  },
  otpBox: {
    width: 48,
    height: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  otpBoxActive: {
    borderColor: renewxColors.yellow,
    backgroundColor: '#FFFDF5',
  },
  otpBoxFilled: {
    borderColor: renewxColors.black,
    backgroundColor: '#FFFFFF',
  },
  otpBoxError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  otpBoxChar: {
    fontSize: 22,
    ...renewxTextStyle('black'),
    color: renewxColors.black,
  },
  otpCursor: {
    position: 'absolute',
    width: 2,
    height: 22,
    backgroundColor: renewxColors.yellow,
  },
  resendCodeRow: {
    alignItems: 'center',
    marginTop: 16,
  },
  resendCodeLink: {
    fontSize: 14,
    color: renewxColors.emerald,
    ...renewxTextStyle('bold'),
  },
  resendCountdownText: {
    fontSize: 13.5,
    ...renewxTextStyle('medium'),
    color: renewxColors.textSecondary,
  },
  errorBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    padding: 11,
    marginTop: 10,
    gap: 8,
  },
  errorBannerText: {
    fontSize: 13,
    color: '#B91C1C',
    flex: 1,
    ...renewxTextStyle('medium'),
  },

  /* ========================================================================= */
  /* STEP 1: FORM INPUTS                                                       */
  /* ========================================================================= */
  formGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13.5,
    ...renewxTextStyle('semibold'),
    color: renewxColors.black,
    marginTop: 10,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
  },
  inputLocked: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  inputLeftIcon: {
    marginRight: 10,
  },
  countryCodeText: {
    fontSize: 14.5,
    ...renewxTextStyle('bold'),
    color: renewxColors.black,
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 14.5,
    color: renewxColors.black,
    ...renewxTextStyle('medium'),
  },
  textInputLocked: {
    color: '#475569',
  },
  inputRightIcon: {
    marginLeft: 10,
  },
  errorMsgText: {
    fontSize: 12.5,
    ...renewxTextStyle('medium'),
    color: '#DC2626',
    marginTop: 2,
    marginLeft: 4,
  },

  /* Bottom CTA Bar */
  bottomCtaBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  primaryYellowCta: {
    backgroundColor: renewxColors.yellow,
    borderWidth: 1,
    borderColor: renewxColors.yellowDark,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { boxShadow: '0 4px 14px rgba(255, 196, 0, 0.28)' },
      default: {
        shadowColor: renewxColors.yellow,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.28,
        shadowRadius: 6,
        elevation: 3,
      },
    }),
  },
  primaryYellowCtaText: {
    fontSize: 15.5,
    ...renewxTextStyle('extraBold'),
    color: renewxColors.black,
  },

  /* ========================================================================= */
  /* STEP 2: PROFILE PICTURE STYLES                                            */
  /* ========================================================================= */
  avatarPickerSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatarOuterDashedRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 24,
  },
  avatarInnerCircle: {
    width: 124,
    height: 124,
    borderRadius: 62,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'visible',
  },
  avatarPreviewImg: {
    width: 124,
    height: 124,
    borderRadius: 62,
  },
  avatarAddBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: renewxColors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    ...(renewxShadows.card as object),
  },
  choosePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginBottom: 12,
  },
  choosePhotoBtnText: {
    fontSize: 14,
    ...renewxTextStyle('bold'),
    color: renewxColors.black,
  },
  photoOptionalNote: {
    fontSize: 13,
    color: '#64748B',
    ...renewxTextStyle('medium'),
  },

  /* Bottom Two-Button Bar (Skip + Next) */
  bottomTwoBtnBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    flexDirection: 'row',
    gap: 12,
  },
  secondarySoftBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondarySoftBtnText: {
    fontSize: 15,
    ...renewxTextStyle('semibold'),
    color: renewxColors.black,
  },
  primaryYellowBtnFlex: {
    flex: 1,
    backgroundColor: renewxColors.yellow,
    borderWidth: 1,
    borderColor: renewxColors.yellowDark,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    ...(renewxShadows.card as object),
  },

  /* ========================================================================= */
  /* STEP 3: REVIEW / CONFIRMATION STYLES                                      */
  /* ========================================================================= */
  reviewHeaderRow: {
    marginBottom: 20,
  },
  reviewHeaderSub: {
    fontSize: 14,
    color: renewxColors.textSecondary,
    marginTop: 4,
    ...renewxTextStyle('medium'),
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    gap: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 125,
  },
  summaryIcon: {
    marginRight: 8,
  },
  summaryLabel: {
    fontSize: 13.5,
    color: renewxColors.textSecondary,
    ...renewxTextStyle('semibold'),
  },
  summaryValue: {
    flex: 1,
    fontSize: 13.5,
    color: renewxColors.black,
    ...renewxTextStyle('bold'),
    textAlign: 'right',
    marginRight: 14,
  },
  summaryValueMuted: {
    color: '#64748B',
    ...renewxTextStyle('medium'),
  },
  summaryActionYellow: {
    fontSize: 13.5,
    ...renewxTextStyle('bold'),
    color: renewxColors.emerald,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },

  /* ========================================================================= */
  /* SCREEN 6 / STEP 4: SUCCESS CONFIRMATION STYLES                            */
  /* ========================================================================= */
  successScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
    backgroundColor: '#FFFFFF',
  },
  successCenterWrap: {
    alignItems: 'center',
    position: 'relative',
    marginTop: 40,
  },
  confettiWrap: {
    position: 'absolute',
    top: -20,
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  celebrationHalo: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: renewxColors.yellowLight,
    opacity: 0.45,
  },
  confettiDot: {
    position: 'absolute',
    borderRadius: 2,
  },
  successCheckBadge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: renewxColors.emerald,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    ...(renewxShadows.elevated as object),
  },
  successTitle: {
    fontSize: 26,
    ...renewxTextStyle('black'),
    color: renewxColors.black,
    textAlign: 'center',
    lineHeight: 33,
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  successSubtitle: {
    fontSize: 14.5,
    color: renewxColors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    ...renewxTextStyle('medium'),
  },

  /* Quick Login Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 22,
    ...(renewxShadows.floating as object),
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 19,
    ...renewxTextStyle('extraBold'),
    color: renewxColors.black,
  },
});
