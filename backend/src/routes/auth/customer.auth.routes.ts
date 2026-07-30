import { createAuthRouter } from './auth.routes';
import { ROLES } from '../../config/roles';

/** Mounted at /api/auth/customer - reads and writes the `customers` table only. */
export const customerAuthRoutes = createAuthRouter(ROLES.customer);

export default customerAuthRoutes;
