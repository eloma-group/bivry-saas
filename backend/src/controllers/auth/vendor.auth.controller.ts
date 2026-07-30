import { createAuthController } from './auth.controller';
import { ROLES } from '../../config/roles';

/** Auth endpoints for the Vendor portal. Bound to the `vendors` table only. */
export const vendorAuthController = createAuthController(ROLES.vendor);
