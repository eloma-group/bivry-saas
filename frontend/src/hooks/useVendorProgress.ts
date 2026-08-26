import { useFormContext, useWatch } from "react-hook-form";
import { VENDOR_STEPS } from "@/constants/vendorOptions";
import type { StepProgress, DriverProgress } from "./useDriverProgress";
import type {
  ComplianceDocRow,
  ContactBlock,
  VendorAddressBlock,
  VendorFormValues,
} from "@/types/vendor";

/**
 * Whether a value counts as answered.
 *
 * The vendor form holds more shapes than the driver one: contact blocks,
 * multi selects, repeating rows and the compliance table each mean something
 * different by "filled in", so they are judged on their own terms.
 */
/**
 * Whether an address has been answered.
 *
 * Street 2 is left out on purpose: it carries a unit or a level, and plenty of
 * addresses have none, so asking for it would leave the section stuck at short
 * of complete for the vendors who are already finished.
 */
function isWholeAddress(address: Partial<VendorAddressBlock>): boolean {
  return Boolean(
    address.street1?.trim() &&
      address.suburb?.trim() &&
      address.state?.trim() &&
      address.country?.trim() &&
      address.postCode?.trim(),
  );
}

function isFilled(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;

  if (Array.isArray(value)) {
    if (value.length === 0) return false;

    // Trading names: one filled in is enough, empty rows do not count.
    const named = value as Array<{ name?: unknown }>;
    if (typeof named[0] === "object" && named[0] !== null && "name" in named[0]) {
      return named.some((row) => typeof row.name === "string" && row.name.trim() !== "");
    }

    // The compliance table: complete once every required row has a file.
    const rows = value as ComplianceDocRow[];
    if (typeof rows[0] === "object" && rows[0] !== null && "fixed" in rows[0]) {
      return rows.every((row) => !row.fixed || row.file !== null);
    }

    // Warehouses: every address in the list has to be a whole address.
    const addresses = value as VendorAddressBlock[];
    if (typeof addresses[0] === "object" && addresses[0] !== null && "street1" in addresses[0]) {
      return addresses.every(isWholeAddress);
    }

    return true;
  }

  if (typeof value === "object") {
    // A contact block asks for a person and a way to reach them.
    const contact = value as Partial<ContactBlock>;
    if ("contactPerson" in contact) {
      return Boolean(contact.contactPerson && contact.email && contact.contactNumber);
    }

    // The principal and billing addresses.
    if ("street1" in value) return isWholeAddress(value as Partial<VendorAddressBlock>);

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

/**
 * The value a step's requirement is judged on.
 *
 * The billing address is the one exception. Ticked as a copy, its own fields
 * stay empty and off screen and the principal address is what gets saved as the
 * billing one, so judging the empty block would leave the Addresses step short
 * of complete for everybody who ticked the box.
 */
function valueFor(
  values: VendorFormValues | undefined,
  key: keyof VendorFormValues,
): unknown {
  if (key === "billingAddress" && values?.billingSameAsPrincipal) return values.principalAddress;
  return values?.[key];
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
    const filled = step.requires.filter((key) => isFilled(valueFor(values, key))).length;
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
