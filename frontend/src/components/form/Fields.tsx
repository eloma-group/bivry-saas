import { useMemo, useRef, useState } from "react";
import {
  useFormContext,
  Controller,
  get,
  type FieldValues,
  type RegisterOptions,
} from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarClock, CalendarDays, Check, ChevronDown, Clock, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AddOptionEditor } from "@/components/form/AddOptionEditor";
import { useOptionLists } from "@/context/OptionListsContext";
import { decimals } from "@/utils/decimals";

/**
 * The shared field kit.
 *
 * Every input here is bound by field path rather than by a typed key, so the
 * same components serve the driver wizard and the vendor wizard without
 * either of them knowing about the other's value shape.
 */

type FieldName = string;

/** Validators are written once and reused across every path, so the rules stay loose. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FieldRules = RegisterOptions<FieldValues, any>;

interface BaseFieldProps {
  name: FieldName;
  label: string;
  className?: string;
  rules?: FieldRules;
  required?: boolean;
}

/** Floating-style label shell shared by every field, with inline error slot. */
export function FieldShell({
  label,
  htmlFor,
  required,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  /** Helper line under the input. An error takes its place while one is shown. */
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {label}
        {required && <span className="ml-0.5 text-primary">*</span>}
      </label>
      {children}
      {hint && !error ? (
        <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>
      ) : null}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="text-xs font-medium text-red-500"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

interface TextFieldProps extends BaseFieldProps {
  type?: string;
  placeholder?: string;
  readOnly?: boolean;
  hint?: string;
  /**
   * A hard cap on what can be typed, on top of whatever `rules` checks.
   *
   * Stopping the keystroke is kinder than accepting fifty more characters and
   * then refusing them on submit, and it also stops a value the API would
   * reject ever reaching it.
   */
  maxLength?: number;
  /**
   * A number the field holds as digits and nothing else - an ABN, a BSB.
   *
   * Two things follow from it. Anything that is not a digit is dropped as it is
   * typed or pasted, so a letter never lands in the box at all, and the value is
   * checked on every keystroke rather than on the way out of the field: a number
   * of a fixed length is either right or wrong the moment the last digit lands,
   * and saying so then beats saying it once the cursor has moved on.
   */
  digitsOnly?: boolean;
  /**
   * An amount the field holds as digits and at most one dot - a price.
   *
   * The alternative is `type="number"`, and it is worse for money on three
   * counts: the browser puts a spinner in the box, so a price can be nudged up
   * and down a dollar at a time by a stray click; the scroll wheel changes the
   * value while the page is being scrolled past it; and it accepts "1e5" and a
   * leading minus, neither of which is a price. This is a plain text box that
   * simply refuses anything but digits and a decimal point as they are typed
   * or pasted, so none of the three can happen.
   */
  decimalOnly?: boolean;
  /**
   * A control parked at the right hand end of the input, inside its border.
   *
   * Used where a field can fill itself in (the ABN and its lookup) or clear
   * itself away (one trading name of several). It sits in the box rather than
   * beside it so it reads as belonging to that value, and so the grid keeps its
   * columns.
   */
  action?: React.ReactNode;
  /** How much room to keep clear for the action. Defaults to a labelled button. */
  actionSize?: "icon" | "label";
  /** A fixed adornment parked inside the left of the box - a "$" on a money field. */
  prefix?: string;
}

/** Reusable text/email/number input wired to react-hook-form. */
export function TextField({
  name,
  label,
  type = "text",
  placeholder,
  rules,
  required,
  readOnly,
  hint,
  maxLength,
  digitsOnly,
  decimalOnly,
  action,
  actionSize = "label",
  prefix,
  className,
}: TextFieldProps) {
  const {
    register,
    trigger,
    formState: { errors },
  } = useFormContext();
  const error = get(errors, name)?.message as string | undefined;
  const field = register(name, rules);

  return (
    <FieldShell
      label={label}
      htmlFor={name}
      required={required}
      error={error}
      hint={hint}
      className={className}
    >
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
            {prefix}
          </span>
        )}
        <Input
          id={name}
          type={type}
          inputMode={digitsOnly ? "numeric" : decimalOnly ? "decimal" : undefined}
          placeholder={placeholder}
          readOnly={readOnly}
          maxLength={maxLength}
          aria-readonly={readOnly || undefined}
          aria-invalid={!!error}
          className={cn(
            error && "border-red-300 focus-visible:ring-red-500/10",
            readOnly && "cursor-not-allowed bg-secondary/70 text-muted-foreground",
            prefix && "pl-7",
            action && (actionSize === "icon" ? "pr-11" : "pr-28")
          )}
          {...field}
          onChange={
            digitsOnly
              ? (event) => {
                  const digits = event.target.value.replace(/\D/g, "");
                  if (digits !== event.target.value) event.target.value = digits;
                  void field.onChange(event);
                  void trigger(name);
                }
              : decimalOnly
                ? (event) => {
                    const cleaned = decimals(event.target.value);
                    if (cleaned !== event.target.value) event.target.value = cleaned;
                    void field.onChange(event);
                  }
                : field.onChange
          }
        />
        {action && (
          <div className="absolute inset-y-0 right-1.5 flex items-center">{action}</div>
        )}
      </div>
    </FieldShell>
  );
}

