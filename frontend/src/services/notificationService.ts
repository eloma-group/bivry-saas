import { request } from "./api";
import type { RoleSlug } from "@/types/auth";

/**
 * Expiry notifications.
 *
 * The same feed from three angles: a driver sees their own documents, a supplier
 * sees their own policies, and an admin sees everyone's. Nothing is stored server
 * side - the list is derived from the expiry dates on each read, so it cannot go
 * stale.
 */

export type NotificationSection =
  | "LICENCE"
  | "DRIVING_HISTORY"
  | "POLICE_VERIFICATION"
  | "VISA"
  | "MEDICAL"
  | "ACCREDITATION_MASS_MANAGEMENT"
  | "ACCREDITATION_BASIC_FATIGUE"
  | "ACCREDITATION_DANGEROUS_GOODS"
  | "ACCREDITATION_NHVAS"
  | "ACCREDITATION_HACCP"
  | "INSURANCE"
  | "COMPLIANCE_DOCUMENT";

export interface ExpiryNotification {
  id: string;
  /** Which portal the record belongs to, so a link can be built for it. */
  subjectType: "driver" | "vendor";
  subjectId: string;
  subjectName: string;
  subjectEmail: string;
  section: NotificationSection;
  label: string;
  /** yyyy-MM-dd */
  expiryDate: string;
  /** Negative once it has lapsed. */
  daysLeft: number;
  severity: "EXPIRED" | "EXPIRING";
}

export interface NotificationFeed {
  items: ExpiryNotification[];
  expired: number;
  expiring: number;
  total: number;
  /** How far ahead the warning looks, in days. */
  warningDays: number;
}

export const EMPTY_FEED: NotificationFeed = {
  items: [],
  expired: 0,
  expiring: 0,
  total: 0,
  warningDays: 7,
};

/** Only the portals that have documents to expire have a feed. */
export function hasNotificationFeed(role: RoleSlug | null): boolean {
  return role === "admin" || role === "driver" || role === "vendor";
}

const FEED_PATH: Partial<Record<RoleSlug, string>> = {
  admin: "/admin/notifications",
  driver: "/driver/notifications",
  vendor: "/vendor/notifications",
};

export function fetchNotifications(role: RoleSlug): Promise<NotificationFeed> {
  return request<NotificationFeed>({ url: FEED_PATH[role] ?? "/driver/notifications", method: "GET" });
}
