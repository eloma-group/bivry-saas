import type { RoleSlug } from "@/types/auth";

export interface PortalConfig {
  slug: RoleSlug;
  /** Shown on the login card. */
  label: string;
  /** One line explaining who this portal is for. */
  tagline: string;
  /** Where a signed in user of this role lands. */
  homePath: string;
  /**
   * Their own profile page, where the portal has one built. The account id is
   * part of the path, so the URL says whose profile is on screen.
   */
  profilePath?: (accountId: string) => string;
  loginPath: string;
  forgotPasswordPath: string;
  resetPasswordPath: string;
  /** Signed in password change. Every portal has one. */
  changePasswordPath: string;
  /** Whether the login card offers a "Create account" link. */
  selfSignup: boolean;
  /**
   * Gradient stops for the portal accent. The brand panel is white now, so this
   * paints the headline text rather than the panel behind it.
   */
  accentClass: string;
  /** Accent tint for the panel decoration, kept light enough to read on white. */
  accentGlowClass: string;
  /** Solid accent colour for small type on the white panel. */
  accentTextClass: string;
}

/**
 * The five login portals. Each one talks to its own backend namespace
 * (`/api/auth/<slug>`), which is backed by its own database table, so a login
 * from one portal can never resolve to an account of another role.
 */
export const PORTALS: Record<RoleSlug, PortalConfig> = {
  admin: {
    slug: "admin",
    label: "Admin",
    tagline: "Full control over fleet, people and compliance.",
    homePath: "/admin",
    profilePath: () => "/admin/profile",
    loginPath: "/admin/login",
    forgotPasswordPath: "/admin/forgot-password",
    resetPasswordPath: "/admin/reset-password",
    changePasswordPath: "/admin/change-password",
    // Admins are provisioned by whoever holds the database, with
    // `backend/scripts/create-admin.ts`, and then sign in. There is nothing a
    // public register page could add here except a way in for strangers, so
    // /admin/register is not mounted at all.
    selfSignup: false,
    accentClass: "from-brand-navy via-[#123256] to-[#1b4b7d]",
    accentGlowClass: "bg-[#1b4b7d]",
    accentTextClass: "text-[#1b4b7d]",
  },
  customer: {
    slug: "customer",
    label: "Customer",
    tagline: "Track your bookings, jobs and invoices in one place.",
    homePath: "/customer",
    loginPath: "/customer/login",
    forgotPasswordPath: "/customer/forgot-password",
    resetPasswordPath: "/customer/reset-password",
    changePasswordPath: "/customer/change-password",
    selfSignup: true,
    accentClass: "from-[#0d2440] via-[#134e4a] to-brand-green",
    accentGlowClass: "bg-brand-green",
    accentTextClass: "text-[#0f8f65]",
  },
  vendor: {
    slug: "vendor",
    label: "Vendor",
    tagline: "Complete your onboarding and keep documents current.",
    homePath: "/vendor",
    profilePath: (accountId) => `/vendor/${accountId}`,
    loginPath: "/vendor/login",
    forgotPasswordPath: "/vendor/forgot-password",
    resetPasswordPath: "/vendor/reset-password",
    changePasswordPath: "/vendor/change-password",
    selfSignup: true,
    accentClass: "from-[#0d2440] via-[#3b2f63] to-[#6d4aa8]",
    accentGlowClass: "bg-[#6d4aa8]",
    accentTextClass: "text-[#6d4aa8]",
  },
  employee: {
    slug: "employee",
    label: "Employee",
    tagline: "Your daily operations workspace.",
    homePath: "/employee",
    loginPath: "/employee/login",
    forgotPasswordPath: "/employee/forgot-password",
    resetPasswordPath: "/employee/reset-password",
    changePasswordPath: "/employee/change-password",
    selfSignup: false,
    accentClass: "from-[#0d2440] via-[#1f3d63] to-[#2f6f9e]",
    accentGlowClass: "bg-[#2f6f9e]",
    accentTextClass: "text-[#2f6f9e]",
  },
  driver: {
    slug: "driver",
    label: "Driver",
    tagline: "Complete your onboarding and keep documents current.",
    homePath: "/driver",
    profilePath: (accountId) => `/driver/${accountId}`,
    loginPath: "/driver/login",
    forgotPasswordPath: "/driver/forgot-password",
    resetPasswordPath: "/driver/reset-password",
    changePasswordPath: "/driver/change-password",
    selfSignup: true,
    accentClass: "from-[#0d2440] via-[#14503c] to-brand-green",
    accentGlowClass: "bg-brand-green",
    accentTextClass: "text-[#0f8f65]",
  },
};

export const PORTAL_LIST = Object.values(PORTALS);

export function getPortal(slug: RoleSlug): PortalConfig {
  return PORTALS[slug];
}

export function isRoleSlug(value: string): value is RoleSlug {
  return value in PORTALS;
}
