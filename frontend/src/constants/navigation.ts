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

/** The five records the Onboarding menu covers. Driver and Supplier are built. */
export const ONBOARDING_MODULES = [
  { slug: "vehicle", label: "Vehicle", ready: false },
  { slug: "customer", label: "Customer", ready: true },
  { slug: "user", label: "User", ready: true },
  { slug: "supplier", label: "Supplier", ready: true },
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
function selfServiceNav(ownModule: "Driver" | "Supplier", href: string): NavItem[] {
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

export function navItemsFor(role: RoleSlug | null): NavItem[] {
  if (role === "admin") return adminNav();
  if (role === "vendor") return selfServiceNav("Supplier", "/vendor/onboarding");
  return selfServiceNav("Driver", "/driver/onboarding");
}

/** Kept for the shell's own default, which renders before a role is known. */
export const NAV_ITEMS: NavItem[] = selfServiceNav("Driver", "/driver/onboarding");

export const NAV_FOOTER: NavItem[] = [
  { label: "Settings", icon: Settings, footer: true },
  { label: "Support", icon: LifeBuoy, footer: true },
  { label: "Logout", icon: LogOut, footer: true },
];
