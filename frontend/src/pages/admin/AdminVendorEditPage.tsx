import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { PanelError, PanelLoader } from "@/components/common/PanelState";
import { VendorInfoSection } from "@/components/vendor/forms/VendorInfoSection";
import { FieldShell, TextField } from "@/components/form/Fields";
import { rules } from "@/utils/validation";
import { ContactInfoSection } from "@/components/vendor/forms/ContactInfoSection";
import { DirectorsSection } from "@/components/vendor/forms/DirectorsSection";
import { BankDetailsSection } from "@/components/vendor/forms/BankDetailsSection";
import { BusinessCoverageSection } from "@/components/vendor/forms/BusinessCoverageSection";
import { AddressSection } from "@/components/vendor/forms/AddressSection";
import { AccreditationSection } from "@/components/vendor/forms/AccreditationSection";
import { InsuranceSection } from "@/components/vendor/forms/InsuranceSection";
import { ComplianceDocsSection } from "@/components/vendor/forms/ComplianceDocsSection";
import { DocumentSourceProvider } from "@/context/DocumentSourceContext";
import { OnboardingCanvas } from "@/components/form/OnboardingCanvas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminService, type AccountStatus } from "@/services/adminService";
import { ApiRequestError } from "@/services/api";
import { emptyFormValues, saveOnboarding, toFormValues } from "@/services/vendorOnboarding";
import { vendorDocuments } from "@/services/vendorDocuments";
import type { VendorOnboardingData } from "@/services/vendorService";
import type { VendorFormValues } from "@/types/vendor";

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
 * One vendor's whole record, created or edited by an admin.
 *
 * The counterpart of AdminDriverEditPage, and built the same way: this is the
 * vendor's own onboarding form rendered for somebody else's record, so there
 * is one set of fields and one set of rules whoever is filling them in.
 */
