import { z } from 'zod';
import {
  optionalPersonName,
  optionalPhoneNumber,
  patchPersonName,
  patchPhoneNumber,
  personName,
} from './fields';

/**
 * The plain accounts the Admin portal governs. Employees are the only kind left
 * here - a customer carries a full onboarding record now and is validated in
 * admin.validator.ts alongside the driver and the vendor.
 *
 * The create and update variants treat an absent field differently on purpose,
 * for the same reason the admin validator does: on a create, nothing provided
 * means null; on an update, an absent key means "leave this column alone" and
 * has to survive as `undefined` so Prisma skips it. Folding the two together is
 * how a partial update ends up blanking the columns it never mentioned.
 */

const ACCOUNT_STATUSES = ['PENDING', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED'] as const;

/** Create: an absent field and an empty one both mean "no value". */
const optionalText = (max = 150) =>
  z
    .union([z.string().trim().max(max), z.null()])
    .optional()
    .transform((value) => (value === '' || value === undefined ? null : value));

/** Update: an empty string clears the column, an absent key leaves it alone. */
const patchText = (max = 150) =>
  z
    .union([z.string().trim().max(max), z.null()])
    .optional()
    .transform((value) => (value === '' ? null : value));

const email = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .email('Enter a valid email address')
  .toLowerCase();

const password = z
  .string({ required_error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be 72 characters or fewer')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[0-9]/, 'Password must contain a number');

export const listQuerySchema = z.object({
  search: optionalText(120),
  status: z.enum(ACCOUNT_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'email', 'firstName']).default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
});

export const setPasswordSchema = z.object({ password });

// ---------------------------------------------------------------------------
// Employee
// ---------------------------------------------------------------------------

export const createEmployeeSchema = z.object({
  email,
  password,
  firstName: personName('First name'),
  lastName: optionalPersonName('Last name'),
  employeeCode: optionalText(50),
  department: optionalText(100),
  designation: optionalText(100),
  phone: optionalPhoneNumber(),
  status: z.enum(ACCOUNT_STATUSES).optional(),
});

export const updateEmployeeSchema = z
  .object({
    email: email.optional(),
    firstName: personName('First name').optional(),
    lastName: patchPersonName('Last name'),
    employeeCode: patchText(50),
    department: patchText(100),
    designation: patchText(100),
    phone: patchPhoneNumber(),
    status: z.enum(ACCOUNT_STATUSES).optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'Nothing to update',
  });
