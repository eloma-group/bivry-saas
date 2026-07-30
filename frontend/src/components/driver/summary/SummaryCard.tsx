import { useFormContext, useWatch } from "react-hook-form";
import { motion } from "framer-motion";
import {
  User,
  FileCheck2,
  AlertTriangle,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ExpiryBadge } from "@/components/driver/ExpiryBadge";
import { daysUntil, expiryLevel } from "@/utils/date";
import type { DriverFormValues, UploadedFile } from "@/types/driver";

interface SummaryCardProps {
  percent: number;
  submitting: boolean;
}

interface StatusRow {
  label: string;
  expiry?: string | null;
  staticValid?: boolean;
}

export function SummaryCard({ percent, submitting }: SummaryCardProps) {
  const { control } = useFormContext<DriverFormValues>();
  const v = useWatch({ control }) as DriverFormValues;

  const photo = v?.profilePhoto as UploadedFile | null;
  const name =
    [v?.firstName, v?.lastName].filter(Boolean).join(" ") || "New Driver";

  const docs: { label: string; file: UploadedFile | null }[] = [
    { label: "Licence Front", file: v?.licenceFront ?? null },
    { label: "Licence Back", file: v?.licenceBack ?? null },
    { label: "Driving History", file: v?.drivingHistoryFile ?? null },
    { label: "Police Check", file: v?.policeFile ?? null },
    { label: "Medical Certificate", file: v?.medicalFile ?? null },
    { label: "Drug Test", file: v?.drugTestFile ?? null },
  ];
  const uploaded = docs.filter((d) => d.file).length;

  const statuses: StatusRow[] = [
    { label: "Licence", expiry: v?.licenceExpiry },
    { label: "Medical", expiry: v?.medicalExpiry },
    { label: "Police Check", expiry: v?.policeExpiry },
    {
      label: "Visa",
      expiry: v?.nationality === "Australia" ? null : v?.visaExpiry,
      staticValid: v?.nationality === "Australia",
    },
  ];

  const alerts = statuses.filter((s) => {
    if (s.staticValid) return false;
    const lvl = expiryLevel(daysUntil(s.expiry));
    return lvl === "soon" || lvl === "expired";
  });

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
              {photo ? (
                <img
                  src={photo.dataUrl}
                  alt={name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-6 w-6 text-white/70" />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold">{name}</p>
              <p className="text-sm text-white/60">Driver Onboarding</p>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="text-white/70">Completion</span>
              <span className="font-semibold">{percent}%</span>
            </div>
            <Progress
              value={percent}
              className="h-1.5 bg-white/15 [&>div]:bg-white"
            />
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
              {docs.map((d) => (
                <span
                  key={d.label}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[0.7rem] font-medium",
                    d.file
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-secondary text-muted-foreground"
                  )}
                >
                  {d.label}
                </span>
              ))}
            </div>
          </div>

          <Separator />

          {/* Status rows */}
          <div className="space-y-2.5">
            {statuses.map((s) => (
              <div
                key={s.label}
                className="flex items-center justify-between gap-2"
              >
                <span className="text-sm text-muted-foreground">{s.label}</span>
                <ExpiryBadge expiry={s.expiry} staticValid={s.staticValid} />
              </div>
            ))}
          </div>

          {/* Expiry alerts */}
          {alerts.length > 0 && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-amber-100 bg-amber-50/70 p-3.5 text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-xs font-medium leading-relaxed">
                {alerts.length} document
                {alerts.length > 1 ? "s need" : " needs"} attention - expiring
                soon or expired.
              </p>
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
              </>
            ) : (
              <>
                Submit Driver <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </aside>
  );
}
