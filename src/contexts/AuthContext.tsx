"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AUTH_STORAGE_KEY } from "@/lib/api/config";
import { setOnTokenExpired } from "@/lib/api/auth-events";
import { getMe, login as apiLogin } from "@/lib/api/auth";
import type { User } from "@/lib/api/types";

// ─── Tipos públicos ───────────────────────────────────────────────────────────

interface StoredAuth {
  user: User;
  accessToken: string;
  refreshToken: string;
}

interface AuthContextValue {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  /** true mientras valida el token inicial (boot) */
  initializing: boolean;
  /** true mientras hace refresh automático */
  refreshing: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

function readStoredAuth(): StoredAuth | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredAuth>;
    if (!parsed.user || !parsed.accessToken || !parsed.refreshToken) return null;
    return parsed as StoredAuth;
  } catch {
    return null;
  }
}

function writeStoredAuth(auth: StoredAuth): void {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
  } catch {
    // localStorage puede fallar en modo privado
  }
}

function clearStoredAuth(): void {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // localStorage puede fallar en modo privado
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Ref para evitar doble-boot en StrictMode
  const bootedRef = useRef(false);

  const logout = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    clearStoredAuth();
    // Redirigir al login sin usar router (evita dependencias de layout)
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }, []);

  // Boot: leer localStorage → validar con GET /auth/me
  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;

    const stored = readStoredAuth();
    if (!stored) {
      setInitializing(false);
      return;
    }

    // Hidratar estado con tokens guardados antes de validar
    setAccessToken(stored.accessToken);
    setRefreshToken(stored.refreshToken);
    setUser(stored.user);

    // Validar token con el servidor
    getMe(stored.accessToken)
      .then((freshUser) => {
        setUser(freshUser);
        writeStoredAuth({
          user: freshUser,
          accessToken: stored.accessToken,
          refreshToken: stored.refreshToken,
        });
      })
      .catch(() => {
        // El refresh interceptor en httpFetch ya manejó el 401;
        // si llegamos acá con otro error (red, etc.) dejamos los tokens
        // y el usuario puede seguir intentando.
      })
      .finally(() => {
        setInitializing(false);
      });
  }, []);

  // Registrar callback de expiración de token
  useEffect(() => {
    setOnTokenExpired(() => {
      logout();
    });
    return () => {
      setOnTokenExpired(null);
    };
  }, [logout]);

  const login = useCallback(async (identifier: string, password: string): Promise<void> => {
    const payload = await apiLogin({ identifier, password });
    const auth: StoredAuth = {
      user: payload.user,
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
    };
    writeStoredAuth(auth);
    setUser(payload.user);
    setAccessToken(payload.accessToken);
    setRefreshToken(payload.refreshToken);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      refreshToken,
      initializing,
      refreshing,
      login,
      logout,
    }),
    [user, accessToken, refreshToken, initializing, refreshing, login, logout]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  }
  return ctx;
}
