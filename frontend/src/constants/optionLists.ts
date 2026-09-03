/**
 * The name every editable dropdown is stored under.
 *
 * A dropdown ships with a list written in these constants files, and anybody
 * can add to one from the form itself with the "Add" row at the bottom of it.
 * What they add is stored against the key named here, so the next person to
 * open that dropdown - on any portal - is offered it too.
 *
 * One key per question, not per field: Country is asked for on the driver's
 * personal details, on three customer addresses and on every booking stop, and
 * a country added on any of them belongs on all of them. Two dropdowns share a
 * key exactly when an option added to one belongs in the other.
 *
 * A key is only ever added here, never renamed: it is what the stored rows are
 * filed under, so renaming one orphans every option somebody added to it.
 */
export const OPTION_LISTS = {
  /** Shared across every form that asks for a country. */
  country: "country",
  /** Divisions of one country, keyed per country - see `statesListKey`. */
  state: "state",

  // Driver
  licenceType: "driver.licenceType",
  licenceState: "driver.licenceState",
  visaStatus: "driver.visaStatus",
  visaType: "driver.visaType",
  documentCategory: "driver.documentCategory",

  // Customer and vendor. The designation list is deliberately one key: the two
  // forms already ship the same list, and a role added on one is a role.
  designation: "contact.designation",
  paymentTerm: "customer.paymentTerm",
  billingType: "customer.billingType",
  coverageArea: "vendor.coverageArea",
  businessOperation: "vendor.businessOperation",

  // Booking
  accountStatus: "booking.accountStatus",
  agreementType: "booking.agreementType",
  reference: "booking.reference",
  cargoType: "booking.cargoType",
  vehicleType: "booking.vehicleType",
  trailer: "booking.trailer",
  trailerCategory: "booking.trailerCategory",
} as const;

/**
 * The key a State dropdown stores under, for one country.
 *
 * States are per country - Victoria is not an option in Canada - so they cannot
 * share a single list the way countries do. A state added while Australia is
 * chosen is filed under `state.Australia` and offered only there.
 *
 * The country is slugged because a list key holds no spaces; the slug is only
 * ever a key, never shown, so a country whose name slugs to the same thing as
 * another's would merely share a list, which is harmless and does not happen in
 * the list we ship.
 */
export function statesListKey(country: string | undefined | null): string | undefined {
  const slug = (country ?? "").trim().replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return slug ? `${OPTION_LISTS.state}.${slug}` : undefined;
}
