import { forwardRef, useState, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input, type InputProps } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FieldWrapperProps {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
}

function FieldWrapper({ id, label, error, hint, children }: FieldWrapperProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={id} className="text-sm font-semibold">
          {label}
        </Label>
        {hint}
      </div>
      {children}
      {error ? (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export interface TextFieldProps extends InputProps {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ id, label, error, hint, className, ...props }, ref) => (
    <FieldWrapper id={id} label={label} error={error} hint={hint}>
      <Input
        id={id}
        ref={ref}
        aria-invalid={error ? true : undefined}
        className={cn(error && "border-destructive focus-visible:border-destructive", className)}
        {...props}
      />
    </FieldWrapper>
  ),
);
TextField.displayName = "TextField";

export const PasswordField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ id, label, error, hint, className, ...props }, ref) => {
    const [visible, setVisible] = useState(false);

    return (
      <FieldWrapper id={id} label={label} error={error} hint={hint}>
        <div className="relative">
          <Input
            id={id}
            ref={ref}
            type={visible ? "text" : "password"}
            aria-invalid={error ? true : undefined}
            className={cn(
              "pr-11",
              error && "border-destructive focus-visible:border-destructive",
              className,
            )}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((current) => !current)}
            className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted-foreground transition-colors hover:text-foreground"
            aria-label={visible ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </FieldWrapper>
    );
  },
);
PasswordField.displayName = "PasswordField";
