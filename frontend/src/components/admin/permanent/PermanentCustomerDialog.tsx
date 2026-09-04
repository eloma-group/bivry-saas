import { useEffect, useMemo } from "react";
import { FormProvider, useForm, useFormContext, useWatch } from "react-hook-form";
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
import { TextField, SelectField } from "@/components/form/Fields";
import { BookingAddressFields } from "@/components/booking/forms/BookingAddressFields";
import { RateAmountField } from "@/components/booking/forms/RateAmountField";
import { money, num, ourPriceTotals, GST_PCT } from "@/components/booking/forms/priceMath";
import { AGREEMENT_TYPES, REFERENCES, TRAILERS } from "@/constants/bookingOptions";
import { OPTION_LISTS } from "@/constants/optionLists";
import { rules } from "@/utils/validation";
import type {
  PermanentCustomer,
  PermanentCustomerInput,
} from "@/services/permanentDataService";

/**
 * Add or edit one saved pickup.
 *
 * The record is one thing, so the dialog asks for all of it - who and where, and
 * what we charge - even though the page shows it as two tables. Editing the
 * address of a row whose price is filled in should never mean retyping the
 * price somewhere else.
 *
 * The price is worked out here exactly as Our Price works it out on a booking,
 * through the same `ourPriceTotals`, so a saved figure and the figure the
 * booking form would have produced can never disagree.
 */

const GRID = "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3";

/** The form's own shape. The address sits under `address` so the shared booking
 *  address block can be reused as it stands, and is flattened on the way out. */
interface FormValues {
  pickUpCompany: string;
  agreementType: string;
  reference: string;
  trailer: string;
  address: {
    suite: string;
    street1: string;
    suburb: string;
    state: string;
    postCode: string;
    country: string;
  };
  fullAddress: string;
  grossAmount: string;
  fuelLevyPct: string;
  fuelLevyAmount: string;
  splitChargePct: string;
  splitChargeAmount: string;
  otherChargesPct: string;
  otherChargesAmount: string;
  gstPct: string;
  gstAmount: string;
  netAmount: string;
  totalAmount: string;
  finalAmount: string;
}

const str = (value: string | null | undefined) => value ?? "";

function toForm(row: PermanentCustomer | null): FormValues {
  return {
    pickUpCompany: str(row?.pickUpCompany),
    agreementType: str(row?.agreementType),
    reference: str(row?.reference),
    trailer: str(row?.trailer),
    address: {
      suite: str(row?.suite),
      street1: str(row?.street1),
      suburb: str(row?.suburb),
      state: str(row?.state),
      postCode: str(row?.postCode),
      country: str(row?.country) || "Australia",
    },
    fullAddress: str(row?.fullAddress),
    grossAmount: str(row?.grossAmount),
    fuelLevyPct: str(row?.fuelLevyPct),
    fuelLevyAmount: str(row?.fuelLevyAmount),
    splitChargePct: str(row?.splitChargePct),
    splitChargeAmount: str(row?.splitChargeAmount),
    otherChargesPct: str(row?.otherChargesPct),
    otherChargesAmount: str(row?.otherChargesAmount),
    gstPct: str(row?.gstPct) || String(GST_PCT),
    gstAmount: str(row?.gstAmount),
    netAmount: str(row?.netAmount),
    totalAmount: str(row?.totalAmount),
    finalAmount: str(row?.finalAmount),
  };
}

/** "Suite 3, 12 Balaclava Road, Caulfield, VIC 3161, Australia". */
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

/**
 * The price, and the amounts it works out to.
 *
 * Everything but the gross and the three rates is read only and written back
 * into form state, so what is stored is what was on screen. Final Amount is the
 * total for a saved pickup: a booking adds every price column together, and one
 * saved pickup is one column.
 */
