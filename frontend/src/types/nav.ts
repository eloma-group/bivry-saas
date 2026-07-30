import type { LucideIcon } from "lucide-react";

export interface NavChild {
  label: string;
  /** Only enabled items are clickable. */
  enabled?: boolean;
  href?: string;
}

export interface NavItem {
  label: string;
  icon: LucideIcon;
  enabled?: boolean;
  children?: NavChild[];
  /** Rendered pinned to the bottom of the sidebar. */
  footer?: boolean;
}
