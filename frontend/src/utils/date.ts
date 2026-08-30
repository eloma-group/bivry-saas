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

/**
 * Whole days from one date to another, e.g. how long a certificate is valid for
 * counting from the day it was issued rather than from today.
 */
export function daysBetween(from?: string | null, to?: string | null): number | null {
  const start = toDate(from);
  const end = toDate(to);
  if (!start || !end) return null;
  return differenceInCalendarDays(end, start);
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

/**
 * A date written the Australian way, dd/MM/yyyy, on the Australian calendar.
 *
 * The timezone is pinned to Australia/Sydney so "the day it was uploaded" is the
 * local day here rather than the viewer's, which is what a fleet run out of
 * Australia means by the date on a document. Takes an ISO timestamp or a Date.
 */
export function australianDate(value?: string | Date | null): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Sydney",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

/** Today's date on the Australian calendar, dd/MM/yyyy. */
export function todayAustralian(): string {
  return australianDate(new Date());
}

/**
 * Today as a `<input type="date">` understands it, yyyy-MM-dd.
 *
 * Read on the Australian calendar for the same reason `australianDate` is: a
 * form filled in here means the local day, not the viewer's. Built from the
 * formatter's own parts rather than from `toISOString`, which would report the
 * UTC day and be a day behind for most of the working morning.
 */
export function todayInput(on: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(on);
  // en-CA already formats as yyyy-MM-dd, which is exactly the input's format.
  return parts;
}

export function expiryLabel(days: number | null): string {
  if (days === null) return "No date";
  if (days < 0) return `Expired ${Math.abs(days)}d ago`;
  if (days === 0) return "Expires today";
  return `${days} days left`;
}

/** How long a document is valid for, counted from its issue date to its expiry. */
export function validityLabel(days: number | null): string {
  if (days === null) return "No date";
  // Expiry before issue is a typo in one of the two dates, not a valid window.
  if (days < 0) return "Check the dates";
  if (days === 0) return "Same day expiry";
  return `Valid for ${days} days`;
}
