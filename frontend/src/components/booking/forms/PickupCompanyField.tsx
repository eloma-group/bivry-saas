import { useMemo, useRef, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Check, Loader2 } from "lucide-react";
import { FieldShell } from "@/components/form/Fields";
import { Input } from "@/components/ui/input";
import { usePermanentCustomers } from "@/hooks/usePermanentData";
import { cn } from "@/lib/utils";
import type { PermanentCustomer } from "@/services/permanentDataService";

/**
 * Pick-Up Company, offering the pickups we have on file.
 *
 * The same handful of sites are collected from most days, and every one of them
 * was being typed out again along with its address, its trailer and its price.
 * This searches Permanent Data as the name is typed, and picking a match fills
 * the rest of the pickup, the agreement type and reference on the booking, and
 * the price column that belongs to this pickup.
 *
 * It stays a text box, deliberately. A one-off collection is a real thing and
 * has no saved record, so anything typed is kept exactly as typed; the list is
 * an offer, not a constraint.
 */

/** How many suggestions to show at once. Enough to choose from, not a wall. */
const LIMIT = 8;

const str = (value: string | null | undefined) => value ?? "";

export function PickupCompanyField({ index }: { index: number }) {
  const { control, register, setValue, getValues } = useFormContext();
  const base = `pickups.${index}`;
  const name = `${base}.pickupCompany`;

  // Cached for the session and shared with every other pickup row on the form,
  // so a booking that loads at three places asks the server once.
  const { data, isPending: loading, isError: failed } = usePermanentCustomers();
  const rows = useMemo(() => data ?? [], [data]);
  const typed = (useWatch({ control, name }) as string | undefined) ?? "";

  const [open, setOpen] = useState(false);
  const field = register(name);
  /** Set while a suggestion is being clicked, so the blur does not beat it. */
  const picking = useRef(false);

  const matches = useMemo(() => {
    const term = typed.trim().toLowerCase();
    const pool = term
      ? rows.filter((row) => row.pickUpCompany.toLowerCase().includes(term))
      : rows;
    return pool.slice(0, LIMIT);
  }, [rows, typed]);

  /** An exact match means the field is already filled from a saved record. */
  const chosen = useMemo(
    () => rows.some((row) => row.pickUpCompany.toLowerCase() === typed.trim().toLowerCase()),
    [rows, typed],
  );

  function fillFrom(row: PermanentCustomer) {
    const write = (path: string, value: string) =>
      setValue(path, value, { shouldDirty: true, shouldValidate: true });

    write(name, row.pickUpCompany);
    write(`${base}.clientJobNumber`, row.clientJobId);
    write(`${base}.trailer`, str(row.trailer));
    write(`${base}.suite`, str(row.suite));
    write(`${base}.street1`, str(row.street1));
    // Country before state: the State field clears itself when the country
    // changes, so writing the state first would have it wiped a moment later.
    write(`${base}.country`, str(row.country) || "Australia");
    write(`${base}.state`, str(row.state));
    write(`${base}.suburb`, str(row.suburb));
    write(`${base}.postCode`, str(row.postCode));

    // These two belong to the booking rather than to one pickup, so they are
    // only filled while they are still empty: a booking that loads at two
    // places would otherwise have its agreement rewritten by the second one.
    if (!str(getValues("agreementType") as string | undefined).trim() && row.agreementType) {
      write("agreementType", row.agreementType);
    }
    if (!str(getValues("reference") as string | undefined).trim() && row.reference) {
      write("reference", row.reference);
    }

    // The price column that belongs to this pickup. Only the typed figures are
    // written: the levy, GST and totals are worked out from them by Our Price,
    // so setting those here would be a second, staler answer.
    const prices = getValues("prices") as unknown[] | undefined;
    if (Array.isArray(prices) && prices[index]) {
      write(`prices.${index}.grossAmount`, str(row.grossAmount));
      write(`prices.${index}.fuelLevyPct`, str(row.fuelLevyPct));
      write(`prices.${index}.splitChargePct`, str(row.splitChargePct));
      write(`prices.${index}.otherChargesPct`, str(row.otherChargesPct));
    }

    setOpen(false);
  }

  return (
    <FieldShell
      label="Pick-Up Company"
      htmlFor={name}
      hint={
        failed
          ? "Saved pickups could not be loaded. Type the company instead."
          : chosen
            ? "Filled from Permanent Data. Every field below can still be changed."
            : "Start typing to search the pickups we have on file, or enter a new one."
      }
    >
      <div className="relative">
        <Input
          id={name}
          placeholder="Amazon - AVV2 - Cranbourne West"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          {...field}
          onFocus={() => setOpen(true)}
          onBlur={(event) => {
            if (!picking.current) setOpen(false);
            void field.onBlur(event);
          }}
          onChange={(event) => {
            setOpen(true);
            void field.onChange(event);
          }}
        />

        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}

        {open && matches.length > 0 && (
          <ul
            role="listbox"
            className="absolute z-30 mt-1.5 max-h-72 w-full overflow-y-auto rounded-xl border border-border bg-white p-1.5 shadow-lift"
          >
            {matches.map((row) => {
              const active = row.pickUpCompany.toLowerCase() === typed.trim().toLowerCase();
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    // Mouse down lands before the input's blur, so the list is
                    // still open when the click completes.
                    onMouseDown={() => {
                      picking.current = true;
                    }}
                    onClick={() => {
                      picking.current = false;
                      fillFrom(row);
                    }}
                    className={cn(
                      "flex w-full flex-col gap-0.5 rounded-lg px-3 py-2 text-left transition-colors",
                      active
                        ? "bg-primary/[0.07] text-primary"
                        : "text-slate-600 hover:bg-secondary hover:text-foreground",
                    )}
                  >
                    <span className="flex items-center gap-2 text-sm font-medium">
                      {row.pickUpCompany}
                      {active && <Check className="h-3.5 w-3.5" />}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {row.clientJobId}
                      {row.fullAddress ? ` · ${row.fullAddress}` : ""}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </FieldShell>
  );
}
