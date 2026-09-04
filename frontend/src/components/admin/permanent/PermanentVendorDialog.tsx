import { useEffect, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { FieldShell, TextField } from "@/components/form/Fields";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BookingAddressFields } from "@/components/booking/forms/BookingAddressFields";
import { PriceFields } from "@/components/booking/forms/PriceFields";
import { adminService, type AdminVendorRow } from "@/services/adminService";
import { ApiRequestError } from "@/services/api";
import type { PermanentVendor, PermanentVendorInput } from "@/services/permanentDataService";

/**
 * Add or edit what we have agreed with one vendor.
 *
 * The price is the vendor grid from the booking form, unchanged: a gross per
 * trailer with the levy, GST and totals worked out from their sum. Reusing it
 * is the point - what is saved here is what Vendor Allotment will show, so the
 * two must add up the same way.
 *
 * A vendor holds one saved price, so the vendor is chosen when the row is
 * created and fixed after. Changing which vendor a price belongs to is deleting
 * one row and adding another, which is what it actually is.
 */

const GRID = "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3";

interface FormValues {
  address: {
    suite: string;
    street1: string;
    suburb: string;
    state: string;
    postCode: string;
    country: string;
  };
  fullAddress: string;
  price: {
    grossAmount: string;
    grossAmount2: string;
    fuelLevyPct: string;
    fuelLevyAmount: string;
    gstPct: string;
    gstAmount: string;
    netAmount: string;
    totalAmount: string;
  };
}

const str = (value: string | null | undefined) => value ?? "";

function toForm(row: PermanentVendor | null): FormValues {
  return {
    address: {
      suite: str(row?.suite),
      street1: str(row?.street1),
      suburb: str(row?.suburb),
      state: str(row?.state),
      postCode: str(row?.postCode),
      country: str(row?.country) || "Australia",
    },
    fullAddress: str(row?.fullAddress),
    price: {
      grossAmount: str(row?.grossAmount),
      grossAmount2: str(row?.grossAmount2),
      fuelLevyPct: str(row?.fuelLevyPct),
      fuelLevyAmount: str(row?.fuelLevyAmount),
      gstPct: str(row?.gstPct),
      gstAmount: str(row?.gstAmount),
      netAmount: str(row?.netAmount),
      totalAmount: str(row?.totalAmount),
    },
  };
}

function composeAddress(address: FormValues["address"]): string {
  const suburbLine = [address.suburb, address.state, address.postCode]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ");

  return [address.suite, address.street1, suburbLine, address.country]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
}

export function PermanentVendorDialog({
  open,
  onOpenChange,
  row,
  saving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: PermanentVendor | null;
  saving: boolean;
  onSave: (values: PermanentVendorInput) => void | Promise<void>;
}) {
  const methods = useForm<FormValues>({ defaultValues: toForm(row), mode: "onBlur" });

  const [vendors, setVendors] = useState<AdminVendorRow[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [vendorId, setVendorId] = useState(row?.vendorId ?? "");
  const [vendorError, setVendorError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      methods.reset(toForm(row));
      setVendorId(row?.vendorId ?? "");
      setVendorError(null);
    }
  }, [open, row, methods]);

  // Only needed while adding: an edit already knows its vendor and cannot
  // change it, so there is nothing to choose from.
  useEffect(() => {
    if (!open || row) return;

    let cancelled = false;
    setLoadingVendors(true);
    void adminService
      .listVendors({ pageSize: 1000, sortBy: "companyName", sortDir: "asc" })
      .then((result) => {
        if (!cancelled) setVendors(result.rows);
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setVendorError(
          caught instanceof ApiRequestError ? caught.message : "Could not load the vendors.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoadingVendors(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, row]);

  const submit = methods.handleSubmit(async (values) => {
    if (!row && !vendorId) {
      setVendorError("Choose the vendor this price belongs to.");
      return;
    }

    await onSave({
      vendorId: row?.vendorId ?? vendorId,
      ...values.address,
      ...values.price,
      fullAddress: values.fullAddress.trim() || composeAddress(values.address),
    });
  });

  return (
    <Dialog open={open} onOpenChange={saving ? undefined : onOpenChange}>
      <DialogContent className="max-h-[88vh] w-[min(96vw,64rem)] max-w-none overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{row ? "Edit saved vendor price" : "Add a saved vendor price"}</DialogTitle>
          <DialogDescription>
            {row
              ? `${row.vendorJobId} for ${row.vendorName ?? "this vendor"}. The vendor cannot be changed here.`
              : "Choose a vendor, then what we have agreed with them. The vendor job number is given once this is saved."}
          </DialogDescription>
        </DialogHeader>

        <FormProvider {...methods}>
          <form onSubmit={submit} noValidate className="mt-2 flex flex-col gap-6">
            <div className={GRID}>
              <FieldShell
                label="Vendor"
                required={!row}
                error={vendorError ?? undefined}
                hint={row ? undefined : "One saved price per vendor."}
                className="lg:col-span-2"
              >
                {row ? (
                  <div className="flex h-11 items-center rounded-lg border border-input bg-secondary/70 px-3.5 text-sm text-muted-foreground">
                    {row.vendorName ?? "This vendor"}
                  </div>
                ) : (
                  <Select
                    value={vendorId}
                    onValueChange={(value) => {
                      setVendorId(value);
                      setVendorError(null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={loadingVendors ? "Loading vendors…" : "Select vendor"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors.map((vendor) => (
                        <SelectItem key={vendor.id} value={vendor.id}>
                          {vendor.companyName}
                          {vendor.vendorCode ? ` (${vendor.vendorCode})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </FieldShell>
            </div>

            <Separator />

            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-foreground">Address</h3>
              <div className={GRID}>
                <BookingAddressFields base="address" />
                <TextField
                  name="fullAddress"
                  label="Full Address"
                  placeholder="Filled from the fields above"
                  className="sm:col-span-2 lg:col-span-3"
                  hint="One line, as it should read on paperwork. Left empty, it is built from the fields above."
                />
              </div>
            </div>

            <Separator />

            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-foreground">Price</h3>
              <PriceFields base="price" splitGross />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {row ? "Save changes" : "Add vendor price"}
              </Button>
            </div>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
