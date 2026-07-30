import { prisma } from '../config/prisma';
import { ApiError } from '../utils/apiError';
import { logger } from '../utils/logger';
import * as storage from './storage.service';
import type { AddressType, DriverDocumentType, Prisma } from '@prisma/client';

/** Everything the onboarding wizard needs to render and resume. */
export async function getOnboarding(driverId: string) {
  const driver = await prisma.driver.findFirst({
    where: { id: driverId, deletedAt: null },
    include: {
      addresses: true,
      licence: true,
      drivingHistory: true,
      policeVerification: true,
      visa: true,
      medical: true,
      drugTest: true,
      documents: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } },
    },
  });

  if (!driver) throw ApiError.notFound('Driver not found');

  const { passwordHash: _passwordHash, ...safeDriver } = driver;
  return safeDriver;
}

export async function updatePersonal(
  driverId: string,
  data: {
    firstName: string;
    middleName: string | null;
    lastName: string | null;
    dateOfBirth: Date | null;
    nationality: string | null;
    phone: string | null;
  },
) {
  const driver = await prisma.driver.update({
    where: { id: driverId },
    data: {
      firstName: data.firstName,
      middleName: data.middleName,
      lastName: data.lastName,
      dateOfBirth: data.dateOfBirth,
      nationality: data.nationality,
      phone: data.phone,
      onboardingStatus: 'IN_PROGRESS',
    },
  });

  const { passwordHash: _passwordHash, ...safeDriver } = driver;
  return safeDriver;
}

type AddressInput = {
  houseNumber: string | null;
  street: string | null;
  suburb: string | null;
  state: string | null;
  country: string | null;
  postCode: string | null;
};

async function upsertAddress(driverId: string, type: AddressType, data: AddressInput) {
  return prisma.driverAddress.upsert({
    where: { driverId_type: { driverId, type } },
    create: { driverId, type, ...data },
    update: data,
  });
}

export async function updateAddresses(
  driverId: string,
  input: {
    currentAddress: AddressInput;
    sameAsCurrent: boolean;
    permanentAddress?: AddressInput;
  },
) {
  const current = await upsertAddress(driverId, 'CURRENT', input.currentAddress);
  const permanentData = input.sameAsCurrent
    ? input.currentAddress
    : input.permanentAddress ?? input.currentAddress;
  const permanent = await upsertAddress(driverId, 'PERMANENT', permanentData);

  await touchOnboarding(driverId);
  return { current, permanent, sameAsCurrent: input.sameAsCurrent };
}

/**
 * The one-to-one onboarding sections all follow the same upsert shape, so they
 * share a single helper keyed by the Prisma model.
 */
type OneToOneSection =
  | 'licence'
  | 'drivingHistory'
  | 'policeVerification'
  | 'visa'
  | 'medical'
  | 'drugTest';

const SECTION_MODEL: Record<OneToOneSection, keyof typeof prisma> = {
  licence: 'driverLicence',
  drivingHistory: 'driverDrivingHistory',
  policeVerification: 'driverPoliceVerification',
  visa: 'driverVisa',
  medical: 'driverMedical',
  drugTest: 'driverDrugTest',
};

export async function upsertSection(
  driverId: string,
  section: OneToOneSection,
  data: Record<string, unknown>,
) {
  const modelName = SECTION_MODEL[section];
  const delegate = prisma[modelName] as unknown as {
    upsert(args: {
      where: { driverId: string };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }): Promise<unknown>;
  };

  const result = await delegate.upsert({
    where: { driverId },
    create: { driverId, ...data },
    // Editing a section sends it back for review.
    update: { ...data, verificationStatus: 'PENDING' },
  });

  await touchOnboarding(driverId);
  return result;
}

async function touchOnboarding(driverId: string): Promise<void> {
  await prisma.driver.updateMany({
    where: { id: driverId, onboardingStatus: 'NOT_STARTED' },
    data: { onboardingStatus: 'IN_PROGRESS' },
  });
}

export async function saveProgress(driverId: string, step: number) {
  return prisma.driver.update({
    where: { id: driverId },
    data: { onboardingStep: step, onboardingStatus: 'IN_PROGRESS' },
    select: { id: true, onboardingStep: true, onboardingStatus: true },
  });
}

