import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { PanelError, PanelLoader } from "@/components/common/PanelState";
import { PersonalInfoSection } from "@/components/driver/forms/PersonalInfoSection";
import { AddressSection } from "@/components/driver/forms/AddressSection";
import { LicenceSection } from "@/components/driver/forms/LicenceSection";
import { DrivingHistorySection } from "@/components/driver/forms/DrivingHistorySection";
import { PoliceVerificationSection } from "@/components/driver/forms/PoliceVerificationSection";
import { VisaSection } from "@/components/driver/forms/VisaSection";
import { MedicalSection } from "@/components/driver/forms/MedicalSection";
import { DrugTestSection } from "@/components/driver/forms/DrugTestSection";
import { AdditionalDocsSection } from "@/components/driver/forms/AdditionalDocsSection";
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
import { emptyFormValues, saveOnboarding, toFormValues } from "@/services/driverOnboarding";
import { ownDocuments } from "@/hooks/useDocumentUrl";
import type { DriverOnboardingData } from "@/services/driverService";
import type { DriverFormValues } from "@/types/driver";

const ACCOUNT_STATUSES: { value: AccountStatus; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: "ACTIVE", label: "Active" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "DEACTIVATED", label: "Deactivated" },
];

/** What the API asks of a password, said the way the form should say it. */
const PASSWORD_HINT = "At least 8 characters, with a capital and a number";

function passwordProblem(value: string): string | null {
  if (value.length < 8) return "Password must be at least 8 characters";
  if (!/[a-z]/.test(value)) return "Password must contain a lowercase letter";
  if (!/[A-Z]/.test(value)) return "Password must contain an uppercase letter";
  if (!/[0-9]/.test(value)) return "Password must contain a number";
  return null;
}

/**
 * One driver's whole record, created or edited by an admin.
 *
 * This is the driver's own onboarding form, section for section, rendered for
 * somebody else's record. Reusing it rather than writing an admin copy is the
 * point: the fields, the validation and the conditional halves (an Australian
 * national is asked for a passport and a Medicare card in place of a visa) stay
 * identical whoever is filling them in, and there is only one of them to change
 * when a field is added.
 *
 * Creating and editing are the same screen on purpose. An admin adding a driver
 * is doing the same job as an admin correcting one, and splitting it into a
 * small dialog for the account and a big form for everything else meant neither
 * could finish the task on its own.
 *
 * Two things sit outside the onboarding form because they belong to the account
 * rather than the application: the account status, and the password.
 */
