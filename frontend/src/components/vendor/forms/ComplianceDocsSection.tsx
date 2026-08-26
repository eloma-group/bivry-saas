import { FileCheck2, Plus, Trash2 } from "lucide-react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { AnimatePresence, motion } from "framer-motion";
import { SectionCard } from "@/components/form/SectionCard";
import { SelectField } from "@/components/form/Fields";
import { FormUpload } from "@/components/upload/FormUpload";
import { Button } from "@/components/ui/button";
import { COMPLIANCE_DOCUMENT_TYPES } from "@/constants/vendorOptions";
import { ACCEPT_DOCUMENT, rules } from "@/utils/validation";
import type { VendorFormValues } from "@/types/vendor";

/**
 * The policies a vendor holds.
 *
 * Nothing is pre-listed: a vendor adds the policies that apply to them and
 * names each one from the offered list. A row only exists because somebody
 * added it, so every row needs its file and every row can be taken off again.
 *
 * The layout is one row per document on a wide screen and a stacked card on a
 * narrow one - every cell carries its own label, so it reads either way.
 */
export function ComplianceDocsSection() {
  const { control } = useFormContext<VendorFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: "complianceDocs" });
  const rowValues = useWatch({ control, name: "complianceDocs" });

  return (
    <SectionCard
      index={9}
      id="step-documents"
      icon={FileCheck2}
      title="Policies"
      description="Add the policies that apply to your business, naming each one from the list."
    >
      <div className="space-y-3">
        {/* Column headings, wide screens only: each cell is labelled below. */}
        <div className="hidden gap-4 px-5 lg:grid lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_2.5rem]">
          {["Policy", "Attach File", ""].map((heading) => (
            <span
              key={heading || "actions"}
              className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground"
            >
              {heading}
            </span>
          ))}
        </div>

        <AnimatePresence initial={false}>
          {fields.map((field, index) => {
            const label = rowValues?.[index]?.label ?? "";

            return (
              <motion.div
                key={field.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.25 }}
                className="grid grid-cols-1 items-start gap-4 rounded-2xl border border-border/60 bg-secondary/30 p-5 sm:grid-cols-2 lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_2.5rem] lg:items-center lg:py-4"
              >
                <SelectField
                  name={`complianceDocs.${index}.label`}
                  label="Policy"
                  options={COMPLIANCE_DOCUMENT_TYPES}
                  required
                  rules={rules.required("Policy")}
                  className="lg:[&>label]:sr-only"
                />

                <div className="min-w-0">
                  <span className="mb-1.5 block text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground lg:hidden">
                    Attach File
                  </span>
                  <FormUpload
                    name={`complianceDocs.${index}.file`}
                    label="Upload"
                    accept={ACCEPT_DOCUMENT}
                    compact
                    rules={rules.requiredFile(`${label || "This"} document`)}
                  />
                </div>

                <div className="flex justify-end lg:justify-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                    aria-label={`Remove ${label}`}
                    className="text-muted-foreground hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {fields.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border bg-secondary/30 px-5 py-6 text-center text-sm text-muted-foreground">
            No policies added yet. Add the ones that apply to you.
          </p>
        )}

        <Button
          type="button"
          variant="outline"
          onClick={() =>
            append({
              id: crypto.randomUUID(),
              docType: "COMPLIANCE_ADDITIONAL",
              label: COMPLIANCE_DOCUMENT_TYPES[0],
              file: null,
            })
          }
        >
          <Plus className="h-4 w-4" /> Add Document
        </Button>
      </div>
    </SectionCard>
  );
}
