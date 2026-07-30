import { cn } from "@/lib/utils";

interface LogoProps {
  /** Show the full "BIVRY" wordmark lockup instead of only the mark. */
  withWordmark?: boolean;
  className?: string;
}

/**
 * BIVRY branding. Uses the official hummingbird assets:
 *  - the full lockup (mark + wordmark) on light surfaces
 *  - the navy icon badge when only the mark is needed
 */
export function Logo({ withWordmark = true, className }: LogoProps) {
  if (withWordmark) {
    return (
      <img
        src="/brand/bivry-full.png"
        alt="BIVRY"
        className={cn("h-8 w-auto select-none", className)}
        draggable={false}
      />
    );
  }
  return (
    <div
      className={cn(
        "grid h-10 w-10 place-items-center overflow-hidden rounded-xl bg-brand-navy shadow-soft",
        className
      )}
    >
      <img
        src="/brand/bivry-icon.jpg"
        alt="BIVRY"
        className="h-full w-full object-cover"
        draggable={false}
      />
    </div>
  );
}
