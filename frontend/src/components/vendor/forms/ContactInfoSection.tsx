import { Contact } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";
import { AnimatePresence, motion } from "framer-motion";
import { SectionCard } from "@/components/form/SectionCard";
import { TextField, SelectField, MultiSelectField } from "@/components/form/Fields";
import { Separator } from "@/components/ui/separator";
import {
  CONTACT_BLOCKS,
  DESIGNATIONS,
  INVOICE_EMAIL_TARGETS,
  INVOICE_PREFERENCES,
} from "@/constants/vendorOptions";
import { NAME_MAX, PHONE_MAX, rules } from "@/utils/validation";
import type { VendorFormValues } from "@/types/vendor";

const GRID = "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3";

/** One department's block: who to speak to and how to reach them. */
function ContactBlockFields({ prefix, label }: { prefix: string; label: string }) {
  return (
    <div>
      <p className="mb-3 text-sm font-semibold text-foreground">{label}</p>
      <div className={GRID}>
        <TextField
          name={`${prefix}.contactPerson`}
          label="Contact Person"
          placeholder="Sanket"
          required
          maxLength={NAME_MAX}
          rules={rules.name(`${label} contact person`)}
        />
        <SelectField
          name={`${prefix}.designation`}
          label="Designation"
          options={DESIGNATIONS}
          required
          rules={rules.required(`${label} designation`)}
        />
        <TextField
          name={`${prefix}.contactNumber`}
          label="Contact Number"
          type="tel"
          placeholder="0400000000"
          required
          maxLength={PHONE_MAX}
          rules={rules.phone}
        />
        <TextField
          name={`${prefix}.email`}
          label={`${label} Email`}
          type="email"
          placeholder="sanket.salve@gmail.com"
          required
          rules={rules.email}
          className="sm:col-span-2"
        />
      </div>
    </div>
  );
}

export function ContactInfoSection() {
  const { control, getValues } = useFormContext<VendorFormValues>();
  const invoiceEmails = useWatch({ control, name: "invoiceEmails" });

  // "Other" is only worth asking about once it has actually been picked. The
  // field stays registered after it leaves the screen, so the rule reads the
  // answer at validation time rather than capturing it here.
  const wantsOther = Array.isArray(invoiceEmails) && invoiceEmails.includes("Other");
  const otherAsked = () => (getValues("invoiceEmails") ?? []).includes("Other");

  return (
    <SectionCard
      index={2}
      id="step-contacts"
      icon={Contact}
      title="Contact Information"
      description="Who we speak to in each part of your business, and where invoices go."
    >
      <div className="space-y-6">
        {CONTACT_BLOCKS.map((block, index) => (
          <div key={block.key}>
            {index > 0 && <Separator className="mb-6" />}
            <ContactBlockFields prefix={block.key} label={block.label} />
          </div>
        ))}
      </div>

      <Separator className="my-6" />

      <p className="mb-3 text-sm font-semibold text-foreground">Invoice Preferences</p>
      <div className={GRID}>
        <SelectField
          name="invoicePreference"
          label="Invoice Preferences"
          options={INVOICE_PREFERENCES}
          required
          rules={rules.required("Invoice preference")}
        />
        <MultiSelectField
          name="invoiceEmails"
          label="Invoice Communication Preferences"
          options={INVOICE_EMAIL_TARGETS}
          placeholder="Select email"
          required
          rules={rules.requiredList("Invoice communication preference")}
          className="sm:col-span-2"
        />
      </div>

      <AnimatePresence initial={false}>
        {wantsOther && (
          <motion.div
            key="other"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="pt-5">
              <TextField
                name="invoiceOther"
                label="Other"
                placeholder="Enter details"
                required
                rules={rules.requiredWhen("Other details", otherAsked)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </SectionCard>
  );
}
