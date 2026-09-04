import { useFormContext } from "react-hook-form";
import { FieldShell } from "@/components/form/Fields";
import { decimals } from "@/utils/decimals";

/**
 * A rate and the amount it works out to, in one field.
 *
 * A charge on Our Price is two values - "5%" and "$50.00" - and asking for them
 * as two labelled fields costs two rows. Stacked in a column, three such charges
 * ran to six rows and made the section far taller than the booking it was
 * describing. So they share one box: the left 30% takes the rate, the right 70%
 * shows what it came to, and the pair reads as the single figure it is.
 *
 * Both halves stay ordinary form fields - the rate is typed, the amount is
 * written by whatever is deriving it - so a submit carries them exactly as it
 * did when they were two boxes.
 */
export function RateAmountField({
  label,
  rateName,
  amountName,
  hint,
}: {
  label: string;
  rateName: string;
  amountName: string;
  hint?: string;
}) {
  const { register } = useFormContext();
  const rate = register(rateName);
  const amount = register(amountName);

  return (
    <FieldShell label={label} htmlFor={rateName} hint={hint}>
      {/* The two halves sit inside one border and light up together, so the
          field answers to focus the way a plain input does. */}
      <div className="grid h-11 grid-cols-[30%_minmax(0,1fr)] overflow-hidden rounded-lg border border-input bg-secondary/40 transition-all duration-200 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
        <div className="relative">
          <input
            id={rateName}
            inputMode="decimal"
            placeholder="0"
            className="h-full w-full bg-transparent pl-3 pr-5 text-sm text-foreground outline-none placeholder:text-muted-foreground/70"
            {...rate}
            onChange={(event) => {
              const cleaned = decimals(event.target.value);
              if (cleaned !== event.target.value) event.target.value = cleaned;
              void rate.onChange(event);
            }}
          />
          <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
            %
          </span>
        </div>

        <div className="relative border-l border-input bg-secondary/70">
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
            $
          </span>
          <input
            readOnly
            aria-readonly
            aria-label={`${label} amount`}
            className="h-full w-full cursor-not-allowed bg-transparent pl-6 pr-3 text-sm text-muted-foreground outline-none"
            {...amount}
          />
        </div>
      </div>
    </FieldShell>
  );
}
