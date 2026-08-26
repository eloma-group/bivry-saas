import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Bell, CheckCircle2, Loader2, RotateCcw, XCircle } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/hooks/useNotifications";
import { prettyDate } from "@/utils/date";
import { cn } from "@/lib/utils";
import type { ExpiryNotification, NotificationSection } from "@/services/notificationService";
import type { RoleSlug } from "@/types/auth";

/**
 * Sections of the onboarding forms that carry an anchor, so an account can be
 * sent straight to the part that needs attention.
 */
const SECTION_ANCHOR: Partial<Record<NotificationSection, string>> = {
  LICENCE: "step-licence",
  DRIVING_HISTORY: "step-documents",
  POLICE_VERIFICATION: "step-documents",
  MEDICAL: "step-medical",
  ACCREDITATION_MASS_MANAGEMENT: "step-accreditation",
  ACCREDITATION_BASIC_FATIGUE: "step-accreditation",
  ACCREDITATION_DANGEROUS_GOODS: "step-accreditation",
  ACCREDITATION_NHVAS: "step-accreditation",
  ACCREDITATION_HACCP: "step-accreditation",
  INSURANCE: "step-insurance",
  COMPLIANCE_DOCUMENT: "step-documents",
};

function targetFor(item: ExpiryNotification, role: RoleSlug | null): string {
  // The portal slug and the admin module slug are the same word, so one lookup
  // answers both.
  const module = item.subjectType === "vendor" ? "vendor" : "driver";

  // An admin goes to the record whose document it is; everybody else goes to the
  // part of their own form that fixes it.
  if (role === "admin") return `/admin/onboarding/${module}/${item.subjectId}`;

  const anchor = SECTION_ANCHOR[item.section];
  return anchor ? `/${module}/onboarding#${anchor}` : `/${module}/onboarding`;
}

function timing(item: ExpiryNotification): string {
  if (item.daysLeft < 0) {
    const days = Math.abs(item.daysLeft);
    return `Expired ${days} day${days === 1 ? "" : "s"} ago`;
  }
  if (item.daysLeft === 0) return "Expires today";
  return `Expires in ${item.daysLeft} day${item.daysLeft === 1 ? "" : "s"}`;
}

/**
 * The notifications tab in the header.
 *
 * Every portal gets the same panel: a driver sees their own documents, a
 * vendor their own policies, an admin sees everyone's. The badge counts what
 * is actually wrong, so an empty bell genuinely means nothing needs doing.
 */
export function NotificationBell({ role }: { role: RoleSlug | null }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { items, expired, expiring, total, warningDays, loading, error, supported, refresh } =
    useNotifications();

  if (!supported) return null;

  const tone = expired > 0 ? "danger" : "warning";

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // Opening it is the moment somebody cares whether it is current.
        if (next) void refresh();
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-600 transition-colors hover:bg-secondary"
          aria-label={
            total > 0
              ? `Notifications, ${total} document${total === 1 ? "" : "s"} need attention`
              : "Notifications"
          }
        >
          <Bell className="h-5 w-5" />
          {total > 0 && (
            <span
              className={cn(
                "absolute -right-0.5 -top-0.5 grid h-[1.15rem] min-w-[1.15rem] place-items-center rounded-full px-1 text-[0.65rem] font-bold text-white ring-2 ring-white",
                tone === "danger" ? "bg-red-500" : "bg-amber-500",
              )}
            >
              {total > 9 ? "9+" : total}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={10} className="w-[22rem] p-0 sm:w-[24rem]">
        <header className="flex items-start justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Notifications</p>
            <p className="text-xs text-muted-foreground">
              {total === 0
                ? `Nothing expiring in the next ${warningDays} days`
                : [
                    expired > 0 ? `${expired} expired` : null,
                    expiring > 0 ? `${expiring} due within ${warningDays} days` : null,
                  ]
                    .filter(Boolean)
                    .join(" - ")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Refresh notifications"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" />
            )}
          </button>
        </header>

        <div className="h-px bg-border/70" />

        {/* Scrolls inside itself, so a long list never grows the popover. */}
        <div className="max-h-[22rem] overflow-y-auto">
          {error ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Could not load your notifications.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => void refresh()}
              >
                Try again
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <p className="text-sm font-medium text-foreground">All up to date</p>
              <p className="text-xs text-muted-foreground">
                {role === "admin"
                  ? "Nothing across the fleet expires in the next week."
                  : "None of your documents expire in the next week."}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {items.map((item) => {
                const isExpired = item.severity === "EXPIRED";
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        navigate(targetFor(item, role));
                      }}
                      className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/50"
                    >
                      <span
                        className={cn(
                          "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl",
                          isExpired ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600",
                        )}
                      >
                        {isExpired ? (
                          <XCircle className="h-4 w-4" />
                        ) : (
                          <AlertTriangle className="h-4 w-4" />
                        )}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {item.label}
                          {role === "admin" ? (
                            <span className="font-normal text-muted-foreground">
                              {" "}
                              - {item.subjectName}
                            </span>
                          ) : null}
                        </p>
                        <p
                          className={cn(
                            "text-xs font-medium",
                            isExpired ? "text-red-600" : "text-amber-600",
                          )}
                        >
                          {timing(item)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Expiry {prettyDate(item.expiryDate)}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <>
            <div className="h-px bg-border/70" />
            <p className="px-4 py-2.5 text-xs text-muted-foreground">
              {role === "admin"
                ? "Open a record to review or request new documents."
                : "Upload a renewed document to clear these."}
            </p>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
