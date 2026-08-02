import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { Sidebar } from "./sidebar/Sidebar";
import { Navbar } from "./navbar/Navbar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { navItemsFor } from "@/constants/navigation";
import { useAuth } from "@/context/AuthContext";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const routerNavigate = useNavigate();
  const { pathname } = useLocation();
  const { role } = useAuth();

  // Each portal governs different things, so the menu is built per role.
  const items = useMemo(() => navItemsFor(role), [role]);

  /**
   * Highlight follows the route rather than the last thing clicked, so a page
   * reached any other way still lights up its menu entry. The longest matching
   * href wins, which keeps `/admin/onboarding/driver` from also lighting up
   * `/admin`.
   */
  const activeHref = useMemo(() => {
    const candidates = items.flatMap((item) => [
      ...(item.href ? [item.href] : []),
      ...(item.children ?? []).flatMap((child) => (child.href ? [child.href] : [])),
    ]);

    return candidates
      .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
      .sort((a, b) => b.length - a.length)[0] ?? "";
  }, [items, pathname]);

  const navigate = (href: string) => {
    setDrawerOpen(false);
    if (href !== pathname) routerNavigate(href);
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-[#f7f8fa]">
        {/* Mobile drawer (navigation lives in the header on desktop) */}
        <AnimatePresence>
          {drawerOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setDrawerOpen(false)}
                className="fixed inset-0 z-40 bg-brand-navy/40 backdrop-blur-sm lg:hidden"
              />
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", stiffness: 320, damping: 34 }}
                className="fixed inset-y-0 left-0 z-50 w-[280px] bg-white shadow-lift lg:hidden"
              >
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="absolute right-4 top-6 grid h-9 w-9 place-items-center rounded-xl text-slate-500 hover:bg-secondary"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
                <Sidebar items={items} activeHref={activeHref} onNavigate={navigate} />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main column */}
        <div>
          <Navbar
            items={items}
            onMenuClick={() => setDrawerOpen(true)}
            activeHref={activeHref}
            onNavigate={navigate}
          />
          {/* Fluid full-width: fills the viewport on 1.5K/2K/4K instead of
              centering the content with large empty side margins. */}
          <main className="w-full px-4 py-6 sm:px-6 lg:px-8 lg:py-8 2xl:px-12">
            {children}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
