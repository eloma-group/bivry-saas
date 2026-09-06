import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileText,
  RotateCcw,
  Search,
} from "lucide-react";
import { addDays, format } from "date-fns";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PanelError, PanelLoader } from "@/components/common/PanelState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { prettyDate, toDate } from "@/utils/date";
import { PAYMENT_STATUS } from "@/constants/adminStatus";
import { ApiRequestError } from "@/services/api";
import {
  vendorBookingService,
  type VendorBookingListResult,
  type VendorBookingRow,
  type BookingStopRow,
} from "@/services/bookingService";

/**
 * Manage Bookings (Vendor).
 *
 * The jobs an admin has allotted to this vendor. It reads the same bookings the
 * admin raises, filtered to this vendor on the server, so a booking created for
 * them shows here the moment it is saved. A vendor sees only their own part of
 * it: the job, where it loads and lands, and their allotment - never the
 * customer or what we charge them, which the server does not send to a vendor.
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

export function VendorManageBookingsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  const [result, setResult] = useState<VendorBookingListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const data = await vendorBookingService.list({
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
          : "Could not load your bookings. Please try again.",
      );
    } finally {
      setLoading(false);
      setFetching(false);
    }
  }, [debouncedSearch, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => result?.rows ?? [], [result]);
  const total = result?.total ?? 0;
  const totalPages = result?.totalPages ?? 1;

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Manage Bookings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The jobs allotted to you - the job number, where each loads and lands, the
          vehicle, and what you are paid.
        </p>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[16rem] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search job number or reference"
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
                When a booking is allotted to you it shows up here.
              </p>
            </div>
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
                    <th className="px-4 py-3 font-medium">Pickup Date</th>
                    <th className="px-4 py-3 font-medium">Delivery Date</th>
                    <th className="px-4 py-3 font-medium">Vehicle Type</th>
                    <th className="px-4 py-3 font-medium">Invoice Payment Date</th>
                    <th className="px-4 py-3 font-medium">Payment Status</th>
                    <th className="px-4 py-3 text-right font-medium">Documents</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row: VendorBookingRow) => (
                    <tr
                      key={row.id}
                      onClick={() => navigate(`/vendor/bookings/${row.id}`)}
                      className="cursor-pointer border-b border-border/50 last:border-0 transition-colors hover:bg-secondary/30"
                    >
                      <td className="px-4 py-3 font-medium text-primary underline-offset-2 hover:underline">
                        {row.jobNumber}
                      </td>
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
                        <Badge variant={PAYMENT_STATUS[row.paymentStatus].variant}>
                          {PAYMENT_STATUS[row.paymentStatus].label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(event) => {
                              // The row itself opens Details; this opens straight
                              // onto the Documents tab instead.
                              event.stopPropagation();
                              navigate(`/vendor/bookings/${row.id}?tab=documents`);
                            }}
                          >
                            <FileText className="h-4 w-4" /> View
                          </Button>
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
    </DashboardLayout>
  );
}