export function AdminDriverEditPage({ driverId }: { driverId?: string }) {
  const navigate = useNavigate();
  const creating = !driverId;

  const [data, setData] = useState<DriverOnboardingData | null>(null);
  const [loading, setLoading] = useState(!creating);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [status, setStatus] = useState<AccountStatus>("ACTIVE");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const methods = useForm<DriverFormValues>({
    defaultValues: emptyFormValues(),
    mode: "onTouched",
  });

  /**
   * Files are read through whichever API is allowed to: the admin one once
   * there is a driver to read them from, and the default until then. A new
   * driver has no stored files to preview, so nothing asks for one.
   */
  const documentSource = useMemo(
    () =>
      driverId
        ? {
            link: (documentId: string) => adminService.driverDocumentLink(driverId, documentId),
            blob: (documentId: string) =>
              adminService.fetchDriverDocumentBlobUrl(driverId, documentId),
          }
        : ownDocuments,
    [driverId],
  );

  const load = useCallback(async () => {
    if (!driverId) return;
    setLoading(true);
    setError(null);
    try {
      const fresh = await adminService.getDriver(driverId);
      setData(fresh);
      setStatus(fresh.status);
      methods.reset(toFormValues(fresh));
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not load this driver");
    } finally {
      setLoading(false);
    }
  }, [driverId, methods]);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * Saves without insisting the whole record is complete.
   *
   * An admin correcting one field on a half filled application should not be
   * made to finish somebody else's paperwork first, so this runs outside the
   * form's own validation. Creating is the exception: an account cannot exist
   * without an email, a name and a password, so those three are checked.
   */
  async function save() {
    const values = methods.getValues();
    const email = values.email.trim().toLowerCase();

    if (creating) {
      const ok = await methods.trigger(["firstName", "email"]);
      const problem = passwordProblem(password);
      setPasswordError(problem);
      if (!ok || problem) {
        toast.error("Some details are still needed", {
          description: "An email, a first name and a password are what an account needs to exist.",
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
      // Creating makes the account first, because everything below has to hang
      // off a driver that exists.
      const id = creating
        ? (
            await adminService.createDriver({
              email,
              password,
              firstName: values.firstName.trim(),
              middleName: values.middleName.trim() || null,
              lastName: values.lastName.trim() || null,
              phone: values.phone.trim() || null,
              dateOfBirth: values.dob || null,
              nationality: values.nationality || null,
              status,
            })
          ).id
        : driverId!;

      if (!creating) {
        // The email and the account status live on the account, not on the
        // onboarding record. The email is sent only when it actually changed,
        // so an unchanged address never has to clear the uniqueness check.
        await adminService.updateDriver(id, {
          ...(email && email !== data?.email ? { email } : {}),
          status,
        });

        // Blank means "leave the password alone", which is what an admin
        // editing anything else is doing.
        if (password) await adminService.setDriverPassword(id, password);
      }

      await saveOnboarding(values, data, adminService.driverOnboarding(id));

      setPassword("");
      setPasswordError(null);

      if (creating) {
        toast.success("Driver created", { description: email });
        navigate(`/admin/onboarding/driver/${id}`);
        return;
      }

      // Reading it back gives freshly uploaded files their stored ids, so a
      // second save leaves them alone instead of uploading them again.
      const fresh = await adminService.getDriver(id);
      setData(fresh);
      setStatus(fresh.status);
      methods.reset(toFormValues(fresh));
      toast.success("Driver saved", { description: fresh.email });
    } catch (err) {
      toast.error(creating ? "Could not create this driver" : "Could not save this driver", {
        description:
          err instanceof ApiRequestError
            ? err.message
            : "Please check your connection and try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PanelLoader label="Loading driver" />;
  if (error || (!creating && !data)) {
    return <PanelError message={error ?? "Not found"} onRetry={() => void load()} />;
  }

  const fullName = data
    ? [data.firstName, data.middleName, data.lastName].filter(Boolean).join(" ") || data.email
    : "";

  const saveLabel = creating ? "Create driver" : "Save all changes";
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
          <Link to={creating ? "/admin/onboarding/driver" : `/admin/onboarding/driver/${driverId}`}>
            <ArrowLeft className="h-4 w-4" /> {creating ? "All drivers" : `Back to ${fullName}`}
          </Link>
        </Button>

        {saveButton("button")}
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {creating ? "New driver" : `Edit ${fullName}`}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {creating
            ? "The whole record in one place. Only an email, a first name and a password are needed to create the account; everything else can be filled in now or later."
            : "Every field on this driver's record, including the ones they would normally fill in themselves. Changes you make here keep whatever verification decision each section already has."}
        </p>
      </div>

      {/* The account, which is not part of the onboarding form. */}
      <section className="mb-6 rounded-3xl border border-border/70 bg-card p-6 shadow-card">
        <header className="mb-4">
          <h2 className="text-base font-semibold tracking-tight text-foreground">Account</h2>
          <p className="text-sm text-muted-foreground">
            Whether this driver can sign in, and what they sign in with. The email is in
            Personal Information below.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
              Suspended and Deactivated both stop this driver signing in.
            </p>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="driver-password">
              Password{creating ? <span className="ml-0.5 text-destructive">*</span> : null}
            </Label>
            <Input
              id="driver-password"
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
                  ? "Set it now and pass it on to the driver yourself. They can change it later."
                  : "Leave blank to keep the current password. Setting a new one signs every existing session out."}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* The onboarding record: the driver's own form, for somebody else. */}
      <FormProvider {...methods}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
          className="space-y-6"
        >
          <PersonalInfoSection emailEditable />
          <AddressSection />
          <LicenceSection />
          <DrivingHistorySection />
          <PoliceVerificationSection />
          <VisaSection />
          <MedicalSection />
          <DrugTestSection />
          <AdditionalDocsSection />

          <div className="flex flex-wrap items-center justify-end gap-2 pb-2">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                navigate(
                  creating
                    ? "/admin/onboarding/driver"
                    : `/admin/onboarding/driver/${driverId}`,
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
