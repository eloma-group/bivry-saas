import { forwardRef } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  index: number;
  title: string;
  description?: string;
  icon: LucideIcon;
  children?: React.ReactNode;
  className?: string;
  id?: string;
}

/** Reusable numbered section shell with a subtle scroll-in animation. */
export const SectionCard = forwardRef<HTMLDivElement, SectionCardProps>(
  ({ index, title, description, icon: Icon, children, className, id }, ref) => {
    return (
      <motion.section
        ref={ref}
        id={id}
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "scroll-mt-28 rounded-3xl border border-border/70 bg-card p-6 shadow-card sm:p-8",
          className
        )}
      >
        <header className="mb-6 flex items-start gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </span>
          <div className="pt-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-wide text-primary">
                {String(index).padStart(2, "0")}
              </span>
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                {title}
              </h2>
            </div>
            {description && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        </header>
        {children}
      </motion.section>
    );
  }
);
SectionCard.displayName = "SectionCard";
