import { prisma } from '../config/prisma';
import { ApiError } from '../utils/apiError';
import { logger } from '../utils/logger';
import { hashPassword } from './auth/password.service';
import * as storage from './storage.service';
import type { OnboardingStatus, Prisma } from '@prisma/client';

/**
 * Everything the Admin portal can do to the records it governs.
 *
 * Admin routes read and write other people's rows, which no other module is
 * allowed to do, so every query here is written out in full rather than reusing
 * the self-service driver service.
 */

/** Admins upload their own files to their own container. */
const ADMIN_AREA = 'admin' as const;

const DRIVER_LIST_FIELDS = {
  id: true,
  email: true,
  phone: true,
  firstName: true,
  middleName: true,
  lastName: true,
  dateOfBirth: true,
  nationality: true,
  status: true,
  onboardingStatus: true,
  onboardingStep: true,
  submittedAt: true,
  approvedAt: true,
  rejectionReason: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.DriverSelect;

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

/** Headline numbers for the admin dashboard. */
export async function getDashboard() {
  const [drivers, byStatus, documents, recent, pendingReview] = await Promise.all([
    prisma.driver.count({ where: { deletedAt: null } }),
    prisma.driver.groupBy({
      by: ['onboardingStatus'],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
    prisma.driverDocument.aggregate({
      where: { deletedAt: null },
      _count: { _all: true },
      _sum: { sizeInBytes: true },
    }),
    prisma.driver.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: DRIVER_LIST_FIELDS,
    }),
    prisma.driver.count({
      where: { deletedAt: null, onboardingStatus: { in: ['SUBMITTED', 'UNDER_REVIEW'] } },
    }),
  ]);

  const counts = Object.fromEntries(
    byStatus.map((row) => [row.onboardingStatus, row._count._all]),
  ) as Partial<Record<OnboardingStatus, number>>;

  return {
    drivers: {
      total: drivers,
      pendingReview,
      notStarted: counts.NOT_STARTED ?? 0,
      inProgress: counts.IN_PROGRESS ?? 0,
      submitted: counts.SUBMITTED ?? 0,
      underReview: counts.UNDER_REVIEW ?? 0,
      approved: counts.APPROVED ?? 0,
      rejected: counts.REJECTED ?? 0,
    },
    documents: {
      total: documents._count._all,
      totalBytes: documents._sum.sizeInBytes ?? 0,
    },
    recentDrivers: recent,
    /** The modules the Onboarding menu offers. Only the built ones are usable. */
    modules: [
      { slug: 'driver', label: 'Driver', ready: true, records: drivers },
      { slug: 'vehicle', label: 'Vehicle', ready: false, records: 0 },
      { slug: 'customer', label: 'Customer', ready: false, records: 0 },
      { slug: 'user', label: 'User', ready: false, records: 0 },
      { slug: 'supplier', label: 'Supplier', ready: false, records: 0 },
    ],
  };
}

// ---------------------------------------------------------------------------
// Drivers - read
// ---------------------------------------------------------------------------

export interface DriverListQuery {
  search?: string;
  onboardingStatus?: OnboardingStatus;
  page: number;
  pageSize: number;
  sortBy: 'createdAt' | 'submittedAt' | 'firstName' | 'email' | 'onboardingStatus';
  sortDir: 'asc' | 'desc';
}

export async function listDrivers(query: DriverListQuery) {
  const where: Prisma.DriverWhereInput = { deletedAt: null };

  if (query.onboardingStatus) where.onboardingStatus = query.onboardingStatus;

  if (query.search) {
    const contains = { contains: query.search, mode: 'insensitive' } as const;
    where.OR = [
      { firstName: contains },
      { lastName: contains },
      { email: contains },
      { phone: contains },
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.driver.count({ where }),
    prisma.driver.findMany({
      where,
      orderBy: { [query.sortBy]: query.sortDir },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: {
        ...DRIVER_LIST_FIELDS,
        licence: {
          select: { licenceNumber: true, licenceType: true, expiryDate: true, verificationStatus: true },
        },
        addresses: { select: { type: true, suburb: true, state: true, country: true } },
        _count: { select: { documents: { where: { deletedAt: null } } } },
      },
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

/** One driver in full, including every onboarding section and document. */
export async function getDriver(driverId: string) {
  const driver = await prisma.driver.findFirst({
    where: { id: driverId, deletedAt: null },
    include: {
      addresses: true,
      licence: true,
      drivingHistory: true,
      policeVerification: true,
      visa: true,
      passport: true,
      medicare: true,
      medical: true,
      drugTest: true,
      documents: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } },
    },
  });

  if (!driver) throw ApiError.notFound('Driver not found');

  const { passwordHash: _passwordHash, ...safeDriver } = driver;
  return safeDriver;
}

// ---------------------------------------------------------------------------
// Drivers - write
// ---------------------------------------------------------------------------

export interface CreateDriverInput {
  email: string;
  password: string;
  phone: string | null;
  firstName: string;
  middleName: string | null;
  lastName: string | null;
  dateOfBirth: Date | null;
  nationality: string | null;
  status?: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
}

export async function createDriver(input: CreateDriverInput) {
  const email = input.email.trim().toLowerCase();

  const existing = await prisma.driver.findUnique({ where: { email } });
  if (existing) throw ApiError.conflict('A driver account with this email already exists.');

  const driver = await prisma.driver.create({
    data: {
      email,
      passwordHash: await hashPassword(input.password),
      phone: input.phone,
      firstName: input.firstName,
      middleName: input.middleName,
      lastName: input.lastName,
      dateOfBirth: input.dateOfBirth,
      nationality: input.nationality,
      // An admin created account is usable straight away; the driver still has
      // to complete onboarding before it can be approved.
      status: input.status ?? 'ACTIVE',
    },
    select: DRIVER_LIST_FIELDS,
  });

  return driver;
}

export interface UpdateDriverInput {
  phone?: string | null;
  firstName?: string;
  middleName?: string | null;
  lastName?: string | null;
  dateOfBirth?: Date | null;
  nationality?: string | null;
  status?: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
}

/**
 * Updates a driver's own details. The email is deliberately not updatable: it
 * identifies the account everywhere, including in the driver's own sign in.
 */
export async function updateDriver(driverId: string, input: UpdateDriverInput) {
  await assertDriverExists(driverId);

  return prisma.driver.update({
    where: { id: driverId },
    data: input,
    select: DRIVER_LIST_FIELDS,
  });
}

/**
 * Soft delete. The row stays for audit and the files stay in blob storage, but
 * the account disappears from every query and can no longer sign in.
 */
export async function deleteDriver(driverId: string) {
  await assertDriverExists(driverId);

  const [driver] = await prisma.$transaction([
    prisma.driver.update({
      where: { id: driverId },
      data: { deletedAt: new Date(), status: 'DEACTIVATED' },
      select: { id: true, email: true },
    }),
    // Any live session goes with it.
    prisma.refreshToken.updateMany({
      where: { actorType: 'DRIVER', actorId: driverId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  return driver;
}

/** Verification decision on a driver's whole application. */
export async function reviewDriver(
  driverId: string,
  input: { decision: 'APPROVED' | 'REJECTED' | 'UNDER_REVIEW'; reason: string | null },
  adminId: string,
) {
  const driver = await assertDriverExists(driverId);

  if (driver.onboardingStatus === 'NOT_STARTED' || driver.onboardingStatus === 'IN_PROGRESS') {
    throw ApiError.badRequest('This driver has not submitted their application yet.');
  }

  const now = new Date();

  const data: Prisma.DriverUpdateInput =
    input.decision === 'APPROVED'
      ? { onboardingStatus: 'APPROVED', approvedAt: now, rejectionReason: null, status: 'ACTIVE' }
      : input.decision === 'REJECTED'
        ? { onboardingStatus: 'REJECTED', approvedAt: null, rejectionReason: input.reason }
        : { onboardingStatus: 'UNDER_REVIEW', approvedAt: null };

  const updated = await prisma.driver.update({
    where: { id: driverId },
    data,
    select: DRIVER_LIST_FIELDS,
  });

  // Approving the application accepts the documents behind it, so every section
  // that was still waiting is marked verified in the same breath.
  if (input.decision === 'APPROVED') {
    const verified = { verificationStatus: 'VERIFIED' as const, verifiedAt: now, verifiedBy: adminId };
    await prisma.$transaction([
      prisma.driverLicence.updateMany({ where: { driverId }, data: verified }),
      prisma.driverDrivingHistory.updateMany({ where: { driverId }, data: verified }),
      prisma.driverPoliceVerification.updateMany({ where: { driverId }, data: verified }),
      prisma.driverVisa.updateMany({ where: { driverId }, data: verified }),
      prisma.driverMedical.updateMany({ where: { driverId }, data: verified }),
      prisma.driverDrugTest.updateMany({ where: { driverId }, data: verified }),
    ]);
  }

  return updated;
}

/** Verification decision on a single section, e.g. the licence only. */
export type ReviewableSection =
  | 'licence'
  | 'drivingHistory'
  | 'policeVerification'
  | 'visa'
  | 'passport'
  | 'medicare'
  | 'medical'
  | 'drugTest';

const SECTION_MODEL: Record<ReviewableSection, keyof typeof prisma> = {
  licence: 'driverLicence',
  drivingHistory: 'driverDrivingHistory',
  policeVerification: 'driverPoliceVerification',
  visa: 'driverVisa',
  passport: 'driverPassport',
  medicare: 'driverMedicare',
  medical: 'driverMedical',
  drugTest: 'driverDrugTest',
};

export async function reviewSection(
  driverId: string,
  section: ReviewableSection,
  input: { status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'EXPIRED'; remarks: string | null },
  adminId: string,
) {
  await assertDriverExists(driverId);

  const delegate = prisma[SECTION_MODEL[section]] as unknown as {
    updateMany(args: {
      where: { driverId: string };
      data: Record<string, unknown>;
    }): Promise<{ count: number }>;
  };

  const result = await delegate.updateMany({
    where: { driverId },
    data: {
      verificationStatus: input.status,
      remarks: input.remarks,
      verifiedAt: input.status === 'PENDING' ? null : new Date(),
      verifiedBy: input.status === 'PENDING' ? null : adminId,
    },
  });

  if (result.count === 0) {
    throw ApiError.notFound('This driver has not filled in that section yet.');
  }

  return { driverId, section, status: input.status };
}

async function assertDriverExists(driverId: string) {
  const driver = await prisma.driver.findFirst({
    where: { id: driverId, deletedAt: null },
    select: { id: true, onboardingStatus: true },
  });
  if (!driver) throw ApiError.notFound('Driver not found');
  return driver;
}

// ---------------------------------------------------------------------------
// Driver documents, read only from here
// ---------------------------------------------------------------------------

async function getDriverDocument(driverId: string, documentId: string) {
  const document = await prisma.driverDocument.findFirst({
    where: { id: documentId, driverId, deletedAt: null },
  });
  if (!document) throw ApiError.notFound('Document not found');
  return document;
}

/** Signed link so an admin can open a driver's file straight from blob storage. */
export async function createDriverDocumentLink(driverId: string, documentId: string) {
  const document = await getDriverDocument(driverId, documentId);
  const link = await storage.createSignedLink({
    storageKey: document.storageKey,
    fileName: document.fileName,
    fallbackPath: `/api/admin/drivers/${driverId}/documents/${document.id}/file`,
    // A driver's documents stay in the driver container whoever reads them.
    area: 'driver',
  });

  return {
    documentId: document.id,
    fileName: document.fileName,
    mimeType: document.mimeType,
    url: link.url,
    expiresAt: link.expiresAt,
  };
}

export async function openDriverDocument(driverId: string, documentId: string) {
  const document = await getDriverDocument(driverId, documentId);
  const file = await storage.openFile(document.storageKey, document.mimeType, 'driver');
  return { document, file };
}

// ---------------------------------------------------------------------------
// The admin's own profile
// ---------------------------------------------------------------------------

export async function getAdmin(adminId: string) {
  const admin = await prisma.admin.findFirst({
    where: { id: adminId, deletedAt: null },
    select: {
      id: true,
      email: true,
      phone: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      isSuperAdmin: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });
  if (!admin) throw ApiError.notFound('Admin not found');
  return admin;
}

export async function updateAdmin(
  adminId: string,
  input: { firstName?: string; lastName?: string | null; phone?: string | null },
) {
  await getAdmin(adminId);
  return prisma.admin.update({
    where: { id: adminId },
    data: input,
    select: {
      id: true,
      email: true,
      phone: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      isSuperAdmin: true,
      status: true,
      createdAt: true,
    },
  });
}

/**
 * The admin's own profile photo. This is the one thing an admin uploads, and it
 * goes to the admin container, never into the drivers' document store.
 */
export async function saveAdminAvatar(
  adminId: string,
  input: { fileName: string; mimeType: string; buffer: Buffer },
) {
  const admin = await getAdmin(adminId);

  const storageKey = storage.buildStorageKey({
    role: 'admin',
    actorId: adminId,
    docType: 'AVATAR',
    originalName: input.fileName,
  });

  const stored = await storage.saveFile({
    storageKey,
    buffer: input.buffer,
    mimeType: input.mimeType,
    fileName: input.fileName,
    area: ADMIN_AREA,
  });

  const previousKey = admin.avatarUrl;

  const updated = await prisma.admin.update({
    where: { id: adminId },
    // The storage key is what is kept: the URL to hand the browser is signed on
    // demand, because the container is private.
    data: { avatarUrl: stored.storageKey },
    select: { id: true, avatarUrl: true },
  });

  if (previousKey && previousKey !== stored.storageKey) {
    try {
      await storage.deleteFile(previousKey, ADMIN_AREA);
    } catch (error) {
      logger.warn(`Could not remove the previous admin avatar ${previousKey}`, error);
    }
  }

  return updated;
}

/** Signed link for the admin's own avatar, straight from the admin container. */
export async function createAdminAvatarLink(adminId: string) {
  const admin = await getAdmin(adminId);
  if (!admin.avatarUrl) throw ApiError.notFound('No profile photo uploaded');

  const link = await storage.createSignedLink({
    storageKey: admin.avatarUrl,
    fileName: 'profile-photo',
    fallbackPath: `/api/admin/me/avatar/file`,
    area: ADMIN_AREA,
  });

  return { url: link.url, expiresAt: link.expiresAt };
}

export async function openAdminAvatar(adminId: string) {
  const admin = await getAdmin(adminId);
  if (!admin.avatarUrl) throw ApiError.notFound('No profile photo uploaded');
  return storage.openFile(admin.avatarUrl, 'image/jpeg', ADMIN_AREA);
}
