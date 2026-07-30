import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getPortal } from "@/config/roles";
import { AUTH_BYPASS } from "@/config/appConfig";
import { FullPageLoader } from "@/components/common/FullPageLoader";
import type { RoleSlug } from "@/types/auth";

interface ProtectedRouteProps {
  /** The portal this branch of the app belongs to. */
  role: RoleSlug;
}

/**
 * Guards a portal. Three outcomes:
 *  - not signed in            -> that portal's login page
 *  - signed in as another role -> that role's own home, never this one
 *  - signed in as this role    -> render the section
 */
export function ProtectedRoute({ role }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, role: currentRole } = useAuth();
  const location = useLocation();
  const portal = getPortal(role);

  // Development bypass: render the section without asking for a session.
  if (AUTH_BYPASS) {
    return <Outlet />;
  }

  if (isLoading) {
    return <FullPageLoader label="Checking your session" />;
  }

  if (!isAuthenticated) {
    return <Navigate to={portal.loginPath} state={{ from: location }} replace />;
  }

  if (currentRole !== role) {
    return <Navigate to={getPortal(currentRole!).homePath} replace />;
  }

  return <Outlet />;
}
