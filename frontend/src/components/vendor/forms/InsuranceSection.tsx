import { ShieldCheck } from "lucide-react";
import { SectionCard } from "@/components/form/SectionCard";
import { TextField, DateField } from "@/components/form/Fields";
import { FormUpload } from "@/components/upload/FormUpload";
import { Separator } from "@/components/ui/separator";
import { INSURANCE_POLICIES } from "@/constants/vendorOptions";
import { ACCEPT_DOCUMENT, rules } from "@/utils/validation";

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
}: {
  policyKey: string;
  label: string;
  workCover?: boolean;
}) {
  const prefix = `insurances.${policyKey}`;

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
            <TextField
              name={`${prefix}.dueInDays`}
              label="Due In Days"
              type="number"
              placeholder="365"
              required
              rules={rules.required(`${label} due in days`)}
            />
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
              name={`${prefix}.expiry`}
              label="Expiry Date"
              required
              rules={rules.required(`${label} expiry date`)}
            />
            <TextField
              name={`${prefix}.sumAssured`}
              label="Sum Assured"
              placeholder="$1 Million"
              required
              rules={rules.required(`${label} sum assured`)}
            />
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
            />
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
