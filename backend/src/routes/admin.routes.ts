import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { abnController } from '../controllers/abn.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { abnLookupLimiter } from '../middleware/rateLimiter.middleware';
import { validateBody, validateParams } from '../middleware/validate.middleware';
import { upload } from '../middleware/upload.middleware';
import {
  createCustomerSchema,
  createDriverSchema,
  createVendorSchema,
  reviewCustomerSchema,
  reviewDriverSchema,
  reviewSectionSchema,
  reviewVendorSchema,
  sectionParamSchema,
  setPasswordSchema,
  updateAdminSchema,
  updateCustomerSchema,
  updateDriverSchema,
  updateVendorSchema,
  vendorSectionParamSchema,
} from '../validators/admin.validator';
// An admin writing a driver's onboarding record is writing the same shapes the
// driver portal writes, so it is validated by the same schemas. Two copies of
// these rules would drift, and the looser copy would be the one that let bad
// data in.
import {
  addressSectionSchema,
  drugTestSectionSchema,
  issueExpirySchema,
  licenceSectionSchema,
  medicareSectionSchema,
  passportSectionSchema,
  personalSectionSchema,
  updateDocumentSchema,
  uploadDocumentSchema,
  visaSectionSchema,
} from '../validators/driver.validator';
// Same argument for the vendor sections. Aliased because the driver file
// exports two schemas by the same names for its own document routes.
import {
  accreditationSectionSchema,
  bankSectionSchema,
  companySectionSchema,
  contactsSectionSchema,
  addressesSectionSchema,
  coverageSectionSchema,
  directorsSectionSchema,
  insurancesSectionSchema,
  warehousesSectionSchema,
  yardsSectionSchema,
  updateDocumentSchema as updateVendorDocumentSchema,
  uploadDocumentSchema as uploadVendorDocumentSchema,
} from '../validators/vendor.validator';
import {
  createEmployeeSchema,
  setPasswordSchema as setSimplePasswordSchema,
  updateEmployeeSchema,
} from '../validators/simpleAccount.validator';
// And the customer sections. Aliased because several files here export schemas
// under the same names for their own document and section routes.
import {
  addressesSectionSchema as customerAddressesSectionSchema,
  billingSectionSchema as customerBillingSectionSchema,
  companySectionSchema as customerCompanySectionSchema,
  contactsSectionSchema as customerContactsSectionSchema,
  directorsSectionSchema as customerDirectorsSectionSchema,
  updateDocumentSchema as updateCustomerDocumentSchema,
  uploadDocumentSchema as uploadCustomerDocumentSchema,
} from '../validators/customer.validator';
import { bookingController } from '../controllers/booking.controller';
import { createBookingSchema } from '../validators/booking.validator';
import { permanentDataController } from '../controllers/permanentData.controller';
import {
  permanentCustomerSchema,
  permanentCustomerUpdateSchema,
  permanentVendorSchema,
  permanentVendorUpdateSchema,
} from '../validators/permanentData.validator';

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

// The account password, replaceable by an admin when a driver is locked out.
router.put('/drivers/:id/password', validateBody(setPasswordSchema), adminController.setDriverPassword);

// A driver's onboarding record, section by section. Same split as the driver's
// own routes in driver.routes.ts, so a fix an admin makes and a fix the driver
// makes go through identical validation and identical writes.
router.put(
  '/drivers/:id/onboarding/personal',
  validateBody(personalSectionSchema),
  adminController.updateDriverPersonal,
);
router.put(
  '/drivers/:id/onboarding/address',
  validateBody(addressSectionSchema),
  adminController.updateDriverAddresses,
);
router.put(
  '/drivers/:id/onboarding/licence',
  validateBody(licenceSectionSchema),
  adminController.updateDriverLicence,
);
router.put(
  '/drivers/:id/onboarding/driving-history',
  validateBody(issueExpirySchema),
  adminController.updateDriverDrivingHistory,
);
router.put(
  '/drivers/:id/onboarding/police-verification',
  validateBody(issueExpirySchema),
  adminController.updateDriverPoliceVerification,
);
router.put(
  '/drivers/:id/onboarding/visa',
  validateBody(visaSectionSchema),
  adminController.updateDriverVisa,
);
router.put(
  '/drivers/:id/onboarding/passport',
  validateBody(passportSectionSchema),
  adminController.updateDriverPassport,
);
router.put(
  '/drivers/:id/onboarding/medicare',
  validateBody(medicareSectionSchema),
  adminController.updateDriverMedicare,
);
router.put(
  '/drivers/:id/onboarding/medical',
  validateBody(issueExpirySchema),
  adminController.updateDriverMedical,
);
router.put(
  '/drivers/:id/onboarding/drug-test',
  validateBody(drugTestSectionSchema),
  adminController.updateDriverDrugTest,
);

