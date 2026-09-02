import { prisma } from '../config/prisma';
import { ApiError } from '../utils/apiError';
import type { CreateBookingInput } from '../validators/booking.validator';

/**
 * Bookings raised in the Admin portal.
 *
 * A booking owns its pickups and deliveries (booking_stops, split by type) and
 * its lanes (booking_lanes); both prices are columns on the booking itself. The
 * customer and vendor are held by id and by a name snapshot, with no relation,
 * so those account tables are untouched by this feature.
 */

const BOOKING_INCLUDE = {
  stops: { orderBy: [{ type: 'asc' }, { position: 'asc' }] },
  lanes: { orderBy: { position: 'asc' } },
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
 * answer cannot move with the server's timezone.
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
 * Taken from the received date where there is one, because that is the fact the
 * year follows. The year the client sent is used only when no date was given,
 * and today's is the last resort, so a booking can always be numbered.
 */
function resolveFinancialYear(input: {
  bookingReceivedDate: string | null;
  financialYear: string | null;
}): [string, string] {
  const fromDate = input.bookingReceivedDate ? financialYearOf(input.bookingReceivedDate) : null;

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
  input: { bookingReceivedDate?: string | null; financialYear?: string | null },
  adminId: string,
): Promise<ReservedJobNumber> {
  await purgeExpiredJobNumbers();

  const [financialYear, digits] = resolveFinancialYear({
    bookingReceivedDate: input.bookingReceivedDate ?? null,
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
 * somebody else, or one parked before the received date was changed into
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

export async function createBooking(input: CreateBookingInput, adminId: string) {
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

  const price = input.price ?? {};
  const vendorPrice = input.vendorPrice ?? {};
  const vendor = input.vendor ?? {};

  // The financial year is settled here too: the job number is keyed to it, so
  // the two must agree, and the received date is what both are derived from.
  const [financialYear, digits] = resolveFinancialYear(input);
  const prefix = `${JOB_PREFIX}-${digits}-`;

  // The number the form has been showing all along, where this admin still
  // holds it. Anything else falls through to the ordinary allocation below.
  const reserved = await claimReservedJobNumber(input.jobNumber, prefix, adminId);
  const first = await nextJobSequence(prefix);

  const data = {
    bookingReceivedDate: input.bookingReceivedDate,
    financialYear,
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

    priceGrossAmount: price.grossAmount ?? null,
    priceFuelLevyPct: price.fuelLevyPct ?? null,
    priceFuelLevyAmount: price.fuelLevyAmount ?? null,
    priceGstPct: price.gstPct ?? null,
    priceGstAmount: price.gstAmount ?? null,
    priceNetAmount: price.netAmount ?? null,
    priceTotalAmount: price.totalAmount ?? null,

    vendorId: vendor.vendorId ?? null,
    vendorName: vendor.vendorName ?? null,
    vendorGrossAmount: vendorPrice.grossAmount ?? null,
    vendorFuelLevyPct: vendorPrice.fuelLevyPct ?? null,
    vendorFuelLevyAmount: vendorPrice.fuelLevyAmount ?? null,
    vendorGstPct: vendorPrice.gstPct ?? null,
    vendorGstAmount: vendorPrice.gstAmount ?? null,
    vendorNetAmount: vendorPrice.netAmount ?? null,
    vendorTotalAmount: vendorPrice.totalAmount ?? null,

    createdByAdminId: adminId,
    stops: { create: [...pickups, ...deliveries] },
    lanes: { create: lanes },
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
