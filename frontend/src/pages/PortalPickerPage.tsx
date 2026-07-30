import { Link } from "react-router-dom";
import { ArrowRight, Briefcase, ShieldCheck, Truck, UserCog, Users } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { PORTAL_LIST } from "@/config/roles";
import type { RoleSlug } from "@/types/auth";

const ICONS: Record<RoleSlug, typeof Truck> = {
  admin: ShieldCheck,
  customer: Users,
  vendor: Briefcase,
  employee: UserCog,
  driver: Truck,
};

/**
 * Landing page listing the five portals. Every card links to its own login
 * page, so a person always arrives at the portal that matches their account.
 */
export function PortalPickerPage() {
  return (
    <div className="min-h-[100dvh] w-full bg-[#f7f8fa]">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[90rem] flex-col px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
        <header className="flex items-center justify-between">
          <Logo />
          <span className="text-sm font-medium text-muted-foreground">Fleet management suite</span>
        </header>

        <main className="flex flex-1 flex-col justify-center py-12">
          <div className="max-w-[42rem]">
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
              Choose your portal
            </h1>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              Each portal has its own sign in. Pick the one that matches your account and
              you will land straight in your workspace.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {PORTAL_LIST.map((portal) => {
              const Icon = ICONS[portal.slug];
              return (
                <Link
                  key={portal.slug}
                  to={portal.loginPath}
                  className="group flex flex-col gap-4 rounded-2xl border border-border bg-white p-6 shadow-soft transition-transform duration-200 will-change-transform hover:-translate-y-0.5 hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-accent-foreground">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>

                  <div className="space-y-1.5">
                    <h2 className="text-lg font-bold tracking-tight text-foreground">
                      {portal.label}
                    </h2>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {portal.tagline}
                    </p>
                  </div>

                  <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                    Sign in
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </span>
                </Link>
              );
            })}
          </div>
        </main>

        <footer className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} BIVRY. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
