import { Link, Navigate, useParams } from "react-router-dom";
import { Construction } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminDriversPage } from "./AdminDriversPage";
import { AdminDriverDetailPage } from "./AdminDriverDetailPage";
import { AdminDriverEditPage } from "./AdminDriverEditPage";
import { AdminVendorsPage } from "./AdminVendorsPage";
import { AdminVendorDetailPage } from "./AdminVendorDetailPage";
import { AdminVendorEditPage } from "./AdminVendorEditPage";
import { AdminCustomersPage } from "./AdminCustomersPage";
import { AdminCustomerDetailPage } from "./AdminCustomerDetailPage";
import { AdminCustomerEditPage } from "./AdminCustomerEditPage";
import { AdminSimpleAccountsPage } from "./AdminSimpleAccountsPage";
import { AdminSimpleAccountEditPage } from "./AdminSimpleAccountEditPage";
import { simpleAccountModule } from "./simpleAccountModules";
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
 * Driver, Vendor and Customer each have a full register behind them, User is a
 * plain account, and Vehicle says plainly that it is not built yet rather than
 * being unclickable in the menu, which leaves an admin guessing.
 */
export function AdminOnboardingPage() {
  const { module = "", recordId, action } = useParams();

  if (!isOnboardingModule(module)) {
    return <Navigate to="/admin/onboarding/driver" replace />;
  }

  const current = onboardingModule(module);

  // Employees are plain accounts, driven by a field config rather than by a
  // pair of hand written pages. Customers used to be one of these and have a
  // full record of their own now, handled in the per module tree below.
  const simple = simpleAccountModule(module);
  if (simple) {
    return (
      <DashboardLayout>
        {recordId === "new" ? (
          <AdminSimpleAccountEditPage module={simple} />
        ) : recordId ? (
          <AdminSimpleAccountEditPage module={simple} id={recordId} />
        ) : (
          <AdminSimpleAccountsPage module={simple} />
        )}
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {module === "driver" ? (
        // A record id is a uuid, so "new" can never be one. It opens the same
        // form an edit does, with nothing in it.
        recordId === "new" ? (
          <AdminDriverEditPage />
        ) : recordId ? (
          action === "edit" ? (
            <AdminDriverEditPage driverId={recordId} />
          ) : (
            <AdminDriverDetailPage driverId={recordId} />
          )
        ) : (
          <AdminDriversPage />
        )
      ) : module === "vendor" ? (
        recordId === "new" ? (
          <AdminVendorEditPage />
        ) : recordId ? (
          action === "edit" ? (
            <AdminVendorEditPage vendorId={recordId} />
          ) : (
            <AdminVendorDetailPage vendorId={recordId} />
          )
        ) : (
          <AdminVendorsPage />
        )
      ) : module === "customer" ? (
        recordId === "new" ? (
          <AdminCustomerEditPage />
        ) : recordId ? (
          action === "edit" ? (
            <AdminCustomerEditPage customerId={recordId} />
          ) : (
            <AdminCustomerDetailPage customerId={recordId} />
          )
        ) : (
          <AdminCustomersPage />
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
                This module has no records behind it so far. Driver, Vendor and
                Customer onboarding are live and complete, and the rest follow
                the same shape.
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
