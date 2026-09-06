import { prisma } from '../config/prisma';
import { ApiError } from '../utils/apiError';
import { logger } from '../utils/logger';
import * as storage from './storage.service';
import type { CreateBookingInput } from '../validators/booking.validator';

/**
 * Bookings raised in the Admin portal.
 *
 * A booking owns its pickups and deliveries (booking_stops, split by type), its
 * lanes (booking_lanes) and what we charge (booking_prices, one row per price
 * column on the form). The vendor price stays as columns on the booking itself:
 * we agree one figure with a vendor for the whole job. The customer and vendor
 * are held by id and by a name snapshot, with no relation, so those account
 * tables are untouched by this feature.
 */

const BOOKING_INCLUDE = {
  stops: { orderBy: [{ type: 'asc' }, { position: 'asc' }] },
  lanes: { orderBy: { position: 'asc' } },
  prices: { orderBy: { position: 'asc' } },
} satisfies import('@prisma/client').Prisma.BookingInclude;

export interface BookingListQuery {
  search?: string;
  page: number;
  pageSize: number;
  sortBy: 'createdAt' | 'jobNumber' | 'bookingReceivedDate';
  sortDir: 'asc' | 'desc';
}

// ---------------------------------------------------------------------------
// Job numbers
// ---------------------------------------------------------------------------

/**
 * A job number reads BIVRY-<financial year>-<sequence>, e.g. BIVRY-2627-5000,
 * counting up from 5000 and beginning again at 5000 each financial year.
 *
 * It is allocated here, on the server. It used to be counted in the admin's own
 * localStorage, so a second admin, or the same one in another browser, began
 * again at 5000, collided with the unique index on every create, and had no way
 * past it from a read only field. Whatever the client sends is ignored.
 */
const JOB_PREFIX = 'BIVRY';
const JOB_SEQUENCE_START = 5000;

/** How many numbers to walk past before giving up, if creates keep colliding. */
const JOB_ATTEMPTS = 25;

/** "26-27" -> "2627". Anything that is not a four digit year is not usable. */
function yearDigits(financialYear: string | null | undefined): string | null {
  const digits = (financialYear ?? '').replace(/\D/g, '');
  return digits.length === 4 ? digits : null;
}

/** "26-27", from the calendar year the financial year starts in. */
function formatFinancialYear(startYear: number): string {
  const two = (value: number) => String(value % 100).padStart(2, '0');
  return `${two(startYear)}-${two(startYear + 1)}`;
}

/**
 * The Australian financial year a "YYYY-MM-DD" date falls in, as "26-27".
 *
 * The year runs 1 July to 30 June, so July onwards belongs to the year it
 * starts. The string is read field by field rather than through `Date`, so the
 * answer cannot move with the server's timezone, and a pick-up time carrying a
 * "THH:mm" tail answers the same as the bare date would.
 */
function financialYearOf(date: string): string | null {
  const [year, month] = date.split('-').map(Number);
  if (!year || !month || month < 1 || month > 12) return null;
  return formatFinancialYear(month >= 7 ? year : year - 1);
}

/** Today's financial year, for a booking that arrived without a date. */
function currentFinancialYear(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  return formatFinancialYear(now.getUTCMonth() + 1 >= 7 ? year : year - 1);
}

/**
 * The financial year a booking belongs to, as ["26-27", "2627"].
 *
 * Taken from the pick-up time where there is one, because when the job is
 * collected is the fact the year follows - a booking taken in June for a July
 * pick-up belongs to the year it is picked up in. The year the client sent is
 * used only when no pick-up time was given, and today's is the last resort, so
 * a booking can always be numbered.
 */
function resolveFinancialYear(input: {
  pickupTime: string | null;
  financialYear: string | null;
}): [string, string] {
  const fromDate = input.pickupTime ? financialYearOf(input.pickupTime) : null;

  for (const candidate of [fromDate, input.financialYear]) {
    const digits = yearDigits(candidate);
    if (candidate && digits) return [candidate, digits];
  }

  const current = currentFinancialYear();
  return [current, current.replace('-', '')];
}

