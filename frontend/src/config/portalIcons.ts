import { Briefcase, ShieldCheck, Truck, UserCog, Users } from "lucide-react";
import type { RoleSlug } from "@/types/auth";

/**
 * The face each portal wears. The picker and that portal's own auth pages draw
 * from here, so the icon you click on the way in is the icon above the form you
 * land on.
 */
export const PORTAL_ICONS: Record<RoleSlug, typeof Truck> = {
  admin: ShieldCheck,
  customer: Users,
  vendor: Briefcase,
  employee: UserCog,
  driver: Truck,
};
