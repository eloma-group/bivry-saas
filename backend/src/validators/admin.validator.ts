import { z } from 'zod';
import {
  optionalDateOfBirth,
  optionalPersonName,
  optionalPhoneNumber,
  patchDateOfBirth,
  patchPersonName,
  patchPhoneNumber,
  personName,
} from './fields';

/** Empty strings from a form mean "not provided". */
const optionalText = (max = 150) =>
  z
    .union([z.string().trim().max(max), z.null()])
    .optional()
    .transform((value) => (value === '' || value === undefined ? null : value));

/**
 * The same idea for a partial update, where the two empty cases have to stay
 * apart. A key that is absent means "leave this column alone" and must survive
 * as `undefined`, which Prisma skips. An empty string is a cleared form field
 * and means "set this column to null".
 *
 * `optionalText` above folds both into null, which is right for a create and
 * wrong here: an update that sends only a status would blank every other
 * column on the row.
 */
const patchText = (max = 150) =>
  z
    .union([z.string().trim().max(max), z.null()])
    .optional()
    .transform((value) => (value === '' ? null : value));

/**
 * A list of short strings, empty entries dropped. Same helper as the vendor's
 * own validator: an admin writes the same shapes the vendor portal writes.
 */
const textList = (max = 150) =>
  z
    .array(z.string().trim().max(max))
    .optional()
    .default([])
    .transform((values) => values.filter((value) => value !== ''));

const password = z
  .string({ required_error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be 72 characters or fewer')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[0-9]/, 'Password must contain a number');

const ONBOARDING_STATUSES = [
  'NOT_STARTED',
  'IN_PROGRESS',
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
] as const;

const ACCOUNT_STATUSES = ['PENDING', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED'] as const;

export const driverListQuerySchema = z.object({
  search: optionalText(120),
  onboardingStatus: z.enum(ONBOARDING_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  // A whole-table export asks for every row at once, so the ceiling is high.
  pageSize: z.coerce.number().int().min(1).max(1000).default(25),
  sortBy: z
    .enum(['createdAt', 'submittedAt', 'firstName', 'email', 'onboardingStatus'])
    .default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
});

export const createDriverSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address').toLowerCase(),
  password,
  phone: optionalPhoneNumber(),
  firstName: personName('First name'),
  middleName: optionalPersonName('Middle name'),
  lastName: optionalPersonName('Last name'),
  dateOfBirth: optionalDateOfBirth,
  country: optionalText(100),
  status: z.enum(ACCOUNT_STATUSES).optional(),
});

export const updateDriverSchema = z
  .object({
    // Editable here and nowhere else. See updateDriver in the admin service.
    email: z
      .string()
      .trim()
      .min(1, 'Email is required')
      .email('Enter a valid email address')
      .toLowerCase()
      .optional(),
    phone: patchPhoneNumber(),
    firstName: personName('First name').optional(),
    middleName: patchPersonName('Middle name'),
    lastName: patchPersonName('Last name'),
    dateOfBirth: patchDateOfBirth,
    country: patchText(100),
    status: z.enum(ACCOUNT_STATUSES).optional(),
  })
  // Every field is optional on its own, but an empty body is a mistake, not an
  // instruction to change nothing.
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'Nothing to update',
  });

/**
 * An admin setting somebody else's password. Same strength rules the driver
 * would face doing it themselves, so an admin cannot quietly hand out a weaker
 * one than the portal accepts.
 */
export const setPasswordSchema = z.object({ password });

export const reviewDriverSchema = z
  .object({
    decision: z.enum(['APPROVED', 'REJECTED', 'UNDER_REVIEW']),
    reason: optionalText(500),
  })
  .refine((data) => data.decision !== 'REJECTED' || Boolean(data.reason), {
    message: 'Tell the driver what needs fixing',
    path: ['reason'],
  });

export const reviewSectionSchema = z.object({
  status: z.enum(['PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED']),
  remarks: optionalText(500),
});

export const sectionParamSchema = z.object({
  section: z.enum([
    'licence',
    'drivingHistory',
    'policeVerification',
    'visa',
    'passport',
    'medicare',
    'medical',
    'drugTest',
  ]),
});

// ---------------------------------------------------------------------------
// Vendors
// ---------------------------------------------------------------------------

export const vendorListQuerySchema = z.object({
  search: optionalText(120),
  onboardingStatus: z.enum(ONBOARDING_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  // A whole-table export asks for every row at once, so the ceiling is high.
  pageSize: z.coerce.number().int().min(1).max(1000).default(25),
  sortBy: z
    .enum(['createdAt', 'submittedAt', 'companyName', 'email', 'onboardingStatus'])
    .default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
});

export const createVendorSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address').toLowerCase(),
  password,
  phone: optionalPhoneNumber(),
  // Business names are not people's names: "A1 Logistics Pty. Ltd." is a real
  // one, so only contactPerson takes the letters-only rule.
  companyName: z.string().trim().min(1, 'Company name is required').max(150),
  tradingNames: textList(150),
  legalName: optionalText(150),
  contactPerson: optionalPersonName('Contact person'),
  abn: optionalText(30),
  acn: optionalText(30),
  abnStatus: optionalText(100),
  entityType: optionalText(100),
  gst: optionalText(100),
  websiteAddress: optionalText(200),
  status: z.enum(ACCOUNT_STATUSES).optional(),
});

