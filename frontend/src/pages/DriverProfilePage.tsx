import { Link, Navigate, useParams } from "react-router-dom";
import { UserPlus } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DriverProfile } from "@/components/driver/profile/DriverProfile";
import { PanelError, PanelLoader } from "@/components/common/PanelState";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useDriverOnboarding } from "@/hooks/useDriverOnboarding";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The signed in driver's own profile: everything they have given us so far.
 *
 * The URL carries the driver's id. The API only ever answers for whoever is
 * signed in, so an id belonging to somebody else would show this driver's own
 * details under a stranger's URL. Rather than let the address lie, another id
 * redirects to the one it can actually show.
 */
export function DriverProfilePage() {
  const { driverId } = useParams();
  const { user } = useAuth();
  const { data, loading, error, reload } = useDriverOnboarding();

  if (!driverId || !UUID_RE.test(driverId)) return <NotFoundPage />;

  if (user && driverId !== user.id) {
    return <Navigate to={`/driver/${user.id}`} replace />;
  }

  return (
    <DashboardLayout>
      {loading ? (
        <PanelLoader label="Loading your profile" />
      ) : error ? (
        <PanelError message={error} onRetry={() => void reload()} />
      ) : data ? (
        <DriverProfile data={data} />
      ) : (
        // Only reachable with no session, which is the development auth bypass.
        <div className="grid min-h-[60vh] w-full place-items-center">
          <div className="flex max-w-md flex-col items-center gap-4 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <UserPlus className="h-6 w-6" />
            </span>
            <div>
              <p className="text-base font-semibold text-foreground">
                No driver signed in
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Sign in to a driver account to see its profile.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link to="/driver/login">Go to driver login</Link>
            </Button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
