import { z } from 'zod';
import { NAME_MAX, optionalPersonName, optionalPhoneNumber } from './fields';

/**
 * The customer onboarding sections.
 *
 * Every field below is optional on purpose: a half filled form is exactly what
 * a draft is, and the customer has to be able to save and come back. Only the
 * submit at the end insists on the whole thing (see customer.service).
 *
 * The shapes deliberately mirror `vendor.validator.ts` where the two forms ask
 * the same question, so a fix to one rule is obvious in the other.
 */

/**
 * Empty strings and null from the form are treated as "not provided".
 *
 * The empty and null options come before the coercion on purpose: `new Date(null)`
 * is a valid date (the 1970 epoch), so a null left to `z.coerce.date()` would be
 * stored as 1970-01-01 rather than cleared.
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

/** A multi select comes back as a list of labels, empty entries dropped. */
const textList = (max = 150) =>
  z
    .array(z.string().trim().max(max))
    .optional()
    .default([])
    .transform((values) => values.filter((value) => value !== ''));

export const CUSTOMER_CONTACT_TYPES = ['MAIN', 'OPERATIONS', 'ACCOUNTS', 'DISPATCH'] as const;

export const CUSTOMER_BILLING_TYPES = ['INVOICING', 'RCTI'] as const;

export const CUSTOMER_DOCUMENT_TYPES = ['COMPANY_LOGO', 'CONTRACT', 'ADDITIONAL'] as const;

/**
 * The company block.
 *
 * This section is about the business, not about a person at it: the named
 * contacts live in the Communication section, one per department. The email is
 * absent for a different reason - it identifies the account, and can only be
 * changed from the Admin portal.
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
  creationDate: optionalDate,
});

export const contactsSectionSchema = z.object({
  contacts: z
    .array(
      z.object({
        type: z.enum(CUSTOMER_CONTACT_TYPES),
        contactPerson: optionalPersonName('Contact person'),
        designation: optionalText(100),
        contactNumber: optionalPhoneNumber('Contact number'),
        email: optionalText(150),
      }),
    )
    .max(CUSTOMER_CONTACT_TYPES.length),
  /**
   * The blocks the customer added beyond the four departments, in the order
   * they entered them.
   *
   * Optional rather than defaulted: the list is replaced wholesale, so a client
   * that does not send it means "leave them alone" and not "delete them all".
   */
  additionalContacts: z
    .array(
      z.object({
        label: optionalText(100),
        contactPerson: optionalPersonName('Contact person'),
        designation: optionalText(100),
        contactNumber: optionalPhoneNumber('Contact number'),
        email: optionalText(150),
      }),
    )
    .max(25)
    .optional(),
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

const addressShape = z.object({
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
  /**
   * Every warehouse the customer operates, in the order they entered them.
   *
   * Optional rather than defaulted, for the same reason the extra contacts are:
   * the list is replaced wholesale, so a client that does not send it means
   * "leave them alone" and not "delete them all".
   */
  warehouses: z.array(addressShape).max(50).optional(),
});

export const billingSectionSchema = z.object({
  term: optionalText(60),
  billingType: z
    .union([z.enum(CUSTOMER_BILLING_TYPES), z.literal(''), z.null()])
    .optional()
    .transform((value) => (value === '' || value === undefined ? null : value)),
});

export const uploadDocumentSchema = z.object({
  docType: z.enum(CUSTOMER_DOCUMENT_TYPES),
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
