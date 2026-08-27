import { BadgeCheck } from "lucide-react";
import { SectionCard } from "@/components/form/SectionCard";
import { TextField, DateField } from "@/components/form/Fields";
import { FormUpload } from "@/components/upload/FormUpload";
import { ACCEPT_DOCUMENT } from "@/utils/validation";

const GRID = "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3";

// Every field in this section is optional: a vendor can submit without an
// accreditation on hand and add it later. Nothing here is marked required, and
// none of it gates the submit (see submissionBlockers and VENDOR_STEPS).
export function AccreditationSection() {
  return (
    <SectionCard
      index={7}
      id="step-accreditation"
      icon={BadgeCheck}
      title="Certificate Of Accreditation"
      description="Your accreditation number and every scheme it covers. All optional - fill in what you have."
    >
      <div className={GRID}>
        <TextField
          name="accreditationNumber"
          label="Accreditation Number"
          placeholder="4854820"
        />
        <DateField name="accreditationExpiry" label="Date Of Expiry" />
        <DateField name="massManagementExpiry" label="Mass Management Expiry Date" />
        <DateField name="dangerousGoodsExpiry" label="Dangerous Goods Expiry Date" />
        <DateField name="nhvasExpiry" label="NHVAS Expiry Date" />
        <DateField name="haccpExpiry" label="HACCP Expiry Date" />
      </div>

      <div className="mt-6 max-w-md">
        <span className="mb-1.5 block text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
          Accreditation Document
        </span>
        <FormUpload
          name="accreditationFile"
          label="Upload Accreditation Document"
          accept={ACCEPT_DOCUMENT}
          allowCamera
          cameraTitle="Capture accreditation document"
        />
      </div>
    </SectionCard>
  );
}
