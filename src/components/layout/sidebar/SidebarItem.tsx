import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { NavItem } from "@/types/nav";

interface SidebarItemProps {
  item: NavItem;
  activeHref: string;
  onNavigate: (href: string) => void;
}

function DisabledWrap({
  children,
  label,
}: {
  children: React.ReactNode;
  label?: string;
}) {
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right">
        {label ?? "Coming soon"}
      </TooltipContent>
    </Tooltip>
  );
}

export function SidebarItem({ item, activeHref, onNavigate }: SidebarItemProps) {
  const hasChildren = !!item.children?.length;
  const containsActive = item.children?.some(
    (c) => c.enabled && c.href === activeHref
  );
  const [open, setOpen] = useState(containsActive ?? false);
  const Icon = item.icon;

  if (!hasChildren) {
    const enabled = item.enabled;
    const button = (
      <button
        type="button"
        disabled={!enabled}
        onClick={() => enabled && item.enabled && onNavigate(item.label)}
        className={cn(
          "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
          enabled
            ? "text-slate-600 hover:bg-secondary hover:text-foreground"
            : "cursor-not-allowed text-slate-400 opacity-60"
        )}
      >
        <Icon className="h-[18px] w-[18px] shrink-0" />
        <span className="flex-1 text-left">{item.label}</span>
        {!enabled && <Lock className="h-3.5 w-3.5 opacity-50" />}
      </button>
    );
    return enabled ? button : <DisabledWrap>{button}</DisabledWrap>;
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
          containsActive
            ? "bg-primary/[0.07] font-semibold text-primary"
            : "text-slate-600 hover:bg-secondary hover:text-foreground"
        )}
      >
        <Icon className="h-[18px] w-[18px] shrink-0" />
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-slate-400 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden pl-4"
          >
            {item.children!.map((child) => {
              const active = child.enabled && child.href === activeHref;
              const row = (
                <button
                  type="button"
                  disabled={!child.enabled}
                  onClick={() =>
                    child.enabled && child.href && onNavigate(child.href)
                  }
                  className={cn(
                    "relative flex w-full items-center gap-3 rounded-lg py-2 pl-4 pr-3 text-sm transition-colors",
                    "before:absolute before:left-0 before:top-1/2 before:h-1.5 before:w-1.5 before:-translate-y-1/2 before:rounded-full before:transition-colors",
                    active
                      ? "font-semibold text-primary before:bg-primary"
                      : child.enabled
                        ? "text-slate-500 before:bg-slate-300 hover:text-foreground"
                        : "cursor-not-allowed text-slate-400 opacity-60 before:bg-slate-200"
                  )}
                >
                  {child.label}
                </button>
              );
              return (
                <li key={child.label}>
                  {child.enabled ? row : <DisabledWrap>{row}</DisabledWrap>}
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