/**
 * The next free sequence for a financial year: one past the highest already
 * taken, or 5000 where the year has none yet.
 *
 * Read as a single MAX rather than by counting rows, so a deleted booking never
 * hands its number on to the next one, and the numbers the old browser side
 * counter already issued are carried on from rather than repeated. The trailing
 * digits are cast to an integer because a text sort puts 10000 before 9999.
 *
 * Numbers parked for a form that is open count as taken alongside the bookings
 * themselves, so the admin who opened it is the only one who can be handed it.
 */
async function nextJobSequence(prefix: string): Promise<number> {
  const like = `${prefix}%`;
  const rows = await prisma.$queryRaw<Array<{ max: number | null }>>`
    SELECT MAX(taken) AS max FROM (
      SELECT SUBSTRING(job_number FROM '[0-9]+$')::int AS taken
        FROM bookings
       WHERE job_number LIKE ${like}
      UNION ALL
      SELECT SUBSTRING(job_number FROM '[0-9]+$')::int AS taken
        FROM booking_job_numbers
       WHERE job_number LIKE ${like}
    ) AS numbers
  `;

  const highest = rows[0]?.max ?? null;
  return highest === null ? JOB_SEQUENCE_START : Math.max(highest + 1, JOB_SEQUENCE_START);
}

/** True when the unique index refused the job number, rather than another column. */
function isJobNumberClash(error: unknown): boolean {
  const { code, meta } = error as { code?: string; meta?: { target?: unknown } };
  if (code !== 'P2002') return false;
  const target = meta?.target;
  const fields = Array.isArray(target) ? target.map(String) : [String(target ?? '')];
  return fields.some((field) => field.includes('job_number'));
}

/**
 * How long a parked job number is held for without being saved or released.
 *
 * A form left open all day still holds its number; a browser that crashed
 * before it could say so gives the number back the next time one is asked for.
 * Long enough to cover a working day, short enough that an abandoned tab does
 * not strand a number for good.
 */
const RESERVATION_MS = 12 * 60 * 60 * 1000;

/** Drops every parked number nobody came back for. */
async function purgeExpiredJobNumbers(): Promise<void> {
  await prisma.bookingJobNumber.deleteMany({ where: { expiresAt: { lt: new Date() } } });
}

export interface ReservedJobNumber {
  jobNumber: string;
  financialYear: string;
  expiresAt: Date;
}

/**
 * Parks the next job number for one admin while they fill the form in.
 *
 * The Create Booking form used to show nothing in its Job Number field until the
 * booking had been saved, because the number was only allocated on create. Two
 * admins filling a booking in at the same time were therefore both in line for
 * the same number, and neither could see it. Reserving here answers both: the
 * number is on screen from the moment the form opens, and it is held, so the
 * next admin to open the form is offered the one after it.
 *
 * Releasing is the caller's job (see `releaseJobNumber`); `expiresAt` is what
 * covers the caller that never gets to.
 */
export async function reserveJobNumber(
  input: { pickupTime?: string | null; financialYear?: string | null },
  adminId: string,
): Promise<ReservedJobNumber> {
  await purgeExpiredJobNumbers();

  const [financialYear, digits] = resolveFinancialYear({
    pickupTime: input.pickupTime ?? null,
    financialYear: input.financialYear ?? null,
  });
  const prefix = `${JOB_PREFIX}-${digits}-`;
  const first = await nextJobSequence(prefix);
  const expiresAt = new Date(Date.now() + RESERVATION_MS);

  // The same walk the create does: another admin can take the number between
  // the MAX above and the insert, which the unique index refuses.
  for (let attempt = 0; attempt < JOB_ATTEMPTS; attempt += 1) {
    const jobNumber = `${prefix}${first + attempt}`;
    try {
      await prisma.bookingJobNumber.create({
        data: { jobNumber, financialYear, adminId, expiresAt },
      });
      return { jobNumber, financialYear, expiresAt };
    } catch (error) {
      if (!isJobNumberClash(error)) throw error;
    }
  }

  throw ApiError.internal('Could not reserve a job number');
}

/**
 * Gives a parked number back, so the next form to open is offered it.
 *
 * Scoped to the admin holding it, so one admin closing their form can never
 * release the number another one is still looking at. Silent when there is
 * nothing to release: this is called on the way out of a page, where a number
 * already consumed by a save is the ordinary case rather than an error.
 */
