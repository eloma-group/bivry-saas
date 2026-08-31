import { Users2, Plus, Trash2 } from "lucide-react";
import { useFormContext, useFieldArray } from "react-hook-form";
import { AnimatePresence, motion } from "framer-motion";
import { SectionCard } from "@/components/form/SectionCard";
import { TextField } from "@/components/form/Fields";
import { Button } from "@/components/ui/button";
import { NAME_MAX, PHONE_MAX, rules } from "@/utils/validation";
import type { CustomerFormValues } from "@/types/customer";

const GRID = "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3";

export function DirectorsSection() {
  const { control } = useFormContext<CustomerFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: "directors" });

  return (
    <SectionCard
      index={4}
      id="step-directors"
      icon={Users2}
      title="Director Information"
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
                <TextField
                  name={`directors.${index}.name`}
                  label="Director Name"
                  placeholder="Sanket Salve"
                  required
                  maxLength={NAME_MAX}
                  rules={rules.fullName("Director name")}
                  hint="Full name as per the document."
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
            append({
              id: crypto.randomUUID(),
              name: "",
              email: "",
              contactNumber: "",
            })
          }
        >
          <Plus className="h-4 w-4" /> Add More Director
        </Button>
      </div>
    </SectionCard>
  );
}
