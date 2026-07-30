import { createAuthRouter } from './auth.routes';
import { ROLES } from '../../config/roles';

/** Mounted at /api/auth/employee - reads and writes the `employees` table only. */
export const employeeAuthRoutes = createAuthRouter(ROLES.employee);

export default employeeAuthRoutes;
