import { FileCheck2, Plus, Trash2 } from "lucide-react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { AnimatePresence, motion } from "framer-motion";
import { SectionCard } from "@/components/form/SectionCard";
import { DateField, SelectField } from "@/components/form/Fields";
import { FormUpload } from "@/components/upload/FormUpload";
import { Button } from "@/components/ui/button";
import { ADDITIONAL_COMPLIANCE_CATEGORIES } from "@/constants/vendorOptions";
import { ACCEPT_DOCUMENT, rules } from "@/utils/validation";
import type { VendorFormValues } from "@/types/vendor";

/**
 * The compliance pack.
 *
 * The eight rows the fleet always asks for come pre-listed and cannot be
 * removed; a vendor adds their own rows underneath. Each row carries the date
 * the document was issued.
 *
 * The layout is one row per document on a wide screen and a stacked card on a
 * narrow one - every cell carries its own label, so it reads either way.
 */
export function ComplianceDocsSection() {
  const { control, getValues } = useFormContext<VendorFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: "complianceDocs" });
  const rowValues = useWatch({ control, name: "complianceDocs" });

  /** A fixed row always needs its file; an extra row only once it has one. */
  const fileRule = (index: number, label: string) =>
    rules.requiredWhen(`${label} document`, () =>
      Boolean(getValues(`complianceDocs.${index}.fixed`)),
    );

  /** Dates are asked for as soon as there is a document to date. */
  const dateRule = (index: number, label: string) =>
    rules.requiredWhen(label, () => Boolean(getValues(`complianceDocs.${index}.file`)));

  return (
    <SectionCard
      index={9}
      id="step-documents"
      icon={FileCheck2}
      title="Compliance Documents"
      description="All eight policies below are required before you can submit. Add your own underneath."
    >
      <div className="space-y-3">
        {/* Column headings, wide screens only: each cell is labelled below. */}
        <div className="hidden gap-4 px-5 lg:grid lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_minmax(0,11rem)_2.5rem]">
          {["Document Type", "Attach File", "Issue Date", ""].map((heading) => (
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
            const row = rowValues?.[index];
            const fixed = row?.fixed ?? true;
            const label = row?.label ?? "";

            return (
              <motion.div
                key={field.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.25 }}
                className="grid grid-cols-1 items-start gap-4 rounded-2xl border border-border/60 bg-secondary/30 p-5 sm:grid-cols-2 lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_minmax(0,11rem)_2.5rem] lg:items-center lg:py-4"
              >
                {fixed ? (
                  <div className="min-w-0">
                    <span className="mb-1.5 block text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground lg:hidden">
                      Document Type
                    </span>
                    <p className="text-sm font-medium text-foreground">
                      {label}
                      <span className="ml-0.5 text-primary">*</span>
                    </p>
                  </div>
                ) : (
                  <SelectField
                    name={`complianceDocs.${index}.label`}
                    label="Document Type"
                    options={ADDITIONAL_COMPLIANCE_CATEGORIES}
                    className="lg:[&>label]:sr-only"
                  />
                )}

                <div className="min-w-0">
                  <span className="mb-1.5 block text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground lg:hidden">
                    Attach File
                  </span>
                  <FormUpload
                    name={`complianceDocs.${index}.file`}
                    label="Upload"
                    accept={ACCEPT_DOCUMENT}
                    compact
                    rules={fileRule(index, label || "This")}
                  />
                </div>

                <DateField
                  name={`complianceDocs.${index}.issue`}
                  label="Issue Date"
                  compact
                  rules={dateRule(index, "Issue date")}
                  className="min-w-0 lg:[&>label]:sr-only"
                />

                <div className="flex justify-end lg:justify-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={fixed}
                    onClick={() => remove(index)}
                    aria-label={fixed ? `${label} is required` : `Remove ${label}`}
                    className="text-muted-foreground hover:bg-red-50 hover:text-red-500 disabled:opacity-30"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        <Button
          type="button"
          variant="outline"
          onClick={() =>
            append({
              id: crypto.randomUUID(),
              docType: "COMPLIANCE_ADDITIONAL",
              label: "Chain of Responsibility",
              fixed: false,
              file: null,
              issue: "",
            })
          }
        >
          <Plus className="h-4 w-4" /> Add Document
        </Button>
      </div>
    </SectionCard>
  );
}
