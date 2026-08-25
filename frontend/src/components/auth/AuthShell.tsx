import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { PageBackdrop } from "@/components/layout/PageBackdrop";
import { PORTAL_ICONS } from "@/config/portalIcons";
import { cn } from "@/lib/utils";
import type { PortalConfig } from "@/config/roles";

interface AuthShellProps {
  portal: PortalConfig;
  title: string;
  subtitle: string;
  children: ReactNode;
  /** Rendered under the card, usually a link to another auth page. */
  footer?: ReactNode;
  /**
   * A wider card, for the one form that runs its fields in two columns. Every
   * other auth form is a single column and reads better held in close.
   */
  size?: "default" | "wide";
}

/**
 * The page every auth screen sits on: sign in, register, forgot password,
 * reset password and change password.
 *
 * It is one page, not two halves. The tinted bubbles and dot grid run across
 * the whole canvas, and the form sits on that canvas as a single raised card
 * built the same way as the cards on the portal picker: a surface that is not
 * flat white, a hairline edge and a layered shadow.
 *
 * The portal keeps its identity through its accent rather than a coloured
 * background. It tints the bubbles behind the card, the chip above the title,
 * and a soft wash down the top of the card itself, all of which read on white.
 * The chip carries the portal icon, so the icon you clicked on the picker is
 * the icon standing over the form you landed on.
 *
 * All of the decoration is static and blur free, so nothing repaints while the
 * page scrolls, and everything is sized in rem, so the fluid root font in
 * index.css scales the design up on 1.5K, 2K and 4K screens.
 */
export function AuthShell({
  portal,
  title,
  subtitle,
  children,
  footer,
  size = "default",
}: AuthShellProps) {
  const Icon = PORTAL_ICONS[portal.slug];

  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col bg-[#f7f8fa]">
      <PageBackdrop
        bubbles={[
          { color: portal.accentHex, className: "-right-28 -top-24 h-[32rem] w-[32rem]" },
          {
            color: "#1b4b7d",
            className: "-left-24 -top-28 h-[26rem] w-[26rem]",
            strength: 0.75,
          },
          {
            color: portal.accentHex,
            className: "-bottom-40 -left-20 h-[34rem] w-[34rem]",
            strength: 0.85,
          },
          {
            color: "#2bb583",
            className: "-bottom-28 right-[6%] hidden h-72 w-72 lg:block",
            strength: 0.7,
          },
        ]}
        rings={[
          { color: portal.accentHex, className: "left-[10%] top-[8%] hidden h-40 w-40 lg:block" },
        ]}
      />

      <header className="relative z-10 flex w-full items-center justify-between gap-4 px-5 py-6 sm:px-8 lg:px-12 lg:py-8 xl:px-16">
        <Link to="/" className="inline-flex w-fit">
          <Logo className="h-9" />
        </Link>

        <Link
          to="/"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white/70 px-3.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors duration-200 hover:border-brand-navy/20 hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          All portals
        </Link>
      </header>

      <main className="relative z-10 flex w-full flex-1 flex-col items-center justify-center px-5 py-8 sm:px-8 lg:py-12">
        <div className={cn("w-full", size === "wide" ? "max-w-[38rem]" : "max-w-[30rem]")}>
          <div className="text-center">
            <span className="inline-flex items-center gap-2.5 rounded-full border border-border bg-white/80 py-1.5 pl-1.5 pr-4 shadow-soft">
              <span className="relative grid h-7 w-7 place-items-center rounded-full">
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-0 rounded-full opacity-[0.16]",
                    portal.accentGlowClass,
                  )}
                />
                <Icon
                  className={cn("relative h-3.5 w-3.5", portal.accentTextClass)}
                  aria-hidden
                />
              </span>
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {portal.label} portal
              </span>
            </span>

            <h1 className="mt-5 text-3xl font-extrabold leading-[1.15] tracking-tight text-brand-navy sm:text-4xl">
              {title}
            </h1>
            <p className="mx-auto mt-3 max-w-[28rem] text-sm leading-relaxed text-muted-foreground sm:text-base">
              {subtitle}
            </p>
          </div>

          <div className="relative mt-8 overflow-hidden rounded-3xl border border-border bg-gradient-to-b from-white to-[#f6f8fb] p-6 shadow-[0_1px_3px_rgba(16,24,40,0.04),0_24px_56px_-28px_rgba(16,24,40,0.28)] sm:p-8">
            {/* The portal accent, washed down from the top edge. */}
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-x-0 top-0 h-28 opacity-[0.10]",
                portal.accentGlowClass,
              )}
              style={{
                maskImage: "linear-gradient(to bottom, black, transparent)",
                WebkitMaskImage: "linear-gradient(to bottom, black, transparent)",
              }}
            />
            <div className="relative">{children}</div>
          </div>

          {footer ? (
            <div className="mt-6 text-center text-sm leading-relaxed text-muted-foreground">
              {footer}
            </div>
          ) : null}
        </div>
      </main>

      <footer className="relative z-10 w-full px-5 pb-8 text-center text-sm text-muted-foreground sm:px-8 lg:px-12 xl:px-16">
        &copy; {new Date().getFullYear()} BIVRY. All rights reserved.
      </footer>
    </div>
  );
}
