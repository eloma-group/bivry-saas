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
import { adminService, type AccountStatus, type AdminVendorRow } from "@/services/adminService";
import { ApiRequestError } from "@/services/api";
import { ACCOUNT_STATUS, ACCOUNT_STATUS_ORDER } from "@/constants/adminStatus";

interface VendorFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Editing an existing supplier, or undefined to create a new one. */
  vendor?: {
    id: string;
    email: string;
    companyName: string;
    tradingName: string | null;
    legalName: string | null;
    contactPerson: string | null;
    abn: string | null;
    websiteAddress: string | null;
    phone: string | null;
    status: AccountStatus;
  };
  onSaved: (vendor?: AdminVendorRow) => void;
}

interface FormState {
  email: string;
  password: string;
  companyName: string;
  tradingName: string;
  legalName: string;
  contactPerson: string;
  abn: string;
  websiteAddress: string;
  phone: string;
  status: AccountStatus;
}

const BLANK: FormState = {
  email: "",
  password: "",
  companyName: "",
  tradingName: "",
  legalName: "",
  contactPerson: "",
  abn: "",
  websiteAddress: "",
  phone: "",
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
      <Label
        htmlFor={id}
        className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {label}
      </Label>
      <div className="mt-1.5">{children}</div>
      {error && <p className="mt-1 text-xs font-medium text-red-500">{error}</p>}
    </div>
  );
}

/**
 * Create or edit a supplier account.
 *
 * The email is only editable while creating: afterwards it identifies the
 * account the supplier signs in with, so it is shown read only. The rest of the
 * onboarding detail (bank, insurance, documents) stays the supplier's own to
 * fill in.
 */
export function VendorFormDialog({
  open,
  onOpenChange,
  vendor,
  onSaved,
}: VendorFormDialogProps) {
  const editing = vendor !== undefined;
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
      vendor
        ? {
            email: vendor.email,
            password: "",
            companyName: vendor.companyName,
            tradingName: vendor.tradingName ?? "",
            legalName: vendor.legalName ?? "",
            contactPerson: vendor.contactPerson ?? "",
            abn: vendor.abn ?? "",
            websiteAddress: vendor.websiteAddress ?? "",
            phone: vendor.phone ?? "",
            status: vendor.status,
          }
        : BLANK,
    );
  }, [open, vendor]);

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
        companyName: values.companyName.trim(),
        tradingName: values.tradingName.trim() || null,
        legalName: values.legalName.trim() || null,
        contactPerson: values.contactPerson.trim() || null,
        abn: values.abn.trim() || null,
        websiteAddress: values.websiteAddress.trim() || null,
        phone: values.phone.trim() || null,
        status: values.status,
      };

      const saved = editing
        ? await adminService.updateVendor(vendor.id, shared)
        : await adminService.createVendor({
            ...shared,
            email: values.email.trim(),
            password: values.password,
          });

      toast.success(editing ? "Supplier updated" : "Supplier created", {
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
          <DialogTitle>{editing ? "Edit supplier" : "New supplier"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Update this supplier's details. Their email cannot change: it identifies the account."
              : "Creates an account the supplier can sign in with straight away to complete their onboarding."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {formError ? <FormAlert tone="error" message={formError} /> : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field
              id="companyName"
              label="Company name"
              error={fieldErrors.companyName}
              className="sm:col-span-3"
            >
              <Input
                id="companyName"
                value={values.companyName}
                onChange={(event) => set("companyName", event.target.value)}
                required
              />
            </Field>

            <Field id="tradingName" label="Trading name" error={fieldErrors.tradingName}>
              <Input
                id="tradingName"
                value={values.tradingName}
                onChange={(event) => set("tradingName", event.target.value)}
              />
            </Field>
            <Field id="legalName" label="Legal name" error={fieldErrors.legalName}>
              <Input
                id="legalName"
                value={values.legalName}
                onChange={(event) => set("legalName", event.target.value)}
              />
            </Field>
            <Field id="abn" label="ABN" error={fieldErrors.abn}>
              <Input
                id="abn"
                value={values.abn}
                onChange={(event) => set("abn", event.target.value)}
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
                className={
                  editing ? "cursor-not-allowed bg-secondary/70 text-muted-foreground" : ""
                }
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

            <Field
              id="contactPerson"
              label="Contact person"
              error={fieldErrors.contactPerson}
            >
              <Input
                id="contactPerson"
                value={values.contactPerson}
                onChange={(event) => set("contactPerson", event.target.value)}
              />
            </Field>

            <Field
              id="websiteAddress"
              label="Website"
              error={fieldErrors.websiteAddress}
            >
              <Input
                id="websiteAddress"
                value={values.websiteAddress}
                onChange={(event) => set("websiteAddress", event.target.value)}
                placeholder="xyz.com"
              />
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
              {editing ? "Save changes" : "Create supplier"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
