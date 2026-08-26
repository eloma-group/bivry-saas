import { z } from 'zod';

/**
 * The three field rules that hold everywhere in the product: a person's name, a
 * phone number, and a date of birth.
 *
 * They are here rather than repeated per validator because "everywhere" is the
 * whole point of them. A driver signing themselves up, an admin creating an
 * employee and a vendor correcting a contact all reach a different schema
 * file, and the moment one of those files carries its own copy of the rule it
 * becomes the loose one that lets bad data in.
 *
 * The frontend states the same three rules in `utils/validation.ts`, so a form
 * refuses what the API would refuse rather than only finding out on submit.
 * Keep the two in step.
 */

// ---------------------------------------------------------------------------
// Names
// ---------------------------------------------------------------------------

export const NAME_MAX = 50;

/**
 * Letters and single spaces between words. No digits and no punctuation.
 *
 * This is deliberately narrow and it does reject some real names: O'Brien and
 * Anne-Marie both fail. Widening it is one character class here, and nothing
 * else in the product has to change.
 */
export const NAME_RE = /^[A-Za-z]+(?: [A-Za-z]+)*$/;

const NAME_MESSAGE = 'Use letters only, no numbers or symbols';

/** A person's name that has to be there. */
export function personName(label: string) {
  return z
    .string({ required_error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .max(NAME_MAX, `${label} must be ${NAME_MAX} characters or fewer`)
    .regex(NAME_RE, NAME_MESSAGE);
}

/**
 * A person's name that may be left out. An absent field and an empty one both
 * mean "no name given", which is stored as null.
 */
export function optionalPersonName(label: string) {
  return z
    .union([
      z
        .string()
        .trim()
        .max(NAME_MAX, `${label} must be ${NAME_MAX} characters or fewer`)
        .regex(NAME_RE, NAME_MESSAGE),
      z.literal(''),
      z.null(),
    ])
    .optional()
    .transform((value) => (value === '' || value === undefined ? null : value));
}

/**
 * The same, for a partial update. An absent key means "leave this column
 * alone" and has to survive as undefined so Prisma skips it; an empty string is
 * a cleared form field and means null. See the note on patchText in
 * admin.validator.ts for why the two cannot be folded together.
 */
export function patchPersonName(label: string) {
  return z
    .union([
      z
        .string()
        .trim()
        .max(NAME_MAX, `${label} must be ${NAME_MAX} characters or fewer`)
        .regex(NAME_RE, NAME_MESSAGE),
      z.literal(''),
      z.null(),
    ])
    .optional()
    .transform((value) => (value === '' ? null : value));
}

// ---------------------------------------------------------------------------
// Phone numbers
// ---------------------------------------------------------------------------

export const PHONE_MAX = 15;

/**
 * Digits, an optional leading `+`, and at most one space. Fifteen characters in
 * total, which is what E.164 allows for the longest international number.
 *
 * Brackets, dashes and dots are all out, so `(03) 9999-0000` has to be typed as
 * `+61 399990000` or `0399990000`.
 */
export const PHONE_RE = /^\+?\d+(?: \d+)?$/;

const PHONE_MESSAGE = 'Digits only, with an optional leading + and at most one space';

export function phoneNumber(label = 'Phone number') {
  return z
    .string({ required_error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .max(PHONE_MAX, `${label} must be ${PHONE_MAX} characters or fewer`)
    .regex(PHONE_RE, PHONE_MESSAGE);
}

export function optionalPhoneNumber(label = 'Phone number') {
  return z
    .union([
      z
        .string()
        .trim()
        .max(PHONE_MAX, `${label} must be ${PHONE_MAX} characters or fewer`)
        .regex(PHONE_RE, PHONE_MESSAGE),
      z.literal(''),
      z.null(),
    ])
    .optional()
    .transform((value) => (value === '' || value === undefined ? null : value));
}

export function patchPhoneNumber(label = 'Phone number') {
  return z
    .union([
      z
        .string()
        .trim()
        .max(PHONE_MAX, `${label} must be ${PHONE_MAX} characters or fewer`)
        .regex(PHONE_RE, PHONE_MESSAGE),
      z.literal(''),
      z.null(),
    ])
    .optional()
    .transform((value) => (value === '' ? null : value));
}

// ---------------------------------------------------------------------------
// Date of birth
// ---------------------------------------------------------------------------

export const MIN_AGE = 18;

/**
 * Whole years between a date of birth and today.
 *
 * Counted by calendar date rather than by dividing milliseconds, so somebody
 * whose birthday is today is eighteen and somebody whose birthday is tomorrow
 * is not. Leap years and daylight saving both break the arithmetic version.
 */
export function ageInYears(birth: Date, on: Date = new Date()): number {
  // Both sides in UTC on purpose. A date of birth is a calendar date with no
  // time in it, and it is parsed as midnight UTC; reading it back with local
  // getters shifts it a day west of Greenwich and would make somebody a day
  // older than they are.
  let age = on.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = on.getUTCMonth() - birth.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && on.getUTCDate() < birth.getUTCDate())) age -= 1;
  return age;
}

const DOB_MESSAGE = `Must be at least ${MIN_AGE} years old`;

function isOldEnough(value: Date | null): boolean {
  return value === null || ageInYears(value) >= MIN_AGE;
}

/** A date of birth that may be left out, but must be an adult's when given. */
export const optionalDateOfBirth = z
  .union([z.coerce.date(), z.literal(''), z.null()])
  .optional()
  .transform((value) => (value === '' || value === undefined ? null : value))
  .refine(isOldEnough, { message: DOB_MESSAGE });

/** The same, for a partial update, where an absent key changes nothing. */
export const patchDateOfBirth = z
  .union([z.coerce.date(), z.literal(''), z.null()])
  .optional()
  .transform((value) => (value === '' ? null : value))
  .refine((value) => value === undefined || isOldEnough(value), { message: DOB_MESSAGE });
