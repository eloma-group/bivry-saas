import { Contact, Plus, Trash2 } from "lucide-react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { AnimatePresence, motion } from "framer-motion";
import { SectionCard } from "@/components/form/SectionCard";
import { TextField, SelectField } from "@/components/form/Fields";
import { Button } from "@/components/ui/button";
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

/** The form key of one of the four fixed contact blocks. */
type ContactKey = (typeof CONTACT_BLOCKS)[number]["key"];

/**
 * Where one contact block lives in the form.
 *
 * A department sits at a name of its own; a block the customer added sits at an
 * index in its list. Both ask for the same four things, so the fields below
 * take the path rather than the block.
 */
type ContactPath = ContactKey | `additionalContacts.${number}`;

/**
 * One block: who to speak to and how to reach them.
 *
 * `asked` is what decides whether the fields have to be filled in. A block
 * ticked as a copy of the operations one leaves the screen but stays
 * registered, so a plain `required` there would block a submit over questions
 * nobody was asked. The check is read at validation time, never captured.
 */
function ContactBlockFields({
  path,
  label,
  asked,
}: {
  path: ContactPath;
  label: string;
  /**
   * Whether this block is on screen and therefore being asked for. It also
   * decides the asterisk: a block nothing insists on says so rather than
   * marking every field required and then accepting them empty.
   */
  asked: () => boolean;
}) {
  const { control } = useFormContext<CustomerFormValues>();
  const designation = useWatch({ control, name: `${path}.designation` });
  const isOther = designation === DESIGNATION_OTHER;
  // Read once for the marks. The rules read it again at validation time, which
  // is what lets a block folded away by a tick stop insisting mid-form.
  const required = asked();

  return (
    <div className={GRID}>
      <TextField
        name={`${path}.contactPerson`}
        label="Contact Person"
        placeholder="Sanket"
        required={required}
        maxLength={NAME_MAX}
        rules={rules.onlyWhen(rules.name(`${label} contact person`), asked)}
      />
      <SelectField
        name={`${path}.designation`}
        label="Designation"
        options={DESIGNATIONS}
        required={required}
        rules={rules.requiredWhen(`${label} designation`, asked)}
      />
      {isOther && (
        <TextField
          name={`${path}.designationOther`}
          label="Other Designation"
          placeholder="Type the designation"
          required={required}
          maxLength={NAME_MAX}
          rules={rules.requiredWhen(`${label} designation`, () => asked() && isOther)}
        />
      )}
      <TextField
        name={`${path}.contactNumber`}
        label="Contact Number"
        type="tel"
        placeholder="0400000000"
        required={required}
        maxLength={PHONE_MAX}
        rules={rules.onlyWhen(rules.phone, asked)}
      />
      <TextField
        name={`${path}.email`}
        label={`${label} Email`}
        type="email"
        placeholder="sanket.salve@gmail.com"
        required={required}
        rules={rules.onlyWhen(rules.email, asked)}
        className="sm:col-span-2"
      />
    </div>
  );
}

/** One of the four departments, which knows how to ask whether it is on show. */
function DepartmentFields({ prefix, label }: { prefix: ContactKey; label: string }) {
  const { getValues } = useFormContext<CustomerFormValues>();
  const asked = () =>
    prefix === PRIMARY_CONTACT.key || !getValues(`${prefix}.sameAsOperations`);

  return <ContactBlockFields path={prefix} label={label} asked={asked} />;
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
            <DepartmentFields prefix={prefix} label={label} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * The blocks the customer adds themselves, beyond the four departments.
 *
 * Same four questions as a department, with the department name typed in rather
 * than fixed, so anything the four do not cover - legal, after hours, a second
 * accounts desk - is asked for in exactly the same shape. Nothing here is
 * required: these are extra by definition, and an empty row is dropped on save
 * rather than stored.
 */
function AdditionalContacts() {
  const { control } = useFormContext<CustomerFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: "additionalContacts" });
  const labels = useWatch({ control, name: "additionalContacts" });

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-foreground">Other Contacts</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          Anyone else we should speak to. Name what the contact is for, then fill it in the
          same way as the blocks above.
        </p>
      </div>

      <AnimatePresence initial={false}>
        {fields.map((field, index) => {
          const label = labels?.[index]?.label?.trim() || `Contact ${index + 1}`;

          return (
            <motion.div
              key={field.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.25 }}
              className="rounded-2xl border border-border/60 bg-secondary/30 p-5"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-foreground">{label}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:bg-red-50 hover:text-red-500"
                  onClick={() => remove(index)}
                >
                  <Trash2 className="h-4 w-4" /> Remove
                </Button>
              </div>

              <div className={`${GRID} mb-5`}>
                <TextField
                  name={`additionalContacts.${index}.label`}
                  label="Contact For"
                  placeholder="Legal"
                  maxLength={100}
                  hint="What this contact covers, the way Operations or Accounts does."
                />
              </div>

              <ContactBlockFields
                path={`additionalContacts.${index}`}
                label={label}
                asked={() => false}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>

      {fields.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border bg-secondary/30 px-5 py-6 text-center text-sm text-muted-foreground">
          No other contacts added yet.
        </p>
      )}

      <Button
        type="button"
        variant="outline"
        onClick={() =>
          append({
            id: crypto.randomUUID(),
            label: "",
            contactPerson: "",
            designation: "",
            designationOther: "",
            contactNumber: "",
            email: "",
          })
        }
      >
        <Plus className="h-4 w-4" /> Add More Contacts
      </Button>
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
      description="Who we speak to in each part of your business. Only the operations contact is asked for; tick the rest as a copy of it where the same person handles them, and add any other contact we should hold."
    >
      <div className="space-y-6">
        <div>
          <p className="mb-3 text-sm font-semibold text-foreground">{PRIMARY_CONTACT.label}</p>
          <DepartmentFields prefix={PRIMARY_CONTACT.key} label={PRIMARY_CONTACT.label} />
        </div>

        {CONTACT_BLOCKS.slice(1).map((block) => (
          <div key={block.key}>
            <Separator className="mb-6" />
            <CopyableContactBlock prefix={block.key} label={block.label} />
          </div>
        ))}

        <Separator />
        <AdditionalContacts />
      </div>
    </SectionCard>
  );
}
