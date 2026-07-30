import { Navigate, Route, Routes } from "react-router-dom";
import { PORTAL_LIST } from "@/config/roles";
import { AUTH_BYPASS } from "@/config/appConfig";
import { ProtectedRoute } from "./ProtectedRoute";
import { PublicOnlyRoute } from "./PublicOnlyRoute";
import { LoginPage } from "@/pages/auth/LoginPage";
import { RegisterPage } from "@/pages/auth/RegisterPage";
import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "@/pages/auth/ResetPasswordPage";
import { PortalPickerPage } from "@/pages/PortalPickerPage";
import { PlaceholderDashboardPage } from "@/pages/PlaceholderDashboardPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { DriverOnboardingPage } from "@/pages/DriverOnboardingPage";

/**
 * Route map.
 *
 * Public per portal:  /:role/login, /:role/register, /:role/forgot-password,
 *                     /:role/reset-password
 * Protected per role: everything under /:role
 *
 * The auth pages are generated from the portal registry so all five portals
 * stay in step. Only the protected section differs per role.
 *
 * While AUTH_BYPASS is on (see config/appConfig.ts) the root path goes straight
 * to the driver form instead of the portal picker.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          AUTH_BYPASS ? <Navigate to="/driver/onboarding" replace /> : <PortalPickerPage />
        }
      />

      {/* The portal picker stays reachable at its own path during the bypass. */}
      <Route path="/portals" element={<PortalPickerPage />} />

      {/* Public auth pages, one set per portal. */}
      <Route element={<PublicOnlyRoute />}>
        {PORTAL_LIST.map((portal) => (
          <Route key={portal.slug} path={portal.slug}>
            <Route path="login" element={<LoginPage role={portal.slug} />} />
            <Route path="forgot-password" element={<ForgotPasswordPage role={portal.slug} />} />
            <Route path="reset-password" element={<ResetPasswordPage role={portal.slug} />} />
            {portal.selfSignup ? (
              <Route path="register" element={<RegisterPage role={portal.slug} />} />
            ) : null}
          </Route>
        ))}
      </Route>

      {/* Driver portal - the module currently in active development. */}
      <Route path="/driver" element={<ProtectedRoute role="driver" />}>
        <Route index element={<Navigate to="onboarding" replace />} />
        <Route path="onboarding" element={<DriverOnboardingPage />} />
      </Route>

      {/* Remaining portals, authenticated and waiting on their feature work. */}
      <Route path="/admin" element={<ProtectedRoute role="admin" />}>
        <Route index element={<PlaceholderDashboardPage role="admin" />} />
      </Route>
      <Route path="/customer" element={<ProtectedRoute role="customer" />}>
        <Route index element={<PlaceholderDashboardPage role="customer" />} />
      </Route>
      <Route path="/vendor" element={<ProtectedRoute role="vendor" />}>
        <Route index element={<PlaceholderDashboardPage role="vendor" />} />
      </Route>
      <Route path="/employee" element={<ProtectedRoute role="employee" />}>
        <Route index element={<PlaceholderDashboardPage role="employee" />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
