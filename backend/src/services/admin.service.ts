import { prisma } from '../config/prisma';
import { ApiError } from '../utils/apiError';
import { logger } from '../utils/logger';
import { hashPassword } from './auth/password.service';
import * as storage from './storage.service';
import * as driverService from './driver.service';
import * as vendorService from './vendor.service';
import * as customerService from './customer.service';
import type { OnboardingStatus, Prisma, VendorInsuranceType } from '@prisma/client';

/**
 * Everything the Admin portal can do to the records it governs.
 *
 * Admin routes read and write other people's rows, which no other module is
 * allowed to do, so every query here is written out in full rather than reusing
 * the self-service driver service.
 */

/** Admins upload their own files to their own container. */
const ADMIN_AREA = 'admin' as const;

/**
 * Drops the blobs behind a set of document rows. Best effort by design: the
 * database delete has already committed by the time this runs, so a storage
 * outage is logged and swallowed. An orphaned blob is the cheaper failure.
 */
async function removeStoredFiles(
  documents: { id: string; storageKey: string }[],
  area: storage.StorageArea,
): Promise<void> {
  for (const document of documents) {
    try {
      await storage.deleteFile(document.storageKey, area);
    } catch (error) {
      logger.warn(`Could not remove stored file for document ${document.id}`, error);
    }
  }
}

