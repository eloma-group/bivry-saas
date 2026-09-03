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

/** One blank price, appended by "Add Price" or by a pickup being added. */
export function emptyPrice() {
  return {
    id: crypto.randomUUID(),
    grossAmount: "",
    fuelLevyPct: "",
    fuelLevyAmount: "",
    gstPct: "",
    gstAmount: "",
    netAmount: "",
    totalAmount: "",
  };
}
