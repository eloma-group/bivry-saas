import type { RoleSlug } from "@/types/auth";

export interface PortalConfig {
  slug: RoleSlug;
  /** Shown on the login card. */
  label: string;
  /** One line explaining who this portal is for. */
  tagline: string;
  /** Where a signed in user of this role lands. */
  homePath: string;
  loginPath: string;
  forgotPasswordPath: string;
  resetPasswordPath: string;
  /** Whether the login card offers a "Create account" link. */
  selfSignup: boolean;
  /** Tailwind classes for the portal accent, used on the brand panel. */
  accentClass: string;
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
    loginPath: "/admin/login",
    forgotPasswordPath: "/admin/forgot-password",
    resetPasswordPath: "/admin/reset-password",
    selfSignup: false,
    accentClass: "from-brand-navy via-[#123256] to-[#1b4b7d]",
  },
  customer: {
    slug: "customer",
    label: "Customer",
    tagline: "Track your bookings, jobs and invoices in one place.",
    homePath: "/customer",
    loginPath: "/customer/login",
    forgotPasswordPath: "/customer/forgot-password",
    resetPasswordPath: "/customer/reset-password",
    selfSignup: true,
    accentClass: "from-[#0d2440] via-[#134e4a] to-brand-green",
  },
  vendor: {
    slug: "vendor",
    label: "Vendor",
    tagline: "Manage your fleet, drivers and assignments.",
    homePath: "/vendor",
    loginPath: "/vendor/login",
    forgotPasswordPath: "/vendor/forgot-password",
    resetPasswordPath: "/vendor/reset-password",
    selfSignup: true,
    accentClass: "from-[#0d2440] via-[#3b2f63] to-[#6d4aa8]",
  },
  employee: {
    slug: "employee",
    label: "Employee",
    tagline: "Your daily operations workspace.",
    homePath: "/employee",
    loginPath: "/employee/login",
    forgotPasswordPath: "/employee/forgot-password",
    resetPasswordPath: "/employee/reset-password",
    selfSignup: false,
    accentClass: "from-[#0d2440] via-[#1f3d63] to-[#2f6f9e]",
  },
  driver: {
    slug: "driver",
    label: "Driver",
    tagline: "Complete your onboarding and keep documents current.",
    homePath: "/driver",
    loginPath: "/driver/login",
    forgotPasswordPath: "/driver/forgot-password",
    resetPasswordPath: "/driver/reset-password",
    selfSignup: true,
    accentClass: "from-[#0d2440] via-[#14503c] to-brand-green",
  },
};

export const PORTAL_LIST = Object.values(PORTALS);

export function getPortal(slug: RoleSlug): PortalConfig {
  return PORTALS[slug];
}

export function isRoleSlug(value: string): value is RoleSlug {
  return value in PORTALS;
}
