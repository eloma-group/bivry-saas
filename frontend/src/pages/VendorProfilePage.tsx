import { Link, Navigate, useParams } from "react-router-dom";
import { Building2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { VendorProfile } from "@/components/vendor/profile/VendorProfile";
import { PanelError, PanelLoader } from "@/components/common/PanelState";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useVendorOnboarding } from "@/hooks/useVendorOnboarding";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The signed in vendor's own profile: everything they have given us so far.
 *
 * The URL carries the vendor's id. The API only ever answers for whoever is
 * signed in, so an id belonging to somebody else would show this vendor's own
 * details under a stranger's URL. Rather than let the address lie, another id
 * redirects to the one it can actually show.
 */
export function VendorProfilePage() {
  const { vendorId } = useParams();
  const { user } = useAuth();
  const { data, loading, error, reload } = useVendorOnboarding();

  if (!vendorId || !UUID_RE.test(vendorId)) return <NotFoundPage />;

  if (user && vendorId !== user.id) {
    return <Navigate to={`/vendor/${user.id}`} replace />;
  }

  return (
    <DashboardLayout>
      {loading ? (
        <PanelLoader label="Loading your profile" />
      ) : error ? (
        <PanelError message={error} onRetry={() => void reload()} />
      ) : data ? (
        <VendorProfile data={data} />
      ) : (
        // Only reachable with no session, which is the development auth bypass.
        <div className="grid min-h-[60vh] w-full place-items-center">
          <div className="flex max-w-md flex-col items-center gap-4 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Building2 className="h-6 w-6" />
            </span>
            <div>
              <p className="text-base font-semibold text-foreground">
                No vendor signed in
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Sign in to a vendor account to see its profile.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link to="/vendor/login">Go to vendor login</Link>
            </Button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
