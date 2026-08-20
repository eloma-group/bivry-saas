import { useEffect } from "react";
import { Stethoscope } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";
import { SectionCard } from "@/components/form/SectionCard";
import { DateField } from "@/components/form/Fields";
import { FormUpload } from "@/components/upload/FormUpload";
import { ACCEPT_DOCUMENT, rules } from "@/utils/validation";
import { ExpiryBadge } from "@/components/driver/ExpiryBadge";
import { addMonthsISO } from "@/utils/date";
import type { DriverFormValues } from "@/types/driver";

export function MedicalSection() {
  const { control, setValue } = useFormContext<DriverFormValues>();
  const issue = useWatch({ control, name: "medicalIssue" });
  const expiry = useWatch({ control, name: "medicalExpiry" });

  // Expiry is always issue date + 6 months (read-only).
  useEffect(() => {
    setValue("medicalExpiry", addMonthsISO(issue, 6));
  }, [issue, setValue]);

  return (
    <SectionCard
      index={7}
      id="step-medical"
      icon={Stethoscope}
      title="Medical History"
      description="Medical certificate confirming fitness to drive. Expiry is auto-set to 6 months from issue."
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <FormUpload
          name="medicalFile"
          label="Upload medical certificate"
          accept={ACCEPT_DOCUMENT}
          required
        />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <DateField
            name="medicalIssue"
            label="Issue Date"
            required
            rules={rules.required("Issue date")}
          />
          <DateField name="medicalExpiry" label="Expiry Date" readOnly />
          <div className="sm:col-span-2">
            <ExpiryBadge issue={issue} expiry={expiry} />
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
