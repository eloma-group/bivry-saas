import { createAuthController } from './auth.controller';
import { ROLES } from '../../config/roles';

/** Auth endpoints for the Customer portal. Bound to the `customers` table only. */
export const customerAuthController = createAuthController(ROLES.customer);
