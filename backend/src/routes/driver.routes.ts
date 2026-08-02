import { Router } from 'express';
import { driverController } from '../controllers/driver.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { upload } from '../middleware/upload.middleware';
import {
  addressSectionSchema,
  drugTestSectionSchema,
  issueExpirySchema,
  licenceSectionSchema,
  onboardingStepSchema,
  personalSectionSchema,
  uploadDocumentSchema,
  visaSectionSchema,
} from '../validators/driver.validator';

const router = Router();

// Everything below belongs to the signed in driver and nobody else.
router.use(authenticate, requireRole('driver'));

router.get('/notifications', driverController.notifications);

router.get('/onboarding', driverController.getOnboarding);
router.post('/onboarding/progress', validateBody(onboardingStepSchema), driverController.saveProgress);
router.post('/onboarding/submit', driverController.submit);

router.put('/onboarding/personal', validateBody(personalSectionSchema), driverController.updatePersonal);
router.put('/onboarding/address', validateBody(addressSectionSchema), driverController.updateAddresses);
router.put('/onboarding/licence', validateBody(licenceSectionSchema), driverController.updateLicence);
router.put(
  '/onboarding/driving-history',
  validateBody(issueExpirySchema),
  driverController.updateDrivingHistory,
);
router.put(
  '/onboarding/police-verification',
  validateBody(issueExpirySchema),
  driverController.updatePoliceVerification,
);
router.put('/onboarding/visa', validateBody(visaSectionSchema), driverController.updateVisa);
router.put('/onboarding/medical', validateBody(issueExpirySchema), driverController.updateMedical);
router.put('/onboarding/drug-test', validateBody(drugTestSectionSchema), driverController.updateDrugTest);

router.get('/documents', driverController.listDocuments);
router.post(
  '/documents',
  upload.single('file'),
  validateBody(uploadDocumentSchema),
  driverController.uploadDocument,
);
// `/url` hands back a short lived SAS link so the browser can load the file
// directly from Azure Blob Storage; `/file` streams it through the API instead.
router.get('/documents/:id/url', driverController.documentLink);
router.get('/documents/:id/file', driverController.downloadDocument);
router.delete('/documents/:id', driverController.deleteDocument);

export default router;
