import { Plane } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";
import { AnimatePresence, motion } from "framer-motion";
import { SectionCard } from "./SectionCard";
import { DateField, SelectField } from "./Fields";
import { FormUpload } from "@/components/driver/upload/FormUpload";
import { ACCEPT_DOCUMENT } from "@/utils/validation";
import { ExpiryBadge } from "@/components/driver/ExpiryBadge";
import { COUNTRIES, VISA_STATUSES, VISA_TYPES } from "@/constants/options";
import type { DriverFormValues } from "@/types/driver";

const GRID = "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3";

export function VisaSection() {
  const { control } = useFormContext<DriverFormValues>();
  // Visa requirements are keyed off the driver's nationality (Section 1).
  const nationality = useWatch({ control, name: "nationality" });
  const visaExpiry = useWatch({ control, name: "visaExpiry" });
  const isAustralian = nationality === "Australia";

  return (
    <SectionCard
      index={6}
      icon={Plane}
      title="Visa Information"
      description="Required for non-Australian nationals. Auto-hidden otherwise."
    >
      <div className="mb-6 max-w-sm">
        <SelectField
          name="nationality"
          label="Nationality"
          options={COUNTRIES}
        />
      </div>

      <AnimatePresence initial={false} mode="wait">
        {isAustralian ? (
          <motion.div
            key="hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-5 py-4 text-sm text-emerald-700"
          >
            Australian national - no visa documentation required.
          </motion.div>
        ) : (
          <motion.div
            key="visible"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <div className={GRID}>
              <SelectField
                name="visaStatus"
                label="Visa Status"
                options={VISA_STATUSES}
              />
              <SelectField
                name="visaType"
                label="Visa Type"
                options={VISA_TYPES}
              />
              <DateField name="visaExpiry" label="Expiry Date" />
            </div>
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <FormUpload
                name="visaFile"
                label="Upload visa document"
                accept={ACCEPT_DOCUMENT}
              />
              <div className="flex items-center">
                <ExpiryBadge expiry={visaExpiry} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </SectionCard>
  );
}
