import { FilePlus2, Plus, Trash2 } from "lucide-react";
import { useFormContext, useFieldArray } from "react-hook-form";
import { AnimatePresence, motion } from "framer-motion";
import { SectionCard } from "./SectionCard";
import { SelectField } from "./Fields";
import { FormUpload } from "@/components/driver/upload/FormUpload";
import { Button } from "@/components/ui/button";
import { ADDITIONAL_DOC_CATEGORIES } from "@/constants/options";
import type { DriverFormValues } from "@/types/driver";

export function AdditionalDocsSection() {
  const { control } = useFormContext<DriverFormValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "additionalDocs",
  });

  return (
    <SectionCard
      index={9}
      icon={FilePlus2}
      title="Additional Documents"
      description="Passport, Medicare, insurance, tax file and any others."
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
              className="grid grid-cols-1 items-start gap-5 rounded-2xl border border-border/60 bg-secondary/30 p-5 sm:grid-cols-[minmax(0,15rem)_1fr_auto]"
            >
              <SelectField
                name={`additionalDocs.${i}.category`}
                label="Document Type"
                options={ADDITIONAL_DOC_CATEGORIES}
              />
              <div className="pt-0.5">
                <span className="mb-1.5 block text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
                  File
                </span>
                <FormUpload
                  name={`additionalDocs.${i}.file`}
                  label="Upload document"
                  accept="image/*,application/pdf"
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
            append({ id: crypto.randomUUID(), category: "Passport", file: null })
          }
        >
          <Plus className="h-4 w-4" /> Add More
        </Button>
      </div>
    </SectionCard>
  );
}
