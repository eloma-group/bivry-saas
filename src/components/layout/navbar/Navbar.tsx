import { Bell, MessageSquare, HelpCircle, Menu, ChevronDown } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NavbarProps {
  onMenuClick: () => void;
  userName?: string;
  role?: string;
}

const ICONS = [
  { icon: Bell, label: "Notifications", dot: true },
  { icon: MessageSquare, label: "Messages", dot: false },
  { icon: HelpCircle, label: "Help", dot: false },
];

export function Navbar({
  onMenuClick,
  userName = "Ranjeeth Nair",
  role = "Super Admin",
}: NavbarProps) {
  const first = userName.split(" ")[0];
  return (
    <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between gap-4 border-b border-border/70 bg-white/95 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="grid h-10 w-10 place-items-center rounded-xl text-slate-600 transition-colors hover:bg-secondary lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="lg:hidden">
          <Logo />
        </div>
        <h1 className="hidden text-xl font-semibold tracking-tight text-foreground lg:block">
          Welcome back,{" "}
          <span className="text-primary">{first}!</span>
        </h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-1 rounded-full bg-secondary/70 p-1">
          {ICONS.map(({ icon: Icon, label, dot }) => (
            <Tooltip key={label} delayDuration={200}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="relative grid h-9 w-9 place-items-center rounded-full text-slate-500 transition-colors hover:bg-white hover:text-foreground hover:shadow-soft"
                  aria-label={label}
                >
                  <Icon className="h-[18px] w-[18px]" />
                  {dot && (
                    <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-secondary" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>{label}</TooltipContent>
            </Tooltip>
          ))}
        </div>

        <button
          type="button"
          className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-secondary sm:pr-3"
        >
          <img
            src="https://i.pravatar.cc/80?img=68"
            alt={userName}
            className="h-9 w-9 rounded-full object-cover ring-1 ring-border"
          />
          <div className="hidden text-left sm:block">
            <p className="text-sm font-semibold leading-tight text-foreground">
              {userName}
            </p>
            <p className="text-xs leading-tight text-muted-foreground">{role}</p>
          </div>
          <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" />
        </button>
      </div>
    </header>
  );
}
