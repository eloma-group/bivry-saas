import type { OnboardingStatus, VerificationStatus } from "@/services/driverService";
import type { AccountStatus } from "@/services/adminService";

/**
 * How the statuses read on screen, in one place, so the dashboard, the driver
 * table and the review panel never disagree about what a state is called.
 */

export type BadgeVariant =
  | "default"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "outline";

export const ONBOARDING_STATUS: Record<
  OnboardingStatus,
  { label: string; variant: BadgeVariant }
> = {
  NOT_STARTED: { label: "Not started", variant: "outline" },
  IN_PROGRESS: { label: "In progress", variant: "warning" },
  SUBMITTED: { label: "Submitted", variant: "default" },
  UNDER_REVIEW: { label: "Under review", variant: "default" },
  APPROVED: { label: "Approved", variant: "success" },
  REJECTED: { label: "Changes requested", variant: "danger" },
};

/** The filter dropdown over the driver table. */
export const ONBOARDING_STATUS_ORDER: OnboardingStatus[] = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
];

export const VERIFICATION_STATUS: Record<
  VerificationStatus,
  { label: string; variant: BadgeVariant }
> = {
  PENDING: { label: "Awaiting review", variant: "warning" },
  VERIFIED: { label: "Verified", variant: "success" },
  REJECTED: { label: "Rejected", variant: "danger" },
  EXPIRED: { label: "Expired", variant: "danger" },
};

export const ACCOUNT_STATUS: Record<AccountStatus, { label: string; variant: BadgeVariant }> = {
  PENDING: { label: "Pending", variant: "warning" },
  ACTIVE: { label: "Active", variant: "success" },
  SUSPENDED: { label: "Suspended", variant: "danger" },
  DEACTIVATED: { label: "Deactivated", variant: "outline" },
};

export const ACCOUNT_STATUS_ORDER: AccountStatus[] = [
  "PENDING",
  "ACTIVE",
  "SUSPENDED",
  "DEACTIVATED",
];

/** Sections an admin can verify one at a time. */
export const REVIEWABLE_SECTIONS = [
  { slug: "licence", label: "Driving licence" },
  { slug: "drivingHistory", label: "Driving history" },
  { slug: "policeVerification", label: "Police verification" },
  { slug: "visa", label: "Visa" },
  { slug: "medical", label: "Medical" },
  { slug: "drugTest", label: "Drug test" },
] as const;

/** The supplier equivalent: the accreditation and each policy on its own. */
export const REVIEWABLE_VENDOR_SECTIONS = [
  { slug: "accreditation", label: "Certificate of accreditation" },
  { slug: "productLiability", label: "Product liability" },
  { slug: "publicLiability", label: "Public liability" },
  { slug: "workCover", label: "Work cover" },
  { slug: "marineGeneral", label: "Marine (general & refrigerated)" },
  { slug: "marineAlcohol", label: "Marine (alcohol)" },
  { slug: "coc", label: "COC" },
] as const;
