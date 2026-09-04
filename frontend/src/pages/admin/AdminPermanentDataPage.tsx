import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Building2,
  MapPin,
  Plus,
  RotateCcw,
  Search,
  Table2,
  Trash2,
  Truck,
  Wallet,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PanelError, PanelLoader } from "@/components/common/PanelState";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { DEFAULT_PAGE_SIZE, TablePager } from "@/components/admin/TablePager";
import { PermanentCustomerDialog } from "@/components/admin/permanent/PermanentCustomerDialog";
import { PermanentVendorDialog } from "@/components/admin/permanent/PermanentVendorDialog";
import {
  usePermanentCustomers,
  usePermanentVendors,
  useRefreshPermanentData,
} from "@/hooks/usePermanentData";
import {
  permanentDataService,
  type PermanentCustomer,
  type PermanentCustomerInput,
  type PermanentVendor,
  type PermanentVendorInput,
} from "@/services/permanentDataService";
import { ApiRequestError } from "@/services/api";
import { cn } from "@/lib/utils";

/**
 * Permanent Data - the pickups and the vendor prices we keep on file, so that
 * Create Booking is picked from rather than typed out.
 *
 * Two tabs, Customer and Vendor, and inside each the same two sections: Address
 * and Price. Both choices are kept in the URL rather than in state, so a reload
 * or a shared link opens on what it was left on; anything unrecognised falls
 * back to the first of each, which is what the page opens on.
 *
 * The sections are two views of one record, not two records. A row is added and
 * edited whole, in one dialog, whichever section it was opened from - so the
 * price of a pickup can never end up attached to a different address than the
 * one it was quoted for.
 *
 * Both lists are fetched once and cached. Searching, turning a page and moving
 * between the tabs are all done against what is already in the browser, so the
 * only time this page waits on the server is the first load and a save.
 */

type TabKey = "customer" | "vendor";
type SectionKey = "address" | "price";

const TABS: { key: TabKey; label: string; blurb: string; icon: typeof Building2 }[] = [
  {
    key: "customer",
    label: "Customer",
    blurb: "Our permanent pickups, the places a booking loads from most days.",
    icon: Building2,
  },
  {
    key: "vendor",
    label: "Vendor",
    blurb: "What we have agreed with each vendor, ready to fill a job in.",
    icon: Truck,
  },
];

const SECTIONS: { key: SectionKey; label: string; icon: typeof MapPin }[] = [
  { key: "address", label: "Address", icon: MapPin },
  { key: "price", label: "Price", icon: Wallet },
];

/**
 * How tall the scrolling part of a table is: ten rows under the header.
 *
 * Ten is what fits on a laptop without the page itself having to scroll, and it
 * stays ten whether the page holds 25 rows or 100 - the rest are reached by
 * scrolling the table, which keeps the pager and the header in view. Rows are a
 * fixed height for the same reason, so the tenth row always lands on the fold.
 */
const ROWS_ON_SCREEN = "max-h-[32.75rem]";

/** An amount as it reads in a table. A missing figure is a dash, not "0.00". */
function amount(value: string | null): string {
  if (value === null || value.trim() === "") return "-";
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(2) : value;
}

/** A percentage, in the same spirit. */
function percent(value: string | null): string {
  if (value === null || value.trim() === "") return "-";
  const parsed = Number(value);
  return Number.isFinite(parsed) ? `${parsed}%` : value;
}

const text = (value: string | null) => (value?.trim() ? value : "-");

