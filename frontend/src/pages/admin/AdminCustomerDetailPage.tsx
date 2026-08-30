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
import { CustomerProfile } from "@/components/customer/profile/CustomerProfile";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminService } from "@/services/adminService";
import { ApiRequestError } from "@/services/api";
import type { CustomerOnboardingData } from "@/services/customerService";
import { ONBOARDING_STATUS } from "@/constants/adminStatus";

interface AdminCustomerDetailPageProps {
  customerId: string;
}

/**
 * One customer's record as an admin reads it: the verification decision on top,
 * and the customer's own profile below it, read only.
 *
 * There are no per section decisions here as there are on a vendor. A customer
 * carries no certificates or policies with their own expiry and their own
 * verification state - the whole record is one application, so one decision on
 * it is the whole of what there is to record.
 */
export function AdminCustomerDetailPage({ customerId }: AdminCustomerDetailPageProps) {
  const navigate = useNavigate();

  const [data, setData] = useState<CustomerOnboardingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deciding, setDeciding] = useState(false);
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await adminService.getCustomer(customerId));
    } catch (caught) {
      setError(
        caught instanceof ApiRequestError
          ? caught.message
          : "Could not load that customer. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setReason(data?.rejectionReason ?? "");
  }, [data?.rejectionReason]);

  async function decide(decision: "APPROVED" | "REJECTED" | "UNDER_REVIEW") {
    if (decision === "REJECTED" && reason.trim() === "") {
      toast.error("Say what needs fixing", {
        description: "The customer sees this note on their profile.",
      });
      return;
    }

    setDeciding(true);
    try {
      await adminService.reviewCustomer(customerId, decision, reason.trim() || null);
      toast.success(
        decision === "APPROVED"
          ? "Customer approved"
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

  async function confirmDelete() {
    setDeleting(true);
    try {
      await adminService.deleteCustomer(customerId);
      toast.success("Customer removed");
      navigate("/admin/onboarding/customer", { replace: true });
    } catch (caught) {
      toast.error("Could not remove that customer", {
        description:
          caught instanceof ApiRequestError ? caught.message : "Please try again in a moment.",
      });
      setDeleting(false);
    }
  }

  if (loading) return <PanelLoader label="Loading customer" />;
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
          <Link to="/admin/onboarding/customer">
            <ArrowLeft className="h-4 w-4" /> All customers
          </Link>
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild>
            <Link to={`/admin/onboarding/customer/${customerId}/edit`}>
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
          the record itself, and like the vendor flow it is never locked out: an
          admin who has seen the paperwork elsewhere can sign it off without
          waiting for the customer to press submit. */}
      <section className="mb-6 rounded-3xl border border-border/70 bg-card p-6 shadow-card">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              Verification
            </h2>
            <p className="text-sm text-muted-foreground">
              {notSubmitted
                ? "This customer has not submitted yet. You can still approve or send it back."
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
              Note to the customer (required when requesting changes)
            </Label>
            <Input
              id="reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="e.g. The billing address is missing a post code, please add it."
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
      </section>

      {/* The customer's own record, read only, with their documents. */}
      <CustomerProfile
        data={data}
        readOnly
        documentUrl={(documentId) => adminService.customerDocumentLink(customerId, documentId)}
        documentBlobUrl={(documentId) =>
          adminService.fetchCustomerDocumentBlobUrl(customerId, documentId)
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
        title="Remove this customer?"
        description={`${data.email} will be deleted permanently, along with their documents. This cannot be undone. The email address becomes free to sign up with again.`}
        confirmLabel="Remove customer"
        destructive
        busy={deleting}
        onConfirm={confirmDelete}
      />
    </>
  );
}
