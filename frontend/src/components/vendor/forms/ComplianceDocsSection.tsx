import { FileCheck2, Plus, Trash2 } from "lucide-react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { AnimatePresence, motion } from "framer-motion";
import { SectionCard } from "@/components/form/SectionCard";
import { TextField } from "@/components/form/Fields";
import { FormUpload } from "@/components/upload/FormUpload";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  COMPLIANCE_DOCUMENT_TYPES,
  policyDisplayName,
} from "@/constants/vendorOptions";
import { ACCEPT_DOCUMENT } from "@/utils/validation";
import { australianDate, todayAustralian } from "@/utils/date";
import type { UploadedFile } from "@/types/driver";
import type { VendorFormValues } from "@/types/vendor";

/** How many rows at the top are the listed policies rather than added ones. */
const LISTED_COUNT = COMPLIANCE_DOCUMENT_TYPES.length;

const COLUMNS =
  "lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_minmax(0,10rem)_2.5rem]";

const ROW_GRID = `grid grid-cols-1 items-start gap-4 rounded-2xl border border-border/60 bg-secondary/30 p-5 sm:grid-cols-2 ${COLUMNS} lg:items-center lg:py-4`;

/**
 * The policies a vendor holds.
 *
 * Every policy is listed on its own row rather than picked from a dropdown, so
 * a vendor attaches each one where they have it. Nothing here is required. The
 * "Add Document" button adds an extra named row for a policy not in the list,
 * and only those added rows can be renamed or taken off again.
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
      description="Attach the policies that apply to your business. All optional - add what you have."
    >
      <div className="space-y-3">
        {/* Column headings, wide screens only: each cell is labelled below. */}
        <div className={`hidden gap-4 px-5 lg:grid ${COLUMNS}`}>
          {["Policy", "Attach File", "Upload Date", ""].map((heading) => (
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
            const listed = index < LISTED_COUNT;
            const label = rowValues?.[index]?.label ?? "";
            // The upload date is the day the file was stored: a saved file
            // carries that day, a file just picked is dated today.
            const file = rowValues?.[index]?.file as UploadedFile | null | undefined;
            const uploadDate = file
              ? file.uploadedAt
                ? australianDate(file.uploadedAt)
                : todayAustralian()
              : "";

            return (
              <motion.div
                key={field.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.25 }}
                className={ROW_GRID}
              >
                {listed ? (
                  <div className="min-w-0">
                    <span className="block text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground lg:hidden">
                      Policy
                    </span>
                    <p className="text-sm font-medium text-foreground">
                      {policyDisplayName(label)}
                    </p>
                  </div>
                ) : (
                  <TextField
                    name={`complianceDocs.${index}.label`}
                    label="Policy Name"
                    placeholder="Name this policy"
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
                  />
                </div>

                <div className="min-w-0">
                  <span className="mb-1.5 block text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground lg:hidden">
                    Upload Date
                  </span>
                  <Input
                    value={uploadDate}
                    readOnly
                    aria-readonly
                    placeholder="DD/MM/YYYY"
                    className="cursor-not-allowed bg-secondary/70 text-muted-foreground"
                  />
                </div>

                {/* Only the added rows can be removed; the listed policies stay. */}
                <div className="flex justify-end lg:justify-center">
                  {listed ? null : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                      aria-label={`Remove ${label || "policy"}`}
                      className="text-muted-foreground hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
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
              label: "",
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
