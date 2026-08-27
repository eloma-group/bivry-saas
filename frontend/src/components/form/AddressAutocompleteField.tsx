import { useEffect, useId, useRef, useState } from "react";
import { Controller, get, useFormContext } from "react-hook-form";
import { Loader2, MapPin, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { FieldShell, type FieldRules } from "@/components/form/Fields";
import { resolveSuggestion, searchAddresses } from "@/services/geocode";
import type { AddressSuggestion } from "@/services/geocode";
import type { AddressBlock as FoundAddress } from "@/types/driver";

/** How long the field waits after the last keystroke before it asks. */
const DEBOUNCE_MS = 350;

/** The first letter is enough to start suggesting. */
const MIN_QUERY = 1;

interface AddressAutocompleteFieldProps {
  /** The form path of the street line this field edits. */
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  rules?: FieldRules;
  className?: string;
  /**
   * Fills the rest of the address block from the chosen suggestion. The field
   * itself only writes the street line; the parent decides how the found address
   * maps onto its own country, state, suburb and post code fields.
   */
  onPickAddress: (address: FoundAddress) => void;
}

/**
 * A street line that suggests real addresses as it is typed.
 *
 * It answers from OpenStreetMap through `searchAddresses`, the same free lookup
 * the location tools use, so it needs no key. Typing searches from the first
 * letter, debounced so a burst of keystrokes makes one request rather than one
 * per letter. Picking a suggestion fills the whole block through `onPickAddress`
 * and every filled field stays editable, because the closest match is still a
 * guess at what somebody meant.
 */
export function AddressAutocompleteField({
  name,
  label,
  placeholder,
  required,
  rules,
  className,
  onPickAddress,
}: AddressAutocompleteFieldProps) {
  const {
    control,
    formState: { errors },
  } = useFormContext();
  const error = get(errors, name)?.message as string | undefined;
  const listId = useId();

  // null means the field is idle - freshly picked or untouched - so no search
  // runs. Any string, empty included, is something the person typed.
  const [query, setQuery] = useState<string | null>(null);
  const [results, setResults] = useState<AddressSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // One search in flight at a time. An answer to a query that has already been
  // typed over must never land on top of a newer one.
  useEffect(() => {
    if (query === null) return;

    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY) {
      setResults([]);
      setSearching(false);
      setOpen(false);
      return;
    }

    const controller = new AbortController();
    setSearching(true);

    const timer = window.setTimeout(() => {
      searchAddresses(trimmed, controller.signal)
        .then((found) => {
          setResults(found);
          setOpen(true);
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setResults([]);
        })
        .finally(() => setSearching(false));
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // A click anywhere else puts the list away.
  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <FieldShell
      label={label}
      htmlFor={name}
      required={required}
      error={error}
      className={className}
    >
      <Controller
        control={control}
        name={name}
        rules={rules}
        render={({ field }) => (
          <div ref={boxRef} className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id={name}
              role="combobox"
              aria-expanded={open}
              aria-controls={listId}
              aria-invalid={!!error}
              autoComplete="off"
              placeholder={placeholder}
              value={(field.value as string) ?? ""}
              onChange={(event) => {
                field.onChange(event);
                setQuery(event.target.value);
              }}
              onBlur={field.onBlur}
              onFocus={() => results.length > 0 && setOpen(true)}
              className={cn(
                "pl-9 pr-9",
                error && "border-red-300 focus-visible:ring-red-500/10",
              )}
            />

            {searching && (
              <Loader2
                className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
                aria-hidden
              />
            )}

            {open && (
              <ul
                id={listId}
                role="listbox"
                className="absolute z-30 mt-2 max-h-72 w-full min-w-[18rem] overflow-y-auto overscroll-contain rounded-2xl border border-border bg-background p-1.5 shadow-popover"
              >
                {results.length === 0 ? (
                  <li className="px-3 py-3 text-sm text-muted-foreground">
                    {searching
                      ? "Searching…"
                      : "Nothing found yet. Keep typing, or fill it in below."}
                  </li>
                ) : (
                  results.map((suggestion) => (
                    <li key={suggestion.id} role="option" aria-selected={false}>
                      <button
                        type="button"
                        onClick={() => {
                          setOpen(false);
                          setQuery(null);
                          setResults([]);
                          void resolveSuggestion(suggestion)
                            .then((address) => {
                              if (address) onPickAddress(address);
                            })
                            .catch(() => {
                              // The details lookup failed; leave what was typed.
                            });
                        }}
                        className="flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm leading-relaxed text-foreground transition-colors hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none"
                      >
                        <MapPin
                          className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                          aria-hidden
                        />
                        <span className="min-w-0">{suggestion.label}</span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
        )}
      />
    </FieldShell>
  );
}
