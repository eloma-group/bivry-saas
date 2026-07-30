import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";
import { sessionStore } from "./session";
import type { ApiFailure, ApiFieldError, AuthPayload } from "@/types/auth";

function resolveBaseUrl(): string {
  const configured = import.meta.env.VITE_API_URL;
  if (configured) return configured;

  const { hostname } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://localhost:5000/api";
  }
  // Deployed behind the same host as the frontend.
  return "/api";
}

export const API_BASE_URL = resolveBaseUrl();

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  // Needed for the httpOnly refresh cookie the backend sets per portal.
  withCredentials: true,
  timeout: 30000,
});

/** Normalised error the UI can render without knowing about axios. */
export class ApiRequestError extends Error {
  readonly code: string;
  readonly status: number;
  readonly fieldErrors: ApiFieldError[];

  constructor(message: string, code: string, status: number, fieldErrors: ApiFieldError[] = []) {
    super(message);
    this.name = "ApiRequestError";
    this.code = code;
    this.status = status;
    this.fieldErrors = fieldErrors;
  }

  /** Field name to message, ready to feed into react-hook-form. */
  get fieldMap(): Record<string, string> {
    return Object.fromEntries(this.fieldErrors.map((item) => [item.field, item.message]));
  }
}

function toApiError(error: unknown): ApiRequestError {
  if (error instanceof AxiosError) {
    const body = error.response?.data as ApiFailure | undefined;
    if (body?.message) {
      return new ApiRequestError(
        body.message,
        body.code ?? "ERROR",
        error.response?.status ?? 0,
        body.errors ?? [],
      );
    }
    if (error.code === "ECONNABORTED") {
      return new ApiRequestError("The request timed out. Please try again.", "TIMEOUT", 0);
    }
    if (!error.response) {
      return new ApiRequestError(
        "Cannot reach the server. Check your connection and try again.",
        "NETWORK_ERROR",
        0,
      );
    }
    return new ApiRequestError(error.message, "ERROR", error.response.status);
  }

  return new ApiRequestError("Something went wrong. Please try again.", "UNKNOWN", 0);
}

// ---------------------------------------------------------------------------
// Request: attach the access token
// ---------------------------------------------------------------------------

api.interceptors.request.use((config) => {
  const token = sessionStore.getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ---------------------------------------------------------------------------
// Response: refresh an expired access token exactly once, then retry
// ---------------------------------------------------------------------------

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

let refreshInFlight: Promise<string> | null = null;

/** Called when the session cannot be recovered, so the app can redirect. */
let onSessionExpired: (() => void) | null = null;

export function setSessionExpiredHandler(handler: () => void): void {
  onSessionExpired = handler;
}

async function refreshAccessToken(): Promise<string> {
  const session = sessionStore.read();
  if (!session) throw new ApiRequestError("Not signed in", "NO_SESSION", 401);

  // The refresh endpoint is namespaced by portal, so the rotated token stays
  // bound to the role that issued it.
  const response = await axios.post<{ data: AuthPayload }>(
    `${API_BASE_URL}/auth/${session.role}/refresh`,
    { refreshToken: session.refreshToken },
    { withCredentials: true, headers: { "Content-Type": "application/json" } },
  );

  const { accessToken, refreshToken, user } = response.data.data;
  sessionStore.write({ role: session.role, user, accessToken, refreshToken });
  return accessToken;
}

api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!(error instanceof AxiosError) || !error.config) {
      return Promise.reject(toApiError(error));
    }

    const config = error.config as RetriableConfig;
    const status = error.response?.status;
    const code = (error.response?.data as ApiFailure | undefined)?.code;
    const isRefreshCall = config.url?.includes("/refresh");

    const shouldRefresh =
      status === 401 &&
      !config._retried &&
      !isRefreshCall &&
      code !== "INVALID_CREDENTIALS" &&
      sessionStore.read() !== null;

    if (!shouldRefresh) {
      if (status === 401 && !isRefreshCall && sessionStore.read()) {
        sessionStore.clear();
        onSessionExpired?.();
      }
      return Promise.reject(toApiError(error));
    }

    config._retried = true;

    try {
      // Parallel 401s share one refresh call instead of racing each other.
      refreshInFlight = refreshInFlight ?? refreshAccessToken();
      const accessToken = await refreshInFlight;
      config.headers.Authorization = `Bearer ${accessToken}`;
      return await api.request(config);
    } catch (refreshError) {
      sessionStore.clear();
      onSessionExpired?.();
      return Promise.reject(toApiError(refreshError));
    } finally {
      refreshInFlight = null;
    }
  },
);

/** Unwraps the `{ success, message, data }` envelope. */
export async function request<T>(config: Parameters<AxiosInstance["request"]>[0]): Promise<T> {
  const response = await api.request<{ data: T }>(config);
  return response.data.data;
}
