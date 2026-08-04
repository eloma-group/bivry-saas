import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { FormAlert } from "@/components/auth/FormAlert";
import { PasswordField, TextField } from "@/components/auth/FormField";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useAuthForm } from "@/hooks/useAuthForm";
import { getPortal } from "@/config/roles";
import type { RoleSlug } from "@/types/auth";

interface FieldDef {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  /** Half width on small screens and up. */
  half?: boolean;
}

/** The register form mirrors the columns each role's own table actually has. */
const ROLE_FIELDS: Record<RoleSlug, FieldDef[]> = {
  admin: [
    { name: "firstName", label: "First name", required: true, half: true },
    { name: "lastName", label: "Last name", half: true },
  ],
  customer: [
    { name: "firstName", label: "First name", required: true, half: true },
    { name: "lastName", label: "Last name", half: true },
    { name: "companyName", label: "Company name", placeholder: "Optional" },
  ],
  vendor: [
    { name: "companyName", label: "Company name", required: true },
    { name: "contactPerson", label: "Contact person", half: true },
    { name: "abn", label: "ABN", placeholder: "Optional", half: true },
  ],
  employee: [
    { name: "firstName", label: "First name", required: true, half: true },
    { name: "lastName", label: "Last name", half: true },
    { name: "employeeCode", label: "Employee code", placeholder: "Optional" },
  ],
  driver: [
    { name: "firstName", label: "First name", required: true, half: true },
    { name: "middleName", label: "Middle name", placeholder: "Optional", half: true },
    { name: "lastName", label: "Last name" },
  ],
};

interface RegisterPageProps {
  role: RoleSlug;
}

export function RegisterPage({ role }: RegisterPageProps) {
  const portal = getPortal(role);
  const navigate = useNavigate();
  const { register } = useAuth();
  const { isSubmitting, formError, fieldErrors, submit } = useAuthForm();

  const fields = ROLE_FIELDS[role];
  const [values, setValues] = useState<Record<string, string>>({});

  function setValue(name: string, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = await submit(async () => {
      // Empty optional inputs are dropped so the backend sees them as absent.
      const payload = Object.fromEntries(
        Object.entries(values).filter(([, value]) => value.trim() !== ""),
      );
      await register(role, payload);
    });
    if (ok) navigate(portal.homePath, { replace: true });
  }

  return (
    <AuthShell
      portal={portal}
      title="Create new account"
      subtitle="It takes less than a minute. You can complete the rest of your profile after signing in."
      footer={
        <>
          Already have an account?{" "}
          <Link to={portal.loginPath} className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {formError ? <FormAlert tone="error" message={formError} /> : null}

        <div className="grid gap-5 sm:grid-cols-2">
          {fields.map((field) => (
            <div key={field.name} className={field.half ? "sm:col-span-1" : "sm:col-span-2"}>
              <TextField
                id={field.name}
                label={field.label}
                type={field.type ?? "text"}
                placeholder={field.placeholder}
                autoComplete={field.autoComplete}
                value={values[field.name] ?? ""}
                onChange={(event) => setValue(field.name, event.target.value)}
                error={fieldErrors[field.name]}
                required={field.required}
              />
            </div>
          ))}
        </div>

        <TextField
          id="email"
          label="Email address"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={values.email ?? ""}
          onChange={(event) => setValue("email", event.target.value)}
          error={fieldErrors.email}
          required
        />

        <TextField
          id="phone"
          label="Phone number"
          type="tel"
          autoComplete="tel"
          placeholder="Optional"
          value={values.phone ?? ""}
          onChange={(event) => setValue("phone", event.target.value)}
          error={fieldErrors.phone}
        />

        <PasswordField
          id="password"
          label="Password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={values.password ?? ""}
          onChange={(event) => setValue("password", event.target.value)}
          error={fieldErrors.password}
          required
        />

        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating account
            </>
          ) : (
            "Create account"
          )}
        </Button>
      </form>
    </AuthShell>
  );
}
