import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { PanelError, PanelLoader } from "@/components/common/PanelState";
import { CustomerInfoSection } from "@/components/customer/forms/CustomerInfoSection";
import { AddressSection } from "@/components/customer/forms/AddressSection";
import { CommunicationSection } from "@/components/customer/forms/CommunicationSection";
import { DirectorsSection } from "@/components/customer/forms/DirectorsSection";
import { BillingSection } from "@/components/customer/forms/BillingSection";
import { DocumentsSection } from "@/components/customer/forms/DocumentsSection";
import { TextField } from "@/components/form/Fields";
import { rules } from "@/utils/validation";
import { DocumentSourceProvider } from "@/context/DocumentSourceContext";
import { OnboardingCanvas } from "@/components/form/OnboardingCanvas";
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
import { adminService, type AccountStatus } from "@/services/adminService";
import { ApiRequestError } from "@/services/api";
import { emptyFormValues, saveOnboarding, toFormValues } from "@/services/customerOnboarding";
import { customerDocuments } from "@/services/customerDocuments";
import type { CustomerOnboardingData } from "@/services/customerService";
import type { CustomerFormValues } from "@/types/customer";

const ACCOUNT_STATUSES: { value: AccountStatus; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: "ACTIVE", label: "Active" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "DEACTIVATED", label: "Deactivated" },
];

const PASSWORD_HINT = "At least 8 characters, with a capital and a number";

function passwordProblem(value: string): string | null {
  if (value.length < 8) return "Password must be at least 8 characters";
  if (!/[a-z]/.test(value)) return "Password must contain a lowercase letter";
  if (!/[A-Z]/.test(value)) return "Password must contain an uppercase letter";
  if (!/[0-9]/.test(value)) return "Password must contain a number";
  return null;
}

/**
 * One customer's whole record, created or edited by an admin.
 *
 * The counterpart of AdminVendorEditPage, and built the same way: this is the
 * customer's own onboarding form rendered for somebody else's record, so there
 * is one set of fields and one set of rules whoever is filling them in.
 *
 * The Login Email field below is the one exception. On the customer's own form
 * the email is read only, because it identifies the account; here it is
 * editable, because correcting an address somebody mistyped at signup is a fix
 * only an admin can make.
 */
