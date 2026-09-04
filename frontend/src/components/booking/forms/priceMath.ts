/**
 * The two conversions every price field does.
 *
 * Shared by the vendor's price grid and Our Price, which count their figures
 * differently - one gross per trailer against one price column per pickup - but
 * read and write an amount the same way.
 */

/** Reads a money/percent input as a number, treating blank or junk as zero. */
export function num(value: unknown): number {
  const parsed = parseFloat(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Two-decimal string, the shape every amount field carries. */
export function money(value: number): string {
  return value.toFixed(2);
}

/**
 * The GST rate every price on Our Price is charged at.
 *
 * It used to be typed in per price, which asked an admin to remember a rate
 * that has not moved since 2000 and let a booking go out at 0% if they did not.
 * The field is gone and the rate is this constant, shown on the GST Amount
 * label so the page still says what it charged.
 */
export const GST_PCT = 10;

/**
 * What one Our Price column comes to, from the four figures that are typed.
 *
 * The three charges are rates on the gross, GST is charged on the gross and all
 * three together, and the total is the whole of it. Net is deliberately gross
 * plus GST alone: it answers what the job itself came to with tax on it.
 *
 * Kept here rather than in the section that renders it because the Permanent
 * Data page prices a saved pickup with the same arithmetic, and two copies of
 * it would be free to disagree about what a booking costs.
 */
export function ourPriceTotals(input: {
  gross: number;
  fuelLevyPct: number;
  splitChargePct: number;
  otherChargesPct: number;
}) {
  const { gross, fuelLevyPct, splitChargePct, otherChargesPct } = input;

  const fuelLevyAmount = gross * (fuelLevyPct / 100);
  const splitChargeAmount = gross * (splitChargePct / 100);
  const otherChargesAmount = gross * (otherChargesPct / 100);

  // Everything we bill for before tax, which is what GST is charged on.
  const charged = gross + fuelLevyAmount + splitChargeAmount + otherChargesAmount;
  const gstAmount = charged * (GST_PCT / 100);

  return {
    fuelLevyAmount,
    splitChargeAmount,
    otherChargesAmount,
    gstAmount,
    netAmount: gross + gstAmount,
    totalAmount: charged + gstAmount,
  };
}

/** One blank price, appended by "Add Price" or by a pickup being added. */
export function emptyPrice() {
  return {
    id: crypto.randomUUID(),
    grossAmount: "",
    fuelLevyPct: "",
    fuelLevyAmount: "",
    splitChargePct: "",
    splitChargeAmount: "",
    otherChargesPct: "",
    otherChargesAmount: "",
    gstPct: "",
    gstAmount: "",
    netAmount: "",
    totalAmount: "",
  };
}
