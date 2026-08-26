import { useEffect, useId, useRef, useState } from "react";
import { Loader2, LocateFixed, MapPin, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { locateCurrentAddress, searchAddresses } from "@/services/geocode";
import { cn } from "@/lib/utils";
import type { AddressSuggestion } from "@/services/geocode";
import type { AddressBlock } from "@/types/driver";

/** How long the box waits after the last keystroke before it asks. */
const DEBOUNCE_MS = 400;

/** Below this the search says nothing: two letters match half the world. */
const MIN_QUERY = 3;

interface LocationPickerProps {
  /**
   * Hands over an address the person chose, either from where they are standing
   * or from the search. Only the fields the lookup answered carry a value; the
   * rest come back empty and are left to the form to decide about.
   */
  onPick: (address: AddressBlock) => void;
  /** Names the address being filled, for the screen reader on each control. */
  label: string;
  className?: string;
}

/**
 * The two ways to fill an address without typing it: from where you are, and
 * by searching for it.
 *
 * Both answer from OpenStreetMap, which needs no key and answers with CORS
 * open, so the lookup runs in the browser and a person's coordinates never pass
 * through our servers.
 *
 * Neither one commits anything. They fill the fields underneath, and every one
 * of those stays editable, because a search result lands on a building and a
 * fix lands within a few metres of one, and neither knows which floor anybody
 * is on.
 */
export function LocationPicker({ onPick, label, className }: LocationPickerProps) {
  const listId = useId();
  const [locating, setLocating] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AddressSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // One search in flight at a time. An answer to a query that has already been
  // typed over must never land on top of a newer one.
  useEffect(() => {
    if (query.trim().length < MIN_QUERY) {
      setResults([]);
      setSearching(false);
      return;
    }

    const controller = new AbortController();
    setSearching(true);

    const timer = window.setTimeout(() => {
      searchAddresses(query, controller.signal)
        .then((found) => {
          setResults(found);
          setOpen(true);
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
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

  async function fillFromMyLocation() {
    setLocating(true);
    try {
      onPick(await locateCurrentAddress());
      toast.success("Address filled in", {
        description: "Check every field and correct anything that is not right.",
      });
    } catch (error) {
      toast.error("Could not get your location", {
        description:
          error instanceof Error ? error.message : "Please fill the address in yourself.",
      });
    } finally {
      setLocating(false);
    }
  }

  function choose(suggestion: AddressSuggestion) {
    onPick(suggestion.address);
    setQuery("");
    setResults([]);
    setOpen(false);
    toast.success("Address filled in", {
      description: "Check every field, and add anything the search could not answer.",
    });
  }

  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center", className)}>
      <div ref={boxRef} className="relative min-w-0 flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-label={`Search for the ${label}`}
          placeholder="Search any address in the world"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          className="pl-9 pr-9"
        />

        {searching ? (
          <Loader2
            className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
            aria-hidden
          />
        ) : query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults([]);
              setOpen(false);
            }}
            aria-label="Clear the search"
            className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}

        {open && (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-30 mt-2 max-h-72 w-full overflow-y-auto overscroll-contain rounded-2xl border border-border bg-background p-1.5 shadow-popover"
          >
            {results.length === 0 ? (
              <li className="px-3 py-3 text-sm text-muted-foreground">
                Nothing found for that. Try a street and a town.
              </li>
            ) : (
              results.map((suggestion) => (
                <li key={suggestion.id} role="option" aria-selected={false}>
                  <button
                    type="button"
                    onClick={() => choose(suggestion)}
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

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-10 shrink-0"
        onClick={() => void fillFromMyLocation()}
        disabled={locating}
        aria-label={`Use my current location for the ${label}`}
      >
        {locating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Finding you
          </>
        ) : (
          <>
            <LocateFixed className="h-4 w-4" /> Get location
          </>
        )}
      </Button>
    </div>
  );
}
