import { api, request } from "./api";
import { sessionStore } from "./session";
import type {
  AuthPayload,
  AuthSession,
  AuthUser,
  LoginCredentials,
  RoleSlug,
} from "@/types/auth";

/**
 * Every call is namespaced by the portal the user is on. The role is part of
 * the URL, never part of the payload, so the browser cannot ask the backend to
 * authenticate it against a different table.
 */
function base(role: RoleSlug): string {
  return `/auth/${role}`;
}

function persist(role: RoleSlug, payload: AuthPayload): AuthSession {
  const session: AuthSession = {
    role,
    user: payload.user,
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
  };
  sessionStore.write(session);
  return session;
}

export const authService = {
  async login(role: RoleSlug, credentials: LoginCredentials): Promise<AuthSession> {
    const payload = await request<AuthPayload>({
      url: `${base(role)}/login`,
      method: "POST",
      data: credentials,
    });
    return persist(role, payload);
  },

  async register(role: RoleSlug, values: Record<string, unknown>): Promise<AuthSession> {
    const payload = await request<AuthPayload>({
      url: `${base(role)}/register`,
      method: "POST",
      data: values,
    });
    return persist(role, payload);
  },

  async me(role: RoleSlug): Promise<AuthUser> {
    const data = await request<{ user: AuthUser }>({ url: `${base(role)}/me`, method: "GET" });
    sessionStore.updateUser(data.user);
    return data.user;
  },

  async logout(role: RoleSlug): Promise<void> {
    const refreshToken = sessionStore.read()?.refreshToken;
    try {
      await api.post(`${base(role)}/logout`, { refreshToken });
    } finally {
      // The local session goes away even if the server call fails.
      sessionStore.clear();
    }
  },

  async forgotPassword(role: RoleSlug, email: string): Promise<string> {
    const response = await api.post<{ message: string }>(`${base(role)}/forgot-password`, {
      email,
    });
    return response.data.message;
  },

  async verifyResetToken(role: RoleSlug, token: string): Promise<boolean> {
    const data = await request<{ valid: boolean }>({
      url: `${base(role)}/verify-reset-token`,
      method: "GET",
      params: { token },
    });
    return data.valid;
  },

  async resetPassword(
    role: RoleSlug,
    values: { token: string; password: string; confirmPassword: string },
  ): Promise<void> {
    await api.post(`${base(role)}/reset-password`, values);
  },

  async changePassword(
    role: RoleSlug,
    values: { currentPassword: string; password: string; confirmPassword: string },
  ): Promise<void> {
    await api.post(`${base(role)}/change-password`, values);
    sessionStore.clear();
  },
};