// A driver's files. `/url` hands back a short lived blob storage link and
// `/file` streams it through the API; the rest let an admin add, correct and
// remove files on the driver's behalf.
router.post(
  '/drivers/:id/documents',
  upload.single('file'),
  validateBody(uploadDocumentSchema),
  adminController.uploadDriverDocument,
);
router.get('/drivers/:id/documents/:documentId/url', adminController.driverDocumentLink);
router.get('/drivers/:id/documents/:documentId/file', adminController.downloadDriverDocument);
router.patch(
  '/drivers/:id/documents/:documentId',
  validateBody(updateDocumentSchema),
  adminController.updateDriverDocument,
);
router.delete('/drivers/:id/documents/:documentId', adminController.deleteDriverDocument);

// Vendors: the same shape as drivers, backed by the vendor tables.
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

// The account password, replaceable by an admin when a vendor is locked out.
router.put('/vendors/:id/password', validateBody(setPasswordSchema), adminController.setVendorPassword);

// The same Business Register lookup the vendor's own form uses, because an
// admin filling that form in on their behalf needs it just as much.
router.get('/abn-lookup', abnLookupLimiter, abnController.lookup);

// A vendor's onboarding record, section by section. Same split as the
// vendor's own routes in vendor.routes.ts.
router.put(
  '/vendors/:id/onboarding/company',
  validateBody(companySectionSchema),
  adminController.updateVendorCompany,
);
router.put(
  '/vendors/:id/onboarding/contacts',
  validateBody(contactsSectionSchema),
  adminController.updateVendorContacts,
);
router.put(
  '/vendors/:id/onboarding/directors',
  validateBody(directorsSectionSchema),
  adminController.updateVendorDirectors,
);
router.put(
  '/vendors/:id/onboarding/addresses',
  validateBody(addressesSectionSchema),
  adminController.updateVendorAddresses,
);
router.put(
  '/vendors/:id/onboarding/warehouses',
  validateBody(warehousesSectionSchema),
  adminController.updateVendorWarehouses,
);
router.put(
  '/vendors/:id/onboarding/yards',
  validateBody(yardsSectionSchema),
  adminController.updateVendorYards,
);
router.put(
  '/vendors/:id/onboarding/bank',
  validateBody(bankSectionSchema),
  adminController.updateVendorBank,
);
router.put(
  '/vendors/:id/onboarding/coverage',
  validateBody(coverageSectionSchema),
  adminController.updateVendorCoverage,
);
router.put(
  '/vendors/:id/onboarding/accreditation',
  validateBody(accreditationSectionSchema),
  adminController.updateVendorAccreditation,
);
router.put(
  '/vendors/:id/onboarding/insurances',
  validateBody(insurancesSectionSchema),
  adminController.updateVendorInsurances,
);

// A vendor's files, same shape as the driver's.
router.post(
  '/vendors/:id/documents',
  upload.single('file'),
  validateBody(uploadVendorDocumentSchema),
  adminController.uploadVendorDocument,
);
router.get('/vendors/:id/documents/:documentId/url', adminController.vendorDocumentLink);
router.get('/vendors/:id/documents/:documentId/file', adminController.downloadVendorDocument);
router.patch(
  '/vendors/:id/documents/:documentId',
  validateBody(updateVendorDocumentSchema),
  adminController.updateVendorDocument,
);
router.delete('/vendors/:id/documents/:documentId', adminController.deleteVendorDocument);

// Bookings raised from the Admin portal. On their own tables, so nothing here
// touches the driver, vendor or account records.
router.get('/bookings', bookingController.list);
// The job number an open form is holding. Above `/bookings/:id` on purpose:
// "job-number" would otherwise be read as a booking id.
router.post('/bookings/job-number', bookingController.reserveJobNumber);
router.delete('/bookings/job-number/:jobNumber', bookingController.releaseJobNumber);
router.post('/bookings', validateBody(createBookingSchema), bookingController.create);
router.get('/bookings/:id', bookingController.get);

