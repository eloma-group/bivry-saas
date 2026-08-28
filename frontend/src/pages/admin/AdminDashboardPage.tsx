import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardList,
  Hourglass,
  Users2,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PanelError, PanelLoader } from "@/components/common/PanelState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { adminService, type AdminDashboard } from "@/services/adminService";
import { ApiRequestError } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { ONBOARDING_STATUS } from "@/constants/adminStatus";
import { prettyDate } from "@/utils/date";
import { cn } from "@/lib/utils";

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
  to,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "warning" | "success" | "danger";
  to?: string;
}) {
  const tones = {
    default: "bg-primary/10 text-primary",
    warning: "bg-amber-50 text-amber-600",
    success: "bg-emerald-50 text-emerald-600",
    danger: "bg-red-50 text-red-600",
  };

  const body = (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex h-full items-start gap-4 rounded-3xl border border-border/70 bg-card p-5 shadow-card transition-shadow",
        to && "hover:shadow-lift",
      )}
    >
      <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-2xl", tones[tone])}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-2xl font-bold tracking-tight text-foreground">{value}</p>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
    </motion.div>
  );

  return to ? <Link to={to}>{body}</Link> : body;
}

export function AdminDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await adminService.dashboard());
    } catch (caught) {
      setError(
        caught instanceof ApiRequestError
          ? caught.message
          : "Could not load the dashboard. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const firstName = typeof user?.firstName === "string" ? user.firstName : "";

  return (
    <DashboardLayout>
      {loading ? (
        <PanelLoader label="Loading the dashboard" />
      ) : error || !data ? (
        <PanelError message={error ?? "No data"} onRetry={() => void load()} />
      ) : (
        <>
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {firstName ? `Welcome back, ${firstName}` : "Admin Dashboard"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Everything across the fleet, and everyone waiting on a decision from you.
            </p>
          </div>

          {/* Fills the width on large monitors rather than leaving side gutters. */}
          <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
            <StatCard
              icon={Users2}
              label="Drivers"
              value={data.drivers.total}
              hint={`${data.drivers.pendingReview} waiting for review`}
              to="/admin/onboarding/driver"
            />
            <StatCard
              icon={Building2}
              label="Vendors"
              value={data.vendors.total}
              hint={`${data.vendors.pendingReview} waiting for review`}
              to="/admin/onboarding/vendor"
            />
            <StatCard
              icon={Hourglass}
              label="Waiting for review"
              value={data.drivers.pendingReview + data.vendors.pendingReview}
              hint="Drivers and vendors together"
              tone="warning"
              to="/admin/onboarding/driver?status=SUBMITTED"
            />
            <StatCard
              icon={CheckCircle2}
              label="Approved"
              value={data.drivers.approved + data.vendors.approved}
              hint="Cleared to work"
              tone="success"
              to="/admin/onboarding/driver?status=APPROVED"
            />
            <StatCard
              icon={XCircle}
              label="Changes requested"
              value={data.drivers.rejected + data.vendors.rejected}
              hint="Sent back to be corrected"
              tone="danger"
              to="/admin/onboarding/driver?status=REJECTED"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
            {/* Recent drivers */}
            <section className="rounded-3xl border border-border/70 bg-card p-6 shadow-card">
              <header className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold tracking-tight text-foreground">
                    Latest driver accounts
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    The six most recently created.
                  </p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link to="/admin/onboarding/driver">
                    View all <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </header>

              {data.recentDrivers.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No drivers yet.
                </p>
              ) : (
                <ul className="divide-y divide-border/60">
                  {data.recentDrivers.map((driver) => {
                    const status = ONBOARDING_STATUS[driver.onboardingStatus];
                    const name =
                      [driver.firstName, driver.lastName].filter(Boolean).join(" ") ||
                      driver.email;
                    return (
                      <li key={driver.id}>
                        <Link
                          to={`/admin/onboarding/driver/${driver.id}`}
                          className="flex items-center justify-between gap-4 py-3 transition-colors hover:bg-secondary/40"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">{name}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {driver.email} - joined {prettyDate(driver.createdAt)}
                            </p>
                          </div>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* Recent vendors */}
            <section className="rounded-3xl border border-border/70 bg-card p-6 shadow-card xl:col-start-1">
              <header className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold tracking-tight text-foreground">
                    Latest vendor accounts
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    The six most recently created.
                  </p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link to="/admin/onboarding/vendor">
                    View all <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </header>

              {data.recentVendors.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No vendors yet.
                </p>
              ) : (
                <ul className="divide-y divide-border/60">
                  {data.recentVendors.map((vendor) => {
                    const status = ONBOARDING_STATUS[vendor.onboardingStatus];
                    return (
                      <li key={vendor.id}>
                        <Link
                          to={`/admin/onboarding/vendor/${vendor.id}`}
                          className="flex items-center justify-between gap-4 py-3 transition-colors hover:bg-secondary/40"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">
                              {vendor.companyName}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {vendor.vendorCode ? `${vendor.vendorCode} - ` : ""}
                              {vendor.email} - joined {prettyDate(vendor.createdAt)}
                            </p>
                          </div>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* Modules */}
            <section className="rounded-3xl border border-border/70 bg-card p-6 shadow-card xl:col-start-2 xl:row-start-1 xl:row-span-2">
              <header className="mb-4">
                <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight text-foreground">
                  <ClipboardList className="h-[1.125rem] w-[1.125rem] text-primary" />
                  Onboarding modules
                </h2>
                <p className="text-sm text-muted-foreground">
                  Pick a record type to work through.
                </p>
              </header>

              <ul className="space-y-2">
                {data.modules.map((module) => (
                  <li key={module.slug}>
                    <Link
                      to={`/admin/onboarding/${module.slug}`}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 px-4 py-3 transition-colors hover:border-primary/40 hover:bg-secondary/40"
                    >
                      <span className="text-sm font-medium text-foreground">
                        {module.label}
                      </span>
                      {module.ready ? (
                        <span className="text-sm text-muted-foreground">
                          {module.records} record{module.records === 1 ? "" : "s"}
                        </span>
                      ) : (
                        <Badge variant="outline">Not built yet</Badge>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
