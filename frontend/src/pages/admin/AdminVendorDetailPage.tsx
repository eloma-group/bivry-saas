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
import { VendorProfile } from "@/components/vendor/profile/VendorProfile";
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
import { adminService, type ReviewableVendorSection } from "@/services/adminService";
import { ApiRequestError } from "@/services/api";
import type { VerificationStatus } from "@/services/driverService";
import type { VendorOnboardingData } from "@/services/vendorService";
import {
  ONBOARDING_STATUS,
  REVIEWABLE_VENDOR_SECTIONS,
  VERIFICATION_STATUS,
} from "@/constants/adminStatus";
import { INSURANCE_POLICIES } from "@/constants/vendorOptions";

/** Where a supplier section's review currently stands, or null if never filled in. */
function sectionStatus(
  data: VendorOnboardingData,
  slug: ReviewableVendorSection,
): VerificationStatus | null {
  if (slug === "accreditation") {
    return data.accreditation ? data.accreditation.verificationStatus : null;
  }

  const policy = INSURANCE_POLICIES.find((entry) => entry.key === slug);
  const stored = data.insurances.find((row) => row.type === policy?.apiType);
  return stored ? stored.verificationStatus : null;
}

interface AdminVendorDetailPageProps {
  vendorId: string;
}

export function AdminVendorDetailPage({ vendorId }: AdminVendorDetailPageProps) {
  const navigate = useNavigate();

  const [data, setData] = useState<VendorOnboardingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deciding, setDeciding] = useState(false);
  const [reason, setReason] = useState("");
  const [savingSection, setSavingSection] = useState<ReviewableVendorSection | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await adminService.getVendor(vendorId));
    } catch (caught) {
      setError(
        caught instanceof ApiRequestError
          ? caught.message
          : "Could not load that supplier. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [vendorId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setReason(data?.rejectionReason ?? "");
  }, [data?.rejectionReason]);

  async function decide(decision: "APPROVED" | "REJECTED" | "UNDER_REVIEW") {
    if (decision === "REJECTED" && reason.trim() === "") {
      toast.error("Say what needs fixing", {
        description: "The supplier sees this note on their profile.",
      });
      return;
    }

    setDeciding(true);
    try {
      await adminService.reviewVendor(vendorId, decision, reason.trim() || null);
      toast.success(
        decision === "APPROVED"
          ? "Supplier approved"
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

  async function decideSection(section: ReviewableVendorSection, status: VerificationStatus) {
    setSavingSection(section);
    try {
      await adminService.reviewVendorSection(vendorId, section, status);
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
      await adminService.deleteVendor(vendorId);
      toast.success("Supplier removed");
      navigate("/admin/onboarding/supplier", { replace: true });
    } catch (caught) {
      toast.error("Could not remove that supplier", {
        description:
          caught instanceof ApiRequestError ? caught.message : "Please try again in a moment.",
      });
      setDeleting(false);
    }
  }

  if (loading) return <PanelLoader label="Loading supplier" />;
  if (error || !data) {
    return <PanelError message={error ?? "Not found"} onRetry={() => void load()} />;
  }

  const status = ONBOARDING_STATUS[data.onboardingStatus];
  const notSubmitted =
    data.onboardingStatus === "NOT_STARTED" || data.onboardingStatus === "IN_PROGRESS";

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin/onboarding/supplier">
            <ArrowLeft className="h-4 w-4" /> All suppliers
          </Link>
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild>
            <Link to={`/admin/onboarding/supplier/${vendorId}/edit`}>
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
          the record itself. Unlike the driver flow it is never locked out: a
          supplier's pack is long, and an admin who has seen the paperwork
          elsewhere can sign it off without waiting for the last upload. */}
      <section className="mb-6 rounded-3xl border border-border/70 bg-card p-6 shadow-card">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              Verification
            </h2>
            <p className="text-sm text-muted-foreground">
              {notSubmitted
                ? "This supplier has not submitted yet. You can still approve or send it back."
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
              Note to the supplier (required when requesting changes)
            </Label>
            <Input
              id="reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="e.g. The public liability certificate has expired, please upload a current one."
              className="mt-1.5"
              disabled={deciding}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => void decide("APPROVED")}
              disabled={deciding || data.onboardingStatus === "APPROVED"}
            >
              {deciding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Approve
            </Button>
            <Button
              type="button"
              variant="outline"
              className="text-destructive hover:bg-red-50 hover:text-destructive"
              onClick={() => void decide("REJECTED")}
              disabled={deciding}
            >
              <XCircle className="h-4 w-4" /> Request changes
            </Button>
            {data.onboardingStatus !== "UNDER_REVIEW" && (
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

        {/* Per section decisions, for the cases where only one policy is wrong. */}
        <div className="mt-6 border-t border-border/60 pt-5">
          <p className="mb-3 text-sm font-semibold text-foreground">By section</p>
          <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            {REVIEWABLE_VENDOR_SECTIONS.map((section) => {
              const current = sectionStatus(data, section.slug);
              const busy = savingSection === section.slug;

              return (
                <li
                  key={section.slug}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {section.label}
                    </p>
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

      {/* The supplier's own record, read only, with their documents. */}
      <VendorProfile
        data={data}
        readOnly
        documentUrl={(documentId) => adminService.vendorDocumentLink(vendorId, documentId)}
        documentBlobUrl={(documentId) =>
          adminService.fetchVendorDocumentBlobUrl(vendorId, documentId)
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
        title="Remove this supplier?"
        description={`${data.email} will be deleted permanently, along with their documents. This cannot be undone. The email address becomes free to sign up with again.`}
        confirmLabel="Remove supplier"
        destructive
        busy={deleting}
        onConfirm={confirmDelete}
      />
    </>
  );
}
