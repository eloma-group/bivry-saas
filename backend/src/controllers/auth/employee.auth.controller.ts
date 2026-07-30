import { createAuthController } from './auth.controller';
import { ROLES } from '../../config/roles';

/** Auth endpoints for the Employee portal. Bound to the `employees` table only. */
export const employeeAuthController = createAuthController(ROLES.employee);
