import { FileCheck2, FileSignature, Plus, Trash2 } from "lucide-react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { AnimatePresence, motion } from "framer-motion";
import { SectionCard } from "@/components/form/SectionCard";
import { TextField } from "@/components/form/Fields";
import { FormUpload } from "@/components/upload/FormUpload";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CUSTOMER_DOCUMENT_TYPES } from "@/constants/customerOptions";
import { ACCEPT_DOCUMENT } from "@/utils/validation";
import { australianDate, todayAustralian } from "@/utils/date";
import type { UploadedFile } from "@/types/driver";
import type { CustomerFormValues } from "@/types/customer";

/** How many rows at the top are the listed documents rather than added ones. */
const LISTED_COUNT = CUSTOMER_DOCUMENT_TYPES.length;

const COLUMNS = "lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_minmax(0,10rem)_2.5rem]";

const ROW_GRID = `grid grid-cols-1 items-start gap-4 rounded-2xl border border-border/60 bg-secondary/30 p-5 sm:grid-cols-2 ${COLUMNS} lg:items-center lg:py-4`;

/**
 * The contract slot: the upload, and beside it the day it was stored.
 *
 * Two cells rather than the four a document row has, so it states its own
 * columns instead of overriding the row grid's - two `grid-cols` classes on one
 * element are settled by the stylesheet's order, not by the class list's.
 */
const CONTRACT_GRID =
  "grid grid-cols-1 items-start gap-4 rounded-2xl border border-border/60 bg-secondary/30 p-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,10rem)] sm:items-center";

/**
 * The day a file was stored: a saved file carries that day, a file just picked
 * is dated today, and an empty slot has no date at all.
 */
function uploadDateOf(file: UploadedFile | null | undefined): string {
  if (!file) return "";
  return file.uploadedAt ? australianDate(file.uploadedAt) : todayAustralian();
}

/**
 * The documents a customer holds.
 *
 * The contract has a slot of its own at the top. Everything else is added with
 * the "Add Document" button and named there, so a customer attaches whatever
 * they hold rather than working down a list of documents that may not apply.
 * Nothing here is required.
 *
 * Naming a document in CUSTOMER_DOCUMENT_TYPES lists a row for it again. Those
 * listed rows cannot be renamed or taken off; the added ones can.
 *
 * Every upload takes a file from disk, a drop, or the live camera, and offers a
 * crop before it is kept - the same three ways a driver attaches a document. A
 * PDF skips the crop; there is nothing to crop on one.
 *
 * The layout is one row per document on a wide screen and a stacked card on a
 * narrow one - every cell carries its own label, so it reads either way.
 */
export function DocumentsSection() {
  const { control } = useFormContext<CustomerFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: "documents" });
  const rowValues = useWatch({ control, name: "documents" });
  const contract = useWatch({ control, name: "contractDocument" });

  return (
    <SectionCard
      index={6}
      id="step-documents"
      icon={FileCheck2}
      title="Documents"
      description="Attach the paperwork that applies to this account. All optional - add what you have."
    >
      <div className="mb-6">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <FileSignature className="h-4 w-4 text-muted-foreground" aria-hidden />
          Contract Document
        </div>

        {/* The upload sits beside the day it was stored, so the contract reads
            the same way the rows below it do. */}
        <div className={CONTRACT_GRID}>
          <div className="min-w-0">
            <FormUpload
              name="contractDocument"
              label="Upload Contractual Document"
              accept={ACCEPT_DOCUMENT}
              allowCamera
              allowCrop
              cameraTitle="Photograph the contract"
              cropTitle="Contract document"
            />
          </div>

          <div className="min-w-0">
            <span className="mb-1.5 block text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
              Upload Date
            </span>
            <Input
              value={uploadDateOf(contract)}
              readOnly
              aria-readonly
              aria-label="Contract document upload date"
              placeholder="DD/MM/YYYY"
              className="cursor-not-allowed bg-secondary/70 text-muted-foreground"
            />
          </div>
        </div>
      </div>

      <Separator className="mb-6" />

      <div className="space-y-3">
        {/* Column headings, wide screens only, and only once there is a row
            under them: each cell is labelled below as well. */}
        <div
          className={`hidden gap-4 px-5 ${COLUMNS} ${fields.length > 0 ? "lg:grid" : ""}`}
        >
          {["Document", "Attach File", "Upload Date", ""].map((heading) => (
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
            const uploadDate = uploadDateOf(
              rowValues?.[index]?.file as UploadedFile | null | undefined,
            );

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
                      Document
                    </span>
                    <p className="text-sm font-medium text-foreground">{label}</p>
                  </div>
                ) : (
                  <TextField
                    name={`documents.${index}.label`}
                    label="Document Name"
                    placeholder="Name this document"
                    className="lg:[&>label]:sr-only"
                  />
                )}

                <div className="min-w-0">
                  <span className="mb-1.5 block text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground lg:hidden">
                    Attach File
                  </span>
                  <FormUpload
                    name={`documents.${index}.file`}
                    label="Upload"
                    accept={ACCEPT_DOCUMENT}
                    allowCamera
                    allowCrop
                    cameraTitle={`Photograph ${label || "this document"}`}
                    cropTitle={label || "Document"}
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

                {/* Only the added rows can be removed; the listed ones stay. */}
                <div className="flex justify-end lg:justify-center">
                  {listed ? null : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                      aria-label={`Remove ${label || "document"}`}
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
              docType: "ADDITIONAL",
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
