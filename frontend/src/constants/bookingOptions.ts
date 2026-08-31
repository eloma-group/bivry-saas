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
 * The longest invoice term that can be typed, in digits.
 *
 * Three is enough for any term anyone bills on and stops a mistyped date being
 * entered as a number of days.
 */
export const INVOICE_TERM_MAX = 3;

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
export const TRAILERS = ["A", "B"] as const;

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
