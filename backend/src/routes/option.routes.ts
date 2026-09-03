import { Router } from 'express';
import { optionController } from '../controllers/option.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { addOptionSchema } from '../validators/option.validator';

/**
 * Dropdown options, shared by every portal.
 *
 * The same dropdowns appear on the admin's forms and on the driver, vendor and
 * customer onboarding forms, and an option added on one has to be offered on
 * all of them. So this is the one router with no `requireRole`: any signed in
 * account can read the lists and add to one.
 */
const router = Router();

router.use(authenticate);

router.get('/', optionController.list);
router.post('/', validateBody(addOptionSchema), optionController.add);

export default router;
