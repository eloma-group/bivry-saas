import { ShieldCheck } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";
import { SectionCard } from "@/components/form/SectionCard";
import { TextField, DateField } from "@/components/form/Fields";
import { FormUpload } from "@/components/upload/FormUpload";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { INSURANCE_POLICIES } from "@/constants/vendorOptions";
import { ACCEPT_DOCUMENT, rules } from "@/utils/validation";
import { australianDate, daysUntil, expiryLabel, todayAustralian } from "@/utils/date";
import type { UploadedFile } from "@/types/driver";
import type { InsuranceKey, VendorFormValues } from "@/types/vendor";

const GRID = "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3";

/**
 * One policy.
 *
 * Work cover is keyed by an employer number and a validity window rather than
 * a policy number and a single expiry date, so it asks for its own fields.
 */
function PolicyFields({
  policyKey,
  label,
  workCover,
  minimumLiability,
}: {
  policyKey: InsuranceKey;
  label: string;
  workCover?: boolean;
  /** The least cover accepted, shown under Sum Assured. */
  minimumLiability?: string;
}) {
  const prefix = `insurances.${policyKey}`;
  const { control } = useFormContext<VendorFormValues>();

  // The upload date is not typed: it is the day the document was stored. A file
  // already in the store carries that day; a file just picked is dated today.
  const file = useWatch({
    control,
    name: `insurances.${policyKey}.file`,
  }) as UploadedFile | null;
  const uploadDate = file
    ? file.uploadedAt
      ? australianDate(file.uploadedAt)
      : todayAustralian()
    : "";

  // How long the policy still has to run. Work cover expires at the end of its
  // validity window; every other policy expires on its single expiry date.
  const expiry = useWatch({
    control,
    name: workCover
      ? `insurances.${policyKey}.validTill`
      : `insurances.${policyKey}.expiry`,
  }) as string | undefined;
  const daysLeft = expiry ? expiryLabel(daysUntil(expiry)) : "";

  const daysLeftField = (
    <div className="flex flex-col gap-1.5">
      <span className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
        Days Left
      </span>
      <Input
        value={daysLeft}
        readOnly
        aria-readonly
        placeholder="Set expiry date"
        className="cursor-not-allowed bg-secondary/70 text-muted-foreground"
      />
    </div>
  );

  return (
    <div>
      <p className="mb-3 text-sm font-semibold text-foreground">{label}</p>
      <div className={GRID}>
        {workCover ? (
          <>
            <TextField
              name={`${prefix}.employerNumber`}
              label="Employer Number"
              placeholder="02945156"
              required
              rules={rules.required(`${label} employer number`)}
            />
            <DateField
              name={`${prefix}.issue`}
              label="Issue Date"
              required
              rules={rules.required(`${label} issue date`)}
            />
            <DateField
              name={`${prefix}.validFrom`}
              label="Valid From"
              required
              rules={rules.required(`${label} valid from`)}
            />
            <DateField
              name={`${prefix}.validTill`}
              label="Valid Till"
              required
              rules={rules.required(`${label} valid till`)}
            />
            {/* A whole number of days, so digits and nothing else. It was a
                number input, which put a spinner in the box and changed the
                value on the scroll wheel, and would take "365.5" - which
                parseInt quietly truncates on the way out and the API refuses
                anyway. */}
            <TextField
              name={`${prefix}.dueInDays`}
              label="Due In Days"
              digitsOnly
              placeholder="365"
              required
              rules={rules.required(`${label} due in days`)}
            />
            {daysLeftField}
          </>
        ) : (
          <>
            <TextField
              name={`${prefix}.policyNumber`}
              label="Policy Number"
              placeholder="02945156"
              required
              rules={rules.required(`${label} policy number`)}
            />
            <TextField
              name={`${prefix}.insurer`}
              label="Insurer"
              placeholder="Insurance Australia Group (IAG)"
              required
              rules={rules.required(`${label} insurer`)}
            />
            <DateField
              name={`${prefix}.issue`}
              label="Issue Date"
              required
              rules={rules.required(`${label} issue date`)}
            />
            <DateField
              name={`${prefix}.expiry`}
              label="Expiry Date"
              required
              rules={rules.required(`${label} expiry date`)}
            />
            <TextField
              name={`${prefix}.sumAssured`}
              label="Sum Assured"
              placeholder={minimumLiability ?? "$1 Million"}
              required
              rules={rules.required(`${label} sum assured`)}
              hint={
                minimumLiability
                  ? `Minimum liability: ${minimumLiability}`
                  : undefined
              }
            />
            {daysLeftField}
          </>
        )}

        <div className="lg:col-span-2">
          <span className="mb-1.5 block text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
            Policy Document<span className="ml-0.5 text-primary">*</span>
          </span>
          <FormUpload
            name={`${prefix}.file`}
            label="Attach Document"
            accept={ACCEPT_DOCUMENT}
            rules={rules.requiredFile(`${label} document`)}
          />
        </div>

        <div className="flex flex-col justify-end gap-1.5">
          <span className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
            Date Of Document Upload
          </span>
          <Input
            value={uploadDate}
            readOnly
            aria-readonly
            placeholder="DD/MM/YYYY"
            className="cursor-not-allowed bg-secondary/70 text-muted-foreground"
          />
        </div>
      </div>
    </div>
  );
}

export function InsuranceSection() {
  return (
    <SectionCard
      index={8}
      id="step-insurance"
      icon={ShieldCheck}
      title="Insurance Details"
      description="Every policy you hold, with the certificate behind it."
    >
      <div className="space-y-6">
        {INSURANCE_POLICIES.map((policy, index) => (
          <div key={policy.key}>
            {index > 0 && <Separator className="mb-6" />}
            <PolicyFields
              policyKey={policy.key}
              label={policy.label}
              workCover={policy.workCover}
              minimumLiability={policy.minimumLiability}
            />
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
