import { useMemo, useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme';

type AuthMode = 'login' | 'signup';

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function getFriendlyAuthError(message: string) {
  const error = message.toLowerCase();

  if (
    error.includes('weak_password') ||
    error.includes('pwned') ||
    error.includes('password') && error.includes('common')
  ) {
    return 'That password is too common. Please choose a stronger password.';
  }

  if (
    error.includes('invalid login') ||
    error.includes('invalid credentials') ||
    error.includes('invalid email or password')
  ) {
    return 'The email or password is incorrect. Please check and try again.';
  }

  if (
    error.includes('already registered') ||
    error.includes('user already registered') ||
    error.includes('already exists')
  ) {
    return 'An account with this email already exists. Try signing in instead.';
  }

  if (error.includes('email') && error.includes('confirm')) {
    return 'Please confirm your email before signing in.';
  }

  return message || 'Something went wrong. Please try again.';
}

interface AuthScreenProps {
  onForgotPassword?: () => void;
}

export default function AuthScreen({ onForgotPassword }: AuthScreenProps = {}) {
  // signInWithGoogle is intentionally read as an optional method so this
  // screen remains compatible with an AuthContext that is being upgraded.
  const auth = useAuth() as any;
  const { signIn, signUp } = auth;
  const signInWithGoogle = auth.signInWithGoogle;

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const isLogin = mode === 'login';
  const canSubmit = useMemo(
    () => email.trim().length > 0 && password.length > 0,
    [email, password],
  );

  const handleSubmit = async () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError('Enter your email address to continue.');
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!password) {
      setError('Enter your password to continue.');
      return;
    }

    if (password.length < 8) {
      setError('Your password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const fn = isLogin ? signIn : signUp;

      if (typeof fn !== 'function') {
        setError('Authentication is not configured correctly. Please try again later.');
        return;
      }

      const result = await fn(cleanEmail, password);

      if (result?.error) {
        setError(getFriendlyAuthError(String(result.error)));
      }
    } catch (err: any) {
      setError(getFriendlyAuthError(err?.message || 'Unable to complete authentication.'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (typeof signInWithGoogle !== 'function') {
      setError('Google sign-in is not available right now. Please use email and password.');
      return;
    }

    setGoogleLoading(true);
    setError(null);

    try {
      const result = await signInWithGoogle();

      if (result?.error) {
        setError(getFriendlyAuthError(String(result.error)));
      }
    } catch (err: any) {
      setError(getFriendlyAuthError(err?.message || 'Unable to continue with Google.'));
    } finally {
      setGoogleLoading(false);
    }
  };

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError(null);
    setPassword('');
    setShowPassword(false);
  };

  const busy = loading || googleLoading;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand */}
        <View style={styles.brandSection}>
          <Image
            source={require('@/assets/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />

          <View>
            <Text style={styles.brandName}>
              Renew<Text style={styles.brandAccent}>X</Text>
            </Text>
            <Text style={styles.brandCaption}>CREW MOBILE</Text>
          </View>
        </View>

        {/* Simple welcome */}
        <View style={styles.welcomeSection}>
          <Text style={styles.title}>
            {isLogin ? 'Welcome back 👋' : 'Create your account'}
          </Text>
          <Text style={styles.subtitle}>
            {isLogin
              ? 'Sign in to continue shopping and manage your orders.'
              : 'Create an account to shop, sell devices and track orders.'}
          </Text>
        </View>

        {/* Login / Sign up switch */}
        <View style={styles.modeSwitch}>
          <TouchableOpacity
            style={[styles.modeButton, isLogin && styles.modeButtonActive]}
            onPress={() => switchMode('login')}
            disabled={busy}
            activeOpacity={0.8}
          >
            <Text style={[styles.modeText, isLogin && styles.modeTextActive]}>
              Sign In
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeButton, !isLogin && styles.modeButtonActive]}
            onPress={() => switchMode('signup')}
            disabled={busy}
            activeOpacity={0.8}
          >
            <Text style={[styles.modeText, !isLogin && styles.modeTextActive]}>
              Create Account
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={styles.formCard}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email address</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={18} color={colors.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  if (error) setError(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
                editable={!busy}
                returnKeyType="next"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Password</Text>
              <Text style={styles.passwordHint}>8+ characters</Text>
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />

              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  if (error) setError(null);
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete={isLogin ? 'password' : 'new-password'}
                textContentType={isLogin ? 'password' : 'newPassword'}
                editable={!busy}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />

              <TouchableOpacity
                onPress={() => setShowPassword((value) => !value)}
                disabled={busy}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={19}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            </View>
            {isLogin && (
              <View style={styles.forgotPasswordRow}>
                <TouchableOpacity
                  onPress={() => {
                    if (onForgotPassword) {
                      onForgotPassword();
                    } else if (Platform.OS === 'web' && typeof window !== 'undefined') {
                      window.location.href = '/security';
                    }
                  }}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={17} color="#dc2626" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Primary action */}
          <TouchableOpacity
            style={[
              styles.primaryButton,
              (!canSubmit || busy) && styles.primaryButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!canSubmit || busy}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.black} />
            ) : (
              <>
                <Text style={styles.primaryButtonText}>
                  {isLogin ? 'Sign In' : 'Create Account'}
                </Text>
                <Ionicons name="arrow-forward" size={18} color={colors.black} />
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.divider} />
          </View>

          {/* Google */}
          <TouchableOpacity
            style={[styles.googleButton, googleLoading && styles.buttonDisabled]}
            onPress={handleGoogleSignIn}
            disabled={busy}
            activeOpacity={0.85}
          >
            {googleLoading ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <>
                <View style={styles.googleIcon}>
                  <Text style={styles.googleIconText}>G</Text>
                </View>
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Helpful footer */}
        <View style={styles.footer}>
          <Ionicons name="shield-checkmark-outline" size={15} color="#059669" />
          <Text style={styles.footerText}>
            Your account is protected with secure authentication.
          </Text>
        </View>

        <Text style={styles.modeHelp}>
          {isLogin
            ? 'New to RenewX? Tap “Create Account” above.'
            : 'Already have an account? Tap “Sign In” above.'}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f7f2',
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: 44,
    paddingBottom: 36,
  },

  brandSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 34,
  },

  logoImage: {
    width: 48,
    height: 48,
    borderRadius: 14,
    marginRight: 12,
  },

  brandName: {
    fontSize: 23,
    lineHeight: 26,
    fontWeight: fontWeight.black,
    color: colors.text,
    letterSpacing: -0.7,
  },

  brandAccent: {
    color: colors.primary,
  },

  brandCaption: {
    fontSize: 8,
    lineHeight: 11,
    color: colors.textMuted,
    fontWeight: fontWeight.bold,
    letterSpacing: 1.8,
  },

  welcomeSection: {
    marginBottom: 20,
  },

  title: {
    fontSize: 27,
    lineHeight: 33,
    fontWeight: fontWeight.black,
    color: colors.text,
    letterSpacing: -0.7,
  },

  subtitle: {
    marginTop: 7,
    fontSize: fontSize.sm,
    lineHeight: 20,
    color: colors.textMuted,
    maxWidth: 340,
  },

  modeSwitch: {
    flexDirection: 'row',
    backgroundColor: '#eeeae0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 14,
  },

  modeButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },

  modeButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },

  modeText: {
    fontSize: fontSize.sm,
    color: '#6b7280',
    fontWeight: fontWeight.semibold,
  },

  modeTextActive: {
    color: colors.text,
    fontWeight: fontWeight.bold,
  },

  formCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e8e3d8',
    borderRadius: radius.lg,
    padding: spacing.md,
  },

  inputGroup: {
    marginBottom: 15,
  },

  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 7,
  },

  label: {
    fontSize: fontSize.xs,
    color: colors.text,
    fontWeight: fontWeight.bold,
    marginBottom: 7,
  },

  passwordHint: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
  },

  inputContainer: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#faf9f5',
    borderWidth: 1,
    borderColor: '#ded9ce',
    borderRadius: radius.md,
    paddingHorizontal: 13,
    gap: 9,
  },

  input: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.sm,
    paddingVertical: 0,
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: radius.md,
    padding: 10,
    gap: 7,
    marginBottom: 12,
  },

  errorText: {
    flex: 1,
    color: '#b91c1c',
    fontSize: fontSize.xs,
    lineHeight: 17,
  },

  primaryButton: {
    minHeight: 50,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  primaryButtonDisabled: {
    opacity: 0.5,
  },

  primaryButtonText: {
    color: colors.black,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 17,
    gap: 10,
  },

  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#e8e3d8',
  },

  dividerText: {
    fontSize: 10,
    color: '#9ca3af',
    fontWeight: fontWeight.bold,
  },

  googleButton: {
    minHeight: 50,
    borderRadius: radius.md,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d9d5cb',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  googleIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },

  googleIconText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#4285F4',
  },

  googleButtonText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 22,
    paddingHorizontal: 8,
  },

  footerText: {
    color: colors.textMuted,
    fontSize: 10,
    textAlign: 'center',
  },

  modeHelp: {
    marginTop: 12,
    color: '#9ca3af',
    fontSize: 10,
    textAlign: 'center',
  },

  forgotPasswordRow: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },

  forgotPasswordText: {
    fontSize: 12,
    fontWeight: fontWeight.bold,
    color: '#0284c7',
  },
});
