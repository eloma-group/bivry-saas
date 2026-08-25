import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Pencil,
  Trash2,
  XCircle,
} from "lucide-react";
import { PanelError, PanelLoader } from "@/components/common/PanelState";
import { DriverProfile } from "@/components/driver/profile/DriverProfile";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminService } from "@/services/adminService";
import { ApiRequestError } from "@/services/api";
import type { DriverOnboardingData, VerificationStatus } from "@/services/driverService";
import {
  ONBOARDING_STATUS,
  REVIEWABLE_SECTIONS,
  VERIFICATION_STATUS,
} from "@/constants/adminStatus";
import type { ReviewableSection } from "@/services/adminService";

/** Whether a section has been filled in at all, and where its review stands. */
function sectionStatus(
  data: DriverOnboardingData,
  slug: ReviewableSection,
): VerificationStatus | null {
  const section = data[slug];
  return section ? section.verificationStatus : null;
}

interface AdminDriverDetailPageProps {
  driverId: string;
}

export function AdminDriverDetailPage({ driverId }: AdminDriverDetailPageProps) {
  const navigate = useNavigate();

  const [data, setData] = useState<DriverOnboardingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deciding, setDeciding] = useState(false);
  const [reason, setReason] = useState("");
  const [savingSection, setSavingSection] = useState<ReviewableSection | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await adminService.getDriver(driverId));
    } catch (caught) {
      setError(
        caught instanceof ApiRequestError
          ? caught.message
          : "Could not load that driver. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [driverId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setReason(data?.rejectionReason ?? "");
  }, [data?.rejectionReason]);

  async function decide(decision: "APPROVED" | "REJECTED" | "UNDER_REVIEW") {
    if (decision === "REJECTED" && reason.trim() === "") {
      toast.error("Say what needs fixing", {
        description: "The driver sees this note on their profile.",
      });
      return;
    }

    setDeciding(true);
    try {
      await adminService.reviewDriver(driverId, decision, reason.trim() || null);
      toast.success(
        decision === "APPROVED"
          ? "Driver approved"
          : decision === "REJECTED"
            ? "Changes requested"
            : "Marked as under review",
      );
      await load();
    } catch (caught) {
      toast.error("Could not save that decision", {
        description:
          caught instanceof ApiRequestError ? caught.message : "Please try again in a moment.",
      });
    } finally {
      setDeciding(false);
    }
  }

  async function decideSection(section: ReviewableSection, status: VerificationStatus) {
    setSavingSection(section);
    try {
      await adminService.reviewSection(driverId, section, status);
      await load();
    } catch (caught) {
      toast.error("Could not update that section", {
        description:
          caught instanceof ApiRequestError ? caught.message : "Please try again in a moment.",
      });
    } finally {
      setSavingSection(null);
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await adminService.deleteDriver(driverId);
      toast.success("Driver removed");
      navigate("/admin/onboarding/driver", { replace: true });
    } catch (caught) {
      toast.error("Could not remove that driver", {
        description:
          caught instanceof ApiRequestError ? caught.message : "Please try again in a moment.",
      });
      setDeleting(false);
    }
  }

  if (loading) return <PanelLoader label="Loading driver" />;
  if (error || !data) {
    return <PanelError message={error ?? "Not found"} onRetry={() => void load()} />;
  }

  const status = ONBOARDING_STATUS[data.onboardingStatus];
  const awaitingDecision =
    data.onboardingStatus === "SUBMITTED" || data.onboardingStatus === "UNDER_REVIEW";
  const notSubmitted =
    data.onboardingStatus === "NOT_STARTED" || data.onboardingStatus === "IN_PROGRESS";

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin/onboarding/driver">
            <ArrowLeft className="h-4 w-4" /> All drivers
          </Link>
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild>
            <Link to={`/admin/onboarding/driver/${driverId}/edit`}>
              <Pencil className="h-4 w-4" /> Edit details
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="text-destructive hover:bg-red-50 hover:text-destructive"
            onClick={() => setConfirmingDelete(true)}
          >
            <Trash2 className="h-4 w-4" /> Remove
          </Button>
        </div>
      </div>

      {/* Verification panel. The decision an admin comes here to make sits above
          the record itself. */}
      <section className="mb-6 rounded-3xl border border-border/70 bg-card p-6 shadow-card">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              Verification
            </h2>
            <p className="text-sm text-muted-foreground">
              {notSubmitted
                ? "This driver has not submitted their application yet."
                : "Approve the application, or send it back with a note."}
            </p>
          </div>
          <Badge variant={status.variant}>{status.label}</Badge>
        </header>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <Label
              htmlFor="reason"
              className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Note to the driver (required when requesting changes)
            </Label>
            <Input
              id="reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="e.g. The police check has expired, please upload a current one."
              className="mt-1.5"
              disabled={notSubmitted || deciding}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => void decide("APPROVED")}
              disabled={notSubmitted || deciding || data.onboardingStatus === "APPROVED"}
            >
              {deciding ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Approve
            </Button>
            <Button
              type="button"
              variant="outline"
              className="text-destructive hover:bg-red-50 hover:text-destructive"
              onClick={() => void decide("REJECTED")}
              disabled={notSubmitted || deciding}
            >
              <XCircle className="h-4 w-4" /> Request changes
            </Button>
            {awaitingDecision && data.onboardingStatus === "SUBMITTED" && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => void decide("UNDER_REVIEW")}
                disabled={deciding}
              >
                Mark under review
              </Button>
            )}
          </div>
        </div>

        {/* Per section decisions, for the cases where only one document is wrong. */}
        <div className="mt-6 border-t border-border/60 pt-5">
          <p className="mb-3 text-sm font-semibold text-foreground">By section</p>
          <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            {REVIEWABLE_SECTIONS.map((section) => {
              const current = sectionStatus(data, section.slug);
              const busy = savingSection === section.slug;

              return (
                <li
                  key={section.slug}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{section.label}</p>
                    {current ? (
                      <Badge variant={VERIFICATION_STATUS[current].variant} className="mt-1">
                        {VERIFICATION_STATUS[current].label}
                      </Badge>
                    ) : (
                      <p className="text-xs text-muted-foreground">Not filled in</p>
                    )}
                  </div>

                  {current && (
                    <div className="flex items-center gap-2">
                      {busy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                      <Select
                        value={current}
                        onValueChange={(value) =>
                          void decideSection(section.slug, value as VerificationStatus)
                        }
                      >
                        <SelectTrigger className="w-40" aria-label={`${section.label} status`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(VERIFICATION_STATUS) as VerificationStatus[]).map(
                            (value) => (
                              <SelectItem key={value} value={value}>
                                {VERIFICATION_STATUS[value].label}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* The driver's own record, read only, with their documents. */}
      <DriverProfile
        data={data}
        readOnly
        documentUrl={(documentId) => adminService.driverDocumentLink(driverId, documentId)}
        documentBlobUrl={(documentId) =>
          adminService.fetchDriverDocumentBlobUrl(driverId, documentId)
        }
      />

      <div className="mt-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <ExternalLink className="h-3.5 w-3.5" />
          Documents open from blob storage with a short lived link.
        </span>
      </div>

      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title="Remove this driver?"
        description={`${data.email} will be deleted permanently, along with their documents. This cannot be undone. The email address becomes free to sign up with again.`}
        confirmLabel="Remove driver"
        destructive
        busy={deleting}
        onConfirm={confirmDelete}
      />
    </>
  );
}
