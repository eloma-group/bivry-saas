import { cn } from "@/lib/utils";

export interface BackdropBubble {
  /** Hex the bubble is blown from, e.g. "#6d4aa8". */
  color: string;
  /** Where it sits and how big it is, e.g. "-left-24 -top-28 h-[26rem] w-[26rem]". */
  className: string;
  /** How strongly it tints the page. 1 is the default weight. */
  strength?: number;
}

export interface BackdropRing {
  color: string;
  className: string;
}

function tint(hex: string, alpha: number) {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * The canvas the portal picker and every auth page sit on: a dot grid, a few
 * tinted bubbles and a couple of wireframe rings.
 *
 * The bubbles are spheres rather than flat discs, and they are lit rather than
 * blurred. Each one is a radial gradient with its light off centre at the top
 * left, an inset shadow pooling at the bottom right, and a highlight along the
 * lit edge. That reads as a ball catching the light, and unlike a blur it is
 * one cheap paint that never runs again: nothing here animates, and nothing
 * here repaints while the page scrolls.
 *
 * Everything is decoration, so the whole layer is hidden from assistive tech
 * and clipped to the page, which keeps a bubble hanging off the left edge from
 * widening the document.
 */
export function PageBackdrop({
  bubbles,
  rings = [],
  className,
}: {
  bubbles: BackdropBubble[];
  rings?: BackdropRing[];
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      <div
        className="absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, hsl(var(--border)) 1px, transparent 0)",
          backgroundSize: "1.5rem 1.5rem",
        }}
      />

      {bubbles.map((bubble, index) => {
        const s = bubble.strength ?? 1;
        return (
          <div
            key={`${bubble.color}-${index}`}
            className={cn("absolute rounded-full", bubble.className)}
            style={{
              backgroundImage: [
                `radial-gradient(circle at 30% 26%, ${tint("#ffffff", 0.55 * s)} 0%, ${tint("#ffffff", 0)} 42%)`,
                `radial-gradient(circle at 34% 30%, ${tint(bubble.color, 0.3 * s)} 0%, ${tint(bubble.color, 0.19 * s)} 40%, ${tint(bubble.color, 0.09 * s)} 68%, ${tint(bubble.color, 0.03 * s)} 100%)`,
              ].join(", "),
              boxShadow: [
                `inset -24px -30px 60px ${tint(bubble.color, 0.22 * s)}`,
                `inset 20px 22px 48px ${tint("#ffffff", 0.5 * s)}`,
                `0 32px 60px -40px ${tint(bubble.color, 0.5 * s)}`,
              ].join(", "),
              border: `1px solid ${tint(bubble.color, 0.1 * s)}`,
            }}
          />
        );
      })}

      {rings.map((ring, index) => (
        <div
          key={`${ring.color}-${index}`}
          className={cn("absolute rounded-full border-2", ring.className)}
          style={{
            borderColor: tint(ring.color, 0.22),
            boxShadow: `inset 0 14px 30px ${tint("#ffffff", 0.6)}, inset 0 -14px 30px ${tint(ring.color, 0.08)}`,
          }}
        />
      ))}
    </div>
  );
}
