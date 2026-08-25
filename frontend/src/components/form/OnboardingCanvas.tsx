import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The canvas an onboarding form sits on.
 *
 * The dashboard fills the viewport on purpose, which is right for a table or a
 * dashboard but leaves a form stretched thin: three columns of inputs pulled
 * across a 4K screen are further apart than they are useful. This pulls the
 * form in a little so a row reads as a row.
 *
 * The inset is a percentage, not a fixed width, and that distinction is the
 * whole design. A `max-width` would park the form in a narrow column with two
 * growing bands of empty grey either side, which is exactly what the layout is
 * meant to avoid. A percentage keeps the margin the same fraction of the screen
 * at every size, so the form still fills the width - just slightly less of it.
 *
 * It starts at 2xl. Below that there is no width to spare and the field grid
 * would only get cramped.
 */
export function OnboardingCanvas({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("w-full 2xl:px-[3%]", className)}>{children}</div>;
}
