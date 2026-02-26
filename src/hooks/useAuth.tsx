import { useState, useEffect, createContext, useContext, useCallback, ReactNode } from 'react';
import { setAuthTokenGetter } from '@/api/client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface AuthUser {
  id: string;
  email: string;
}

interface AuthContextType {
  user: AuthUser | null;
  session: { access_token: string } | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null; token?: string; user?: AuthUser }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const STORAGE_KEY = 'yaatra_auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const persist = useCallback((u: AuthUser | null, t: string | null) => {
    setUser(u);
    setToken(t);
    try {
      if (u && t) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: u, token: t }));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const { user: u, token: t } = JSON.parse(raw);
        if (u?.id && u?.email && t) {
          setUser(u);
          setToken(t);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (_) {
      localStorage.removeItem(STORAGE_KEY);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    setAuthTokenGetter(() => {
      if (token) return token;
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const { token: t } = JSON.parse(raw);
          return t || null;
        }
      } catch (_) {}
      return null;
    });
  }, [token]);

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const res = await fetch(`${API_URL.replace(/\/$/, '')}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name: fullName }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { error: new Error(data?.error || res.statusText) };
      }
      persist(data.user, data.token);
      return { error: null, token: data.token, user: data.user };
    } catch (e) {
      return { error: e instanceof Error ? e : new Error('Sign up failed') };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const res = await fetch(`${API_URL.replace(/\/$/, '')}/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { error: new Error(data?.error || res.statusText) };
      }
      persist(data.user, data.token);
      return { error: null };
    } catch (e) {
      return { error: e instanceof Error ? e : new Error('Sign in failed') };
    }
  };

  const signInWithGoogle = async () => {
    return { error: new Error('Google sign-in: configure backend OAuth and redirect to backend URL') };
  };

  const signOut = async () => {
    persist(null, null);
  };

  const session = token ? { access_token: token } : null;

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