const DRIVER_LIST_FIELDS = {
  id: true,
  email: true,
  phone: true,
  firstName: true,
  middleName: true,
  lastName: true,
  dateOfBirth: true,
  country: true,
  status: true,
  onboardingStatus: true,
  onboardingStep: true,
  submittedAt: true,
  approvedAt: true,
  rejectionReason: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.DriverSelect;

const VENDOR_LIST_FIELDS = {
  id: true,
  email: true,
  phone: true,
  companyName: true,
  tradingNames: true,
  legalName: true,
  abn: true,
  acn: true,
  abnStatus: true,
  entityType: true,
  gst: true,
  vendorCode: true,
  websiteAddress: true,
  contactPerson: true,
  status: true,
  onboardingStatus: true,
  onboardingStep: true,
  submittedAt: true,
  approvedAt: true,
  rejectionReason: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.VendorSelect;

const CUSTOMER_LIST_FIELDS = {
  id: true,
  email: true,
  phone: true,
  cid: true,
  accountNumber: true,
  firstName: true,
  lastName: true,
  companyName: true,
  designation: true,
  tradingNames: true,
  legalName: true,
  abn: true,
  acn: true,
  abnStatus: true,
  entityType: true,
  gst: true,
  websiteAddress: true,
  creationDate: true,
  status: true,
  onboardingStatus: true,
  onboardingStep: true,
  submittedAt: true,
  approvedAt: true,
  rejectionReason: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CustomerSelect;

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

/** Turns a groupBy result into a count per onboarding status. */
function statusCounts(rows: Array<{ onboardingStatus: OnboardingStatus; _count: { _all: number } }>) {
  const counts = Object.fromEntries(
    rows.map((row) => [row.onboardingStatus, row._count._all]),
  ) as Partial<Record<OnboardingStatus, number>>;

  return {
    notStarted: counts.NOT_STARTED ?? 0,
    inProgress: counts.IN_PROGRESS ?? 0,
    submitted: counts.SUBMITTED ?? 0,
    underReview: counts.UNDER_REVIEW ?? 0,
    approved: counts.APPROVED ?? 0,
    rejected: counts.REJECTED ?? 0,
  };
}

/** Headline numbers for the admin dashboard. */
export async function getDashboard() {
  const [
    drivers,
    byStatus,
    documents,
    recent,
    pendingReview,
    vendors,
    vendorsByStatus,
    vendorDocuments,
    recentVendors,
    vendorsPendingReview,
    customers,
    customersByStatus,
    customerDocuments,
    recentCustomers,
    customersPendingReview,
  ] = await Promise.all([
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
    prisma.vendor.count({ where: { deletedAt: null } }),
    prisma.vendor.groupBy({
      by: ['onboardingStatus'],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
    prisma.vendorDocument.aggregate({
      where: { deletedAt: null },
      _count: { _all: true },
      _sum: { sizeInBytes: true },
    }),
    prisma.vendor.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: VENDOR_LIST_FIELDS,
    }),
    prisma.vendor.count({
      where: { deletedAt: null, onboardingStatus: { in: ['SUBMITTED', 'UNDER_REVIEW'] } },
    }),
    prisma.customer.count({ where: { deletedAt: null } }),
    prisma.customer.groupBy({
      by: ['onboardingStatus'],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
    prisma.customerDocument.aggregate({
      where: { deletedAt: null },
      _count: { _all: true },
      _sum: { sizeInBytes: true },
    }),
    prisma.customer.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: CUSTOMER_LIST_FIELDS,
    }),
    prisma.customer.count({
      where: { deletedAt: null, onboardingStatus: { in: ['SUBMITTED', 'UNDER_REVIEW'] } },
    }),
  ]);

  return {
    drivers: {
      total: drivers,
      pendingReview,
      ...statusCounts(byStatus),
    },
    vendors: {
      total: vendors,
      pendingReview: vendorsPendingReview,
      ...statusCounts(vendorsByStatus),
    },
    customers: {
      total: customers,
      pendingReview: customersPendingReview,
      ...statusCounts(customersByStatus),
    },
    documents: {
      // Every store together: the dashboard tile counts every file held.
      total:
        documents._count._all + vendorDocuments._count._all + customerDocuments._count._all,
      totalBytes:
        (documents._sum.sizeInBytes ?? 0) +
        (vendorDocuments._sum.sizeInBytes ?? 0) +
        (customerDocuments._sum.sizeInBytes ?? 0),
    },
    recentDrivers: recent,
    recentVendors,
    recentCustomers,
    /** The modules the Onboarding menu offers. Only the built ones are usable. */
    modules: [
      { slug: 'driver', label: 'Driver', ready: true, records: drivers },
      { slug: 'vendor', label: 'Vendor', ready: true, records: vendors },
      { slug: 'customer', label: 'Customer', ready: true, records: customers },
      { slug: 'vehicle', label: 'Vehicle', ready: false, records: 0 },
      { slug: 'user', label: 'User', ready: false, records: 0 },
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
  country: string | null;
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
      country: input.country,
      // An admin created account is usable straight away; the driver still has
      // to complete onboarding before it can be approved.
      status: input.status ?? 'ACTIVE',
    },
    select: DRIVER_LIST_FIELDS,
  });

  return driver;
}

export interface UpdateDriverInput {
  email?: string;
  phone?: string | null;
  firstName?: string;
  middleName?: string | null;
  lastName?: string | null;
  dateOfBirth?: Date | null;
  country?: string | null;
  status?: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
}

/**
 * Updates a driver's account details.
 *
 * The email is editable from here, unlike in the driver's own profile, because
 * correcting an address somebody mistyped at signup is exactly the kind of fix
 * only an admin can make. It identifies the account, so it is normalised the
 * same way sign in normalises it and checked against the other drivers first.
 */
export async function updateDriver(driverId: string, input: UpdateDriverInput) {
  await assertDriverExists(driverId);

  const { email, ...rest } = input;
  const data: Prisma.DriverUpdateInput = { ...rest };

  if (email !== undefined) {
    const normalised = email.trim().toLowerCase();
    const clash = await prisma.driver.findFirst({
      where: { email: normalised, id: { not: driverId } },
      select: { id: true },
    });
    if (clash) throw ApiError.conflict('Another driver account already uses this email.');
    data.email = normalised;
  }

  return prisma.driver.update({
    where: { id: driverId },
    data,
    select: DRIVER_LIST_FIELDS,
  });
}

/**
 * Replaces a driver's password.
 *
 * The driver is never told the new one by this route, so an admin using it has
 * to pass it on themselves. Every existing session is dropped: if the reason
 * for the reset is that somebody else had the old password, leaving their
 * refresh token alive would defeat the whole point.
 */
export async function setDriverPassword(driverId: string, password: string) {
  await assertDriverExists(driverId);

  const [driver] = await prisma.$transaction([
    prisma.driver.update({
      where: { id: driverId },
      data: { passwordHash: await hashPassword(password), failedLoginAttempts: 0, lockedUntil: null },
      select: { id: true, email: true },
    }),
    prisma.refreshToken.updateMany({
      where: { actorType: 'DRIVER', actorId: driverId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
    // A reset link that was already on its way out is no longer wanted either.
    prisma.passwordResetToken.updateMany({
      where: { actorType: 'DRIVER', actorId: driverId, usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);

  return driver;
}

// ---------------------------------------------------------------------------
// Drivers - the onboarding record
//
// The driver portal already knows how to write every one of these sections, and
// none of that logic changes just because an admin is the one typing. So these
// delegate to the driver service rather than restating it, and add the two
// things the admin side needs: a 404 that says "Driver not found" before
// anything is written, and verification decisions that survive an admin's own
// correction.
// ---------------------------------------------------------------------------

export async function updateDriverPersonal(
  driverId: string,
  input: Parameters<typeof driverService.updatePersonal>[1],
) {
  await assertDriverExists(driverId);
  return driverService.updatePersonal(driverId, input);
}

export async function updateDriverAddresses(
  driverId: string,
  input: Parameters<typeof driverService.updateAddresses>[1],
) {
  await assertDriverExists(driverId);
  return driverService.updateAddresses(driverId, input);
}

export async function updateDriverSection(
  driverId: string,
  section: Parameters<typeof driverService.upsertSection>[1],
  data: Record<string, unknown>,
) {
  await assertDriverExists(driverId);
  return driverService.upsertSection(driverId, section, data, { resetVerification: false });
}

export async function addDriverDocument(
  driverId: string,
  input: Parameters<typeof driverService.addDocument>[1],
) {
  await assertDriverExists(driverId);
  return driverService.addDocument(driverId, input);
}

export async function updateDriverDocument(
  driverId: string,
  documentId: string,
  data: { category: string | null; expiryDate: Date | null },
) {
  await assertDriverExists(driverId);
  return driverService.updateDocument(driverId, documentId, data);
}

export async function deleteDriverDocument(driverId: string, documentId: string) {
  await assertDriverExists(driverId);
  return driverService.deleteDocument(driverId, documentId);
}

/**
 * Permanent delete. The row goes, and with it every driver_* record hanging off
 * it, every session, every reset link and every file in blob storage. Nothing
 * is left behind a flag, so the email and phone are free again and the same
 * person can sign up with them later.
 *
 * There is no undo, and the confirmation in the Admin portal says so.
 */
export async function deleteDriver(driverId: string) {
  await assertDriverExists(driverId);

  // Read the blob keys while the rows still exist. Soft deleted documents are
  // included too: their blob may already be gone, and deleting a missing blob
  // is a no-op.
  const driver = await prisma.driver.findUniqueOrThrow({
    where: { id: driverId },
    select: {
      id: true,
      email: true,
      documents: { select: { id: true, storageKey: true } },
    },
  });

  await prisma.$transaction([
    // actorType/actorId is not a foreign key, so these do not cascade.
    prisma.refreshToken.deleteMany({ where: { actorType: 'DRIVER', actorId: driverId } }),
    prisma.passwordResetToken.deleteMany({ where: { actorType: 'DRIVER', actorId: driverId } }),
    // Every driver_* child row cascades from this one.
    prisma.driver.delete({ where: { id: driverId } }),
  ]);

  await removeStoredFiles(driver.documents, 'driver');

  return { id: driver.id, email: driver.email };
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
// Vendors - read
// ---------------------------------------------------------------------------

export interface VendorListQuery {
  search?: string;
  onboardingStatus?: OnboardingStatus;
  page: number;
  pageSize: number;
  sortBy: 'createdAt' | 'submittedAt' | 'companyName' | 'email' | 'onboardingStatus';
  sortDir: 'asc' | 'desc';
}

export async function listVendors(query: VendorListQuery) {
  const where: Prisma.VendorWhereInput = { deletedAt: null };

  if (query.onboardingStatus) where.onboardingStatus = query.onboardingStatus;

  if (query.search) {
    const contains = { contains: query.search, mode: 'insensitive' } as const;
    where.OR = [
      { companyName: contains },
      { legalName: contains },
      // A scalar list has no substring filter, so a trading name matches only
      // in full. Company and legal name still answer a partial search.
      { tradingNames: { has: query.search } },
      { vendorCode: contains },
      { abn: contains },
      { email: contains },
      { phone: contains },
      // The account phone is usually empty, so a search for a vendor's number
      // has to look at the contact numbers they actually filled in as well.
      { contacts: { some: { contactNumber: contains } } },
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.vendor.count({ where }),
    prisma.vendor.findMany({
      where,
      orderBy: { [query.sortBy]: query.sortDir },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: {
        ...VENDOR_LIST_FIELDS,
        // `phone` is only set when the account is created; the onboarding form
        // has no field for it. The contact numbers are what a vendor actually
        // gives, so they come too and the admin views fall back to them.
        contacts: { select: { type: true, contactNumber: true } },
        accreditation: {
          select: { accreditationNumber: true, nhvasExpiry: true, verificationStatus: true },
        },
        coverage: { select: { areasCovered: true, businessOperations: true } },
        warehouses: { select: { suburb: true, state: true, country: true }, orderBy: { position: 'asc' } },
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

/** One vendor in full, including every onboarding section and document. */
export async function getVendor(vendorId: string) {
  const vendor = await prisma.vendor.findFirst({
    where: { id: vendorId, deletedAt: null },
    include: {
      contacts: true,
      directors: { orderBy: { position: 'asc' } },
      bankDetail: true,
      coverage: true,
      addresses: true,
      warehouses: { orderBy: { position: 'asc' } },
      yards: { orderBy: { position: 'asc' } },
      accreditation: true,
      insurances: true,
      documents: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } },
    },
  });

  if (!vendor) throw ApiError.notFound('Vendor not found');

  const { passwordHash: _passwordHash, ...safeVendor } = vendor;
  return safeVendor;
}

// ---------------------------------------------------------------------------
// Vendors - write
// ---------------------------------------------------------------------------

export interface CreateVendorInput {
  email: string;
  password: string;
  phone: string | null;
  companyName: string;
  tradingNames: string[];
  legalName: string | null;
  contactPerson: string | null;
  abn: string | null;
  acn: string | null;
  abnStatus: string | null;
  entityType: string | null;
  gst: string | null;
  websiteAddress: string | null;
  status?: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
}

export async function createVendor(input: CreateVendorInput) {
  const email = input.email.trim().toLowerCase();

  const existing = await prisma.vendor.findUnique({ where: { email } });
  if (existing) throw ApiError.conflict('A vendor account with this email already exists.');

  return prisma.vendor.create({
    data: {
      email,
      passwordHash: await hashPassword(input.password),
      phone: input.phone,
      companyName: input.companyName,
      tradingNames: input.tradingNames,
      legalName: input.legalName,
      contactPerson: input.contactPerson,
      abn: input.abn,
      acn: input.acn,
      abnStatus: input.abnStatus,
      entityType: input.entityType,
      gst: input.gst,
      websiteAddress: input.websiteAddress,
      // An admin created account is usable straight away; the vendor still has
      // to complete onboarding before it can be approved.
      status: input.status ?? 'ACTIVE',
    },
    select: VENDOR_LIST_FIELDS,
  });
}

export type UpdateVendorInput = Partial<Omit<CreateVendorInput, 'password'>>;

/**
 * Updates a vendor's account details.
 *
 * The email is editable from here, unlike in the vendor's own profile, for
 * the same reason it is on a driver: correcting an address somebody mistyped at
 * signup is a fix only an admin can make.
 */
export async function updateVendor(vendorId: string, input: UpdateVendorInput) {
  await assertVendorExists(vendorId);

  const { email, ...rest } = input;
  const data: Prisma.VendorUpdateInput = { ...rest };

  if (email !== undefined) {
    const normalised = email.trim().toLowerCase();
    const clash = await prisma.vendor.findFirst({
      where: { email: normalised, id: { not: vendorId } },
      select: { id: true },
    });
    if (clash) throw ApiError.conflict('Another vendor account already uses this email.');
    data.email = normalised;
  }

  return prisma.vendor.update({
    where: { id: vendorId },
    data,
    select: VENDOR_LIST_FIELDS,
  });
}

/** Replaces a vendor's password. See setDriverPassword: same rules. */
export async function setVendorPassword(vendorId: string, password: string) {
  await assertVendorExists(vendorId);

  const [vendor] = await prisma.$transaction([
    prisma.vendor.update({
      where: { id: vendorId },
      data: { passwordHash: await hashPassword(password), failedLoginAttempts: 0, lockedUntil: null },
      select: { id: true, email: true },
    }),
    prisma.refreshToken.updateMany({
      where: { actorType: 'VENDOR', actorId: vendorId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
    prisma.passwordResetToken.updateMany({
      where: { actorType: 'VENDOR', actorId: vendorId, usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);

  return vendor;
}

// ---------------------------------------------------------------------------
// Vendors - the onboarding record
//
// The same arrangement as the driver equivalents above: the vendor portal
// already knows how to write every one of these sections, so these delegate to
// it and add the admin 404 and the surviving verification decision.
// ---------------------------------------------------------------------------

export async function updateVendorCompany(
  vendorId: string,
  input: Parameters<typeof vendorService.updateCompany>[1],
) {
  await assertVendorExists(vendorId);
  return vendorService.updateCompany(vendorId, input);
}

export async function updateVendorContacts(
  vendorId: string,
  input: Parameters<typeof vendorService.updateContacts>[1],
) {
  await assertVendorExists(vendorId);
  return vendorService.updateContacts(vendorId, input);
}

export async function updateVendorDirectors(
  vendorId: string,
  input: Parameters<typeof vendorService.updateDirectors>[1],
) {
  await assertVendorExists(vendorId);
  return vendorService.updateDirectors(vendorId, input);
}

export async function updateVendorAddresses(
  vendorId: string,
  input: Parameters<typeof vendorService.updateAddresses>[1],
) {
  await assertVendorExists(vendorId);
  return vendorService.updateAddresses(vendorId, input);
}

export async function updateVendorWarehouses(
  vendorId: string,
  input: Parameters<typeof vendorService.updateWarehouses>[1],
) {
  await assertVendorExists(vendorId);
  return vendorService.updateWarehouses(vendorId, input);
}

export async function updateVendorYards(
  vendorId: string,
  input: Parameters<typeof vendorService.updateYards>[1],
) {
  await assertVendorExists(vendorId);
  return vendorService.updateYards(vendorId, input);
}

export async function updateVendorBank(
  vendorId: string,
  input: Parameters<typeof vendorService.updateBank>[1],
) {
  await assertVendorExists(vendorId);
  return vendorService.updateBank(vendorId, input);
}

export async function updateVendorCoverage(
  vendorId: string,
  input: Parameters<typeof vendorService.updateCoverage>[1],
) {
  await assertVendorExists(vendorId);
  return vendorService.updateCoverage(vendorId, input);
}

export async function updateVendorAccreditation(
  vendorId: string,
  input: Parameters<typeof vendorService.updateAccreditation>[1],
) {
  await assertVendorExists(vendorId);
  return vendorService.updateAccreditation(vendorId, input, { resetVerification: false });
}

export async function updateVendorInsurances(
  vendorId: string,
  input: Parameters<typeof vendorService.updateInsurances>[1],
) {
  await assertVendorExists(vendorId);
  return vendorService.updateInsurances(vendorId, input, { resetVerification: false });
}

export async function addVendorDocument(
  vendorId: string,
  input: Parameters<typeof vendorService.addDocument>[1],
) {
  await assertVendorExists(vendorId);
  return vendorService.addDocument(vendorId, input);
}

export async function updateVendorDocument(
  vendorId: string,
  documentId: string,
  data: { category: string | null; issueDate: Date | null; expiryDate: Date | null },
) {
  await assertVendorExists(vendorId);
  return vendorService.updateDocument(vendorId, documentId, data);
}

export async function deleteVendorDocument(vendorId: string, documentId: string) {
  await assertVendorExists(vendorId);
  return vendorService.deleteDocument(vendorId, documentId);
}

/**
 * Permanent delete. The row goes, and with it every vendor_* record hanging off
 * it, every session, every reset link and every file in blob storage. Nothing
 * is left behind a flag, so the email and phone are free again and the same
 * vendor can sign up with them later.
 *
 * There is no undo, and the confirmation in the Admin portal says so.
 */
export async function deleteVendor(vendorId: string) {
  await assertVendorExists(vendorId);

  // Read the blob keys while the rows still exist. Soft deleted documents are
  // included too: their blob may already be gone, and deleting a missing blob
  // is a no-op.
  const vendor = await prisma.vendor.findUniqueOrThrow({
    where: { id: vendorId },
    select: {
      id: true,
      email: true,
      documents: { select: { id: true, storageKey: true } },
    },
  });

  await prisma.$transaction([
    // actorType/actorId is not a foreign key, so these do not cascade.
    prisma.refreshToken.deleteMany({ where: { actorType: 'VENDOR', actorId: vendorId } }),
    prisma.passwordResetToken.deleteMany({ where: { actorType: 'VENDOR', actorId: vendorId } }),
    // Every vendor_* child row cascades from this one.
    prisma.vendor.delete({ where: { id: vendorId } }),
  ]);

  await removeStoredFiles(vendor.documents, 'vendor');

  return { id: vendor.id, email: vendor.email };
}

/**
 * Verification decision on a vendor's whole application.
 *
 * Unlike the driver flow this does not insist the application was submitted
 * first: a vendor's compliance pack is long, and an admin who has seen the
 * paperwork elsewhere is allowed to sign it off without waiting for the last
 * upload to land.
 */
export async function reviewVendor(
  vendorId: string,
  input: { decision: 'APPROVED' | 'REJECTED' | 'UNDER_REVIEW'; reason: string | null },
  adminId: string,
) {
  await assertVendorExists(vendorId);

  const now = new Date();

  const data: Prisma.VendorUpdateInput =
    input.decision === 'APPROVED'
      ? { onboardingStatus: 'APPROVED', approvedAt: now, rejectionReason: null, status: 'ACTIVE' }
      : input.decision === 'REJECTED'
        ? { onboardingStatus: 'REJECTED', approvedAt: null, rejectionReason: input.reason }
        : { onboardingStatus: 'UNDER_REVIEW', approvedAt: null };

  const updated = await prisma.vendor.update({
    where: { id: vendorId },
    data,
    select: VENDOR_LIST_FIELDS,
  });

  // Approving the application accepts the paperwork behind it, so every section
  // that was still waiting is marked verified in the same breath.
  if (input.decision === 'APPROVED') {
    const verified = { verificationStatus: 'VERIFIED' as const, verifiedAt: now, verifiedBy: adminId };
    await prisma.$transaction([
      prisma.vendorAccreditation.updateMany({ where: { vendorId }, data: verified }),
      prisma.vendorInsurance.updateMany({ where: { vendorId }, data: verified }),
    ]);
  }

  return updated;
}

/** The vendor sections an admin can verify one at a time. */
export type ReviewableVendorSection =
  | 'accreditation'
  | 'productLiability'
  | 'publicLiability'
  | 'workCover'
  | 'marineGeneral'
  | 'marineAlcohol'
  | 'coc';

const VENDOR_INSURANCE_SECTION: Record<
  Exclude<ReviewableVendorSection, 'accreditation'>,
  VendorInsuranceType
> = {
  productLiability: 'PRODUCT_LIABILITY',
  publicLiability: 'PUBLIC_LIABILITY',
  workCover: 'WORK_COVER',
  marineGeneral: 'MARINE_GENERAL',
  marineAlcohol: 'MARINE_ALCOHOL',
  coc: 'COC',
};

export async function reviewVendorSection(
  vendorId: string,
  section: ReviewableVendorSection,
  input: { status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'EXPIRED'; remarks: string | null },
  adminId: string,
) {
  await assertVendorExists(vendorId);

  const data = {
    verificationStatus: input.status,
    remarks: input.remarks,
    verifiedAt: input.status === 'PENDING' ? null : new Date(),
    verifiedBy: input.status === 'PENDING' ? null : adminId,
  };

  const result =
    section === 'accreditation'
      ? await prisma.vendorAccreditation.updateMany({ where: { vendorId }, data })
      : await prisma.vendorInsurance.updateMany({
          where: { vendorId, type: VENDOR_INSURANCE_SECTION[section] },
          data,
        });

  if (result.count === 0) {
    throw ApiError.notFound('This vendor has not filled in that section yet.');
  }

  return { vendorId, section, status: input.status };
}

async function assertVendorExists(vendorId: string) {
  const vendor = await prisma.vendor.findFirst({
    where: { id: vendorId, deletedAt: null },
    select: { id: true, onboardingStatus: true },
  });
  if (!vendor) throw ApiError.notFound('Vendor not found');
  return vendor;
}

// ---------------------------------------------------------------------------
// Vendor documents, read only from here
// ---------------------------------------------------------------------------

async function getVendorDocument(vendorId: string, documentId: string) {
  const document = await prisma.vendorDocument.findFirst({
    where: { id: documentId, vendorId, deletedAt: null },
  });
  if (!document) throw ApiError.notFound('Document not found');
  return document;
}

/** Signed link so an admin can open a vendor's file straight from blob storage. */
export async function createVendorDocumentLink(vendorId: string, documentId: string) {
  const document = await getVendorDocument(vendorId, documentId);
  const link = await storage.createSignedLink({
    storageKey: document.storageKey,
    fileName: document.fileName,
    fallbackPath: `/api/admin/vendors/${vendorId}/documents/${document.id}/file`,
    // A vendor's documents stay in the vendor container whoever reads them.
    area: 'vendor',
  });

  return {
    documentId: document.id,
    fileName: document.fileName,
    mimeType: document.mimeType,
    url: link.url,
    expiresAt: link.expiresAt,
  };
}

export async function openVendorDocument(vendorId: string, documentId: string) {
  const document = await getVendorDocument(vendorId, documentId);
  const file = await storage.openFile(document.storageKey, document.mimeType, 'vendor');
  return { document, file };
}

// ---------------------------------------------------------------------------
// Customers - read
// ---------------------------------------------------------------------------

export interface CustomerListQuery {
  search?: string;
  onboardingStatus?: OnboardingStatus;
  page: number;
  pageSize: number;
  sortBy: 'createdAt' | 'submittedAt' | 'companyName' | 'firstName' | 'email' | 'onboardingStatus';
  sortDir: 'asc' | 'desc';
}

export async function listCustomers(query: CustomerListQuery) {
  const where: Prisma.CustomerWhereInput = { deletedAt: null };

  if (query.onboardingStatus) where.onboardingStatus = query.onboardingStatus;

  if (query.search) {
    const contains = { contains: query.search, mode: 'insensitive' } as const;
    where.OR = [
      { firstName: contains },
      { lastName: contains },
      { companyName: contains },
      { legalName: contains },
      // A scalar list has no substring filter, so a trading name matches only
      // in full. Company and legal name still answer a partial search.
      { tradingNames: { has: query.search } },
      { cid: contains },
      { accountNumber: contains },
      { abn: contains },
      { email: contains },
      { phone: contains },
      // The account phone is often empty, so a search for a customer's number
      // has to look at the contact numbers they actually filled in as well.
      { contacts: { some: { contactNumber: contains } } },
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      orderBy: { [query.sortBy]: query.sortDir },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: {
        ...CUSTOMER_LIST_FIELDS,
        // `phone` is only set at signup; the onboarding form asks each
        // department for its own number, so those come too and the admin views
        // fall back to them.
        contacts: { select: { type: true, contactNumber: true } },
        billing: { select: { term: true, billingType: true } },
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

/** One customer in full, including every onboarding section and document. */
export async function getCustomer(customerId: string) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, deletedAt: null },
    include: {
      contacts: true,
      directors: { orderBy: { position: 'asc' } },
      addresses: true,
      billing: true,
      documents: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } },
    },
  });

  if (!customer) throw ApiError.notFound('Customer not found');

  const { passwordHash: _passwordHash, ...safeCustomer } = customer;
  return safeCustomer;
}

// ---------------------------------------------------------------------------
// Customers - write
// ---------------------------------------------------------------------------

export interface CreateCustomerInput {
  email: string;
  password: string;
  phone: string | null;
  firstName: string;
  lastName: string | null;
  companyName: string | null;
  designation: string | null;
  tradingNames: string[];
  legalName: string | null;
  abn: string | null;
  acn: string | null;
  abnStatus: string | null;
  entityType: string | null;
  gst: string | null;
  websiteAddress: string | null;
  creationDate: Date | null;
  status?: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
}

/**
 * Creates the account, and hands it its CID in the same breath.
 *
 * The reference is allocated here rather than trusted from the client, and a
 * concurrent create taking the same number is refused by the unique index
 * (P2002), which simply moves this on to the next one. The CAN account number
 * the booking form reads is allocated on the first onboarding load, the same
 * way it is for a customer who signed themselves up.
 */
export async function createCustomer(input: CreateCustomerInput) {
  const email = input.email.trim().toLowerCase();

  const existing = await prisma.customer.findUnique({ where: { email } });
  if (existing) throw ApiError.conflict('A customer account with this email already exists.');

  const data = {
    email,
    passwordHash: await hashPassword(input.password),
    phone: input.phone,
    firstName: input.firstName,
    lastName: input.lastName,
    companyName: input.companyName,
    designation: input.designation,
    tradingNames: input.tradingNames,
    legalName: input.legalName,
    abn: input.abn,
    acn: input.acn,
    abnStatus: input.abnStatus,
    entityType: input.entityType,
    gst: input.gst,
    websiteAddress: input.websiteAddress,
    creationDate: input.creationDate,
    // An admin created account is usable straight away; the customer still has
    // to complete onboarding before it can be approved.
    status: input.status ?? ('ACTIVE' as const),
    emailVerifiedAt: new Date(),
  };

  const taken = await prisma.customer.count({ where: { cid: { not: null } } });

  for (let attempt = 0; attempt < 25; attempt += 1) {
    try {
      return await prisma.customer.create({
        data: { ...data, cid: customerService.nextCidCandidate(taken, attempt) },
        select: CUSTOMER_LIST_FIELDS,
      });
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code !== 'P2002') throw error;
      // Someone took this number between the count and the insert; try the next.
    }
  }

  throw ApiError.internal('Could not assign a customer ID');
}

export type UpdateCustomerInput = Partial<Omit<CreateCustomerInput, 'password'>>;

/**
 * Updates a customer's account details.
 *
 * The email is editable from here, unlike in the customer's own profile, for
 * the same reason it is on a driver or a vendor: correcting an address somebody
 * mistyped at signup is a fix only an admin can make.
 */
export async function updateCustomer(customerId: string, input: UpdateCustomerInput) {
  await assertCustomerExists(customerId);

  const { email, ...rest } = input;
  const data: Prisma.CustomerUpdateInput = { ...rest };

  if (email !== undefined) {
    const normalised = email.trim().toLowerCase();
    const clash = await prisma.customer.findFirst({
      where: { email: normalised, id: { not: customerId } },
      select: { id: true },
    });
    if (clash) throw ApiError.conflict('Another customer account already uses this email.');
    data.email = normalised;
  }

  return prisma.customer.update({
    where: { id: customerId },
    data,
    select: CUSTOMER_LIST_FIELDS,
  });
}

/** Replaces a customer's password. See setDriverPassword: same rules. */
export async function setCustomerPassword(customerId: string, password: string) {
  await assertCustomerExists(customerId);

  const [customer] = await prisma.$transaction([
    prisma.customer.update({
      where: { id: customerId },
      data: {
        passwordHash: await hashPassword(password),
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
      select: { id: true, email: true },
    }),
    prisma.refreshToken.updateMany({
      where: { actorType: 'CUSTOMER', actorId: customerId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
    prisma.passwordResetToken.updateMany({
      where: { actorType: 'CUSTOMER', actorId: customerId, usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);

  return customer;
}

// ---------------------------------------------------------------------------
// Customers - the onboarding record
//
// The same arrangement as the driver and vendor equivalents above: the customer
// portal already knows how to write every one of these sections, so these
// delegate to it and add the admin 404.
// ---------------------------------------------------------------------------

export async function updateCustomerCompany(
  customerId: string,
  input: Parameters<typeof customerService.updateCompany>[1],
) {
  await assertCustomerExists(customerId);
  return customerService.updateCompany(customerId, input);
}

export async function updateCustomerContacts(
  customerId: string,
  input: Parameters<typeof customerService.updateContacts>[1],
) {
  await assertCustomerExists(customerId);
  return customerService.updateContacts(customerId, input);
}

export async function updateCustomerDirectors(
  customerId: string,
  input: Parameters<typeof customerService.updateDirectors>[1],
) {
  await assertCustomerExists(customerId);
  return customerService.updateDirectors(customerId, input);
}

export async function updateCustomerAddresses(
  customerId: string,
  input: Parameters<typeof customerService.updateAddresses>[1],
) {
  await assertCustomerExists(customerId);
  return customerService.updateAddresses(customerId, input);
}

export async function updateCustomerBilling(
  customerId: string,
  input: Parameters<typeof customerService.updateBilling>[1],
) {
  await assertCustomerExists(customerId);
  return customerService.updateBilling(customerId, input);
}

export async function addCustomerDocument(
  customerId: string,
  input: Parameters<typeof customerService.addDocument>[1],
) {
  await assertCustomerExists(customerId);
  return customerService.addDocument(customerId, input);
}

export async function updateCustomerDocument(
  customerId: string,
  documentId: string,
  data: { category: string | null; issueDate: Date | null; expiryDate: Date | null },
) {
  await assertCustomerExists(customerId);
  return customerService.updateDocument(customerId, documentId, data);
}

export async function deleteCustomerDocument(customerId: string, documentId: string) {
  await assertCustomerExists(customerId);
  return customerService.deleteDocument(customerId, documentId);
}

/**
 * Permanent delete, the same contract as a driver or a vendor. The row goes,
 * and with it every customer_* record hanging off it, every session, every
 * reset link and every file in blob storage. Nothing is left behind a flag, so
 * the email and phone are free again.
 */
export async function deleteCustomer(customerId: string) {
  await assertCustomerExists(customerId);

  // Read the blob keys while the rows still exist. Soft deleted documents are
  // included too: their blob may already be gone, and deleting a missing blob
  // is a no-op.
  const customer = await prisma.customer.findUniqueOrThrow({
    where: { id: customerId },
    select: {
      id: true,
      email: true,
      documents: { select: { id: true, storageKey: true } },
    },
  });

  await prisma.$transaction([
    // actorType/actorId is not a foreign key, so these do not cascade.
    prisma.refreshToken.deleteMany({ where: { actorType: 'CUSTOMER', actorId: customerId } }),
    prisma.passwordResetToken.deleteMany({
      where: { actorType: 'CUSTOMER', actorId: customerId },
    }),
    // Every customer_* child row cascades from this one.
    prisma.customer.delete({ where: { id: customerId } }),
  ]);

  await removeStoredFiles(customer.documents, 'customer');

  return { id: customer.id, email: customer.email };
}

/**
 * Verification decision on a customer's application. Like the vendor flow, and
 * unlike the driver one, this does not insist the application was submitted
 * first: an admin who has the paperwork in front of them can sign it off.
 */
export async function reviewCustomer(
  customerId: string,
  input: { decision: 'APPROVED' | 'REJECTED' | 'UNDER_REVIEW'; reason: string | null },
) {
  await assertCustomerExists(customerId);

  const now = new Date();

  const data: Prisma.CustomerUpdateInput =
    input.decision === 'APPROVED'
      ? { onboardingStatus: 'APPROVED', approvedAt: now, rejectionReason: null, status: 'ACTIVE' }
      : input.decision === 'REJECTED'
        ? { onboardingStatus: 'REJECTED', approvedAt: null, rejectionReason: input.reason }
        : { onboardingStatus: 'UNDER_REVIEW', approvedAt: null };

  return prisma.customer.update({
    where: { id: customerId },
    data,
    select: CUSTOMER_LIST_FIELDS,
  });
}

async function assertCustomerExists(customerId: string) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, deletedAt: null },
    select: { id: true, onboardingStatus: true },
  });
  if (!customer) throw ApiError.notFound('Customer not found');
  return customer;
}

// ---------------------------------------------------------------------------
// Customer documents, read only from here
// ---------------------------------------------------------------------------

async function getCustomerDocument(customerId: string, documentId: string) {
  const document = await prisma.customerDocument.findFirst({
    where: { id: documentId, customerId, deletedAt: null },
  });
  if (!document) throw ApiError.notFound('Document not found');
  return document;
}

/** Signed link so an admin can open a customer's file straight from storage. */
export async function createCustomerDocumentLink(customerId: string, documentId: string) {
  const document = await getCustomerDocument(customerId, documentId);
  const link = await storage.createSignedLink({
    storageKey: document.storageKey,
    fileName: document.fileName,
    fallbackPath: `/api/admin/customers/${customerId}/documents/${document.id}/file`,
    // A customer's documents stay in the customer container whoever reads them.
    area: 'customer',
  });

  return {
    documentId: document.id,
    fileName: document.fileName,
    mimeType: document.mimeType,
    url: link.url,
    expiresAt: link.expiresAt,
  };
}

export async function openCustomerDocument(customerId: string, documentId: string) {
  const document = await getCustomerDocument(customerId, documentId);
  const file = await storage.openFile(document.storageKey, document.mimeType, 'customer');
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
