/** Shared, reusable field validators used across the driver form. */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The three rules that hold everywhere in the product: a person's name, a phone
 * number, and a date of birth. The backend states the same three in
 * `validators/fields.ts`; keep the two in step, so a form refuses what the API
 * would refuse instead of only finding out on submit.
 */

export const NAME_MAX = 50;

/**
 * Letters and single spaces between words. No digits and no punctuation.
 *
 * Deliberately narrow, and it does reject some real names: O'Brien and
 * Anne-Marie both fail. Widening it is one character class here and one in
 * `validators/fields.ts`.
 */
export const NAME_RE = /^[A-Za-z]+(?: [A-Za-z]+)*$/;

export const PHONE_MAX = 15;

/**
 * Digits, an optional leading `+`, and at most one space. Fifteen characters in
 * total, which is what E.164 allows for the longest international number.
 * Brackets, dashes and dots are all out.
 */
export const PHONE_RE = /^\+?\d+(?: \d+)?$/;

/**
 * An Australian Business Number is exactly eleven digits, always. It is printed
 * with spaces - `51 824 753 556` - but the number itself carries none, so the
 * field takes digits only and refuses anything shorter or longer.
 */
export const ABN_LENGTH = 11;

export const ABN_RE = /^\d{11}$/;

/**
 * An Australian Company Number is exactly nine digits. Only a registered
 * company is issued one, so a sole trader or a partnership has an ABN and no
 * ACN at all - the field is optional for that reason, but a nine digit number
 * once anything is typed in it.
 */
export const ACN_LENGTH = 9;

export const ACN_RE = /^\d{9}$/;

/**
 * A BSB identifies the branch an account is held at. Exactly six digits,
 * always. It is printed with a dash or a space - `113-100`, `113 100` - but the
 * number itself carries neither, so the field takes digits only.
 */
export const BSB_LENGTH = 6;

export const BSB_RE = /^\d{6}$/;

export const MIN_AGE = 18;

/**
 * Whole years between a date of birth and today, counted by calendar date.
 *
 * Both sides in UTC, matching the backend: a date of birth is a calendar date
 * with no time in it, and "yyyy-MM-dd" parses as midnight UTC. Local getters
 * would shift it a day and disagree with the API about who is eighteen.
 */
export function ageInYears(birth: Date, on: Date = new Date()): number {
  let age = on.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = on.getUTCMonth() - birth.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && on.getUTCDate() < birth.getUTCDate())) age -= 1;
  return age;
}

/**
 * The latest date of birth that still counts as an adult, as yyyy-MM-dd.
 *
 * Handed to a date input's `max` so the calendar itself will not offer a date
 * that the rule below would reject.
 */
