import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { sendSuccess } from '../utils/apiResponse';

const router = Router();

// Every admin feature route lives here and is closed to other roles.
router.use(authenticate, requireRole('admin'));

// Placeholder so the Admin module is wired end to end. Replace with real
// endpoints when the Admin feature work starts.
router.get('/dashboard', (req, res) => {
  sendSuccess(res, { adminId: req.auth!.id }, 'Admin dashboard');
});

export default router;
