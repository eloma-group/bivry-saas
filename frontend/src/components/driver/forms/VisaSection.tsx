import { Plane } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";
import { AnimatePresence, motion } from "framer-motion";
import { SectionCard } from "@/components/form/SectionCard";
import { DateField, SelectField, TextField } from "@/components/form/Fields";
import { FormUpload } from "@/components/upload/FormUpload";
import { ACCEPT_DOCUMENT, rules } from "@/utils/validation";
import { ExpiryBadge } from "@/components/driver/ExpiryBadge";
import { COUNTRIES, VISA_STATUSES, VISA_TYPES } from "@/constants/options";
import { OPTION_LISTS } from "@/constants/optionLists";
import type { DriverFormValues } from "@/types/driver";

const GRID = "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3";

export function VisaSection() {
  const { control, getValues } = useFormContext<DriverFormValues>();
  // Which documents this section asks for is keyed off the driver's country
  // (Section 1): an Australian national holds no visa but does hold a passport
  // and a Medicare card.
  const country = useWatch({ control, name: "country" });
  const visaExpiry = useWatch({ control, name: "visaExpiry" });
  const passportExpiry = useWatch({ control, name: "passportExpiry" });
  const medicareExpiry = useWatch({ control, name: "medicareExpiry" });
  const isAustralian = country === "Australia";

  // Both halves stay registered once they have been shown, so each rule has to
  // check whether its half is the one actually being asked for.
  const australianOnly = (label: string) =>
    rules.requiredWhen(label, () => getValues("country") === "Australia");
  const visaOnly = (label: string) =>
    rules.requiredWhen(label, () => getValues("country") !== "Australia");

  return (
    <SectionCard
      index={6}
      icon={Plane}
      title="Visa Information"
      description="Visa documents for a non-Australian national, passport and Medicare for an Australian one."
    >
      <div className="mb-6 max-w-sm">
        <SelectField
          name="country"
          label="Country"
          options={COUNTRIES}
          listKey={OPTION_LISTS.country}
          required
          rules={rules.required("Country")}
        />
      </div>

      <AnimatePresence initial={false} mode="wait">
        {isAustralian ? (
          <motion.div
            key="australian"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-8"
          >
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-5 py-4 text-sm text-emerald-700">
              Australian national - no visa required. Your passport and Medicare card
              are needed instead.
            </div>

            {/* Passport */}
            <div>
              <p className="mb-4 text-sm font-semibold text-foreground">Passport</p>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <TextField
                  name="passportNumber"
                  label="Passport Number"
                  placeholder="PA1234567"
                  required
                  rules={australianOnly("Passport number")}
                />
                <DateField
                  name="passportExpiry"
                  label="Expiry Date"
                  required
                  rules={australianOnly("Passport expiry date")}
                />
                <div className="flex flex-col gap-1.5">
                  <span className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
                    Days Remaining
                  </span>
                  <div className="flex h-11 items-center">
                    <ExpiryBadge expiry={passportExpiry} />
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-sm font-semibold text-foreground">
                    Passport - Front
                  </p>
                  <FormUpload
                    name="passportFront"
                    label="Upload front"
                    accept={ACCEPT_DOCUMENT}
                    required
                    rules={australianOnly("Passport front")}
                  />
                </div>
                <div>
                  <p className="mb-2 text-sm font-semibold text-foreground">
                    Passport - Back
                  </p>
                  <FormUpload
                    name="passportBack"
                    label="Upload back"
                    accept={ACCEPT_DOCUMENT}
                    required
                    rules={australianOnly("Passport back")}
                  />
                </div>
              </div>
            </div>

            {/* Medicare */}
            <div>
              <p className="mb-4 text-sm font-semibold text-foreground">Medicare</p>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <TextField
                  name="medicareNumber"
                  label="Medicare Card Number"
                  placeholder="1234 56789 0"
                  required
                  rules={australianOnly("Medicare card number")}
                />
                <DateField
                  name="medicareExpiry"
                  label="Expiry Date"
                  required
                  rules={australianOnly("Medicare expiry date")}
                />
                <div className="flex flex-col gap-1.5">
                  <span className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
                    Days Remaining
                  </span>
                  <div className="flex h-11 items-center">
                    <ExpiryBadge expiry={medicareExpiry} />
                  </div>
                </div>
              </div>

              <div className="mt-6 max-w-md">
                <FormUpload
                  name="medicareFile"
                  label="Upload Medicare card"
                  accept={ACCEPT_DOCUMENT}
                  required
                  rules={australianOnly("Medicare card")}
                />
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="visa"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <div className={GRID}>
              <SelectField
                name="visaStatus"
                label="Visa Status"
                options={VISA_STATUSES}
                listKey={OPTION_LISTS.visaStatus}
                required
                rules={visaOnly("Visa status")}
              />
              <SelectField
                name="visaType"
                label="Visa Type"
                options={VISA_TYPES}
                listKey={OPTION_LISTS.visaType}
                required
                rules={visaOnly("Visa type")}
              />
              <DateField
                name="visaExpiry"
                label="Expiry Date"
                required
                rules={visaOnly("Visa expiry date")}
              />
            </div>
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <FormUpload
                name="visaFile"
                label="Upload visa document"
                accept={ACCEPT_DOCUMENT}
                required
                rules={visaOnly("Visa document")}
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
