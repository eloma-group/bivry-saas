import { Link } from "react-router-dom";
import { ArrowDown, ArrowUp, FileText, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ExpiryBadge } from "@/components/driver/ExpiryBadge";
import { ONBOARDING_STATUS, ACCOUNT_STATUS } from "@/constants/adminStatus";
import { licenceTypeLabel } from "@/services/driverOnboarding";
import { prettyDate } from "@/utils/date";
import { cn } from "@/lib/utils";
import type { AdminDriverRow, DriverListParams } from "@/services/adminService";

type SortBy = NonNullable<DriverListParams["sortBy"]>;

interface DriverTableProps {
  rows: AdminDriverRow[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  sortBy: SortBy;
  sortDir: "asc" | "desc";
  onSort: (column: SortBy) => void;
  onDelete: (row: AdminDriverRow) => void;
}

function fullName(row: AdminDriverRow): string {
  return [row.firstName, row.middleName, row.lastName].filter(Boolean).join(" ") || row.email;
}

function SortableHeader({
  column,
  label,
  sortBy,
  sortDir,
  onSort,
  className,
}: {
  column: SortBy;
  label: string;
  sortBy: SortBy;
  sortDir: "asc" | "desc";
  onSort: (column: SortBy) => void;
  className?: string;
}) {
  const active = sortBy === column;
  const Arrow = sortDir === "asc" ? ArrowUp : ArrowDown;

  return (
    <th scope="col" className={cn("whitespace-nowrap px-4 py-3 text-left", className)}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className={cn(
          "inline-flex items-center gap-1.5 font-semibold transition-colors",
          active ? "text-foreground" : "hover:text-foreground",
        )}
      >
        {label}
        <Arrow className={cn("h-3.5 w-3.5", active ? "opacity-100" : "opacity-0")} />
      </button>
    </th>
  );
}

/**
 * The driver register.
 *
 * Scrolls inside its own container so a wide table never makes the page scroll
 * sideways, and the header row stays put while the body scrolls.
 */
export function DriverTable({
  rows,
  selected,
  onToggle,
  onToggleAll,
  sortBy,
  sortDir,
  onSort,
  onDelete,
}: DriverTableProps) {
  const allSelected = rows.length > 0 && rows.every((row) => selected.has(row.id));
  const someSelected = rows.some((row) => selected.has(row.id));

  return (
    <div className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[64rem] border-collapse text-sm">
          <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th scope="col" className="w-12 px-4 py-3">
                <Checkbox
                  checked={allSelected ? true : someSelected ? "indeterminate" : false}
                  onCheckedChange={onToggleAll}
                  aria-label="Select every driver on this page"
                />
              </th>
              <SortableHeader
                column="firstName"
                label="Driver"
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableHeader
                column="email"
                label="Contact"
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableHeader
                column="onboardingStatus"
                label="Verification"
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <th scope="col" className="whitespace-nowrap px-4 py-3 text-left font-semibold">
                Licence
              </th>
              <th scope="col" className="whitespace-nowrap px-4 py-3 text-left font-semibold">
                Docs
              </th>
              <SortableHeader
                column="submittedAt"
                label="Submitted"
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <th scope="col" className="w-28 px-4 py-3 text-right font-semibold">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border/60">
            {rows.map((row) => {
              const status = ONBOARDING_STATUS[row.onboardingStatus];
              const account = ACCOUNT_STATUS[row.status];
              const isSelected = selected.has(row.id);

              return (
                <tr
                  key={row.id}
                  className={cn(
                    "transition-colors",
                    isSelected ? "bg-primary/[0.04]" : "hover:bg-secondary/40",
                  )}
                >
                  <td className="px-4 py-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onToggle(row.id)}
                      aria-label={`Select ${fullName(row)}`}
                    />
                  </td>

                  <td className="px-4 py-3">
                    <Link
                      to={`/admin/onboarding/driver/${row.id}`}
                      className="font-medium text-foreground hover:text-primary hover:underline"
                    >
                      {fullName(row)}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {row.country || "Country not set"}
                    </p>
                  </td>

                  <td className="px-4 py-3">
                    <p className="text-foreground">{row.email}</p>
                    <p className="text-xs text-muted-foreground">{row.phone || "No phone"}</p>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex flex-col items-start gap-1.5">
                      <Badge variant={status.variant}>{status.label}</Badge>
                      <Badge variant={account.variant}>{account.label}</Badge>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    {row.licence?.licenceNumber ? (
                      <>
                        <p className="text-foreground">{row.licence.licenceNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          {licenceTypeLabel(row.licence.licenceType) || "Class not set"}
                        </p>
                        <div className="mt-1">
                          <ExpiryBadge expiry={row.licence.expiryDate} />
                        </div>
                      </>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-foreground">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      {row._count.documents}
                    </span>
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {row.submittedAt ? prettyDate(row.submittedAt) : "-"}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button asChild variant="ghost" size="sm">
                        <Link to={`/admin/onboarding/driver/${row.id}`}>Open</Link>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:bg-red-50 hover:text-red-600"
                        onClick={() => onDelete(row)}
                        aria-label={`Remove ${fullName(row)}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <p className="px-6 py-12 text-center text-sm text-muted-foreground">
          No drivers match this view.
        </p>
      )}
    </div>
  );
}