export const updateVendorSchema = z
  .object({
    // Editable here and nowhere else. See updateVendor in the admin service.
    email: z
      .string()
      .trim()
      .min(1, 'Email is required')
      .email('Enter a valid email address')
      .toLowerCase()
      .optional(),
    phone: patchPhoneNumber(),
    companyName: z.string().trim().min(1, 'Company name is required').max(150).optional(),
    tradingNames: textList(150).optional(),
    legalName: patchText(150),
    contactPerson: patchPersonName('Contact person'),
    abn: patchText(30),
    acn: patchText(30),
    abnStatus: patchText(100),
    entityType: patchText(100),
    gst: patchText(100),
    websiteAddress: patchText(200),
    status: z.enum(ACCOUNT_STATUSES).optional(),
  })
  // Every field is optional on its own, but an empty body is a mistake, not an
  // instruction to change nothing.
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'Nothing to update',
  });

export const reviewVendorSchema = z
  .object({
    decision: z.enum(['APPROVED', 'REJECTED', 'UNDER_REVIEW']),
    reason: optionalText(500),
  })
  .refine((data) => data.decision !== 'REJECTED' || Boolean(data.reason), {
    message: 'Tell the vendor what needs fixing',
    path: ['reason'],
  });

export const vendorSectionParamSchema = z.object({
  section: z.enum([
    'accreditation',
    'productLiability',
    'publicLiability',
    'workCover',
    'marineGeneral',
    'marineAlcohol',
    'coc',
  ]),
});

// ---------------------------------------------------------------------------
// Customers
//
// The same shape as the vendor block above. A customer now carries a full
// onboarding record, so the account an admin creates asks for the same company
// details a vendor's does rather than only a name and an email.
// ---------------------------------------------------------------------------

/** A date that may be left out. An empty field means "no date given". */
const optionalDate = z
  .union([z.literal(''), z.null(), z.coerce.date()])
  .optional()
  .transform((value) => (value === '' || value === undefined ? null : value));

/** The same, for a partial update, where an absent key changes nothing. */
const patchDate = z
  .union([z.literal(''), z.null(), z.coerce.date()])
  .optional()
  .transform((value) => (value === '' ? null : value));

export const customerListQuerySchema = z.object({
  search: optionalText(120),
  onboardingStatus: z.enum(ONBOARDING_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  // A whole-table export asks for every row at once, so the ceiling is high.
  pageSize: z.coerce.number().int().min(1).max(1000).default(25),
  sortBy: z
    .enum(['createdAt', 'submittedAt', 'companyName', 'firstName', 'email', 'onboardingStatus'])
    .default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
});

export const createCustomerSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address').toLowerCase(),
  password,
  phone: optionalPhoneNumber(),
  firstName: personName('First name'),
  lastName: optionalPersonName('Last name'),
  // A business name, not a person's, so it keeps the plain length check.
  companyName: optionalText(150),
  designation: optionalText(100),
  tradingNames: textList(150),
  legalName: optionalText(150),
  abn: optionalText(30),
  acn: optionalText(30),
  abnStatus: optionalText(100),
  entityType: optionalText(100),
  gst: optionalText(100),
  websiteAddress: optionalText(200),
  creationDate: optionalDate,
  status: z.enum(ACCOUNT_STATUSES).optional(),
});

export const updateCustomerSchema = z
  .object({
    // Editable here and nowhere else. See updateCustomer in the admin service.
    email: z
      .string()
      .trim()
      .min(1, 'Email is required')
      .email('Enter a valid email address')
      .toLowerCase()
      .optional(),
    phone: patchPhoneNumber(),
    firstName: personName('First name').optional(),
    lastName: patchPersonName('Last name'),
    companyName: patchText(150),
    designation: patchText(100),
    tradingNames: textList(150).optional(),
    legalName: patchText(150),
    abn: patchText(30),
    acn: patchText(30),
    abnStatus: patchText(100),
    entityType: patchText(100),
    gst: patchText(100),
    websiteAddress: patchText(200),
    creationDate: patchDate,
    status: z.enum(ACCOUNT_STATUSES).optional(),
  })
  // Every field is optional on its own, but an empty body is a mistake, not an
  // instruction to change nothing.
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'Nothing to update',
  });

export const reviewCustomerSchema = z
  .object({
    decision: z.enum(['APPROVED', 'REJECTED', 'UNDER_REVIEW']),
    reason: optionalText(500),
  })
  .refine((data) => data.decision !== 'REJECTED' || Boolean(data.reason), {
    message: 'Tell the customer what needs fixing',
    path: ['reason'],
  });

export const updateAdminSchema = z
  .object({
    firstName: personName('First name').optional(),
    lastName: optionalPersonName('Last name'),
    phone: optionalPhoneNumber(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'Nothing to update' });
