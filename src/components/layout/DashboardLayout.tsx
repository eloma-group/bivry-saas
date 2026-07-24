import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { Sidebar } from "./sidebar/Sidebar";
import { Navbar } from "./navbar/Navbar";
import { TooltipProvider } from "@/components/ui/tooltip";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [active, setActive] = useState("driver");

  const navigate = (href: string) => {
    setActive(href);
    setDrawerOpen(false);
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-[#f7f8fa]">
        {/* Desktop sidebar (fixed) */}
        <div className="fixed inset-y-0 left-0 z-40 hidden p-3 lg:block">
          <div className="h-full overflow-hidden rounded-3xl border border-border/70 shadow-card">
            <Sidebar activeHref={active} onNavigate={navigate} />
          </div>
        </div>

        {/* Mobile drawer */}
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
                <Sidebar activeHref={active} onNavigate={navigate} />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main column */}
        <div className="lg:pl-[288px]">
          <Navbar onMenuClick={() => setDrawerOpen(true)} />
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