export async function releaseJobNumber(jobNumber: string, adminId: string): Promise<void> {
  await prisma.bookingJobNumber.deleteMany({ where: { jobNumber, adminId } });
}

/**
 * Takes the number this admin had parked, if it is still theirs and still
 * belongs to the financial year the booking landed in.
 *
 * Returns null for anything else - a number nobody reserved, one held by
 * somebody else, or one parked before the pick-up time was changed into
 * another financial year - and the caller then allocates in the ordinary way.
 * A client is never trusted for a job number: this only ever hands back one the
 * server itself parked for this admin.
 */
async function claimReservedJobNumber(
  jobNumber: string | null,
  prefix: string,
  adminId: string,
): Promise<string | null> {
  const wanted = jobNumber?.trim();
  if (!wanted || !wanted.startsWith(prefix)) return null;

  const { count } = await prisma.bookingJobNumber.deleteMany({
    where: { jobNumber: wanted, adminId, expiresAt: { gte: new Date() } },
  });
  return count > 0 ? wanted : null;
}

/**
 * The stops, lanes and price rows a booking owns, mapped from the form's input
 * into the shape Prisma's nested `create` takes. Shared by create and update so
 * the two can never disagree about how a price or a stop is stored.
 */
function childRows(input: CreateBookingInput) {
  const pickups = input.pickups.map((stop, index) => ({
    ...stop,
    type: 'PICKUP' as const,
    position: index,
  }));
  const deliveries = input.deliveries.map((stop, index) => ({
    ...stop,
    type: 'DELIVERY' as const,
    position: index,
  }));
  const lanes = input.lanes.map((lane, index) => ({ ...lane, position: index }));

  // One row per price column, keeping the order they were shown in: that order
  // is what "Gross Amount 2" refers to.
  const prices = input.prices.map((price, index) => ({
    position: index,
    grossAmount: price.grossAmount ?? null,
    fuelLevyPct: price.fuelLevyPct ?? null,
    fuelLevyAmount: price.fuelLevyAmount ?? null,
    splitChargePct: price.splitChargePct ?? null,
    splitChargeAmount: price.splitChargeAmount ?? null,
    otherChargesPct: price.otherChargesPct ?? null,
    otherChargesAmount: price.otherChargesAmount ?? null,
    gstPct: price.gstPct ?? null,
    gstAmount: price.gstAmount ?? null,
    netAmount: price.netAmount ?? null,
    totalAmount: price.totalAmount ?? null,
  }));

  return { stops: [...pickups, ...deliveries], lanes, prices };
}

/**
 * The booking's own columns (everything but the job number, financial year and
 * who raised it), mapped from the form. Shared by create and update; create adds
 * the job number and creator, update leaves both as the booking already has them.
 */
function bookingScalars(input: CreateBookingInput) {
  const vendorPrice = input.vendorPrice ?? {};
  const vendor = input.vendor ?? {};

  return {
    bookingReceivedDate: input.bookingReceivedDate,
    customerId: input.customerId,
    customerName: input.customerName,
    customerAccountNumber: input.customerAccountNumber,
    accountStatus: input.accountStatus,
    agreementType: input.agreementType,
    reference: input.reference,
    invoiceTerm: input.invoiceTerm,
    cargoType: input.cargoType,
    vehicleType: input.vehicleType,
    trailerCategory: input.trailerCategory,

    priceFinalAmount: input.priceFinalAmount ?? null,

    vendorId: vendor.vendorId ?? null,
    vendorName: vendor.vendorName ?? null,
    vendorGrossAmount: vendorPrice.grossAmount ?? null,
    vendorGrossAmount2: vendorPrice.grossAmount2 ?? null,
    vendorFuelLevyPct: vendorPrice.fuelLevyPct ?? null,
    vendorFuelLevyAmount: vendorPrice.fuelLevyAmount ?? null,
    vendorGstPct: vendorPrice.gstPct ?? null,
    vendorGstAmount: vendorPrice.gstAmount ?? null,
    vendorNetAmount: vendorPrice.netAmount ?? null,
    vendorTotalAmount: vendorPrice.totalAmount ?? null,
  };
}

