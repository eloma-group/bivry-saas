import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import type { StepProgress } from "@/hooks/useDriverProgress";

interface StepperProps {
  steps: StepProgress[];
  activeIndex: number;
  percent: number;
}

/** Horizontal, animated onboarding stepper with an overall progress bar. */
export function Stepper({ steps, activeIndex, percent }: StepperProps) {
  return (
    <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-card sm:p-7">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Your progress
          </p>
          <p className="text-2xl font-bold tracking-tight text-primary">
            {percent}%
            <span className="ml-1.5 text-base font-medium text-muted-foreground">
              to complete
            </span>
          </p>
        </div>
      </div>

      <Progress value={percent} className="mb-7 h-2" />

      {/* Horizontal scroll clips the cross axis too, so the active circle - which
          scales up a touch and carries a ring - needs vertical room or it reads
          as a flattened, cut-off circle. A little side padding keeps the first
          and last circles off the scroll edges for the same reason. */}
      <ol className="no-scrollbar flex items-center gap-2 overflow-x-auto px-1 py-1.5">
        {steps.map((step, i) => {
          const isActive = i === activeIndex;
          const isDone = step.complete;
          return (
            <li
              key={step.id}
              className="flex min-w-fit flex-1 items-center gap-2"
            >
              <div className="flex items-center gap-2.5">
                <motion.span
                  initial={false}
                  animate={{
                    scale: isActive ? 1.08 : 1,
                    backgroundColor: isDone
                      ? "hsl(221 83% 53%)"
                      : isActive
                        ? "hsl(221 83% 97%)"
                        : "hsl(220 16% 96%)",
                  }}
                  className={cn(
                    "grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ring-1 transition-colors",
                    isDone
                      ? "text-white ring-primary"
                      : isActive
                        ? "text-primary ring-primary/30"
                        : "text-muted-foreground ring-border"
                  )}
                >
                  {isDone ? <Check className="h-4 w-4 stroke-[3]" /> : i + 1}
                </motion.span>
                <span
                  className={cn(
                    "whitespace-nowrap text-sm font-medium transition-colors",
                    isActive
                      ? "text-foreground"
                      : isDone
                        ? "text-foreground/80"
                        : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <span className="mx-1 h-px min-w-6 flex-1 bg-border" />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
