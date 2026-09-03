/**
 * Option lists for the Create Booking form's dropdowns.
 *
 * These belong to the booking form alone and are used nowhere else, so editing
 * them changes only the Create Booking page.
 */

export const ACCOUNT_STATUSES = [
  "Active",
  "Suspend",
  "Dormant",
] as const;

/**
 * The longest invoice term that can be typed.
 *
 * The term is worded rather than counted - "Net 7", "COD", "Prepaid" - so this
 * caps a phrase, not a number of days. Long enough for any term anyone bills
 * on, short enough that a paragraph never lands in the field.
 */
export const INVOICE_TERM_MAX = 40;

export const AGREEMENT_TYPES = [
  "Contract",
  "Permanent",
  "Adhoc",
  "Prepaid",
] as const;

export const REFERENCES = [
  "Tesla",
  "Isuzu",
  "Amazon",
  "Direct-Melbourne",
] as const;

export const CARGO_TYPES = [
  "General",
  "Temperature",
  "Dangerous Goods",
] as const;

export const VEHICLE_TYPES = [
  "B-Double",
  "Semi",
  "HR",
] as const;

/** Which trailer a pickup loads onto. */
export const TRAILERS = ["A", "B", "Double-B"] as const;

export const TRAILER_CATEGORIES = [
  "Pan",
  "Freezer",
  "Straight",
  "Mezz",
  "Drop",
  "Straight - Segmented Straps",
  "Split",
  "14 Pallets",
] as const;
