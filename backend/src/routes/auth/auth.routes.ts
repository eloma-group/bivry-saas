import { Router } from 'express';
import { createAuthController } from '../../controllers/auth/auth.controller';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validate.middleware';
import {
  forgotPasswordLimiter,
  loginLimiter,
  refreshLimiter,
  registerLimiter,
  resetPasswordLimiter,
} from '../../middleware/rateLimiter.middleware';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchemas,
  resetPasswordSchema,
} from '../../validators/auth.validator';
import type { RoleDefinition } from '../../types/auth.types';

/**
 * Builds the identical set of auth endpoints for one portal:
 *
 *   POST   /register            create an account (when enabled for the role)
 *   POST   /login               email + password, returns access + refresh
 *   POST   /refresh             rotate the refresh token
 *   POST   /logout              revoke the current session
 *   POST   /logout-all          revoke every session for the account
 *   GET    /me                  the signed in profile
 *   POST   /forgot-password     email a reset link
 *   GET    /verify-reset-token  check a link before showing the reset form
 *   POST   /reset-password      set a new password from a reset link
 *   POST   /change-password     set a new password while signed in
 *
 * `requireRole(role.slug)` on the protected routes means an access token minted
 * by another portal is rejected even if it is otherwise valid.
 */
export function createAuthRouter(role: RoleDefinition): Router {
  const router = Router();
  const controller = createAuthController(role);
  const onlyThisRole = [authenticate, requireRole(role.slug)];

  router.post(
    '/register',
    registerLimiter,
    validateBody(registerSchemas[role.slug]),
    controller.register,
  );
  router.post('/login', loginLimiter, validateBody(loginSchema), controller.login);
  router.post('/refresh', refreshLimiter, validateBody(refreshSchema), controller.refresh);
  router.post('/logout', controller.logout);

  router.post(
    '/forgot-password',
    forgotPasswordLimiter,
    validateBody(forgotPasswordSchema),
    controller.forgotPassword,
  );
  router.get('/verify-reset-token', controller.verifyResetToken);
  router.post(
    '/reset-password',
    resetPasswordLimiter,
    validateBody(resetPasswordSchema),
    controller.resetPassword,
  );

  router.get('/me', ...onlyThisRole, controller.me);
  router.post('/logout-all', ...onlyThisRole, controller.logoutAll);
  router.post(
    '/change-password',
    ...onlyThisRole,
    validateBody(changePasswordSchema),
    controller.changePassword,
  );

  return router;
}
