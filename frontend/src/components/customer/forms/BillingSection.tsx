import { Receipt } from "lucide-react";
import { SectionCard } from "@/components/form/SectionCard";
import { SelectField } from "@/components/form/Fields";
import { BILLING_TYPES, PAYMENT_TERMS } from "@/constants/customerOptions";
import { OPTION_LISTS } from "@/constants/optionLists";
import { rules } from "@/utils/validation";

const GRID = "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3";

export function BillingSection() {
  return (
    <SectionCard
      index={5}
      id="step-billing"
      icon={Receipt}
      title="Billing"
      description="How this account is charged, and when payment falls due."
    >
      <div className={GRID}>
        <SelectField
          name="term"
          label="Term"
          options={PAYMENT_TERMS}
          listKey={OPTION_LISTS.paymentTerm}
          required
          rules={rules.required("Term")}
        />
        {/* The one dropdown in the product with no "Add" row. Its two answers
            are a stored enum, not text: they are mapped through
            BILLING_TYPE_TO_API on the way out, so a third one added here would
            map to nothing and save as blank. Adding one is a schema change. */}
        <SelectField
          name="billingType"
          label="Billing Type"
          options={BILLING_TYPES}
          required
          rules={rules.required("Billing type")}
        />
      </div>
    </SectionCard>
  );
}