export async function submitOnboarding(driverId: string) {
  const driver = await prisma.driver.findFirst({
    where: { id: driverId, deletedAt: null },
    include: { licence: true, addresses: true },
  });

  if (!driver) throw ApiError.notFound('Driver not found');
  if (driver.onboardingStatus === 'SUBMITTED' || driver.onboardingStatus === 'UNDER_REVIEW') {
    throw ApiError.badRequest('Your application has already been submitted.');
  }

  const missing: string[] = [];
  if (!driver.licence?.licenceNumber) missing.push('Licence number');
  if (!driver.licence?.expiryDate) missing.push('Licence expiry');
  if (!driver.addresses.some((address) => address.type === 'CURRENT')) {
    missing.push('Current address');
  }
  if (missing.length > 0) {
    throw ApiError.badRequest(`Please complete these first: ${missing.join(', ')}`);
  }

  return prisma.driver.update({
    where: { id: driverId },
    data: { onboardingStatus: 'SUBMITTED', submittedAt: new Date() },
    select: { id: true, onboardingStatus: true, submittedAt: true },
  });
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

export async function addDocument(
  driverId: string,
  input: {
    docType: DriverDocumentType;
    category: string | null;
    fileName: string;
    mimeType: string;
    sizeInBytes: number;
    buffer: Buffer;
  },
) {
  const { buffer, ...meta } = input;

  const storageKey = storage.buildStorageKey({
    role: 'driver',
    actorId: driverId,
    docType: input.docType,
    originalName: input.fileName,
  });

  // Upload first: a database row that points at a file which was never stored
  // is worse than an orphan blob, and orphans are cleaned up by the container
  // lifecycle rule.
  const stored = await storage.saveFile({
    storageKey,
    buffer,
    mimeType: input.mimeType,
    fileName: input.fileName,
  });

  // Single slot document types replace whatever was there before.
  const replaced =
    input.docType === 'ADDITIONAL'
      ? []
      : await prisma.driverDocument.findMany({
          where: { driverId, docType: input.docType, deletedAt: null },
          select: { id: true, storageKey: true },
        });

  if (replaced.length > 0) {
    await prisma.driverDocument.updateMany({
      where: { id: { in: replaced.map((row) => row.id) } },
      data: { deletedAt: new Date() },
    });
  }

  const document = await prisma.driverDocument.create({
    data: { driverId, ...meta, storageKey: stored.storageKey, storageUrl: stored.storageUrl },
  });

  // The superseded blobs are no longer referenced, so drop them.
  for (const row of replaced) {
    await removeStoredFile(row.storageKey, row.id);
  }

  if (input.docType === 'PROFILE_PHOTO') {
    await prisma.driver.update({
      where: { id: driverId },
      data: { avatarUrl: `/api/driver/documents/${document.id}/file` },
    });
  }

  await touchOnboarding(driverId);
  return document;
}

export async function listDocuments(driverId: string, docType?: DriverDocumentType) {
  const where: Prisma.DriverDocumentWhereInput = { driverId, deletedAt: null };
  if (docType) where.docType = docType;
  return prisma.driverDocument.findMany({ where, orderBy: { createdAt: 'asc' } });
}

export async function getDocumentForDriver(driverId: string, documentId: string) {
  const document = await prisma.driverDocument.findFirst({
    where: { id: documentId, driverId, deletedAt: null },
  });
  if (!document) throw ApiError.notFound('Document not found');
  return document;
}

/** Opens the stored file for an authenticated streaming download. */
export async function openDocument(driverId: string, documentId: string) {
  const document = await getDocumentForDriver(driverId, documentId);
  const file = await storage.openFile(document.storageKey, document.mimeType);
  return { document, file };
}

/**
 * Short lived direct link. On Azure this is a read only SAS URL the browser can
 * use in an `<img>` or `<a>` tag without an Authorization header; in local
 * development it falls back to the authenticated streaming route.
 */
export async function createDocumentLink(driverId: string, documentId: string) {
  const document = await getDocumentForDriver(driverId, documentId);
  const link = await storage.createSignedLink({
    storageKey: document.storageKey,
    fileName: document.fileName,
    fallbackPath: `/api/driver/documents/${document.id}/file`,
  });

  return {
    documentId: document.id,
    fileName: document.fileName,
    mimeType: document.mimeType,
    url: link.url,
    expiresAt: link.expiresAt,
  };
}

/** Best effort blob cleanup. A stale file must never fail the request. */
async function removeStoredFile(storageKey: string, documentId: string): Promise<void> {
  try {
    await storage.deleteFile(storageKey);
  } catch (error) {
    logger.warn(`Could not remove stored file for document ${documentId}`, error);
  }
}

export async function deleteDocument(driverId: string, documentId: string) {
  const document = await getDocumentForDriver(driverId, documentId);

  await prisma.driverDocument.update({
    where: { id: document.id },
    data: { deletedAt: new Date() },
  });

  await removeStoredFile(document.storageKey, document.id);

  if (document.docType === 'PROFILE_PHOTO') {
    await prisma.driver.update({ where: { id: driverId }, data: { avatarUrl: null } });
  }

  return { id: document.id };
}
