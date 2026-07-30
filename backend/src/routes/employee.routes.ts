import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { sendSuccess } from '../utils/apiResponse';

const router = Router();

// Every employee feature route lives here and is closed to other roles.
router.use(authenticate, requireRole('employee'));

// Placeholder so the Employee module is wired end to end. Replace with real
// endpoints when the Employee feature work starts.
router.get('/dashboard', (req, res) => {
  sendSuccess(res, { employeeId: req.auth!.id }, 'Employee dashboard');
});

export default router;
