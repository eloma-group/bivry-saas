import { Router } from 'express';
import { vendorController } from '../controllers/vendor.controller';
import { abnController } from '../controllers/abn.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { abnLookupLimiter } from '../middleware/rateLimiter.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { upload } from '../middleware/upload.middleware';
import { sendSuccess } from '../utils/apiResponse';
import {
  accreditationSectionSchema,
  bankSectionSchema,
  companySectionSchema,
  contactsSectionSchema,
  coverageSectionSchema,
  directorsSectionSchema,
  insurancesSectionSchema,
  onboardingStepSchema,
  updateDocumentSchema,
  uploadDocumentSchema,
  warehousesSectionSchema,
} from '../validators/vendor.validator';

const router = Router();

// Everything below belongs to the signed in supplier and nobody else.
router.use(authenticate, requireRole('vendor'));

router.get('/dashboard', (req, res) => {
  sendSuccess(res, { vendorId: req.auth!.id }, 'Vendor dashboard');
});

router.get('/notifications', vendorController.notifications);

// The Business Register, so an ABN on the form fills in the rest of the company.
router.get('/abn-lookup', abnLookupLimiter, abnController.lookup);

router.get('/onboarding', vendorController.getOnboarding);
router.post(
  '/onboarding/progress',
  validateBody(onboardingStepSchema),
  vendorController.saveProgress,
);
router.post('/onboarding/submit', vendorController.submit);

router.put('/onboarding/company', validateBody(companySectionSchema), vendorController.updateCompany);
router.put(
  '/onboarding/contacts',
  validateBody(contactsSectionSchema),
  vendorController.updateContacts,
);
router.put(
  '/onboarding/directors',
  validateBody(directorsSectionSchema),
  vendorController.updateDirectors,
);
router.put('/onboarding/bank', validateBody(bankSectionSchema), vendorController.updateBank);
router.put(
  '/onboarding/coverage',
  validateBody(coverageSectionSchema),
  vendorController.updateCoverage,
);
router.put(
  '/onboarding/warehouses',
  validateBody(warehousesSectionSchema),
  vendorController.updateWarehouses,
);
router.put(
  '/onboarding/accreditation',
  validateBody(accreditationSectionSchema),
  vendorController.updateAccreditation,
);
router.put(
  '/onboarding/insurances',
  validateBody(insurancesSectionSchema),
  vendorController.updateInsurances,
);

router.get('/documents', vendorController.listDocuments);
router.post(
  '/documents',
  upload.single('file'),
  validateBody(uploadDocumentSchema),
  vendorController.uploadDocument,
);
// `/url` hands back a short lived SAS link so the browser can load the file
// directly from Azure Blob Storage; `/file` streams it through the API instead.
router.get('/documents/:id/url', vendorController.documentLink);
router.get('/documents/:id/file', vendorController.downloadDocument);
router.patch('/documents/:id', validateBody(updateDocumentSchema), vendorController.updateDocument);
router.delete('/documents/:id', vendorController.deleteDocument);

export default router;
