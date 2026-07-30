import { createAuthController } from './auth.controller';
import { ROLES } from '../../config/roles';

/** Auth endpoints for the Driver portal. Bound to the `drivers` table only. */
export const driverAuthController = createAuthController(ROLES.driver);
