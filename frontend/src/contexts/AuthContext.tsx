import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import type { AuthState, AuthUser } from '../lib/auth/auth.types';
import { authApiClientWithEvents } from '../lib/auth/auth-security';

interface AuthContextValue extends AuthState {
  login: (accessToken: string, user: AuthUser) => void;
  completeMfaLogin: (accessToken: string, user: AuthUser) => void;
  logout: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  mfaSessionId: string | null;
  setMfaSessionId: (sessionId: string | null) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = 'qms-auth-storage';

function loadStoredState(): Partial<AuthState> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return {
      user: parsed.user || null,
      isAuthenticated: parsed.isAuthenticated || false,
    };
  } catch {
    return {};
  }
}

function saveStoredState(state: AuthState & { mfaSessionId?: string | null }) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        mfaSessionId: state.mfaSessionId,
      })
    );
  } catch {
    // ignore storage errors
  }
}

interface AuthProviderProps {
  children: ReactNode;
  initialState?: Partial<AuthContextValue>;
}

export function AuthProvider({ children, initialState }: AuthProviderProps) {
  const stored = loadStoredState();
  const [user, setUser] = useState<AuthUser | null>(initialState?.user ?? stored.user ?? null);
  const [accessToken, setAccessToken] = useState<string | null>(initialState?.accessToken ?? stored.accessToken ?? null);
  const [isAuthenticated, setIsAuthenticated] = useState(initialState?.isAuthenticated ?? stored.isAuthenticated ?? false);
  const [isLoading, setIsLoading] = useState(initialState?.isLoading ?? false);
  const [error, setError] = useState<string | null>(initialState?.error ?? null);
  const [mfaSessionId, setMfaSessionId] = useState<string | null>(initialState?.mfaSessionId ?? stored.mfaSessionId ?? null);

  useEffect(() => {
    saveStoredState({ user, accessToken, isAuthenticated, isLoading, error, mfaSessionId });
  }, [user, accessToken, isAuthenticated, isLoading, error, mfaSessionId]);

  useEffect(() => {
    let cancelled = false;
    if (isAuthenticated && !accessToken && !isLoading) {
      setIsLoading(true);
      authApiClientWithEvents.refresh()
        .then((response) => {
          if (cancelled) return;
          const newAccessToken = response.data.accessToken;
          authApiClientWithEvents.setAccessToken(newAccessToken);
          setAccessToken(newAccessToken);
          setIsLoading(false);
        })
        .catch(() => {
          if (cancelled) return;
          setIsAuthenticated(false);
          setUser(null);
          setAccessToken(null);
          setIsLoading(false);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, accessToken, isLoading]);

  const login = useCallback((newAccessToken: string, newUser: AuthUser) => {
    authApiClientWithEvents.setAccessToken(newAccessToken);
    setAccessToken(newAccessToken);
    setUser(newUser);
    setIsAuthenticated(true);
    setIsLoading(false);
    setError(null);
    setMfaSessionId(null);
  }, []);

  const completeMfaLogin = useCallback((newAccessToken: string, newUser: AuthUser) => {
    authApiClientWithEvents.setAccessToken(newAccessToken);
    setAccessToken(newAccessToken);
    setUser(newUser);
    setIsAuthenticated(true);
    setIsLoading(false);
    setError(null);
    setMfaSessionId(null);
  }, []);

  const logout = useCallback(async () => {
    await authApiClientWithEvents.logout();
    authApiClientWithEvents.setAccessToken(null);
    setUser(null);
    setAccessToken(null);
    setIsAuthenticated(false);
    setIsLoading(false);
    setError(null);
    setMfaSessionId(null);
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  const setErrorState = useCallback((err: string | null) => {
    setError(err);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = useMemo(() => ({
    user,
    accessToken,
    isAuthenticated,
    isLoading,
    error,
    login,
    completeMfaLogin,
    logout,
    setLoading,
    setError: setErrorState,
    clearError,
    mfaSessionId,
    setMfaSessionId,
  }), [user, accessToken, isAuthenticated, isLoading, error, login, completeMfaLogin, logout, setLoading, setErrorState, clearError, mfaSessionId]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth<T = AuthContextValue>(selector?: (state: AuthContextValue) => T): T {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  if (!selector) {
    return context as T;
  }
  return selector(context);
}
