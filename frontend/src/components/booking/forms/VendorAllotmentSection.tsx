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
 * The dropdown lists every existing vendor; picking one pulls that vendor's own
 * details straight in and shows them read-only, so there is nothing to retype.
 * The price grid below is a second, independent copy of the Our Price fields -
 * same arithmetic, its own values (base "vendorPrice"), never linked to ours.
 */
export function VendorAllotmentSection() {
  const { setValue, watch } = useFormContext();
  const [vendors, setVendors] = useState<AdminVendorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const selected = useMemo(
    () => vendors.find((vendor) => vendor.id === selectedId) ?? null,
    [vendors, selectedId],
  );

  function pickVendor(id: string) {
    const vendor = vendors.find((row) => row.id === id);
    setValue("vendor.vendorId", id, { shouldDirty: true });
    setValue("vendor.vendorName", vendor?.companyName ?? "", { shouldDirty: true });
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

      {/* The chosen vendor's own details, fetched and shown read-only. */}
      {selected && (
        <div className="mb-6 rounded-2xl border border-border/60 bg-secondary/30 p-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Detail label="Company Name" value={selected.companyName} />
            <Detail label="Vendor ID" value={selected.vendorCode} />
            <Detail label="Legal Name" value={selected.legalName} />
            <Detail label="ABN" value={selected.abn} />
            <Detail label="ACN" value={selected.acn} />
            <Detail label="Entity Type" value={selected.entityType} />
            <Detail label="GST" value={selected.gst} />
            <Detail label="Contact Person" value={selected.contactPerson} />
            <Detail label="Email" value={selected.email} />
            <Detail label="Phone" value={selected.phone} />
            <Detail label="Website" value={selected.websiteAddress} />
            <Detail
              label="Trading Names"
              value={selected.tradingNames.length ? selected.tradingNames.join(", ") : null}
            />
          </div>
        </div>
      )}

      <PriceFields base="vendorPrice" />
    </SectionCard>
  );
}
