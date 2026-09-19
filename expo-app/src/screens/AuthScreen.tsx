import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme';

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    setError(null);

    const fn = mode === 'login' ? signIn : signUp;
    const { error: err } = await fn(email.trim(), password);

    if (err) {
      if (err.includes('weak_password') || err.includes('pwned')) {
        setError('That password is too common. Please use a stronger password.');
      } else if (err.includes('Invalid login credentials')) {
        setError('Incorrect email or password. Please try again.');
      } else if (err.includes('already registered') || err.includes('User already registered')) {
        setError('An account with this email already exists. Try logging in.');
      } else {
        setError(err || 'Something went wrong. Please try again.');
      }
    }

    setLoading(false);
  };

  const fillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Logo and Header */}
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <View style={styles.logoBox}>
              <Ionicons name="phone-portrait-outline" size={24} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.logoTitle}>
                Renew<Text style={styles.logoAccent}>X</Text>
              </Text>
              <Text style={styles.logoSub}>CREW MOBILE</Text>
            </View>
          </View>
          <Text style={styles.tagline}>Buy. Sell. Upgrade. The Smart Way.</Text>
        </View>

        {/* Title */}
        <View style={styles.welcomeSection}>
          <Text style={styles.title}>
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </Text>
          <Text style={styles.subtitle}>
            {mode === 'login'
              ? 'Sign in to shop verified refurbished electronics.'
              : 'Join RenewX Crew to shop premium tech with warranty.'}
          </Text>
        </View>

        {/* Form Inputs */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={18} color="#94a3b8" />
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor="#64748b"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={18} color="#94a3b8" />
              <TextInput
                style={styles.input}
                placeholder="Min. 8 characters"
                placeholderTextColor="#64748b"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color="#ef4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.black} />
            ) : (
              <View style={styles.btnRow}>
                <Text style={styles.submitButtonText}>
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                </Text>
                <Ionicons name="arrow-forward" size={18} color={colors.black} />
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchMode}
            onPress={() => {
              setMode(mode === 'login' ? 'signup' : 'login');
              setError(null);
            }}
          >
            <Text style={styles.switchModeText}>
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <Text style={styles.switchModeHighlight}>
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Demo Accounts Quick Login */}
        <View style={styles.demoSection}>
          <Text style={styles.demoTitle}>QUICK FILL DEMO ACCOUNTS</Text>
          <View style={styles.demoRow}>
            <TouchableOpacity
              style={styles.demoBtn}
              onPress={() => fillDemo('admin@renewx.com', 'Admin123!')}
            >
              <Ionicons name="shield-checkmark" size={14} color={colors.primary} />
              <Text style={styles.demoBtnText}>Admin Account</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.demoBtn}
              onPress={() => fillDemo('customer@example.com', 'Customer123!')}
            >
              <Ionicons name="person" size={14} color="#94a3b8" />
              <Text style={styles.demoBtnText}>Customer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: 56,
    paddingBottom: 40,
  },
  header: {
    marginBottom: spacing.xl,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: spacing.xs,
  },
  logoBox: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  logoTitle: {
    fontSize: 22,
    fontWeight: fontWeight.black,
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  logoAccent: {
    color: colors.primary,
  },
  logoSub: {
    fontSize: 9,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    letterSpacing: 2,
    marginTop: 1,
  },
  tagline: {
    fontSize: fontSize.xs,
    color: '#94a3b8',
    marginTop: 4,
  },
  welcomeSection: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: fontWeight.bold,
    color: '#ffffff',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: '#94a3b8',
    lineHeight: 20,
  },
  form: {
    marginBottom: spacing.xl,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: '#cbd5e1',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: spacing.md,
    height: 50,
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: fontSize.sm,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: fontSize.xs,
    flex: 1,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: colors.black,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  switchMode: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  switchModeText: {
    fontSize: fontSize.sm,
    color: '#94a3b8',
  },
  switchModeHighlight: {
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },
  demoSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  demoTitle: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: '#64748b',
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  demoRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  demoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: radius.sm,
    paddingVertical: 10,
  },
  demoBtnText: {
    fontSize: fontSize.xs,
    color: '#e2e8f0',
    fontWeight: fontWeight.semibold,
  },
});
