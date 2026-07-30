import { FlaskConical } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";
import { SectionCard } from "./SectionCard";
import { DateField } from "./Fields";
import { FormUpload } from "@/components/driver/upload/FormUpload";
import { ExpiryBadge } from "@/components/driver/ExpiryBadge";
import type { DriverFormValues } from "@/types/driver";

export function DrugTestSection() {
  const { control } = useFormContext<DriverFormValues>();
  const file = useWatch({ control, name: "drugTestFile" });

  return (
    <SectionCard
      index={8}
      icon={FlaskConical}
      title="Drug & Alcohol Test"
      description="Test report has no expiry - marked valid once uploaded."
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <FormUpload
          name="drugTestFile"
          label="Upload test report"
          accept="image/*,application/pdf"
        />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <DateField name="drugTestIssue" label="Issue Date" />
          <div className="flex items-end pb-1 sm:col-span-2">
            <ExpiryBadge staticValid={Boolean(file)} expiry={null} />
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