export async function createBooking(input: CreateBookingInput, adminId: string) {
  const pickups = input.pickups;
  const { stops, lanes, prices } = childRows(input);

  // The financial year is settled here too: the job number is keyed to it, so
  // the two must agree, and the first pickup's time is what both are derived
  // from - the same field the form's Financial Year box follows.
  const [financialYear, digits] = resolveFinancialYear({
    pickupTime: pickups[0]?.scheduledAt ?? null,
    financialYear: input.financialYear,
  });
  const prefix = `${JOB_PREFIX}-${digits}-`;

  // The number the form has been showing all along, where this admin still
  // holds it. Anything else falls through to the ordinary allocation below.
  const reserved = await claimReservedJobNumber(input.jobNumber, prefix, adminId);
  const first = await nextJobSequence(prefix);

  const data = {
    ...bookingScalars(input),
    financialYear,
    createdByAdminId: adminId,
    stops: { create: stops },
    lanes: { create: lanes },
    prices: { create: prices },
  };

  // Another create can take the number between the MAX above and the insert,
  // which the unique index refuses. Walk on to the next one and try again: the
  // booking and its stops and lanes are written as one statement, so a refused
  // attempt leaves nothing behind to clean up.
  for (let attempt = 0; attempt < JOB_ATTEMPTS; attempt += 1) {
    // The reserved number is only tried once: it was held for this admin, so a
    // clash on it means it is genuinely gone and the walk carries on without it.
    const jobNumber = reserved !== null && attempt === 0 ? reserved : `${prefix}${first + attempt}`;

    try {
      return await prisma.booking.create({
        data: { ...data, jobNumber },
        include: BOOKING_INCLUDE,
      });
    } catch (error) {
      if (!isJobNumberClash(error)) throw error;
    }
  }

  throw ApiError.internal('Could not assign a job number');
}

