import { createAuthController } from './auth.controller';
import { ROLES } from '../../config/roles';

/** Auth endpoints for the Admin portal. Bound to the `admins` table only. */
export const adminAuthController = createAuthController(ROLES.admin);
