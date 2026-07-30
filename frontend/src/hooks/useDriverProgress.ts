import { useFormContext, useWatch } from "react-hook-form";
import { STEPS } from "@/constants/options";
import type { DriverFormValues, AddressBlock } from "@/types/driver";

function isFilled(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "object") {
    // Address block - consider filled if the key parts are present.
    const a = value as Partial<AddressBlock>;
    if ("street" in a || "houseNumber" in a) {
      return Boolean(a.street && a.suburb && a.state);
    }
    return true; // uploaded file object
  }
  return true;
}

export interface StepProgress {
  id: string;
  label: string;
  complete: boolean;
  ratio: number;
}

export interface DriverProgress {
  steps: StepProgress[];
  percent: number;
  activeIndex: number;
}

/** Derives stepper completion + overall percentage from live form values. */
export function useDriverProgress(): DriverProgress {
  const { control } = useFormContext<DriverFormValues>();
  const values = useWatch({ control }) as DriverFormValues;

  let filledTotal = 0;
  let requiredTotal = 0;

  const steps: StepProgress[] = STEPS.map((step) => {
    if (step.requires.length === 0) {
      return { id: step.id, label: step.label, complete: false, ratio: 0 };
    }
    const filled = step.requires.filter((key) =>
      isFilled(values?.[key])
    ).length;
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

  // Review step completes only when everything before it is done.
  const priorComplete = steps.slice(0, -1).every((s) => s.complete);
  steps[steps.length - 1].complete = priorComplete;
  steps[steps.length - 1].ratio = priorComplete ? 1 : 0;

  const activeIndex = Math.max(
    0,
    steps.findIndex((s) => !s.complete)
  );

  return { steps, percent, activeIndex };
}
