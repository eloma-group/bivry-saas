import { useState } from "react";
import { ChevronDown, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { NavItem } from "@/types/nav";

interface NavMenuProps {
  items: NavItem[];
  activeHref: string;
  onNavigate: (href: string) => void;
  className?: string;
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
      <TooltipContent>{label ?? "Coming soon"}</TooltipContent>
    </Tooltip>
  );
}

function TopItem({
  item,
  activeHref,
  onNavigate,
}: {
  item: NavItem;
  activeHref: string;
  onNavigate: (href: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const hasChildren = !!item.children?.length;
  const Icon = item.icon;
  const containsActive = item.children?.some(
    (c) => c.enabled && c.href === activeHref
  );

  if (!hasChildren) {
    const enabled = Boolean(item.enabled && item.href);
    const active = enabled && item.href === activeHref;
    const button = (
      <button
        type="button"
        disabled={!enabled}
        onClick={() => enabled && item.href && onNavigate(item.href)}
        className={cn(
          "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
          active
            ? "bg-primary/[0.07] font-semibold text-primary"
            : enabled
              ? "text-slate-600 hover:bg-secondary hover:text-foreground"
              : "cursor-not-allowed text-slate-400 opacity-70"
        )}
      >
        <Icon className="h-[1.125rem] w-[1.125rem] shrink-0" />
        <span>{item.label}</span>
        {!enabled && <Lock className="h-3.5 w-3.5 opacity-50" />}
      </button>
    );
    return enabled ? button : <DisabledWrap>{button}</DisabledWrap>;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
            containsActive || open
              ? "bg-primary/[0.07] font-semibold text-primary"
              : "text-slate-600 hover:bg-secondary hover:text-foreground"
          )}
        >
          <Icon className="h-[1.125rem] w-[1.125rem] shrink-0" />
          <span>{item.label}</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-slate-400 transition-transform duration-200",
              open && "rotate-180"
            )}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={10} className="w-56 p-1.5">
        <ul className="space-y-0.5">
          {item.children!.map((child) => {
            const active = child.enabled && child.href === activeHref;
            const row = (
              <button
                type="button"
                disabled={!child.enabled}
                onClick={() => {
                  if (child.enabled && child.href) {
                    onNavigate(child.href);
                    setOpen(false);
                  }
                }}
                className={cn(
                  "relative flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-primary/[0.07] font-semibold text-primary"
                    : child.enabled
                      ? "text-slate-600 hover:bg-secondary hover:text-foreground"
                      : "cursor-not-allowed text-slate-400 opacity-70"
                )}
              >
                <span>{child.label}</span>
                {!child.enabled && <Lock className="h-3.5 w-3.5 opacity-50" />}
              </button>
            );
            return (
              <li key={child.label}>
                {child.enabled ? row : <DisabledWrap>{row}</DisabledWrap>}
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

/** Horizontal top-navigation menu (replaces the old left sidebar). */
export function NavMenu({ items, activeHref, onNavigate, className }: NavMenuProps) {
  return (
    <nav className={cn("flex items-center gap-0.5 xl:gap-2", className)}>
      {items.map((item) => (
        <TopItem
          key={item.label}
          item={item}
          activeHref={activeHref}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
}
