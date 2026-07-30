/**
 * DEVELOPMENT SWITCH - AUTH BYPASS
 * ---------------------------------------------------------------------------
 * While the driver onboarding form is being built, the login system is skipped
 * so `npm run dev` lands straight on the driver form and nothing has to be
 * signed in to test.
 *
 * When `AUTH_BYPASS` is true:
 *   - `/` redirects to `/driver/onboarding` instead of the portal picker
 *   - every ProtectedRoute lets the request through without a session
 *
 * The login, register, forgot password and reset password pages all still work
 * and can be opened directly by URL, so nothing is lost while this is on.
 *
 * TO TURN THE LOGIN SYSTEM BACK ON: set this to `false`. That is the only
 * change needed, nothing else is commented out anywhere in the codebase.
 */
export const AUTH_BYPASS = false;
