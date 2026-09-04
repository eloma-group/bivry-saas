import { useEffect, useMemo, useState } from "react";
import { useFormContext } from "react-hook-form";
import { Handshake, Loader2, RotateCcw } from "lucide-react";
import { SectionCard } from "@/components/form/SectionCard";
import { FieldShell } from "@/components/form/Fields";
import { PriceFields } from "./PriceFields";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminService, type AdminVendorRow } from "@/services/adminService";
import {
  permanentDataService,
  type PermanentVendor,
} from "@/services/permanentDataService";
import { ACCOUNT_STATUS } from "@/constants/adminStatus";
import { ApiRequestError } from "@/services/api";

/** One labelled read-only line in the fetched-details panel. */
function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-sm text-foreground">{value?.trim() ? value : "-"}</span>
    </div>
  );
}

/**
 * Section 6 - which vendor carries the job, and at what price.
 *
 * The dropdown lists every existing vendor; picking one shows who they are and
 * whether their account is live, read-only, so the choice can be checked without
 * leaving the booking. Where we have a price on file for them - Permanent Data,
 * Vendor tab - picking them fills the grid below with it, so an agreed rate is
 * not typed out again on every job. It is filled in, not locked: the figures
 * stay editable for the job that runs at something else.
 * The price grid below is a second, independent copy of the Our Price fields -
 * same arithmetic, its own values (base "vendorPrice"), never linked to ours.
 * It asks for the gross once per trailer rather than once for the job, because a
 * load split across two trailers is quoted as two figures; everything under them
 * is worked out from the sum. Our Price still asks for a single gross.
 */
export function VendorAllotmentSection() {
  const { setValue, watch } = useFormContext();
  const [vendors, setVendors] = useState<AdminVendorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** What we have agreed with each vendor, by vendor id. */
  const [saved, setSaved] = useState<Map<string, PermanentVendor>>(new Map());

  const selectedId = watch("vendor.vendorId") as string | undefined;

  async function loadVendors() {
    setLoading(true);
    setError(null);
    try {
      // One page is enough to hold every vendor for the dropdown.
      const result = await adminService.listVendors({
        pageSize: 1000,
        sortBy: "companyName",
        sortDir: "asc",
      });
      setVendors(result.rows);
    } catch (caught) {
      setError(
        caught instanceof ApiRequestError
          ? caught.message
          : "Could not load vendors. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadVendors();
  }, []);

  // The saved prices, loaded alongside the vendors. A booking is still workable
  // without them - the grid is simply typed in - so a failure here is silent
  // rather than an error over a section that otherwise works.
  useEffect(() => {
    let live = true;
    void permanentDataService
      .listVendors()
      .then((rows) => {
        if (live) setSaved(new Map(rows.map((row) => [row.vendorId, row])));
      })
      .catch(() => undefined);

    return () => {
      live = false;
    };
  }, []);

  const selected = useMemo(
    () => vendors.find((vendor) => vendor.id === selectedId) ?? null,
    [vendors, selectedId],
  );

  /** The saved price behind the vendor on screen, if there is one. */
  const agreed = selectedId ? saved.get(selectedId) : undefined;

  function pickVendor(id: string) {
    const vendor = vendors.find((row) => row.id === id);
    setValue("vendor.vendorId", id, { shouldDirty: true });
    setValue("vendor.vendorName", vendor?.companyName ?? "", { shouldDirty: true });

    // The price we have on file for them. Only the typed figures are written:
    // the levy amount, GST, net and total are worked out from these by the grid
    // itself, so setting them here would be a second, staler answer. A vendor
    // with nothing saved clears the grid, so it always answers for the vendor
    // now chosen rather than for the last one.
    const agreed = saved.get(id);
    const write = (field: string, value: string | null) =>
      setValue(`vendorPrice.${field}`, value ?? "", { shouldDirty: true });

    write("grossAmount", agreed?.grossAmount ?? "");
    write("grossAmount2", agreed?.grossAmount2 ?? "");
    write("fuelLevyPct", agreed?.fuelLevyPct ?? "");
    write("gstPct", agreed?.gstPct ?? "");
  }

  return (
    <SectionCard
      index={6}
      id="step-vendor"
      icon={Handshake}
      title="Vendor Allotment & Price"
      description="Who carries the job, and the price agreed with them. This price is separate from Our Price above."
    >
      <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <FieldShell
          label="Vendor Details"
          required
          hint="Pick a vendor to pull their details in below."
          className="sm:col-span-2 lg:col-span-1"
        >
          {error ? (
            <div className="flex items-center gap-2">
              <p className="flex-1 text-xs font-medium text-red-500">{error}</p>
              <Button type="button" variant="ghost" size="icon" onClick={() => void loadVendors()}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Select value={selectedId ?? ""} onValueChange={pickVendor} disabled={loading}>
              <SelectTrigger>
                <SelectValue
                  placeholder={loading ? "Loading vendors…" : "Select a vendor"}
                />
              </SelectTrigger>
              <SelectContent>
                {vendors.length === 0 && !loading ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">No vendors found</div>
                ) : (
                  vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.companyName}
                      {vendor.vendorCode ? ` (${vendor.vendorCode})` : ""}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          )}
        </FieldShell>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground sm:col-span-2 lg:col-span-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading vendors…
          </div>
        )}
      </div>

      {/* Enough of the chosen vendor to know it is the right one and that it can
          take the job. The rest of their record is a click away on the vendor's
          own page, and repeating it here only buried these three. */}
      {selected && (
        <div className="mb-6 rounded-2xl border border-border/60 bg-secondary/30 p-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Detail label="Company Name" value={selected.companyName} />
            <Detail label="Vendor ID" value={selected.vendorCode} />
            <Detail label="Status" value={ACCOUNT_STATUS[selected.status]?.label} />
            <Detail
              label="Saved Price"
              value={agreed ? `${agreed.vendorJobId}, filled in below` : "None on file"}
            />
          </div>
        </div>
      )}

      <PriceFields base="vendorPrice" splitGross />
    </SectionCard>
  );
}
