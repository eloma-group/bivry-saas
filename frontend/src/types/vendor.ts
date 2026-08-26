import type { UploadedFile } from "@/types/driver";

/**
 * The vendor onboarding form, in the shapes the inputs need: plain strings,
 * yyyy-MM-dd dates and files held as data URLs until they are uploaded.
 */

/** One department's contact block. The form asks for four of them. */
export interface ContactBlock {
  contactPerson: string;
  designation: string;
  contactNumber: string;
  email: string;
}

/**
 * One name the business trades under.
 *
 * A bare string would do for the value, but the form repeats this row and needs
 * a stable key per row to animate one out without the rest jumping, which is
 * what an object gives it.
 */
export interface TradingNameRow {
  name: string;
}

export interface DirectorRow {
  id: string;
  designation: string;
  email: string;
  contactNumber: string;
}

/**
 * A block of address fields.
 *
 * The two addresses the company is registered at and every warehouse are all
 * asked for the same six things, so they are all filled by the same block and
 * the same location tools.
 */
export interface VendorAddressBlock {
  street1: string;
  street2: string;
  suburb: string;
  state: string;
  country: string;
  postCode: string;
}

/**
 * One site the vendor operates, warehouse or yard.
 *
 * An address plus a key, so a list of them can be added to and removed from
 * without the rows losing their place.
 */
export interface SiteRow extends VendorAddressBlock {
  id: string;
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
  /** The stored document type. Extra rows the vendor adds are ADDITIONAL. */
  docType: string;
  /** What the row is called on screen, and what an extra row is saved as. */
  label: string;
  /** False for the rows a vendor added themselves, which can be removed. */
  fixed: boolean;
  file: UploadedFile | null;
  /** yyyy-MM-dd. */
  issue: string;
}

export interface VendorFormValues {
  /* Section 1 - Vendor information */
  companyName: string;
  /** At least one, and the first is the one shown wherever only one will fit. */
  tradingNames: TradingNameRow[];
  abn: string;
  /** Nine digits, and only a registered company has one. Optional for that reason. */
  acn: string;
  /** "Active from 24 Nov 2025", as the Business Register words it. Never typed. */
  abnStatus: string;
  /** "Australian Private Company". Also straight from the register. */
  entityType: string;
  /** "Registered from 01 Jul 2000", or "Not registered". Also from the register. */
  gst: string;
  legalName: string;
  websiteAddress: string;
  /** Handed out by the server, shown read only. */
  vendorCode: string;
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

  /* Section 3 - Bank details */
  accountName: string;
  bankName: string;
  bsb: string;
  accountNumber: string;

  /* Section 4 - Addresses */
  /** The principal place of business. Where the company is run from. */
  principalAddress: VendorAddressBlock;
  /** Where invoices go. A copy of the principal one when the tick says so. */
  billingAddress: VendorAddressBlock;
  /**
   * Whether the billing address was ticked as a copy. The copy itself is still
   * held above and still saved, so nothing downstream has to follow the tick to
   * find an address.
   */
  billingSameAsPrincipal: boolean;
  /**
   * Yards: sites the vendor parks or stages at. Optional, and there can be
   * several, so the fields only appear once one is added.
   */
  yards: SiteRow[];
  /** Every site freight moves through. At least one is asked for. */
  warehouses: SiteRow[];

  /* Section 5 - Company C-suite */
  directors: DirectorRow[];

  /* Section 6 - Business coverage */
  areasCovered: string[];
  businessOperations: string[];

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
