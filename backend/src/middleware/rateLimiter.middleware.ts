import rateLimit, { type Options } from 'express-rate-limit';
import { env } from '../config/env';
import { rateLimitKey } from '../utils/clientIp';

function limiter(windowMs: number, max: number, message: string): ReturnType<typeof rateLimit> {
  const options: Partial<Options> = {
    windowMs,
    // Limits are relaxed in development so testing the UI is not painful.
    limit: env.isProduction ? max : max * 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, code: 'TOO_MANY_REQUESTS', message },
    // The default generator keys on `req.ip`, which behind Azure App Service
    // still carries the client's source port. That port changes on every
    // connection, so every request would open a bucket of its own and no limit
    // here would ever be reached. See utils/clientIp.
    keyGenerator: rateLimitKey,
  };
  return rateLimit(options);
}

/** Applied to every request. */
export const globalLimiter = limiter(
  15 * 60 * 1000,
  1000,
  'Too many requests. Please slow down and try again shortly.',
);

/** Login is the most attacked endpoint, so it gets the tightest budget. */
export const loginLimiter = limiter(
  15 * 60 * 1000,
  10,
  'Too many login attempts. Please wait a few minutes and try again.',
);

export const registerLimiter = limiter(
  60 * 60 * 1000,
  10,
  'Too many accounts created from this device. Please try again later.',
);

export const forgotPasswordLimiter = limiter(
  60 * 60 * 1000,
  5,
  'Too many password reset requests. Please try again later.',
);

export const resetPasswordLimiter = limiter(
  60 * 60 * 1000,
  10,
  'Too many reset attempts. Please request a new link.',
);

/**
 * The ABN lookup reaches out to a third party on the caller's behalf, so the
 * budget is the register's to protect, not ours. Generous enough to fill a form
 * and correct a typo, tight enough that nobody walks the whole register.
 */
export const abnLookupLimiter = limiter(
  15 * 60 * 1000,
  40,
  'Too many ABN lookups. Please wait a few minutes and try again.',
);

export const refreshLimiter = limiter(
  15 * 60 * 1000,
  60,
  'Too many session refreshes. Please log in again.',
);
