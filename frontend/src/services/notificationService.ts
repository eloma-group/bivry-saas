import { request } from "./api";
import type { RoleSlug } from "@/types/auth";

/**
 * Expiry notifications.
 *
 * The same feed from two angles: a driver sees their own documents, an admin sees
 * every driver's. Nothing is stored server side - the list is derived from the
 * expiry dates on each read, so it cannot go stale.
 */

export type NotificationSection =
  | "LICENCE"
  | "DRIVING_HISTORY"
  | "POLICE_VERIFICATION"
  | "VISA"
  | "MEDICAL";

export interface ExpiryNotification {
  id: string;
  driverId: string;
  driverName: string;
  driverEmail: string;
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

/** Only the two portals that have documents to expire have a feed. */
export function hasNotificationFeed(role: RoleSlug | null): boolean {
  return role === "admin" || role === "driver";
}

export function fetchNotifications(role: RoleSlug): Promise<NotificationFeed> {
  return request<NotificationFeed>({
    url: role === "admin" ? "/admin/notifications" : "/driver/notifications",
    method: "GET",
  });
}
