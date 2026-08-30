import { Contact } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";
import { AnimatePresence, motion } from "framer-motion";
import { SectionCard } from "@/components/form/SectionCard";
import { TextField, SelectField } from "@/components/form/Fields";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  CONTACT_BLOCKS,
  DESIGNATION_OTHER,
  DESIGNATIONS,
  PRIMARY_CONTACT,
} from "@/constants/customerOptions";
import { NAME_MAX, PHONE_MAX, rules } from "@/utils/validation";
import type { CustomerFormValues } from "@/types/customer";

const GRID = "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3";

/** The form key of one contact block. */
type ContactKey = (typeof CONTACT_BLOCKS)[number]["key"];

/**
 * One department's block: who to speak to and how to reach them.
 *
 * `asked` is what decides whether the fields have to be filled in. A block
 * ticked as a copy of the operations one leaves the screen but stays
 * registered, so a plain `required` there would block a submit over questions
 * nobody was asked. The check is read at validation time, never captured.
 */
function ContactBlockFields({ prefix, label }: { prefix: ContactKey; label: string }) {
  const { getValues, control } = useFormContext<CustomerFormValues>();
  const asked = () =>
    prefix === PRIMARY_CONTACT.key || !getValues(`${prefix}.sameAsOperations`);
  const designation = useWatch({ control, name: `${prefix}.designation` });
  const isOther = designation === DESIGNATION_OTHER;

  return (
    <div className={GRID}>
      <TextField
        name={`${prefix}.contactPerson`}
        label="Contact Person"
        placeholder="Sanket"
        required
        maxLength={NAME_MAX}
        rules={rules.onlyWhen(rules.name(`${label} contact person`), asked)}
      />
      <SelectField
        name={`${prefix}.designation`}
        label="Designation"
        options={DESIGNATIONS}
        required
        rules={rules.requiredWhen(`${label} designation`, asked)}
      />
      {isOther && (
        <TextField
          name={`${prefix}.designationOther`}
          label="Other Designation"
          placeholder="Type the designation"
          required
          maxLength={NAME_MAX}
          rules={rules.requiredWhen(`${label} designation`, () => asked() && isOther)}
        />
      )}
      <TextField
        name={`${prefix}.contactNumber`}
        label="Contact Number"
        type="tel"
        placeholder="0400000000"
        required
        maxLength={PHONE_MAX}
        rules={rules.onlyWhen(rules.phone, asked)}
      />
      <TextField
        name={`${prefix}.email`}
        label={`${label} Email`}
        type="email"
        placeholder="sanket.salve@gmail.com"
        required
        rules={rules.onlyWhen(rules.email, asked)}
        className="sm:col-span-2"
      />
    </div>
  );
}

/**
 * A block that can be a copy of the operations contact.
 *
 * Ticked, the fields fold away and the operations details are saved under this
 * department instead. Whatever was typed here stays in the form, so unticking
 * brings it back rather than making somebody type it twice.
 */
function CopyableContactBlock({ prefix, label }: { prefix: ContactKey; label: string }) {
  const { control, setValue } = useFormContext<CustomerFormValues>();
  const sameAsOperations = useWatch({ control, name: `${prefix}.sameAsOperations` });
  const checkboxId = `${prefix}-same-as-operations`;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-foreground">{label}</p>

        <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-secondary/40 px-3 py-2">
          <Checkbox
            id={checkboxId}
            checked={sameAsOperations}
            onCheckedChange={(checked) =>
              setValue(`${prefix}.sameAsOperations`, Boolean(checked), { shouldDirty: true })
            }
          />
          <label
            htmlFor={checkboxId}
            className="cursor-pointer text-sm font-medium text-foreground"
          >
            Same as {PRIMARY_CONTACT.label}
          </label>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {!sameAsOperations && (
          <motion.div
            key={prefix}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <ContactBlockFields prefix={prefix} label={label} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function CommunicationSection() {
  return (
    <SectionCard
      index={3}
      id="step-communication"
      icon={Contact}
      title="Communication"
      description="Who we speak to in each part of your business. Only the operations contact is asked for; tick the rest as a copy of it where the same person handles them."
    >
      <div className="space-y-6">
        <div>
          <p className="mb-3 text-sm font-semibold text-foreground">{PRIMARY_CONTACT.label}</p>
          <ContactBlockFields prefix={PRIMARY_CONTACT.key} label={PRIMARY_CONTACT.label} />
        </div>

        {CONTACT_BLOCKS.slice(1).map((block) => (
          <div key={block.key}>
            <Separator className="mb-6" />
            <CopyableContactBlock prefix={block.key} label={block.label} />
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
