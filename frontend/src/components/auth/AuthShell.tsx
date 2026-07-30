import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/layout/Logo";
import { cn } from "@/lib/utils";
import type { PortalConfig } from "@/config/roles";

interface AuthShellProps {
  portal: PortalConfig;
  title: string;
  subtitle: string;
  children: ReactNode;
  /** Rendered under the card, usually a link to another auth page. */
  footer?: ReactNode;
}

/**
 * Two column shell shared by every auth page.
 *
 * The grid fills the whole viewport at any size and everything is sized in rem,
 * so the fluid root font in index.css scales the design up on 1.5K, 2K and 4K
 * screens instead of leaving empty gutters. Below `lg` the brand panel drops
 * away and the form takes the full width.
 */
export function AuthShell({ portal, title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="grid min-h-[100dvh] w-full lg:grid-cols-[1.05fr_1fr] xl:grid-cols-[1.15fr_1fr]">
      {/* Brand panel */}
      <aside
        className={cn(
          "relative hidden overflow-hidden bg-gradient-to-br p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14",
          portal.accentClass,
        )}
      >
        {/* Static decorative glow. No blur on scrolling content, so paint stays cheap. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-white/5"
        />

        <Link to="/" className="relative z-10 inline-flex w-fit items-center gap-3">
          <Logo withWordmark={false} className="h-11 w-11 bg-white/10" />
          <span className="text-xl font-extrabold tracking-tight">BIVRY</span>
        </Link>

        <div className="relative z-10 max-w-[34rem]">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/60">
            {portal.label} portal
          </p>
          <h2 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight xl:text-5xl">
            {portal.tagline}
          </h2>
          <p className="mt-5 text-base leading-relaxed text-white/70">
            One fleet platform for operations, compliance and everyone who keeps the
            wheels turning.
          </p>
        </div>

        <p className="relative z-10 text-sm text-white/50">
          &copy; {new Date().getFullYear()} BIVRY. All rights reserved.
        </p>
      </aside>

      {/* Form panel */}
      <main className="flex w-full flex-col justify-center px-5 py-10 sm:px-10 lg:px-12 xl:px-16">
        <div className="mx-auto w-full max-w-[27rem]">
          <Link to="/" className="mb-9 inline-flex lg:hidden">
            <Logo />
          </Link>

          <span className="inline-flex items-center rounded-full bg-accent px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent-foreground">
            {portal.label}
          </span>

          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>

          <div className="mt-8">{children}</div>

          {footer ? <div className="mt-7 text-sm text-muted-foreground">{footer}</div> : null}
        </div>
      </main>
    </div>
  );
}
