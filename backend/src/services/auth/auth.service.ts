import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { ApiError } from '../../utils/apiError';
import { logger } from '../../utils/logger';
import { sendPasswordChangedEmail, sendPasswordResetEmail } from '../mail.service';
import {
  generateRawToken,
  hashPassword,
  hashToken,
  verifyPassword,
} from './password.service';
import {
  issueTokens,
  revokeAllSessions,
  revokeSession,
  rotateTokens,
  verifyRefreshToken,
  type IssuedTokens,
  type SessionContext,
} from './token.service';
import type {
  AuthAccount,
  PublicProfile,
  RoleDefinition,
} from '../../types/auth.types';

export interface AuthResult {
  user: PublicProfile;
  tokens: IssuedTokens;
}

function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Looks an account up in the table that belongs to `role` and nowhere else.
 * Soft deleted rows are invisible.
 */
async function findByEmail(role: RoleDefinition, email: string): Promise<AuthAccount | null> {
  return role.delegate.findFirst({
    where: { email: normaliseEmail(email), deletedAt: null },
  });
}

async function findById(role: RoleDefinition, id: string): Promise<AuthAccount | null> {
  return role.delegate.findFirst({ where: { id, deletedAt: null } });
}

async function recordAttempt(
  role: RoleDefinition,
  email: string,
  successful: boolean,
  reason: string | null,
  context: SessionContext,
): Promise<void> {
  try {
    await prisma.loginAttempt.create({
      data: {
        actorType: role.actorType,
        email: normaliseEmail(email),
        successful,
        reason,
        ipAddress: context.ipAddress ?? null,
        userAgent: context.userAgent ?? null,
      },
    });
  } catch (error) {
    // Auditing must never break a login.
    logger.warn('Could not record login attempt', error);
  }
}

function assertLoginable(account: AuthAccount, role: RoleDefinition): void {
  if (account.lockedUntil && account.lockedUntil.getTime() > Date.now()) {
    const minutes = Math.ceil((account.lockedUntil.getTime() - Date.now()) / 60000);
    throw new ApiError(
      423,
      `Account locked after too many failed attempts. Try again in ${minutes} minute(s).`,
      'ACCOUNT_LOCKED',
    );
  }

  if (account.status === 'SUSPENDED') {
    throw ApiError.forbidden(`This ${role.label.toLowerCase()} account is suspended.`);
  }
  if (account.status === 'DEACTIVATED') {
    throw ApiError.forbidden(`This ${role.label.toLowerCase()} account is no longer active.`);
  }
}

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------

