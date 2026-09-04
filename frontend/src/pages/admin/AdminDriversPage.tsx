import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  UserPlus,
} from "lucide-react";
import { PanelError, PanelLoader } from "@/components/common/PanelState";
import { DriverTable } from "@/components/admin/DriverTable";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminService, type AdminDriverRow } from "@/services/adminService";
import { ApiRequestError } from "@/services/api";
import { cn } from "@/lib/utils";
import { useDriverList, useRefreshAdminList } from "@/hooks/useAdminLists";
import { ONBOARDING_STATUS, ONBOARDING_STATUS_ORDER } from "@/constants/adminStatus";
import { licenceTypeLabel } from "@/services/driverOnboarding";
import { downloadWorkbook, stampedFileName, type SheetColumn } from "@/utils/spreadsheet";
import { prettyDate } from "@/utils/date";
import type { OnboardingStatus } from "@/services/driverService";

type SortBy = "createdAt" | "submittedAt" | "firstName" | "email" | "onboardingStatus";

const PAGE_SIZE = 25;
/** One request is enough for a whole-table export at any realistic fleet size. */
const EXPORT_PAGE_SIZE = 1000;
const ALL = "ALL";

/** The columns an export carries. Same order as the table reads. */
const EXPORT_COLUMNS: SheetColumn<AdminDriverRow>[] = [
  { header: "First name", value: (row) => row.firstName, width: 16 },
  { header: "Middle name", value: (row) => row.middleName, width: 16 },
  { header: "Last name", value: (row) => row.lastName, width: 16 },
  { header: "Email", value: (row) => row.email, width: 30 },
  { header: "Phone", value: (row) => row.phone, width: 18 },
  { header: "Date of birth", value: (row) => prettyDate(row.dateOfBirth), width: 16 },
  { header: "Country", value: (row) => row.country, width: 16 },
  {
    header: "Verification status",
    value: (row) => ONBOARDING_STATUS[row.onboardingStatus].label,
    width: 20,
  },
  { header: "Account status", value: (row) => row.status, width: 16 },
  { header: "Licence number", value: (row) => row.licence?.licenceNumber ?? null, width: 20 },
  { header: "Licence class", value: (row) => licenceTypeLabel(row.licence?.licenceType), width: 20 },
  { header: "Licence expiry", value: (row) => prettyDate(row.licence?.expiryDate), width: 16 },
  {
    header: "Licence verified",
    value: (row) => row.licence?.verificationStatus ?? null,
    width: 18,
  },
  {
    header: "Suburb",
    value: (row) => row.addresses.find((a) => a.type === "CURRENT")?.suburb ?? null,
    width: 18,
  },
  {
    header: "State",
    value: (row) => row.addresses.find((a) => a.type === "CURRENT")?.state ?? null,
    width: 18,
  },
  {
    header: "Country",
    value: (row) => row.addresses.find((a) => a.type === "CURRENT")?.country ?? null,
    width: 18,
  },
  { header: "Documents", value: (row) => row._count.documents, width: 12 },
  { header: "Submitted", value: (row) => prettyDate(row.submittedAt), width: 16 },
  { header: "Approved", value: (row) => prettyDate(row.approvedAt), width: 16 },
  { header: "Rejection reason", value: (row) => row.rejectionReason, width: 34 },
  { header: "Created", value: (row) => prettyDate(row.createdAt), width: 16 },
];