interface TextAreaFieldProps extends BaseFieldProps {
  placeholder?: string;
  hint?: string;
  /** How tall the box opens. Defaults to three lines. */
  rows?: number;
  maxLength?: number;
}

/** Reusable multi-line text box wired to react-hook-form. */
export function TextAreaField({
  name,
  label,
  placeholder,
  rules,
  required,
  hint,
  rows = 3,
  maxLength,
  className,
}: TextAreaFieldProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext();
  const error = get(errors, name)?.message as string | undefined;

  return (
    <FieldShell
      label={label}
      htmlFor={name}
      required={required}
      error={error}
      hint={hint}
      className={className}
    >
      <textarea
        id={name}
        rows={rows}
        placeholder={placeholder}
        maxLength={maxLength}
        aria-invalid={!!error}
        className={cn(
          "flex w-full resize-y rounded-lg border border-input bg-secondary/40 px-3.5 py-2.5 text-sm text-foreground transition-all duration-200 placeholder:text-muted-foreground/70 focus-visible:border-primary focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10",
          error && "border-red-300 focus-visible:ring-red-500/10",
        )}
        {...register(name, rules)}
      />
    </FieldShell>
  );
}

interface DateFieldProps extends BaseFieldProps {
  readOnly?: boolean;
  min?: string;
  max?: string;
  hint?: string;
  /**
   * What the field picks: a date (default), a time of day, or both. A time
   * field shows its hours in the browser's own 12-hour am/pm form where the
   * locale uses one.
   */
  type?: "date" | "time" | "datetime-local";
  /**
   * Drops the decorative leading icon. In a narrow table column the icon's
   * indent plus the browser's own picker button squeezes the date out of the
   * box, and the native picker is the only one of the two that does anything.
   */
  compact?: boolean;
}

/** Reusable date/time picker (native, styled) wired to react-hook-form. */
export function DateField({
  name,
  label,
  rules,
  required,
  readOnly,
  min,
  max,
  hint,
  type = "date",
  compact,
  className,
}: DateFieldProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext();
  const error = get(errors, name)?.message as string | undefined;
  const field = register(name, rules);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // The one icon that opens the picker. A date shows a calendar, a time a clock,
  // and both together a calendar-clock.
  const Icon = type === "time" ? Clock : type === "datetime-local" ? CalendarClock : CalendarDays;

  // The left icon is the only way in: the native picker button on the right is
  // hidden below, so clicking the icon opens the browser's own picker.
  function openPicker() {
    const el = inputRef.current;
    if (!el || readOnly) return;
    if (typeof el.showPicker === "function") {
      try {
        el.showPicker();
        return;
      } catch {
        // Some browsers refuse showPicker outside a user gesture; fall back.
      }
    }
    el.focus();
  }

  return (
    <FieldShell
      label={label}
      htmlFor={name}
      required={required}
      error={error}
      hint={hint}
      className={className}
    >
      <div className="relative">
        {!compact && (
          <button
            type="button"
            onClick={openPicker}
            tabIndex={-1}
            aria-hidden
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          >
            <Icon className="h-4 w-4" />
          </button>
        )}
        <Input
          id={name}
          type={type}
          readOnly={readOnly}
          min={min}
          max={max}
          aria-invalid={!!error}
          name={field.name}
          onChange={field.onChange}
          onBlur={field.onBlur}
          ref={(el) => {
            field.ref(el);
            inputRef.current = el;
          }}
          className={cn(
            compact ? "px-3" : "pl-10",
            // Hide the browser's own picker indicator so only the left icon shows.
            !compact && "[&::-webkit-calendar-picker-indicator]:hidden",
            error && "border-red-300 focus-visible:ring-red-500/10",
            readOnly && "cursor-not-allowed bg-secondary/70 text-muted-foreground"
          )}
        />
      </div>
    </FieldShell>
  );
}

