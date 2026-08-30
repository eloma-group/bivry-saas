import { Router } from 'express';
import { customerController } from '../controllers/customer.controller';
import { abnController } from '../controllers/abn.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { abnLookupLimiter } from '../middleware/rateLimiter.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { upload } from '../middleware/upload.middleware';
import { sendSuccess } from '../utils/apiResponse';
import {
  addressesSectionSchema,
  billingSectionSchema,
  companySectionSchema,
  contactsSectionSchema,
  directorsSectionSchema,
  onboardingStepSchema,
  updateDocumentSchema,
  uploadDocumentSchema,
} from '../validators/customer.validator';

const router = Router();

// Everything below belongs to the signed in customer and nobody else.
router.use(authenticate, requireRole('customer'));

router.get('/dashboard', (req, res) => {
  sendSuccess(res, { customerId: req.auth!.id }, 'Customer dashboard');
});

// The Business Register, so an ABN on the form fills in the rest of the company.
router.get('/abn-lookup', abnLookupLimiter, abnController.lookup);

router.get('/onboarding', customerController.getOnboarding);
router.post(
  '/onboarding/progress',
  validateBody(onboardingStepSchema),
  customerController.saveProgress,
);
router.post('/onboarding/submit', customerController.submit);

router.put(
  '/onboarding/company',
  validateBody(companySectionSchema),
  customerController.updateCompany,
);
router.put(
  '/onboarding/contacts',
  validateBody(contactsSectionSchema),
  customerController.updateContacts,
);
router.put(
  '/onboarding/directors',
  validateBody(directorsSectionSchema),
  customerController.updateDirectors,
);
router.put(
  '/onboarding/addresses',
  validateBody(addressesSectionSchema),
  customerController.updateAddresses,
);
router.put(
  '/onboarding/billing',
  validateBody(billingSectionSchema),
  customerController.updateBilling,
);

router.get('/documents', customerController.listDocuments);
router.post(
  '/documents',
  upload.single('file'),
  validateBody(uploadDocumentSchema),
  customerController.uploadDocument,
);
// `/url` hands back a short lived SAS link so the browser can load the file
// directly from Azure Blob Storage; `/file` streams it through the API instead.
router.get('/documents/:id/url', customerController.documentLink);
router.get('/documents/:id/file', customerController.downloadDocument);
router.patch(
  '/documents/:id',
  validateBody(updateDocumentSchema),
  customerController.updateDocument,
);
router.delete('/documents/:id', customerController.deleteDocument);

export default router;