export function AdminCustomerEditPage({ customerId }: { customerId?: string }) {
  const navigate = useNavigate();
  const creating = !customerId;

  const [data, setData] = useState<CustomerOnboardingData | null>(null);
  const [loading, setLoading] = useState(!creating);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [status, setStatus] = useState<AccountStatus>("ACTIVE");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const methods = useForm<CustomerFormValues>({
    defaultValues: emptyFormValues(),
    mode: "onTouched",
  });

  const documentSource = useMemo(
    () =>
      customerId
        ? {
            link: (documentId: string) =>
              adminService.customerDocumentLink(customerId, documentId),
            blob: (documentId: string) =>
              adminService.fetchCustomerDocumentBlobUrl(customerId, documentId),
          }
        : customerDocuments,
    [customerId],
  );

  const load = useCallback(async () => {
    if (!customerId) return;
    setLoading(true);
    setError(null);
    try {
      const fresh = await adminService.getCustomer(customerId);
      setData(fresh);
      setStatus(fresh.status);
      methods.reset(toFormValues(fresh));
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not load this customer");
    } finally {
      setLoading(false);
    }
  }, [customerId, methods]);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * Saves without insisting the whole record is complete. Creating is the
   * exception: an account cannot exist without an email and a password, so
   * those two are checked.
   */
  async function save() {
    const values = methods.getValues();
    const email = values.email.trim().toLowerCase();

    if (creating) {
      const ok = await methods.trigger(["email"]);
      const problem = passwordProblem(password);
      setPasswordError(problem);
      if (!ok || problem) {
        toast.error("Some details are still needed", {
          description: "An email and a password are what an account needs to exist.",
        });
        return;
      }
    } else if (password) {
      const problem = passwordProblem(password);
      setPasswordError(problem);
      if (problem) return;
    }

    setSaving(true);

    try {
      const id = creating
        ? (
            await adminService.createCustomer({
              email,
              password,
              companyName: values.companyName.trim() || null,
              tradingNames: values.tradingNames
                .map((row) => row.name.trim())
                .filter((name) => name !== ""),
              legalName: values.legalName.trim() || null,
              abn: values.abn.trim() || null,
              acn: values.acn.trim() || null,
              abnStatus: values.abnStatus.trim() || null,
              entityType: values.entityType.trim() || null,
              gst: values.gst.trim() || null,
              websiteAddress: values.websiteAddress.trim() || null,
              creationDate: values.creationDate || null,
              status,
            })
          ).id
        : customerId!;

      if (!creating) {
        await adminService.updateCustomer(id, {
          ...(email && email !== data?.email ? { email } : {}),
          status,
        });

        if (password) await adminService.setCustomerPassword(id, password);
      }

      await saveOnboarding(values, data, adminService.customerOnboarding(id));

      setPassword("");
      setPasswordError(null);

      if (creating) {
        toast.success("Customer created", { description: email });
        navigate(`/admin/onboarding/customer/${id}`);
        return;
      }

      const fresh = await adminService.getCustomer(id);
      setData(fresh);
      setStatus(fresh.status);
      methods.reset(toFormValues(fresh));
      toast.success("Customer saved", { description: fresh.email });
    } catch (err) {
      toast.error(
        creating ? "Could not create this customer" : "Could not save this customer",
        {
          description:
            err instanceof ApiRequestError
              ? err.message
              : "Please check your connection and try again.",
        },
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PanelLoader label="Loading customer" />;
  if (error || (!creating && !data)) {
    return <PanelError message={error ?? "Not found"} onRetry={() => void load()} />;
  }

  const name = data
    ? data.companyName || [data.firstName, data.lastName].filter(Boolean).join(" ") || data.email
    : "";
  const saveLabel = creating ? "Create customer" : "Save all changes";
  const busyLabel = creating ? "Creating" : "Saving";

  const saveButton = (type: "button" | "submit") => (
    <Button
      type={type}
      onClick={type === "button" ? () => void save() : undefined}
      disabled={saving}
    >
      {saving ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" /> {busyLabel}
        </>
      ) : (
        <>
          <Save className="h-4 w-4" /> {saveLabel}
        </>
      )}
    </Button>
  );

  return (
    <DocumentSourceProvider source={documentSource}>
      <OnboardingCanvas>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link
              to={
                creating
                  ? "/admin/onboarding/customer"
                  : `/admin/onboarding/customer/${customerId}`
              }
            >
              <ArrowLeft className="h-4 w-4" /> {creating ? "All customers" : `Back to ${name}`}
            </Link>
          </Button>

          {saveButton("button")}
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {creating ? "New customer" : `Edit ${name}`}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {creating
              ? "The whole record in one place. Only an email and a password are needed to create the account; everything else can be filled in now or later."
              : "Every field on this customer's record, including the ones they would normally fill in themselves."}
          </p>
        </div>

        {/* Both blocks below read the same form. The account is not part of the
            onboarding record, but the email it signs in with is a field on it. */}
        <FormProvider {...methods}>
          {/* The account: whether this customer can sign in, and with what. */}
          <section className="mb-6 rounded-3xl border border-border/70 bg-card p-6 shadow-card">
            <header className="mb-4">
              <h2 className="text-base font-semibold tracking-tight text-foreground">Account</h2>
              <p className="text-sm text-muted-foreground">
                Whether this customer can sign in, and what they sign in with.
              </p>
            </header>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <TextField
                name="email"
                label="Login Email"
                type="email"
                placeholder="accounts@company.com"
                required
                rules={rules.email}
                hint="What this customer signs in with. Correcting it here is the only way it changes."
              />

              <div className="space-y-2">
                <Label htmlFor="account-status">Account status</Label>
                <Select value={status} onValueChange={(value) => setStatus(value as AccountStatus)}>
                  <SelectTrigger id="account-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_STATUSES.map((entry) => (
                      <SelectItem key={entry.value} value={entry.value}>
                        {entry.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Suspended and Deactivated both stop this customer signing in.
                </p>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="customer-password">
                  Password{creating ? <span className="ml-0.5 text-destructive">*</span> : null}
                </Label>
                <Input
                  id="customer-password"
                  type="text"
                  autoComplete="off"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (passwordError) setPasswordError(null);
                  }}
                  placeholder={PASSWORD_HINT}
                  aria-invalid={passwordError ? true : undefined}
                />
                {passwordError ? (
                  <p className="text-xs font-medium text-destructive">{passwordError}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {creating
                      ? "Set it now and pass it on to the customer yourself. They can change it later."
                      : "Leave blank to keep the current password. Setting a new one signs every existing session out."}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* The onboarding record: the customer's own form, for somebody else. */}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
            className="space-y-6"
          >
            {/* The email lives in the Account block above, editable. */}
            <CustomerInfoSection showAccountEmail={false} />
            <AddressSection />
            <CommunicationSection />
            <DirectorsSection />
            <BillingSection />
            <DocumentsSection />

            <div className="flex flex-wrap items-center justify-end gap-2 pb-2">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  navigate(
                    creating
                      ? "/admin/onboarding/customer"
                      : `/admin/onboarding/customer/${customerId}`,
                  )
                }
                disabled={saving}
              >
                Cancel
              </Button>
              {saveButton("submit")}
            </div>
          </form>
        </FormProvider>
      </OnboardingCanvas>
    </DocumentSourceProvider>
  );
}
