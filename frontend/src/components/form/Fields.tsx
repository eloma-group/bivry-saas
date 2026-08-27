import {
  useFormContext,
  Controller,
  get,
  type FieldValues,
  type RegisterOptions,
} from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, Check, ChevronDown } from "lucide-react";
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
  action,
  actionSize = "label",
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
        <Input
          id={name}
          type={type}
          inputMode={digitsOnly ? "numeric" : undefined}
          placeholder={placeholder}
          readOnly={readOnly}
          maxLength={maxLength}
          aria-readonly={readOnly || undefined}
          aria-invalid={!!error}
          className={cn(
            error && "border-red-300 focus-visible:ring-red-500/10",
            readOnly && "cursor-not-allowed bg-secondary/70 text-muted-foreground",
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

interface DateFieldProps extends BaseFieldProps {
  readOnly?: boolean;
  min?: string;
  max?: string;
  hint?: string;
  /**
   * Drops the decorative leading calendar icon. In a narrow table column the
   * icon's indent plus the browser's own picker button squeezes the date out of
   * the box, and the native picker is the only one of the two that does
   * anything.
   */
  compact?: boolean;
}

/** Reusable date picker (native, styled) wired to react-hook-form. */
export function DateField({
  name,
  label,
  rules,
  required,
  readOnly,
  min,
  max,
  hint,
  compact,
  className,
}: DateFieldProps) {
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
      <div className="relative">
        {!compact && (
          <CalendarDays className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        )}
        <Input
          id={name}
          type="date"
          readOnly={readOnly}
          min={min}
          max={max}
          aria-invalid={!!error}
          className={cn(
            compact ? "px-3" : "pl-10",
            error && "border-red-300 focus-visible:ring-red-500/10",
            readOnly && "cursor-not-allowed bg-secondary/70 text-muted-foreground"
          )}
          {...register(name, rules)}
        />
      </div>
    </FieldShell>
  );
}

interface SelectFieldProps extends BaseFieldProps {
  options: readonly string[];
  placeholder?: string;
}

/** Reusable select wired to react-hook-form via Controller. */
export function SelectField({
  name,
  label,
  options,
  placeholder = "Select…",
  rules,
  required,
  className,
}: SelectFieldProps) {
  const {
    control,
    formState: { errors },
  } = useFormContext();
  const error = get(errors, name)?.message as string | undefined;

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
          <Select
            value={(field.value as string) || ""}
            onValueChange={field.onChange}
          >
            <SelectTrigger
              className={cn(error && "border-red-300 focus:ring-red-500/10")}
            >
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
    </FieldShell>
  );
}

interface MultiSelectFieldProps extends BaseFieldProps {
  options: readonly string[];
  placeholder?: string;
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
  className,
}: MultiSelectFieldProps) {
  const {
    control,
    formState: { errors },
  } = useFormContext();
  const error = get(errors, name)?.message as string | undefined;

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
                  {options.map((option) => {
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
                </ul>
              </PopoverContent>
            </Popover>
          );
        }}
      />
    </FieldShell>
  );
}
