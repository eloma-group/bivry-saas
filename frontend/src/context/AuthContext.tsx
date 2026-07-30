import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { authService } from "@/services/authService";
import { sessionStore } from "@/services/session";
import { setSessionExpiredHandler } from "@/services/api";
import type { AuthSession, AuthUser, LoginCredentials, RoleSlug } from "@/types/auth";

interface AuthContextValue {
  session: AuthSession | null;
  user: AuthUser | null;
  role: RoleSlug | null;
  isAuthenticated: boolean;
  /** True while the stored session is being revalidated on first load. */
  isLoading: boolean;
  login: (role: RoleSlug, credentials: LoginCredentials) => Promise<AuthSession>;
  register: (role: RoleSlug, values: Record<string, unknown>) => Promise<AuthSession>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => sessionStore.read());
  const [isLoading, setIsLoading] = useState(() => sessionStore.read() !== null);

  // A refresh failure anywhere in the app drops the session here too.
  useEffect(() => {
    setSessionExpiredHandler(() => setSession(null));
  }, []);

  // Revalidate the stored session once on boot so a revoked or suspended
  // account does not keep seeing a signed in shell.
  useEffect(() => {
    const stored = sessionStore.read();
    if (!stored) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    authService
      .me(stored.role)
      .then((user) => {
        if (!cancelled) setSession({ ...stored, user });
      })
      .catch(() => {
        if (!cancelled) {
          sessionStore.clear();
          setSession(null);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Signing out in one tab signs out the others.
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key === "bivry.session") setSession(sessionStore.read());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const login = useCallback(async (role: RoleSlug, credentials: LoginCredentials) => {
    const next = await authService.login(role, credentials);
    setSession(next);
    return next;
  }, []);

  const register = useCallback(async (role: RoleSlug, values: Record<string, unknown>) => {
    const next = await authService.register(role, values);
    setSession(next);
    return next;
  }, []);

  const logout = useCallback(async () => {
    const current = sessionStore.read();
    if (current) await authService.logout(current.role);
    setSession(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const current = sessionStore.read();
    if (!current) return;
    const user = await authService.me(current.role);
    setSession({ ...current, user });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      role: session?.role ?? null,
      isAuthenticated: session !== null,
      isLoading,
      login,
      register,
      logout,
      refreshUser,
    }),
    [session, isLoading, login, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }
  return context;
}
