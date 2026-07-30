import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ApiError } from '../utils/apiError';
import { verifyAccessToken } from '../services/auth/token.service';
import type { RoleSlug } from '../types/auth.types';

function readBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}

/** Requires a valid access token. Populates `req.auth`. */
export const authenticate: RequestHandler = (req, _res, next) => {
  const token = readBearerToken(req);
  if (!token) {
    return next(ApiError.unauthorized('You are not logged in', 'NO_TOKEN'));
  }

  try {
    const payload = verifyAccessToken(token);
    req.auth = { id: payload.sub, role: payload.role, actorType: payload.actorType };
    return next();
  } catch (error) {
    return next(error);
  }
};

/**
 * Restricts a route to one or more roles. Combine with `authenticate`.
 * A driver token can never satisfy `requireRole('admin')` because the role is
 * baked into the signed token at login time by the portal that issued it.
 */
export function requireRole(...allowed: RoleSlug[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) {
      return next(ApiError.unauthorized('You are not logged in', 'NO_TOKEN'));
    }
    if (!allowed.includes(req.auth.role)) {
      return next(ApiError.forbidden('This area is not available for your account type'));
    }
    return next();
  };
}

/** Attaches `req.auth` when a token is present but never rejects the request. */
export const optionalAuthenticate: RequestHandler = (req, _res, next) => {
  const token = readBearerToken(req);
  if (!token) return next();

  try {
    const payload = verifyAccessToken(token);
    req.auth = { id: payload.sub, role: payload.role, actorType: payload.actorType };
  } catch {
    // Ignore a bad token on an optional route.
  }
  return next();
};
