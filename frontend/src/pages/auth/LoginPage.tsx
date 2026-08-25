import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { FormAlert } from "@/components/auth/FormAlert";
import { PasswordField, TextField } from "@/components/auth/FormField";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { useAuthForm } from "@/hooks/useAuthForm";
import { getPortal } from "@/config/roles";
import type { RoleSlug } from "@/types/auth";

interface LoginPageProps {
  role: RoleSlug;
}

/**
 * One login screen, rendered once per portal. The role comes from the route,
 * so the credentials are only ever checked against that portal's own table.
 */
export function LoginPage({ role }: LoginPageProps) {
  const portal = getPortal(role);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { isSubmitting, formError, fieldErrors, submit } = useAuthForm();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  const redirectTo =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? portal.homePath;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = await submit(async () => {
      await login(role, { email, password, rememberMe });
    });
    if (ok) navigate(redirectTo, { replace: true });
  }

  return (
    <AuthShell
      portal={portal}
      title="Welcome back"
      subtitle={`Use the email address registered for your BIVRY ${portal.label.toLowerCase()} account.`}
      footer={
        portal.selfSignup ? (
          <>
            New here?{" "}
            <Link
              to={`${portal.loginPath.replace("/login", "")}/register`}
              className="font-semibold text-primary hover:underline"
            >
              Create new account
            </Link>
          </>
        ) : (
          <>
            {portal.label} accounts are created by an administrator. Contact your BIVRY
            administrator if you need access.
          </>
        )
      }
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

        <PasswordField
          id="password"
          label="Password"
          autoComplete="current-password"
          placeholder="Enter your password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={fieldErrors.password}
          required
          hint={
            <Link
              to={portal.forgotPasswordPath}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Forgot password?
            </Link>
          }
        />

        <div className="flex items-center gap-2.5">
          <Checkbox
            id="remember"
            checked={rememberMe}
            onCheckedChange={(checked) => setRememberMe(checked === true)}
          />
          <Label htmlFor="remember" className="text-sm font-medium text-muted-foreground">
            Keep me signed in
          </Label>
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>
    </AuthShell>
  );
}
