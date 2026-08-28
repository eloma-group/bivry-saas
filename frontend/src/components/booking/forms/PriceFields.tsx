import { useEffect } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { TextField } from "@/components/form/Fields";

const GRID = "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3";

/** Reads a money/percent input as a number, treating blank or junk as zero. */
function num(value: unknown): number {
  const parsed = parseFloat(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Two-decimal string, the shape every amount field carries. */
function money(value: number): string {
  return value.toFixed(2);
}

/**
 * The price grid, in AUD, reused wherever a booking is costed.
 *
 * Everything lives under `base`, so two of these on one form - our price and the
 * vendor's - stay completely apart: their inputs and their derived amounts never
 * touch. Three figures are typed; the four amounts follow from them and recompute
 * as the inputs change:
 *   Fuel Levy Amount = Gross x Fuel Levy %
 *   GST Amount       = Gross x GST %
 *   Net Amount       = Gross + GST Amount
 *   Total Amount     = Gross + Fuel Levy Amount + GST Amount
 */
export function PriceFields({ base }: { base: string }) {
  const { control, setValue } = useFormContext();

  const gross = num(useWatch({ control, name: `${base}.grossAmount` }));
  const fuelLevyPct = num(useWatch({ control, name: `${base}.fuelLevyPct` }));
  const gstPct = num(useWatch({ control, name: `${base}.gstPct` }));

  const fuelLevyAmount = gross * (fuelLevyPct / 100);
  const gstAmount = gross * (gstPct / 100);
  const netAmount = gross + gstAmount;
  const totalAmount = gross + fuelLevyAmount + gstAmount;

  // Keep the derived amounts in form state so a submit carries them too.
  useEffect(() => {
    setValue(`${base}.fuelLevyAmount`, money(fuelLevyAmount));
    setValue(`${base}.gstAmount`, money(gstAmount));
    setValue(`${base}.netAmount`, money(netAmount));
    setValue(`${base}.totalAmount`, money(totalAmount));
  }, [base, fuelLevyAmount, gstAmount, netAmount, totalAmount, setValue]);

  return (
    <div className={GRID}>
      <TextField name={`${base}.grossAmount`} label="Gross Amount" type="number" prefix="$" placeholder="0.00" />
      <TextField name={`${base}.fuelLevyPct`} label="Fuel Levy (%)" type="number" placeholder="0" />
      <TextField
        name={`${base}.fuelLevyAmount`}
        label="Fuel Levy Amount"
        prefix="$"
        readOnly
        hint="Gross Amount x Fuel Levy %."
      />
      <TextField name={`${base}.gstPct`} label="GST (%)" type="number" placeholder="0" />
      <TextField
        name={`${base}.gstAmount`}
        label="GST Amount"
        prefix="$"
        readOnly
        hint="Gross Amount x GST %."
      />
      <TextField
        name={`${base}.netAmount`}
        label="Net Amount"
        prefix="$"
        readOnly
        hint="Gross Amount + GST Amount."
      />
      <TextField
        name={`${base}.totalAmount`}
        label="Total Amount"
        prefix="$"
        readOnly
        hint="Gross + Fuel Levy Amount + GST Amount."
      />
    </div>
  );
}
