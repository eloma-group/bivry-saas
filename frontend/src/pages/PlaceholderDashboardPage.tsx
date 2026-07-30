import { LogOut } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { getPortal } from "@/config/roles";
import type { RoleSlug } from "@/types/auth";

/**
 * Temporary home for the portals whose feature work has not started yet.
 * Proves the whole auth chain end to end: protected route, access token,
 * role scoped profile and sign out.
 */
export function PlaceholderDashboardPage({ role }: { role: RoleSlug }) {
  const portal = getPortal(role);
  const { user, logout } = useAuth();

  return (
    <div className="min-h-[100dvh] w-full bg-[#f7f8fa]">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex w-full max-w-[90rem] items-center justify-between px-5 py-4 sm:px-8 lg:px-12">
          <Logo />
          <Button variant="outline" size="sm" onClick={() => void logout()}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[90rem] px-5 py-12 sm:px-8 lg:px-12">
        <span className="inline-flex items-center rounded-full bg-accent px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent-foreground">
          {portal.label}
        </span>

        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Welcome, {user?.displayName}
        </h1>
        <p className="mt-3 max-w-[42rem] text-base leading-relaxed text-muted-foreground">
          You are signed in to the {portal.label.toLowerCase()} portal. This module is next
          in the build queue. Authentication, routing and the API layer for this role are
          already in place.
        </p>

        <dl className="mt-8 grid max-w-[42rem] gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-white p-5 shadow-soft">
            <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Signed in as
            </dt>
            <dd className="mt-1.5 break-words text-sm font-semibold text-foreground">
              {user?.email}
            </dd>
          </div>
          <div className="rounded-xl border border-border bg-white p-5 shadow-soft">
            <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Account status
            </dt>
            <dd className="mt-1.5 text-sm font-semibold text-foreground">{user?.status}</dd>
          </div>
        </dl>
      </main>
    </div>
  );
}
