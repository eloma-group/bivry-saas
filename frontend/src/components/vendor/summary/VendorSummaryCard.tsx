import { useFormContext, useWatch } from "react-hook-form";
import { motion } from "framer-motion";
import {
  Building2,
  FileCheck2,
  AlertTriangle,
  Loader2,
  ArrowRight,
  Save,
  ListChecks,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ExpiryBadge } from "@/components/driver/ExpiryBadge";
import { useDocumentUrl } from "@/hooks/useDocumentUrl";
import { vendorDocuments } from "@/services/vendorDocuments";
import { useDocumentSource } from "@/context/DocumentSourceContext";
import { submissionBlockers } from "@/services/vendorOnboarding";
import { INSURANCE_POLICIES } from "@/constants/vendorOptions";
import { daysUntil, expiryLevel } from "@/utils/date";
import type { UploadedFile } from "@/types/driver";
import type { VendorFormValues } from "@/types/vendor";

interface VendorSummaryCardProps {
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

interface StatusRow {
  label: string;
  expiry?: string | null;
}

export function VendorSummaryCard({
  percent,
  submitting,
  submitLabel = "Submit Application",
  savingDraft,
  onSaveDraft,
  firstSubmission,
}: VendorSummaryCardProps) {
  const { control } = useFormContext<VendorFormValues>();
  const v = useWatch({ control }) as VendorFormValues;

  const logo = v?.companyLogo as UploadedFile | null;
  // A logo saved on an earlier visit has no local bytes to draw from.
  const storedLogoUrl = useDocumentUrl(
    logo?.dataUrl ? null : logo?.documentId,
    useDocumentSource(vendorDocuments),
  );
  const logoUrl = logo ? logo.dataUrl || storedLogoUrl : null;
  const name = v?.companyName || "New Vendor";

  const docs: { label: string; file: UploadedFile | null }[] = [
    { label: "Accreditation", file: v?.accreditationFile ?? null },
    ...INSURANCE_POLICIES.map((policy) => ({
      label: policy.label,
      file: v?.insurances?.[policy.key]?.file ?? null,
    })),
    ...(v?.complianceDocs ?? []).map((row) => ({ label: row.label, file: row.file })),
  ];
  const uploaded = docs.filter((doc) => doc.file).length;

  const statuses: StatusRow[] = [
    { label: "NHVAS", expiry: v?.nhvasExpiry },
    { label: "Mass Management", expiry: v?.massManagementExpiry },
    { label: "Basic Fatigue", expiry: v?.basicFatigueExpiry },
    { label: "Dangerous Goods", expiry: v?.dangerousGoodsExpiry },
    { label: "HACCP", expiry: v?.haccpExpiry },
    { label: "Product Liability", expiry: v?.insurances?.productLiability?.expiry },
    { label: "Public Liability", expiry: v?.insurances?.publicLiability?.expiry },
    { label: "Work Cover", expiry: v?.insurances?.workCover?.validTill },
  ];

  const alerts = statuses.filter((status) => {
    const level = expiryLevel(daysUntil(status.expiry));
    return level === "soon" || level === "expired";
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
                {v?.vendorCode ? v.vendorCode : "Vendor Onboarding"}
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
                  {doc.label}
                </span>
              ))}
            </div>
          </div>

          <Separator />

          {/* Status rows */}
          <div className="space-y-2.5">
            {statuses.map((status) => (
              <div key={status.label} className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground">{status.label}</span>
                <ExpiryBadge expiry={status.expiry} />
              </div>
            ))}
          </div>

          {/* Expiry alerts */}
          {alerts.length > 0 && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-amber-100 bg-amber-50/70 p-3.5 text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-xs font-medium leading-relaxed">
                {alerts.length} item
                {alerts.length > 1 ? "s need" : " needs"} attention - expiring soon or
                expired.
              </p>
            </div>
          )}

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
