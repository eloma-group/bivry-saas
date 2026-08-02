import { Stethoscope } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";
import { SectionCard } from "./SectionCard";
import { DateField } from "./Fields";
import { FormUpload } from "@/components/driver/upload/FormUpload";
import { ACCEPT_DOCUMENT } from "@/utils/validation";
import { ExpiryBadge } from "@/components/driver/ExpiryBadge";
import type { DriverFormValues } from "@/types/driver";

export function MedicalSection() {
  const { control } = useFormContext<DriverFormValues>();
  const issue = useWatch({ control, name: "medicalIssue" });
  const expiry = useWatch({ control, name: "medicalExpiry" });

  return (
    <SectionCard
      index={7}
      id="step-medical"
      icon={Stethoscope}
      title="Medical History"
      description="Medical certificate confirming fitness to drive."
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <FormUpload
          name="medicalFile"
          label="Upload medical certificate"
          accept={ACCEPT_DOCUMENT}
        />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <DateField name="medicalIssue" label="Issue Date" />
          <DateField name="medicalExpiry" label="Expiry Date" />
          <div className="sm:col-span-2">
            <ExpiryBadge issue={issue} expiry={expiry} />
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
