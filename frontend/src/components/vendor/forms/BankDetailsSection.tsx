import { Landmark } from "lucide-react";
import { SectionCard } from "@/components/form/SectionCard";
import { TextField } from "@/components/form/Fields";
import { rules } from "@/utils/validation";

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
          name="accountName"
          label="Account Name"
          placeholder="Rentals Pty Ltd"
          required
          rules={rules.required("Account name")}
        />
        <TextField
          name="bankName"
          label="Bank Name"
          placeholder="St George Bank"
          required
          rules={rules.required("Bank name")}
        />
        <TextField
          name="bsb"
          label="BSB"
          placeholder="113 100"
          required
          rules={rules.required("BSB")}
        />
        <TextField
          name="accountNumber"
          label="Account Number"
          placeholder="1234-5678-9012"
          required
          rules={rules.required("Account number")}
        />
      </div>
    </SectionCard>
  );
}
