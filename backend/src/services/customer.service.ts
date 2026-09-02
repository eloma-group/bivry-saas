import { prisma } from '../config/prisma';
import { ApiError } from '../utils/apiError';
import { logger } from '../utils/logger';
import * as storage from './storage.service';
import type {
  CustomerAddress,
  CustomerAddressType,
  CustomerBillingType,
  CustomerContactType,
  CustomerDocumentType,
  Prisma,
} from '@prisma/client';

/** Customer documents live in their own container, away from every other role. */
const CUSTOMER_AREA = 'customer' as const;

/**
 * Where the generated customer reference starts counting from. The first
 * customer is BIVCST5000 and it runs on from there, one per customer.
 *
 * Changing either of these renumbers nothing on its own: the references already
 * handed out are rewritten by a migration, and this only decides what the next
 * one looks like. Keep the two in step.
 */
const CID_PREFIX = 'BIVCST';
const CID_BASE = 5000;

/**
 * The older account number series (CAN5000). Kept alongside the CID, and still
 * allocated, because bookings raised before this carry it. The booking form
 * reads the CID now: that is what the rest of the product quotes a customer by,
 * so it is what a booking's Customer Account Number should show.
 */
const ACCOUNT_NUMBER_PREFIX = 'CAN';
const ACCOUNT_NUMBER_BASE = 5000;

/** Everything the onboarding wizard needs to render and resume. */
export async function getOnboarding(customerId: string) {
  await ensureReferences(customerId);

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, deletedAt: null },
    include: {
      contacts: true,
      additionalContacts: { orderBy: { position: 'asc' } },
      directors: { orderBy: { position: 'asc' } },
      addresses: true,
      warehouses: { orderBy: { position: 'asc' } },
      billing: true,
      documents: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } },
    },
  });

  if (!customer) throw ApiError.notFound('Customer not found');

  const { passwordHash: _passwordHash, ...safeCustomer } = customer;
  return safeCustomer;
}

/**
 * Hands this customer its reference numbers the first time they open the form.
 *
 * Both numbers are derived from how many customers already hold one, so they
 * read as a running count rather than a random string. Two accounts opening the
 * form at the same instant can land on the same candidate, which the unique
 * index refuses - so a clash simply tries the next one.
 */
async function ensureReferences(customerId: string): Promise<void> {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, deletedAt: null },
    select: { id: true, cid: true, accountNumber: true },
  });
  if (!customer) throw ApiError.notFound('Customer not found');

  if (!customer.cid) {
    await allocate(customerId, 'cid', CID_PREFIX, CID_BASE);
  }

  // A customer who signed themselves up never had one allocated, and the
  // booking form needs it to raise a job against them.
  if (!customer.accountNumber) {
    await allocate(customerId, 'accountNumber', ACCOUNT_NUMBER_PREFIX, ACCOUNT_NUMBER_BASE);
  }
}

/** Takes the next free number in one series and writes it to the account. */
async function allocate(
  customerId: string,
  column: 'cid' | 'accountNumber',
  prefix: string,
  base: number,
): Promise<void> {
  const taken = await prisma.customer.count({ where: { [column]: { not: null } } });

  for (let attempt = 0; attempt < 25; attempt += 1) {
    const candidate = `${prefix}${base + taken + attempt}`;
    try {
      await prisma.customer.update({
        where: { id: customerId },
        data: { [column]: candidate },
      });
      return;
    } catch (error) {
      // P2002 is the unique index refusing a number somebody else just took.
      const code = (error as { code?: string }).code;
      if (code !== 'P2002') throw error;
    }
  }

  // Not fatal: the form works without a reference, and the next load tries again.
  logger.warn(`Could not allocate a ${column} for customer ${customerId}`);
}

/**
 * The next free number in the CID series, for a record being created rather
 * than one already in the table. Exported so the Admin portal hands a customer
 * it creates the same reference the portal would.
 */
export function nextCidCandidate(taken: number, attempt: number): string {
  return `${CID_PREFIX}${CID_BASE + taken + attempt}`;
}

// ---------------------------------------------------------------------------
// Company and contacts
// ---------------------------------------------------------------------------

