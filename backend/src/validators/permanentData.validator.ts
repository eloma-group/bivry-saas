import { z } from 'zod';

/**
 * The Permanent Data payloads, as the Admin portal sends them.
 *
 * These are reference records rather than accounts: a pickup we run often, and
 * what we have agreed with a vendor. Almost everything is optional, because a
 * row is worth keeping the moment it has a name, and the price is often filled
 * in later. Blanks are normalised to null and amounts to numbers here, so the
 * service and Prisma only ever see clean values.
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

/** The same, but the field has to hold something. */
const requiredText = z
  .string()
  .transform((value) => value.trim())
  .refine((value) => value.length > 0, 'Required');

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

const uuidText = z
  .string()
  .transform((value) => value.trim())
  .refine((value) => UUID_RE.test(value), 'Invalid id');

/** The address, asked for in the six parts every form in the product uses. */
const addressShape = {
  suite: text,
  street1: text,
  suburb: text,
  state: text,
  postCode: text,
  country: text,
  /** The address as one line. Kept as typed rather than rebuilt from the parts. */
  fullAddress: text,
};

/**
 * A saved pickup.
 *
 * `pickUpCompany` is the only thing asked for, because it is what a booking
 * picks by and what the row is filed under. The job reference is not here at
 * all: the server hands that out, and a client is never trusted for one.
 */
export const permanentCustomerSchema = z.object({
  pickUpCompany: requiredText,
  agreementType: text,
  reference: text,
  trailer: text,
  ...addressShape,
  grossAmount: amount,
  fuelLevyPct: amount,
  fuelLevyAmount: amount,
  splitChargePct: amount,
  splitChargeAmount: amount,
  otherChargesPct: amount,
  otherChargesAmount: amount,
  gstPct: amount,
  gstAmount: amount,
  netAmount: amount,
  totalAmount: amount,
  finalAmount: amount,
});

/** A saved vendor price. One per vendor, so the vendor is what identifies it. */
export const permanentVendorSchema = z.object({
  vendorId: uuidText,
  vendorName: text,
  grossAmount: amount,
  /** The gross for the second trailer, where the load runs on two. */
  grossAmount2: amount,
  fuelLevyPct: amount,
  fuelLevyAmount: amount,
  gstPct: amount,
  gstAmount: amount,
  netAmount: amount,
  totalAmount: amount,
  ...addressShape,
});

/**
 * An edit. Every field is optional, and only what arrives is written, so a form
 * that shows the address alone cannot blank out the price it never asked about.
 */
export const permanentCustomerUpdateSchema = permanentCustomerSchema.partial();
export const permanentVendorUpdateSchema = permanentVendorSchema.partial().omit({ vendorId: true });

export const permanentListQuerySchema = z.object({
  search: text,
});

export type PermanentCustomerInput = z.infer<typeof permanentCustomerSchema>;
export type PermanentCustomerUpdateInput = z.infer<typeof permanentCustomerUpdateSchema>;
export type PermanentVendorInput = z.infer<typeof permanentVendorSchema>;
export type PermanentVendorUpdateInput = z.infer<typeof permanentVendorUpdateSchema>;
