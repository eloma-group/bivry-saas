import { z } from 'zod';
import {
  optionalDateOfBirth,
  optionalPersonName,
  optionalPhoneNumber,
} from './fields';

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

export const personalSectionSchema = z.object({
  // Optional so a half filled form can still be saved as a draft. An absent
  // name leaves the stored one alone rather than clearing it.
  firstName: optionalPersonName('First name'),
  middleName: optionalPersonName('Middle name'),
  lastName: optionalPersonName('Last name'),
  dateOfBirth: optionalDateOfBirth,
  nationality: optionalText(100),
  phone: optionalPhoneNumber(),
});

const addressBlockSchema = z.object({
  houseNumber: optionalText(50),
  street: optionalText(150),
  suburb: optionalText(100),
  state: optionalText(100),
  country: optionalText(100),
  postCode: optionalText(20),
});

export const addressSectionSchema = z.object({
  currentAddress: addressBlockSchema,
  sameAsCurrent: z.boolean().optional().default(false),
  permanentAddress: addressBlockSchema.optional(),
});

export const licenceSectionSchema = z.object({
  licenceNumber: optionalText(50),
  licenceCardNumber: optionalText(50),
  licenceType: z
    .enum(['CAR', 'HEAVY_RIGID', 'HEAVY_COMBINATION', 'MULTI_COMBINATION', 'MOTORCYCLE'])
    .nullable()
    .optional(),
  issuingState: optionalText(100),
  expiryDate: optionalDate,
});

/** Driving history, police check and medical all carry an issue + expiry date. */
export const issueExpirySchema = z.object({
  issueDate: optionalDate,
  expiryDate: optionalDate,
});

/** The drug and alcohol test expires six months after it was taken. */
export const drugTestSectionSchema = z.object({
  issueDate: optionalDate,
  expiryDate: optionalDate,
});

export const visaSectionSchema = z.object({
  visaStatus: optionalText(100),
  visaType: optionalText(100),
  expiryDate: optionalDate,
});

/** Asked of Australian nationals, who hold no visa. */
export const passportSectionSchema = z.object({
  passportNumber: optionalText(50),
  expiryDate: optionalDate,
});

export const medicareSectionSchema = z.object({
  cardNumber: optionalText(50),
  expiryDate: optionalDate,
});

export const uploadDocumentSchema = z.object({
  docType: z.enum([
    'PROFILE_PHOTO',
    'LICENCE_FRONT',
    'LICENCE_BACK',
    'DRIVING_HISTORY',
    'POLICE_VERIFICATION',
    'VISA',
    'MEDICAL',
    'DRUG_TEST',
    'PASSPORT_FRONT',
    'PASSPORT_BACK',
    'MEDICARE',
    'ADDITIONAL',
  ]),
  category: optionalText(100),
  // Only additional documents carry one: every other type has a section that
  // holds its own expiry date.
  expiryDate: optionalDate,
});

/** Metadata corrections on a file that is already stored. */
export const updateDocumentSchema = z.object({
  category: optionalText(100),
  expiryDate: optionalDate,
});

export const onboardingStepSchema = z.object({
  step: z.coerce.number().int().min(0).max(20),
});
