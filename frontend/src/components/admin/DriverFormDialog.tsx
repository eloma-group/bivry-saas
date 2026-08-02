import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormAlert } from "@/components/auth/FormAlert";
import { adminService, type AccountStatus, type AdminDriverRow } from "@/services/adminService";
import { ApiRequestError } from "@/services/api";
import { ACCOUNT_STATUS, ACCOUNT_STATUS_ORDER } from "@/constants/adminStatus";
import { COUNTRIES } from "@/constants/options";

interface DriverFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Editing an existing driver, or undefined to create a new one. */
  driver?: {
    id: string;
    email: string;
    firstName: string;
    middleName: string | null;
    lastName: string | null;
    phone: string | null;
    dateOfBirth: string | null;
    nationality: string | null;
    status: AccountStatus;
  };
  onSaved: (driver?: AdminDriverRow) => void;
}

interface FormState {
  email: string;
  password: string;
  firstName: string;
  middleName: string;
  lastName: string;
  phone: string;
  dateOfBirth: string;
  nationality: string;
  status: AccountStatus;
}

const BLANK: FormState = {
  email: "",
  password: "",
  firstName: "",
  middleName: "",
  lastName: "",
  phone: "",
  dateOfBirth: "",
  nationality: "",
  status: "ACTIVE",
};

function Field({
  id,
  label,
  children,
  error,
  className,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
  error?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={id} className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      <div className="mt-1.5">{children}</div>
      {error && <p className="mt-1 text-xs font-medium text-red-500">{error}</p>}
    </div>
  );
}

/**
 * Create or edit a driver account.
 *
 * The email is only editable while creating: afterwards it identifies the account
 * the driver signs in with, so it is shown read only. The rest of the onboarding
 * detail (licence, documents) stays the driver's own to fill in.
 */
export function DriverFormDialog({
  open,
  onOpenChange,
  driver,
  onSaved,
}: DriverFormDialogProps) {
  const editing = driver !== undefined;
  const [values, setValues] = useState<FormState>(BLANK);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Reopening the dialog always starts from what is actually stored.
  useEffect(() => {
    if (!open) return;
    setFormError(null);
    setFieldErrors({});
    setValues(
      driver
        ? {
            email: driver.email,
            password: "",
            firstName: driver.firstName,
            middleName: driver.middleName ?? "",
            lastName: driver.lastName ?? "",
            phone: driver.phone ?? "",
            dateOfBirth: driver.dateOfBirth ? driver.dateOfBirth.slice(0, 10) : "",
            nationality: driver.nationality ?? "",
            status: driver.status,
          }
        : BLANK,
    );
  }, [open, driver]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    setFieldErrors({});

    try {
      const shared = {
        firstName: values.firstName.trim(),
        middleName: values.middleName.trim() || null,
        lastName: values.lastName.trim() || null,
        phone: values.phone.trim() || null,
        dateOfBirth: values.dateOfBirth || null,
        nationality: values.nationality || null,
        status: values.status,
      };

      const saved = editing
        ? await adminService.updateDriver(driver.id, shared)
        : await adminService.createDriver({
            ...shared,
            email: values.email.trim(),
            password: values.password,
          });

      toast.success(editing ? "Driver updated" : "Driver created", {
        description: saved.email,
      });
      onSaved(saved);
      onOpenChange(false);
    } catch (caught) {
      if (caught instanceof ApiRequestError) {
        setFormError(caught.message);
        setFieldErrors(caught.fieldMap);
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={saving ? undefined : onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit driver" : "New driver"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Update this driver's details. Their email cannot change: it identifies the account."
              : "Creates an account the driver can sign in with straight away to complete their onboarding."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {formError ? <FormAlert tone="error" message={formError} /> : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field id="firstName" label="First name" error={fieldErrors.firstName}>
              <Input
                id="firstName"
                value={values.firstName}
                onChange={(event) => set("firstName", event.target.value)}
                required
              />
            </Field>
            <Field id="middleName" label="Middle name" error={fieldErrors.middleName}>
              <Input
                id="middleName"
                value={values.middleName}
                onChange={(event) => set("middleName", event.target.value)}
              />
            </Field>
            <Field id="lastName" label="Last name" error={fieldErrors.lastName}>
              <Input
                id="lastName"
                value={values.lastName}
                onChange={(event) => set("lastName", event.target.value)}
              />
            </Field>

            <Field
              id="email"
              label="Email"
              error={fieldErrors.email}
              className="sm:col-span-2"
            >
              <Input
                id="email"
                type="email"
                value={values.email}
                onChange={(event) => set("email", event.target.value)}
                readOnly={editing}
                className={editing ? "cursor-not-allowed bg-secondary/70 text-muted-foreground" : ""}
                required
              />
            </Field>
            <Field id="phone" label="Phone" error={fieldErrors.phone}>
              <Input
                id="phone"
                type="tel"
                value={values.phone}
                onChange={(event) => set("phone", event.target.value)}
              />
            </Field>

            {!editing && (
              <Field
                id="password"
                label="Temporary password"
                error={fieldErrors.password}
                className="sm:col-span-3"
              >
                <Input
                  id="password"
                  type="text"
                  value={values.password}
                  onChange={(event) => set("password", event.target.value)}
                  placeholder="At least 8 characters, with a capital and a number"
                  autoComplete="off"
                  required
                />
              </Field>
            )}

            <Field id="dateOfBirth" label="Date of birth" error={fieldErrors.dateOfBirth}>
              <Input
                id="dateOfBirth"
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                value={values.dateOfBirth}
                onChange={(event) => set("dateOfBirth", event.target.value)}
              />
            </Field>

            <Field id="nationality" label="Nationality" error={fieldErrors.nationality}>
              <Select
                value={values.nationality}
                onValueChange={(value) => set("nationality", value)}
              >
                <SelectTrigger id="nationality">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((country) => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field id="status" label="Account status" error={fieldErrors.status}>
              <Select
                value={values.status}
                onValueChange={(value) => set("status", value as AccountStatus)}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_STATUS_ORDER.map((value) => (
                    <SelectItem key={value} value={value}>
                      {ACCOUNT_STATUS[value].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editing ? "Save changes" : "Create driver"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
