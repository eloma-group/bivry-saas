import {
  LayoutDashboard,
  // Icons for the commented-out dropdowns (uncomment with their menus):
  // CalendarDays,
  // Truck,
  // Send,
  // Wallet,
  // Users2,
  BarChart3,
  UserPlus,
  Settings,
  LifeBuoy,
  LogOut,
} from "lucide-react";
import type { NavItem } from "@/types/nav";

/**
 * Full fleet-management menu. Only "Onboarding → Driver" is enabled;
 * every other entry renders realistically but stays disabled.
 */
export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard },
  /* Dropdown menus below are temporarily commented out (not deleted).
     Only Reports and Onboarding dropdowns remain active for now.
     Uncomment any block to restore that menu. */
  // {
  //   label: "Bookings",
  //   icon: CalendarDays,
  //   children: [
  //     { label: "All Bookings" },
  //     { label: "Create Booking" },
  //     { label: "Calendar" },
  //   ],
  // },
  // {
  //   label: "Operations",
  //   icon: Truck,
  //   children: [{ label: "Live Map" }, { label: "Routes" }, { label: "Jobs" }],
  // },
  // {
  //   label: "Dispatch",
  //   icon: Send,
  //   children: [{ label: "Assign" }, { label: "Queue" }],
  // },
  // {
  //   label: "Accounts",
  //   icon: Wallet,
  //   children: [{ label: "Invoices" }, { label: "Payments" }, { label: "Payroll" }],
  // },
  // {
  //   label: "Management",
  //   icon: Users2,
  //   children: [{ label: "Teams" }, { label: "Roles" }, { label: "Assets" }],
  // },
  {
    label: "Reports",
    icon: BarChart3,
    children: [{ label: "Overview" }, { label: "Compliance" }, { label: "Exports" }],
  },
  {
    label: "Onboarding",
    icon: UserPlus,
    children: [
      { label: "Vehicle" },
      { label: "Customer" },
      { label: "User" },
      { label: "Supplier" },
      { label: "Driver", enabled: true, href: "driver" },
    ],
  },
];

export const NAV_FOOTER: NavItem[] = [
  { label: "Settings", icon: Settings, footer: true },
  { label: "Support", icon: LifeBuoy, footer: true },
  { label: "Logout", icon: LogOut, footer: true },
];
