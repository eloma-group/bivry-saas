/** URL slug of a login portal. Mirrors the backend role registry exactly. */
export type RoleSlug = "admin" | "customer" | "vendor" | "employee" | "driver";

export type AccountStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "DEACTIVATED";

export interface AuthUser {
  id: string;
  role: RoleSlug;
  email: string;
  phone: string | null;
  displayName: string;
  status: AccountStatus;
  emailVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  /** Role specific extras (firstName, companyName, onboardingStatus, ...). */
  [field: string]: unknown;
}

export interface AuthSession {
  role: RoleSlug;
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

/** Shape every backend endpoint replies with on success. */
export interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
}

export interface ApiFieldError {
  field: string;
  message: string;
}

/** Shape every backend endpoint replies with on failure. */
export interface ApiFailure {
  success: false;
  code: string;
  message: string;
  errors?: ApiFieldError[];
}

export interface AuthPayload {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}
