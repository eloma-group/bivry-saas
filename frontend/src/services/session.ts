import type { AuthSession, AuthUser, RoleSlug } from "@/types/auth";

const STORAGE_KEY = "bivry.session";

/**
 * The signed in session, kept in localStorage so a refresh does not log the
 * user out. Only one portal is active per browser profile at a time: logging in
 * as a different role replaces the session.
 */
export const sessionStore = {
  read(): AuthSession | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as AuthSession;
      if (!parsed?.accessToken || !parsed?.user?.id) return null;
      return parsed;
    } catch {
      return null;
    }
  },

  write(session: AuthSession): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  },

  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  },

  getAccessToken(): string | null {
    return sessionStore.read()?.accessToken ?? null;
  },

  getRole(): RoleSlug | null {
    return sessionStore.read()?.role ?? null;
  },

  updateTokens(accessToken: string, refreshToken: string): void {
    const current = sessionStore.read();
    if (!current) return;
    sessionStore.write({ ...current, accessToken, refreshToken });
  },

  updateUser(user: AuthUser): void {
    const current = sessionStore.read();
    if (!current) return;
    sessionStore.write({ ...current, user });
  },
};
