import {
  useFormContext,
  Controller,
  get,
  type RegisterOptions,
} from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DriverFormValues } from "@/types/driver";

type FieldName = string;

interface BaseFieldProps {
  name: FieldName;
  label: string;
  className?: string;
  // `any` for the field-name generic keeps validators reusable across every
  // path without RHF narrowing the value type per-field.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rules?: RegisterOptions<DriverFormValues, any>;
  required?: boolean;
}

/** Floating-style label shell shared by every field, with inline error slot. */
function FieldShell({
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
  className,
}: TextFieldProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext<DriverFormValues>();
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
      <Input
        id={name}
        type={type}
        placeholder={placeholder}
        readOnly={readOnly}
        aria-readonly={readOnly || undefined}
        aria-invalid={!!error}
        className={cn(
          error && "border-red-300 focus-visible:ring-red-500/10",
          readOnly && "cursor-not-allowed bg-secondary/70 text-muted-foreground"
        )}
        {...register(name as keyof DriverFormValues, rules)}
      />
    </FieldShell>
  );
}

interface DateFieldProps extends BaseFieldProps {
  readOnly?: boolean;
  min?: string;
  max?: string;
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
  className,
}: DateFieldProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext<DriverFormValues>();
  const error = get(errors, name)?.message as string | undefined;

  return (
    <FieldShell
      label={label}
      htmlFor={name}
      required={required}
      error={error}
      className={className}
    >
      <div className="relative">
        <CalendarDays className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={name}
          type="date"
          readOnly={readOnly}
          min={min}
          max={max}
          aria-invalid={!!error}
          className={cn(
            "pl-10",
            error && "border-red-300 focus-visible:ring-red-500/10",
            readOnly && "cursor-not-allowed bg-secondary/70 text-muted-foreground"
          )}
          {...register(name as keyof DriverFormValues, rules)}
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
  } = useFormContext<DriverFormValues>();
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
        name={name as keyof DriverFormValues}
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
