import { z } from 'zod';
import { NAME_MAX, optionalPersonName, optionalPhoneNumber } from './fields';

/**
 * Empty strings and null from the form are treated as "not provided".
 *
 * The empty and null options come before the coercion on purpose: `new Date(null)`
 * is a valid date (the 1970 epoch), so a null left to `z.coerce.date()` would be
 * stored as 1970-01-01 rather than cleared. Matching null first keeps a missing
 * date missing.
 */
const optionalDate = z
  .union([z.literal(''), z.null(), z.coerce.date()])
  .optional()
  .transform((value) => (value === '' || value === undefined ? null : value));

const optionalText = (max = 150) =>
  z
    .union([z.string().trim().max(max), z.null()])
    .optional()
    .transform((value) => (value === '' || value === undefined ? null : value));

const optionalInt = z
  .union([z.coerce.number().int().min(0).max(100000), z.literal(''), z.null()])
  .optional()
  .transform((value) => (value === '' || value === undefined ? null : value));

/**
 * A BSB is exactly six digits. The frontend says the same in
 * `utils/validation.ts`; keep the two in step.
 */
const BSB_LENGTH = 6;

/**
 * Digits and nothing else. Optional like everything else here - the form saves
 * as a draft - but a value that is present has to be a number.
 *
 * `exact` is for a number with a fixed length. Left out there is no length rule
 * at all, which is what an account number needs: how many digits one runs to
 * depends on the bank, so a ceiling here would refuse a real account.
 */
const optionalDigits = (label: string, exact?: number) =>
  z
    .union([
      z
        .string()
        .trim()
        .min(1)
        // One issue at a time, and the more basic one first: told that a dashed
        // BSB is both non-numeric and the wrong length, the length is noise -
        // take the dashes out and it is six digits after all.
        .superRefine((value, ctx) => {
          if (!/^\d+$/.test(value)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `${label} is digits only - no letters, spaces or symbols`,
            });
            return;
          }
          if (exact !== undefined && value.length !== exact) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `${label} must be exactly ${exact} digits`,
            });
          }
        }),
      z.literal(''),
      z.null(),
    ])
    .optional()
    .transform((value) => (value === '' || value === undefined ? null : value));

/** A multi select comes back as a list of labels, empty entries dropped. */
const textList = (max = 150) =>
  z
    .array(z.string().trim().max(max))
    .optional()
    .default([])
    .transform((values) => values.filter((value) => value !== ''));

export const CONTACT_TYPES = ['OPERATIONS', 'COMPLIANCE', 'ADMIN', 'DISPATCH'] as const;

export const INSURANCE_TYPES = [
  'PRODUCT_LIABILITY',
  'PUBLIC_LIABILITY',
  'WORK_COVER',
  'MARINE_GENERAL',
  'MARINE_ALCOHOL',
  'COC',
] as const;

export const VENDOR_DOCUMENT_TYPES = [
  'COMPANY_LOGO',
  'ACCREDITATION',
  'INSURANCE_PRODUCT_LIABILITY',
  'INSURANCE_PUBLIC_LIABILITY',
  'INSURANCE_WORK_COVER',
  'INSURANCE_MARINE_GENERAL',
  'INSURANCE_MARINE_ALCOHOL',
  'INSURANCE_COC',
  'COMPLIANCE_DRUG',
  'COMPLIANCE_ALCOHOL_POLICY',
  'COMPLIANCE_PROCEDURE',
  'COMPLIANCE_RISK_MANAGEMENT',
  'COMPLIANCE_SPEED_POLICY',
  'COMPLIANCE_FATIGUE_POLICY',
  'COMPLIANCE_GPS_SNAPSHOT',
  'COMPLIANCE_WHS_POLICY',
  'COMPLIANCE_ADDITIONAL',
] as const;

/**
 * Every field below is optional on purpose: a half filled form is exactly what
 * a draft is, and the vendor has to be able to save and come back. Only the
 * submit at the end insists on the whole thing (see vendor.service).
 */
