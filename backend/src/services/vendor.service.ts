import { prisma } from '../config/prisma';
import { ApiError } from '../utils/apiError';
import { logger } from '../utils/logger';
import * as storage from './storage.service';
import type {
  Prisma,
  VendorAddress,
  VendorAddressType,
  VendorContactType,
  VendorDocumentType,
  VendorInsuranceType,
} from '@prisma/client';

/** Vendor documents live in their own container, away from driver files. */
const VENDOR_AREA = 'vendor' as const;

/**
 * Where the generated vendor reference starts counting from. The first
 * vendor is BIVRY-5000 and it runs on from there, one per vendor.
 *
 * Changing either of these renumbers nothing on its own: the references already
 * handed out are rewritten by a migration, and this only decides what the next
 * one looks like. Keep the two in step.
 */
const VENDOR_CODE_PREFIX = 'BIVRY-';
const VENDOR_CODE_BASE = 5000;

/** Everything the onboarding wizard needs to render and resume. */
export async function getOnboarding(vendorId: string) {
  await ensureVendorCode(vendorId);

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

/**
 * Hands this vendor its reference number the first time they open the form.
 *
 * The number is derived from how many vendors already hold one, so it reads
 * as a running count rather than a random string. Two accounts opening the form
 * at the same instant can land on the same candidate, which the unique index
 * refuses - so a clash simply tries the next one.
 */
async function ensureVendorCode(vendorId: string): Promise<void> {
  const vendor = await prisma.vendor.findFirst({
    where: { id: vendorId, deletedAt: null },
    select: { id: true, vendorCode: true, supplierId: true },
  });
  if (!vendor) throw ApiError.notFound('Vendor not found');
  if (vendor.vendorCode) return;

  // A row a build from before the rename created carries the reference under the
  // old name and nothing under the new one. It is the same number, so it is
  // adopted rather than replaced: a vendor's reference is on their paperwork and
  // in their inbox, and must not move underneath them.
  if (vendor.supplierId) {
    await prisma.vendor.update({
      where: { id: vendorId },
      data: { vendorCode: vendor.supplierId },
    });
    return;
  }

  // Either column counts as a reference already handed out, so that a number
  // allocated by the older build is never handed to somebody else as well.
  const taken = await prisma.vendor.count({
    where: { OR: [{ vendorCode: { not: null } }, { supplierId: { not: null } }] },
  });

  for (let attempt = 0; attempt < 25; attempt += 1) {
    const candidate = `${VENDOR_CODE_PREFIX}${VENDOR_CODE_BASE + taken + attempt}`;
    try {
      await prisma.vendor.update({
        where: { id: vendorId },
        // Written under both names: see the note on `supplierId` in the schema.
        data: { vendorCode: candidate, supplierId: candidate },
      });
      return;
    } catch (error) {
      // P2002 is the unique index refusing a number somebody else just took.
      const code = (error as { code?: string }).code;
      if (code !== 'P2002') throw error;
    }
  }

  // Not fatal: the form works without a reference, and the next load tries again.
  logger.warn(`Could not allocate a vendor code for vendor ${vendorId}`);
}

// ---------------------------------------------------------------------------
// Company and contacts
// ---------------------------------------------------------------------------

/**
 * The value the superseded `tradingName` column should hold.
 *
 * Nothing reads that column here any more, but a deployed build from before
 * trading names became a list still does, so it is kept correct rather than
 * left to rot. It goes when the column goes.
 */
export function legacyTradingName(tradingNames: string[]): string | null {
  return tradingNames[0] ?? null;
}

export interface CompanyInput {
  companyName: string | null;
  tradingNames: string[];
  legalName: string | null;
  abn: string | null;
  acn: string | null;
  abnStatus: string | null;
  entityType: string | null;
  gst: string | null;
  websiteAddress: string | null;
  phone: string | null;
  contactPerson: string | null;
}

export async function updateCompany(vendorId: string, data: CompanyInput) {
  await touchOnboarding(vendorId);

  const vendor = await prisma.vendor.update({
    where: { id: vendorId },
    data: {
      // The account always has a company name, so a draft that left the field
      // empty keeps the one already stored rather than blanking it.
      ...(data.companyName ? { companyName: data.companyName } : {}),
      tradingNames: data.tradingNames,
      tradingName: legacyTradingName(data.tradingNames),
      legalName: data.legalName,
      abn: data.abn,
      acn: data.acn,
      abnStatus: data.abnStatus,
      entityType: data.entityType,
      gst: data.gst,
      websiteAddress: data.websiteAddress,
      phone: data.phone,
      contactPerson: data.contactPerson,
    },
  });

  const { passwordHash: _passwordHash, ...safeVendor } = vendor;
  return safeVendor;
}

export interface ContactInput {
  type: VendorContactType;
  contactPerson: string | null;
  designation: string | null;
  contactNumber: string | null;
  email: string | null;
}

export interface ContactsInput {
  contacts: ContactInput[];
  invoicePreference: string | null;
  invoiceEmails: string[];
  invoiceOther: string | null;
}

export async function updateContacts(vendorId: string, input: ContactsInput) {
  for (const contact of input.contacts) {
    const { type, ...values } = contact;
    await prisma.vendorContact.upsert({
      where: { vendorId_type: { vendorId, type } },
      create: { vendorId, type, ...values },
      update: values,
    });
  }

  await prisma.vendor.update({
    where: { id: vendorId },
    data: {
      invoicePreference: input.invoicePreference,
      invoiceEmails: input.invoiceEmails,
      invoiceOther: input.invoiceOther,
    },
  });

  await touchOnboarding(vendorId);
  return prisma.vendorContact.findMany({ where: { vendorId } });
}

// ---------------------------------------------------------------------------
// Repeating sections
// ---------------------------------------------------------------------------

export interface DirectorInput {
  designation: string | null;
  email: string | null;
  contactNumber: string | null;
}

/**
 * Replaces the whole list in one transaction.
 *
 * These rows have no meaning on their own - they are the section as the
 * vendor last left it - so rewriting them is both simpler and more correct
 * than trying to match a row on screen back to one in the table.
 */
export async function updateDirectors(vendorId: string, directors: DirectorInput[]) {
  await prisma.$transaction([
    prisma.vendorDirector.deleteMany({ where: { vendorId } }),
    prisma.vendorDirector.createMany({
      data: directors.map((director, position) => ({ vendorId, position, ...director })),
    }),
  ]);

  await touchOnboarding(vendorId);
  return prisma.vendorDirector.findMany({ where: { vendorId }, orderBy: { position: 'asc' } });
}

export interface WarehouseInput {
  street1: string | null;
  street2: string | null;
  suburb: string | null;
  state: string | null;
  country: string | null;
  postCode: string | null;
}

export interface AddressInput {
  street1: string | null;
  street2: string | null;
  suburb: string | null;
  state: string | null;
  country: string | null;
  postCode: string | null;
}

export interface AddressesInput {
  /** Whether the vendor ticked the billing address as a copy. */
  billingSameAsPrincipal: boolean;
  principal: AddressInput;
  billing: AddressInput;
}

/**
 * The two addresses the company is registered at.
 *
 * Both rows are written even when the tick says they are the same, so anything
 * reading the billing address gets an address rather than a flag it has to know
 * how to follow. The caller sends the copy; the tick only remembers how the
 * form was filled in, so it comes back ticked.
 */
export async function updateAddresses(vendorId: string, input: AddressesInput) {
  const rows: Array<{ type: VendorAddressType; data: AddressInput }> = [
    { type: 'PRINCIPAL', data: input.principal },
    { type: 'BILLING', data: input.billing },
  ];

  await prisma.$transaction([
    prisma.vendor.update({
      where: { id: vendorId },
      data: { billingSameAsPrincipal: input.billingSameAsPrincipal },
    }),
    ...rows.map((row) =>
      prisma.vendorAddress.upsert({
        where: { vendorId_type: { vendorId, type: row.type } },
        create: { vendorId, type: row.type, ...row.data },
        update: row.data,
      }),
    ),
  ]);

  await touchOnboarding(vendorId);
  return prisma.vendorAddress.findMany({ where: { vendorId } });
}

export async function updateWarehouses(vendorId: string, warehouses: WarehouseInput[]) {
  await prisma.$transaction([
    prisma.vendorWarehouse.deleteMany({ where: { vendorId } }),
    prisma.vendorWarehouse.createMany({
      data: warehouses.map((warehouse, position) => ({ vendorId, position, ...warehouse })),
    }),
  ]);

  await touchOnboarding(vendorId);
  return prisma.vendorWarehouse.findMany({ where: { vendorId }, orderBy: { position: 'asc' } });
}

/**
 * The yards, replaced wholesale in the order they were entered.
 *
 * Same shape as the warehouses and the same wholesale replace, but a table of
 * its own: a yard is a site the vendor parks or stages at, not somewhere
 * freight is collected from or delivered to.
 */
export async function updateYards(vendorId: string, yards: WarehouseInput[]) {
  await prisma.$transaction([
    prisma.vendorYard.deleteMany({ where: { vendorId } }),
    prisma.vendorYard.createMany({
      data: yards.map((yard, position) => ({ vendorId, position, ...yard })),
    }),
  ]);

  await touchOnboarding(vendorId);
  return prisma.vendorYard.findMany({ where: { vendorId }, orderBy: { position: 'asc' } });
}

// ---------------------------------------------------------------------------
// One to one sections
// ---------------------------------------------------------------------------

export interface BankInput {
  accountName: string | null;
  bankName: string | null;
  bsb: string | null;
  accountNumber: string | null;
}

export async function updateBank(vendorId: string, data: BankInput) {
  const result = await prisma.vendorBankDetail.upsert({
    where: { vendorId },
    create: { vendorId, ...data },
    update: data,
  });

  await touchOnboarding(vendorId);
  return result;
}

export interface CoverageInput {
  areasCovered: string[];
  businessOperations: string[];
}

export async function updateCoverage(vendorId: string, data: CoverageInput) {
  const result = await prisma.vendorCoverage.upsert({
    where: { vendorId },
    create: { vendorId, ...data },
    update: data,
  });

  await touchOnboarding(vendorId);
  return result;
}

export interface AccreditationInput {
  accreditationNumber: string | null;
  massManagementExpiry: Date | null;
  basicFatigueExpiry: Date | null;
  dangerousGoodsExpiry: Date | null;
  nhvasExpiry: Date | null;
  haccpExpiry: Date | null;
}

export async function updateAccreditation(
  vendorId: string,
  data: AccreditationInput,
  options: { resetVerification?: boolean } = {},
) {
  // A vendor editing their own section invalidates whatever decision was made
  // on it, so it goes back in the queue. An admin editing it is the person who
  // makes that decision, so their correction leaves the verification alone.
  const resetVerification = options.resetVerification ?? true;

  const result = await prisma.vendorAccreditation.upsert({
    where: { vendorId },
    create: { vendorId, ...data },
    update: resetVerification ? { ...data, verificationStatus: 'PENDING' } : { ...data },
  });

  await touchOnboarding(vendorId);
  return result;
}

export interface InsuranceInput {
  type: VendorInsuranceType;
  policyNumber: string | null;
  insurer: string | null;
  expiryDate: Date | null;
  sumAssured: string | null;
  employerNumber: string | null;
  validFrom: Date | null;
  validTill: Date | null;
  dueInDays: number | null;
}

export async function updateInsurances(
  vendorId: string,
  insurances: InsuranceInput[],
  options: { resetVerification?: boolean } = {},
) {
  const resetVerification = options.resetVerification ?? true;

  for (const insurance of insurances) {
    const { type, ...values } = insurance;
    await prisma.vendorInsurance.upsert({
      where: { vendorId_type: { vendorId, type } },
      create: { vendorId, type, ...values },
      update: resetVerification ? { ...values, verificationStatus: 'PENDING' } : { ...values },
    });
  }

  await touchOnboarding(vendorId);
  return prisma.vendorInsurance.findMany({ where: { vendorId } });
}

async function touchOnboarding(vendorId: string): Promise<void> {
  await prisma.vendor.updateMany({
    where: { id: vendorId, onboardingStatus: 'NOT_STARTED' },
    data: { onboardingStatus: 'IN_PROGRESS' },
  });
}

export async function saveProgress(vendorId: string, step: number) {
  return prisma.vendor.update({
    where: { id: vendorId },
    data: { onboardingStep: step, onboardingStatus: 'IN_PROGRESS' },
    select: { id: true, onboardingStep: true, onboardingStatus: true },
  });
}

// ---------------------------------------------------------------------------
// Submission
// ---------------------------------------------------------------------------

/** The compliance documents every vendor has to hand in, in the form's order. */
export const REQUIRED_COMPLIANCE_DOCS: Array<{ docType: VendorDocumentType; label: string }> = [
  { docType: 'COMPLIANCE_DRUG', label: 'Drug' },
  { docType: 'COMPLIANCE_ALCOHOL_POLICY', label: 'Alcohol Policy' },
  { docType: 'COMPLIANCE_PROCEDURE', label: 'Procedure' },
  { docType: 'COMPLIANCE_RISK_MANAGEMENT', label: 'Risk Management Policy' },
  { docType: 'COMPLIANCE_SPEED_POLICY', label: 'Speed Policy' },
  { docType: 'COMPLIANCE_FATIGUE_POLICY', label: 'Fatigue Policy & Presentation System' },
  { docType: 'COMPLIANCE_GPS_SNAPSHOT', label: 'GPS Snapshot' },
  { docType: 'COMPLIANCE_WHS_POLICY', label: 'Work Health & Safety Policy' },
];

/**
 * Whether a registered address has everything the form asks for.
 *
 * Street 2 is left out on purpose: it carries a unit, a level or a building
 * name, and plenty of addresses have none. `useVendorProgress` on the frontend
 * judges an address the same way, so a form that reads as complete is one this
 * will accept.
 */
function isWholeAddress(address: VendorAddress | undefined): boolean {
  return Boolean(
    address?.street1 &&
      address.suburb &&
      address.state &&
      address.country &&
      address.postCode,
  );
}

export async function submitOnboarding(vendorId: string) {
  const vendor = await prisma.vendor.findFirst({
    where: { id: vendorId, deletedAt: null },
    include: {
      bankDetail: true,
      addresses: true,
      warehouses: true,
      accreditation: true,
      documents: { where: { deletedAt: null }, select: { docType: true } },
    },
  });

  if (!vendor) throw ApiError.notFound('Vendor not found');
  if (vendor.onboardingStatus === 'SUBMITTED' || vendor.onboardingStatus === 'UNDER_REVIEW') {
    throw ApiError.badRequest('Your application has already been submitted.');
  }

  const missing: string[] = [];
  if (!vendor.abn) missing.push('ABN');
  if (!vendor.bankDetail?.accountNumber) missing.push('Bank account number');

  // Both registered addresses are asked for. The billing one is sent as a copy
  // of the principal when the form's tick says they match, so there is always a
  // row for each and nothing here has to follow the flag.
  const addresses = new Map(vendor.addresses.map((address) => [address.type, address]));
  if (!isWholeAddress(addresses.get('PRINCIPAL'))) missing.push('Principal address');
  if (!isWholeAddress(addresses.get('BILLING'))) missing.push('Billing address');

  if (vendor.warehouses.length === 0) missing.push('Warehouse address');
  if (!vendor.accreditation?.accreditationNumber) missing.push('Accreditation number');

  const held = new Set(vendor.documents.map((document) => document.docType));
  for (const required of REQUIRED_COMPLIANCE_DOCS) {
    if (!held.has(required.docType)) missing.push(required.label);
  }

  if (missing.length > 0) {
    throw ApiError.badRequest(`Please complete these first: ${missing.join(', ')}`);
  }

  return prisma.vendor.update({
    where: { id: vendorId },
    data: { onboardingStatus: 'SUBMITTED', submittedAt: new Date() },
    select: { id: true, onboardingStatus: true, submittedAt: true },
  });
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

export async function addDocument(
  vendorId: string,
  input: {
    docType: VendorDocumentType;
    category: string | null;
    issueDate: Date | null;
    expiryDate: Date | null;
    fileName: string;
    mimeType: string;
    sizeInBytes: number;
    buffer: Buffer;
  },
) {
  const { buffer, ...meta } = input;

  const storageKey = storage.buildStorageKey({
    role: 'vendor',
    actorId: vendorId,
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
    area: VENDOR_AREA,
  });

  // Single slot document types replace whatever was there before. The extra
  // compliance rows a vendor adds themselves are the one type that stacks.
  const replaced =
    input.docType === 'COMPLIANCE_ADDITIONAL'
      ? []
      : await prisma.vendorDocument.findMany({
          where: { vendorId, docType: input.docType, deletedAt: null },
          select: { id: true, storageKey: true },
        });

  if (replaced.length > 0) {
    await prisma.vendorDocument.updateMany({
      where: { id: { in: replaced.map((row) => row.id) } },
      data: { deletedAt: new Date() },
    });
  }

  const document = await prisma.vendorDocument.create({
    data: { vendorId, ...meta, storageKey: stored.storageKey, storageUrl: stored.storageUrl },
  });

  // The superseded blobs are no longer referenced, so drop them.
  for (const row of replaced) {
    await removeStoredFile(row.storageKey, row.id);
  }

  if (input.docType === 'COMPANY_LOGO') {
    await prisma.vendor.update({
      where: { id: vendorId },
      data: { logoUrl: `/api/vendor/documents/${document.id}/file` },
    });
  }

  await touchOnboarding(vendorId);
  return document;
}

export async function listDocuments(vendorId: string, docType?: VendorDocumentType) {
  const where: Prisma.VendorDocumentWhereInput = { vendorId, deletedAt: null };
  if (docType) where.docType = docType;
  return prisma.vendorDocument.findMany({ where, orderBy: { createdAt: 'asc' } });
}

export async function getDocumentForVendor(vendorId: string, documentId: string) {
  const document = await prisma.vendorDocument.findFirst({
    where: { id: documentId, vendorId, deletedAt: null },
  });
  if (!document) throw ApiError.notFound('Document not found');
  return document;
}

/** Opens the stored file for an authenticated streaming download. */
export async function openDocument(vendorId: string, documentId: string) {
  const document = await getDocumentForVendor(vendorId, documentId);
  const file = await storage.openFile(document.storageKey, document.mimeType, VENDOR_AREA);
  return { document, file };
}

/**
 * Short lived direct link. On Azure this is a read only SAS URL the browser can
 * use in an `<img>` or `<a>` tag without an Authorization header; in local
 * development it falls back to the authenticated streaming route.
 */
export async function createDocumentLink(vendorId: string, documentId: string) {
  const document = await getDocumentForVendor(vendorId, documentId);
  const link = await storage.createSignedLink({
    storageKey: document.storageKey,
    fileName: document.fileName,
    fallbackPath: `/api/vendor/documents/${document.id}/file`,
    area: VENDOR_AREA,
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
    await storage.deleteFile(storageKey, VENDOR_AREA);
  } catch (error) {
    logger.warn(`Could not remove stored file for document ${documentId}`, error);
  }
}

/**
 * Corrects the metadata of a stored file. The bytes are never touched here:
 * replacing those means uploading again.
 */
export async function updateDocument(
  vendorId: string,
  documentId: string,
  data: { category: string | null; issueDate: Date | null; expiryDate: Date | null },
) {
  const document = await getDocumentForVendor(vendorId, documentId);

  const updated = await prisma.vendorDocument.update({
    where: { id: document.id },
    data,
  });

  await touchOnboarding(vendorId);
  return updated;
}

export async function deleteDocument(vendorId: string, documentId: string) {
  const document = await getDocumentForVendor(vendorId, documentId);

  await prisma.vendorDocument.update({
    where: { id: document.id },
    data: { deletedAt: new Date() },
  });

  await removeStoredFile(document.storageKey, document.id);

  if (document.docType === 'COMPANY_LOGO') {
    await prisma.vendor.update({ where: { id: vendorId }, data: { logoUrl: null } });
  }

  return { id: document.id };
}
