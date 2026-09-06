import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarCheck,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Download,
  FileText,
  Handshake,
  NotebookText,
  PackageCheck,
  Trash2,
  Truck,
  Upload,
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
  vendorBookingService,
  type BookingDocument,
  type VendorBookingDetail,
  type BookingStopRow,
} from "@/services/bookingService";

/**
 * Booking detail (Vendor).
 *
 * Two tabs: Details, the read only lay-out of the vendor's allotted job, and
 * Documents, where they attach the paperwork that goes with it - the proof of
 * delivery, and the log book pages (precheck and postcheck) - and tick the two
 * log book boxes. There is deliberately no customer and no "our price" here; the
 * server does not send either to a vendor.
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

/** "1536000" bytes -> "1.5 MB". Keeps the file list honest about size. */
function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
        <Field label="Address" value={addressLine(stop)} />
        <Field label="Instructions" value={stop.instructions} />
      </Grid>
    </div>
  );
}

/** The Details tab: the whole booking, laid out read only. */
function DetailsTab({ data }: { data: VendorBookingDetail }) {
  const pickups = data.stops.filter((stop) => stop.type === "PICKUP");
  const deliveries = data.stops.filter((stop) => stop.type === "DELIVERY");

  return (
    <div className="space-y-6">
      <Section icon={ClipboardList} title="Booking Details">
        <Grid>
          <Field label="Job number" value={data.jobNumber} />
          <Field label="Booking received" value={prettyDate(data.bookingReceivedDate)} />
          <Field label="Financial year" value={data.financialYear} />
          <Field label="Reference" value={data.reference} />
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
  );
}

/** One stored file, with its View and delete controls. */
function DocFileRow({
  document,
  opening,
  onView,
  onDelete,
}: {
  document: BookingDocument;
  opening: boolean;
  onView: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="flex flex-wrap items-center gap-3 py-2.5 first:pt-0 last:pb-0">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <FileText className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{document.fileName}</p>
        <p className="text-xs text-muted-foreground">
          {[fileSize(document.sizeInBytes), prettyDate(document.createdAt)].filter(Boolean).join(" - ")}
        </p>
      </div>
      <Badge variant={APPROVAL_STATUS[document.approvalStatus].variant}>
        {APPROVAL_STATUS[document.approvalStatus].label}
      </Badge>
      <div className="flex items-center gap-1">
        <Button type="button" variant="ghost" size="sm" disabled={opening} onClick={onView}>
          <Download className={cn("h-4 w-4", opening && "animate-pulse")} /> View
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Delete document"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </li>
  );
}

/** The category a file is filed under. Only the POD is an upload now. */
const DOC_CATEGORY = {
  pod: "POD",
} as const;

/** The four Log Book tick boxes, in the order they are shown. */
type CheckKey = "precheck" | "postcheck" | "paymentDate" | "totalPayment";

