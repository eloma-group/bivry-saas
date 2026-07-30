import { Router } from 'express';
import adminAuthRoutes from './admin.auth.routes';
import customerAuthRoutes from './customer.auth.routes';
import vendorAuthRoutes from './vendor.auth.routes';
import employeeAuthRoutes from './employee.auth.routes';
import driverAuthRoutes from './driver.auth.routes';

const router = Router();

// One mount point per login portal. The path decides the table, nothing else.
router.use('/admin', adminAuthRoutes);
router.use('/customer', customerAuthRoutes);
router.use('/vendor', vendorAuthRoutes);
router.use('/employee', employeeAuthRoutes);
router.use('/driver', driverAuthRoutes);

export default router;
