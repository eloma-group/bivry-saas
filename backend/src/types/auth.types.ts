import type { AccountStatus, ActorType } from '@prisma/client';

/** URL slug of a login portal. One slug maps to exactly one database table. */
export type RoleSlug = 'admin' | 'customer' | 'vendor' | 'employee' | 'driver';

/**
 * The columns every login table shares. Each role table also has its own extra
 * columns, which the registry maps into the public profile.
 */
export interface AuthAccount {
  id: string;
  email: string;
  phone: string | null;
  passwordHash: string;
  status: AccountStatus;
  emailVerifiedAt: Date | null;
  lastLoginAt: Date | null;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  [extraColumn: string]: unknown;
}

/**
 * The slice of a Prisma model delegate the auth service needs. Every role
 * delegate satisfies this shape, which lets one service serve all five tables
 * without ever guessing which table to read from.
 */
export interface AuthDelegate {
  findUnique(args: { where: Record<string, unknown> }): Promise<AuthAccount | null>;
  findFirst(args: { where: Record<string, unknown> }): Promise<AuthAccount | null>;
  create(args: { data: Record<string, unknown> }): Promise<AuthAccount>;
  update(args: {
    where: Record<string, unknown>;
    data: Record<string, unknown>;
  }): Promise<AuthAccount>;
}

/** Sanitised account returned to the client. Never contains the password hash. */
export interface PublicProfile {
  id: string;
  role: RoleSlug;
  email: string;
  phone: string | null;
  displayName: string;
  status: AccountStatus;
  emailVerified: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  [extraField: string]: unknown;
}

export interface RoleDefinition {
  slug: RoleSlug;
  actorType: ActorType;
  label: string;
  /** Database table backing this login portal, for logs and error messages. */
  table: string;
  /** Whether the public register endpoint is enabled for this role. */
  signupEnabled: boolean;
  /** Prisma delegate limited to the auth surface. */
  delegate: AuthDelegate;
  /** Maps a raw row to the sanitised profile sent to the browser. */
  toPublicProfile(account: AuthAccount): PublicProfile;
  /** Builds the row payload for a new account from validated input. */
  buildCreateData(input: Record<string, unknown>, passwordHash: string): Record<string, unknown>;
}

/** Payload embedded in an access token. */
export interface AccessTokenPayload {
  sub: string;
  role: RoleSlug;
  actorType: ActorType;
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  role: RoleSlug;
  actorType: ActorType;
  type: 'refresh';
  /** Id of the refresh_tokens row, so a single session can be revoked. */
  jti: string;
}

/** Set on `req.auth` by the authenticate middleware. */
export interface AuthenticatedActor {
  id: string;
  role: RoleSlug;
  actorType: ActorType;
}