/**
 * The company block, as the form now asks for it.
 *
 * The person columns on `customers` - the first and last name, the designation
 * and the account phone - are deliberately absent. They are set when the
 * account is created and are no longer part of this section, so this write
 * leaves whatever is stored there alone rather than blanking it.
 */
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
  creationDate: Date | null;
}

export async function updateCompany(customerId: string, data: CompanyInput) {
  await touchOnboarding(customerId);

  const customer = await prisma.customer.update({
    where: { id: customerId },
    data: {
      companyName: data.companyName,
      tradingNames: data.tradingNames,
      legalName: data.legalName,
      abn: data.abn,
      acn: data.acn,
      abnStatus: data.abnStatus,
      entityType: data.entityType,
      gst: data.gst,
      websiteAddress: data.websiteAddress,
      creationDate: data.creationDate,
    },
  });

  const { passwordHash: _passwordHash, ...safeCustomer } = customer;
  return safeCustomer;
}

export interface ContactInput {
  type: CustomerContactType;
  contactPerson: string | null;
  designation: string | null;
  contactNumber: string | null;
  email: string | null;
}

/** One block the customer added beyond the four departments. */
export interface AdditionalContactInput {
  label: string | null;
  contactPerson: string | null;
  designation: string | null;
  contactNumber: string | null;
  email: string | null;
}

export interface ContactsInput {
  contacts: ContactInput[];
  /**
   * The blocks the customer added themselves. Left out means "leave them
   * alone": these are replaced wholesale, so an absent list must not be read
   * as an empty one.
   */
  additionalContacts?: AdditionalContactInput[];
}

export async function updateContacts(customerId: string, input: ContactsInput) {
  for (const contact of input.contacts) {
    const { type, ...values } = contact;
    await prisma.customerContact.upsert({
      where: { customerId_type: { customerId, type } },
      create: { customerId, type, ...values },
      update: values,
    });
  }

  // The extra blocks have no meaning on their own - they are the section as the
  // customer last left it - so they are rewritten rather than matched row for
  // row, the same way the directors are.
  if (input.additionalContacts) {
    const extra = input.additionalContacts;
    await prisma.$transaction([
      prisma.customerAdditionalContact.deleteMany({ where: { customerId } }),
      prisma.customerAdditionalContact.createMany({
        data: extra.map((contact, position) => ({ customerId, position, ...contact })),
      }),
    ]);
  }

  await touchOnboarding(customerId);
  return prisma.customerContact.findMany({ where: { customerId } });
}

// ---------------------------------------------------------------------------
// Repeating sections
// ---------------------------------------------------------------------------

export interface DirectorInput {
  name: string | null;
  email: string | null;
  contactNumber: string | null;
}

/**
 * Replaces the whole list in one transaction.
 *
 * These rows have no meaning on their own - they are the section as the
 * customer last left it - so rewriting them is both simpler and more correct
 * than trying to match a row on screen back to one in the table.
 */
export async function updateDirectors(customerId: string, directors: DirectorInput[]) {
  await prisma.$transaction([
    prisma.customerDirector.deleteMany({ where: { customerId } }),
    prisma.customerDirector.createMany({
      data: directors.map((director, position) => ({ customerId, position, ...director })),
    }),
  ]);

  await touchOnboarding(customerId);
  return prisma.customerDirector.findMany({
    where: { customerId },
    orderBy: { position: 'asc' },
  });
}

export interface AddressInput {
  /** Unit, suite or flat number. Its own field, kept off the street line. */
  suite: string | null;
  street1: string | null;
  street2: string | null;
  suburb: string | null;
  state: string | null;
  country: string | null;
  postCode: string | null;
}

export interface AddressesInput {
  /** Whether the customer ticked the billing address as a copy. */
  billingSameAsPrincipal: boolean;
  principal: AddressInput;
  billing: AddressInput;
  /**
   * Every warehouse the customer operates. Left out means "leave them alone":
   * these are replaced wholesale, so an absent list must not be read as an
   * empty one.
   */
  warehouses?: AddressInput[];
}

/**
 * The two addresses the company is registered at.
 *
 * Both rows are written even when the tick says they are the same, so anything
 * reading the billing address gets an address rather than a flag it has to know
 * how to follow. The caller sends the copy; the tick only remembers how the
 * form was filled in, so it comes back ticked.
 */
