import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { exchangeCodeAsync } from 'expo-auth-session';
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
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  bio?: string;
  profile_completed?: boolean;
}

interface AuthContextValue {
  token: string | null;
  user: AppUser | null;
  profile: AppUser | null; // Compatibility with existing screens
  session: { access_token: string; user: AppUser } | null; // Compatibility
  isAdmin: boolean;
  loading: boolean;
  needsProfileSetup: boolean;
  completeProfileSetup: (updates: Partial<AppUser>) => Promise<void>;
  dismissProfileSetup: () => void;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  loginWithToken: (token: string, user: AppUser) => Promise<void>;
  updateUser: (updates: Partial<AppUser>) => Promise<void>;
  refreshUser: () => Promise<AppUser | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function isProfileComplete(u: AppUser | null): boolean {
  if (!u) return true;
  if (u.role === 'admin') return true;
  if (u.profile_completed === true) return true;
  return Boolean(u.full_name && u.full_name.trim().length > 0 && u.phone && u.phone.trim().length > 0);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false);

  const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() || 'disabled';
  const googleAndroidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim() || 'disabled';
  const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() || 'disabled';

  const googleConfigured =
    Platform.OS === 'android'
      ? googleAndroidClientId !== 'disabled'
      : Platform.OS === 'ios'
        ? googleIosClientId !== 'disabled'
        : googleWebClientId !== 'disabled';

