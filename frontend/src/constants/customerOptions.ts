import type { CustomerStepDef } from "@/types/customer";

/** The value that opens the free-text box for a designation not in the list. */
export const DESIGNATION_OTHER = "Other";

/**
 * What a contact does. The same list the vendor form offers, so the two read
 * alike and a person who holds a role at both is described the same way.
 */
export const DESIGNATIONS = [
  "CEO",
  "Director",
  "Managing Director",
  "Operations Manager",
  "Compliance Manager",
  "Fleet Manager",
  "Accounts Manager",
  "Dispatch Manager",
  DESIGNATION_OTHER,
];

/** Everything the dropdown offers except the "Other" escape hatch. */
export const DESIGNATION_PRESETS = DESIGNATIONS.filter(
  (value) => value !== DESIGNATION_OTHER,
);

/**
 * The four contact blocks, in the order the form asks for them.
 *
 * Operations comes first because it is the one always asked for; the other
 * three can be ticked as a copy of it. The same arrangement the vendor form
 * uses, so a person who deals with both is asked the same question twice rather
 * than two different ones.
 */
export const CONTACT_BLOCKS = [
  { key: "operations", label: "Operations", apiType: "OPERATIONS" },
  { key: "accounts", label: "Accounts", apiType: "ACCOUNTS" },
  { key: "dispatch", label: "Dispatch", apiType: "DISPATCH" },
  { key: "main", label: "Main Contact", apiType: "MAIN" },
] as const;

/** The block the other three copy when ticked. */
export const PRIMARY_CONTACT = CONTACT_BLOCKS[0];

/** The three that can be ticked as a copy of it. */
export const COPYABLE_CONTACTS = CONTACT_BLOCKS.slice(1);

/**
 * Payment terms, as the accounts team words them. Stored verbatim, which is why
 * editing a line here is not free: a term that stops being offered is still
 * held by whoever picked it, and the dropdown only lists what is offered now.
 */
export const PAYMENT_TERMS = [
  "Prepaid",
  "COD",
  "Net 7",
  "Net 14",
  "Net 21",
  "Net 30",
  "Net 45",
  "Net 60",
  "Net 90",
];

/**
 * How the customer is billed. These two map onto the stored enum values.
 *
 * RCTI is a recipient created tax invoice: the load is invoiced by us on the
 * customer's behalf rather than billed to them on terms.
 */
export const BILLING_TYPES = ["Invoicing", "RCTI"] as const;

/** The form label for a stored billing type, and back again. */
export const BILLING_TYPE_TO_API: Record<string, "INVOICING" | "RCTI"> = {
  Invoicing: "INVOICING",
  RCTI: "RCTI",
};

export const BILLING_TYPE_FROM_API: Record<string, string> = {
  INVOICING: "Invoicing",
  RCTI: "RCTI",
};

/**
 * The documents the form lists a row for by name.
 *
 * Empty on purpose: the contract is the one document with a slot of its own,
 * and everything else a customer holds is added with the "Add Document" button
 * and named there. A document already stored under a name this list does not
 * carry is not lost - it comes back as one of the customer's own added rows.
 *
 * Naming one here lists it again, with no database change needed: each is
 * stored verbatim as the `category` of an ADDITIONAL document, so these are
 * text rather than enum values. Taking a name back out is not free for the same
 * reason - see the note on PAYMENT_TERMS above.
 */
export const CUSTOMER_DOCUMENT_TYPES: string[] = [];

/** Horizontal stepper definition - completion drives the progress percentage. */
export const CUSTOMER_STEPS: CustomerStepDef[] = [
  {
    id: "customer",
    label: "Customer Info",
    requires: ["abn", "companyName", "tradingNames", "legalName", "creationDate"],
  },
  {
    id: "addresses",
    label: "Addresses",
    // The warehouses are left out on purpose: plenty of customers run none, so
    // asking for one would hold the step short of complete for good.
    requires: ["principalAddress", "billingAddress"],
  },
  {
    id: "communication",
    label: "Communication",
    // The blocks a customer adds themselves are not listed: they are extra by
    // definition, so an empty list must not hold the step short of complete.
    requires: ["operations", "accounts", "dispatch", "main"],
  },
  {
    id: "directors",
    label: "Directors",
    requires: ["directors"],
  },
  {
    id: "billing",
    label: "Billing",
    requires: ["term", "billingType"],
  },
  {
    id: "documents",
    label: "Documents",
    requires: ["documents"],
  },
  {
    id: "review",
    label: "Review",
    requires: [],
  },
];
