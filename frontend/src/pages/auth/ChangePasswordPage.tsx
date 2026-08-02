import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { FormAlert } from "@/components/auth/FormAlert";
import { PasswordField } from "@/components/auth/FormField";
import { Button } from "@/components/ui/button";
import { useAuthForm } from "@/hooks/useAuthForm";
import { useAuth } from "@/context/AuthContext";
import { authService } from "@/services/authService";
import { getPortal } from "@/config/roles";
import { cn } from "@/lib/utils";
import type { RoleSlug } from "@/types/auth";

interface ChangePasswordPageProps {
  role: RoleSlug;
}

/** Same rules the backend enforces, shown live so the submit is not a surprise. */
const RULES = [
  { label: "At least 8 characters", test: (value: string) => value.length >= 8 },
  { label: "One lowercase letter", test: (value: string) => /[a-z]/.test(value) },
  { label: "One uppercase letter", test: (value: string) => /[A-Z]/.test(value) },
  { label: "One number", test: (value: string) => /[0-9]/.test(value) },
];

/**
 * Changing your own password while signed in.
 *
 * The backend revokes every session on success, which is the right thing to do
 * when a credential changes, so this ends with the account signed out and back at
 * the sign in page.
 */
export function ChangePasswordPage({ role }: ChangePasswordPageProps) {
  const portal = getPortal(role);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isSubmitting, formError, fieldErrors, submit } = useAuthForm();

  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [done, setDone] = useState(false);

  const rules = useMemo(
    () => RULES.map((rule) => ({ ...rule, passed: rule.test(password) })),
    [password],
  );

  const mismatch = confirmPassword.length > 0 && confirmPassword !== password;
  const sameAsCurrent = password.length > 0 && password === currentPassword;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const ok = await submit(() =>
      authService.changePassword(role, { currentPassword, password, confirmPassword }),
    );

    if (!ok) return;

    setDone(true);
    // The server has already revoked every session; drop the local one so the
    // app does not keep showing a signed in shell with a dead token.
    await logout();
    window.setTimeout(() => navigate(portal.loginPath, { replace: true }), 2200);
  }

  const backLink = (
    <Link
      to={portal.homePath}
      className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to {portal.label.toLowerCase()} portal
    </Link>
  );

  if (done) {
    return (
      <AuthShell
        portal={portal}
        title="Password changed"
        subtitle="For safety every device has been signed out."
        footer={
          <Link
            to={portal.loginPath}
            className="font-semibold text-primary hover:underline"
          >
            Sign in again
          </Link>
        }
      >
        <FormAlert
          tone="success"
          message="Taking you to the sign in page to use your new password."
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      portal={portal}
      title="Change your password"
      subtitle={
        user?.email
          ? `Signed in as ${user.email}. Changing this signs you out everywhere.`
          : "Changing your password signs you out on every device."
      }
      footer={backLink}
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {formError ? <FormAlert tone="error" message={formError} /> : null}

        <PasswordField
          id="currentPassword"
          label="Current password"
          autoComplete="current-password"
          placeholder="Enter your current password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          error={fieldErrors.currentPassword}
          required
        />

        <PasswordField
          id="password"
          label="New password"
          autoComplete="new-password"
          placeholder="Enter a new password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={sameAsCurrent ? "Choose a different password" : fieldErrors.password}
          required
        />

        <ul className="grid gap-1.5 sm:grid-cols-2">
          {rules.map((rule) => (
            <li
              key={rule.label}
              className={cn(
                "flex items-center gap-1.5 text-xs transition-colors",
                rule.passed ? "text-[#136f4f]" : "text-muted-foreground",
              )}
            >
              <Check
                className={cn("h-3.5 w-3.5", rule.passed ? "opacity-100" : "opacity-30")}
                aria-hidden
              />
              {rule.label}
            </li>
          ))}
        </ul>

        <PasswordField
          id="confirmPassword"
          label="Confirm new password"
          autoComplete="new-password"
          placeholder="Re-enter the new password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          error={mismatch ? "Passwords do not match" : fieldErrors.confirmPassword}
          required
        />

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={
            isSubmitting ||
            mismatch ||
            sameAsCurrent ||
            password.length === 0 ||
            currentPassword.length === 0
          }
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Updating password
            </>
          ) : (
            "Update password"
          )}
        </Button>
      </form>
    </AuthShell>
  );
}