/** The Documents tab: the POD upload and the Log Book tick boxes. */
function DocumentsTab({ booking }: { booking: VendorBookingDetail }) {
  const bookingId = booking.id;

  const [documents, setDocuments] = useState<BookingDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // One hidden file input shared by every slot; the slot that opened it is
  // remembered here so the upload is filed under the right category.
  const fileInput = useRef<HTMLInputElement>(null);
  const pendingCategory = useRef<string>("");
  const [uploadingCategory, setUploadingCategory] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const [pendingDelete, setPendingDelete] = useState<BookingDocument | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);

  const [logbookOpen, setLogbookOpen] = useState(true);
  const [checks, setChecks] = useState<Record<CheckKey, boolean>>({
    precheck: booking.logbookPrecheckChecked,
    postcheck: booking.logbookPostcheckChecked,
    paymentDate: booking.logbookPaymentDateChecked,
    totalPayment: booking.logbookTotalPaymentChecked,
  });
  const [savingCheck, setSavingCheck] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDocuments(await vendorBookingService.listDocuments(bookingId));
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

  function chooseFor(category: string) {
    pendingCategory.current = category;
    fileInput.current?.click();
  }

  async function onFileChosen(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Clear the input straight away so choosing the same file twice still fires.
    event.target.value = "";
    if (!file) return;

    const category = pendingCategory.current;
    setUploadingCategory(category);
    setProgress(0);
    try {
      await vendorBookingService.uploadDocument({ bookingId, file, category, onProgress: setProgress });
      toast.success("File uploaded", { description: file.name });
      await load();
    } catch (caught) {
      toast.error("Could not upload that file", {
        description:
          caught instanceof ApiRequestError ? caught.message : "Please try again in a moment.",
      });
    } finally {
      setUploadingCategory(null);
      setProgress(0);
    }
  }

  async function openDocument(document: BookingDocument) {
    setOpening(document.id);
    try {
      // Stream through the authenticated API, which works in both local dev and
      // production, and open the file in a new tab.
      const url = await vendorBookingService.fetchDocumentBlobUrl(bookingId, document.id);
      window.open(url, "_blank", "noopener,noreferrer");
      // Give the tab a moment to take the URL before releasing it.
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

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await vendorBookingService.deleteDocument(bookingId, pendingDelete.id);
      toast.success("File removed", { description: pendingDelete.fileName });
      setPendingDelete(null);
      await load();
    } catch (caught) {
      toast.error("Could not remove that file", {
        description:
          caught instanceof ApiRequestError ? caught.message : "Please try again in a moment.",
      });
    } finally {
      setDeleting(false);
    }
  }

  async function toggleCheck(which: CheckKey, next: boolean) {
    const previous = checks[which];
    // Optimistic: tick at once, put it back if the save fails.
    setChecks((current) => ({ ...current, [which]: next }));
    setSavingCheck(true);
    try {
      await vendorBookingService.setLogbookChecks(bookingId, { [which]: next });
    } catch (caught) {
      setChecks((current) => ({ ...current, [which]: previous }));
      toast.error("Could not save that", {
        description:
          caught instanceof ApiRequestError ? caught.message : "Please try again in a moment.",
      });
    } finally {
      setSavingCheck(false);
    }
  }

  const filesIn = (category: string) =>
    documents.filter((doc) => (doc.category ?? "").toLowerCase() === category.toLowerCase());

  /** An upload slot for one category: its files, plus an Upload button. */
  function slot(category: string, hint: string) {
    const files = filesIn(category);
    const busy = uploadingCategory === category;
    return (
      <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <div className="mb-2 flex items-start justify-between gap-3">
          <p className="text-xs text-muted-foreground">{hint}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploadingCategory !== null}
            onClick={() => chooseFor(category)}
          >
            <Upload className="h-4 w-4" /> {busy ? `${progress}%` : "Upload"}
          </Button>
        </div>
        {files.length === 0 ? (
          <p className="text-xs text-muted-foreground">No file yet.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {files.map((document) => (
              <DocFileRow
                key={document.id}
                document={document}
                opening={opening === document.id}
                onView={() => void openDocument(document)}
                onDelete={() => setPendingDelete(document)}
              />
            ))}
          </ul>
        )}
      </div>
    );
  }

  /** One of the four log book tick boxes. */
  function checkBox(label: string, which: CheckKey) {
    return (
      <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <input
          type="checkbox"
          checked={checks[which]}
          disabled={savingCheck}
          onChange={(event) => void toggleCheck(which, event.target.checked)}
          className="h-4 w-4 accent-primary"
        />
        <span className="text-sm font-medium text-foreground">{label}</span>
      </label>
    );
  }

  return (
    <div className="space-y-6">
      {loading ? (
        <PanelLoader label="Loading documents" />
      ) : error ? (
        <PanelError message={error} onRetry={() => void load()} />
      ) : (
        <>
          <Section icon={PackageCheck} title="Proof of Delivery (POD)">
            {slot(DOC_CATEGORY.pod, "Upload the signed proof of delivery for this job.")}
          </Section>

          <section className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-card">
            <button
              type="button"
              onClick={() => setLogbookOpen((open) => !open)}
              className="flex w-full items-center gap-3 border-b border-border/60 bg-secondary/30 px-5 py-4 text-left transition-colors hover:bg-secondary/50"
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                <NotebookText className="h-5 w-5" />
              </span>
              <h2 className="flex-1 text-base font-semibold text-foreground">Log Book - Pages</h2>
              {logbookOpen ? (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              )}
            </button>

            {logbookOpen && (
              <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
                {checkBox("Precheck", "precheck")}
                {checkBox("Postcheck", "postcheck")}
                {checkBox("Payment date", "paymentDate")}
                {checkBox("Total payment", "totalPayment")}
              </div>
            )}
          </section>
        </>
      )}

      <input
        ref={fileInput}
        type="file"
        className="hidden"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
        onChange={onFileChosen}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Remove this document?"
        description={pendingDelete ? `${pendingDelete.fileName} will be removed from this booking.` : ""}
        confirmLabel="Remove document"
        destructive
        busy={deleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

type Tab = "details" | "documents";

export function VendorBookingDetailPage() {
  const { bookingId = "" } = useParams();
  const [searchParams] = useSearchParams();

  const [data, setData] = useState<VendorBookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Land on Documents when arrived via the list's "View" action (?tab=documents).
  const [tab, setTab] = useState<Tab>(
    searchParams.get("tab") === "documents" ? "documents" : "details",
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await vendorBookingService.get(bookingId));
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

  const tabs: { key: Tab; label: string }[] = [
    { key: "details", label: "Details" },
    { key: "documents", label: "Documents" },
  ];

  return (
    <DashboardLayout>
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
          <Link to="/vendor/bookings">
            <ArrowLeft className="h-4 w-4" /> Back to Manage Bookings
          </Link>
        </Button>

        {data && (
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {data.jobNumber}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Job number {data.jobNumber}</p>
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
            {tabs.map((entry) => (
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

          {tab === "details" ? <DetailsTab data={data} /> : <DocumentsTab booking={data} />}
        </>
      )}
    </DashboardLayout>
  );
}
