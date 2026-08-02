import { z } from 'zod';

/** Empty strings from a form mean "not provided". */
const optionalText = (max = 150) =>
  z
    .union([z.string().trim().max(max), z.null()])
    .optional()
    .transform((value) => (value === '' || value === undefined ? null : value));

const optionalDate = z
  .union([z.coerce.date(), z.literal(''), z.null()])
  .optional()
  .transform((value) => (value === '' || value === undefined ? null : value));

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
  phone: optionalText(20),
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  middleName: optionalText(100),
  lastName: optionalText(100),
  dateOfBirth: optionalDate,
  nationality: optionalText(100),
  status: z.enum(ACCOUNT_STATUSES).optional(),
});

export const updateDriverSchema = z
  .object({
    phone: optionalText(20),
    firstName: z.string().trim().min(1, 'First name is required').max(100).optional(),
    middleName: optionalText(100),
    lastName: optionalText(100),
    dateOfBirth: optionalDate,
    nationality: optionalText(100),
    status: z.enum(ACCOUNT_STATUSES).optional(),
  })
  // Every field is optional on its own, but an empty body is a mistake, not an
  // instruction to change nothing.
  .refine((data) => Object.keys(data).length > 0, { message: 'Nothing to update' });

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
    'medical',
    'drugTest',
  ]),
});

export const updateAdminSchema = z
  .object({
    firstName: z.string().trim().min(1, 'First name is required').max(100).optional(),
    lastName: optionalText(100),
    phone: optionalText(20),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'Nothing to update' });
