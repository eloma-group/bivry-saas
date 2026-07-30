import { createAuthRouter } from './auth.routes';
import { ROLES } from '../../config/roles';

/** Mounted at /api/auth/admin - reads and writes the `admins` table only. */
export const adminAuthRoutes = createAuthRouter(ROLES.admin);

export default adminAuthRoutes;