export async function listBookings(query: BookingListQuery) {
  const where: Record<string, unknown> = { deletedAt: null };
  if (query.search) {
    const contains = { contains: query.search, mode: 'insensitive' };
    where.OR = [
      { jobNumber: contains },
      { customerName: contains },
      { customerAccountNumber: contains },
      { reference: contains },
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.booking.count({ where }),
    prisma.booking.findMany({
      where,
      orderBy: { [query.sortBy]: query.sortDir },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: BOOKING_INCLUDE,
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

export async function getBooking(id: string) {
  const booking = await prisma.booking.findFirst({
    where: { id, deletedAt: null },
    include: BOOKING_INCLUDE,
  });
  if (!booking) throw ApiError.notFound('Booking not found');
  return booking;
}

// ---------------------------------------------------------------------------
// Vendor-facing reads
//
// A booking is raised by an admin, who sees all of it: the customer, what we
// charge them, and what we pay the vendor. A vendor is shown only the part that
// is theirs. Everything the admin agreed with the customer - the customer's
// identity and account, our price and its total - is left out here rather than
// filtered on the client, so it never crosses the wire to a vendor at all. The
// select is the boundary: add a field to it deliberately, or a vendor never sees
// it. What a vendor is allowed is the job itself (where it loads and lands, the
// vehicle) and their own allotment and price.
// ---------------------------------------------------------------------------

const VENDOR_BOOKING_SELECT = {
  id: true,
  jobNumber: true,
  bookingReceivedDate: true,
  financialYear: true,
  reference: true,
  cargoType: true,
  vehicleType: true,
  trailerCategory: true,
  vendorId: true,
  vendorName: true,
  vendorGrossAmount: true,
  vendorGrossAmount2: true,
  vendorFuelLevyPct: true,
  vendorFuelLevyAmount: true,
  vendorGstPct: true,
  vendorGstAmount: true,
  vendorNetAmount: true,
  vendorTotalAmount: true,
  paymentStatus: true,
  logbookPrecheckChecked: true,
  logbookPostcheckChecked: true,
  logbookPaymentDateChecked: true,
  logbookTotalPaymentChecked: true,
  createdAt: true,
  updatedAt: true,
  stops: { orderBy: [{ type: 'asc' }, { position: 'asc' }] },
  lanes: { orderBy: { position: 'asc' } },
} satisfies import('@prisma/client').Prisma.BookingSelect;

/**
 * The bookings an admin has allotted to this vendor, newest first, paged and
 * searchable. Scoped to the vendor's own id, so a vendor can only ever see the
 * jobs handed to them, and never one raised for another vendor or none.
 */
export async function listVendorBookings(vendorId: string, query: BookingListQuery) {
  const where: Record<string, unknown> = { vendorId, deletedAt: null };
  if (query.search) {
    const contains = { contains: query.search, mode: 'insensitive' };
    where.OR = [{ jobNumber: contains }, { reference: contains }];
  }

  const [total, rows] = await Promise.all([
    prisma.booking.count({ where }),
    prisma.booking.findMany({
      where,
      orderBy: { [query.sortBy]: query.sortDir },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: VENDOR_BOOKING_SELECT,
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

/**
 * One of this vendor's bookings, addressed by id. The `vendorId` in the filter
 * is what stops a vendor reading another vendor's booking by guessing its id: a
 * booking that is not theirs reads as not found, the same as one that does not
 * exist.
 */
export async function getVendorBooking(vendorId: string, id: string) {
  const booking = await prisma.booking.findFirst({
    where: { id, vendorId, deletedAt: null },
    select: VENDOR_BOOKING_SELECT,
  });
  if (!booking) throw ApiError.notFound('Booking not found');
  return booking;
}

/**
 * Ticks or unticks the two Log Book boxes on the vendor's Documents tab. Scoped
 * to a booking the vendor holds, and only the boxes that were sent are touched,
 * so ticking one never clears the other. Returns the booking in the vendor shape.
 */
export async function updateVendorLogbookChecks(
  vendorId: string,
  bookingId: string,
  checks: { precheck?: boolean; postcheck?: boolean; paymentDate?: boolean; totalPayment?: boolean },
) {
  await assertVendorBooking(vendorId, bookingId);
  return prisma.booking.update({
    where: { id: bookingId },
    data: {
      ...(checks.precheck !== undefined ? { logbookPrecheckChecked: checks.precheck } : {}),
      ...(checks.postcheck !== undefined ? { logbookPostcheckChecked: checks.postcheck } : {}),
      ...(checks.paymentDate !== undefined ? { logbookPaymentDateChecked: checks.paymentDate } : {}),
      ...(checks.totalPayment !== undefined
        ? { logbookTotalPaymentChecked: checks.totalPayment }
        : {}),
    },
    select: VENDOR_BOOKING_SELECT,
  });
}

// ---------------------------------------------------------------------------
// Booking documents
//
// Files attached to a booking - a POD, a rate confirmation, a photo of the
// load. They hang off the booking, not an account, so the same booking's files
// can be shown to the admin who raised it and to the vendor it went to. These
// helpers are the vendor's view: every one is scoped to a booking the vendor
// actually holds, so a vendor can only ever touch files on their own jobs.
//
// The bytes go in the vendor container (the vendor is who uploads and reads
// them here), keyed under a `bookings/<id>/...` prefix so a booking's files sit
// together and are easy to find or purge.
// ---------------------------------------------------------------------------

const BOOKING_DOC_AREA = 'vendor' as const;

/**
 * Confirms the booking is this vendor's before any file work touches it. A
 * booking that is not theirs reads as not found, the same as one that does not
 * exist, so nothing leaks whether a stranger's booking id is real.
 */
async function assertVendorBooking(vendorId: string, bookingId: string): Promise<void> {
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, vendorId, deletedAt: null },
    select: { id: true },
  });
  if (!booking) throw ApiError.notFound('Booking not found');
}

/** One document row, checked to belong to a booking this vendor holds. */
async function getBookingDocumentForVendor(
  vendorId: string,
  bookingId: string,
  documentId: string,
) {
  await assertVendorBooking(vendorId, bookingId);
  const document = await prisma.bookingDocument.findFirst({
    where: { id: documentId, bookingId, deletedAt: null },
  });
  if (!document) throw ApiError.notFound('Document not found');
  return document;
}

/** The files on one of this vendor's bookings, oldest first. */
export async function listBookingDocuments(vendorId: string, bookingId: string) {
  await assertVendorBooking(vendorId, bookingId);
  return prisma.bookingDocument.findMany({
    where: { bookingId, deletedAt: null },
    orderBy: { createdAt: 'asc' },
  });
}

/** Stores an uploaded file against a booking and records the row for it. */
export async function addBookingDocument(
  vendorId: string,
  bookingId: string,
  input: {
    category: string | null;
    fileName: string;
    mimeType: string;
    sizeInBytes: number;
    buffer: Buffer;
  },
) {
  await assertVendorBooking(vendorId, bookingId);
  const { buffer, ...meta } = input;

  const storageKey = storage.buildStorageKey({
    role: 'booking',
    actorId: bookingId,
    docType: 'DOCUMENT',
    originalName: input.fileName,
  });

  // Upload first: a row pointing at a file that was never stored is worse than
  // an orphan blob, which the container lifecycle rule cleans up on its own.
  const stored = await storage.saveFile({
    storageKey,
    buffer,
    mimeType: input.mimeType,
    fileName: input.fileName,
    area: BOOKING_DOC_AREA,
  });

  return prisma.bookingDocument.create({
    data: {
      bookingId,
      uploadedByType: 'vendor',
      uploadedById: vendorId,
      category: meta.category,
      fileName: meta.fileName,
      mimeType: meta.mimeType,
      sizeInBytes: meta.sizeInBytes,
      storageKey: stored.storageKey,
      storageUrl: stored.storageUrl,
    },
  });
}

/** Opens the stored file for an authenticated streaming download. */
export async function openBookingDocument(
  vendorId: string,
  bookingId: string,
  documentId: string,
) {
  const document = await getBookingDocumentForVendor(vendorId, bookingId, documentId);
  const file = await storage.openFile(document.storageKey, document.mimeType, BOOKING_DOC_AREA);
  return { document, file };
}

/**
 * Short lived direct link. On Azure this is a read only SAS URL the browser can
 * use in an anchor or image tag with no Authorization header; in local
 * development it falls back to the authenticated streaming route.
 */
export async function createBookingDocumentLink(
  vendorId: string,
  bookingId: string,
  documentId: string,
) {
  const document = await getBookingDocumentForVendor(vendorId, bookingId, documentId);
  const link = await storage.createSignedLink({
    storageKey: document.storageKey,
    fileName: document.fileName,
    fallbackPath: `/api/vendor/bookings/${bookingId}/documents/${document.id}/file`,
    area: BOOKING_DOC_AREA,
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
async function removeBookingStoredFile(storageKey: string, documentId: string): Promise<void> {
  try {
    await storage.deleteFile(storageKey, BOOKING_DOC_AREA);
  } catch (error) {
    logger.warn(`Could not remove stored file for booking document ${documentId}`, error);
  }
}

/** Soft deletes a booking document and drops its stored bytes. */
export async function deleteBookingDocument(
  vendorId: string,
  bookingId: string,
  documentId: string,
) {
  const document = await getBookingDocumentForVendor(vendorId, bookingId, documentId);

  await prisma.bookingDocument.update({
    where: { id: document.id },
    data: { deletedAt: new Date() },
  });

  await removeBookingStoredFile(document.storageKey, document.id);
  return { id: document.id };
}

// ---------------------------------------------------------------------------
// Booking documents - admin side
//
// The same files, read by the admin who raised the booking so they can review
// what the vendor uploaded and approve or reject each one. No vendor scope here:
// an admin sees every booking's files. The bytes still live in the vendor
// container, so reads go through the same storage area.
// ---------------------------------------------------------------------------

/** One document on a booking, for the admin (no vendor scope). */
async function getBookingDocumentForAdmin(bookingId: string, documentId: string) {
  const document = await prisma.bookingDocument.findFirst({
    where: { id: documentId, bookingId, deletedAt: null },
  });
  if (!document) throw ApiError.notFound('Document not found');
  return document;
}

/** Every file on a booking, oldest first, for the admin's review. */
export async function listBookingDocumentsForAdmin(bookingId: string) {
  return prisma.bookingDocument.findMany({
    where: { bookingId, deletedAt: null },
    orderBy: { createdAt: 'asc' },
  });
}

/** Opens a booking file for an authenticated admin download. */
export async function openBookingDocumentForAdmin(bookingId: string, documentId: string) {
  const document = await getBookingDocumentForAdmin(bookingId, documentId);
  const file = await storage.openFile(document.storageKey, document.mimeType, BOOKING_DOC_AREA);
  return { document, file };
}

/** Short lived direct link to a booking file, for the admin. */
export async function createBookingDocumentLinkForAdmin(bookingId: string, documentId: string) {
  const document = await getBookingDocumentForAdmin(bookingId, documentId);
  const link = await storage.createSignedLink({
    storageKey: document.storageKey,
    fileName: document.fileName,
    fallbackPath: `/api/admin/bookings/${bookingId}/documents/${document.id}/file`,
    area: BOOKING_DOC_AREA,
  });

  return {
    documentId: document.id,
    fileName: document.fileName,
    mimeType: document.mimeType,
    url: link.url,
    expiresAt: link.expiresAt,
  };
}

/** Moves a document's approval state. Admin only; the vendor reads the result. */
export async function setBookingDocumentApproval(
  bookingId: string,
  documentId: string,
  approvalStatus: import('@prisma/client').DocumentApprovalStatus,
) {
  const document = await getBookingDocumentForAdmin(bookingId, documentId);
  return prisma.bookingDocument.update({
    where: { id: document.id },
    data: { approvalStatus },
  });
}

/**
 * Saves an admin's edits to an existing booking.
 *
 * The job number and its financial year are left exactly as the booking already
 * carries them: the number is the booking's id, so an edit never changes it even
 * when the pick-up date is moved into another financial year. Everything else -
 * the scalars, the stops, the lanes and the price rows - is replaced with what
 * the form now holds. The children are deleted and re-created rather than
 * matched up one by one, because the form freely adds, removes and reorders
 * them, and all of it runs in one transaction so a booking is never left with
 * half its old stops and half its new ones.
 */
export async function updateBooking(id: string, input: CreateBookingInput) {
  const existing = await prisma.booking.findFirst({
    where: { id, deletedAt: null },
    select: { id: true },
  });
  if (!existing) throw ApiError.notFound('Booking not found');

  const { stops, lanes, prices } = childRows(input);

  return prisma.$transaction(async (tx) => {
    await tx.bookingStop.deleteMany({ where: { bookingId: id } });
    await tx.bookingLane.deleteMany({ where: { bookingId: id } });
    await tx.bookingPrice.deleteMany({ where: { bookingId: id } });

    // The job number and financial year are deliberately not written: the number
    // is the booking's id and stays put. `updatedAt` moves on its own (@updatedAt).
    return tx.booking.update({
      where: { id },
      data: {
        ...bookingScalars(input),
        stops: { create: stops },
        lanes: { create: lanes },
        prices: { create: prices },
      },
      include: BOOKING_INCLUDE,
    });
  });
}

/**
 * Removes a booking from the register.
 *
 * A soft delete - `deletedAt` is stamped rather than the row dropped - so the
 * list and the detail view stop showing it (both filter on `deletedAt: null`)
 * while its job number stays taken: `nextJobSequence` reads every row, deleted
 * or not, so a removed booking never hands its number to the next one.
 */
export async function deleteBooking(id: string) {
  const existing = await prisma.booking.findFirst({
    where: { id, deletedAt: null },
    select: { id: true },
  });
  if (!existing) throw ApiError.notFound('Booking not found');

  await prisma.booking.update({ where: { id }, data: { deletedAt: new Date() } });
}

/**
 * Moves a booking's vendor payment status. Admin only - the vendor reads this
 * but never writes it. Returns the updated booking so the list can reflect the
 * new state without a reload.
 */
export async function updatePaymentStatus(
  id: string,
  paymentStatus: import('@prisma/client').BookingPaymentStatus,
) {
  const existing = await prisma.booking.findFirst({
    where: { id, deletedAt: null },
    select: { id: true },
  });
  if (!existing) throw ApiError.notFound('Booking not found');

  return prisma.booking.update({
    where: { id },
    data: { paymentStatus },
    include: BOOKING_INCLUDE,
  });
}
