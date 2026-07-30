import { createAuthRouter } from './auth.routes';
import { ROLES } from '../../config/roles';

/** Mounted at /api/auth/driver - reads and writes the `drivers` table only. */
export const driverAuthRoutes = createAuthRouter(ROLES.driver);

export default driverAuthRoutes;
