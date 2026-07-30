import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getPortal } from "@/config/roles";
import { FullPageLoader } from "@/components/common/FullPageLoader";

/**
 * Keeps a signed in user away from the login and password pages by sending
 * them to the home of whichever portal they are signed in to.
 */
export function PublicOnlyRoute() {
  const { isAuthenticated, isLoading, role } = useAuth();

  if (isLoading) {
    return <FullPageLoader label="Loading" />;
  }

  if (isAuthenticated && role) {
    return <Navigate to={getPortal(role).homePath} replace />;
  }

  return <Outlet />;
}
