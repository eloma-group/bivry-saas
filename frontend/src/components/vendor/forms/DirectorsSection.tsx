import { Users2, Plus, Trash2 } from "lucide-react";
import { useFormContext, useFieldArray } from "react-hook-form";
import { AnimatePresence, motion } from "framer-motion";
import { SectionCard } from "@/components/form/SectionCard";
import { TextField, SelectField } from "@/components/form/Fields";
import { Button } from "@/components/ui/button";
import { DESIGNATIONS } from "@/constants/vendorOptions";
import { PHONE_MAX, rules } from "@/utils/validation";
import type { VendorFormValues } from "@/types/vendor";

const GRID = "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3";

export function DirectorsSection() {
  const { control } = useFormContext<VendorFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: "directors" });

  return (
    <SectionCard
      index={5}
      id="step-company"
      icon={Users2}
      title="Company C-Suite Details"
      description="Every director we may need to contact about this account."
    >
      <div className="space-y-4">
        <AnimatePresence initial={false}>
          {fields.map((field, index) => (
            <motion.div
              key={field.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.25 }}
              className="rounded-2xl border border-border/60 bg-secondary/30 p-5"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-foreground">
                  Director {index + 1}
                </span>
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

              <div className={GRID}>
                <SelectField
                  name={`directors.${index}.designation`}
                  label="Designation"
                  options={DESIGNATIONS}
                  required
                  rules={rules.required("Designation")}
                />
                <TextField
                  name={`directors.${index}.email`}
                  label="Director Email Address"
                  type="email"
                  placeholder="sanket.salve@gmail.com"
                  required
                  rules={rules.email}
                />
                <TextField
                  name={`directors.${index}.contactNumber`}
                  label="Director Contact Number"
                  type="tel"
                  placeholder="0400000000"
                  required
                  maxLength={PHONE_MAX}
                  rules={rules.phone}
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {fields.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border bg-secondary/30 px-5 py-6 text-center text-sm text-muted-foreground">
            No directors added yet. Add at least one.
          </p>
        )}

        <Button
          type="button"
          variant="outline"
          onClick={() =>
            append({ id: crypto.randomUUID(), designation: "", email: "", contactNumber: "" })
          }
        >
          <Plus className="h-4 w-4" /> Add More Director
        </Button>
      </div>
    </SectionCard>
  );
}
