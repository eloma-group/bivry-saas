import {
  LayoutDashboard,
  CalendarDays,
  Truck,
  Send,
  Wallet,
  Users2,
  BarChart3,
  UserPlus,
  Settings,
  LifeBuoy,
  LogOut,
} from "lucide-react";
import type { NavItem } from "@/types/nav";
import type { RoleSlug } from "@/types/auth";

/**
 * The fleet management menu.
 *
 * Which entries actually go anywhere depends on the portal: an admin governs the
 * onboarding modules, a driver only ever sees their own form. Everything else
 * renders realistically but stays disabled until its feature work lands.
 */

/** The five records the Onboarding menu covers. Driver and Vendor are built. */
export const ONBOARDING_MODULES = [
  { slug: "vehicle", label: "Vehicle", ready: false },
  { slug: "customer", label: "Customer", ready: true },
  { slug: "user", label: "User", ready: true },
  { slug: "vendor", label: "Vendor", ready: true },
  { slug: "driver", label: "Driver", ready: true },
] as const;

export type OnboardingModuleSlug = (typeof ONBOARDING_MODULES)[number]["slug"];

export function isOnboardingModule(value: string): value is OnboardingModuleSlug {
  return ONBOARDING_MODULES.some((module) => module.slug === value);
}

export function onboardingModule(slug: string) {
  return ONBOARDING_MODULES.find((module) => module.slug === slug);
}

/** Menu for the Admin portal: every module is reachable, built or not. */
function adminNav(): NavItem[] {
  return [
    { label: "Dashboard", icon: LayoutDashboard, enabled: true, href: "/admin" },
    {
      label: "Bookings",
      icon: CalendarDays,
      enabled: true,
      children: [
        // Reads as live and answers to hover, but carries no href yet, so a
        // click does nothing until the page behind it is built.
        { label: "All Bookings", enabled: true },
        { label: "Create Booking", enabled: true, href: "/admin/bookings/new" },
        { label: "Calendar" },
      ],
    },
    {
      label: "Operations",
      icon: Truck,
      children: [{ label: "Live Map" }, { label: "Routes" }, { label: "Jobs" }],
    },
    {
      label: "Dispatch",
      icon: Send,
      children: [{ label: "Assign" }, { label: "Queue" }],
    },
    {
      label: "Accounts",
      icon: Wallet,
      children: [{ label: "Invoices" }, { label: "Payments" }, { label: "Payroll" }],
    },
    {
      label: "Management",
      icon: Users2,
      children: [{ label: "Teams" }, { label: "Roles" }, { label: "Assets" }],
    },
    {
      label: "Reports",
      icon: BarChart3,
      children: [{ label: "Overview" }, { label: "Compliance" }, { label: "Exports" }],
    },
    {
      label: "Onboarding",
      icon: UserPlus,
      // Every module opens: the ones without a table yet say so on the page,
      // which is more useful than a menu item that cannot be clicked.
      children: ONBOARDING_MODULES.map((module) => ({
        label: module.label,
        enabled: true,
        href: `/admin/onboarding/${module.slug}`,
      })),
    },
  ];
}

/**
 * Menu for a self-service portal: their own onboarding form and nothing else.
 * `ownModule` is the one entry that goes anywhere.
 */
function selfServiceNav(ownModule: "Driver" | "Vendor", href: string): NavItem[] {
  return [
    { label: "Dashboard", icon: LayoutDashboard },
    {
      label: "Bookings",
      icon: CalendarDays,
      children: [{ label: "All Bookings" }, { label: "Create Booking" }, { label: "Calendar" }],
    },
    {
      label: "Operations",
      icon: Truck,
      children: [{ label: "Live Map" }, { label: "Routes" }, { label: "Jobs" }],
    },
    {
      label: "Dispatch",
      icon: Send,
      children: [{ label: "Assign" }, { label: "Queue" }],
    },
    {
      label: "Accounts",
      icon: Wallet,
      children: [{ label: "Invoices" }, { label: "Payments" }, { label: "Payroll" }],
    },
    {
      label: "Management",
      icon: Users2,
      children: [{ label: "Teams" }, { label: "Roles" }, { label: "Assets" }],
    },
    {
      label: "Reports",
      icon: BarChart3,
      children: [{ label: "Overview" }, { label: "Compliance" }, { label: "Exports" }],
    },
    {
      label: "Onboarding",
      icon: UserPlus,
      children: ONBOARDING_MODULES.map((module) =>
        module.label === ownModule
          ? { label: module.label, enabled: true, href }
          : { label: module.label },
      ),
    },
  ];
}

