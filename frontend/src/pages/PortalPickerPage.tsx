import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { PageBackdrop } from "@/components/layout/PageBackdrop";
import { PORTAL_ICONS } from "@/config/portalIcons";
import { PORTAL_LIST } from "@/config/roles";
import { cn } from "@/lib/utils";

/**
 * Landing page listing the five portals. Every panel links to its own login
 * page, so a person always arrives at the portal that matches their account.
 *
 * One canvas, one design. The tinted bubbles and dot grid from the auth pages
 * run across the whole page rather than down one half of it, and the five
 * portals sit on that canvas as raised cards. They run in one row of five from
 * xl up, so the last row is never ragged the way five cards in a three column
 * grid always are, and below xl each card turns on its side into a full width
 * row, which is the same card rather than a second design.
 *
 * The depth is built rather than drawn: a surface that is not flat white, a
 * hairline edge, a layered shadow, and a raised icon chip. Hover lifts the card
 * and lights the portal accent underneath it, so the colour reads as light
 * spilling out from behind rather than as another painted box. Every moving
 * part is a transform or an opacity.
 *
 * Each portal carries its own accent, on the icon at rest and as a rule that
 * sweeps along the top edge under the cursor or keyboard focus. Each one also
 * says whether you can make your own account there, which is the one thing a
 * person standing at this door cannot work out for themselves.
 *
 * Everything fills the viewport width, so the design scales onto 2K and 4K
 * instead of sitting in a centred column with empty bands either side. All of
 * the decoration is static and blur free, so nothing repaints while scrolling.
 */
export function PortalPickerPage() {
  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col bg-[#f7f8fa]">
      <PageBackdrop
        bubbles={[
          { color: "#1b4b7d", className: "-left-24 -top-28 h-[26rem] w-[26rem]", strength: 0.9 },
          { color: "#2bb583", className: "-right-28 -top-20 h-[32rem] w-[32rem]" },
          {
            color: "#6d4aa8",
            className: "-bottom-40 -left-20 h-[34rem] w-[34rem]",
            strength: 0.85,
          },
        ]}
        rings={[
          { color: "#2f6f9e", className: "-bottom-28 right-[6%] h-72 w-72" },
          { color: "#2bb583", className: "left-[12%] top-[6%] hidden h-40 w-40 lg:block" },
        ]}
      />

      <header className="relative z-10 w-full px-5 py-6 sm:px-8 lg:px-12 lg:py-8 xl:px-16">
        <Link to="/" className="inline-flex w-fit">
          <Logo className="h-9" />
        </Link>
      </header>

      <main className="relative z-10 flex w-full flex-1 flex-col justify-center px-5 py-10 sm:px-8 lg:px-12 lg:py-14 xl:px-16">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-white/70 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brand-green" />
            Fleet management suite
          </span>

          <h1 className="mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight text-brand-navy sm:text-5xl xl:text-6xl">
            Choose your{" "}
            <span className="bg-gradient-to-br from-[#134e4a] via-[#0f8f65] to-brand-green bg-clip-text text-transparent">
              portal
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-[42rem] text-base leading-relaxed text-muted-foreground sm:text-lg">
            Each role signs in through its own portal. Pick yours and you land straight in
            your workspace.
          </p>
        </div>

        {/* Five raised cards. Depth is carried by a layered shadow and a
            surface that is not flat white, and the lift on hover is a
            transform, so the whole interaction stays on the GPU. */}
        <ul className="mt-12 grid w-full gap-4 lg:mt-14 xl:grid-cols-5 xl:gap-5">
          {PORTAL_LIST.map((portal) => {
            const Icon = PORTAL_ICONS[portal.slug];
            return (
              <li key={portal.slug} className="group relative">
                {/* The portal accent, spilling out from under the card. */}
                <span
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute -inset-1.5 rounded-[1.75rem] opacity-0 blur-xl transition-opacity duration-300 ease-out group-hover:opacity-40",
                    portal.accentGlowClass,
                  )}
                />

                <Link
                  to={portal.loginPath}
                  className="relative flex h-full items-center gap-4 overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-white to-[#f6f8fb] p-5 shadow-card transition-[transform,box-shadow] duration-300 ease-out will-change-transform hover:-translate-y-1.5 hover:shadow-[0_20px_40px_-16px_rgba(16,24,40,0.24)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:gap-5 sm:p-6 xl:flex-col xl:items-start xl:gap-5 xl:p-7"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "absolute inset-x-0 top-0 h-[3px] origin-left scale-x-0 transition-transform duration-300 ease-out group-hover:scale-x-100 group-focus-within:scale-x-100",
                      portal.accentGlowClass,
                    )}
                  />

                  <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white shadow-soft ring-1 ring-border/60 transition-transform duration-300 ease-out group-hover:-translate-y-0.5 sm:h-14 sm:w-14">
                    <span
                      aria-hidden
                      className={cn(
                        "absolute inset-0 rounded-2xl opacity-[0.14] transition-opacity duration-300 group-hover:opacity-[0.28]",
                        portal.accentGlowClass,
                      )}
                    />
                    <Icon
                      className={cn("relative h-5 w-5 sm:h-6 sm:w-6", portal.accentTextClass)}
                      aria-hidden
                    />
                  </span>

                  <span className="min-w-0 flex-1 xl:flex-none">
                    <span className="block text-lg font-bold tracking-tight text-foreground">
                      {portal.label}
                    </span>
                    <span className="mt-1.5 block text-sm leading-relaxed text-muted-foreground">
                      {portal.tagline}
                    </span>
                    <span className="mt-3 inline-flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">
                      <span
                        aria-hidden
                        className={cn(
                          "h-1 w-1 rounded-full",
                          portal.selfSignup ? "bg-brand-green" : "bg-muted-foreground/50",
                        )}
                      />
                      {portal.selfSignup ? "Open to sign up" : "Invite only"}
                    </span>
                  </span>

                  <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-brand-navy xl:mt-auto xl:w-full xl:border-t xl:border-border xl:pt-4">
                    <span className="hidden xl:inline">Sign in</span>
                    <ArrowRight
                      className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1 xl:ml-auto"
                      aria-hidden
                    />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Not sure which one is yours? Whoever set up your account can tell you.
        </p>
      </main>

      <footer className="relative z-10 w-full px-5 pb-8 text-center text-sm text-muted-foreground sm:px-8 lg:px-12 xl:px-16">
        &copy; {new Date().getFullYear()} BIVRY. All rights reserved.
      </footer>
    </div>
  );
}