export const companySectionSchema = z.object({
  companyName: optionalText(150),
  tradingNames: textList(150),
  legalName: optionalText(150),
  abn: optionalText(30),
  acn: optionalText(30),
  abnStatus: optionalText(100),
  entityType: optionalText(100),
  gst: optionalText(100),
  websiteAddress: optionalText(200),
  phone: optionalPhoneNumber(),
  contactPerson: optionalPersonName('Contact person'),
});

export const contactsSectionSchema = z.object({
  contacts: z
    .array(
      z.object({
        type: z.enum(CONTACT_TYPES),
        contactPerson: optionalPersonName('Contact person'),
        designation: optionalText(100),
        contactNumber: optionalPhoneNumber('Contact number'),
        email: optionalText(150),
      }),
    )
    .max(CONTACT_TYPES.length),
});

export const directorsSectionSchema = z.object({
  directors: z
    .array(
      z.object({
        // Not `optionalPersonName`: this is copied off the document naming the
        // director, and those carry apostrophes, hyphens and initials that the
        // letters-only rule would refuse. Only the length is capped.
        name: optionalText(NAME_MAX),
        email: optionalText(150),
        contactNumber: optionalPhoneNumber('Contact number'),
      }),
    )
    .max(25),
});

export const bankSectionSchema = z.object({
  accountName: optionalText(150),
  bankName: optionalText(150),
  bsb: optionalDigits('BSB', BSB_LENGTH),
  accountNumber: optionalDigits('Account number'),
});

export const coverageSectionSchema = z.object({
  areasCovered: textList(120),
  businessOperations: textList(120),
});

const addressShape = z.object({
  /** Unit, suite or flat number. Kept off the street line. */
  suite: optionalText(50),
  street1: optionalText(150),
  street2: optionalText(150),
  suburb: optionalText(100),
  state: optionalText(100),
  country: optionalText(100),
  postCode: optionalText(20),
});

/**
 * The two addresses the company is registered at.
 *
 * The billing block is sent whether or not the tick says it is a copy: the
 * client sends the copy, so nothing downstream has to follow a flag to find an
 * address.
 */
export const addressesSectionSchema = z.object({
  billingSameAsPrincipal: z.boolean(),
  principal: addressShape,
  billing: addressShape,
});

export const warehousesSectionSchema = z.object({
  warehouses: z
    .array(
      z.object({
        /** Unit, suite or flat number. Kept off the street line. */
        suite: optionalText(50),
        street1: optionalText(150),
        street2: optionalText(150),
        suburb: optionalText(100),
        state: optionalText(100),
        country: optionalText(100),
        postCode: optionalText(20),
      }),
    )
    .max(50),
});

/** Yards. Same address shape as a warehouse, and optional: there may be none. */
export const yardsSectionSchema = z.object({
  yards: z.array(addressShape).max(50),
});

export const accreditationSectionSchema = z.object({
  accreditationNumber: optionalText(50),
  expiryDate: optionalDate,
  massManagementExpiry: optionalDate,
  dangerousGoodsExpiry: optionalDate,
  nhvasExpiry: optionalDate,
  haccpExpiry: optionalDate,
});

export const insurancesSectionSchema = z.object({
  insurances: z
    .array(
      z.object({
        type: z.enum(INSURANCE_TYPES),
        policyNumber: optionalText(50),
        insurer: optionalText(150),
        issueDate: optionalDate,
        expiryDate: optionalDate,
        sumAssured: optionalText(50),
        // Work cover is keyed by an employer number and a validity window
        // instead of a single expiry date.
        employerNumber: optionalText(50),
        validFrom: optionalDate,
        validTill: optionalDate,
        dueInDays: optionalInt,
      }),
    )
    .max(INSURANCE_TYPES.length),
});

export const uploadDocumentSchema = z.object({
  docType: z.enum(VENDOR_DOCUMENT_TYPES),
  category: optionalText(120),
  issueDate: optionalDate,
  expiryDate: optionalDate,
});

/** Metadata corrections on a file that is already stored. */
export const updateDocumentSchema = z.object({
  category: optionalText(120),
  issueDate: optionalDate,
  expiryDate: optionalDate,
});

export const onboardingStepSchema = z.object({
  step: z.coerce.number().int().min(0).max(20),
});