  const [googleRequest, googleResponse, promptGoogleAsync] = Google.useIdTokenAuthRequest({
    clientId: googleWebClientId,
    webClientId: googleWebClientId,
    androidClientId: googleAndroidClientId !== 'disabled' ? googleAndroidClientId : undefined,
    iosClientId: googleIosClientId !== 'disabled' ? googleIosClientId : undefined,
    scopes: ['openid', 'profile', 'email'],
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
          let resolvedUser: AppUser | null = null;
          if (storedUserJson) {
            try {
              resolvedUser = JSON.parse(storedUserJson);
              if (isMounted) setUser(resolvedUser);
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
              resolvedUser = json.data;
              setUser(json.data);
              await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(json.data));
            } else if (res.status === 401) {
              // Token expired
              await AsyncStorage.multiRemove([TOKEN_STORAGE_KEY, USER_STORAGE_KEY]);
              if (isMounted) {
                setToken(null);
                setUser(null);
                setNeedsProfileSetup(false);
              }
            }
          } catch (fetchErr) {
            console.warn('[Auth] Could not verify session with server, keeping cached user:', fetchErr);
          }

          if (isMounted && resolvedUser && !isProfileComplete(resolvedUser)) {
            setNeedsProfileSetup(true);
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
      setNeedsProfileSetup(!isProfileComplete(receivedUser));

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
      // New user registration always triggers profile setup flow
      setNeedsProfileSetup(true);

      await AsyncStorage.setItem(TOKEN_STORAGE_KEY, receivedToken);
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(receivedUser));
      registerPushTokenInBackground();

      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Network connection failed' };
    }
  }, []);

  const loginWithToken = useCallback(async (receivedToken: string, receivedUser: AppUser) => {
    setToken(receivedToken);
    setUser(receivedUser);
    setNeedsProfileSetup(!isProfileComplete(receivedUser));
    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, receivedToken);
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(receivedUser));
    registerPushTokenInBackground();
  }, []);

  const loginWithGoogleTokens = useCallback(async (idToken?: string, accessToken?: string) => {
    const apiUrl = getApiBaseUrl();
    const response = await fetch(`${apiUrl}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, accessToken }),
    });

    const json = await response.json();
    if (!response.ok || !json.success) {
      throw new Error(json.error?.message || 'Google sign-in could not be completed.');
    }

    await loginWithToken(json.data.token, json.data.user);
    return json.data;
  }, [loginWithToken]);

  // Handle deep-link or background response from Google OAuth provider
  useEffect(() => {
    if (googleResponse?.type === 'success') {
      const idToken = googleResponse.params?.id_token || (googleResponse as any).authentication?.idToken;
      const accessToken = googleResponse.params?.access_token || (googleResponse as any).authentication?.accessToken;
      if ((idToken || accessToken) && !user) {
        loginWithGoogleTokens(idToken, accessToken).catch((err) => {
          console.warn('[Auth] Background Google sign-in failed:', err);
        });
      }
    }
  }, [googleResponse, user, loginWithGoogleTokens]);

  const signInWithGoogle = useCallback(async () => {
    if (!googleConfigured) return { error: 'Google sign-in is not configured for this app build.' };
    if (!googleRequest) return { error: 'Google authentication is initializing. Please try again in a moment.' };
    try {
      const result = await promptGoogleAsync();
      console.log('[Auth] Google prompt result:', result);

      if (result?.type !== 'success') {
        if (result?.type === 'cancel' || result?.type === 'dismiss') {
          if (Platform.OS === 'web') {
            console.warn(
              '[Auth] Google sign-in was dismissed/cancelled. If Google showed "Error 400: redirect_uri_mismatch", add http://localhost:8081 to Authorized redirect URIs in Google Cloud Console for Client ID: ' +
                googleWebClientId
            );
          }
          return { error: 'Google sign-in was cancelled.' };
        }
        const anyResult = result as any;
        const errorDetail =
          anyResult?.params?.error_description ||
          anyResult?.params?.error ||
          anyResult?.error?.message ||
          'Google sign-in was not completed.';
        return { error: errorDetail };
      }

      let idToken = result.params?.id_token || (result as any).authentication?.idToken;
      let accessToken = result.params?.access_token || (result as any).authentication?.accessToken;

      // If an authorization code was returned instead of tokens, perform PKCE code exchange
      if (!idToken && !accessToken && result.params?.code) {
        try {
          const activeClientId =
            Platform.OS === 'android' && googleAndroidClientId !== 'disabled'
              ? googleAndroidClientId
              : Platform.OS === 'ios' && googleIosClientId !== 'disabled'
                ? googleIosClientId
                : googleWebClientId;

          const tokenResponse = await exchangeCodeAsync(
            {
              clientId: activeClientId,
              code: result.params.code,
              redirectUri: googleRequest.redirectUri,
              extraParams: {
                code_verifier: googleRequest.codeVerifier || '',
              },
            },
            Google.discovery
          );
          idToken = tokenResponse.idToken;
          accessToken = tokenResponse.accessToken;
        } catch (exchangeErr: any) {
          console.warn('[Auth] Code exchange error:', exchangeErr);
        }
      }

      // If still not resolved directly, check if the response hook received the tokens
      if (!idToken && !accessToken && googleResponse?.type === 'success') {
        idToken = googleResponse.params?.id_token || (googleResponse as any).authentication?.idToken;
        accessToken = googleResponse.params?.access_token || (googleResponse as any).authentication?.accessToken;
      }

      if (!idToken && !accessToken) {
        return { error: 'Google did not return a valid authentication token. Please verify Google Cloud OAuth credentials.' };
      }

      await loginWithGoogleTokens(idToken, accessToken);
      return { error: null };
    } catch (err: any) {
      console.error('[Auth] Google sign-in failed:', err);
      return { error: err?.message || 'Unable to complete Google sign-in.' };
    }
  }, [googleConfigured, googleRequest, promptGoogleAsync, googleAndroidClientId, googleIosClientId, googleWebClientId, googleResponse, loginWithGoogleTokens]);

  const updateUser = useCallback(async (updates: Partial<AppUser>) => {
    setUser((prev) => {
      if (!prev) return null;
      const next = { ...prev, ...updates };
      AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const completeProfileSetup = useCallback(async (updates: Partial<AppUser>) => {
    setUser((prev) => {
      if (!prev) return null;
      const next: AppUser = { ...prev, ...updates, profile_completed: true };
      AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
    setNeedsProfileSetup(false);
  }, []);

  const dismissProfileSetup = useCallback(() => {
    setNeedsProfileSetup(false);
  }, []);

  const refreshUser = useCallback(async (): Promise<AppUser | null> => {
    try {
      const storedToken = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
      if (!storedToken) return null;
      const res = await fetch(`${getApiBaseUrl()}/auth/me`, {
        headers: { Authorization: `Bearer ${storedToken}` },
      });
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setUser(json.data);
        await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(json.data));
        return json.data;
      }
    } catch (err) {
      console.warn('[Auth] refreshUser failed:', err);
    }
    return null;
  }, []);

  const signOut = useCallback(async () => {
    try {
      const pushToken = await getStoredPushTokenAsync();
      if (pushToken) await unregisterPushTokenAsync(pushToken);
    } catch (pushErr) {
      console.warn('[Auth] Push token unregister error:', pushErr);
    }

    try {
      await AsyncStorage.multiRemove([TOKEN_STORAGE_KEY, USER_STORAGE_KEY]);
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        window.localStorage.removeItem(USER_STORAGE_KEY);
      }
    } catch (storageErr) {
      console.warn('[Auth] Storage clear error:', storageErr);
    } finally {
      setToken(null);
      setUser(null);
      setNeedsProfileSetup(false);
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
        needsProfileSetup,
        completeProfileSetup,
        dismissProfileSetup,
        signUp,
        signIn,
        signInWithGoogle,
        loginWithToken,
        updateUser,
        refreshUser,
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
