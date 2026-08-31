import type { UploadedFile } from "@/types/driver";

/**
 * The customer onboarding form, in the shapes the inputs need: plain strings,
 * yyyy-MM-dd dates and files held as data URLs until they are uploaded.
 *
 * Deliberately parallel to `types/vendor.ts` wherever the two forms ask the
 * same question, so a change to one is obvious in the other.
 */

/** One department's contact block. The form asks for four of them. */
export interface CustomerContactBlock {
  contactPerson: string;
  designation: string;
  /**
   * The designation typed by hand when "Other" is picked. Form state only - it
   * is never stored on its own: on save it becomes the block's `designation`,
   * and on load a stored value not in the preset list is read back into it with
   * `designation` set to "Other".
   */
  designationOther: string;
  contactNumber: string;
  email: string;
  /**
   * Whether this block was ticked as a copy of the operations one.
   *
   * Form state only - nothing stores it. A copied block is saved holding the
   * operations details verbatim, so on the way back in the tick is read off the
   * rows themselves rather than remembered separately.
   *
   * The fields above keep whatever was typed in them and are not cleared by the
   * tick, the same way the billing address behaves: untick it and what was
   * there comes back. Always false on the operations block itself.
   */
  sameAsOperations: boolean;
}

/**
 * One contact block the customer added themselves, beyond the four departments
 * the form asks for.
 *
 * The same four answers a fixed block holds, plus the name the customer gives
 * it and a stable key, so a row can be taken out of the middle of the list
 * without the ones below it losing what was typed into them.
 */
export interface CustomerAdditionalContactRow {
  id: string;
  /** What this block is for, in the customer's own words: "Legal". */
  label: string;
  contactPerson: string;
  designation: string;
  /** Typed by hand when "Other" is picked. See CustomerContactBlock. */
  designationOther: string;
  contactNumber: string;
  email: string;
}

/**
 * One name the business trades under.
 *
 * A bare string would do for the value, but the form repeats this row and needs
 * a stable key per row to animate one out without the rest jumping.
 */
export interface CustomerTradingNameRow {
  name: string;
}

export interface CustomerDirectorRow {
  id: string;
  /** Full name, as it reads on the document naming them. */
  name: string;
  email: string;
  contactNumber: string;
}

/**
 * A block of address fields. The two addresses the company is registered at and
 * every warehouse are asked for the same six things, so one block and one set
 * of location tools serves them all.
 */
export interface CustomerAddressBlock {
  street1: string;
  street2: string;
  suburb: string;
  state: string;
  country: string;
  postCode: string;
}

/**
 * One warehouse the customer operates.
 *
 * An address plus a key, so a list of them can be added to and removed from
 * without the rows losing their place. The same shape the vendor form uses for
 * its own sites.
 */
export interface CustomerWarehouseRow extends CustomerAddressBlock {
  id: string;
  /**
   * Whether this warehouse was ticked as a copy of the principal address.
   *
   * Form state only - nothing stores it. A ticked warehouse is saved holding
   * the principal address verbatim, so on the way back in the tick is read off
   * the row itself rather than remembered separately, the same way a contact
   * block ticked as a copy of the operations one is.
   *
   * The fields above keep whatever was typed in them and are not cleared by the
   * tick, so unticking brings back what was there.
   */
  sameAsPrincipal: boolean;
}

/** A row in the documents table. */
export interface CustomerDocRow {
  id: string;
  /** The stored document type. Extra rows the customer adds are ADDITIONAL. */
  docType: string;
  /** Which of the offered document types this row is, saved as its category. */
  label: string;
  file: UploadedFile | null;
}

export interface CustomerFormValues {
  /* Section 1 - Customer information */
  companyName: string;
  /** At least one, and the first is the one shown wherever only one will fit. */
  tradingNames: CustomerTradingNameRow[];
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
  /** Handed out by the server (CUST-3000 onwards), shown read only. */
  cid: string;
  /** Seeded from the account, and read only: it identifies the account. */
  email: string;
  /** yyyy-MM-dd. Opens on today and can be changed. */
  creationDate: string;
  companyLogo: UploadedFile | null;

  /* Section 2 - Address information */
  /** The principal place of business. Where the company is run from. */
  principalAddress: CustomerAddressBlock;
  /** Where invoices go. A copy of the principal one when the tick says so. */
  billingAddress: CustomerAddressBlock;
  /**
   * Whether the billing address was ticked as a copy. The copy itself is still
   * held above and still saved, so nothing downstream has to follow the tick to
   * find an address.
   */
  billingSameAsPrincipal: boolean;
  /** Every warehouse the customer operates. There may be none. */
  warehouses: CustomerWarehouseRow[];

  /* Section 3 - Communication */
  operations: CustomerContactBlock;
  accounts: CustomerContactBlock;
  dispatch: CustomerContactBlock;
  main: CustomerContactBlock;
  /** Anything else the customer wants us to have a contact for. */
  additionalContacts: CustomerAdditionalContactRow[];

  /* Section 4 - Director information */
  directors: CustomerDirectorRow[];

  /* Section 5 - Billing */
  term: string;
  /** "Invoicing" or "RCTI", as the dropdown offers them. */
  billingType: string;

  /* Section 6 - Documents */
  contractDocument: UploadedFile | null;
  documents: CustomerDocRow[];
}

export interface CustomerStepDef {
  id: string;
  label: string;
  /** Field paths that, when all filled, mark the step complete. */
  requires: (keyof CustomerFormValues)[];
}
