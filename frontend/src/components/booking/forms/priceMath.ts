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
