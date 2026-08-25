import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Plus, RotateCw, Search, Trash2 } from "lucide-react";
import { PanelError, PanelLoader } from "@/components/common/PanelState";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  adminService,
  type AccountStatus,
  type SimpleAccount,
  type SimpleAccountListResult,
} from "@/services/adminService";
import { ApiRequestError } from "@/services/api";
import type { SimpleAccountModule } from "./simpleAccountModules";

const ALL = "all" as const;

const STATUSES: { value: AccountStatus; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: "ACTIVE", label: "Active" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "DEACTIVATED", label: "Deactivated" },
];

const STATUS_VARIANT: Record<AccountStatus, "success" | "secondary" | "danger" | "warning"> = {
  PENDING: "warning",
  ACTIVE: "success",
  SUSPENDED: "danger",
  DEACTIVATED: "secondary",
};

function cell(row: SimpleAccount, name: string): string {
  const value = row[name];
  return typeof value === "string" && value.trim() ? value : "-";
}

/** The list behind one plain account module. See simpleAccountModules.ts. */
export function AdminSimpleAccountsPage({ module }: { module: SimpleAccountModule }) {
  const api = adminService.simpleAccounts(module.path);

  const [result, setResult] = useState<SimpleAccountListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<AccountStatus | typeof ALL>(ALL);
  const [page, setPage] = useState(1);

  const [pendingDelete, setPendingDelete] = useState<SimpleAccount | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setResult(
        await api.list({
          search: search.trim() || undefined,
          status: status === ALL ? undefined : status,
          page,
          pageSize: 20,
        }),
      );
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not load these accounts");
    } finally {
      setLoading(false);
    }
    // `api` is rebuilt on every render but is bound only to module.path.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [module.path, search, status, page]);

  // Typing should not fire a request per keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await api.remove(pendingDelete.id);
      toast.success("Account removed", {
        description: `${pendingDelete.email} is deleted permanently and can sign up again.`,
      });
      setPendingDelete(null);
      await load();
    } catch (err) {
      toast.error("Could not remove that account", {
        description:
          err instanceof ApiRequestError
            ? err.message
            : "Please check your connection and try again.",
      });
    } finally {
      setDeleting(false);
    }
  }

  const columns = module.fields.filter((field) => field.inTable);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {module.plural}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{module.blurb}</p>
        </div>

        <Button asChild>
          <Link to={`/admin/onboarding/${module.slug}/new`}>
            <Plus className="h-4 w-4" /> New {module.label}
          </Link>
        </Button>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[16rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder={`Search ${module.plural.toLowerCase()}`}
            className="pl-9"
            aria-label={`Search ${module.plural.toLowerCase()}`}
          />
        </div>

        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value as AccountStatus | typeof ALL);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-48" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {STATUSES.map((entry) => (
              <SelectItem key={entry.value} value={entry.value}>
                {entry.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button type="button" variant="outline" size="icon" onClick={() => void load()} aria-label="Refresh">
          <RotateCw className="h-4 w-4" />
        </Button>
      </div>

      {loading && !result ? (
        <PanelLoader label={`Loading ${module.plural.toLowerCase()}`} />
      ) : error ? (
        <PanelError message={error} onRetry={() => void load()} />
      ) : !result || result.rows.length === 0 ? (
        <div className="rounded-3xl border border-border/70 bg-card p-10 text-center shadow-card">
          <p className="text-base font-semibold text-foreground">
            No {module.plural.toLowerCase()} yet
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create one here, or clear the filters above if you were expecting some.
          </p>
          <Button asChild className="mt-5">
            <Link to={`/admin/onboarding/${module.slug}/new`}>
              <Plus className="h-4 w-4" /> New {module.label}
            </Link>
          </Button>
        </div>
      ) : (
        <>
          {/* Wide tables scroll inside their own box so the page never does. */}
          <div className="overflow-x-auto rounded-3xl border border-border/70 bg-card shadow-card">
            <table className="w-full min-w-[52rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/70 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {columns.map((field) => (
                    <th key={field.name} className="px-5 py-4">
                      {field.label}
                    </th>
                  ))}
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row) => (
                  <tr key={row.id} className="border-b border-border/50 last:border-0">
                    {columns.map((field) => (
                      <td key={field.name} className="px-5 py-4 text-foreground">
                        {cell(row, field.name)}
                      </td>
                    ))}
                    <td className="px-5 py-4">
                      <Badge variant={STATUS_VARIANT[row.status]}>{row.status}</Badge>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button asChild variant="ghost" size="sm">
                          <Link to={`/admin/onboarding/${module.slug}/${row.id}/edit`}>Open</Link>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:bg-red-50 hover:text-destructive"
                          onClick={() => setPendingDelete(row)}
                          aria-label={`Remove ${row.email}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {result.total} {result.total === 1 ? module.label : `${module.label}s`}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={result.page <= 1 || loading}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {result.page} of {result.totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={result.page >= result.totalPages || loading}
                onClick={() => setPage((current) => current + 1)}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Next"}
              </Button>
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title={`Remove this ${module.label}?`}
        description={
          pendingDelete
            ? `${pendingDelete.email} will be deleted permanently. This cannot be undone. The email address becomes free to sign up with again.`
            : ""
        }
        confirmLabel={`Remove ${module.label}`}
        destructive
        busy={deleting}
        onConfirm={confirmDelete}
      />
    </>
  );
}
