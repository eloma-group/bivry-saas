import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarCheck,
  Check,
  ClipboardList,
  Download,
  FileText,
  Handshake,
  NotebookText,
  PackageCheck,
  Pencil,
  Trash2,
  Truck,
  Wallet,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PanelError, PanelLoader } from "@/components/common/PanelState";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { prettyDate } from "@/utils/date";
import { APPROVAL_STATUS } from "@/constants/adminStatus";
import { ApiRequestError } from "@/services/api";
import {
  bookingService,
  type BookingDetail,
  type BookingDocument,
  type BookingPriceRow,
  type BookingStopRow,
  type DocumentApprovalStatus,
} from "@/services/bookingService";

/**
 * Booking detail (Admin).
 *
 * A booking laid back out the way the Create Booking form asks for it, read
 * only: what is being booked, the vehicle, where it is picked up and delivered,
 * our price, and the vendor carrying it. Reached by clicking a row in Manage
 * Bookings. The job number heads the page, since that is the booking's id.
 */

/** "1234.5" -> "$1,234.50". Blank stays a dash so an empty field reads clean. */
function money(value: string | null): string {
  if (value === null || value.trim() === "") return "-";
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "-";
  return parsed.toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** "12.5" -> "12.5%". Blank stays a dash. */
function percent(value: string | null): string {
  if (value === null || value.trim() === "") return "-";
  const parsed = Number(value);
  return Number.isFinite(parsed) ? `${parsed}%` : "-";
}

/** A "YYYY-MM-DDTHH:mm" scheduled time as "12 Sep 2026, 14:30". Bare date too. */
function dateTime(value: string | null): string {
  if (!value) return "-";
  const [date, time] = value.split("T");
  const day = prettyDate(date);
  return time ? `${day}, ${time.slice(0, 5)}` : day;
}

/** A stop's address on one line, the parts it has, in reading order. */
function addressLine(stop: BookingStopRow): string {
  const line = [stop.suite, stop.street1].filter(Boolean).join(" ");
  const place = [stop.suburb, stop.state, stop.postCode].filter(Boolean).join(" ");
  return [line, place, stop.country].filter(Boolean).join(", ") || "-";
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-card">
      <header className="flex items-center gap-3 border-b border-border/60 bg-secondary/30 px-5 py-4">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

/** A label above its value. Falls back to a dash so every field reads the same. */
function Field({ label, value }: { label: string; value: string | null | undefined }) {
  const shown = value === null || value === undefined || value.trim() === "" ? "-" : value;
  return (
    <div className="min-w-0">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-foreground">{shown}</dd>
    </div>
  );
}

/** The grid the fields sit in, so every section lines up the same way. */
function Grid({ children }: { children: React.ReactNode }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">{children}</dl>
  );
}

/** One pickup or delivery, its own little card so a multi-stop job reads clearly. */
function StopCard({ stop, index }: { stop: BookingStopRow; index: number }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
      <p className="mb-3 text-sm font-semibold text-foreground">
        {stop.type === "PICKUP" ? "Pickup" : "Delivery"} {index + 1}
      </p>
      <Grid>
        <Field label="Company" value={stop.company} />
        <Field label="Trailer" value={stop.trailer} />
        <Field
          label={stop.type === "PICKUP" ? "Pickup time" : "Delivery time"}
          value={dateTime(stop.scheduledAt)}
        />
        {stop.type === "PICKUP" && <Field label="Client job number" value={stop.clientJobNumber} />}
        <Field label="Address" value={addressLine(stop)} />
        <Field label="Instructions" value={stop.instructions} />
      </Grid>
    </div>
  );
}

/** One of Our Price columns, laid out the way the form's grid reads it. */
function PriceCard({ price, index, single }: { price: BookingPriceRow; index: number; single: boolean }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
      {!single && (
        <p className="mb-3 text-sm font-semibold text-foreground">Price {index + 1}</p>
      )}
      <Grid>
        <Field label="Gross amount" value={money(price.grossAmount)} />
        <Field label="Fuel levy" value={`${percent(price.fuelLevyPct)}  ${money(price.fuelLevyAmount)}`} />
        <Field
          label="Split charge"
          value={`${percent(price.splitChargePct)}  ${money(price.splitChargeAmount)}`}
        />
        <Field
          label="Other charges"
          value={`${percent(price.otherChargesPct)}  ${money(price.otherChargesAmount)}`}
        />
        <Field label="GST" value={`${percent(price.gstPct)}  ${money(price.gstAmount)}`} />
        <Field label="Net amount" value={money(price.netAmount)} />
        <Field label="Total amount" value={money(price.totalAmount)} />
      </Grid>
    </div>
  );
}

/** "1536000" bytes -> "1.5 MB". Keeps the file list honest about size. */
function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * The files the vendor uploaded for this booking, with the admin's approve and
 * reject controls. Loads its own list so the detail page stays lean; each
 * decision saves at once and updates the badge optimistically.
 */
