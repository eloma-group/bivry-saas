import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Check, Loader2, ShieldAlert } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { FormAlert } from "@/components/auth/FormAlert";
import { PasswordField } from "@/components/auth/FormField";
import { Button } from "@/components/ui/button";
import { useAuthForm } from "@/hooks/useAuthForm";
import { authService } from "@/services/authService";
import { getPortal } from "@/config/roles";
import { cn } from "@/lib/utils";
import type { RoleSlug } from "@/types/auth";

interface ResetPasswordPageProps {
  role: RoleSlug;
}

/** Same rules the backend enforces, shown live so the submit is not a surprise. */
const RULES = [
  { label: "At least 8 characters", test: (value: string) => value.length >= 8 },
  { label: "One lowercase letter", test: (value: string) => /[a-z]/.test(value) },
  { label: "One uppercase letter", test: (value: string) => /[A-Z]/.test(value) },
  { label: "One number", test: (value: string) => /[0-9]/.test(value) },
];

export function ResetPasswordPage({ role }: ResetPasswordPageProps) {
  const portal = getPortal(role);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const { isSubmitting, formError, fieldErrors, submit } = useAuthForm();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [tokenState, setTokenState] = useState<"checking" | "valid" | "invalid">(
    token ? "checking" : "invalid",
  );
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    authService
      .verifyResetToken(role, token)
      .then((valid) => {
        if (!cancelled) setTokenState(valid ? "valid" : "invalid");
      })
      .catch(() => {
        if (!cancelled) setTokenState("invalid");
      });

    return () => {
      cancelled = true;
    };
  }, [role, token]);

  const rules = useMemo(
    () => RULES.map((rule) => ({ ...rule, passed: rule.test(password) })),
    [password],
  );

  const mismatch = confirmPassword.length > 0 && confirmPassword !== password;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = await submit(() =>
      authService.resetPassword(role, { token, password, confirmPassword }),
    );
    if (ok) {
      setDone(true);
      // Give the confirmation a moment to register before returning to sign in.
      window.setTimeout(() => navigate(portal.loginPath, { replace: true }), 2200);
    }
  }

  const backLink = (
    <Link
      to={portal.loginPath}
      className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to sign in
    </Link>
  );

  if (tokenState === "checking") {
    return (
      <AuthShell portal={portal} title="Checking your link" subtitle="This will only take a moment.">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
          Verifying reset link
        </div>
      </AuthShell>
    );
  }

  if (tokenState === "invalid") {
    return (
      <AuthShell
        portal={portal}
        title="This link is not valid"
        subtitle="Reset links expire after 30 minutes and can only be used once."
        footer={backLink}
      >
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-xl border border-destructive/25 bg-destructive/5 p-4">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden />
            <p className="text-sm leading-relaxed text-destructive">
              Request a new link and open it from the most recent email.
            </p>
          </div>

          <Button asChild size="lg" className="w-full">
            <Link to={portal.forgotPasswordPath}>Request a new link</Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell
        portal={portal}
        title="Password updated"
        subtitle="You can now sign in with your new password."
        footer={backLink}
      >
        <FormAlert tone="success" message="Taking you back to the sign in page." />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      portal={portal}
      title="Choose a new password"
      subtitle={`Set the password for your BIVRY ${portal.label.toLowerCase()} account.`}
      footer={backLink}
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {formError ? <FormAlert tone="error" message={formError} /> : null}

        <PasswordField
          id="password"
          label="New password"
          autoComplete="new-password"
          placeholder="Enter a new password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={fieldErrors.password}
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
          disabled={isSubmitting || mismatch || password.length === 0}
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
