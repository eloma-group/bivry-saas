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
function resolveFinancialYear(input: CreateBookingInput): [string, string] {
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
 */
async function nextJobSequence(prefix: string): Promise<number> {
  const rows = await prisma.$queryRaw<Array<{ max: number | null }>>`
    SELECT MAX(SUBSTRING(job_number FROM '[0-9]+$')::int) AS max
    FROM bookings
    WHERE job_number LIKE ${`${prefix}%`}
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
    try {
      return await prisma.booking.create({
        data: { ...data, jobNumber: `${prefix}${first + attempt}` },
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
