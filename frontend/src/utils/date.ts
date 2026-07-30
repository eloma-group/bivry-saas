import {
  addMonths,
  differenceInCalendarDays,
  format,
  isValid,
  parseISO,
} from "date-fns";
import type { ExpiryLevel } from "@/types/driver";

/** Parse a yyyy-MM-dd (or ISO) string safely. */
export function toDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = parseISO(value);
  return isValid(d) ? d : null;
}

/** Days between today and the given expiry date (negative = already expired). */
export function daysUntil(expiry?: string | null): number | null {
  const d = toDate(expiry);
  if (!d) return null;
  return differenceInCalendarDays(d, new Date());
}

/** Map a remaining-days count to a severity level for badge colouring. */
export function expiryLevel(days: number | null): ExpiryLevel {
  if (days === null) return "none";
  if (days < 0) return "expired";
  if (days <= 30) return "soon";
  return "valid";
}

/** Add N months to an issue date, returned as yyyy-MM-dd (for readonly fields). */
export function addMonthsISO(issue?: string | null, months = 6): string {
  const d = toDate(issue);
  if (!d) return "";
  return format(addMonths(d, months), "yyyy-MM-dd");
}

/** Human-friendly date, e.g. 12 Aug 2025. */
export function prettyDate(value?: string | null): string {
  const d = toDate(value);
  return d ? format(d, "dd MMM yyyy") : "-";
}

export function expiryLabel(days: number | null): string {
  if (days === null) return "No date";
  if (days < 0) return `Expired ${Math.abs(days)}d ago`;
  if (days === 0) return "Expires today";
  return `${days} days left`;
}
