import { useState } from "react";
import {
  Bell,
  MessageSquare,
  HelpCircle,
  Menu,
  ChevronDown,
  User,
  LogOut,
} from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { NavMenu } from "./NavMenu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface NavbarProps {
  onMenuClick: () => void;
  activeHref: string;
  onNavigate: (href: string) => void;
  userName?: string;
  role?: string;
}

const MENU_ITEMS = [
  { icon: User, label: "Profile" },
  { icon: Bell, label: "Notifications", dot: true },
  { icon: MessageSquare, label: "Messages" },
  { icon: HelpCircle, label: "Help" },
];

export function Navbar({
  onMenuClick,
  activeHref,
  onNavigate,
  userName = "Ranjeeth Nair",
  role = "Super Admin",
}: NavbarProps) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-[4.5rem] items-center gap-4 border-b border-border/70 bg-white/95 px-4 sm:px-6 lg:px-8">
      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-600 transition-colors hover:bg-secondary lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="shrink-0">
          <Logo />
        </div>
      </div>

      <NavMenu
        activeHref={activeHref}
        onNavigate={onNavigate}
        className="hidden flex-1 justify-center lg:flex"
      />

      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3 lg:ml-0">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-secondary sm:pr-3"
            >
              <span className="relative">
                <img
                  src="https://i.pravatar.cc/80?img=68"
                  alt={userName}
                  className="h-9 w-9 rounded-full object-cover ring-1 ring-border"
                />
                <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
              </span>
              <div className="hidden text-left sm:block">
                <p className="text-sm font-semibold leading-tight text-foreground">
                  {userName}
                </p>
                <p className="text-xs leading-tight text-muted-foreground">
                  {role}
                </p>
              </div>
              <ChevronDown
                className={`hidden h-4 w-4 text-slate-400 transition-transform duration-200 sm:block ${
                  open ? "rotate-180" : ""
                }`}
              />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" sideOffset={10} className="w-60 p-1.5">
            <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 sm:hidden">
              <img
                src="https://i.pravatar.cc/80?img=68"
                alt={userName}
                className="h-9 w-9 rounded-full object-cover ring-1 ring-border"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold leading-tight text-foreground">
                  {userName}
                </p>
                <p className="truncate text-xs leading-tight text-muted-foreground">
                  {role}
                </p>
              </div>
            </div>
            <div className="my-1 h-px bg-border/70 sm:hidden" />

            <ul className="space-y-0.5">
              {MENU_ITEMS.map(({ icon: Icon, label, dot }) => (
                <li key={label}>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <Icon className="h-[1.125rem] w-[1.125rem] shrink-0 text-slate-400" />
                    <span className="flex-1 text-left">{label}</span>
                    {dot && (
                      <span className="h-2 w-2 rounded-full bg-red-500" />
                    )}
                  </button>
                </li>
              ))}
            </ul>

            <div className="my-1 h-px bg-border/70" />

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              <LogOut className="h-[1.125rem] w-[1.125rem] shrink-0" />
              <span className="flex-1 text-left">Logout</span>
            </button>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
