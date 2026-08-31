import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  MessageSquare,
  HelpCircle,
  KeyRound,
  Menu,
  ChevronDown,
  User,
  LogOut,
  Loader2,
} from "lucide-react";
import type { NavItem } from "@/types/nav";
import { Logo } from "@/components/layout/Logo";
import { NavMenu } from "./NavMenu";
import { NotificationBell } from "./NotificationBell";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuth } from "@/context/AuthContext";
import { getPortal, homeHrefFor } from "@/config/roles";
import { avatarTintOf, initialsOf, roleLabelOf } from "@/utils/user";
import { cn } from "@/lib/utils";

interface NavbarProps {
  items: NavItem[];
  onMenuClick: () => void;
  activeHref: string;
  onNavigate: (href: string) => void;
}

/**
 * The account menu. `target: "profile"` resolves to the portal's own profile
 * page at render time; the rest are still waiting on their feature work.
 */
const MENU_ITEMS = [
  { icon: User, label: "Profile", target: "profile" as const },
  { icon: KeyRound, label: "Change password", target: "password" as const },
  // Notifications live in their own bell in the header, next to this menu.
  { icon: MessageSquare, label: "Messages" },
  { icon: HelpCircle, label: "Help" },
];

/** Initials on a tinted circle. No stock photo, and nothing that can fail to load. */
function Avatar({
  initials,
  tint,
  className,
}: {
  initials: string;
  tint: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-semibold text-white ring-1 ring-black/5",
        tint,
        className,
      )}
    >
      {initials}
    </span>
  );
}

export function Navbar({ items, onMenuClick, activeHref, onNavigate }: NavbarProps) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  // `user` is null only while the development auth bypass is on, where nobody
  // is signed in but the shell still renders.
  const displayName = user?.displayName ?? "Not signed in";
  const roleLabel = roleLabelOf(user, role);
  const initials = user ? initialsOf(user) : "?";
  const tint = user ? avatarTintOf(user) : "bg-slate-400";
  // Only the portals that have a profile page get a working Profile entry, and
  // only once the account it belongs to is known: its id is part of the path.
  const profilePath = role && user ? getPortal(role).profilePath?.(user.id) : undefined;
  // Every portal can change its own password.
  const changePasswordPath = role ? getPortal(role).changePasswordPath : undefined;
  // Where the logo leads. The drawer's copy of it uses the same helper.
  const homeHref = homeHrefFor(role);

  async function handleLogout() {
    if (signingOut) return;
    setSigningOut(true);

    // Never throws: the local session is cleared even when revoking the refresh
    // token on the server fails.
    await logout();

    setOpen(false);
    // ProtectedRoute would bounce here on its own once the session is gone.
    // Doing it explicitly avoids rendering a frame of the signed in shell first.
    navigate(role ? getPortal(role).loginPath : "/", { replace: true });
  }

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
        {/* The logo is the way back out. See `homeHrefFor` for where to. */}
        <Link
          to={homeHref}
          aria-label={role === "admin" ? "Go to the dashboard" : "Choose your portal"}
          className="shrink-0 rounded-xl transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10"
        >
          <Logo />
        </Link>
      </div>

      <NavMenu
        items={items}
        activeHref={activeHref}
        onNavigate={onNavigate}
        className="hidden flex-1 justify-center lg:flex"
      />

      <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2 lg:ml-0">
        <NotificationBell role={role} />

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-secondary sm:pr-3"
              aria-label={`Account menu for ${displayName}`}
            >
              <Avatar initials={initials} tint={tint} className="h-9 w-9 text-sm" />
              <div className="hidden text-left sm:block">
                {/* Tighter at lg than above it. lg is where the centre menu
                    appears while the screen is still only 1024 wide, and a long
                    company name reserving 11rem here is what pushed the row
                    past the viewport and made the whole page scroll sideways.
                    Wider screens have the room, so they keep the full width. */}
                <p className="max-w-[7rem] truncate text-sm font-semibold leading-tight text-foreground xl:max-w-[11rem]">
                  {displayName}
                </p>
                <p className="text-xs leading-tight text-muted-foreground">
                  {roleLabel}
                </p>
              </div>
              <ChevronDown
                className={`hidden h-4 w-4 text-slate-400 transition-transform duration-200 sm:block ${
                  open ? "rotate-180" : ""
                }`}
              />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" sideOffset={10} className="w-64 p-1.5">
            {/* The trigger hides the name below sm, so it is repeated here. The
                email shows at every size: two accounts can share a name. */}
            <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
              <Avatar initials={initials} tint={tint} className="h-9 w-9 text-sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold leading-tight text-foreground">
                  {displayName}
                </p>
                <p className="truncate text-xs leading-tight text-muted-foreground">
                  {user?.email ?? roleLabel}
                </p>
              </div>
            </div>
            <div className="my-1 h-px bg-border/70" />

            <ul className="space-y-0.5">
              {MENU_ITEMS.map(({ icon: Icon, label, target }) => {
                const path =
                  target === "profile"
                    ? profilePath
                    : target === "password"
                      ? changePasswordPath
                      : undefined;
                return (
                  <li key={label}>
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        if (path) navigate(path);
                      }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-secondary hover:text-foreground"
                    >
                      <Icon className="h-[1.125rem] w-[1.125rem] shrink-0 text-slate-400" />
                      <span className="flex-1 text-left">{label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="my-1 h-px bg-border/70" />

            <button
              type="button"
              onClick={handleLogout}
              disabled={signingOut || !user}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {signingOut ? (
                <Loader2 className="h-[1.125rem] w-[1.125rem] shrink-0 animate-spin" />
              ) : (
                <LogOut className="h-[1.125rem] w-[1.125rem] shrink-0" />
              )}
              <span className="flex-1 text-left">
                {signingOut ? "Signing out" : "Logout"}
              </span>
            </button>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
