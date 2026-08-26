import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { PanelError, PanelLoader } from "@/components/common/PanelState";
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
import { adminService, type AccountStatus, type SimpleAccount } from "@/services/adminService";
import { ApiRequestError } from "@/services/api";
import type { SimpleAccountModule } from "./simpleAccountModules";

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
 * One customer or employee, created or edited by an admin.
 *
 * Creating and editing are the same screen, as they are for drivers and
 * vendors. There is no onboarding form behind either of these, so the fields
 * come from the module config rather than from a set of section components.
 */
export function AdminSimpleAccountEditPage({
  module,
  id,
}: {
  module: SimpleAccountModule;
  id?: string;
}) {
  const navigate = useNavigate();
  const api = adminService.simpleAccounts(module.path);
  const creating = !id;
  const listPath = `/admin/onboarding/${module.slug}`;

  const [loaded, setLoaded] = useState<SimpleAccount | null>(null);
  const [loading, setLoading] = useState(!creating);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [values, setValues] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<AccountStatus>("ACTIVE");
  const [password, setPassword] = useState("");
  const [problems, setProblems] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const fresh = await api.get(id);
      setLoaded(fresh);
      setStatus(fresh.status);
      setValues(
        Object.fromEntries(
          module.fields.map((field) => {
            const value = fresh[field.name];
            return [field.name, typeof value === "string" ? value : ""];
          }),
        ),
      );
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not load this account");
    } finally {
      setLoading(false);
    }
    // `api` is rebuilt every render but is bound only to module.path.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, module.path, module.fields]);

  useEffect(() => {
    void load();
  }, [load]);

  function set(name: string, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
    setProblems((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  }

  async function save() {
    const found: Record<string, string> = {};

    for (const field of module.fields) {
      const value = (values[field.name] ?? "").trim();
      if (field.required && !value) {
        found[field.name] = `${field.label} is required`;
        continue;
      }
      // An empty optional field is fine; a filled one has to hold up.
      if (value && field.pattern && !field.pattern.value.test(value)) {
        found[field.name] = field.pattern.message;
      }
    }
    if (creating || password) {
      const problem = passwordProblem(password);
      if (problem) found.password = problem;
    }

    setProblems(found);
    if (Object.keys(found).length > 0) {
      toast.error("Some details are still needed", {
        description: "The highlighted fields have to be filled in before this can be saved.",
      });
      return;
    }

    setSaving(true);

    // An empty box means "no value", which the API reads as an empty string and
    // stores as null. On an update a field left as it was is still sent, which
    // is harmless: it is the same value the row already holds.
    const payload: Record<string, unknown> = Object.fromEntries(
      module.fields.map((field) => [field.name, (values[field.name] ?? "").trim()]),
    );
    payload.status = status;

    try {
      if (creating) {
        const created = await api.create({ ...payload, password });
        toast.success(`${module.plural.slice(0, -1)} created`, { description: created.email });
        navigate(`${listPath}/${created.id}/edit`, { replace: true });
        setPassword("");
        return;
      }

      await api.update(id!, payload);
      // Blank means "leave the password alone".
      if (password) await api.setPassword(id!, password);

      const fresh = await api.get(id!);
      setLoaded(fresh);
      setStatus(fresh.status);
      setPassword("");
      toast.success("Account saved", { description: fresh.email });
    } catch (err) {
      toast.error(creating ? "Could not create this account" : "Could not save this account", {
        description:
          err instanceof ApiRequestError
            ? err.message
            : "Please check your connection and try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PanelLoader label="Loading account" />;
  if (error || (!creating && !loaded)) {
    return <PanelError message={error ?? "Not found"} onRetry={() => void load()} />;
  }

  const name = loaded
    ? [loaded.firstName, loaded.lastName].filter(Boolean).join(" ") || loaded.email
    : "";
  const saveLabel = creating ? `Create ${module.label}` : "Save all changes";
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
    <OnboardingCanvas>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to={listPath}>
            <ArrowLeft className="h-4 w-4" /> All {module.plural.toLowerCase()}
          </Link>
        </Button>
        {saveButton("button")}
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {creating ? `New ${module.label}` : `Edit ${name}`}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {creating
            ? `Everything on the record. A first name, an email and a password are what the account needs to exist.`
            : `Every field on this ${module.label}'s record.`}
        </p>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
        className="space-y-6"
      >
        <section className="rounded-3xl border border-border/70 bg-card p-6 shadow-card">
          <header className="mb-5">
            <h2 className="text-base font-semibold tracking-tight text-foreground">Details</h2>
          </header>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {module.fields.map((field) => (
              <div key={field.name} className="space-y-2">
                <Label htmlFor={field.name}>
                  {field.label}
                  {field.required ? <span className="ml-0.5 text-destructive">*</span> : null}
                </Label>
                <Input
                  id={field.name}
                  type={field.type ?? "text"}
                  value={values[field.name] ?? ""}
                  onChange={(event) => set(field.name, event.target.value)}
                  placeholder={field.placeholder}
                  maxLength={field.maxLength}
                  aria-invalid={problems[field.name] ? true : undefined}
                />
                {problems[field.name] ? (
                  <p className="text-xs font-medium text-destructive">{problems[field.name]}</p>
                ) : field.hint ? (
                  <p className="text-xs text-muted-foreground">{field.hint}</p>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-border/70 bg-card p-6 shadow-card">
          <header className="mb-5">
            <h2 className="text-base font-semibold tracking-tight text-foreground">Account</h2>
            <p className="text-sm text-muted-foreground">
              Whether this {module.label} can sign in, and what they sign in with.
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
                Suspended and Deactivated both stop this {module.label} signing in.
              </p>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="account-password">
                Password{creating ? <span className="ml-0.5 text-destructive">*</span> : null}
              </Label>
              <Input
                id="account-password"
                type="text"
                autoComplete="off"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (problems.password) {
                    setProblems((current) => {
                      const next = { ...current };
                      delete next.password;
                      return next;
                    });
                  }
                }}
                placeholder={PASSWORD_HINT}
                aria-invalid={problems.password ? true : undefined}
              />
              {problems.password ? (
                <p className="text-xs font-medium text-destructive">{problems.password}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {creating
                    ? `Set it now and pass it on to the ${module.label} yourself. They can change it later.`
                    : "Leave blank to keep the current password. Setting a new one signs every existing session out."}
                </p>
              )}
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-end gap-2 pb-2">
          <Button type="button" variant="outline" onClick={() => navigate(listPath)} disabled={saving}>
            Cancel
          </Button>
          {saveButton("submit")}
        </div>
      </form>
    </OnboardingCanvas>
  );
}
