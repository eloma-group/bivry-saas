import { z } from 'zod';
import { optionalPersonName, optionalPhoneNumber } from './fields';

/** Empty strings from the form are treated as "not provided". */
const optionalDate = z
  .union([z.coerce.date(), z.literal(''), z.null()])
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
 * a draft is, and the supplier has to be able to save and come back. Only the
 * submit at the end insists on the whole thing (see vendor.service).
 */
export const companySectionSchema = z.object({
  companyName: optionalText(150),
  tradingName: optionalText(150),
  legalName: optionalText(150),
  abn: optionalText(30),
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
  invoicePreference: optionalText(100),
  invoiceEmails: textList(150),
  invoiceOther: optionalText(300),
});

export const directorsSectionSchema = z.object({
  directors: z
    .array(
      z.object({
        designation: optionalText(100),
        email: optionalText(150),
        contactNumber: optionalPhoneNumber('Contact number'),
      }),
    )
    .max(25),
});

export const bankSectionSchema = z.object({
  accountName: optionalText(150),
  bankName: optionalText(150),
  bsb: optionalText(20),
  accountNumber: optionalText(40),
});

export const coverageSectionSchema = z.object({
  areasCovered: textList(120),
  businessOperations: textList(120),
});

export const warehousesSectionSchema = z.object({
  warehouses: z
    .array(
      z.object({
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

export const accreditationSectionSchema = z.object({
  accreditationNumber: optionalText(50),
  massManagementExpiry: optionalDate,
  basicFatigueExpiry: optionalDate,
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
