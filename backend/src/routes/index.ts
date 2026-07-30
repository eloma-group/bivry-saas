import { Router } from 'express';
import authRoutes from './auth';
import adminRoutes from './admin.routes';
import customerRoutes from './customer.routes';
import vendorRoutes from './vendor.routes';
import employeeRoutes from './employee.routes';
import driverRoutes from './driver.routes';
import { prisma } from '../config/prisma';
import { buildInfo } from '../config/buildInfo';
import { mailStatus } from '../services/mail.service';
import { sendSuccess } from '../utils/apiResponse';

const router = Router();

router.get('/health', async (_req, res) => {
  let database = 'unknown';
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = 'connected';
  } catch {
    database = 'disconnected';
  }

  sendSuccess(
    res,
    {
      status: 'ok',
      database,
      // The deploy workflow asserts this matches the commit it just built, so a
      // deploy that never actually swapped the running app fails instead of
      // going green against the previous build.
      commit: buildInfo.commit,
      builtAt: buildInfo.builtAt,
      // Password reset delivery fails silently by design: the endpoint must not
      // reveal whether an address has an account, so it reports success even
      // when the send was refused. Without this, telling "SMTP is misconfigured"
      // apart from "the sender is not verified" needs a shell on the server.
      mail: mailStatus(),
      timestamp: new Date().toISOString(),
    },
    'API is running',
  );
});

// Authentication, one isolated portal per role.
router.use('/auth', authRoutes);

// Feature modules, each locked to its own role.
router.use('/admin', adminRoutes);
router.use('/customer', customerRoutes);
router.use('/vendor', vendorRoutes);
router.use('/employee', employeeRoutes);
router.use('/driver', driverRoutes);

export default router;
