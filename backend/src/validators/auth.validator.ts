import { z } from 'zod';
import type { RoleSlug } from '../types/auth.types';
import { optionalPersonName, personName, phoneNumber } from './fields';

const email = z
  .string({ required_error: 'Email is required' })
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

const phone = phoneNumber().optional();

/**
 * A company name is not a person's name: "A1 Logistics Pty. Ltd." is a real one
 * and would fail the letters-only rule, so business names keep the plain length
 * check and only the names of people are narrowed.
 */
const businessName = (label: string) =>
  z.string({ required_error: `${label} is required` }).trim().min(1, `${label} is required`).max(150);

export const loginSchema = z.object({
  email,
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required').optional(),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    token: z.string({ required_error: 'Reset token is required' }).min(1, 'Reset token is required'),
    password,
    confirmPassword: z.string().optional(),
  })
  .refine(
    (data) => data.confirmPassword === undefined || data.confirmPassword === data.password,
    { message: 'Passwords do not match', path: ['confirmPassword'] },
  );

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    password,
    confirmPassword: z.string().optional(),
  })
  .refine(
    (data) => data.confirmPassword === undefined || data.confirmPassword === data.password,
    { message: 'Passwords do not match', path: ['confirmPassword'] },
  );

export const verifyResetTokenSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
});

const baseRegister = { email, password, phone };

/** Register payloads differ per portal because each table has its own columns. */
export const registerSchemas: Record<RoleSlug, z.ZodTypeAny> = {
  admin: z.object({
    ...baseRegister,
    firstName: personName('First name'),
    lastName: personName('Last name'),
  }),
  customer: z.object({
    ...baseRegister,
    // A customer is a business, so the company is what the account is opened
    // in the name of. No person and no phone: who we speak to is asked for
    // once, per department, in the onboarding form's Communication section.
    companyName: businessName('Company name'),
  }),
  vendor: z.object({
    ...baseRegister,
    // A vendor is a business we have to be able to reach, so the number is asked
    // for at signup rather than left to the onboarding form. Every other portal
    // keeps it optional.
    phone: phoneNumber(),
    companyName: businessName('Company name'),
    contactPerson: optionalPersonName('Contact person'),
    abn: z.string().trim().max(30).optional(),
  }),
  employee: z.object({
    ...baseRegister,
    firstName: personName('First name'),
    lastName: personName('Last name'),
    employeeCode: z.string().trim().max(30).optional(),
    department: z.string().trim().max(100).optional(),
    designation: z.string().trim().max(100).optional(),
  }),
  driver: z.object({
    ...baseRegister,
    firstName: personName('First name'),
    middleName: optionalPersonName('Middle name'),
    lastName: personName('Last name'),
  }),
};
