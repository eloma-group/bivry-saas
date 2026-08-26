import type { InsuranceKey, VendorStepDef } from "@/types/vendor";
import { AU_STATES } from "@/constants/options";

/** Where a vendor is willing to run. Australia's states and territories. */
export const COVERAGE_AREAS = AU_STATES;

/**
 * What the vendor actually does. Several apply to most of them, so the field
 * is a multi select and the answers are stored as these labels verbatim.
 *
 * Which means editing this list is not free: a label that stops being offered
 * is still held by whoever picked it, and the dropdown only lists what is
 * offered now, so they would be left carrying an answer they cannot untick.
 * Check what is stored before removing a line from here.
 */
export const BUSINESS_OPERATIONS = [
  "Interstate Road Transport",
  "Container Movement",
  "Taxi Trucks",
  "Trailer Tow Operator",
  "Regional Deliveries",
];

export const DESIGNATIONS = [
  "CEO",
  "Director",
  "Managing Director",
  "Operations Manager",
  "Compliance Manager",
  "Fleet Manager",
  "Accounts Manager",
  "Dispatch Manager",
  "Other",
];

export const WAREHOUSE_STATES = AU_STATES;

/**
 * The four contact blocks, in the order the form asks for them.
 *
 * Operations comes first because it is the one always asked for; the other
 * three can be ticked as a copy of it. `apiType` stays ADMIN for the accounts
 * block: only the word the form shows changed, and the stored value is what
 * every existing row already carries.
 */
export const CONTACT_BLOCKS = [
  { key: "operations", label: "Operations", apiType: "OPERATIONS" },
  { key: "compliance", label: "Compliance", apiType: "COMPLIANCE" },
  { key: "accounts", label: "Accounts", apiType: "ADMIN" },
  { key: "dispatch", label: "Dispatch", apiType: "DISPATCH" },
] as const;

/** The block the other three copy when ticked. */
export const PRIMARY_CONTACT = CONTACT_BLOCKS[0];

/** The three that can be ticked as a copy of it. */
export const COPYABLE_CONTACTS = CONTACT_BLOCKS.slice(1);

/**
 * The six policies a vendor carries.
 *
 * Work cover is the odd one out: it is keyed by an employer number and a
 * validity window rather than a policy number and a single expiry, so it gets
 * its own field set.
 */
export const INSURANCE_POLICIES: Array<{
  key: InsuranceKey;
  label: string;
  apiType: string;
  docType: string;
  /**
   * The least cover BIVRY accepts on this policy, shown under Sum Assured so a
   * vendor knows what they are being measured against before they type.
   *
   * Taken from BIVRY's own NTI Certificate of Currency (policy 63945275):
   * Public Liability $20,000,000, Product Liability $20,000,000 in aggregate,
   * and Carriers Protect general cargo $500,000. Work cover carries none - it
   * is statutory cover with no sum on the certificate, which is also why it has
   * no Sum Assured field.
   */
  minimumLiability?: string;
  /** Work cover only. */
  workCover?: boolean;
}> = [
  {
    key: "productLiability",
    minimumLiability: "$20,000,000",
    label: "Product Liability",
    apiType: "PRODUCT_LIABILITY",
    docType: "INSURANCE_PRODUCT_LIABILITY",
  },
  {
    key: "publicLiability",
    minimumLiability: "$20,000,000",
    label: "Public Liability",
    apiType: "PUBLIC_LIABILITY",
    docType: "INSURANCE_PUBLIC_LIABILITY",
  },
  {
    key: "workCover",
    label: "Work Cover",
    apiType: "WORK_COVER",
    docType: "INSURANCE_WORK_COVER",
    workCover: true,
  },
  {
    key: "marineGeneral",
    minimumLiability: "$500,000",
    label: "Marine (General & Refrigerated)",
    apiType: "MARINE_GENERAL",
    docType: "INSURANCE_MARINE_GENERAL",
  },
  {
    key: "marineAlcohol",
    minimumLiability: "$500,000",
    label: "Marine (Alcohol)",
    apiType: "MARINE_ALCOHOL",
    docType: "INSURANCE_MARINE_ALCOHOL",
  },
  {
    key: "coc",
    label: "COC",
    apiType: "COC",
    docType: "INSURANCE_COC",
    minimumLiability: "$500,000",
  },
];

/**
 * What a policy can be.
 *
 * There is no fixed pack any more: a vendor adds the policies that apply to
 * them and names each one from this list, so nothing is pre-listed and nothing
 * is demanded of every vendor alike.
 *
 * Each is stored verbatim as the `category` of a COMPLIANCE_ADDITIONAL
 * document, which is why editing a line here is not free - see the note on
 * BUSINESS_OPERATIONS above. It is also why the list needs no database change
 * to grow: these are text, not enum values.
 */
export const COMPLIANCE_DOCUMENT_TYPES = [
  "Marine COC",
  "PL COC",
  "Chain of Responsibility",
  "Driver Fatigue Management Policy",
  "Driver Medical Currency Verification Process",
  "Drug & Alcohol Policy",
  "Employment Contract",
  "Environmental Policy",
  "Failure to Comply with Fatigue Management Requirements",
  "Fatigue Standards",
  "First Written Warning",
  "Health & Safety Policy",
  "Incident Report",
  "Incident Report Management",
  "Load Policy",
  "Modern Slavery Policy",
  "Payment System",
  "Roadside Assistance Policy",
  "Speed Doc",
  "Vendor Agreement",
];

/** Horizontal stepper definition - completion drives the progress percentage. */
export const VENDOR_STEPS: VendorStepDef[] = [
  {
    id: "vendor",
    label: "Company Info",
    requires: ["abn", "companyName", "tradingNames", "legalName"],
  },
  {
    id: "directors",
    label: "Directors",
    requires: ["directors"],
  },
  {
    id: "contacts",
    label: "Contacts",
    requires: ["operations", "compliance", "accounts", "dispatch"],
  },
  {
    id: "bank",
    label: "Bank",
    requires: ["accountName", "bankName", "bsb", "accountNumber"],
  },
  {
    id: "addresses",
    label: "Addresses",
    requires: ["principalAddress", "billingAddress", "warehouses"],
  },
  {
    id: "coverage",
    label: "Coverage",
    requires: ["areasCovered", "businessOperations"],
  },
  {
    id: "accreditation",
    label: "Accreditation",
    requires: ["accreditationNumber", "nhvasExpiry", "accreditationFile", "insurances"],
  },
  {
    id: "documents",
    label: "Policies",
    requires: ["complianceDocs"],
  },
  {
    id: "review",
    label: "Review",
    requires: [],
  },
];
