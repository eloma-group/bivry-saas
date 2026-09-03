import { useEffect } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Trash2, Wallet } from "lucide-react";
import { SectionCard } from "@/components/form/SectionCard";
import { TextField } from "@/components/form/Fields";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { emptyPrice, money, num } from "./priceMath";

/** The flat layout a single price keeps: the three-across grid, as before. */
const FLAT = "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3";

/** Several prices sit side by side, each one a column of its own. */
const COLUMNS = "grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3";

/**
 * One price: a gross, a levy rate and a GST rate typed, four amounts derived.
 *
 *   Fuel Levy Amount = Gross x Fuel Levy %
 *   GST Amount       = Gross x GST %
 *   Net Amount       = Gross + GST Amount
 *   Total Amount     = Gross + Fuel Levy Amount + GST Amount
 *
 * `numbered` puts the index on the Gross and Total labels, which only earns its
 * place once there are two prices to tell apart. `stacked` runs the fields down
 * a column instead of across the section, which is what lets several prices sit
 * beside each other.
 */
function PriceColumn({
  index,
  numbered,
  stacked,
}: {
  index: number;
  numbered: boolean;
  stacked: boolean;
}) {
  const { control, setValue } = useFormContext();
  const base = `prices.${index}`;

  const gross = num(useWatch({ control, name: `${base}.grossAmount` }));
  const fuelLevyPct = num(useWatch({ control, name: `${base}.fuelLevyPct` }));
  const gstPct = num(useWatch({ control, name: `${base}.gstPct` }));

  const fuelLevyAmount = gross * (fuelLevyPct / 100);
  const gstAmount = gross * (gstPct / 100);
  const netAmount = gross + gstAmount;
  const totalAmount = gross + fuelLevyAmount + gstAmount;

  // Keep the derived amounts in form state so a submit carries them too, and so
  // the Final Amount below can simply read every total back.
  useEffect(() => {
    setValue(`${base}.fuelLevyAmount`, money(fuelLevyAmount));
    setValue(`${base}.gstAmount`, money(gstAmount));
    setValue(`${base}.netAmount`, money(netAmount));
    setValue(`${base}.totalAmount`, money(totalAmount));
  }, [base, fuelLevyAmount, gstAmount, netAmount, totalAmount, setValue]);

  const n = numbered ? ` ${index + 1}` : "";

  return (
    <div className={stacked ? "space-y-5" : FLAT}>
      <TextField
        name={`${base}.grossAmount`}
        label={`Gross Amount${n}`}
        decimalOnly
        prefix="$"
        placeholder="0.00"
      />
      <TextField name={`${base}.fuelLevyPct`} label="Fuel Levy (%)" decimalOnly placeholder="0" />
      <TextField
        name={`${base}.fuelLevyAmount`}
        label="Fuel Levy Amount"
        prefix="$"
        readOnly
        hint={`Gross Amount${n} x Fuel Levy %.`}
      />
      <TextField name={`${base}.gstPct`} label="GST (%)" decimalOnly placeholder="0" />
      <TextField
        name={`${base}.gstAmount`}
        label="GST Amount"
        prefix="$"
        readOnly
        hint={`Gross Amount${n} x GST %.`}
      />
      <TextField
        name={`${base}.netAmount`}
        label="Net Amount"
        prefix="$"
        readOnly
        hint={`Gross Amount${n} + GST Amount.`}
      />
      <TextField
        name={`${base}.totalAmount`}
        label={`Total Amount${n}`}
        prefix="$"
        readOnly
        hint={`Gross Amount${n} + Fuel Levy Amount + GST Amount.`}
      />
    </div>
  );
}

/**
 * Section 5 - what we charge the customer, in AUD.
 *
 * A booking that loads at one place is one price, and the section reads exactly
 * as it always did: one flat grid, labels unnumbered. A booking that loads at
 * two carries two prices, and each becomes a column of its own sitting beside
 * the last, its Gross and Total numbered so a figure can be traced back to the
 * leg it belongs to. Final Amount adds every Total up, and is shown either way
 * so the bottom line of the section is always in the same place.
 *
 * Where the columns come from is deliberately lopsided. Adding a pickup adds a
 * price, because a second collection is a second thing to charge for and having
 * to remember to add it is how a booking goes out underpriced. Removing a
 * pickup does not remove one: by then there is money typed in that column, and
 * deleting what somebody entered to keep a count tidy is the worse mistake. The
 * Remove button on the column is how one goes, which makes it a decision rather
 * than a side effect. "Add Price" covers what the pickup count cannot know
 * about - a second charge against a single collection.
 */
export function OurPriceSection() {
  const { control, setValue } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name: "prices" });

  const pickups = useWatch({ control, name: "pickups" });
  const pickupCount = Array.isArray(pickups) ? pickups.length : 0;
  const count = fields.length;

  // A pickup added past the number of prices brings a price with it. Only ever
  // upwards - see the note above on why a removed pickup leaves its price.
  useEffect(() => {
    if (pickupCount <= count) return;
    for (let i = count; i < pickupCount; i += 1) {
      append(emptyPrice(), { shouldFocus: false });
    }
  }, [pickupCount, count, append]);

  // Every Total, added up. Read back off the form rather than recomputed, so
  // there is one definition of a total and the final can never disagree with
  // the column it came from.
  const rows = useWatch({ control, name: "prices" }) as
    | Array<{ totalAmount?: unknown }>
    | undefined;
  const finalAmount = (rows ?? []).reduce((sum, row) => sum + num(row?.totalAmount), 0);

  useEffect(() => {
    setValue("priceFinalAmount", money(finalAmount));
  }, [finalAmount, setValue]);

  const many = count > 1;

  return (
    <SectionCard
      index={5}
      id="step-price"
      icon={Wallet}
      title="Our Price"
      description="What we charge the customer. Amounts are in AUD; the levy, GST and totals work themselves out."
    >
      {many ? (
        <div className={COLUMNS}>
          <AnimatePresence initial={false}>
            {fields.map((field, index) => (
              <motion.div
                key={field.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.25 }}
                className="rounded-2xl border border-border/60 bg-secondary/30 p-5"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-foreground">
                    Price {index + 1}
                  </span>
                  {/* Any of them can go: removing one when two are left drops
                      the section back to the single flat grid. */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:bg-red-50 hover:text-red-500"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4" /> Remove
                  </Button>
                </div>
                <PriceColumn index={index} numbered stacked />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <PriceColumn index={0} numbered={false} stacked={false} />
      )}

      <Button
        type="button"
        variant="outline"
        className="mt-5"
        onClick={() => append(emptyPrice())}
      >
        <Plus className="h-4 w-4" /> Add Price
      </Button>

      <Separator className="my-6" />

      <div className={FLAT}>
        <TextField
          name="priceFinalAmount"
          label="Final Amount"
          prefix="$"
          readOnly
          hint={
            many
              ? `Total Amount 1 to ${count}, added together.`
              : "Every Total Amount, added together."
          }
        />
      </div>
    </SectionCard>
  );
}
