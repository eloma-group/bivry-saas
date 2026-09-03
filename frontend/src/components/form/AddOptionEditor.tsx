import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useOptionLists } from "@/context/OptionListsContext";
import { OPTION_VALUE_MAX } from "@/services/optionService";
import { ApiRequestError } from "@/services/api";

/**
 * The box that adds one option to a dropdown.
 *
 * It opens in place, under the field, rather than in a dialog. Two reasons: a
 * select owns every keystroke inside its own popup - it uses them to jump to a
 * matching option - so a text box in there fights the list; and a dialog opening
 * as a select closes hands focus back and forth between two layers, which is
 * fiddly to get right and worth avoiding for a one line answer.
 *
 * What is typed is stored against the list's key, so every form that offers
 * that dropdown offers it from then on, for everybody.
 */
export function AddOptionEditor({
  open,
  onClose,
  listKey,
  label,
  existing,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  /** Which dropdown it is added to. */
  listKey: string;
  /** The field's own label, so the box can name what is being added. */
  label: string;
  /** What the dropdown already offers, so a duplicate is caught before saving. */
  existing: readonly string[];
  /** Hands back the option as stored, for the field to select. */
  onAdded: (value: string) => void;
}) {
  const { add } = useOptionLists();
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // A fresh box every time it opens, rather than whatever was typed and
  // abandoned last time, and the cursor already in it.
  useEffect(() => {
    if (!open) return;
    setValue("");
    setError(null);
    setSaving(false);
    // After the select has finished handing focus back to its trigger.
    const id = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => window.clearTimeout(id);
  }, [open]);

  async function save() {
    const trimmed = value.trim();
    if (!trimmed) {
      setError(`Type the ${label.toLowerCase()} to add.`);
      return;
    }

    // Already on the list, in whatever casing. Pick it rather than adding a
    // second spelling of the same thing.
    const already = existing.find((option) => option.toLowerCase() === trimmed.toLowerCase());
    if (already) {
      onAdded(already);
      onClose();
      return;
    }

    setSaving(true);
    try {
      const stored = await add(listKey, trimmed);
      onAdded(stored);
      onClose();
      toast.success("Option added", { description: `"${stored}" is now on the list.` });
    } catch (caught) {
      setSaving(false);
      setError(
        caught instanceof ApiRequestError
          ? caught.message
          : "Could not add that option. Please try again.",
      );
    }
  }

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="flex items-start gap-2 pt-2">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Input
                ref={inputRef}
                value={value}
                maxLength={OPTION_VALUE_MAX}
                placeholder={`New ${label.toLowerCase()}`}
                aria-label={`New ${label.toLowerCase()}`}
                aria-invalid={!!error}
                onChange={(event) => {
                  setValue(event.target.value);
                  if (error) setError(null);
                }}
                onKeyDown={(event) => {
                  // Enter saves and Escape closes. This sits inside a form, so
                  // Enter has to be stopped or it would submit the whole thing.
                  if (event.key === "Enter") {
                    event.preventDefault();
                    if (!saving) void save();
                  }
                  if (event.key === "Escape") {
                    event.preventDefault();
                    onClose();
                  }
                }}
                className={error ? "border-red-300 focus-visible:ring-red-500/10" : undefined}
              />
              <p className={error ? "text-xs font-medium text-red-500" : "text-xs text-muted-foreground"}>
                {error ?? "Saved for everyone: it is offered here from now on."}
              </p>
            </div>

            <Button
              type="button"
              size="icon"
              className="h-11 w-11 shrink-0"
              onClick={() => void save()}
              disabled={saving}
              aria-label={`Add ${label.toLowerCase()}`}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="h-11 w-11 shrink-0"
              onClick={onClose}
              disabled={saving}
              aria-label="Cancel"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
