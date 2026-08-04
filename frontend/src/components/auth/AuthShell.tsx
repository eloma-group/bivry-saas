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
 *
 * Both halves sit on the same white surface. The brand panel keeps its identity
 * through the portal accent instead of a coloured background: a tinted glow, a
 * dot grid and a gradient headline, all of which read on white.
 */
export function AuthShell({ portal, title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="grid min-h-[100dvh] w-full bg-background lg:grid-cols-[1.05fr_1fr] xl:grid-cols-[1.15fr_1fr]">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden border-r border-border bg-background p-10 lg:flex lg:flex-col lg:justify-between xl:p-14">
        {/* Static decoration. No blur on scrolling content, so paint stays cheap. */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full opacity-[0.18]",
            portal.accentGlowClass,
          )}
        />
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full opacity-[0.10]",
            portal.accentGlowClass,
          )}
        />
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute -right-10 top-1/3 h-56 w-56 rounded-full border-2 opacity-30",
            portal.accentTextClass,
          )}
          style={{ borderColor: "currentColor" }}
        />
        {/* Dot grid, so the panel still reads as designed rather than empty. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, hsl(var(--border)) 1px, transparent 0)",
            backgroundSize: "1.5rem 1.5rem",
          }}
        />

        {/* The lockup already carries the wordmark, so there is no second
            "BIVRY" set in type beside it. */}
        <Link to="/" className="relative z-10 inline-flex w-fit">
          <Logo className="h-10" />
        </Link>

        <div className="relative z-10 max-w-[34rem]">
          <p
            className={cn(
              "text-sm font-semibold uppercase tracking-[0.2em]",
              portal.accentTextClass,
            )}
          >
            {portal.label} portal
          </p>
          <h2
            className={cn(
              "mt-4 bg-gradient-to-br bg-clip-text text-4xl font-extrabold leading-tight tracking-tight text-transparent xl:text-5xl",
              portal.accentClass,
            )}
          >
            {portal.tagline}
          </h2>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground">
            One fleet platform for operations, compliance and everyone who keeps the
            wheels turning.
          </p>
        </div>

        <p className="relative z-10 text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} BIVRY. All rights reserved.
        </p>
      </aside>

      {/* Form panel */}
      <main className="flex w-full flex-col justify-center px-5 py-10 sm:px-10 lg:px-12 xl:px-16">
        <div className="mx-auto w-full max-w-[27rem]">
          <Link to="/" className="mb-9 inline-flex lg:hidden">
            <Logo />
          </Link>

          {/* No pill here: the label has to start on the same left edge as the
              heading underneath it. */}
          <span className="block text-xs font-semibold uppercase tracking-wider text-primary">
            {portal.label}
          </span>

          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground">
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
