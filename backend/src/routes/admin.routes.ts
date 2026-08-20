import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { validateBody, validateParams } from '../middleware/validate.middleware';
import { upload } from '../middleware/upload.middleware';
import {
  createDriverSchema,
  createVendorSchema,
  reviewDriverSchema,
  reviewSectionSchema,
  reviewVendorSchema,
  sectionParamSchema,
  updateAdminSchema,
  updateDriverSchema,
  updateVendorSchema,
  vendorSectionParamSchema,
} from '../validators/admin.validator';

const router = Router();

// Every admin feature route lives here and is closed to other roles. An access
// token minted by any other portal cannot satisfy this, whatever it claims.
router.use(authenticate, requireRole('admin'));

router.get('/dashboard', adminController.dashboard);
router.get('/notifications', adminController.notifications);

// The admin's own account. The avatar is the one file an admin uploads, and it
// goes to the admin container, not the drivers' document store.
router.get('/me', adminController.me);
router.put('/me', validateBody(updateAdminSchema), adminController.updateMe);
router.post('/me/avatar', upload.single('file'), adminController.uploadAvatar);
router.get('/me/avatar/url', adminController.avatarLink);
router.get('/me/avatar/file', adminController.downloadAvatar);

// Drivers: full read and write, plus the verification decisions.
router.get('/drivers', adminController.listDrivers);
router.post('/drivers', validateBody(createDriverSchema), adminController.createDriver);
router.get('/drivers/:id', adminController.getDriver);
router.put('/drivers/:id', validateBody(updateDriverSchema), adminController.updateDriver);
router.delete('/drivers/:id', adminController.deleteDriver);

router.post(
  '/drivers/:id/review',
  validateBody(reviewDriverSchema),
  adminController.reviewDriver,
);
router.post(
  '/drivers/:id/sections/:section/review',
  validateParams(sectionParamSchema),
  validateBody(reviewSectionSchema),
  adminController.reviewSection,
);

// A driver's files, read only from here: `/url` hands back a short lived blob
// storage link, `/file` streams it through the API instead.
router.get('/drivers/:id/documents/:documentId/url', adminController.driverDocumentLink);
router.get('/drivers/:id/documents/:documentId/file', adminController.downloadDriverDocument);

// Suppliers: the same shape as drivers, backed by the vendor tables.
router.get('/vendors', adminController.listVendors);
router.post('/vendors', validateBody(createVendorSchema), adminController.createVendor);
router.get('/vendors/:id', adminController.getVendor);
router.put('/vendors/:id', validateBody(updateVendorSchema), adminController.updateVendor);
router.delete('/vendors/:id', adminController.deleteVendor);

router.post('/vendors/:id/review', validateBody(reviewVendorSchema), adminController.reviewVendor);
router.post(
  '/vendors/:id/sections/:section/review',
  validateParams(vendorSectionParamSchema),
  validateBody(reviewSectionSchema),
  adminController.reviewVendorSection,
);

router.get('/vendors/:id/documents/:documentId/url', adminController.vendorDocumentLink);
router.get('/vendors/:id/documents/:documentId/file', adminController.downloadVendorDocument);

export default router;
