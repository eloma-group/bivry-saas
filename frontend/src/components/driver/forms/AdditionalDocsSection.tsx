import { FilePlus2, Plus, Trash2 } from "lucide-react";
import { useFormContext, useFieldArray } from "react-hook-form";
import { AnimatePresence, motion } from "framer-motion";
import { SectionCard } from "./SectionCard";
import { DateField, SelectField } from "./Fields";
import { FormUpload } from "@/components/driver/upload/FormUpload";
import { ACCEPT_DOCUMENT, rules } from "@/utils/validation";
import { Button } from "@/components/ui/button";
import { ADDITIONAL_DOC_CATEGORIES } from "@/constants/options";
import type { DriverFormValues } from "@/types/driver";

export function AdditionalDocsSection() {
  const { control, getValues } = useFormContext<DriverFormValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "additionalDocs",
  });

  /**
   * This whole section is optional: a driver can hand the form in without a
   * single extra document. Once a row has a document type on it though, the
   * file and its expiry date are both needed - a document nobody can date is of
   * no use to the compliance team.
   */
  const rowRequired = (index: number, label: string) =>
    rules.requiredWhen(label, () =>
      Boolean(getValues(`additionalDocs.${index}.category`)),
    );

  return (
    <SectionCard
      index={9}
      icon={FilePlus2}
      title="Additional Documents"
      description="Optional. Passport, Medicare, insurance, tax file and any others."
    >
      <div className="space-y-4">
        <AnimatePresence initial={false}>
          {fields.map((field, i) => (
            <motion.div
              key={field.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-1 items-start gap-5 rounded-2xl border border-border/60 bg-secondary/30 p-5 sm:grid-cols-[minmax(0,13rem)_minmax(0,13rem)_1fr_auto]"
            >
              <SelectField
                name={`additionalDocs.${i}.category`}
                label="Document Type"
                options={ADDITIONAL_DOC_CATEGORIES}
                required
                rules={rules.required("Document type")}
              />
              <DateField
                name={`additionalDocs.${i}.expiry`}
                label="Expiry Date"
                required
                rules={rowRequired(i, "Expiry date")}
              />
              <div className="pt-0.5">
                <span className="mb-1.5 block text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
                  File<span className="ml-0.5 text-primary">*</span>
                </span>
                <FormUpload
                  name={`additionalDocs.${i}.file`}
                  label="Upload document"
                  accept={ACCEPT_DOCUMENT}
                  rules={rowRequired(i, "Document file")}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mt-6 text-muted-foreground hover:bg-red-50 hover:text-red-500"
                onClick={() => remove(i)}
                aria-label="Remove document"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </motion.div>
          ))}
        </AnimatePresence>

        {fields.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border bg-secondary/30 px-5 py-6 text-center text-sm text-muted-foreground">
            No additional documents added yet.
          </p>
        )}

        <Button
          type="button"
          variant="outline"
          onClick={() =>
            append({
              id: crypto.randomUUID(),
              category: "Passport",
              file: null,
              expiry: "",
            })
          }
        >
          <Plus className="h-4 w-4" /> Add More
        </Button>
      </div>
    </SectionCard>
  );
}