export function latestAdultBirthDate(on: Date = new Date()): string {
  const date = new Date(
    Date.UTC(on.getUTCFullYear() - MIN_AGE, on.getUTCMonth(), on.getUTCDate()),
  );
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/**
 * What the document store actually accepts. Kept in step with the backend
 * upload filter, so a file is never picked here only to be refused on save.
 *
 * The extensions are listed alongside the MIME types because Windows reports no
 * type at all for a .heic file, which would otherwise hide iPhone photos from
 * the picker. A HEIC is converted to JPEG on the way in, see `utils/heic`.
 */
export const ACCEPT_IMAGE =
  "image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif";
export const ACCEPT_DOCUMENT = `${ACCEPT_IMAGE},application/pdf`;

/** The same lists in the words a driver reads under an upload box. */
export const ACCEPT_IMAGE_LABEL = "JPG, PNG, WEBP or HEIC (iPhone)";
export const ACCEPT_DOCUMENT_LABEL = "PDF, JPG, PNG, WEBP or HEIC (iPhone)";

/** The wording that belongs under an upload box, picked from its accept list. */
export function acceptLabel(accept?: string): string {
  const list = accept ?? ACCEPT_DOCUMENT;
  return list.includes("application/pdf") ? ACCEPT_DOCUMENT_LABEL : ACCEPT_IMAGE_LABEL;
}

/** Whether a form value counts as answered. Files are objects, dates strings. */
export function isPresent(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim() !== "";
  return true;
}

export const rules = {
  required: (label: string) => ({
    required: `${label} is required`,
  }),
  /** An upload that has to be there. `required` cannot see a file object. */
  requiredFile: (label: string) => ({
    validate: (value: unknown) => isPresent(value) || `${label} is required`,
  }),
  /** A multi select that needs at least one tick. An empty array is not empty to `required`. */
  requiredList: (label: string) => ({
    validate: (value: unknown) =>
      (Array.isArray(value) && value.length > 0) || `${label} is required`,
  }),
  /**
   * Required, but only while the field is actually being asked for.
   *
   * Sections that appear and disappear - the permanent address, the visa half of
   * the identity section - keep their fields registered after they leave the
   * screen, so a plain `required` there would block a submit over a question
   * nobody was asked. The check is read at validation time, never captured.
   */
  requiredWhen: (label: string, asked: () => boolean) => ({
    validate: (value: unknown) => !asked() || isPresent(value) || `${label} is required`,
  }),
  /**
   * Any rule below, insisted on only while its field is being asked for.
   *
   * Takes the rule's own "required" message and moves it behind the same check
   * `requiredWhen` uses, so a contact block ticked as a copy of another stops
   * demanding answers the moment it leaves the screen - without restating the
   * length and format rules that go with it.
   *
   * Those are deliberately left in place. react-hook-form skips `pattern` and
   * `maxLength` on an empty value, so a hidden empty field passes them anyway,
   * and a hidden field with something still in it is worth checking.
   */
  onlyWhen: <T extends { required?: string }>(rule: T, asked: () => boolean) => {
    const { required, ...format } = rule;
    return {
      ...format,
      // A rule that was not insisting on an answer in the first place - `name`
      // called with required false - keeps only its format checks.
      validate: (value: unknown) =>
        required === undefined || !asked() || isPresent(value) || required,
    };
  },
  email: {
    required: "Email is required",
    pattern: { value: EMAIL_RE, message: "Enter a valid email address" },
  },
  /**
   * The same rule without the required half, for an address that may be left
   * out. Still checked for shape once something is typed: react-hook-form skips
   * `pattern` on an empty value, so a blank field passes and a mistyped one
   * does not.
   */
  optionalEmail: {
    pattern: { value: EMAIL_RE, message: "Enter a valid email address" },
  },
  /**
   * A name as it is written on a document.
   *
   * No letters-only rule, unlike `name` below. This is copied off a passport or
   * a company extract, and those carry apostrophes, hyphens, full stops in
   * initials and the occasional comma. Refusing them would refuse the very
   * thing the field asks to be shown. Only the length is capped.
   */
  fullName: (label: string) => ({
    required: `${label} is required`,
    maxLength: { value: NAME_MAX, message: `${label} must be ${NAME_MAX} characters or fewer` },
  }),
  /** A person's name. Pass the label so the required message reads properly. */
  name: (label: string, required = true) => ({
    ...(required ? { required: `${label} is required` } : {}),
    maxLength: { value: NAME_MAX, message: `${label} must be ${NAME_MAX} characters or fewer` },
    pattern: { value: NAME_RE, message: "Use letters only, no numbers or symbols" },
  }),
  phone: {
    required: "Phone number is required",
    maxLength: {
      value: PHONE_MAX,
      message: `Phone number must be ${PHONE_MAX} characters or fewer`,
    },
    pattern: {
      value: PHONE_RE,
      message: "Digits only, with an optional leading + and at most one space",
    },
  },
  /** The same rule without the required half, for a number that may be left out. */
  optionalPhone: {
    maxLength: {
      value: PHONE_MAX,
      message: `Phone number must be ${PHONE_MAX} characters or fewer`,
    },
    pattern: {
      value: PHONE_RE,
      message: "Digits only, with an optional leading + and at most one space",
    },
  },
  /** A date of birth. Everyone this system holds a record for is an adult. */
  dateOfBirth: (required = true) => ({
    ...(required ? { required: "Date of birth is required" } : {}),
    validate: (value: unknown) => {
      if (typeof value !== "string" || value.trim() === "") return true;
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return "Enter a valid date";
      return ageInYears(parsed) >= MIN_AGE || `Must be at least ${MIN_AGE} years old`;
    },
  }),
  /**
   * An ABN. Checked on every keystroke rather than on the way out of the field,
   * so the eleventh digit either settles the field or says why it has not.
   */
  abn: {
    required: "ABN is required",
    validate: (value: unknown) => {
      const abn = typeof value === "string" ? value.trim() : "";
      if (abn === "") return "ABN is required";
      if (!/^\d+$/.test(abn)) return "ABN is digits only - no letters, spaces or symbols";
      return ABN_RE.test(abn) || `ABN must be exactly ${ABN_LENGTH} digits`;
    },
  },
  /**
   * A BSB. Checked on every keystroke rather than on the way out of the field,
   * so the sixth digit either settles it or says why it has not.
   */
  bsb: {
    required: "BSB is required",
    validate: (value: unknown) => {
      const bsb = typeof value === "string" ? value.trim() : "";
      if (bsb === "") return "BSB is required";
      if (!/^\d+$/.test(bsb)) return "BSB is digits only - no letters, spaces or symbols";
      return BSB_RE.test(bsb) || `BSB must be exactly ${BSB_LENGTH} digits`;
    },
  },
  /**
   * An account number. Digits only, and no length rule: how many digits one
   * runs to depends on the bank, so a cap here would refuse a real account.
   */
  accountNumber: {
    required: "Account number is required",
    validate: (value: unknown) => {
      const account = typeof value === "string" ? value.trim() : "";
      if (account === "") return "Account number is required";
      return (
        /^\d+$/.test(account) ||
        "Account number is digits only - no letters, spaces or symbols"
      );
    },
  },
  /** An ACN. Optional, because not every vendor is a registered company. */
  acn: {
    validate: (value: unknown) => {
      const acn = typeof value === "string" ? value.trim() : "";
      if (acn === "") return true;
      if (!/^\d+$/.test(acn)) return "ACN is digits only - no letters, spaces or symbols";
      return ACN_RE.test(acn) || `ACN must be exactly ${ACN_LENGTH} digits`;
    },
  },
  licenceNumber: {
    required: "Licence number is required",
    minLength: { value: 5, message: "Licence number looks too short" },
  },
};

/** Read a File as a data URL for instant preview. */
export function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Turns a data URL held in form state back into a `File`, so a file that was
 * picked or captured offline can be posted as multipart later on.
 */
export function dataUrlToFile(file: {
  name: string;
  type: string;
  dataUrl: string;
}): File {
  const [meta, base64] = file.dataUrl.split(",");
  const mimeType = /:(.*?);/.exec(meta ?? "")?.[1] || file.type || "application/octet-stream";

  const binary = atob(base64 ?? "");
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new File([bytes], file.name, { type: mimeType });
}

export function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${units[i]}`;
}
