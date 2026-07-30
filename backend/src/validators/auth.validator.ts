import { z } from 'zod';
import type { RoleSlug } from '../types/auth.types';

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

const phone = z
  .string()
  .trim()
  .min(6, 'Enter a valid phone number')
  .max(20, 'Enter a valid phone number')
  .optional();

const name = (label: string) =>
  z.string({ required_error: `${label} is required` }).trim().min(1, `${label} is required`).max(100);

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
    firstName: name('First name'),
    lastName: z.string().trim().max(100).optional(),
  }),
  customer: z.object({
    ...baseRegister,
    firstName: name('First name'),
    lastName: z.string().trim().max(100).optional(),
    companyName: z.string().trim().max(150).optional(),
  }),
  vendor: z.object({
    ...baseRegister,
    companyName: name('Company name'),
    contactPerson: z.string().trim().max(100).optional(),
    abn: z.string().trim().max(30).optional(),
  }),
  employee: z.object({
    ...baseRegister,
    firstName: name('First name'),
    lastName: z.string().trim().max(100).optional(),
    employeeCode: z.string().trim().max(30).optional(),
    department: z.string().trim().max(100).optional(),
    designation: z.string().trim().max(100).optional(),
  }),
  driver: z.object({
    ...baseRegister,
    firstName: name('First name'),
    middleName: z.string().trim().max(100).optional(),
    lastName: z.string().trim().max(100).optional(),
  }),
};
