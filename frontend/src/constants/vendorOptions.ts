import type { InsuranceKey, VendorStepDef } from "@/types/vendor";
import { AU_STATES } from "@/constants/options";

/** How invoices reach a supplier. */
export const INVOICE_PREFERENCES = ["Mail", "Email", "Portal", "EDI"];

/**
 * Which mailbox an invoice is copied to. These are the four contact blocks the
 * form collects further up, named the way an accounts team would refer to them.
 */
export const INVOICE_EMAIL_TARGETS = [
  "Accounts Payable Email",
  "Operations Email",
  "Compliance Email",
  "Admin Email",
  "Dispatch Email",
  "Other",
];

/** Where a supplier is willing to run. Australia's states and territories. */
export const COVERAGE_AREAS = AU_STATES;

/** What the supplier actually does. Drives which compliance pack applies. */
export const BUSINESS_OPERATIONS = [
  "General Freight",
  "Refrigerated Freight",
  "Dangerous Goods",
  "Bulk Haulage",
  "Container Transport",
  "Warehousing",
  "Last Mile Delivery",
  "Alcohol Transport",
  "Livestock",
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

/** The four contact blocks, in the order the form asks for them. */
export const CONTACT_BLOCKS = [
  { key: "operations", label: "Operations", apiType: "OPERATIONS" },
  { key: "compliance", label: "Compliance", apiType: "COMPLIANCE" },
  { key: "admin", label: "Admin", apiType: "ADMIN" },
  { key: "dispatch", label: "Dispatch", apiType: "DISPATCH" },
] as const;

/**
 * The six policies a supplier carries.
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
  /** Work cover only. */
  workCover?: boolean;
}> = [
  {
    key: "productLiability",
    label: "Product Liability",
    apiType: "PRODUCT_LIABILITY",
    docType: "INSURANCE_PRODUCT_LIABILITY",
  },
  {
    key: "publicLiability",
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
    label: "Marine (General & Refrigerated)",
    apiType: "MARINE_GENERAL",
    docType: "INSURANCE_MARINE_GENERAL",
  },
  {
    key: "marineAlcohol",
    label: "Marine (Alcohol)",
    apiType: "MARINE_ALCOHOL",
    docType: "INSURANCE_MARINE_ALCOHOL",
  },
  { key: "coc", label: "COC", apiType: "COC", docType: "INSURANCE_COC" },
];

/**
 * The compliance documents every supplier hands in. All eight are required
 * before the application can be submitted, and each carries an issue date and
 * an expiry date so the fleet knows when to chase a renewal.
 */
export const REQUIRED_COMPLIANCE_DOCS = [
  { docType: "COMPLIANCE_DRUG", label: "Drug" },
  { docType: "COMPLIANCE_ALCOHOL_POLICY", label: "Alcohol Policy" },
  { docType: "COMPLIANCE_PROCEDURE", label: "Procedure" },
  { docType: "COMPLIANCE_RISK_MANAGEMENT", label: "Risk Management Policy" },
  { docType: "COMPLIANCE_SPEED_POLICY", label: "Speed Policy" },
  { docType: "COMPLIANCE_FATIGUE_POLICY", label: "Fatigue Policy & Presentation System" },
  { docType: "COMPLIANCE_GPS_SNAPSHOT", label: "GPS Snapshot" },
  { docType: "COMPLIANCE_WHS_POLICY", label: "Work Health & Safety Policy" },
] as const;

/** What an extra compliance row can be called. */
export const ADDITIONAL_COMPLIANCE_CATEGORIES = [
  "Chain of Responsibility",
  "Environmental Policy",
  "Maintenance Schedule",
  "Training Records",
  "Subcontractor Agreement",
  "Other",
];

/** Horizontal stepper definition - completion drives the progress percentage. */
export const VENDOR_STEPS: VendorStepDef[] = [
  {
    id: "supplier",
    label: "Company Info",
    requires: ["abn", "companyName", "tradingName", "legalName"],
  },
  {
    id: "contacts",
    label: "Contacts",
    requires: ["operations", "compliance", "admin", "dispatch", "invoicePreference"],
  },
  {
    id: "company",
    label: "Company",
    requires: ["directors", "accountName", "bankName", "bsb", "accountNumber"],
  },
  {
    id: "coverage",
    label: "Coverage",
    requires: ["areasCovered", "businessOperations", "warehouses"],
  },
  {
    id: "accreditation",
    label: "Accreditation",
    requires: ["accreditationNumber", "nhvasExpiry", "accreditationFile", "insurances"],
  },
  {
    id: "documents",
    label: "Documents",
    requires: ["complianceDocs"],
  },
  {
    id: "review",
    label: "Review",
    requires: [],
  },
];
