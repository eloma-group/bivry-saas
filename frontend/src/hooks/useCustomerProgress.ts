import { useFormContext, useWatch } from "react-hook-form";
import { CONTACT_BLOCKS, CUSTOMER_STEPS, PRIMARY_CONTACT } from "@/constants/customerOptions";
import type { StepProgress, DriverProgress } from "./useDriverProgress";
import type {
  CustomerAddressBlock,
  CustomerContactBlock,
  CustomerFormValues,
} from "@/types/customer";

/**
 * Whether a value counts as answered.
 *
 * The customer form holds more shapes than a flat list of strings: contact
 * blocks, repeating rows and the documents table each mean something different
 * by "filled in", so they are judged on their own terms.
 */

type ContactKey = (typeof CONTACT_BLOCKS)[number]["key"];

const CONTACT_KEYS = new Set<ContactKey>(CONTACT_BLOCKS.map((block) => block.key));

/**
 * Requirements that count as answered by being asked at all.
 *
 * The Documents section is optional from top to bottom: the contract has a slot
 * and everything else is added by the customer, so a customer with no paperwork
 * to hand has answered it in full by holding no documents. Judging it on
 * whether it holds rows would leave the step short of complete for good, and
 * with it the Review step behind it.
 */
const ALWAYS_ANSWERED = new Set<keyof CustomerFormValues>(["documents"]);

/**
 * Whether an address has been answered.
 *
 * Street 2 is left out on purpose: it carries a unit or a level, and plenty of
 * addresses have none, so asking for it would leave the section stuck short of
 * complete for the customers who are already finished.
 */
function isWholeAddress(address: Partial<CustomerAddressBlock>): boolean {
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

    return true;
  }

  if (typeof value === "object") {
    // A contact block asks for a person and a way to reach them.
    const contact = value as Partial<CustomerContactBlock>;
    if ("contactPerson" in contact) {
      return Boolean(contact.contactPerson && contact.email && contact.contactNumber);
    }

    // The principal and billing addresses.
    if ("street1" in value) return isWholeAddress(value as Partial<CustomerAddressBlock>);

    // An uploaded file object.
    return true;
  }

  return Boolean(value);
}

/** Whether a step requirement names one of the four contact blocks. */
function isContactKey(key: keyof CustomerFormValues): key is ContactKey {
  return CONTACT_KEYS.has(key as ContactKey);
}

/**
 * The value a requirement is judged on.
 *
 * A block folded away by a tick is judged on what the tick makes it: a contact
 * ticked as a copy becomes the operations contact. Otherwise a form that is
 * complete on screen would read as unfinished. The billing address is not among
 * them any more - it is always asked for in full.
 */
function valueFor(
  values: CustomerFormValues | undefined,
  key: keyof CustomerFormValues,
): unknown {
  if (values && key !== PRIMARY_CONTACT.key && isContactKey(key)) {
    const block = values[key];
    if (block?.sameAsOperations) return values[PRIMARY_CONTACT.key];
  }

  return values?.[key];
}

/** Derives stepper completion + overall percentage from live form values. */
export function useCustomerProgress(): DriverProgress {
  const { control } = useFormContext<CustomerFormValues>();
  const values = useWatch({ control }) as CustomerFormValues;

  let filledTotal = 0;
  let requiredTotal = 0;

  const steps: StepProgress[] = CUSTOMER_STEPS.map((step) => {
    if (step.requires.length === 0) {
      return { id: step.id, label: step.label, complete: false, ratio: 0 };
    }
    const filled = step.requires.filter(
      (key) => ALWAYS_ANSWERED.has(key) || isFilled(valueFor(values, key)),
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

  const percent = requiredTotal === 0 ? 0 : Math.round((filledTotal / requiredTotal) * 100);

  // Review completes only when everything before it is done.
  const priorComplete = steps.slice(0, -1).every((step) => step.complete);
  steps[steps.length - 1].complete = priorComplete;
  steps[steps.length - 1].ratio = priorComplete ? 1 : 0;

  const activeIndex = Math.max(
    0,
    steps.findIndex((step) => !step.complete),
  );

  return { steps, percent, activeIndex };
}
