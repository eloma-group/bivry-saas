import { useEffect } from "react";
import { ShieldCheck } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";
import { SectionCard } from "./SectionCard";
import { DateField } from "./Fields";
import { FormUpload } from "@/components/driver/upload/FormUpload";
import { ACCEPT_DOCUMENT, rules } from "@/utils/validation";
import { ExpiryBadge } from "@/components/driver/ExpiryBadge";
import { addMonthsISO } from "@/utils/date";
import type { DriverFormValues } from "@/types/driver";

export function PoliceVerificationSection() {
  const { control, setValue } = useFormContext<DriverFormValues>();
  const issue = useWatch({ control, name: "policeIssue" });
  const expiry = useWatch({ control, name: "policeExpiry" });

  // A police check is good for a year from the day it was issued (read-only).
  useEffect(() => {
    setValue("policeExpiry", addMonthsISO(issue, 12));
  }, [issue, setValue]);

  return (
    <SectionCard
      index={5}
      icon={ShieldCheck}
      title="Police Verification"
      description="National police check certificate. Expiry is auto-set to 1 year from issue."
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <FormUpload
          name="policeFile"
          label="Upload police check"
          accept={ACCEPT_DOCUMENT}
          required
        />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <DateField
            name="policeIssue"
            label="Issue Date"
            required
            rules={rules.required("Issue date")}
          />
          <DateField name="policeExpiry" label="Expiry Date" readOnly />
          <div className="sm:col-span-2">
            <ExpiryBadge issue={issue} expiry={expiry} />
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
