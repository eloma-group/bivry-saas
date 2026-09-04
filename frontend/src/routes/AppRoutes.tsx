import { Navigate, Route, Routes } from "react-router-dom";
import { PORTAL_LIST } from "@/config/roles";
import { AUTH_BYPASS } from "@/config/appConfig";
import { ProtectedRoute } from "./ProtectedRoute";
import { PublicOnlyRoute } from "./PublicOnlyRoute";
import { LoginPage } from "@/pages/auth/LoginPage";
import { RegisterPage } from "@/pages/auth/RegisterPage";
import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "@/pages/auth/ResetPasswordPage";
import { ChangePasswordPage } from "@/pages/auth/ChangePasswordPage";
import { PortalPickerPage } from "@/pages/PortalPickerPage";
import { AdminDashboardPage } from "@/pages/admin/AdminDashboardPage";
import { AdminOnboardingPage } from "@/pages/admin/AdminOnboardingPage";
import { AdminCreateBookingPage } from "@/pages/admin/AdminCreateBookingPage";
import { AdminPermanentDataPage } from "@/pages/admin/AdminPermanentDataPage";
import { AdminProfilePage } from "@/pages/admin/AdminProfilePage";
import { PlaceholderDashboardPage } from "@/pages/PlaceholderDashboardPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { DriverOnboardingPage } from "@/pages/DriverOnboardingPage";
import { DriverProfilePage } from "@/pages/DriverProfilePage";
import { VendorOnboardingPage } from "@/pages/VendorOnboardingPage";
import { VendorProfilePage } from "@/pages/VendorProfilePage";
import { CustomerOnboardingPage } from "@/pages/CustomerOnboardingPage";
import { CustomerProfilePage } from "@/pages/CustomerProfilePage";
import { useAuth } from "@/context/AuthContext";

/**
 * Where an onboarding portal lands when it is opened. Somebody still filling
 * the form in goes back to it; once it has been handed in, their profile is the
 * more useful place to be.
 */
function OnboardingHome() {
  const { user } = useAuth();
  const status = typeof user?.onboardingStatus === "string" ? user.onboardingStatus : "";
  const stillFilling = status === "" || status === "NOT_STARTED" || status === "IN_PROGRESS";

  // The profile lives at the account's own id, so there is nowhere to send
  // someone who is not signed in (the development auth bypass).
  if (stillFilling || !user) return <Navigate to="onboarding" replace />;

  return <Navigate to={user.id} replace />;
}

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

      {/* Changing your own password needs a session, so it sits behind the guard
          for its own portal rather than with the public auth pages. */}
      {PORTAL_LIST.map((portal) => (
        <Route
          key={`${portal.slug}-password`}
          path={portal.slug}
          element={<ProtectedRoute role={portal.slug} />}
        >
          <Route path="change-password" element={<ChangePasswordPage role={portal.slug} />} />
        </Route>
      ))}

      {/* Driver portal. */}
      <Route path="/driver" element={<ProtectedRoute role="driver" />}>
        <Route index element={<OnboardingHome />} />
        <Route path="onboarding" element={<DriverOnboardingPage />} />
        {/* The driver's own profile, addressed by their id. Static siblings such
            as `onboarding` rank above this, so they still win. */}
        <Route path=":driverId" element={<DriverProfilePage />} />
      </Route>

      {/* Vendor portal, the same shape as the driver one. */}
      <Route path="/vendor" element={<ProtectedRoute role="vendor" />}>
        <Route index element={<OnboardingHome />} />
        <Route path="onboarding" element={<VendorOnboardingPage />} />
        <Route path=":vendorId" element={<VendorProfilePage />} />
      </Route>

      {/* Admin portal: the dashboard and the onboarding modules it governs. */}
      <Route path="/admin" element={<ProtectedRoute role="admin" />}>
        <Route index element={<AdminDashboardPage />} />
        <Route path="profile" element={<AdminProfilePage />} />
        <Route path="bookings/new" element={<AdminCreateBookingPage />} />
        <Route path="bookings/permanent-data" element={<AdminPermanentDataPage />} />
        <Route path="onboarding" element={<Navigate to="driver" replace />} />
        <Route path="onboarding/:module" element={<AdminOnboardingPage />} />
        <Route path="onboarding/:module/:recordId" element={<AdminOnboardingPage />} />
        <Route path="onboarding/:module/:recordId/:action" element={<AdminOnboardingPage />} />
      </Route>

      {/* Customer portal, the same shape as the driver and vendor ones. */}
      <Route path="/customer" element={<ProtectedRoute role="customer" />}>
        <Route index element={<OnboardingHome />} />
        <Route path="onboarding" element={<CustomerOnboardingPage />} />
        <Route path=":customerId" element={<CustomerProfilePage />} />
      </Route>

      {/* Remaining portals, authenticated and waiting on their feature work. */}
      <Route path="/employee" element={<ProtectedRoute role="employee" />}>
        <Route index element={<PlaceholderDashboardPage role="employee" />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
