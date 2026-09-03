import { CreditCard } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";
import { SectionCard } from "@/components/form/SectionCard";
import { TextField, DateField, SelectField } from "@/components/form/Fields";
import { FormUpload } from "@/components/upload/FormUpload";
import { ExpiryBadge } from "@/components/driver/ExpiryBadge";
import { AU_STATES, LICENCE_TYPES } from "@/constants/options";
import { OPTION_LISTS } from "@/constants/optionLists";
import { ACCEPT_IMAGE, rules } from "@/utils/validation";
import type { DriverFormValues } from "@/types/driver";

const GRID = "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3";

export function LicenceSection() {
  const { control } = useFormContext<DriverFormValues>();
  const expiry = useWatch({ control, name: "licenceExpiry" });

  return (
    <SectionCard
      index={3}
      id="step-licence"
      icon={CreditCard}
      title="Driving Licence Information"
      description="Licence details and card images. Expiry status updates live."
    >
      <div className={GRID}>
        <TextField
          name="licenceNumber"
          label="Licence Number"
          placeholder="038639930"
          required
          rules={rules.licenceNumber}
        />
        <TextField
          name="licenceCardNumber"
          label="Licence Card Number"
          placeholder="AB123456"
          required
          rules={rules.required("Licence card number")}
        />
        <SelectField
          name="licenceType"
          label="Licence Type"
          options={LICENCE_TYPES}
          listKey={OPTION_LISTS.licenceType}
          required
          rules={rules.required("Licence type")}
        />
        <SelectField
          name="licenceState"
          label="State"
          options={AU_STATES}
          listKey={OPTION_LISTS.licenceState}
          required
          rules={rules.required("State")}
        />
        <DateField
          name="licenceExpiry"
          label="Expiry Date"
          required
          rules={rules.required("Expiry date")}
        />
        <div className="flex flex-col gap-1.5">
          <span className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
            Days Remaining
          </span>
          <div className="flex h-11 items-center">
            <ExpiryBadge expiry={expiry} />
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-semibold text-foreground">
            Licence - Front
          </p>
          <FormUpload
            name="licenceFront"
            label="Upload front"
            accept={ACCEPT_IMAGE}
            allowCamera
            cameraTitle="Capture licence front"
            required
          />
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold text-foreground">
            Licence - Back
          </p>
          <FormUpload
            name="licenceBack"
            label="Upload back"
            accept={ACCEPT_IMAGE}
            allowCamera
            cameraTitle="Capture licence back"
            required
          />
        </div>
      </div>
    </SectionCard>
  );
}
