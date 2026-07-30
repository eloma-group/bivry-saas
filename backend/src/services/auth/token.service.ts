import crypto from 'crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { ApiError } from '../../utils/apiError';
import { expiryDateFrom } from '../../utils/duration';
import { hashToken } from './password.service';
import type {
  AccessTokenPayload,
  RefreshTokenPayload,
  RoleDefinition,
} from '../../types/auth.types';

const ACCESS_FALLBACK_MS = 15 * 60 * 1000;
const REFRESH_FALLBACK_MS = 7 * 24 * 60 * 60 * 1000;

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
}

export interface SessionContext {
  ipAddress?: string | null;
  userAgent?: string | null;
}

function signAccessToken(role: RoleDefinition, accountId: string): string {
  const payload: AccessTokenPayload = {
    sub: accountId,
    role: role.slug,
    actorType: role.actorType,
    type: 'access',
  };
  return jwt.sign(payload, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpiresIn,
  } as SignOptions);
}

function signRefreshToken(role: RoleDefinition, accountId: string, jti: string): string {
  const payload: RefreshTokenPayload = {
    sub: accountId,
    role: role.slug,
    actorType: role.actorType,
    type: 'refresh',
    jti,
  };
  return jwt.sign(payload, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiresIn,
  } as SignOptions);
}

/** Issues a fresh access + refresh pair and records the refresh session. */
export async function issueTokens(
  role: RoleDefinition,
  accountId: string,
  context: SessionContext = {},
): Promise<IssuedTokens> {
  const jti = crypto.randomUUID();
  const accessToken = signAccessToken(role, accountId);
  const refreshToken = signRefreshToken(role, accountId, jti);

  const accessTokenExpiresAt = expiryDateFrom(env.jwt.accessExpiresIn, ACCESS_FALLBACK_MS);
  const refreshTokenExpiresAt = expiryDateFrom(env.jwt.refreshExpiresIn, REFRESH_FALLBACK_MS);

  await prisma.refreshToken.create({
    data: {
      id: jti,
      actorType: role.actorType,
      actorId: accountId,
      tokenHash: hashToken(refreshToken),
      expiresAt: refreshTokenExpiresAt,
      ipAddress: context.ipAddress ?? null,
      userAgent: context.userAgent ?? null,
    },
  });

  return { accessToken, refreshToken, accessTokenExpiresAt, refreshTokenExpiresAt };
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const payload = jwt.verify(token, env.jwt.accessSecret) as AccessTokenPayload;
    if (payload.type !== 'access') {
      throw ApiError.unauthorized('Invalid token', 'INVALID_TOKEN');
    }
    return payload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw ApiError.unauthorized('Session expired, please log in again', 'TOKEN_EXPIRED');
    }
    if (error instanceof ApiError) throw error;
    throw ApiError.unauthorized('Invalid token', 'INVALID_TOKEN');
  }
}

/**
 * Validates a refresh token against the stored session. The token must decode,
 * its session row must exist, match the stored hash, and be neither revoked nor
 * expired. Anything else is treated as a replay attempt.
 */
export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
  let payload: RefreshTokenPayload;
  try {
    payload = jwt.verify(token, env.jwt.refreshSecret) as RefreshTokenPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw ApiError.unauthorized('Session expired, please log in again', 'TOKEN_EXPIRED');
    }
    throw ApiError.unauthorized('Invalid refresh token', 'INVALID_REFRESH_TOKEN');
  }

  if (payload.type !== 'refresh') {
    throw ApiError.unauthorized('Invalid refresh token', 'INVALID_REFRESH_TOKEN');
  }

  const session = await prisma.refreshToken.findUnique({ where: { id: payload.jti } });

  if (!session || session.tokenHash !== hashToken(token)) {
    throw ApiError.unauthorized('Invalid refresh token', 'INVALID_REFRESH_TOKEN');
  }
  if (session.revokedAt) {
    // The same token was already exchanged. Drop every session for this actor.
    await revokeAllSessions(session.actorType, session.actorId);
    throw ApiError.unauthorized('Session is no longer valid, please log in again', 'TOKEN_REUSED');
  }
  if (session.expiresAt.getTime() <= Date.now()) {
    throw ApiError.unauthorized('Session expired, please log in again', 'TOKEN_EXPIRED');
  }
  if (session.actorType !== payload.actorType || session.actorId !== payload.sub) {
    throw ApiError.unauthorized('Invalid refresh token', 'INVALID_REFRESH_TOKEN');
  }

  return payload;
}

export async function revokeSession(jti: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { id: jti, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllSessions(
  actorType: RoleDefinition['actorType'],
  actorId: string,
): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { actorType, actorId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Revokes the presented session and issues a new pair (refresh rotation). */
export async function rotateTokens(
  role: RoleDefinition,
  payload: RefreshTokenPayload,
  context: SessionContext = {},
): Promise<IssuedTokens> {
  await revokeSession(payload.jti);
  return issueTokens(role, payload.sub, context);
}
