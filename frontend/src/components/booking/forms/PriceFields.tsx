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
 * touch. The figures typed are a gross, a fuel levy rate and a GST rate; the
 * four amounts follow from them and recompute as the inputs change:
 *   Fuel Levy Amount = Gross x Fuel Levy %
 *   GST Amount       = Gross x GST %
 *   Net Amount       = Gross + GST Amount
 *   Total Amount     = Gross + Fuel Levy Amount + GST Amount
 *
 * Every figure typed here is a plain text box that takes digits and a single
 * decimal point, never `type="number"`. A number input puts a spinner in the
 * box, so a price moves a dollar on a stray click, and it changes the value on
 * the scroll wheel, so scrolling the page past a levy rate silently reprices
 * the booking. It also accepts "1e5" and a leading minus, neither of which is a
 * price or a percentage.
 *
 * `splitGross` asks for the gross once per trailer rather than once for the job,
 * which the vendor price does: a load split across two trailers is quoted as two
 * figures, and adding them up by hand before typing loses which trailer carried
 * what. Everything below is then worked out from their sum, so the arithmetic
 * above still holds with "Gross" reading as "Trailer A + Trailer B".
 */
export function PriceFields({ base, splitGross }: { base: string; splitGross?: boolean }) {
  const { control, setValue } = useFormContext();

  const gross1 = num(useWatch({ control, name: `${base}.grossAmount` }));
  const gross2 = num(useWatch({ control, name: `${base}.grossAmount2` }));
  const fuelLevyPct = num(useWatch({ control, name: `${base}.fuelLevyPct` }));
  const gstPct = num(useWatch({ control, name: `${base}.gstPct` }));

  // The Trailer B box is only on screen where it was asked for, so it can only
  // add to the gross there. Elsewhere it is not registered and reads as zero
  // anyway, but leaning on that would make this depend on a field's absence.
  const gross = splitGross ? gross1 + gross2 : gross1;

  const fuelLevyAmount = gross * (fuelLevyPct / 100);
  const gstAmount = gross * (gstPct / 100);
  const netAmount = gross + gstAmount;
  const totalAmount = gross + fuelLevyAmount + gstAmount;

  // How the hints below name the gross, so they read as what was actually
  // typed rather than as a total nobody entered.
  const grossLabel = splitGross ? "Trailer A + Trailer B gross" : "Gross Amount";
  const grossFactor = splitGross ? "(Trailer A + Trailer B gross)" : "Gross Amount";

  // Keep the derived amounts in form state so a submit carries them too.
  useEffect(() => {
    setValue(`${base}.fuelLevyAmount`, money(fuelLevyAmount));
    setValue(`${base}.gstAmount`, money(gstAmount));
    setValue(`${base}.netAmount`, money(netAmount));
    setValue(`${base}.totalAmount`, money(totalAmount));
  }, [base, fuelLevyAmount, gstAmount, netAmount, totalAmount, setValue]);

  return (
    <div className={GRID}>
      <TextField
        name={`${base}.grossAmount`}
        label={splitGross ? "Gross Amount - Trailer A" : "Gross Amount"}
        decimalOnly
        prefix="$"
        placeholder="0.00"
      />
      {splitGross && (
        <TextField
          name={`${base}.grossAmount2`}
          label="Gross Amount - Trailer B"
          decimalOnly
          prefix="$"
          placeholder="0.00"
          hint="Added to Trailer A before the levy, GST and totals."
        />
      )}
      <TextField name={`${base}.fuelLevyPct`} label="Fuel Levy (%)" decimalOnly placeholder="0" />
      <TextField
        name={`${base}.fuelLevyAmount`}
        label="Fuel Levy Amount"
        prefix="$"
        readOnly
        hint={`${grossFactor} x Fuel Levy %.`}
      />
      <TextField name={`${base}.gstPct`} label="GST (%)" decimalOnly placeholder="0" />
      <TextField
        name={`${base}.gstAmount`}
        label="GST Amount"
        prefix="$"
        readOnly
        hint={`${grossFactor} x GST %.`}
      />
      <TextField
        name={`${base}.netAmount`}
        label="Net Amount"
        prefix="$"
        readOnly
        hint={`${grossLabel} + GST Amount.`}
      />
      <TextField
        name={`${base}.totalAmount`}
        label="Total Amount"
        prefix="$"
        readOnly
        hint={`${grossLabel} + Fuel Levy Amount + GST Amount.`}
      />
    </div>
  );
}