export async function updateAddresses(customerId: string, input: AddressesInput) {
  const rows: Array<{ type: CustomerAddressType; data: AddressInput }> = [
    { type: 'PRINCIPAL', data: input.principal },
    { type: 'BILLING', data: input.billing },
  ];

  await prisma.$transaction([
    prisma.customer.update({
      where: { id: customerId },
      data: { billingSameAsPrincipal: input.billingSameAsPrincipal },
    }),
    ...rows.map((row) =>
      prisma.customerAddress.upsert({
        where: { customerId_type: { customerId, type: row.type } },
        create: { customerId, type: row.type, ...row.data },
        update: row.data,
      }),
    ),
  ]);

  // The warehouses ride along with the registered addresses because they are
  // the same section of the form. Unlike those two they are a list, so they are
  // replaced wholesale in the order they were entered.
  if (input.warehouses) {
    const warehouses = input.warehouses;
    await prisma.$transaction([
      prisma.customerWarehouse.deleteMany({ where: { customerId } }),
      prisma.customerWarehouse.createMany({
        data: warehouses.map((warehouse, position) => ({ customerId, position, ...warehouse })),
      }),
    ]);
  }

  await touchOnboarding(customerId);
  return prisma.customerAddress.findMany({ where: { customerId } });
}

// ---------------------------------------------------------------------------
// One to one sections
// ---------------------------------------------------------------------------

export interface BillingInput {
  term: string | null;
  billingType: CustomerBillingType | null;
}

export async function updateBilling(customerId: string, data: BillingInput) {
  const result = await prisma.customerBilling.upsert({
    where: { customerId },
    create: { customerId, ...data },
    update: data,
  });

  await touchOnboarding(customerId);
  return result;
}

async function touchOnboarding(customerId: string): Promise<void> {
  await prisma.customer.updateMany({
    where: { id: customerId, onboardingStatus: 'NOT_STARTED' },
    data: { onboardingStatus: 'IN_PROGRESS' },
  });
}

export async function saveProgress(customerId: string, step: number) {
  return prisma.customer.update({
    where: { id: customerId },
    data: { onboardingStep: step, onboardingStatus: 'IN_PROGRESS' },
    select: { id: true, onboardingStep: true, onboardingStatus: true },
  });
}

// ---------------------------------------------------------------------------
// Submission
// ---------------------------------------------------------------------------

/**
 * Whether a registered address has everything the form asks for.
 *
 * Street 2 is left out on purpose: it carries a unit, a level or a building
 * name, and plenty of addresses have none. `useCustomerProgress` on the
 * frontend judges an address the same way, so a form that reads as complete is
 * one this will accept.
 */
function isWholeAddress(address: CustomerAddress | undefined): boolean {
  return Boolean(
    address?.street1 && address.suburb && address.state && address.country && address.postCode,
  );
}

export async function submitOnboarding(customerId: string) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, deletedAt: null },
    include: { addresses: true, contacts: true, billing: true },
  });

  if (!customer) throw ApiError.notFound('Customer not found');
  if (
    customer.onboardingStatus === 'SUBMITTED' ||
    customer.onboardingStatus === 'UNDER_REVIEW'
  ) {
    throw ApiError.badRequest('Your application has already been submitted.');
  }

  const missing: string[] = [];
  if (!customer.companyName) missing.push('Company name');
  if (!customer.abn) missing.push('ABN');

  // Both registered addresses are asked for. The billing one is sent as a copy
  // of the principal when the form's tick says they match, so there is always a
  // row for each and nothing here has to follow the flag.
  const addresses = new Map(customer.addresses.map((address) => [address.type, address]));
  if (!isWholeAddress(addresses.get('PRINCIPAL'))) missing.push('Principal address');
  if (!isWholeAddress(addresses.get('BILLING'))) missing.push('Billing address');

  const operations = customer.contacts.find((contact) => contact.type === 'OPERATIONS');
  if (!operations?.contactPerson || !operations.email) missing.push('Operations contact');

  if (!customer.billing?.billingType) missing.push('Billing type');

  if (missing.length > 0) {
    throw ApiError.badRequest(`Please complete these first: ${missing.join(', ')}`);
  }

  return prisma.customer.update({
    where: { id: customerId },
    data: { onboardingStatus: 'SUBMITTED', submittedAt: new Date() },
    select: { id: true, onboardingStatus: true, submittedAt: true },
  });
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

