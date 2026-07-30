import { getPortal } from "@/config/roles";
import type { AuthUser, RoleSlug } from "@/types/auth";

/**
 * Turning the signed in account into what the header shows.
 *
 * The backend already sends a `displayName` per role (full name, falling back
 * to company name, falling back to the email), plus a few role specific extras.
 * These helpers only decide how to present that; they never invent a value.
 */

/** Up to two letters for the avatar. Falls back to the email when there is no name. */
export function initialsOf(user: Pick<AuthUser, "displayName" | "email">): string {
  const source = user.displayName?.trim() || user.email;

  // An email has no spaces to split on, so use the part before the @.
  const base = source.includes("@") && !source.includes(" ") ? source.split("@")[0] : source;

  const words = base.split(/[\s._-]+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/**
 * The line under the name. More specific than the portal name where the account
 * carries something better: a super admin is not just an admin, and an
 * employee's designation says more than "Employee".
 */
export function roleLabelOf(user: AuthUser | null, role: RoleSlug | null): string {
  if (!role) return "";

  const portal = getPortal(role);
  if (!user) return portal.label;

  if (role === "admin" && user.isSuperAdmin === true) return "Super Admin";

  if (role === "employee") {
    const designation = typeof user.designation === "string" ? user.designation.trim() : "";
    if (designation) return designation;
  }

  return portal.label;
}

/**
 * A stable colour per account, so the same person keeps the same avatar tint
 * across sessions and devices instead of it changing on every render.
 */
const AVATAR_TINTS = [
  "bg-[#0d2440]",
  "bg-[#134e4a]",
  "bg-[#3b2f63]",
  "bg-[#7c2d12]",
  "bg-[#1e3a5f]",
  "bg-[#4c1d95]",
  "bg-[#155e75]",
] as const;

export function avatarTintOf(user: Pick<AuthUser, "id" | "email">): string {
  const seed = user.id || user.email;
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return AVATAR_TINTS[hash % AVATAR_TINTS.length];
}