function DocumentsReview({ bookingId }: { bookingId: string }) {
  const [documents, setDocuments] = useState<BookingDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDocuments(await bookingService.listDocuments(bookingId));
    } catch (caught) {
      setError(
        caught instanceof ApiRequestError
          ? caught.message
          : "Could not load the documents. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function openDocument(document: BookingDocument) {
    setOpening(document.id);
    try {
      const url = await bookingService.fetchDocumentBlobUrl(bookingId, document.id);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (caught) {
      toast.error("Could not open that file", {
        description:
          caught instanceof ApiRequestError ? caught.message : "Please try again in a moment.",
      });
    } finally {
      setOpening(null);
    }
  }

  async function setApproval(document: BookingDocument, status: DocumentApprovalStatus) {
    const previous = document.approvalStatus;
    setDocuments((list) =>
      list.map((doc) => (doc.id === document.id ? { ...doc, approvalStatus: status } : doc)),
    );
    setSavingId(document.id);
    try {
      await bookingService.setDocumentApproval(bookingId, document.id, status);
      toast.success("Document review saved", {
        description: `${document.fileName} - ${APPROVAL_STATUS[status].label}`,
      });
    } catch (caught) {
      setDocuments((list) =>
        list.map((doc) => (doc.id === document.id ? { ...doc, approvalStatus: previous } : doc)),
      );
      toast.error("Could not save that review", {
        description:
          caught instanceof ApiRequestError ? caught.message : "Please try again in a moment.",
      });
    } finally {
      setSavingId(null);
    }
  }

  return (
    <Section icon={FileText} title="Vendor Documents">
      {loading ? (
        <PanelLoader label="Loading documents" />
      ) : error ? (
        <PanelError message={error} onRetry={() => void load()} />
      ) : documents.length === 0 ? (
        <p className="text-sm text-muted-foreground">The vendor has not uploaded any documents yet.</p>
      ) : (
        <ul className="divide-y divide-border/60">
          {documents.map((document) => (
            <li key={document.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <FileText className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{document.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {[document.category, fileSize(document.sizeInBytes), prettyDate(document.createdAt)]
                    .filter(Boolean)
                    .join(" - ")}
                </p>
              </div>
              <Badge variant={APPROVAL_STATUS[document.approvalStatus].variant}>
                {APPROVAL_STATUS[document.approvalStatus].label}
              </Badge>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={opening === document.id}
                  onClick={() => void openDocument(document)}
                >
                  <Download className={cn("h-4 w-4", opening === document.id && "animate-pulse")} /> View
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={savingId === document.id || document.approvalStatus === "APPROVED"}
                  className="text-emerald-700 hover:bg-emerald-50 hover:text-emerald-700"
                  onClick={() => void setApproval(document, "APPROVED")}
                >
                  <Check className="h-4 w-4" /> Approve
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={savingId === document.id || document.approvalStatus === "REJECTED"}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => void setApproval(document, "REJECTED")}
                >
                  <X className="h-4 w-4" /> Reject
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

type Tab = "details" | "documents";

export function AdminBookingDetailPage() {
  const { bookingId = "" } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [data, setData] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Land on Documents when arrived via a "View documents" link (?tab=documents).
  const [tab, setTab] = useState<Tab>(
    searchParams.get("tab") === "documents" ? "documents" : "details",
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await bookingService.get(bookingId));
    } catch (caught) {
      setError(
        caught instanceof ApiRequestError
          ? caught.message
          : "Could not load that booking. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function confirmDelete() {
    setDeleting(true);
    try {
      await bookingService.remove(bookingId);
      toast.success("Booking deleted", { description: data?.jobNumber });
      navigate("/admin/bookings", { replace: true });
    } catch (caught) {
      toast.error("Could not delete that booking", {
        description:
          caught instanceof ApiRequestError ? caught.message : "Please try again in a moment.",
      });
      setDeleting(false);
    }
  }

  const pickups = (data?.stops ?? []).filter((stop) => stop.type === "PICKUP");
  const deliveries = (data?.stops ?? []).filter((stop) => stop.type === "DELIVERY");
  const prices = data?.prices ?? [];

  return (
    <DashboardLayout>
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
          <Link to="/admin/bookings">
            <ArrowLeft className="h-4 w-4" /> Back to Manage Bookings
          </Link>
        </Button>

        {data && (
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {data.jobNumber}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Booking ID {data.jobNumber}
                {data.customerName ? ` - ${data.customerName}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild>
                <Link to={`/admin/bookings/${data.id}/edit`}>
                  <Pencil className="h-4 w-4" /> Edit booking
                </Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setConfirmingDelete(true)}
              >
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <PanelLoader label="Loading booking" />
      ) : error || !data ? (
        <PanelError message={error ?? "Not found"} onRetry={() => void load()} />
      ) : (
        <>
          <div className="mb-6 flex gap-1 border-b border-border/70">
            {([
              { key: "details", label: "Details" },
              { key: "documents", label: "Documents" },
            ] as { key: Tab; label: string }[]).map((entry) => (
              <button
                key={entry.key}
                type="button"
                onClick={() => setTab(entry.key)}
                className={cn(
                  "relative -mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                  tab === entry.key
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {entry.label}
              </button>
            ))}
          </div>

          <div className={cn("space-y-6", tab !== "details" && "hidden")}>
          <Section icon={ClipboardList} title="Booking Details">
            <Grid>
              <Field label="Booking ID (job number)" value={data.jobNumber} />
              <Field label="Booking received" value={prettyDate(data.bookingReceivedDate)} />
              <Field label="Financial year" value={data.financialYear} />
              <Field label="Customer" value={data.customerName} />
              <Field label="Account number" value={data.customerAccountNumber} />
              <Field label="Account status" value={data.accountStatus} />
              <Field label="Agreement type" value={data.agreementType} />
              <Field label="Reference" value={data.reference} />
              <Field label="Invoice term" value={data.invoiceTerm} />
            </Grid>
          </Section>

          <Section icon={Truck} title="Vehicle Details">
            <Grid>
              <Field label="Cargo type" value={data.cargoType} />
              <Field label="Vehicle type" value={data.vehicleType} />
              <Field label="Trailer category" value={data.trailerCategory} />
            </Grid>
          </Section>

          <Section icon={PackageCheck} title="Pickup Details">
            {pickups.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pickups recorded.</p>
            ) : (
              <div className="space-y-4">
                {pickups.map((stop, index) => (
                  <StopCard key={stop.id} stop={stop} index={index} />
                ))}
              </div>
            )}
          </Section>

          <Section icon={Truck} title="Delivery Details">
            {deliveries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No deliveries recorded.</p>
            ) : (
              <div className="space-y-4">
                {deliveries.map((stop, index) => (
                  <StopCard key={stop.id} stop={stop} index={index} />
                ))}
              </div>
            )}
          </Section>

          <Section icon={Wallet} title="Our Price">
            {prices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No price recorded.</p>
            ) : (
              <div className="space-y-4">
                {prices.map((price, index) => (
                  <PriceCard key={price.id} price={price} index={index} single={prices.length === 1} />
                ))}
                <div className="flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
                  <span className="text-sm font-medium text-foreground">Final amount</span>
                  <span className="text-base font-semibold text-foreground">
                    {money(data.priceFinalAmount)}
                  </span>
                </div>
              </div>
            )}
          </Section>

          <Section icon={Handshake} title="Vendor Allotment & Price">
            <Grid>
              <Field label="Vendor" value={data.vendorName} />
              <Field label="Gross amount" value={money(data.vendorGrossAmount)} />
              <Field label="Gross amount 2" value={money(data.vendorGrossAmount2)} />
              <Field
                label="Fuel levy"
                value={`${percent(data.vendorFuelLevyPct)}  ${money(data.vendorFuelLevyAmount)}`}
              />
              <Field label="GST" value={`${percent(data.vendorGstPct)}  ${money(data.vendorGstAmount)}`} />
              <Field label="Net amount" value={money(data.vendorNetAmount)} />
              <Field label="Total amount" value={money(data.vendorTotalAmount)} />
            </Grid>
          </Section>

          <Section icon={CalendarCheck} title="Record">
            <Grid>
              <Field label="Created" value={prettyDate(data.createdAt)} />
              <Field label="Last updated" value={prettyDate(data.updatedAt)} />
            </Grid>
          </Section>
          </div>

          <div className={cn("space-y-6", tab !== "documents" && "hidden")}>
          <Section icon={NotebookText} title="Log Book">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[
                { label: "Precheck", checked: data.logbookPrecheckChecked },
                { label: "Postcheck", checked: data.logbookPostcheckChecked },
                { label: "Payment date", checked: data.logbookPaymentDateChecked },
                { label: "Total payment", checked: data.logbookTotalPaymentChecked },
              ].map((box) => (
                <div
                  key={box.label}
                  className="flex items-center gap-3 rounded-2xl border border-border/60 bg-secondary/20 p-4"
                >
                  <span
                    className={cn(
                      "grid h-8 w-8 place-items-center rounded-lg",
                      box.checked
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-secondary text-muted-foreground",
                    )}
                  >
                    {box.checked ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{box.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {box.checked ? "Ticked by vendor" : "Not ticked"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <DocumentsReview bookingId={data.id} />
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title="Delete this booking?"
        description={
          data
            ? `${data.jobNumber} will be removed from Manage Bookings. Its job number stays taken and is not reused.`
            : ""
        }
        confirmLabel="Delete booking"
        destructive
        busy={deleting}
        onConfirm={confirmDelete}
      />
    </DashboardLayout>
  );
}