/** The section picker, down the left of a tab. */
function SectionNav({
  section,
  onChange,
}: {
  section: SectionKey;
  onChange: (next: SectionKey) => void;
}) {
  return (
    <nav
      aria-label="Permanent data sections"
      className="flex gap-1.5 overflow-x-auto rounded-2xl border border-border/70 bg-card p-1.5 shadow-card lg:flex-col lg:overflow-visible"
    >
      {SECTIONS.map((entry) => {
        const Icon = entry.icon;
        const active = entry.key === section;
        return (
          <button
            key={entry.key}
            type="button"
            aria-current={active ? "page" : undefined}
            onClick={() => onChange(entry.key)}
            className={cn(
              "flex flex-1 items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium transition-colors lg:flex-none",
              active
                ? "bg-primary/[0.07] font-semibold text-primary"
                : "text-slate-600 hover:bg-secondary hover:text-foreground",
            )}
          >
            <Icon className="h-[1.125rem] w-[1.125rem] shrink-0" />
            <span>{entry.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

/**
 * The shell every table sits in.
 *
 * The header is sticky inside the scroller rather than above it, so a column
 * name is still there on the fortieth row of a hundred-row page.
 */
function TableShell({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-card">
      <div className={cn("overflow-auto", ROWS_ON_SCREEN)}>
        <table className="w-full min-w-[52rem] border-collapse text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="h-11 bg-secondary">
              {headers.map((header, index) => (
                <th
                  key={header || `col-${index}`}
                  className={cn(
                    "whitespace-nowrap border-b border-border/60 bg-secondary px-4 text-left text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground",
                    index === headers.length - 1 && "text-right",
                  )}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">{children}</tbody>
        </table>
      </div>
    </div>
  );
}

/** A cell whose content can outgrow its column: one line, full text on hover. */
function Clipped({ value, className }: { value: string; className?: string }) {
  return (
    <div className={cn("truncate", className)} title={value === "-" ? undefined : value}>
      {value}
    </div>
  );
}

/** Edit and Delete, the same pair on every row. */
function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <td className="whitespace-nowrap px-4 text-right">
      <div className="flex justify-end gap-1">
        <Button type="button" variant="ghost" size="sm" onClick={onEdit}>
          Edit
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:bg-red-50 hover:text-red-500"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Delete</span>
        </Button>
      </div>
    </td>
  );
}

/** Nothing saved yet, or nothing matching the search. */
function Empty({ searching, onAdd }: { searching: boolean; onAdd: () => void }) {
  return (
    <div className="grid min-h-[40vh] w-full place-items-center rounded-3xl border border-dashed border-border bg-card/50 p-6">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Table2 className="h-6 w-6" />
        </span>
        <div>
          <p className="text-base font-semibold text-foreground">
            {searching ? "Nothing matches that search" : "Nothing saved yet"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {searching
              ? "Try a shorter search, or clear it to see everything saved."
              : "Add a record here and Create Booking can fill itself in from it."}
          </p>
        </div>
        {!searching && (
          <Button type="button" onClick={onAdd}>
            <Plus className="h-4 w-4" /> Add a record
          </Button>
        )}
      </div>
    </div>
  );
}

/** Whether any of a row's searchable fields contains the term. */
function matches(term: string, ...fields: (string | null)[]): boolean {
  if (!term) return true;
  const needle = term.toLowerCase();
  return fields.some((field) => (field ?? "").toLowerCase().includes(needle));
}

const ROW = "h-12 align-middle";
const CELL = "whitespace-nowrap px-4 text-muted-foreground";
const CELL_STRONG = "whitespace-nowrap px-4 font-medium text-foreground";
const CELL_NUM = "whitespace-nowrap px-4 tabular-nums text-muted-foreground";
const CELL_NUM_STRONG = "whitespace-nowrap px-4 tabular-nums font-medium text-foreground";

export function AdminPermanentDataPage() {
  const [params, setParams] = useSearchParams();
  const tab: TabKey = params.get("tab") === "vendor" ? "vendor" : "customer";
  const section: SectionKey = params.get("section") === "price" ? "price" : "address";

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);

  const customers = usePermanentCustomers();
  const vendors = usePermanentVendors();
  const refresh = useRefreshPermanentData();

  const [customerDialog, setCustomerDialog] = useState<{
    open: boolean;
    row: PermanentCustomer | null;
  }>({ open: false, row: null });
  const [vendorDialog, setVendorDialog] = useState<{
    open: boolean;
    row: PermanentVendor | null;
  }>({ open: false, row: null });
  const [saving, setSaving] = useState(false);

  const [removing, setRemoving] = useState<{ kind: TabKey; id: string; label: string } | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);

  /**
   * Replaced rather than pushed, so moving between tabs and sections does not
   * fill the back button with steps that all belong to the same page. The
   * default of each is left out of the URL instead of spelled out.
   */
  const setParam = (key: "tab" | "section", value: string, fallback: string) => {
    const next = new URLSearchParams(params);
    if (value === fallback) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  // Page 4 of the customers is not page 4 of the vendors, and a search that
  // leaves three rows has no page 4 at all. Both send the table back to the top.
  useEffect(() => {
    setPage(1);
  }, [tab, search, pageSize]);

  const loading = tab === "customer" ? customers.isPending : vendors.isPending;
  const error = tab === "customer" ? customers.error : vendors.error;
  const refetching = customers.isFetching || vendors.isFetching;

  const term = search.trim();

  const filteredCustomers = useMemo(
    () =>
      (customers.data ?? []).filter((row) =>
        matches(
          term,
          row.pickUpCompany,
          row.clientJobId,
          row.reference,
          row.agreementType,
          row.suburb,
          row.state,
          row.fullAddress,
        ),
      ),
    [customers.data, term],
  );

  const filteredVendors = useMemo(
    () =>
      (vendors.data ?? []).filter((row) =>
        matches(term, row.vendorName, row.vendorJobId, row.suburb, row.state, row.fullAddress),
      ),
    [vendors.data, term],
  );

  const total = tab === "customer" ? filteredCustomers.length : filteredVendors.length;

  // The slice on screen. Everything above is already in memory, so turning a
  // page costs an array slice rather than a request.
  const start = (page - 1) * pageSize;
  const pageCustomers = filteredCustomers.slice(start, start + pageSize);
  const pageVendors = filteredVendors.slice(start, start + pageSize);

  const current = TABS.find((entry) => entry.key === tab) ?? TABS[0];

  function openAdd() {
    if (tab === "customer") setCustomerDialog({ open: true, row: null });
    else setVendorDialog({ open: true, row: null });
  }

  async function saveCustomer(values: PermanentCustomerInput) {
    setSaving(true);
    try {
      const editing = customerDialog.row;
      if (editing) await permanentDataService.updateCustomer(editing.id, values);
      else await permanentDataService.createCustomer(values);
      toast.success(editing ? "Saved pickup updated" : "Saved pickup added");
      setCustomerDialog({ open: false, row: null });
      await refresh();
    } catch (caught) {
      toast.error(
        caught instanceof ApiRequestError ? caught.message : "Could not save that pickup.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveVendor(values: PermanentVendorInput) {
    setSaving(true);
    try {
      const editing = vendorDialog.row;
      if (editing) {
        const { vendorId: _fixed, ...rest } = values;
        await permanentDataService.updateVendor(editing.id, rest);
      } else {
        await permanentDataService.createVendor(values);
      }
      toast.success(editing ? "Saved vendor price updated" : "Saved vendor price added");
      setVendorDialog({ open: false, row: null });
      await refresh();
    } catch (caught) {
      toast.error(
        caught instanceof ApiRequestError ? caught.message : "Could not save that vendor price.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!removing) return;
    setDeleting(true);
    try {
      if (removing.kind === "customer") await permanentDataService.deleteCustomer(removing.id);
      else await permanentDataService.deleteVendor(removing.id);
      toast.success("Deleted");
      setRemoving(null);
      await refresh();
    } catch (caught) {
      toast.error(caught instanceof ApiRequestError ? caught.message : "Could not delete that.");
    } finally {
      setDeleting(false);
    }
  }

  const pager = (
    <TablePager
      total={total}
      page={page}
      pageSize={pageSize}
      onPageChange={setPage}
      onPageSizeChange={setPageSize}
    />
  );

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Permanent Data
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{current.blurb}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search a company, reference or suburb"
              className="w-72 pl-9"
            />
          </div>
          {/* Searching and paging never ask the server, so this is the only way
              to pick up a record somebody else added while the page was open. */}
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={refetching}
            onClick={() => void refresh()}
          >
            <RotateCcw className={cn("h-4 w-4", refetching && "animate-spin")} />
            <span className="sr-only">Reload</span>
          </Button>
          <Button type="button" onClick={openAdd}>
            <Plus className="h-4 w-4" />
            {tab === "customer" ? "Add pickup" : "Add vendor price"}
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(value) => setParam("tab", value, "customer")}>
        <TabsList>
          {TABS.map((entry) => {
            const Icon = entry.icon;
            return (
              <TabsTrigger key={entry.key} value={entry.key} className="gap-2">
                <Icon className="h-4 w-4" />
                {entry.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {TABS.map((entry) => (
          <TabsContent key={entry.key} value={entry.key}>
            {/* The sidebar takes a fixed column and the table everything left,
                so the content grows with the screen instead of stopping at a
                width of its own. */}
            <div className="grid gap-4 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-6">
              <SectionNav
                section={section}
                onChange={(next) => setParam("section", next, "address")}
              />

              <div className="min-w-0">
                {loading ? (
                  <PanelLoader label="Loading permanent data" />
                ) : error ? (
                  <PanelError
                    message={
                      error instanceof ApiRequestError
                        ? error.message
                        : "Could not load the permanent data. Please try again."
                    }
                    onRetry={() => void refresh()}
                  />
                ) : total === 0 ? (
                  <Empty searching={term !== ""} onAdd={openAdd} />
                ) : entry.key === "customer" ? (
                  section === "address" ? (
                    <>
                      <TableShell
                        headers={[
                          "Client Job No",
                          "Pick-Up Company",
                          "Agreement",
                          "Reference",
                          "Trailer",
                          "Address",
                          "",
                        ]}
                      >
                        {pageCustomers.map((row) => (
                          <tr key={row.id} className={ROW}>
                            <td className={CELL_STRONG}>{row.clientJobId}</td>
                            <td className={cn(CELL_STRONG, "max-w-[18rem]")}>
                              <Clipped value={row.pickUpCompany} />
                            </td>
                            <td className={CELL}>{text(row.agreementType)}</td>
                            <td className={CELL}>{text(row.reference)}</td>
                            <td className={CELL}>{text(row.trailer)}</td>
                            <td className={cn(CELL, "max-w-[24rem]")}>
                              <Clipped value={text(row.fullAddress)} />
                            </td>
                            <RowActions
                              onEdit={() => setCustomerDialog({ open: true, row })}
                              onDelete={() =>
                                setRemoving({
                                  kind: "customer",
                                  id: row.id,
                                  label: row.pickUpCompany,
                                })
                              }
                            />
                          </tr>
                        ))}
                      </TableShell>
                      {pager}
                    </>
                  ) : (
                    <>
                      <TableShell
                        headers={[
                          "Client Job No",
                          "Pick-Up Company",
                          "Gross",
                          "Fuel Levy",
                          "Split Charge",
                          "Other Charges",
                          "GST",
                          "Net",
                          "Total",
                          "Final",
                          "",
                        ]}
                      >
                        {pageCustomers.map((row) => (
                          <tr key={row.id} className={ROW}>
                            <td className={CELL_STRONG}>{row.clientJobId}</td>
                            <td className={cn(CELL_STRONG, "max-w-[16rem]")}>
                              <Clipped value={row.pickUpCompany} />
                            </td>
                            <td className={CELL_NUM}>{amount(row.grossAmount)}</td>
                            <td className={CELL_NUM}>
                              {percent(row.fuelLevyPct)} / {amount(row.fuelLevyAmount)}
                            </td>
                            <td className={CELL_NUM}>
                              {percent(row.splitChargePct)} / {amount(row.splitChargeAmount)}
                            </td>
                            <td className={CELL_NUM}>
                              {percent(row.otherChargesPct)} / {amount(row.otherChargesAmount)}
                            </td>
                            <td className={CELL_NUM}>{amount(row.gstAmount)}</td>
                            <td className={CELL_NUM}>{amount(row.netAmount)}</td>
                            <td className={CELL_NUM_STRONG}>{amount(row.totalAmount)}</td>
                            <td className={CELL_NUM_STRONG}>{amount(row.finalAmount)}</td>
                            <RowActions
                              onEdit={() => setCustomerDialog({ open: true, row })}
                              onDelete={() =>
                                setRemoving({
                                  kind: "customer",
                                  id: row.id,
                                  label: row.pickUpCompany,
                                })
                              }
                            />
                          </tr>
                        ))}
                      </TableShell>
                      {pager}
                    </>
                  )
                ) : section === "address" ? (
                  <>
                    <TableShell
                      headers={["Vendor Job No", "Vendor", "Suburb", "State", "Address", ""]}
                    >
                      {pageVendors.map((row) => (
                        <tr key={row.id} className={ROW}>
                          <td className={CELL_STRONG}>{row.vendorJobId}</td>
                          <td className={cn(CELL_STRONG, "max-w-[18rem]")}>
                            <Clipped value={text(row.vendorName)} />
                          </td>
                          <td className={CELL}>{text(row.suburb)}</td>
                          <td className={CELL}>{text(row.state)}</td>
                          <td className={cn(CELL, "max-w-[24rem]")}>
                            <Clipped value={text(row.fullAddress)} />
                          </td>
                          <RowActions
                            onEdit={() => setVendorDialog({ open: true, row })}
                            onDelete={() =>
                              setRemoving({
                                kind: "vendor",
                                id: row.id,
                                label: row.vendorName ?? row.vendorJobId,
                              })
                            }
                          />
                        </tr>
                      ))}
                    </TableShell>
                    {pager}
                  </>
                ) : (
                  <>
                    <TableShell
                      headers={[
                        "Vendor Job No",
                        "Vendor",
                        "Gross A",
                        "Gross B",
                        "Fuel Levy",
                        "GST",
                        "Net",
                        "Total",
                        "",
                      ]}
                    >
                      {pageVendors.map((row) => (
                        <tr key={row.id} className={ROW}>
                          <td className={CELL_STRONG}>{row.vendorJobId}</td>
                          <td className={cn(CELL_STRONG, "max-w-[18rem]")}>
                            <Clipped value={text(row.vendorName)} />
                          </td>
                          <td className={CELL_NUM}>{amount(row.grossAmount)}</td>
                          <td className={CELL_NUM}>{amount(row.grossAmount2)}</td>
                          <td className={CELL_NUM}>
                            {percent(row.fuelLevyPct)} / {amount(row.fuelLevyAmount)}
                          </td>
                          <td className={CELL_NUM}>
                            {percent(row.gstPct)} / {amount(row.gstAmount)}
                          </td>
                          <td className={CELL_NUM}>{amount(row.netAmount)}</td>
                          <td className={CELL_NUM_STRONG}>{amount(row.totalAmount)}</td>
                          <RowActions
                            onEdit={() => setVendorDialog({ open: true, row })}
                            onDelete={() =>
                              setRemoving({
                                kind: "vendor",
                                id: row.id,
                                label: row.vendorName ?? row.vendorJobId,
                              })
                            }
                          />
                        </tr>
                      ))}
                    </TableShell>
                    {pager}
                  </>
                )}
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <PermanentCustomerDialog
        open={customerDialog.open}
        onOpenChange={(open) => setCustomerDialog((state) => ({ ...state, open }))}
        row={customerDialog.row}
        saving={saving}
        onSave={saveCustomer}
      />

      <PermanentVendorDialog
        open={vendorDialog.open}
        onOpenChange={(open) => setVendorDialog((state) => ({ ...state, open }))}
        row={vendorDialog.row}
        saving={saving}
        onSave={saveVendor}
      />

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="Delete this record?"
        description={`${removing?.label ?? "This record"} will be removed from Permanent Data. Bookings already raised keep the details they were saved with.`}
        confirmLabel="Delete"
        destructive
        busy={deleting}
        onConfirm={remove}
      />
    </DashboardLayout>
  );
}
