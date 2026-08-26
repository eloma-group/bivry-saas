import { Landmark } from "lucide-react";
import { SectionCard } from "@/components/form/SectionCard";
import { TextField } from "@/components/form/Fields";
import { BSB_LENGTH, rules } from "@/utils/validation";

const GRID = "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3";

export function BankDetailsSection() {
  return (
    <SectionCard
      index={4}
      id="step-bank"
      icon={Landmark}
      title="Bank Details"
      description="Where we pay you. These details are only visible to our accounts team."
    >
      <div className={GRID}>
        <TextField
          name="bankName"
          label="Bank Name"
          placeholder="St George Bank"
          required
          rules={rules.required("Bank name")}
        />
        <TextField
          name="accountName"
          label="Account Name"
          placeholder="Rentals Pty Ltd"
          required
          rules={rules.required("Account name")}
        />
        <TextField
          name="bsb"
          label="BSB"
          placeholder="113100"
          required
          digitsOnly
          maxLength={BSB_LENGTH}
          rules={rules.bsb}
          hint="Six digits. Leave out the dash."
        />
        <TextField
          name="accountNumber"
          label="Account Number"
          placeholder="123456789"
          required
          digitsOnly
          rules={rules.accountNumber}
          hint="Digits only. As long as your bank's numbers run."
        />
      </div>
    </SectionCard>
  );
}