/**
 * The value the "Add" row at the bottom of a dropdown carries.
 *
 * A sentinel rather than a button parked under the list, because a select owns
 * every keystroke and pointer event inside its own popup - anything that is not
 * one of its items is not reliably clickable, and is skipped by the keyboard.
 * Picking it is caught before the value ever reaches the form, so the sentinel
 * itself can never be stored.
 */
const ADD_OPTION = "__bivry_add_option__";

/**
 * The options one dropdown offers: what it ships with, then what people have
 * added to it.
 *
 * The two are merged rather than replaced, so the built in list is always
 * offered even before anything is read from the API, and an addition that
 * repeats one of them - in any casing - is dropped rather than listed twice.
 */
function useMergedOptions(
  options: readonly string[],
  listKey: string | undefined,
): readonly string[] {
  const { added } = useOptionLists();
  const extra = added(listKey);

  return useMemo(() => {
    if (extra.length === 0) return options;
    const seen = new Set(options.map((option) => option.toLowerCase()));
    return [...options, ...extra.filter((option) => !seen.has(option.toLowerCase()))];
  }, [options, extra]);
}

/** The row that opens the "add an option" box, shown at the foot of a list. */
function AddOptionRow() {
  return (
    <SelectItem
      value={ADD_OPTION}
      className="mt-1 border-t border-border/60 pt-2 font-medium text-primary"
    >
      <span className="flex items-center gap-1.5">
        <Plus className="h-3.5 w-3.5" /> Add
      </span>
    </SelectItem>
  );
}

interface SelectFieldProps extends BaseFieldProps {
  options: readonly string[];
  placeholder?: string;
  /**
   * Which stored list this dropdown belongs to, from `constants/optionLists.ts`.
   *
   * Given one, the list ends in an "Add" row: what somebody types there is
   * saved against this key and offered in every dropdown that names it, from
   * then on and for everybody. Left out, the dropdown offers `options` alone.
   */
  listKey?: string;
}