export async function register(
  role: RoleDefinition,
  input: Record<string, unknown>,
  context: SessionContext = {},
): Promise<AuthResult> {
  if (!role.signupEnabled) {
    throw ApiError.forbidden(
      `${role.label} accounts are created by an administrator. Public signup is disabled.`,
    );
  }

  const email = normaliseEmail(String(input.email));
  const existing = await role.delegate.findUnique({ where: { email } });
  if (existing) {
    throw ApiError.conflict(`A ${role.label.toLowerCase()} account with this email already exists.`);
  }

  const passwordHash = await hashPassword(String(input.password));
  const account = await role.delegate.create({
    data: role.buildCreateData({ ...input, email }, passwordHash),
  });

  const tokens = await issueTokens(role, account.id, context);
  return { user: role.toPublicProfile(account), tokens };
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

export async function login(
  role: RoleDefinition,
  email: string,
  password: string,
  context: SessionContext = {},
): Promise<AuthResult> {
  const account = await findByEmail(role, email);

  // Same message for unknown email and wrong password, so the endpoint cannot
  // be used to discover which emails exist in which table.
  const invalidCredentials = ApiError.unauthorized(
    'Incorrect email or password',
    'INVALID_CREDENTIALS',
  );

  if (!account) {
    await recordAttempt(role, email, false, 'ACCOUNT_NOT_FOUND', context);
    throw invalidCredentials;
  }

  assertLoginable(account, role);

  const passwordMatches = await verifyPassword(password, account.passwordHash);

  if (!passwordMatches) {
    const attempts = account.failedLoginAttempts + 1;
    const shouldLock = attempts >= env.lockout.maxFailedAttempts;

    await role.delegate.update({
      where: { id: account.id },
      data: {
        failedLoginAttempts: attempts,
        lockedUntil: shouldLock
          ? new Date(Date.now() + env.lockout.lockMinutes * 60 * 1000)
          : null,
      },
    });

    await recordAttempt(role, email, false, 'WRONG_PASSWORD', context);

    if (shouldLock) {
      throw new ApiError(
        423,
        `Too many failed attempts. Account locked for ${env.lockout.lockMinutes} minutes.`,
        'ACCOUNT_LOCKED',
      );
    }
    throw invalidCredentials;
  }

  const updated = await role.delegate.update({
    where: { id: account.id },
    data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
  });

  await recordAttempt(role, email, true, null, context);

  const tokens = await issueTokens(role, updated.id, context);
  return { user: role.toPublicProfile(updated), tokens };
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

export async function refresh(
  role: RoleDefinition,
  refreshToken: string,
  context: SessionContext = {},
): Promise<AuthResult> {
  const payload = await verifyRefreshToken(refreshToken);

  // The portal the request came from must match the portal that issued the token.
  if (payload.actorType !== role.actorType) {
    throw ApiError.unauthorized('This session does not belong to this portal', 'ROLE_MISMATCH');
  }

  const account = await findById(role, payload.sub);
  if (!account) {
    throw ApiError.unauthorized('Account no longer exists', 'ACCOUNT_NOT_FOUND');
  }
  assertLoginable(account, role);

  const tokens = await rotateTokens(role, payload, context);
  return { user: role.toPublicProfile(account), tokens };
}

export async function logout(role: RoleDefinition, refreshToken?: string): Promise<void> {
  if (!refreshToken) return;
  try {
    const payload = await verifyRefreshToken(refreshToken);
    if (payload.actorType === role.actorType) {
      await revokeSession(payload.jti);
    }
  } catch {
    // A logout with an already invalid token is still a successful logout.
  }
}

export async function logoutAll(role: RoleDefinition, accountId: string): Promise<void> {
  await revokeAllSessions(role.actorType, accountId);
}

export async function getProfile(role: RoleDefinition, accountId: string): Promise<PublicProfile> {
  const account = await findById(role, accountId);
  if (!account) {
    throw ApiError.notFound('Account not found');
  }
  return role.toPublicProfile(account);
}

// ---------------------------------------------------------------------------
// Password reset
// ---------------------------------------------------------------------------

/**
 * Always resolves the same way whether or not the email exists, so the endpoint
 * cannot be used to enumerate accounts.
 */
export async function forgotPassword(
  role: RoleDefinition,
  email: string,
  ipAddress?: string | null,
): Promise<void> {
  const account = await findByEmail(role, email);
  if (!account) {
    logger.info(`Password reset requested for unknown ${role.slug}: ${normaliseEmail(email)}`);
    return;
  }

  // Only one live reset link per account.
  await prisma.passwordResetToken.updateMany({
    where: { actorType: role.actorType, actorId: account.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  const rawToken = generateRawToken();
  const ttlMinutes = env.passwordReset.ttlMinutes;

  await prisma.passwordResetToken.create({
    data: {
      actorType: role.actorType,
      actorId: account.id,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000),
      requestedIp: ipAddress ?? null,
    },
  });

  const resetUrl = `${env.frontendUrl}/${role.slug}/reset-password?token=${rawToken}`;

  await sendPasswordResetEmail({
    to: account.email,
    roleLabel: role.label,
    resetUrl,
    expiresInMinutes: ttlMinutes,
  });
}

export async function resetPassword(
  role: RoleDefinition,
  rawToken: string,
  newPassword: string,
): Promise<void> {
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
  });

  if (!record || record.actorType !== role.actorType) {
    throw ApiError.badRequest('This reset link is invalid or has already been used.');
  }
  if (record.usedAt) {
    throw ApiError.badRequest('This reset link has already been used.');
  }
  if (record.expiresAt.getTime() <= Date.now()) {
    throw ApiError.badRequest('This reset link has expired. Please request a new one.');
  }

  const account = await findById(role, record.actorId);
  if (!account) {
    throw ApiError.badRequest('This reset link is invalid or has already been used.');
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.passwordResetToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  await role.delegate.update({
    where: { id: account.id },
    data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null },
  });

  // A password change invalidates every existing session.
  await revokeAllSessions(role.actorType, account.id);

  await sendPasswordChangedEmail({ to: account.email, roleLabel: role.label });
}

export async function changePassword(
  role: RoleDefinition,
  accountId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const account = await findById(role, accountId);
  if (!account) {
    throw ApiError.notFound('Account not found');
  }

  const matches = await verifyPassword(currentPassword, account.passwordHash);
  if (!matches) {
    throw ApiError.badRequest('Your current password is incorrect.');
  }

  const passwordHash = await hashPassword(newPassword);
  await role.delegate.update({ where: { id: account.id }, data: { passwordHash } });

  await revokeAllSessions(role.actorType, account.id);

  await sendPasswordChangedEmail({ to: account.email, roleLabel: role.label });
}

/** Confirms a reset token is still usable, so the reset page can fail fast. */
export async function verifyResetToken(role: RoleDefinition, rawToken: string): Promise<boolean> {
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
  });

  return Boolean(
    record &&
      record.actorType === role.actorType &&
      !record.usedAt &&
      record.expiresAt.getTime() > Date.now(),
  );
}
