import { Link, Navigate, useParams } from "react-router-dom";
import { Construction } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminDriversPage } from "./AdminDriversPage";
import { AdminDriverDetailPage } from "./AdminDriverDetailPage";
import { AdminVendorsPage } from "./AdminVendorsPage";
import { AdminVendorDetailPage } from "./AdminVendorDetailPage";
import { Button } from "@/components/ui/button";
import {
  ONBOARDING_MODULES,
  isOnboardingModule,
  onboardingModule,
} from "@/constants/navigation";

/**
 * The Onboarding section of the Admin portal.
 *
 * The menu offers five record types and this decides what the chosen one shows.
 * Driver and Supplier have a register behind them; the rest say so plainly
 * rather than being unclickable in the menu, which leaves an admin guessing.
 */
export function AdminOnboardingPage() {
  const { module = "", recordId } = useParams();

  if (!isOnboardingModule(module)) {
    return <Navigate to="/admin/onboarding/driver" replace />;
  }

  const current = onboardingModule(module);

  return (
    <DashboardLayout>
      {module === "driver" ? (
        recordId ? (
          <AdminDriverDetailPage driverId={recordId} />
        ) : (
          <AdminDriversPage />
        )
      ) : module === "supplier" ? (
        recordId ? (
          <AdminVendorDetailPage vendorId={recordId} />
        ) : (
          <AdminVendorsPage />
        )
      ) : (
        <div className="grid min-h-[60vh] w-full place-items-center">
          <div className="flex max-w-lg flex-col items-center gap-5 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-3xl bg-amber-50 text-amber-600">
              <Construction className="h-7 w-7" />
            </span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                {current?.label} onboarding is not built yet
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                This module has no records behind it so far. Driver and Supplier
                onboarding are live and complete, and the rest follow the same shape.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              {ONBOARDING_MODULES.map((entry) => (
                <Button
                  key={entry.slug}
                  asChild
                  variant={entry.slug === module ? "secondary" : "outline"}
                  size="sm"
                >
                  <Link to={`/admin/onboarding/${entry.slug}`}>
                    {entry.label}
                    {entry.ready ? "" : " (soon)"}
                  </Link>
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
