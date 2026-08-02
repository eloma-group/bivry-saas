import { asyncHandler } from '../utils/asyncHandler';
import { sendCreated, sendSuccess } from '../utils/apiResponse';
import { ApiError } from '../utils/apiError';
import * as adminService from '../services/admin.service';
import { getExpiryNotifications } from '../services/notification.service';
import { driverListQuerySchema } from '../validators/admin.validator';
import type { ReviewableSection } from '../services/admin.service';

/** The signed in admin's id. `authenticate` guarantees it is present. */
function adminId(req: { auth?: { id: string } }): string {
  return req.auth!.id;
}

export const adminController = {
  dashboard: asyncHandler(async (_req, res) => {
    const data = await adminService.getDashboard();
    sendSuccess(res, data, 'Dashboard loaded');
  }),

  /** Expiring and expired documents across every driver on the fleet. */
  notifications: asyncHandler(async (_req, res) => {
    const data = await getExpiryNotifications();
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
