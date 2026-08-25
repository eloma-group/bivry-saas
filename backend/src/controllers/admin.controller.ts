import { asyncHandler } from '../utils/asyncHandler';
import { sendCreated, sendSuccess } from '../utils/apiResponse';
import { ApiError } from '../utils/apiError';
import * as adminService from '../services/admin.service';
import { getAllExpiryNotifications } from '../services/notification.service';
import { driverListQuerySchema, vendorListQuerySchema } from '../validators/admin.validator';
import * as simpleAccounts from '../services/simpleAccount.service';
import type { KindSlug } from '../services/simpleAccount.service';
import { listQuerySchema } from '../validators/simpleAccount.validator';
import type { ReviewableSection, ReviewableVendorSection } from '../services/admin.service';
import type { DriverDocumentType, VendorDocumentType } from '@prisma/client';

/** The signed in admin's id. `authenticate` guarantees it is present. */
function adminId(req: { auth?: { id: string } }): string {
  return req.auth!.id;
}

export const adminController = {
  dashboard: asyncHandler(async (_req, res) => {
    const data = await adminService.getDashboard();
    sendSuccess(res, data, 'Dashboard loaded');
  }),

  /** Expiring and expired documents across every driver and supplier. */
  notifications: asyncHandler(async (_req, res) => {
    const data = await getAllExpiryNotifications();
    sendSuccess(res, data, 'Notifications loaded');
  }),

  // -------------------------------------------------------------------------
  // Drivers
  // -------------------------------------------------------------------------

  listDrivers: asyncHandler(async (req, res) => {
    // Query strings are validated here rather than in middleware so the parsed
    // defaults (page, sort) are what the service sees.
    const query = driverListQuerySchema.parse(req.query);
    const data = await adminService.listDrivers({
      search: query.search ?? undefined,
      onboardingStatus: query.onboardingStatus,
      page: query.page,
      pageSize: query.pageSize,
      sortBy: query.sortBy,
      sortDir: query.sortDir,
    });
    sendSuccess(res, data, 'Drivers loaded');
  }),

  getDriver: asyncHandler(async (req, res) => {
    const data = await adminService.getDriver(req.params.id);
    sendSuccess(res, data, 'Driver loaded');
  }),

  createDriver: asyncHandler(async (req, res) => {
    const data = await adminService.createDriver(req.body);
    sendCreated(res, data, 'Driver created');
  }),

  updateDriver: asyncHandler(async (req, res) => {
    const data = await adminService.updateDriver(req.params.id, req.body);
    sendSuccess(res, data, 'Driver updated');
  }),

  deleteDriver: asyncHandler(async (req, res) => {
    const data = await adminService.deleteDriver(req.params.id);
    sendSuccess(res, data, 'Driver removed');
  }),

  reviewDriver: asyncHandler(async (req, res) => {
    const data = await adminService.reviewDriver(req.params.id, req.body, adminId(req));
    sendSuccess(res, data, 'Application reviewed');
  }),

  reviewSection: asyncHandler(async (req, res) => {
    const data = await adminService.reviewSection(
      req.params.id,
      req.params.section as ReviewableSection,
      req.body,
      adminId(req),
    );
    sendSuccess(res, data, 'Section reviewed');
  }),

  setDriverPassword: asyncHandler(async (req, res) => {
    const { password } = req.body as { password: string };
    const data = await adminService.setDriverPassword(req.params.id, password);
    sendSuccess(res, data, 'Password changed. Every existing session was signed out.');
  }),

  // -------------------------------------------------------------------------
  // A driver's onboarding record, written by an admin
  //
  // One route per section, the same split the driver portal uses, so each one
  // is validated by the schema that already describes that section rather than
  // by a looser catch all.
  // -------------------------------------------------------------------------

  updateDriverPersonal: asyncHandler(async (req, res) => {
    const data = await adminService.updateDriverPersonal(req.params.id, req.body);
    sendSuccess(res, data, 'Personal details saved');
  }),

  updateDriverAddresses: asyncHandler(async (req, res) => {
    const data = await adminService.updateDriverAddresses(req.params.id, req.body);
    sendSuccess(res, data, 'Address saved');
  }),

  updateDriverLicence: asyncHandler(async (req, res) => {
    const data = await adminService.updateDriverSection(req.params.id, 'licence', req.body);
    sendSuccess(res, data, 'Licence saved');
  }),

  updateDriverDrivingHistory: asyncHandler(async (req, res) => {
    const data = await adminService.updateDriverSection(req.params.id, 'drivingHistory', req.body);
    sendSuccess(res, data, 'Driving history saved');
  }),

  updateDriverPoliceVerification: asyncHandler(async (req, res) => {
    const data = await adminService.updateDriverSection(
      req.params.id,
      'policeVerification',
      req.body,
    );
    sendSuccess(res, data, 'Police verification saved');
  }),

  updateDriverVisa: asyncHandler(async (req, res) => {
    const data = await adminService.updateDriverSection(req.params.id, 'visa', req.body);
    sendSuccess(res, data, 'Visa details saved');
  }),

  updateDriverPassport: asyncHandler(async (req, res) => {
    const data = await adminService.updateDriverSection(req.params.id, 'passport', req.body);
    sendSuccess(res, data, 'Passport details saved');
  }),

  updateDriverMedicare: asyncHandler(async (req, res) => {
    const data = await adminService.updateDriverSection(req.params.id, 'medicare', req.body);
    sendSuccess(res, data, 'Medicare details saved');
  }),

  updateDriverMedical: asyncHandler(async (req, res) => {
    const data = await adminService.updateDriverSection(req.params.id, 'medical', req.body);
    sendSuccess(res, data, 'Medical details saved');
  }),

  updateDriverDrugTest: asyncHandler(async (req, res) => {
    const data = await adminService.updateDriverSection(req.params.id, 'drugTest', req.body);
    sendSuccess(res, data, 'Drug test saved');
  }),

  uploadDriverDocument: asyncHandler(async (req, res) => {
    if (!req.file) throw ApiError.badRequest('No file was uploaded');

    const { docType, category, expiryDate } = req.body as {
      docType: DriverDocumentType;
      category: string | null;
      expiryDate: Date | null;
    };

    const document = await adminService.addDriverDocument(req.params.id, {
      docType,
      category: category ?? null,
      expiryDate: expiryDate ?? null,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      sizeInBytes: req.file.size,
      buffer: req.file.buffer,
    });

    sendCreated(res, document, 'File uploaded');
  }),

  updateDriverDocument: asyncHandler(async (req, res) => {
    const { category, expiryDate } = req.body as {
      category: string | null;
      expiryDate: Date | null;
    };
    const data = await adminService.updateDriverDocument(req.params.id, req.params.documentId, {
      category: category ?? null,
      expiryDate: expiryDate ?? null,
    });
    sendSuccess(res, data, 'File details saved');
  }),

  deleteDriverDocument: asyncHandler(async (req, res) => {
    const data = await adminService.deleteDriverDocument(req.params.id, req.params.documentId);
    sendSuccess(res, data, 'File removed');
  }),

  driverDocumentLink: asyncHandler(async (req, res) => {
    const data = await adminService.createDriverDocumentLink(req.params.id, req.params.documentId);
    sendSuccess(res, data, 'Document link created');
  }),

  downloadDriverDocument: asyncHandler(async (req, res) => {
    const { document, file } = await adminService.openDriverDocument(
      req.params.id,
      req.params.documentId,
    );

    res.type(file.contentType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${document.fileName.replace(/"/g, '')}"`,
    );
    if (file.contentLength !== null) {
      res.setHeader('Content-Length', String(file.contentLength));
    }

    file.stream.on('error', (error) => {
      // Headers are already sent, so the only option left is to drop the
      // connection and let the client retry.
      res.destroy(error);
    });
    file.stream.pipe(res);
  }),

  // -------------------------------------------------------------------------
  // Customers and employees
  //
  // Both are plain accounts with no onboarding record behind them, so one pair
  // of handlers serves both and the kind comes from the route.
  // -------------------------------------------------------------------------

  listSimple: (kind: KindSlug) =>
    asyncHandler(async (req, res) => {
      const query = listQuerySchema.parse(req.query);
      const data = await simpleAccounts.list(kind, {
        search: query.search ?? undefined,
        status: query.status,
        page: query.page,
        pageSize: query.pageSize,
        sortBy: query.sortBy,
        sortDir: query.sortDir,
      });
      sendSuccess(res, data, 'Loaded');
    }),

  getSimple: (kind: KindSlug) =>
    asyncHandler(async (req, res) => {
      const data = await simpleAccounts.get(kind, req.params.id);
      sendSuccess(res, data, 'Loaded');
    }),

  createSimple: (kind: KindSlug) =>
    asyncHandler(async (req, res) => {
      const data = await simpleAccounts.create(kind, req.body);
      sendCreated(res, data, 'Account created');
    }),

  updateSimple: (kind: KindSlug) =>
    asyncHandler(async (req, res) => {
      const data = await simpleAccounts.update(kind, req.params.id, req.body);
      sendSuccess(res, data, 'Account saved');
    }),

  deleteSimple: (kind: KindSlug) =>
    asyncHandler(async (req, res) => {
      const data = await simpleAccounts.remove(kind, req.params.id);
      sendSuccess(res, data, 'Account removed');
    }),

  setSimplePassword: (kind: KindSlug) =>
    asyncHandler(async (req, res) => {
      const { password } = req.body as { password: string };
      const data = await simpleAccounts.setPassword(kind, req.params.id, password);
      sendSuccess(res, data, 'Password changed. Every existing session was signed out.');
    }),

  // -------------------------------------------------------------------------
  // Suppliers (vendors)
  // -------------------------------------------------------------------------

  listVendors: asyncHandler(async (req, res) => {
    const query = vendorListQuerySchema.parse(req.query);
    const data = await adminService.listVendors({
      search: query.search ?? undefined,
      onboardingStatus: query.onboardingStatus,
      page: query.page,
      pageSize: query.pageSize,
      sortBy: query.sortBy,
      sortDir: query.sortDir,
    });
    sendSuccess(res, data, 'Suppliers loaded');
  }),

  getVendor: asyncHandler(async (req, res) => {
    const data = await adminService.getVendor(req.params.id);
    sendSuccess(res, data, 'Supplier loaded');
  }),

  createVendor: asyncHandler(async (req, res) => {
    const data = await adminService.createVendor(req.body);
    sendCreated(res, data, 'Supplier created');
  }),

  updateVendor: asyncHandler(async (req, res) => {
    const data = await adminService.updateVendor(req.params.id, req.body);
    sendSuccess(res, data, 'Supplier updated');
  }),

  deleteVendor: asyncHandler(async (req, res) => {
    const data = await adminService.deleteVendor(req.params.id);
    sendSuccess(res, data, 'Supplier removed');
  }),

  reviewVendor: asyncHandler(async (req, res) => {
    const data = await adminService.reviewVendor(req.params.id, req.body, adminId(req));
    sendSuccess(res, data, 'Application reviewed');
  }),

  reviewVendorSection: asyncHandler(async (req, res) => {
    const data = await adminService.reviewVendorSection(
      req.params.id,
      req.params.section as ReviewableVendorSection,
      req.body,
      adminId(req),
    );
    sendSuccess(res, data, 'Section reviewed');
  }),

  setVendorPassword: asyncHandler(async (req, res) => {
    const { password } = req.body as { password: string };
    const data = await adminService.setVendorPassword(req.params.id, password);
    sendSuccess(res, data, 'Password changed. Every existing session was signed out.');
  }),

  // -------------------------------------------------------------------------
  // A supplier's onboarding record, written by an admin. One route per section,
  // the same split the supplier portal uses.
  // -------------------------------------------------------------------------

  updateVendorCompany: asyncHandler(async (req, res) => {
    const data = await adminService.updateVendorCompany(req.params.id, req.body);
    sendSuccess(res, data, 'Company details saved');
  }),

  updateVendorContacts: asyncHandler(async (req, res) => {
    const data = await adminService.updateVendorContacts(req.params.id, req.body);
    sendSuccess(res, data, 'Contacts saved');
  }),

  updateVendorDirectors: asyncHandler(async (req, res) => {
    const { directors } = req.body as { directors: Parameters<typeof adminService.updateVendorDirectors>[1] };
    const data = await adminService.updateVendorDirectors(req.params.id, directors);
    sendSuccess(res, data, 'Directors saved');
  }),

  updateVendorAddresses: asyncHandler(async (req, res) => {
    const data = await adminService.updateVendorAddresses(
      req.params.id,
      req.body as Parameters<typeof adminService.updateVendorAddresses>[1],
    );
    sendSuccess(res, data, 'Addresses saved');
  }),

  updateVendorWarehouses: asyncHandler(async (req, res) => {
    const { warehouses } = req.body as { warehouses: Parameters<typeof adminService.updateVendorWarehouses>[1] };
    const data = await adminService.updateVendorWarehouses(req.params.id, warehouses);
    sendSuccess(res, data, 'Warehouses saved');
  }),

  updateVendorYards: asyncHandler(async (req, res) => {
    const { yards } = req.body as { yards: Parameters<typeof adminService.updateVendorYards>[1] };
    const data = await adminService.updateVendorYards(req.params.id, yards);
    sendSuccess(res, data, 'Yards saved');
  }),

  updateVendorBank: asyncHandler(async (req, res) => {
    const data = await adminService.updateVendorBank(req.params.id, req.body);
    sendSuccess(res, data, 'Bank details saved');
  }),

  updateVendorCoverage: asyncHandler(async (req, res) => {
    const data = await adminService.updateVendorCoverage(req.params.id, req.body);
    sendSuccess(res, data, 'Business coverage saved');
  }),

  updateVendorAccreditation: asyncHandler(async (req, res) => {
    const data = await adminService.updateVendorAccreditation(req.params.id, req.body);
    sendSuccess(res, data, 'Accreditation saved');
  }),

  updateVendorInsurances: asyncHandler(async (req, res) => {
    const { insurances } = req.body as { insurances: Parameters<typeof adminService.updateVendorInsurances>[1] };
    const data = await adminService.updateVendorInsurances(req.params.id, insurances);
    sendSuccess(res, data, 'Insurances saved');
  }),

  uploadVendorDocument: asyncHandler(async (req, res) => {
    if (!req.file) throw ApiError.badRequest('No file was uploaded');

    const { docType, category, issueDate, expiryDate } = req.body as {
      docType: VendorDocumentType;
      category: string | null;
      issueDate: Date | null;
      expiryDate: Date | null;
    };

    const document = await adminService.addVendorDocument(req.params.id, {
      docType,
      category: category ?? null,
      issueDate: issueDate ?? null,
      expiryDate: expiryDate ?? null,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      sizeInBytes: req.file.size,
      buffer: req.file.buffer,
    });

    sendCreated(res, document, 'File uploaded');
  }),

  updateVendorDocument: asyncHandler(async (req, res) => {
    const { category, issueDate, expiryDate } = req.body as {
      category: string | null;
      issueDate: Date | null;
      expiryDate: Date | null;
    };
    const data = await adminService.updateVendorDocument(req.params.id, req.params.documentId, {
      category: category ?? null,
      issueDate: issueDate ?? null,
      expiryDate: expiryDate ?? null,
    });
    sendSuccess(res, data, 'File details saved');
  }),

  deleteVendorDocument: asyncHandler(async (req, res) => {
    const data = await adminService.deleteVendorDocument(req.params.id, req.params.documentId);
    sendSuccess(res, data, 'File removed');
  }),

  vendorDocumentLink: asyncHandler(async (req, res) => {
    const data = await adminService.createVendorDocumentLink(req.params.id, req.params.documentId);
    sendSuccess(res, data, 'Document link created');
  }),

  downloadVendorDocument: asyncHandler(async (req, res) => {
    const { document, file } = await adminService.openVendorDocument(
      req.params.id,
      req.params.documentId,
    );

    res.type(file.contentType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${document.fileName.replace(/"/g, '')}"`,
    );
    if (file.contentLength !== null) {
      res.setHeader('Content-Length', String(file.contentLength));
    }

    file.stream.on('error', (error) => {
      // Headers are already sent, so the only option left is to drop the
      // connection and let the client retry.
      res.destroy(error);
    });
    file.stream.pipe(res);
  }),

  // -------------------------------------------------------------------------
  // The admin's own account
  // -------------------------------------------------------------------------

  me: asyncHandler(async (req, res) => {
    const data = await adminService.getAdmin(adminId(req));
    sendSuccess(res, data, 'Profile loaded');
  }),

  updateMe: asyncHandler(async (req, res) => {
    const data = await adminService.updateAdmin(adminId(req), req.body);
    sendSuccess(res, data, 'Profile updated');
  }),

  uploadAvatar: asyncHandler(async (req, res) => {
    if (!req.file) throw ApiError.badRequest('No file was uploaded');
    if (!req.file.mimetype.startsWith('image/')) {
      throw ApiError.badRequest('A profile photo has to be an image');
    }

    const data = await adminService.saveAdminAvatar(adminId(req), {
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      buffer: req.file.buffer,
    });
    sendCreated(res, data, 'Profile photo updated');
  }),

  avatarLink: asyncHandler(async (req, res) => {
    const data = await adminService.createAdminAvatarLink(adminId(req));
    sendSuccess(res, data, 'Photo link created');
  }),

  downloadAvatar: asyncHandler(async (req, res) => {
    const file = await adminService.openAdminAvatar(adminId(req));
    res.type(file.contentType);
    if (file.contentLength !== null) {
      res.setHeader('Content-Length', String(file.contentLength));
    }
    file.stream.on('error', (error) => res.destroy(error));
    file.stream.pipe(res);
  }),
};
