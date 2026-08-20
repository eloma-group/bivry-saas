import { useFormContext, useWatch } from "react-hook-form";
import { VENDOR_STEPS } from "@/constants/vendorOptions";
import type { StepProgress, DriverProgress } from "./useDriverProgress";
import type { ComplianceDocRow, ContactBlock, VendorFormValues } from "@/types/vendor";

/**
 * Whether a value counts as answered.
 *
 * The supplier form holds more shapes than the driver one: contact blocks,
 * multi selects, repeating rows and the compliance table each mean something
 * different by "filled in", so they are judged on their own terms.
 */
function isFilled(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;

  if (Array.isArray(value)) {
    if (value.length === 0) return false;

    // The compliance table: complete once every required row has a file.
    const rows = value as ComplianceDocRow[];
    if (typeof rows[0] === "object" && rows[0] !== null && "fixed" in rows[0]) {
      return rows.every((row) => !row.fixed || row.file !== null);
    }

    return true;
  }

  if (typeof value === "object") {
    // A contact block asks for a person and a way to reach them.
    const contact = value as Partial<ContactBlock>;
    if ("contactPerson" in contact) {
      return Boolean(contact.contactPerson && contact.email && contact.contactNumber);
    }

    // The insurance map: every policy needs its document.
    const record = value as Record<string, { file?: unknown } | undefined>;
    const policies = Object.values(record);
    if (policies.length > 0 && policies.every((row) => row && typeof row === "object" && "file" in row)) {
      return policies.every((row) => Boolean(row?.file));
    }

    return true; // uploaded file object
  }

  return true;
}

/** Derives stepper completion + overall percentage from live form values. */
export function useVendorProgress(): DriverProgress {
  const { control } = useFormContext<VendorFormValues>();
  const values = useWatch({ control }) as VendorFormValues;

  let filledTotal = 0;
  let requiredTotal = 0;

  const steps: StepProgress[] = VENDOR_STEPS.map((step) => {
    if (step.requires.length === 0) {
      return { id: step.id, label: step.label, complete: false, ratio: 0 };
    }
    const filled = step.requires.filter((key) => isFilled(values?.[key])).length;
    filledTotal += filled;
    requiredTotal += step.requires.length;
    return {
      id: step.id,
      label: step.label,
      complete: filled === step.requires.length,
      ratio: filled / step.requires.length,
    };
  });

  const percent =
    requiredTotal === 0 ? 0 : Math.round((filledTotal / requiredTotal) * 100);

  // Review completes only when everything before it is done.
  const priorComplete = steps.slice(0, -1).every((step) => step.complete);
  steps[steps.length - 1].complete = priorComplete;
  steps[steps.length - 1].ratio = priorComplete ? 1 : 0;

  const activeIndex = Math.max(0, steps.findIndex((step) => !step.complete));

  return { steps, percent, activeIndex };
}
