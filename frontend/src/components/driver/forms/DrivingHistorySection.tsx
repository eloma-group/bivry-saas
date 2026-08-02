import { useEffect } from "react";
import { History } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";
import { SectionCard } from "./SectionCard";
import { DateField } from "./Fields";
import { FormUpload } from "@/components/driver/upload/FormUpload";
import { ACCEPT_DOCUMENT } from "@/utils/validation";
import { ExpiryBadge } from "@/components/driver/ExpiryBadge";
import { addMonthsISO } from "@/utils/date";
import type { DriverFormValues } from "@/types/driver";

export function DrivingHistorySection() {
  const { control, setValue } = useFormContext<DriverFormValues>();
  const issue = useWatch({ control, name: "drivingHistoryIssue" });
  const expiry = useWatch({ control, name: "drivingHistoryExpiry" });

  // Expiry is always issue date + 6 months (read-only).
  useEffect(() => {
    setValue("drivingHistoryExpiry", addMonthsISO(issue, 6));
  }, [issue, setValue]);

  return (
    <SectionCard
      index={4}
      id="step-documents"
      icon={History}
      title="Driving History"
      description="Historical record. Expiry is auto-set to 6 months from issue."
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <FormUpload
          name="drivingHistoryFile"
          label="Upload driving history"
          accept={ACCEPT_DOCUMENT}
        />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <DateField name="drivingHistoryIssue" label="Issue Date" />
          <DateField name="drivingHistoryExpiry" label="Expiry Date" readOnly />
          <div className="sm:col-span-2">
            <ExpiryBadge issue={issue} expiry={expiry} />
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
