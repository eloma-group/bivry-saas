import { ActorType } from '@prisma/client';
import { prisma } from './prisma';
import { env } from './env';
import type {
  AuthAccount,
  AuthDelegate,
  PublicProfile,
  RoleDefinition,
  RoleSlug,
} from '../types/auth.types';

/**
 * The role registry.
 *
 * This is the only place in the backend that knows which table belongs to which
 * login portal. A request that arrives at `/api/auth/driver/login` resolves to
 * the `driver` definition and can therefore only ever query the `drivers`
 * table. There is no path that lets one portal read another portal's rows.
 */

/** Prisma delegates are structurally different per model, so narrow them once here. */
function asDelegate(delegate: unknown): AuthDelegate {
  return delegate as AuthDelegate;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function joinName(...parts: unknown[]): string {
  return parts.map(text).filter((part): part is string => part !== null).join(' ');
}

function baseProfile(account: AuthAccount, role: RoleSlug): PublicProfile {
  return {
    id: account.id,
    role,
    email: account.email,
    phone: account.phone,
    displayName: account.email,
    status: account.status,
    emailVerified: account.emailVerifiedAt !== null,
    lastLoginAt: account.lastLoginAt,
    createdAt: account.createdAt,
  };
}

export const ROLES: Record<RoleSlug, RoleDefinition> = {
  admin: {
    slug: 'admin',
    actorType: ActorType.ADMIN,
    label: 'Admin',
    table: 'admins',
    signupEnabled: env.signup.admin,
    delegate: asDelegate(prisma.admin),
    toPublicProfile(account) {
      return {
        ...baseProfile(account, 'admin'),
        displayName: joinName(account.firstName, account.lastName) || account.email,
        firstName: account.firstName,
        lastName: account.lastName,
        avatarUrl: account.avatarUrl,
        isSuperAdmin: account.isSuperAdmin,
      };
    },
    buildCreateData(input, passwordHash) {
      return {
        email: input.email,
        phone: input.phone ?? null,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName ?? null,
        status: 'ACTIVE',
      };
    },
  },

  customer: {
    slug: 'customer',
    actorType: ActorType.CUSTOMER,
    label: 'Customer',
    table: 'customers',
    signupEnabled: env.signup.customer,
    delegate: asDelegate(prisma.customer),
    toPublicProfile(account) {
      return {
        ...baseProfile(account, 'customer'),
        displayName:
          joinName(account.firstName, account.lastName) ||
          text(account.companyName) ||
          account.email,
        firstName: account.firstName,
        lastName: account.lastName,
        companyName: account.companyName,
        avatarUrl: account.avatarUrl,
      };
    },
    buildCreateData(input, passwordHash) {
      return {
        email: input.email,
        phone: input.phone ?? null,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName ?? null,
        companyName: input.companyName ?? null,
      };
    },
  },

  vendor: {
    slug: 'vendor',
    actorType: ActorType.VENDOR,
    label: 'Vendor',
    table: 'vendors',
    signupEnabled: env.signup.vendor,
    delegate: asDelegate(prisma.vendor),
    toPublicProfile(account) {
      return {
        ...baseProfile(account, 'vendor'),
        displayName: text(account.companyName) ?? account.email,
        companyName: account.companyName,
        tradingNames: account.tradingNames,
        legalName: account.legalName,
        contactPerson: account.contactPerson,
        abn: account.abn,
        supplierId: account.supplierId,
        websiteAddress: account.websiteAddress,
        logoUrl: account.logoUrl,
        onboardingStatus: account.onboardingStatus,
        onboardingStep: account.onboardingStep,
      };
    },
    buildCreateData(input, passwordHash) {
      return {
        email: input.email,
        phone: input.phone ?? null,
        passwordHash,
        companyName: input.companyName,
        contactPerson: input.contactPerson ?? null,
        abn: input.abn ?? null,
      };
    },
  },

  employee: {
    slug: 'employee',
    actorType: ActorType.EMPLOYEE,
    label: 'Employee',
    table: 'employees',
    signupEnabled: env.signup.employee,
    delegate: asDelegate(prisma.employee),
    toPublicProfile(account) {
      return {
        ...baseProfile(account, 'employee'),
        displayName: joinName(account.firstName, account.lastName) || account.email,
        firstName: account.firstName,
        lastName: account.lastName,
        employeeCode: account.employeeCode,
        department: account.department,
        designation: account.designation,
        avatarUrl: account.avatarUrl,
      };
    },
    buildCreateData(input, passwordHash) {
      return {
        email: input.email,
        phone: input.phone ?? null,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName ?? null,
        employeeCode: input.employeeCode ?? null,
        department: input.department ?? null,
        designation: input.designation ?? null,
      };
    },
  },

  driver: {
    slug: 'driver',
    actorType: ActorType.DRIVER,
    label: 'Driver',
    table: 'drivers',
    signupEnabled: env.signup.driver,
    delegate: asDelegate(prisma.driver),
    toPublicProfile(account) {
      return {
        ...baseProfile(account, 'driver'),
        displayName: joinName(account.firstName, account.lastName) || account.email,
        firstName: account.firstName,
        middleName: account.middleName,
        lastName: account.lastName,
        avatarUrl: account.avatarUrl,
        onboardingStatus: account.onboardingStatus,
        onboardingStep: account.onboardingStep,
      };
    },
    buildCreateData(input, passwordHash) {
      return {
        email: input.email,
        phone: input.phone ?? null,
        passwordHash,
        firstName: input.firstName,
        middleName: input.middleName ?? null,
        lastName: input.lastName ?? null,
      };
    },
  },
};

export const ROLE_SLUGS = Object.keys(ROLES) as RoleSlug[];

export function getRole(slug: RoleSlug): RoleDefinition {
  return ROLES[slug];
}

/** Maps an ActorType stored on a token back to its role definition. */
export function getRoleByActorType(actorType: ActorType): RoleDefinition {
  const match = ROLE_SLUGS.map((slug) => ROLES[slug]).find(
    (role) => role.actorType === actorType,
  );
  if (!match) {
    throw new Error(`Unknown actor type: ${actorType}`);
  }
  return match;
}
