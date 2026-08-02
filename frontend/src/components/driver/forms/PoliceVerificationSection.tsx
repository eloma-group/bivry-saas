import { ShieldCheck } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";
import { SectionCard } from "./SectionCard";
import { DateField } from "./Fields";
import { FormUpload } from "@/components/driver/upload/FormUpload";
import { ACCEPT_DOCUMENT } from "@/utils/validation";
import { ExpiryBadge } from "@/components/driver/ExpiryBadge";
import type { DriverFormValues } from "@/types/driver";

export function PoliceVerificationSection() {
  const { control } = useFormContext<DriverFormValues>();
  const issue = useWatch({ control, name: "policeIssue" });
  const expiry = useWatch({ control, name: "policeExpiry" });

  return (
    <SectionCard
      index={5}
      icon={ShieldCheck}
      title="Police Verification"
      description="National police check certificate and validity."
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <FormUpload
          name="policeFile"
          label="Upload police check"
          accept={ACCEPT_DOCUMENT}
        />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <DateField name="policeIssue" label="Issue Date" />
          <DateField name="policeExpiry" label="Expiry Date" />
          <div className="sm:col-span-2">
            <ExpiryBadge issue={issue} expiry={expiry} />
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
