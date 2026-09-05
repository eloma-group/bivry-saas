import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PanelError, PanelLoader } from "@/components/common/PanelState";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { addDays, format } from "date-fns";
import { cn } from "@/lib/utils";
import { prettyDate, toDate } from "@/utils/date";
import { ApiRequestError } from "@/services/api";
import {
  bookingService,
  type BookingListResult,
  type BookingRow,
  type BookingStopRow,
} from "@/services/bookingService";

/**
 * Manage Bookings (Admin).
 *
 * The register of every booking raised from the Create Booking form. It reads
 * the same server list the number allocator writes to, so a booking created
 * with the Create Booking button shows here the moment the form lands back on
 * this page - a draft, which never reaches the server, does not.
 *
 * Fetched on mount rather than cached, so arriving here straight after a create
 * always shows the newest row. Search and paging mirror the customer register.
 */

const PAGE_SIZE = 25;

/** How many days after delivery the invoice is due, unless agreed otherwise. */
const INVOICE_TERM_DAYS = 30;

/** The first stop of a kind, so the list can show when a job loads and lands. */
function firstStop(stops: BookingStopRow[], type: "PICKUP" | "DELIVERY"): BookingStopRow | null {
  return stops.filter((stop) => stop.type === type).sort((a, b) => a.position - b.position)[0] ?? null;
}

/** The scheduled date of the first stop of a kind, or a dash. */
function stopDate(stops: BookingStopRow[], type: "PICKUP" | "DELIVERY"): string {
  return prettyDate(firstStop(stops, type)?.scheduledAt ?? null);
}

/**
 * When the invoice falls due: 30 days after the delivery date by default. Blank
 * when there is no delivery date yet to count from.
 */
function invoicePaymentDate(stops: BookingStopRow[]): string {
  const delivery = toDate(firstStop(stops, "DELIVERY")?.scheduledAt ?? null);
  return delivery ? format(addDays(delivery, INVOICE_TERM_DAYS), "dd MMM yyyy") : "-";
}

/**
 * The per-row actions, folded into one dropdown so the column stays a single
 * button. Built on the Popover (there is no dropdown-menu primitive here); the
 * content is portaled, so its clicks do not reach the row, and the trigger stops
 * its own click so opening the menu never opens the booking.
 */
function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Booking actions"
          onClick={(event) => event.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-40 p-1.5">
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-secondary"
          onClick={() => {
            setOpen(false);
            onEdit();
          }}
        >
          <Pencil className="h-4 w-4" /> Edit
        </button>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
          onClick={() => {
            setOpen(false);
            onDelete();
          }}
        >
          <Trash2 className="h-4 w-4" /> Delete
        </button>
      </PopoverContent>
    </Popover>
  );
}

export function AdminManageBookingsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  const [result, setResult] = useState<BookingListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pendingDelete, setPendingDelete] = useState<BookingRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Typing should not fire a request per keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const load = useCallback(async () => {
    setFetching(true);
    try {
      const data = await bookingService.list({
        search: debouncedSearch || undefined,
        page,
        pageSize: PAGE_SIZE,
        sortBy: "createdAt",
        sortDir: "desc",
      });
      setResult(data);
      setError(null);
    } catch (caught) {
      setError(
        caught instanceof ApiRequestError
          ? caught.message
          : "Could not load the bookings. Please try again.",
      );
    } finally {
      setLoading(false);
      setFetching(false);
    }
  }, [debouncedSearch, page]);

  useEffect(() => {
    void load();
  }, [load]);

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await bookingService.remove(pendingDelete.id);
      toast.success("Booking deleted", { description: pendingDelete.jobNumber });
      setPendingDelete(null);
      await load();
    } catch (caught) {
      toast.error("Could not delete that booking", {
        description:
          caught instanceof ApiRequestError ? caught.message : "Please try again in a moment.",
      });
    } finally {
      setDeleting(false);
    }
  }

  const rows = useMemo(() => result?.rows ?? [], [result]);
  const total = result?.total ?? 0;
  const totalPages = result?.totalPages ?? 1;

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Manage Bookings
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every booking raised from Create Booking - its job number, customer, where it
            loads and lands, and what we charge.
          </p>
        </div>

        <Button asChild>
          <Link to="/admin/bookings/new">
            <Plus className="h-4 w-4" /> Create Booking
          </Link>
        </Button>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[16rem] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search job number, customer, account number or reference"
            className="pl-10"
            aria-label="Search bookings"
          />
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={fetching}
          onClick={() => void load()}
          aria-label="Refresh"
        >
          <RotateCcw className={cn("h-4 w-4", fetching && "animate-spin")} />
        </Button>
      </div>

      {loading && !result ? (
        <PanelLoader label="Loading bookings" />
      ) : error ? (
        <PanelError message={error} onRetry={() => void load()} />
      ) : total === 0 && !debouncedSearch ? (
        <div className="grid min-h-[40vh] w-full place-items-center rounded-3xl border border-dashed border-border bg-card/50">
          <div className="flex max-w-sm flex-col items-center gap-4 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <CalendarDays className="h-6 w-6" />
            </span>
            <div>
              <p className="text-base font-semibold text-foreground">No bookings yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Raise one from Create Booking and it shows up here.
              </p>
            </div>
            <Button asChild>
              <Link to="/admin/bookings/new">
                <Plus className="h-4 w-4" /> Create Booking
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[56rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-border/70 bg-secondary/40 text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Job Number</th>
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium">Vendor</th>
                    <th className="px-4 py-3 font-medium">Pickup Date</th>
                    <th className="px-4 py-3 font-medium">Delivery Date</th>
                    <th className="px-4 py-3 font-medium">Vehicle Type</th>
                    <th className="px-4 py-3 font-medium">Invoice Payment Date</th>
                    <th className="px-4 py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row: BookingRow) => (
                    <tr
                      key={row.id}
                      onClick={() => navigate(`/admin/bookings/${row.id}`)}
                      className="cursor-pointer border-b border-border/50 last:border-0 transition-colors hover:bg-secondary/30"
                    >
                      <td className="px-4 py-3 font-medium text-primary underline-offset-2 hover:underline">
                        {row.jobNumber}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-foreground">{row.customerName || "-"}</div>
                        {row.customerAccountNumber && (
                          <div className="text-xs text-muted-foreground">
                            {row.customerAccountNumber}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{row.vendorName || "-"}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {stopDate(row.stops, "PICKUP")}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {stopDate(row.stops, "DELIVERY")}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{row.vehicleType || "-"}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {invoicePaymentDate(row.stops)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end">
                          <RowActions
                            onEdit={() => navigate(`/admin/bookings/${row.id}/edit`)}
                            onDelete={() => setPendingDelete(row)}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
            <p>
              {total} booking{total === 1 ? "" : "s"}
              {fetching ? " - refreshing" : ""}
            </p>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1 || fetching}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              <span>
                Page {page} of {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= totalPages || fetching}
                onClick={() => setPage((current) => current + 1)}
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete this booking?"
        description={
          pendingDelete
            ? `${pendingDelete.jobNumber} will be removed from Manage Bookings. Its job number stays taken and is not reused.`
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
