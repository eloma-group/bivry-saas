import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Plus,
  RotateCcw,
  Search,
} from "lucide-react";
import { PanelError, PanelLoader } from "@/components/common/PanelState";
import { VendorTable } from "@/components/admin/VendorTable";
import { VendorFormDialog } from "@/components/admin/VendorFormDialog";
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
import { adminService, type AdminVendorRow, type VendorListResult } from "@/services/adminService";
import { ApiRequestError } from "@/services/api";
import { ONBOARDING_STATUS, ONBOARDING_STATUS_ORDER } from "@/constants/adminStatus";
import { downloadWorkbook, stampedFileName, type SheetColumn } from "@/utils/spreadsheet";
import { prettyDate } from "@/utils/date";
import type { OnboardingStatus } from "@/services/driverService";

type SortBy = "createdAt" | "submittedAt" | "companyName" | "email" | "onboardingStatus";

const PAGE_SIZE = 25;
/** One request is enough for a whole-table export at any realistic supplier count. */
const EXPORT_PAGE_SIZE = 1000;
const ALL = "ALL";

/** The columns an export carries. Same order as the table reads. */
const EXPORT_COLUMNS: SheetColumn<AdminVendorRow>[] = [
  { header: "Supplier ID", value: (row) => row.supplierId, width: 16 },
  { header: "Company name", value: (row) => row.companyName, width: 26 },
  { header: "Trading name", value: (row) => row.tradingName, width: 24 },
  { header: "Legal name", value: (row) => row.legalName, width: 24 },
  { header: "ABN", value: (row) => row.abn, width: 16 },
  { header: "Email", value: (row) => row.email, width: 30 },
  { header: "Phone", value: (row) => row.phone, width: 18 },
  { header: "Contact person", value: (row) => row.contactPerson, width: 20 },
  { header: "Website", value: (row) => row.websiteAddress, width: 24 },
  {
    header: "Verification status",
    value: (row) => ONBOARDING_STATUS[row.onboardingStatus].label,
    width: 20,
  },
  { header: "Account status", value: (row) => row.status, width: 16 },
  {
    header: "Accreditation number",
    value: (row) => row.accreditation?.accreditationNumber ?? null,
    width: 22,
  },
  {
    header: "NHVAS expiry",
    value: (row) => prettyDate(row.accreditation?.nhvasExpiry),
    width: 16,
  },
  {
    header: "Accreditation verified",
    value: (row) => row.accreditation?.verificationStatus ?? null,
    width: 20,
  },
  {
    header: "Areas covered",
    value: (row) => (row.coverage?.areasCovered ?? []).join(", "),
    width: 34,
  },
  {
    header: "Business operations",
    value: (row) => (row.coverage?.businessOperations ?? []).join(", "),
    width: 34,
  },
  { header: "Warehouses", value: (row) => row.warehouses.length, width: 14 },
  { header: "Documents", value: (row) => row._count.documents, width: 12 },
  { header: "Submitted", value: (row) => prettyDate(row.submittedAt), width: 16 },
  { header: "Approved", value: (row) => prettyDate(row.approvedAt), width: 16 },
  { header: "Rejection reason", value: (row) => row.rejectionReason, width: 34 },
  { header: "Created", value: (row) => prettyDate(row.createdAt), width: 16 },
];

/** The Supplier module: the register, its filters, and the export. */
export function AdminVendorsPage() {
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

  const [result, setResult] = useState<VendorListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<AdminVendorRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Typing should not fire a request per keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, sortBy, sortDir]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setResult(
        await adminService.listVendors({
          search: debouncedSearch || undefined,
          onboardingStatus: status === ALL ? undefined : status,
          page,
          pageSize: PAGE_SIZE,
          sortBy,
          sortDir,
        }),
      );
    } catch (caught) {
      setError(
        caught instanceof ApiRequestError
          ? caught.message
          : "Could not load the suppliers. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, status, page, sortBy, sortDir]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = result?.rows ?? [];

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
    setSortDir(column === "companyName" || column === "email" ? "asc" : "desc");
  }

  /** Exports the current selection, or the whole filtered set when nothing is ticked. */
  async function exportToExcel(scope: "selected" | "all") {
    setExporting(true);
    try {
      let exportRows: AdminVendorRow[];

      if (scope === "selected") {
        exportRows = selectedRows;
      } else {
        // Everything matching the current filter, not just the page on screen.
        const all = await adminService.listVendors({
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
        toast.error("Nothing to export", { description: "No suppliers match this view." });
        return;
      }

      downloadWorkbook({
        fileName: stampedFileName(scope === "selected" ? "suppliers-selected" : "suppliers"),
        sheet: "Suppliers",
        columns: EXPORT_COLUMNS,
        rows: exportRows,
      });

      toast.success(
        `Exported ${exportRows.length} supplier${exportRows.length === 1 ? "" : "s"}`,
        { description: "Saved as an Excel workbook." },
      );
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
      await adminService.deleteVendor(pendingDelete.id);
      toast.success("Supplier removed", {
        description: `${pendingDelete.email} is deleted permanently and can sign up again.`,
      });
      setSelected((current) => {
        const next = new Set(current);
        next.delete(pendingDelete.id);
        return next;
      });
      setPendingDelete(null);
      await load();
    } catch (caught) {
      toast.error("Could not remove that supplier", {
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
            Supplier Onboarding
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every supplier account, their verification status and their compliance pack.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => void exportToExcel("selected")}
            disabled={exporting || selected.size === 0}
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export selected{selected.size > 0 ? ` (${selected.size})` : ""}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void exportToExcel("all")}
            disabled={exporting}
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export all
          </Button>
          <Button type="button" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> New supplier
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
            placeholder="Search company, supplier ID, ABN, email or phone"
            className="pl-10"
            aria-label="Search suppliers"
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
          onClick={() => void load()}
          aria-label="Refresh"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>

        {selected.size > 0 && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
            Clear selection
          </Button>
        )}
      </div>

      {loading && !result ? (
        <PanelLoader label="Loading suppliers" />
      ) : error ? (
        <PanelError message={error} onRetry={() => void load()} />
      ) : total === 0 && !debouncedSearch && status === ALL ? (
        <div className="grid min-h-[40vh] w-full place-items-center rounded-3xl border border-dashed border-border bg-card/50">
          <div className="flex max-w-sm flex-col items-center gap-4 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Building2 className="h-6 w-6" />
            </span>
            <div>
              <p className="text-base font-semibold text-foreground">No suppliers yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Create one here, or wait for a supplier to register themselves.
              </p>
            </div>
            <Button type="button" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> New supplier
            </Button>
          </div>
        </div>
      ) : (
        <>
          <VendorTable
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
              {total} supplier{total === 1 ? "" : "s"}
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

      <VendorFormDialog
        open={creating}
        onOpenChange={setCreating}
        onSaved={() => void load()}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Remove this supplier?"
        description={
          pendingDelete
            ? `${pendingDelete.email} will be deleted permanently, along with their documents. This cannot be undone. The email address becomes free to sign up with again.`
            : ""
        }
        confirmLabel="Remove supplier"
        destructive
        busy={deleting}
        onConfirm={confirmDelete}
      />
    </>
  );
}