// Permanent Data: the pickups and the vendor prices kept on file, so a booking
// is picked from rather than typed out. Read by the Create Booking form as well
// as by the page that maintains them.
router.get('/permanent/customers', permanentDataController.listCustomers);
router.post(
  '/permanent/customers',
  validateBody(permanentCustomerSchema),
  permanentDataController.createCustomer,
);
router.put(
  '/permanent/customers/:id',
  validateBody(permanentCustomerUpdateSchema),
  permanentDataController.updateCustomer,
);
router.delete('/permanent/customers/:id', permanentDataController.deleteCustomer);

router.get('/permanent/vendors', permanentDataController.listVendors);
router.post(
  '/permanent/vendors',
  validateBody(permanentVendorSchema),
  permanentDataController.createVendor,
);
router.put(
  '/permanent/vendors/:id',
  validateBody(permanentVendorUpdateSchema),
  permanentDataController.updateVendor,
);
router.delete('/permanent/vendors/:id', permanentDataController.deleteVendor);

// Customers: the same shape as vendors, backed by the customer tables.
router.get('/customers', adminController.listCustomers);
router.post('/customers', validateBody(createCustomerSchema), adminController.createCustomer);
router.get('/customers/:id', adminController.getCustomer);
router.put('/customers/:id', validateBody(updateCustomerSchema), adminController.updateCustomer);
router.delete('/customers/:id', adminController.deleteCustomer);

router.post(
  '/customers/:id/review',
  validateBody(reviewCustomerSchema),
  adminController.reviewCustomer,
);

// The account password, replaceable by an admin when a customer is locked out.
router.put(
  '/customers/:id/password',
  validateBody(setPasswordSchema),
  adminController.setCustomerPassword,
);

// A customer's onboarding record, section by section. Same split as the
// customer's own routes in customer.routes.ts, so a fix an admin makes and a
// fix the customer makes go through identical validation and identical writes.
router.put(
  '/customers/:id/onboarding/company',
  validateBody(customerCompanySectionSchema),
  adminController.updateCustomerCompany,
);
router.put(
  '/customers/:id/onboarding/contacts',
  validateBody(customerContactsSectionSchema),
  adminController.updateCustomerContacts,
);
router.put(
  '/customers/:id/onboarding/directors',
  validateBody(customerDirectorsSectionSchema),
  adminController.updateCustomerDirectors,
);
router.put(
  '/customers/:id/onboarding/addresses',
  validateBody(customerAddressesSectionSchema),
  adminController.updateCustomerAddresses,
);
router.put(
  '/customers/:id/onboarding/billing',
  validateBody(customerBillingSectionSchema),
  adminController.updateCustomerBilling,
);

// A customer's files, same shape as the vendor's.
router.post(
  '/customers/:id/documents',
  upload.single('file'),
  validateBody(uploadCustomerDocumentSchema),
  adminController.uploadCustomerDocument,
);
router.get('/customers/:id/documents/:documentId/url', adminController.customerDocumentLink);
router.get('/customers/:id/documents/:documentId/file', adminController.downloadCustomerDocument);
router.patch(
  '/customers/:id/documents/:documentId',
  validateBody(updateCustomerDocumentSchema),
  adminController.updateCustomerDocument,
);
router.delete('/customers/:id/documents/:documentId', adminController.deleteCustomerDocument);

// Employees. No onboarding record behind one, so the whole of it is the account
// itself and these six routes are all there is.
for (const entry of [
  { path: 'employees', kind: 'employee' as const, create: createEmployeeSchema, update: updateEmployeeSchema },
]) {
  router.get(`/${entry.path}`, adminController.listSimple(entry.kind));
  router.post(`/${entry.path}`, validateBody(entry.create), adminController.createSimple(entry.kind));
  router.get(`/${entry.path}/:id`, adminController.getSimple(entry.kind));
  router.put(`/${entry.path}/:id`, validateBody(entry.update), adminController.updateSimple(entry.kind));
  router.delete(`/${entry.path}/:id`, adminController.deleteSimple(entry.kind));
  router.put(
    `/${entry.path}/:id/password`,
    validateBody(setSimplePasswordSchema),
    adminController.setSimplePassword(entry.kind),
  );
}

export default router;
