import type { UploadedFile } from "@/types/driver";

/**
 * The supplier onboarding form, in the shapes the inputs need: plain strings,
 * yyyy-MM-dd dates and files held as data URLs until they are uploaded.
 */

/** One department's contact block. The form asks for four of them. */
export interface ContactBlock {
  contactPerson: string;
  designation: string;
  contactNumber: string;
  email: string;
}

export interface DirectorRow {
  id: string;
  designation: string;
  email: string;
  contactNumber: string;
}

export interface WarehouseRow {
  id: string;
  street1: string;
  street2: string;
  suburb: string;
  state: string;
  country: string;
  postCode: string;
}

/**
 * One insurance policy.
 *
 * Work cover is keyed by an employer number and a validity window; every other
 * policy is keyed by a policy number and a single expiry date. Both sets live
 * on the same row so the six policies share one shape.
 */
export interface InsuranceRow {
  policyNumber: string;
  insurer: string;
  expiry: string;
  sumAssured: string;
  employerNumber: string;
  validFrom: string;
  validTill: string;
  dueInDays: string;
  file: UploadedFile | null;
}

export type InsuranceKey =
  | "productLiability"
  | "publicLiability"
  | "workCover"
  | "marineGeneral"
  | "marineAlcohol"
  | "coc";

/** A row in the compliance documents table. */
export interface ComplianceDocRow {
  id: string;
  /** The stored document type. Extra rows the supplier adds are ADDITIONAL. */
  docType: string;
  /** What the row is called on screen, and what an extra row is saved as. */
  label: string;
  /** False for the rows a supplier added themselves, which can be removed. */
  fixed: boolean;
  file: UploadedFile | null;
  /** yyyy-MM-dd. */
  issue: string;
  expiry: string;
}

export interface VendorFormValues {
  /* Section 1 - Supplier information */
  companyName: string;
  tradingName: string;
  abn: string;
  /** Nine digits, and only a registered company has one. Optional for that reason. */
  acn: string;
  legalName: string;
  websiteAddress: string;
  /** Handed out by the server, shown read only. */
  supplierId: string;
  email: string;
  phone: string;
  companyLogo: UploadedFile | null;

  /* Section 2 - Contact information */
  operations: ContactBlock;
  compliance: ContactBlock;
  admin: ContactBlock;
  dispatch: ContactBlock;
  invoicePreference: string;
  invoiceEmails: string[];
  invoiceOther: string;

  /* Section 3 - Company C-suite */
  directors: DirectorRow[];

  /* Section 4 - Bank details */
  accountName: string;
  bankName: string;
  bsb: string;
  accountNumber: string;

  /* Section 5 - Business coverage */
  areasCovered: string[];
  businessOperations: string[];

  /* Section 6 - Warehouse locations */
  warehouses: WarehouseRow[];

  /* Section 7 - Certificate of accreditation */
  accreditationNumber: string;
  massManagementExpiry: string;
  basicFatigueExpiry: string;
  dangerousGoodsExpiry: string;
  nhvasExpiry: string;
  haccpExpiry: string;
  accreditationFile: UploadedFile | null;

  /* Section 8 - Insurance details */
  insurances: Record<InsuranceKey, InsuranceRow>;

  /* Section 9 - Compliance documents */
  complianceDocs: ComplianceDocRow[];
}

export interface VendorStepDef {
  id: string;
  label: string;
  /** Field paths that, when all filled, mark the step complete. */
  requires: (keyof VendorFormValues)[];
}
