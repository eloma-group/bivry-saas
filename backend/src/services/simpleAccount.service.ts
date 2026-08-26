import { prisma } from '../config/prisma';
import { ApiError } from '../utils/apiError';
import { hashPassword } from './auth/password.service';
import type { Prisma } from '@prisma/client';

/**
 * Customers and employees, as the Admin portal governs them.
 *
 * Unlike drivers and vendors these are plain accounts: no onboarding record,
 * no documents, no verification decisions. The whole record is the row itself,
 * so there is nothing here to delegate to a portal service and the five
 * operations are written out once against a shared shape.
 *
 * The two differ only in which columns they carry, so the delegate and the
 * searchable columns are the parameters and everything else is shared. Two
 * near identical copies of this file would drift, and the half that drifted
 * would be the one nobody was looking at.
 */

export type AccountStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';

export interface ListQuery {
  search?: string;
  status?: AccountStatus;
  page: number;
  pageSize: number;
  sortBy: 'createdAt' | 'email' | 'firstName';
  sortDir: 'asc' | 'desc';
}

/** Columns every one of these accounts has, and the only ones ever returned. */
const SHARED_FIELDS = {
  id: true,
  email: true,
  phone: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  status: true,
  emailVerifiedAt: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

const CUSTOMER_FIELDS = { ...SHARED_FIELDS, companyName: true } as const;
const EMPLOYEE_FIELDS = {
  ...SHARED_FIELDS,
  employeeCode: true,
  department: true,
  designation: true,
} as const;

/**
 * What the two kinds have in common, expressed loosely enough that one body can
 * serve both. Prisma generates a separate delegate type per model with no
 * common supertype, so the alternative is duplicating every function.
 */
interface AccountKind {
  /** Used in the messages a caller sees, so it reads as the thing it is. */
  label: string;
  actorType: 'CUSTOMER' | 'EMPLOYEE';
  delegate: {
    count(args: unknown): Promise<number>;
    findMany(args: unknown): Promise<unknown[]>;
    findFirst(args: unknown): Promise<unknown>;
    create(args: unknown): Promise<{ id: string; email: string }>;
    update(args: unknown): Promise<{ id: string; email: string }>;
    delete(args: unknown): Promise<{ id: string; email: string }>;
  };
  fields: Record<string, boolean>;
  /** Columns a search box looks through. */
  searchable: string[];
}

const CUSTOMER: AccountKind = {
  label: 'Customer',
  actorType: 'CUSTOMER',
  delegate: prisma.customer as unknown as AccountKind['delegate'],
  fields: CUSTOMER_FIELDS,
  searchable: ['firstName', 'lastName', 'email', 'phone', 'companyName'],
};

const EMPLOYEE: AccountKind = {
  label: 'Employee',
  actorType: 'EMPLOYEE',
  delegate: prisma.employee as unknown as AccountKind['delegate'],
  fields: EMPLOYEE_FIELDS,
  searchable: ['firstName', 'lastName', 'email', 'phone', 'employeeCode', 'department'],
};

export const KINDS = { customer: CUSTOMER, employee: EMPLOYEE } as const;
export type KindSlug = keyof typeof KINDS;

function buildWhere(kind: AccountKind, query: ListQuery): Record<string, unknown> {
  const where: Record<string, unknown> = { deletedAt: null };
  if (query.status) where.status = query.status;

  if (query.search) {
    const contains = { contains: query.search, mode: 'insensitive' };
    where.OR = kind.searchable.map((column) => ({ [column]: contains }));
  }

  return where;
}

export async function list(slug: KindSlug, query: ListQuery) {
  const kind = KINDS[slug];
  const where = buildWhere(kind, query);

  const [total, rows] = await Promise.all([
    kind.delegate.count({ where }),
    kind.delegate.findMany({
      where,
      orderBy: { [query.sortBy]: query.sortDir },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: kind.fields,
    }),
  ]);

  return {
    rows,
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

async function assertExists(kind: AccountKind, id: string) {
  const row = await kind.delegate.findFirst({
    where: { id, deletedAt: null },
    select: { id: true },
  });
  if (!row) throw ApiError.notFound(`${kind.label} not found`);
  return row;
}

export async function get(slug: KindSlug, id: string) {
  const kind = KINDS[slug];
  const row = await kind.delegate.findFirst({ where: { id, deletedAt: null }, select: kind.fields });
  if (!row) throw ApiError.notFound(`${kind.label} not found`);
  return row;
}

export async function create(slug: KindSlug, input: Record<string, unknown>) {
  const kind = KINDS[slug];
  const email = String(input.email).trim().toLowerCase();

  const existing = await kind.delegate.findFirst({ where: { email }, select: { id: true } });
  if (existing) {
    throw ApiError.conflict(`A ${kind.label.toLowerCase()} account with this email already exists.`);
  }

  const { password, ...rest } = input;

  return kind.delegate.create({
    data: {
      ...rest,
      email,
      passwordHash: await hashPassword(String(password)),
      // An admin created account is usable straight away unless the admin says
      // otherwise, which matches how drivers and vendors are created.
      status: (rest.status as AccountStatus) ?? 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
    select: kind.fields,
  });
}

export async function update(slug: KindSlug, id: string, input: Record<string, unknown>) {
  const kind = KINDS[slug];
  await assertExists(kind, id);

  const { email, ...rest } = input;
  const data: Record<string, unknown> = { ...rest };

  if (email !== undefined) {
    const normalised = String(email).trim().toLowerCase();
    const clash = await kind.delegate.findFirst({
      where: { email: normalised, id: { not: id } },
      select: { id: true },
    });
    if (clash) {
      throw ApiError.conflict(`Another ${kind.label.toLowerCase()} account already uses this email.`);
    }
    data.email = normalised;
  }

  return kind.delegate.update({ where: { id }, data, select: kind.fields });
}

/**
 * Permanent delete, the same contract as a driver or a vendor: the row goes
 * and the email is free again. Neither of these has child records or files, so
 * there is nothing to cascade beyond the sessions.
 */
export async function remove(slug: KindSlug, id: string) {
  const kind = KINDS[slug];
  await assertExists(kind, id);

  const [row] = await prisma.$transaction([
    kind.delegate.delete({ where: { id }, select: { id: true, email: true } }) as Prisma.PrismaPromise<{
      id: string;
      email: string;
    }>,
    prisma.refreshToken.deleteMany({ where: { actorType: kind.actorType, actorId: id } }),
    prisma.passwordResetToken.deleteMany({ where: { actorType: kind.actorType, actorId: id } }),
  ]);

  return row;
}

/** Replaces the password and signs every existing session out. */
export async function setPassword(slug: KindSlug, id: string, password: string) {
  const kind = KINDS[slug];
  await assertExists(kind, id);

  const [row] = await prisma.$transaction([
    kind.delegate.update({
      where: { id },
      data: { passwordHash: await hashPassword(password), failedLoginAttempts: 0, lockedUntil: null },
      select: { id: true, email: true },
    }) as Prisma.PrismaPromise<{ id: string; email: string }>,
    prisma.refreshToken.updateMany({
      where: { actorType: kind.actorType, actorId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
    prisma.passwordResetToken.updateMany({
      where: { actorType: kind.actorType, actorId: id, usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);

  return row;
}
