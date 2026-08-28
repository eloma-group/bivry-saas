import { z } from 'zod';

/**
 * The Create Booking payload, as the Admin portal sends it.
 *
 * The form is long and mostly optional, so every field but the job number is
 * allowed to arrive empty. Blanks are normalised to null here, amounts to a
 * number, so the service and Prisma only ever see clean values. Ids are checked
 * as uuids because they land in uuid columns.
 */

/** Trimmed text, with empty and absent both meaning null. */
const text = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => {
    if (value === null || value === undefined) return null;
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  });

/** A money or percent value, read as a number. Empty and junk both mean null. */
const amount = z
  .union([z.string(), z.number(), z.null()])
  .optional()
  .transform((value) => {
    if (value === null || value === undefined || value === '') return null;
    const parsed = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  });

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/** An id column: a uuid, or null when nothing was chosen. */
const uuidText = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value, ctx) => {
    if (value === null || value === undefined) return null;
    const trimmed = value.trim();
    if (trimmed === '') return null;
    if (!UUID_RE.test(trimmed)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid id' });
      return z.NEVER;
    }
    return trimmed;
  });

const stopSchema = z.object({
  clientJobNumber: text,
  trailer: text,
  scheduledAt: text,
  company: text,
  address: text,
  city: text,
  suburb: text,
  state: text,
  country: text,
  instructions: text,
});

const laneSchema = z.object({
  trailer: text,
  lane: text,
});

const priceSchema = z
  .object({
    grossAmount: amount,
    fuelLevyPct: amount,
    fuelLevyAmount: amount,
    gstPct: amount,
    gstAmount: amount,
    netAmount: amount,
    totalAmount: amount,
  })
  .partial();

export const createBookingSchema = z.object({
  jobNumber: z.string().trim().min(1, 'Job number is required'),
  bookingReceivedDate: text,
  financialYear: text,
  customerId: uuidText,
  customerName: text,
  customerAccountNumber: text,
  accountStatus: text,
  agreementType: text,
  reference: text,
  cargoType: text,
  vehicleType: text,
  trailerCategory: text,
  pickups: z.array(stopSchema).default([]),
  deliveries: z.array(stopSchema).default([]),
  lanes: z.array(laneSchema).default([]),
  price: priceSchema.optional(),
  vendor: z
    .object({ vendorId: uuidText, vendorName: text })
    .partial()
    .optional(),
  vendorPrice: priceSchema.optional(),
});

export const bookingListQuerySchema = z.object({
  search: text,
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'jobNumber', 'bookingReceivedDate']).default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