export function AdminVendorEditPage({ vendorId }: { vendorId?: string }) {
  const navigate = useNavigate();
  const creating = !vendorId;

  const [data, setData] = useState<VendorOnboardingData | null>(null);
  const [loading, setLoading] = useState(!creating);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [status, setStatus] = useState<AccountStatus>("ACTIVE");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const methods = useForm<VendorFormValues>({
    defaultValues: emptyFormValues(),
    mode: "onTouched",
  });

  const documentSource = useMemo(
    () =>
      vendorId
        ? {
            link: (documentId: string) => adminService.vendorDocumentLink(vendorId, documentId),
            blob: (documentId: string) =>
              adminService.fetchVendorDocumentBlobUrl(vendorId, documentId),
          }
        : vendorDocuments,
    [vendorId],
  );

  const load = useCallback(async () => {
    if (!vendorId) return;
    setLoading(true);
    setError(null);
    try {
      const fresh = await adminService.getVendor(vendorId);
      setData(fresh);
      setStatus(fresh.status);
      methods.reset(toFormValues(fresh));
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not load this vendor");
    } finally {
      setLoading(false);
    }
  }, [vendorId, methods]);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * Saves without insisting the whole record is complete. Creating is the
   * exception: an account cannot exist without an email, a company name and a
   * password, so those three are checked.
   */
  async function save() {
    const values = methods.getValues();
    const email = values.email.trim().toLowerCase();

    if (creating) {
      const ok = await methods.trigger(["companyName", "email"]);
      const problem = passwordProblem(password);
      setPasswordError(problem);
      if (!ok || problem) {
        toast.error("Some details are still needed", {
          description:
            "An email, a company name and a password are what an account needs to exist.",
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
            await adminService.createVendor({
              email,
              password,
              companyName: values.companyName.trim(),
              tradingNames: values.tradingNames
                .map((row) => row.name.trim())
                .filter((name) => name !== ""),
              legalName: values.legalName.trim() || null,
              // The account's contact person mirrors the operations contact, which
              // saveOnboarding writes a moment later. See saveCompany.
              contactPerson: values.operations.contactPerson.trim() || null,
              abn: values.abn.trim() || null,
              acn: values.acn.trim() || null,
              abnStatus: values.abnStatus.trim() || null,
              entityType: values.entityType.trim() || null,
              gst: values.gst.trim() || null,
              websiteAddress: values.websiteAddress.trim() || null,
              phone: values.phone.trim() || null,
              status,
            })
          ).id
        : vendorId!;

      if (!creating) {
        await adminService.updateVendor(id, {
          ...(email && email !== data?.email ? { email } : {}),
          status,
        });

        if (password) await adminService.setVendorPassword(id, password);
      }

      await saveOnboarding(values, data, adminService.vendorOnboarding(id));

      setPassword("");
      setPasswordError(null);

      if (creating) {
        toast.success("Vendor created", { description: email });
        navigate(`/admin/onboarding/vendor/${id}`);
        return;
      }

      const fresh = await adminService.getVendor(id);
      setData(fresh);
      setStatus(fresh.status);
      methods.reset(toFormValues(fresh));
      toast.success("Vendor saved", { description: fresh.email });
    } catch (err) {
      toast.error(creating ? "Could not create this vendor" : "Could not save this vendor", {
        description:
          err instanceof ApiRequestError
            ? err.message
            : "Please check your connection and try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PanelLoader label="Loading vendor" />;
  if (error || (!creating && !data)) {
    return <PanelError message={error ?? "Not found"} onRetry={() => void load()} />;
  }

  const name = data ? data.companyName || data.email : "";
  const saveLabel = creating ? "Create vendor" : "Save all changes";
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
            to={creating ? "/admin/onboarding/vendor" : `/admin/onboarding/vendor/${vendorId}`}
          >
            <ArrowLeft className="h-4 w-4" /> {creating ? "All vendors" : `Back to ${name}`}
          </Link>
        </Button>

        {saveButton("button")}
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {creating ? "New vendor" : `Edit ${name}`}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {creating
            ? "The whole record in one place. Only an email, a company name and a password are needed to create the account; everything else can be filled in now or later."
            : "Every field on this vendor's record, including the ones they would normally fill in themselves. Changes you make here keep whatever verification decision each section already has."}
        </p>
      </div>

      {/* Both blocks below read the same form. The account is not part of the
          onboarding record, but the email it signs in with is a field on it. */}
      <FormProvider {...methods}>
        {/* The account: whether this vendor can sign in, and with what. */}
        <section className="mb-6 rounded-3xl border border-border/70 bg-card p-6 shadow-card">
        <header className="mb-4">
          <h2 className="text-base font-semibold tracking-tight text-foreground">Account</h2>
          <p className="text-sm text-muted-foreground">
            Whether this vendor can sign in, and what they sign in with.
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
            hint="What this vendor signs in with. Correcting it here is the only way it changes."
          />

          {/* Neither of these is a form field, so they are not TextFields - but
              they sit on the same row as one, so they borrow its shell. That is
              what keeps the three labels and the three boxes on the same lines
              as each other rather than a few pixels apart. */}
          <FieldShell
            label="Account status"
            htmlFor="account-status"
            hint="Suspended and Deactivated both stop this vendor signing in."
          >
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
          </FieldShell>

          <FieldShell
            label="Password"
            htmlFor="vendor-password"
            required={creating}
            error={passwordError ?? undefined}
            hint={
              creating
                ? "Set it now and pass it on to the vendor yourself. They can change it later."
                : "Leave blank to keep the current password. Setting a new one signs every existing session out."
            }
            className="sm:col-span-2"
          >
            <Input
              id="vendor-password"
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
          </FieldShell>
        </div>
        </section>

        {/* The onboarding record: the vendor's own form, for somebody else. */}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
          className="space-y-6"
        >
          <VendorInfoSection />
          <ContactInfoSection />
          <BankDetailsSection />
          <AddressSection />
          <DirectorsSection />
          <BusinessCoverageSection />
          <AccreditationSection />
          <InsuranceSection />
          <ComplianceDocsSection />

          <div className="flex flex-wrap items-center justify-end gap-2 pb-2">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                navigate(
                  creating
                    ? "/admin/onboarding/vendor"
                    : `/admin/onboarding/vendor/${vendorId}`,
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