/**
 * Menu for the Vendor portal.
 *
 * Only the five a vendor has business with: Dashboard, Bookings, Management,
 * Reports and Onboarding. Operations, Dispatch and Accounts are ours to run
 * rather than theirs, so they are left out of this menu altogether instead of
 * being shown greyed out. Items marked clickable without an `href` light up and
 * respond to hover but do not navigate yet - the pages are still to come.
 */
function vendorNav(): NavItem[] {
  return [
    { label: "Dashboard", icon: LayoutDashboard, enabled: true },
    {
      label: "Bookings",
      icon: CalendarDays,
      enabled: true,
      children: [
        { label: "Manage Bookings", enabled: true },
        // Reads as live and answers to hover, but carries no href yet, so a
        // click does nothing until the page behind it is built.
        { label: "All Bookings", enabled: true },
        // Kept from before, faded until their feature work lands.
        { label: "Create Booking" },
        { label: "Calendar" },
      ],
    },
    {
      label: "Management",
      icon: Users2,
      enabled: true,
      children: [
        { label: "Invoices", enabled: true },
        { label: "Compliance", enabled: true },
        { label: "Fines", enabled: true },
        { label: "Non compliances", enabled: true },
        // Kept from before, faded until their feature work lands.
        { label: "Teams" },
        { label: "Roles" },
        { label: "Assets" },
      ],
    },
    {
      label: "Reports",
      icon: BarChart3,
      enabled: true,
      children: [{ label: "Overview" }, { label: "Compliance" }, { label: "Exports" }],
    },
    {
      label: "Onboarding",
      icon: UserPlus,
      enabled: true,
      children: ONBOARDING_MODULES.map((module) => {
        if (module.label === "Vendor") {
          return { label: module.label, enabled: true, href: "/vendor/onboarding" };
        }
        // Vehicle and Driver read as clickable now; the pages are still to come.
        if (module.label === "Vehicle" || module.label === "Driver") {
          return { label: module.label, enabled: true };
        }
        return { label: module.label };
      }),
    },
  ];
}

/**
 * Menu for the Customer portal.
 *
 * Only the five a customer has business with: Dashboard, Bookings, Accounts,
 * Reports and Onboarding. Operations, Dispatch and Management are ours to run
 * rather than theirs, so they are left out of this menu altogether instead of
 * being shown greyed out - the same reasoning as the vendor menu above. Items
 * marked clickable without an `href` light up and respond to hover but do not
 * navigate yet: the pages are still to come.
 */
function customerNav(): NavItem[] {
  return [
    { label: "Dashboard", icon: LayoutDashboard, enabled: true },
    {
      label: "Bookings",
      icon: CalendarDays,
      enabled: true,
      children: [
        { label: "My Bookings", enabled: true },
        { label: "Create Booking", enabled: true },
        { label: "Calendar" },
      ],
    },
    {
      label: "Accounts",
      icon: Wallet,
      enabled: true,
      children: [{ label: "Invoices", enabled: true }, { label: "Payments", enabled: true }],
    },
    {
      label: "Reports",
      icon: BarChart3,
      enabled: true,
      children: [{ label: "Overview" }, { label: "Exports" }],
    },
    {
      label: "Onboarding",
      icon: UserPlus,
      enabled: true,
      children: ONBOARDING_MODULES.map((module) =>
        module.label === "Customer"
          ? { label: module.label, enabled: true, href: "/customer/onboarding" }
          : { label: module.label },
      ),
    },
  ];
}

export function navItemsFor(role: RoleSlug | null): NavItem[] {
  if (role === "admin") return adminNav();
  if (role === "vendor") return vendorNav();
  if (role === "customer") return customerNav();
  return selfServiceNav("Driver", "/driver/onboarding");
}

/** Kept for the shell's own default, which renders before a role is known. */
export const NAV_ITEMS: NavItem[] = selfServiceNav("Driver", "/driver/onboarding");

export const NAV_FOOTER: NavItem[] = [
  { label: "Settings", icon: Settings, footer: true },
  { label: "Support", icon: LifeBuoy, footer: true },
  { label: "Logout", icon: LogOut, footer: true },
];