function PriceBlock() {
  const { control, setValue } = useFormContext<FormValues>();

  const gross = num(useWatch({ control, name: "grossAmount" }));
  const fuelLevyPct = num(useWatch({ control, name: "fuelLevyPct" }));
  const splitChargePct = num(useWatch({ control, name: "splitChargePct" }));
  const otherChargesPct = num(useWatch({ control, name: "otherChargesPct" }));

  const totals = useMemo(
    () => ourPriceTotals({ gross, fuelLevyPct, splitChargePct, otherChargesPct }),
    [gross, fuelLevyPct, splitChargePct, otherChargesPct],
  );

  useEffect(() => {
    setValue("fuelLevyAmount", money(totals.fuelLevyAmount));
    setValue("splitChargeAmount", money(totals.splitChargeAmount));
    setValue("otherChargesAmount", money(totals.otherChargesAmount));
    setValue("gstPct", String(GST_PCT));
    setValue("gstAmount", money(totals.gstAmount));
    setValue("netAmount", money(totals.netAmount));
    setValue("totalAmount", money(totals.totalAmount));
    setValue("finalAmount", money(totals.totalAmount));
  }, [totals, setValue]);

  return (
    <div className={GRID}>
      <TextField name="grossAmount" label="Gross Amount" decimalOnly prefix="$" placeholder="0.00" />
      <RateAmountField label="Fuel Levy" rateName="fuelLevyPct" amountName="fuelLevyAmount" />
      <RateAmountField
        label="Split Charge"
        rateName="splitChargePct"
        amountName="splitChargeAmount"
      />
      <RateAmountField
        label="Other Charges"
        rateName="otherChargesPct"
        amountName="otherChargesAmount"
      />
      <TextField name="gstAmount" label={`GST Amount (${GST_PCT}%)`} prefix="$" readOnly />
      <TextField name="netAmount" label="Net Amount" prefix="$" readOnly />
      <TextField name="totalAmount" label="Total Amount" prefix="$" readOnly />
      <TextField
        name="finalAmount"
        label="Final Amount"
        prefix="$"
        readOnly
        hint="One saved pickup is one price column, so this matches the total."
      />
    </div>
  );
}

export function PermanentCustomerDialog({
  open,
  onOpenChange,
  row,
  saving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The row being edited, or null to add one. */
  row: PermanentCustomer | null;
  saving: boolean;
  onSave: (values: PermanentCustomerInput) => void | Promise<void>;
}) {
  const methods = useForm<FormValues>({ defaultValues: toForm(row), mode: "onBlur" });

  // Opening the dialog on another row has to refill it: react-hook-form keeps
  // the values it was given the first time otherwise, so the second edit would
  // show the first row's details.
  useEffect(() => {
    if (open) methods.reset(toForm(row));
  }, [open, row, methods]);

  const submit = methods.handleSubmit(async (values) => {
    const { address, ...rest } = values;
    await onSave({
      ...rest,
      ...address,
      fullAddress: values.fullAddress.trim() || composeAddress(address),
    });
  });

  return (
    <Dialog open={open} onOpenChange={saving ? undefined : onOpenChange}>
      <DialogContent className="max-h-[88vh] w-[min(96vw,64rem)] max-w-none overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{row ? "Edit saved pickup" : "Add a saved pickup"}</DialogTitle>
          <DialogDescription>
            {row
              ? `${row.clientJobId}. The client job number stays with the row and is not editable.`
              : "The client job number is given by the server once this is saved."}
          </DialogDescription>
        </DialogHeader>

        <FormProvider {...methods}>
          <form onSubmit={submit} noValidate className="mt-2 flex flex-col gap-6">
            <div className={GRID}>
              <TextField
                name="pickUpCompany"
                label="Pick-Up Company"
                placeholder="Amazon - AVV2 - Cranbourne West"
                required
                rules={rules.required("Pick-Up Company")}
                className="lg:col-span-2"
                hint="Name the site, not just the company: it is what a booking picks by."
              />
              <SelectField
                name="agreementType"
                label="Agreement Type"
                options={AGREEMENT_TYPES}
                listKey={OPTION_LISTS.agreementType}
                placeholder="Select agreement"
              />
              <SelectField
                name="reference"
                label="Reference"
                options={REFERENCES}
                listKey={OPTION_LISTS.reference}
                placeholder="Select reference"
              />
              <SelectField
                name="trailer"
                label="Trailer"
                options={TRAILERS}
                listKey={OPTION_LISTS.trailer}
                placeholder="Select trailer"
              />
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
              <PriceBlock />
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
                {row ? "Save changes" : "Add pickup"}
              </Button>
            </div>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
