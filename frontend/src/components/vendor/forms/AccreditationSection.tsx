import { BadgeCheck } from "lucide-react";
import { SectionCard } from "@/components/form/SectionCard";
import { TextField, DateField } from "@/components/form/Fields";
import { FormUpload } from "@/components/upload/FormUpload";
import { ACCEPT_DOCUMENT, rules } from "@/utils/validation";

const GRID = "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3";

export function AccreditationSection() {
  return (
    <SectionCard
      index={7}
      id="step-accreditation"
      icon={BadgeCheck}
      title="Certificate Of Accreditation"
      description="Your accreditation number and every scheme it covers."
    >
      <div className={GRID}>
        <TextField
          name="accreditationNumber"
          label="Accreditation Number"
          placeholder="4854820"
          required
          rules={rules.required("Accreditation number")}
        />
        <DateField
          name="massManagementExpiry"
          label="Mass Management Expiry Date"
          required
          rules={rules.required("Mass management expiry")}
        />
        <DateField
          name="basicFatigueExpiry"
          label="Basic Fatigue Management Expiry Date"
          required
          rules={rules.required("Basic fatigue management expiry")}
        />
        <DateField
          name="dangerousGoodsExpiry"
          label="Dangerous Goods Expiry Date"
          required
          rules={rules.required("Dangerous goods expiry")}
        />
        <DateField
          name="nhvasExpiry"
          label="NHVAS Expiry Date"
          required
          rules={rules.required("NHVAS expiry")}
        />
        <DateField
          name="haccpExpiry"
          label="HACCP Expiry Date"
          required
          rules={rules.required("HACCP expiry")}
        />
      </div>

      <div className="mt-6 max-w-md">
        <span className="mb-1.5 block text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
          Accreditation Document<span className="ml-0.5 text-primary">*</span>
        </span>
        <FormUpload
          name="accreditationFile"
          label="Upload Accreditation Document"
          accept={ACCEPT_DOCUMENT}
          allowCamera
          cameraTitle="Capture accreditation document"
          rules={rules.requiredFile("Accreditation document")}
        />
      </div>
    </SectionCard>
  );
}
