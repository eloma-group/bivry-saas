import { useEffect } from "react";
import { FlaskConical } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";
import { SectionCard } from "./SectionCard";
import { DateField } from "./Fields";
import { FormUpload } from "@/components/driver/upload/FormUpload";
import { ACCEPT_DOCUMENT, rules } from "@/utils/validation";
import { ExpiryBadge } from "@/components/driver/ExpiryBadge";
import { addMonthsISO } from "@/utils/date";
import type { DriverFormValues } from "@/types/driver";

export function DrugTestSection() {
  const { control, setValue } = useFormContext<DriverFormValues>();
  const issue = useWatch({ control, name: "drugTestIssue" });
  const expiry = useWatch({ control, name: "drugTestExpiry" });

  // Expiry is always issue date + 6 months (read-only).
  useEffect(() => {
    setValue("drugTestExpiry", addMonthsISO(issue, 6));
  }, [issue, setValue]);

  return (
    <SectionCard
      index={8}
      icon={FlaskConical}
      title="Drug & Alcohol Test"
      description="Test report. Expiry is auto-set to 6 months from issue."
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <FormUpload
          name="drugTestFile"
          label="Upload test report"
          accept={ACCEPT_DOCUMENT}
          required
        />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <DateField
            name="drugTestIssue"
            label="Issue Date"
            required
            rules={rules.required("Issue date")}
          />
          <DateField name="drugTestExpiry" label="Expiry Date" readOnly />
          <div className="sm:col-span-2">
            <ExpiryBadge issue={issue} expiry={expiry} />
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
