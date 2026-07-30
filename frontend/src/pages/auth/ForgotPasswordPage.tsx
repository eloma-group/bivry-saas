import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { FormAlert } from "@/components/auth/FormAlert";
import { TextField } from "@/components/auth/FormField";
import { Button } from "@/components/ui/button";
import { useAuthForm } from "@/hooks/useAuthForm";
import { authService } from "@/services/authService";
import { getPortal } from "@/config/roles";
import type { RoleSlug } from "@/types/auth";

interface ForgotPasswordPageProps {
  role: RoleSlug;
}

/**
 * Requests a reset link. The reply is deliberately the same whether or not the
 * email exists, so this page cannot be used to discover accounts.
 */
export function ForgotPasswordPage({ role }: ForgotPasswordPageProps) {
  const portal = getPortal(role);
  const { isSubmitting, formError, fieldErrors, successMessage, submit } = useAuthForm();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = await submit(() => authService.forgotPassword(role, email));
    if (ok) setSent(true);
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

  if (sent) {
    return (
      <AuthShell
        portal={portal}
        title="Check your email"
        subtitle={`If a ${portal.label.toLowerCase()} account exists for ${email}, a reset link is on its way.`}
        footer={backLink}
      >
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-xl border border-border bg-white p-4 shadow-soft">
            <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-green" aria-hidden />
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-foreground">Reset link sent</p>
              <p className="leading-relaxed text-muted-foreground">
                {successMessage ??
                  "Open the link within 30 minutes to choose a new password. Remember to check your spam folder."}
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => setSent(false)}
          >
            Use a different email
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      portal={portal}
      title="Forgot your password?"
      subtitle="Enter your email address and we will send you a link to set a new one."
      footer={backLink}
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {formError ? <FormAlert tone="error" message={formError} /> : null}

        <TextField
          id="email"
          label="Email address"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={fieldErrors.email}
          required
        />

        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending link
            </>
          ) : (
            "Send reset link"
          )}
        </Button>
      </form>
    </AuthShell>
  );
}
