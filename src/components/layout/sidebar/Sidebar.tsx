import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/layout/Logo";
import { SidebarItem } from "./SidebarItem";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { NAV_ITEMS, NAV_FOOTER } from "@/constants/navigation";

interface SidebarProps {
  activeHref: string;
  onNavigate: (href: string) => void;
  className?: string;
}

export function Sidebar({ activeHref, onNavigate, className }: SidebarProps) {
  return (
    <aside
      className={cn(
        "flex h-full w-[264px] shrink-0 flex-col bg-white",
        className
      )}
    >
      <div className="px-6 py-6">
        <Logo />
      </div>

      <nav className="no-scrollbar flex-1 space-y-1 overflow-y-auto px-4 pb-4">
        {NAV_ITEMS.map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
          >
            <SidebarItem
              item={item}
              activeHref={activeHref}
              onNavigate={onNavigate}
            />
          </motion.div>
        ))}
      </nav>

      <div className="space-y-1 border-t border-border/70 px-4 py-4">
        {NAV_FOOTER.map((item) => {
          const Icon = item.icon;
          return (
            <Tooltip key={item.label} delayDuration={200}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  disabled
                  className="flex w-full cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 opacity-60"
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                  <Lock className="h-3.5 w-3.5 opacity-50" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Coming soon</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </aside>
  );
}
