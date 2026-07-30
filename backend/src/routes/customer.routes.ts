import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { sendSuccess } from '../utils/apiResponse';

const router = Router();

// Every customer feature route lives here and is closed to other roles.
router.use(authenticate, requireRole('customer'));

// Placeholder so the Customer module is wired end to end. Replace with real
// endpoints when the Customer feature work starts.
router.get('/dashboard', (req, res) => {
  sendSuccess(res, { customerId: req.auth!.id }, 'Customer dashboard');
});

export default router;