/** The Driver module: the register, its filters, and the export. */
export function AdminDriversPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const statusParam = searchParams.get("status");
  const status: OnboardingStatus | typeof ALL =
    statusParam && ONBOARDING_STATUS_ORDER.includes(statusParam as OnboardingStatus)
      ? (statusParam as OnboardingStatus)
      : ALL;

  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortBy>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");


  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<AdminDriverRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Typing should not fire a request per keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, sortBy, sortDir]);

  // The parameters are the cache key: a page of rows is only as good as what
  // fetched it, so page 2 sorted by name is its own entry and going back to
  // page 1 shows what is already in hand.
  const query = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      onboardingStatus: status === ALL ? undefined : status,
      page,
      pageSize: PAGE_SIZE,
      sortBy,
      sortDir,
    }),
    [debouncedSearch, status, page, sortBy, sortDir],
  );

  const { data: result, isPending: loading, error: loadError, isFetching, refetch } =
    useDriverList(query);
  const refresh = useRefreshAdminList("drivers");

  const error =
    loadError === null
      ? null
      : loadError instanceof ApiRequestError
        ? loadError.message
        : "Could not load the drivers. Please try again.";

  // Memoised because of the `?? []`: while nothing is loaded that literal is a
  // new array on every render, and the memo below takes it as a dependency, so
  // the filter would run every time and memoise nothing.
  const rows = useMemo(() => result?.rows ?? [], [result]);

  const selectedRows = useMemo(
    () => rows.filter((row) => selected.has(row.id)),
    [rows, selected],
  );

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((current) => {
      const allSelected = rows.length > 0 && rows.every((row) => current.has(row.id));
      const next = new Set(current);
      for (const row of rows) {
        if (allSelected) next.delete(row.id);
        else next.add(row.id);
      }
      return next;
    });
  }

  function setStatusFilter(value: string) {
    const next = new URLSearchParams(searchParams);
    if (value === ALL) next.delete("status");
    else next.set("status", value);
    setSearchParams(next, { replace: true });
  }

  function sort(column: SortBy) {
    if (column === sortBy) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(column);
    setSortDir(column === "firstName" || column === "email" ? "asc" : "desc");
  }

  /** Exports the current selection, or the whole filtered set when nothing is ticked. */
  async function exportToExcel(scope: "selected" | "all") {
    setExporting(true);
    try {
      let exportRows: AdminDriverRow[];

      if (scope === "selected") {
        exportRows = selectedRows;
      } else {
        // Everything matching the current filter, not just the page on screen.
        const all = await adminService.listDrivers({
          search: debouncedSearch || undefined,
          onboardingStatus: status === ALL ? undefined : status,
          page: 1,
          pageSize: EXPORT_PAGE_SIZE,
          sortBy,
          sortDir,
        });
        exportRows = all.rows;
      }

      if (exportRows.length === 0) {
        toast.error("Nothing to export", { description: "No drivers match this view." });
        return;
      }

      downloadWorkbook({
        fileName: stampedFileName(scope === "selected" ? "drivers-selected" : "drivers"),
        sheet: "Drivers",
        columns: EXPORT_COLUMNS,
        rows: exportRows,
      });

      toast.success(`Exported ${exportRows.length} driver${exportRows.length === 1 ? "" : "s"}`, {
        description: "Saved as an Excel workbook.",
      });
    } catch (caught) {
      toast.error("Export failed", {
        description:
          caught instanceof ApiRequestError ? caught.message : "Please try again in a moment.",
      });
    } finally {
      setExporting(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await adminService.deleteDriver(pendingDelete.id);
      toast.success("Driver removed", {
        description: `${pendingDelete.email} is deleted permanently and can sign up again.`,
      });
      setSelected((current) => {
        const next = new Set(current);
        next.delete(pendingDelete.id);
        return next;
      });
      setPendingDelete(null);
      await refresh();
    } catch (caught) {
      toast.error("Could not remove that driver", {
        description:
          caught instanceof ApiRequestError ? caught.message : "Please try again in a moment.",
      });
    } finally {
      setDeleting(false);
    }
  }

  const total = result?.total ?? 0;
  const totalPages = result?.totalPages ?? 1;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Driver Onboarding
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every driver account, their verification status and their documents.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => void exportToExcel("selected")}
            disabled={exporting || selected.size === 0}
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export selected{selected.size > 0 ? ` (${selected.size})` : ""}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void exportToExcel("all")}
            disabled={exporting}
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export all
          </Button>
          <Button asChild>
            <Link to="/admin/onboarding/driver/new">
              <Plus className="h-4 w-4" /> New driver
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[16rem] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, email or phone"
            className="pl-10"
            aria-label="Search drivers"
          />
        </div>

        <Select value={status} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {ONBOARDING_STATUS_ORDER.map((value) => (
              <SelectItem key={value} value={value}>
                {ONBOARDING_STATUS[value].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={isFetching}
          onClick={() => void refetch()}
          aria-label="Refresh"
        >
          <RotateCcw className={cn("h-4 w-4", isFetching && "animate-spin")} />
        </Button>

        {selected.size > 0 && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
            Clear selection
          </Button>
        )}
      </div>

      {loading && !result ? (
        <PanelLoader label="Loading drivers" />
      ) : error ? (
        <PanelError message={error} onRetry={() => void refetch()} />
      ) : total === 0 && !debouncedSearch && status === ALL ? (
        <div className="grid min-h-[40vh] w-full place-items-center rounded-3xl border border-dashed border-border bg-card/50">
          <div className="flex max-w-sm flex-col items-center gap-4 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <UserPlus className="h-6 w-6" />
            </span>
            <div>
              <p className="text-base font-semibold text-foreground">No drivers yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Create one here, or wait for a driver to register themselves.
              </p>
            </div>
            <Button asChild>
              <Link to="/admin/onboarding/driver/new">
                <Plus className="h-4 w-4" /> New driver
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <>
          <DriverTable
            rows={rows}
            selected={selected}
            onToggle={toggle}
            onToggleAll={toggleAll}
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={sort}
            onDelete={setPendingDelete}
          />

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
            <p>
              {total} driver{total === 1 ? "" : "s"}
              {selected.size > 0 ? ` - ${selected.size} selected` : ""}
              {loading ? " - refreshing" : ""}
            </p>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1 || loading}
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
                disabled={page >= totalPages || loading}
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
        title="Remove this driver?"
        description={
          pendingDelete
            ? `${pendingDelete.email} will be deleted permanently, along with their documents. This cannot be undone. The email address becomes free to sign up with again.`
            : ""
        }
        confirmLabel="Remove driver"
        destructive
        busy={deleting}
        onConfirm={confirmDelete}
      />
    </>
  );
}