export async function addDocument(
  customerId: string,
  input: {
    docType: CustomerDocumentType;
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
    role: 'customer',
    actorId: customerId,
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
    area: CUSTOMER_AREA,
  });

  // Single slot document types replace whatever was there before. The extra
  // rows a customer adds themselves are the one type that stacks.
  const replaced =
    input.docType === 'ADDITIONAL'
      ? []
      : await prisma.customerDocument.findMany({
          where: { customerId, docType: input.docType, deletedAt: null },
          select: { id: true, storageKey: true },
        });

  if (replaced.length > 0) {
    await prisma.customerDocument.updateMany({
      where: { id: { in: replaced.map((row) => row.id) } },
      data: { deletedAt: new Date() },
    });
  }

  const document = await prisma.customerDocument.create({
    data: { customerId, ...meta, storageKey: stored.storageKey, storageUrl: stored.storageUrl },
  });

  // The superseded blobs are no longer referenced, so drop them.
  for (const row of replaced) {
    await removeStoredFile(row.storageKey, row.id);
  }

  if (input.docType === 'COMPANY_LOGO') {
    await prisma.customer.update({
      where: { id: customerId },
      data: { logoUrl: `/api/customer/documents/${document.id}/file` },
    });
  }

  await touchOnboarding(customerId);
  return document;
}

export async function listDocuments(customerId: string, docType?: CustomerDocumentType) {
  const where: Prisma.CustomerDocumentWhereInput = { customerId, deletedAt: null };
  if (docType) where.docType = docType;
  return prisma.customerDocument.findMany({ where, orderBy: { createdAt: 'asc' } });
}

export async function getDocumentForCustomer(customerId: string, documentId: string) {
  const document = await prisma.customerDocument.findFirst({
    where: { id: documentId, customerId, deletedAt: null },
  });
  if (!document) throw ApiError.notFound('Document not found');
  return document;
}

/** Opens the stored file for an authenticated streaming download. */
export async function openDocument(customerId: string, documentId: string) {
  const document = await getDocumentForCustomer(customerId, documentId);
  const file = await storage.openFile(document.storageKey, document.mimeType, CUSTOMER_AREA);
  return { document, file };
}

/**
 * Short lived direct link. On Azure this is a read only SAS URL the browser can
 * use in an `<img>` or `<a>` tag without an Authorization header; in local
 * development it falls back to the authenticated streaming route.
 */
export async function createDocumentLink(customerId: string, documentId: string) {
  const document = await getDocumentForCustomer(customerId, documentId);
  const link = await storage.createSignedLink({
    storageKey: document.storageKey,
    fileName: document.fileName,
    fallbackPath: `/api/customer/documents/${document.id}/file`,
    area: CUSTOMER_AREA,
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
    await storage.deleteFile(storageKey, CUSTOMER_AREA);
  } catch (error) {
    logger.warn(`Could not remove stored file for document ${documentId}`, error);
  }
}

/**
 * Corrects the metadata of a stored file. The bytes are never touched here:
 * replacing those means uploading again.
 */
export async function updateDocument(
  customerId: string,
  documentId: string,
  data: { category: string | null; issueDate: Date | null; expiryDate: Date | null },
) {
  const document = await getDocumentForCustomer(customerId, documentId);

  const updated = await prisma.customerDocument.update({
    where: { id: document.id },
    data,
  });

  await touchOnboarding(customerId);
  return updated;
}

export async function deleteDocument(customerId: string, documentId: string) {
  const document = await getDocumentForCustomer(customerId, documentId);

  await prisma.customerDocument.update({
    where: { id: document.id },
    data: { deletedAt: new Date() },
  });

  await removeStoredFile(document.storageKey, document.id);

  if (document.docType === 'COMPANY_LOGO') {
    await prisma.customer.update({ where: { id: customerId }, data: { logoUrl: null } });
  }

  return { id: document.id };
}
