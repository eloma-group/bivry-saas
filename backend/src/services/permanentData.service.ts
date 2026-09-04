import { prisma } from '../config/prisma';
import { ApiError } from '../utils/apiError';
import type {
  PermanentCustomerInput,
  PermanentCustomerUpdateInput,
  PermanentVendorInput,
  PermanentVendorUpdateInput,
} from '../validators/permanentData.validator';

/**
 * Permanent Data: the pickups and the vendors we run often enough to keep on
 * file, so Create Booking is picked from rather than typed out.
 *
 * A customer row is one place a customer loads from - Amazon has one per site -
 * and is found by the name that carries the site. A vendor row is one per
 * vendor, because we agree one set of figures with a vendor for the work.
 *
 * Both carry a reference the server hands out, BIVRY-CJOB-5000 and
 * BIVRY-VJOB-5000, counting up from 5000. It is allocated here rather than
 * typed for the same reason booking job numbers are: two admins adding a row at
 * the same moment would otherwise both reach for the same number.
 */

const CUSTOMER_PREFIX = 'BIVRY-CJOB-';
const VENDOR_PREFIX = 'BIVRY-VJOB-';
const SEQUENCE_START = 5000;

/** How many numbers to walk past before giving up, if creates keep colliding. */
const ATTEMPTS = 25;

/**
 * The next free sequence for a prefix: one past the highest already taken, or
 * 5000 where none is.
 *
 * Read as a single MAX rather than by counting rows, so a deleted row never
 * hands its number on to the next one. The trailing digits are cast to an
 * integer because a text sort puts 10000 before 9999.
 */
async function nextSequence(table: 'permanent_customers' | 'permanent_vendors'): Promise<number> {
  const rows =
    table === 'permanent_customers'
      ? await prisma.$queryRaw<Array<{ max: number | null }>>`
          SELECT MAX(SUBSTRING(client_job_id FROM '[0-9]+$')::int) AS max
            FROM permanent_customers
           WHERE client_job_id LIKE ${`${CUSTOMER_PREFIX}%`}
        `
      : await prisma.$queryRaw<Array<{ max: number | null }>>`
          SELECT MAX(SUBSTRING(vendor_job_id FROM '[0-9]+$')::int) AS max
            FROM permanent_vendors
           WHERE vendor_job_id LIKE ${`${VENDOR_PREFIX}%`}
        `;

  const max = rows[0]?.max ?? null;
  return max === null ? SEQUENCE_START : Number(max) + 1;
}

/** Whether a failed write is the unique index on one of these columns. */
function isClashOn(error: unknown, column: string): boolean {
  const { code, meta } = error as { code?: string; meta?: { target?: unknown } };
  if (code !== 'P2002') return false;
  const target = meta?.target;
  const fields = Array.isArray(target) ? target.map(String) : [String(target ?? '')];
  return fields.some((field) => field.includes(column));
}

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------

export async function listPermanentCustomers(search?: string) {
  const term = (search ?? '').trim();
  return prisma.permanentCustomer.findMany({
    where: term
      ? {
          OR: [
            { pickUpCompany: { contains: term, mode: 'insensitive' } },
            { clientJobId: { contains: term, mode: 'insensitive' } },
            { reference: { contains: term, mode: 'insensitive' } },
            { suburb: { contains: term, mode: 'insensitive' } },
          ],
        }
      : undefined,
    orderBy: { pickUpCompany: 'asc' },
  });
}

export async function createPermanentCustomer(input: PermanentCustomerInput) {
  const first = await nextSequence('permanent_customers');

  // The same walk a booking job number does: another admin can take the number
  // between the MAX above and the insert, which the unique index refuses.
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const clientJobId = `${CUSTOMER_PREFIX}${first + attempt}`;
    try {
      return await prisma.permanentCustomer.create({ data: { ...input, clientJobId } });
    } catch (error) {
      if (isClashOn(error, 'pick_up_company')) {
        throw ApiError.conflict('A saved pickup already uses that Pick-Up Company name');
      }
      if (!isClashOn(error, 'client_job_id')) throw error;
    }
  }

  throw ApiError.internal('Could not allocate a client job number');
}

export async function updatePermanentCustomer(id: string, input: PermanentCustomerUpdateInput) {
  try {
    return await prisma.permanentCustomer.update({ where: { id }, data: input });
  } catch (error) {
    if (isClashOn(error, 'pick_up_company')) {
      throw ApiError.conflict('A saved pickup already uses that Pick-Up Company name');
    }
    if ((error as { code?: string }).code === 'P2025') {
      throw ApiError.notFound('That saved pickup no longer exists');
    }
    throw error;
  }
}

export async function deletePermanentCustomer(id: string) {
  try {
    await prisma.permanentCustomer.delete({ where: { id } });
  } catch (error) {
    if ((error as { code?: string }).code === 'P2025') {
      throw ApiError.notFound('That saved pickup no longer exists');
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Vendors
// ---------------------------------------------------------------------------

export async function listPermanentVendors(search?: string) {
  const term = (search ?? '').trim();
  return prisma.permanentVendor.findMany({
    where: term
      ? {
          OR: [
            { vendorName: { contains: term, mode: 'insensitive' } },
            { vendorJobId: { contains: term, mode: 'insensitive' } },
            { suburb: { contains: term, mode: 'insensitive' } },
          ],
        }
      : undefined,
    orderBy: { vendorName: 'asc' },
  });
}

/**
 * Saves what we have agreed with a vendor.
 *
 * The vendor's own company name is read from their record rather than trusted
 * from the form, so a list of these rows always says who they really are, and a
 * vendor that has been deleted since cannot be saved against.
 */
export async function createPermanentVendor(input: PermanentVendorInput) {
  const vendor = await prisma.vendor.findUnique({
    where: { id: input.vendorId },
    select: { companyName: true },
  });
  if (!vendor) throw ApiError.notFound('That vendor no longer exists');

  const { vendorName: _ignored, ...rest } = input;
  const first = await nextSequence('permanent_vendors');

  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const vendorJobId = `${VENDOR_PREFIX}${first + attempt}`;
    try {
      return await prisma.permanentVendor.create({
        data: { ...rest, vendorName: vendor.companyName, vendorJobId },
      });
    } catch (error) {
      if (isClashOn(error, 'vendor_id')) {
        throw ApiError.conflict('That vendor already has a saved price. Edit it instead.');
      }
      if (!isClashOn(error, 'vendor_job_id')) throw error;
    }
  }

  throw ApiError.internal('Could not allocate a vendor job number');
}

/** The vendor a row belongs to is fixed: only the figures and address change. */
export async function updatePermanentVendor(id: string, input: PermanentVendorUpdateInput) {
  try {
    return await prisma.permanentVendor.update({ where: { id }, data: input });
  } catch (error) {
    if ((error as { code?: string }).code === 'P2025') {
      throw ApiError.notFound('That saved vendor price no longer exists');
    }
    throw error;
  }
}

export async function deletePermanentVendor(id: string) {
  try {
    await prisma.permanentVendor.delete({ where: { id } });
  } catch (error) {
    if ((error as { code?: string }).code === 'P2025') {
      throw ApiError.notFound('That saved vendor price no longer exists');
    }
    throw error;
  }
}
