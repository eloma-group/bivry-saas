import type { SimpleAccountPath } from "@/services/adminService";
import type { OnboardingModuleSlug } from "@/constants/navigation";
import { NAME_MAX, NAME_RE, PHONE_MAX, PHONE_RE } from "@/utils/validation";

/**
 * Customers and employees, described rather than coded twice.
 *
 * Neither has an onboarding record, documents or verification behind it, so the
 * whole of each is a list of accounts and a form of columns. The only thing
 * that differs between them is which columns those are, which makes a config
 * the honest shape: two hand written page pairs would be the same file twice,
 * and the copy nobody was looking at would drift.
 */

export interface AccountField {
  /** Matches the column name the API reads and writes. */
  name: string;
  label: string;
  /** Shown under the input. */
  hint?: string;
  required?: boolean;
  placeholder?: string;
  type?: "text" | "tel" | "email";
  /** Shown but not editable - a server assigned value like the account number. */
  readOnly?: boolean;
  /** Included as a column in the list table. */
  inTable?: boolean;
  /** Hard cap on what can be typed. */
  maxLength?: number;
  /**
   * Checked on the way out, so the form refuses what the API would refuse. The
   * two shared patterns live in utils/validation.ts.
   */
  pattern?: { value: RegExp; message: string };
}

export interface SimpleAccountModule {
  slug: OnboardingModuleSlug;
  path: SimpleAccountPath;
  /** Singular, as it appears in a sentence: "New customer". */
  label: string;
  /** Plural, as a heading: "Customers". */
  plural: string;
  blurb: string;
  fields: AccountField[];
}

/** The name and contact columns every one of these accounts carries. */
const NAME_RULE = {
  maxLength: NAME_MAX,
  pattern: { value: NAME_RE, message: "Use letters only, no numbers or symbols" },
} as const;

const PHONE_RULE = {
  maxLength: PHONE_MAX,
  pattern: {
    value: PHONE_RE,
    message: "Digits only, with an optional leading + and at most one space",
  },
} as const;

const IDENTITY: AccountField[] = [
  {
    name: "firstName",
    label: "First name",
    required: true,
    placeholder: "Sanket",
    inTable: true,
    ...NAME_RULE,
  },
  { name: "lastName", label: "Last name", placeholder: "Salve", inTable: true, ...NAME_RULE },
  {
    name: "email",
    label: "Email",
    type: "email",
    required: true,
    placeholder: "name@company.com",
    hint: "Identifies the account. Changing it changes what they sign in with.",
    inTable: true,
  },
  {
    name: "phone",
    label: "Phone",
    type: "tel",
    placeholder: "+61 400000000",
    inTable: true,
    ...PHONE_RULE,
  },
];

export const SIMPLE_ACCOUNT_MODULES: Record<string, SimpleAccountModule> = {
  customer: {
    slug: "customer",
    path: "customers",
    label: "customer",
    plural: "Customers",
    blurb: "Every customer account, and who they book on behalf of.",
    fields: [
      {
        name: "accountNumber",
        label: "Customer Account Number",
        placeholder: "Assigned automatically",
        hint: "Assigned by BIVRY (CAN5000 onwards). It cannot be changed.",
        readOnly: true,
        inTable: true,
      },
      ...IDENTITY,
      {
        name: "companyName",
        label: "Company",
        placeholder: "Acme Freight Pty Ltd",
        inTable: true,
      },
    ],
  },
  user: {
    slug: "user",
    path: "employees",
    label: "employee",
    plural: "Employees",
    blurb: "Every staff account, their department and what they do.",
    fields: [
      ...IDENTITY,
      {
        name: "employeeCode",
        label: "Employee code",
        placeholder: "EMP-1024",
        hint: "Must be unique across staff, if you use one.",
        inTable: true,
      },
      { name: "department", label: "Department", placeholder: "Compliance", inTable: true },
      { name: "designation", label: "Designation", placeholder: "Coordinator" },
    ],
  },
};

export function simpleAccountModule(slug: string): SimpleAccountModule | undefined {
  return SIMPLE_ACCOUNT_MODULES[slug];
}
