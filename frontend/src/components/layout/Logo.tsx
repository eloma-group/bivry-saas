import { cn } from "@/lib/utils";

interface LogoProps {
  /** Show the full "BIVRY" wordmark lockup instead of only the mark. */
  withWordmark?: boolean;
  className?: string;
}

/**
 * BIVRY branding. Uses the official hummingbird assets:
 *  - the full lockup (mark + wordmark) by default
 *  - the mark on its own where the name is already spelled out beside it
 *
 * Both files are transparent PNGs that carry their own navy and green, so they
 * are never wrapped in a coloured badge: a navy plate behind them would swallow
 * the bird's body. They are sized by height and left to keep their own width.
 *
 * The two files are padded differently. The lockup runs nearly edge to edge, but
 * the bird on its own only fills a little over half its canvas height, so the
 * mark is given a taller box to come out at the same visual weight. Replacing
 * either file with a differently cropped one means revisiting these heights.
 */
export function Logo({ withWordmark = true, className }: LogoProps) {
  return (
    <img
      src={withWordmark ? "/brand/bivry-full.png" : "/brand/bivry-icon.png"}
      alt="BIVRY"
      className={cn(
        "w-auto select-none object-contain",
        withWordmark ? "h-8" : "h-14",
        className,
      )}
      draggable={false}
    />
  );
}
