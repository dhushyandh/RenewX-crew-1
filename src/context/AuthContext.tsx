import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

const API_BASE = 'http://localhost:5000/api';
const TOKEN_STORAGE_KEY = 'renewx_auth_token';
const USER_STORAGE_KEY = 'renewx_auth_user';

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
  profile: AppUser | null;
  session: { access_token: string; user: AppUser } | null;
  isAdmin: boolean;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage on boot
  useEffect(() => {
    async function restoreSession() {
      try {
        const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
        const storedUserJson = localStorage.getItem(USER_STORAGE_KEY);

        if (storedToken) {
          setToken(storedToken);
          if (storedUserJson) {
            try {
              setUser(JSON.parse(storedUserJson));
            } catch {
              // Ignore JSON parse error
            }
          }

          // Verify token with backend
          try {
            const res = await fetch(`${API_BASE}/auth/me`, {
              headers: { Authorization: `Bearer ${storedToken}` },
            });
            const json = await res.json();
            if (json.success && json.data) {
              setUser(json.data);
              localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(json.data));
            } else if (res.status === 401) {
              localStorage.removeItem(TOKEN_STORAGE_KEY);
              localStorage.removeItem(USER_STORAGE_KEY);
              setToken(null);
              setUser(null);
            }
          } catch (fetchErr) {
            console.warn('[Auth Web] Could not verify session with server:', fetchErr);
          }
        }
      } catch (err) {
        console.error('[Auth Web] Failed to restore session:', err);
      } finally {
        setLoading(false);
      }
    }

    restoreSession();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
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

      localStorage.setItem(TOKEN_STORAGE_KEY, receivedToken);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(receivedUser));

      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Network connection failed' };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName?: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
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

      localStorage.setItem(TOKEN_STORAGE_KEY, receivedToken);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(receivedUser));

      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Network connection failed' };
    }
  }, []);

  const signOut = useCallback(async () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const isAdmin = Boolean(
    user?.role === 'admin' ||
    (user?.email && user.email.toLowerCase() === 'dhushyandhneduncheziyan4896@gmail.com')
  );

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
