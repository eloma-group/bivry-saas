import { Receipt } from "lucide-react";
import { SectionCard } from "@/components/form/SectionCard";
import { SelectField } from "@/components/form/Fields";
import { BILLING_TYPES, PAYMENT_TERMS } from "@/constants/customerOptions";
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
          required
          rules={rules.required("Term")}
        />
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
