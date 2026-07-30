import type { Request, RequestHandler, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendCreated, sendSuccess } from '../../utils/apiResponse';
import { ApiError } from '../../utils/apiError';
import { env } from '../../config/env';
import * as authService from '../../services/auth/auth.service';
import type { IssuedTokens, SessionContext } from '../../services/auth/token.service';
import type { RoleDefinition } from '../../types/auth.types';

export interface AuthController {
  register: RequestHandler;
  login: RequestHandler;
  refresh: RequestHandler;
  logout: RequestHandler;
  logoutAll: RequestHandler;
  me: RequestHandler;
  forgotPassword: RequestHandler;
  verifyResetToken: RequestHandler;
  resetPassword: RequestHandler;
  changePassword: RequestHandler;
}

/**
 * Each portal keeps its own refresh cookie, so a person can be signed in as an
 * admin in one tab and as a driver in another without the sessions colliding.
 */
function cookieName(role: RoleDefinition): string {
  return `bivry_${role.slug}_refresh`;
}

function sessionContext(req: Request): SessionContext {
  return { ipAddress: req.ip ?? null, userAgent: req.get('user-agent') ?? null };
}

/**
 * In production the Static Web App and the App Service live on different
 * domains, so the refresh cookie has to be `SameSite=None; Secure` to be sent
 * at all. Locally both run on localhost, where `lax` works and `none` would be
 * rejected for not being secure.
 */
const refreshCookieOptions = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: env.isProduction ? ('none' as const) : ('lax' as const),
};

function setRefreshCookie(res: Response, role: RoleDefinition, tokens: IssuedTokens): void {
  res.cookie(cookieName(role), tokens.refreshToken, {
    ...refreshCookieOptions,
    path: `/api/auth/${role.slug}`,
    expires: tokens.refreshTokenExpiresAt,
  });
}

function clearRefreshCookie(res: Response, role: RoleDefinition): void {
  // The options must match the ones the cookie was set with or the browser
  // keeps it.
  res.clearCookie(cookieName(role), {
    ...refreshCookieOptions,
    path: `/api/auth/${role.slug}`,
  });
}

/** Reads the refresh token from the body first, then the portal cookie. */
function readRefreshToken(req: Request, role: RoleDefinition): string | undefined {
  const fromBody = (req.body as { refreshToken?: string } | undefined)?.refreshToken;
  if (fromBody) return fromBody;
  const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
  return cookies?.[cookieName(role)];
}

/**
 * Builds the auth endpoints for one portal. The role is bound here, so a
 * handler mounted under `/api/auth/driver` can only ever touch the drivers
 * table no matter what the request body claims.
 */
export function createAuthController(role: RoleDefinition): AuthController {
  return {
    register: asyncHandler(async (req, res) => {
      const result = await authService.register(role, req.body, sessionContext(req));
      setRefreshCookie(res, role, result.tokens);
      sendCreated(
        res,
        {
          user: result.user,
          accessToken: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken,
          expiresAt: result.tokens.accessTokenExpiresAt,
        },
        `${role.label} account created`,
      );
    }),

    login: asyncHandler(async (req, res) => {
      const { email, password } = req.body as { email: string; password: string };
      const result = await authService.login(role, email, password, sessionContext(req));
      setRefreshCookie(res, role, result.tokens);
      sendSuccess(
        res,
        {
          user: result.user,
          accessToken: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken,
          expiresAt: result.tokens.accessTokenExpiresAt,
        },
        `Welcome back, ${result.user.displayName}`,
      );
    }),

    refresh: asyncHandler(async (req, res) => {
      const token = readRefreshToken(req, role);
      if (!token) {
        throw ApiError.unauthorized('No session to refresh', 'NO_REFRESH_TOKEN');
      }
      const result = await authService.refresh(role, token, sessionContext(req));
      setRefreshCookie(res, role, result.tokens);
      sendSuccess(
        res,
        {
          user: result.user,
          accessToken: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken,
          expiresAt: result.tokens.accessTokenExpiresAt,
        },
        'Session refreshed',
      );
    }),

    logout: asyncHandler(async (req, res) => {
      await authService.logout(role, readRefreshToken(req, role));
      clearRefreshCookie(res, role);
      sendSuccess(res, null, 'Logged out');
    }),

    logoutAll: asyncHandler(async (req, res) => {
      await authService.logoutAll(role, req.auth!.id);
      clearRefreshCookie(res, role);
      sendSuccess(res, null, 'Logged out of all devices');
    }),

    me: asyncHandler(async (req, res) => {
      const user = await authService.getProfile(role, req.auth!.id);
      sendSuccess(res, { user }, 'Profile loaded');
    }),

    forgotPassword: asyncHandler(async (req, res) => {
      const { email } = req.body as { email: string };
      await authService.forgotPassword(role, email, req.ip ?? null);
      // Deliberately identical whether or not the account exists.
      sendSuccess(
        res,
        null,
        'If an account exists for that email, a reset link is on its way.',
      );
    }),

    verifyResetToken: asyncHandler(async (req, res) => {
      const token = String(req.query.token ?? '');
      const valid = await authService.verifyResetToken(role, token);
      sendSuccess(res, { valid }, valid ? 'Reset link is valid' : 'Reset link is not valid');
    }),

    resetPassword: asyncHandler(async (req, res) => {
      const { token, password } = req.body as { token: string; password: string };
      await authService.resetPassword(role, token, password);
      clearRefreshCookie(res, role);
      sendSuccess(res, null, 'Password updated. You can now log in.');
    }),

    changePassword: asyncHandler(async (req, res) => {
      const { currentPassword, password } = req.body as {
        currentPassword: string;
        password: string;
      };
      await authService.changePassword(role, req.auth!.id, currentPassword, password);
      clearRefreshCookie(res, role);
      sendSuccess(res, null, 'Password changed. Please log in again.');
    }),
  };
}
