import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { getApiBaseUrl } from '@/services/api';
import { getStoredPushTokenAsync, registerPushTokenInBackground, unregisterPushTokenAsync } from '@/services/pushNotifications';

WebBrowser.maybeCompleteAuthSession();

const TOKEN_STORAGE_KEY = '@renewx_auth_token';
const USER_STORAGE_KEY = '@renewx_auth_user';

export interface AppUser {
  id: string;
  email: string;
  role: 'admin' | 'customer';
  full_name?: string;
  avatar_url?: string;
}

interface AuthContextValue {
  token: string | null;
  user: AppUser | null;
  profile: AppUser | null; // Compatibility with existing screens
  session: { access_token: string; user: AppUser } | null; // Compatibility
  isAdmin: boolean;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  loginWithToken: (token: string, user: AppUser) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const googleWebClientId =
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() || 'disabled';
  const googleAndroidClientId =
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim() || 'disabled';
  const googleIosClientId =
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() || 'disabled';

  const googleConfigured =
    Platform.OS === 'android'
      ? googleAndroidClientId !== 'disabled'
      : Platform.OS === 'ios'
        ? googleIosClientId !== 'disabled'
        : googleWebClientId !== 'disabled';

  const [, googleResponse, promptGoogleAsync] = Google.useIdTokenAuthRequest({
    webClientId: googleWebClientId,
    androidClientId: googleAndroidClientId,
    iosClientId: googleIosClientId,
    selectAccount: true,
  });

  // Restore session from AsyncStorage on boot
  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
        const storedUserJson = await AsyncStorage.getItem(USER_STORAGE_KEY);

        if (storedToken) {
          if (isMounted) setToken(storedToken);
          if (storedUserJson) {
            try {
              if (isMounted) setUser(JSON.parse(storedUserJson));
            } catch {
              // Ignore JSON parse error
            }
          }

          // Verify token with backend
          try {
            const res = await fetch(`${getApiBaseUrl()}/auth/me`, {
              headers: { Authorization: `Bearer ${storedToken}` },
            });
            const json = await res.json();
            if (json.success && json.data && isMounted) {
              setUser(json.data);
              await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(json.data));
            } else if (res.status === 401) {
              // Token expired
              await AsyncStorage.multiRemove([TOKEN_STORAGE_KEY, USER_STORAGE_KEY]);
              if (isMounted) {
                setToken(null);
                setUser(null);
              }
            }
          } catch (fetchErr) {
            console.warn('[Auth] Could not verify session with server, keeping cached user:', fetchErr);
          }

          registerPushTokenInBackground();
        }
      } catch (err) {
        console.error('[Auth] Failed to restore session:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        return { error: json.error?.message || 'Login failed' };
      }

      const receivedToken = json.data.token;
      const receivedUser = json.data.user;

      setToken(receivedToken);
      setUser(receivedUser);

      await AsyncStorage.setItem(TOKEN_STORAGE_KEY, receivedToken);
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(receivedUser));
      registerPushTokenInBackground();

      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Network connection failed' };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName?: string) => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          full_name: fullName,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        return { error: json.error?.message || 'Registration failed' };
      }

      const receivedToken = json.data.token;
      const receivedUser = json.data.user;

      setToken(receivedToken);
      setUser(receivedUser);

      await AsyncStorage.setItem(TOKEN_STORAGE_KEY, receivedToken);
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(receivedUser));
      registerPushTokenInBackground();

      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Network connection failed' };
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!googleConfigured) {
      return {
        error: 'Google sign-in is not configured for this app build.',
      };
    }

    if (!promptGoogleAsync) {
      return {
        error: 'Google sign-in is still loading. Please try again.',
      };
    }

    try {
      const result = await promptGoogleAsync();

      if (result?.type !== 'success') {
        if (result?.type === 'cancel' || result?.type === 'dismiss') {
          return { error: 'Google sign-in was cancelled.' };
        }

        return { error: 'Google sign-in failed. Please try again.' };
      }

      const idToken =
        result.params?.id_token ||
        result.authentication?.idToken;

      if (!idToken) {
        return { error: 'Google did not return a valid ID token.' };
      }

      const response = await fetch(`${getApiBaseUrl()}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      const json = await response.json();

      if (!response.ok || !json.success) {
        return {
          error: json.error?.message || 'Google sign-in could not be completed.',
        };
      }

      const receivedToken = json.data.token;
      const receivedUser = json.data.user;

      await loginWithToken(receivedToken, receivedUser);

      return { error: null };
    } catch (err: any) {
      console.error('[Auth] Google sign-in failed:', err);
      return {
        error: err?.message || 'Unable to complete Google sign-in.',
      };
    }
  }, [googleConfigured, promptGoogleAsync, loginWithToken]);

  const loginWithToken = useCallback(async (receivedToken: string, receivedUser: AppUser) => {
    setToken(receivedToken);
    setUser(receivedUser);
    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, receivedToken);
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(receivedUser));
    registerPushTokenInBackground();
  }, []);

  const signOut = useCallback(async () => {
    try {
      const pushToken = await getStoredPushTokenAsync();
      if (pushToken) await unregisterPushTokenAsync(pushToken);
      await AsyncStorage.multiRemove([TOKEN_STORAGE_KEY, USER_STORAGE_KEY]);
    } finally {
      setToken(null);
      setUser(null);
    }
  }, []);

  // Admin access is determined exclusively by the role returned by the backend.
  // Never grant admin privileges from a client-side email check.
  const isAdmin = user?.role === 'admin';

  const session = token && user ? { access_token: token, user } : null;

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        profile: user,
        session,
        isAdmin,
        loading,
        signUp,
        signIn,
        loginWithToken,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