/** Reusable select wired to react-hook-form via Controller. */
export function SelectField({
  name,
  label,
  options,
  placeholder = "Select…",
  rules,
  required,
  listKey,
  className,
}: SelectFieldProps) {
  const {
    control,
    formState: { errors },
  } = useFormContext();
  const error = get(errors, name)?.message as string | undefined;
  const { canAdd } = useOptionLists();
  const merged = useMergedOptions(options, listKey);
  const [adding, setAdding] = useState(false);
  const offersAdd = Boolean(listKey) && canAdd;

  // Picking "Add" is noted here and acted on once the list has closed. Radix
  // reports the pick before the close, and opening the box in between would
  // hand focus to a text field the closing popup is about to take back.
  const wantsAdd = useRef(false);

  return (
    <FieldShell
      label={label}
      required={required}
      error={error}
      className={className}
    >
      <Controller
        control={control}
        name={name}
        rules={rules}
        render={({ field }) => (
          <>
            <Select
              value={(field.value as string) || ""}
              onValueChange={(value) => {
                // The "Add" row is not an answer: it opens the box instead, and
                // whatever the field was holding stays selected meanwhile.
                if (value === ADD_OPTION) {
                  wantsAdd.current = true;
                  return;
                }
                field.onChange(value);
              }}
              onOpenChange={(open) => {
                if (open || !wantsAdd.current) return;
                wantsAdd.current = false;
                setAdding(true);
              }}
            >
              <SelectTrigger
                className={cn(error && "border-red-300 focus:ring-red-500/10")}
              >
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
              <SelectContent>
                {merged.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
                {offersAdd && <AddOptionRow />}
              </SelectContent>
            </Select>

            {offersAdd && (
              <AddOptionEditor
                open={adding}
                onClose={() => setAdding(false)}
                listKey={listKey as string}
                label={label}
                existing={merged}
                // Adding one is also choosing it: nobody adds an option to a
                // field they are filling in and then means to pick another.
                onAdded={(value) => field.onChange(value)}
              />
            )}
          </>
        )}
      />
    </FieldShell>
  );
}

interface MultiSelectFieldProps extends BaseFieldProps {
  options: readonly string[];
  placeholder?: string;
  /** Same as `SelectField`'s: the stored list this one adds to. */
  listKey?: string;
}

/**
 * Tick as many as apply. The value is a plain string array, which is what the
 * API stores for the coverage and invoice preference questions.
 */
export function MultiSelectField({
  name,
  label,
  options,
  placeholder = "Select…",
  rules,
  required,
  listKey,
  className,
}: MultiSelectFieldProps) {
  const {
    control,
    formState: { errors },
  } = useFormContext();
  const error = get(errors, name)?.message as string | undefined;
  const { canAdd } = useOptionLists();
  const merged = useMergedOptions(options, listKey);
  const [adding, setAdding] = useState(false);
  const offersAdd = Boolean(listKey) && canAdd;

  return (
    <FieldShell label={label} required={required} error={error} className={className}>
      <Controller
        control={control}
        name={name}
        rules={rules}
        render={({ field }) => {
          const selected: string[] = Array.isArray(field.value) ? field.value : [];

          const toggle = (option: string) => {
            field.onChange(
              selected.includes(option)
                ? selected.filter((value) => value !== option)
                : [...selected, option],
            );
          };

          return (
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-invalid={!!error}
                    className={cn(
                      "flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-border bg-white px-3.5 text-left text-sm transition-colors hover:border-primary/50 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/10",
                      error && "border-red-300 focus-visible:ring-red-500/10",
                    )}
                  >
                    <span
                      className={cn(
                        "truncate",
                        selected.length === 0 && "text-muted-foreground",
                      )}
                    >
                      {selected.length === 0 ? placeholder : selected.join(", ")}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="max-h-72 w-[--radix-popover-trigger-width] overflow-y-auto p-1.5">
                  <ul className="space-y-0.5">
                    {merged.map((option) => {
                      const checked = selected.includes(option);
                      return (
                        <li key={option}>
                          <button
                            type="button"
                            onClick={() => toggle(option)}
                            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-slate-600 transition-colors hover:bg-secondary hover:text-foreground"
                          >
                            <Checkbox checked={checked} className="pointer-events-none" />
                            <span className="flex-1">{option}</span>
                            {checked && <Check className="h-3.5 w-3.5 text-primary" />}
                          </button>
                        </li>
                      );
                    })}

                    {/* The same "Add" row the single select offers, at the foot
                        of the list. This popup holds plain buttons rather than
                        select items, so it is one more of them. */}
                    {offersAdd && (
                      <li className="mt-1 border-t border-border/60 pt-1">
                        <button
                          type="button"
                          onClick={() => setAdding(true)}
                          className="flex w-full items-center gap-1.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-primary transition-colors hover:bg-secondary"
                        >
                          <Plus className="h-3.5 w-3.5" /> Add
                        </button>
                      </li>
                    )}
                  </ul>
                </PopoverContent>
              </Popover>

              {offersAdd && (
                <AddOptionEditor
                  open={adding}
                  onClose={() => setAdding(false)}
                  listKey={listKey as string}
                  label={label}
                  existing={merged}
                  // Adding one ticks it. It is stored either way, so adding
                  // something already ticked changes nothing here.
                  onAdded={(value) => {
                    if (!selected.includes(value)) field.onChange([...selected, value]);
                  }}
                />
              )}
            </>
          );
        }}
      />
    </FieldShell>
  );
}
