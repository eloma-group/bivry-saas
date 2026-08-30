import { useFormContext, useWatch } from "react-hook-form";
import { motion } from "framer-motion";
import {
  Building2,
  FileCheck2,
  Loader2,
  ArrowRight,
  Save,
  ListChecks,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useDocumentUrl } from "@/hooks/useDocumentUrl";
import { customerDocuments } from "@/services/customerDocuments";
import { useDocumentSource } from "@/context/DocumentSourceContext";
import { submissionBlockers } from "@/services/customerOnboarding";
import { CONTACT_BLOCKS } from "@/constants/customerOptions";
import { prettyDate } from "@/utils/date";
import type { UploadedFile } from "@/types/driver";
import type { CustomerFormValues } from "@/types/customer";

interface CustomerSummaryCardProps {
  percent: number;
  submitting: boolean;
  /** "Submit Application" first time round, "Save Changes" when editing. */
  submitLabel?: string;
  savingDraft: boolean;
  /** Writes what is filled in so far, without insisting the form is complete. */
  onSaveDraft: () => void;
  /** True while the application still has to be handed in for the first time. */
  firstSubmission: boolean;
}

export function CustomerSummaryCard({
  percent,
  submitting,
  submitLabel = "Submit Application",
  savingDraft,
  onSaveDraft,
  firstSubmission,
}: CustomerSummaryCardProps) {
  const { control } = useFormContext<CustomerFormValues>();
  const v = useWatch({ control }) as CustomerFormValues;

  const logo = v?.companyLogo as UploadedFile | null;
  // A logo saved on an earlier visit has no local bytes to draw from.
  const storedLogoUrl = useDocumentUrl(
    logo?.dataUrl ? null : logo?.documentId,
    useDocumentSource(customerDocuments),
  );
  const logoUrl = logo ? logo.dataUrl || storedLogoUrl : null;
  const name = v?.companyName || "New Customer";

  const docs: { label: string; file: UploadedFile | null }[] = [
    { label: "Contract", file: v?.contractDocument ?? null },
    ...(v?.documents ?? []).map((row) => ({ label: row.label, file: row.file })),
  ];
  const uploaded = docs.filter((doc) => doc.file).length;

  /** Which departments have somebody to speak to. */
  const contacts = CONTACT_BLOCKS.map((block) => {
    const stored = v?.[block.key];
    const answered = Boolean(
      stored && (stored.sameAsOperations || (stored.contactPerson && stored.email)),
    );
    return { label: block.label, answered };
  });

  // What is still missing. Only the first submit is gated: an approved
  // application being edited saves without being handed in again.
  const blockers = v ? submissionBlockers(v) : [];
  const blocked = firstSubmission && blockers.length > 0;

  return (
    <aside className="lg:sticky lg:top-24">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-card"
      >
        {/* Header */}
        <div className="bg-brand-navy p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white/10 ring-1 ring-white/20">
              {logoUrl ? (
                <img src={logoUrl} alt={name} className="h-full w-full object-cover" />
              ) : (
                <Building2 className="h-6 w-6 text-white/70" />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold">{name}</p>
              <p className="text-sm text-white/60">
                {v?.cid ? v.cid : "Customer Onboarding"}
              </p>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="text-white/70">Completion</span>
              <span className="font-semibold">{percent}%</span>
            </div>
            <Progress value={percent} className="h-1.5 bg-white/15 [&>div]:bg-white" />
          </div>
        </div>

        <div className="space-y-5 p-6">
          {/* Uploaded documents */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <FileCheck2 className="h-4 w-4 text-primary" /> Documents
              </span>
              <span className="text-sm font-medium text-muted-foreground">
                {uploaded}/{docs.length}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {docs.map((doc, index) => (
                <span
                  key={`${doc.label}-${index}`}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[0.7rem] font-medium",
                    doc.file
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-secondary text-muted-foreground",
                  )}
                >
                  {doc.label || "Untitled"}
                </span>
              ))}
            </div>
          </div>

          <Separator />

          {/* Who we can reach, department by department. */}
          <div className="space-y-2.5">
            {contacts.map((contact) => (
              <div key={contact.label} className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground">{contact.label}</span>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold",
                    contact.answered
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-secondary text-muted-foreground",
                  )}
                >
                  {contact.answered ? "Given" : "Not given"}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">Creation date</span>
              <span className="text-sm font-medium text-foreground">
                {prettyDate(v?.creationDate)}
              </span>
            </div>
          </div>

          {/* Why the submit is still greyed out. Saying it here beats a button
              that simply refuses to work. */}
          {blocked && (
            <div className="rounded-2xl border border-border/70 bg-secondary/50 p-3.5">
              <p className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <ListChecks className="h-4 w-4 text-primary" />
                Still needed before you can submit
              </p>
              <ul className="mt-2 space-y-1">
                {blockers.slice(0, 6).map((item) => (
                  <li key={item} className="text-xs leading-relaxed text-muted-foreground">
                    - {item}
                  </li>
                ))}
                {blockers.length > 6 && (
                  <li className="text-xs font-medium text-muted-foreground">
                    and {blockers.length - 6} more
                  </li>
                )}
              </ul>
              <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
                You can still save and come back at any time.
              </p>
            </div>
          )}

          <div className="space-y-2.5">
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={submitting || savingDraft || blocked}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                </>
              ) : (
                <>
                  {submitLabel} <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>

            {/* A long form nobody has every document for yet has to be leavable. */}
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full"
              onClick={onSaveDraft}
              disabled={submitting || savingDraft}
            >
              {savingDraft ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" /> Save and finish later
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </aside>
  );
}
