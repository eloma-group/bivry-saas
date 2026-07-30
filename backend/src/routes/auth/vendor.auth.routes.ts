import { createAuthRouter } from './auth.routes';
import { ROLES } from '../../config/roles';

/** Mounted at /api/auth/vendor - reads and writes the `vendors` table only. */
export const vendorAuthRoutes = createAuthRouter(ROLES.vendor);

export default vendorAuthRoutes;
