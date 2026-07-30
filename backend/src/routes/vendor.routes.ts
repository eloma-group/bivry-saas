import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { sendSuccess } from '../utils/apiResponse';

const router = Router();

// Every vendor feature route lives here and is closed to other roles.
router.use(authenticate, requireRole('vendor'));

// Placeholder so the Vendor module is wired end to end. Replace with real
// endpoints when the Vendor feature work starts.
router.get('/dashboard', (req, res) => {
  sendSuccess(res, { vendorId: req.auth!.id }, 'Vendor dashboard');
});

export default router;
