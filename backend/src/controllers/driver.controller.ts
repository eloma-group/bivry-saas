import { asyncHandler } from '../utils/asyncHandler';
import { sendCreated, sendSuccess } from '../utils/apiResponse';
import { ApiError } from '../utils/apiError';
import * as driverService from '../services/driver.service';
import { getExpiryNotifications } from '../services/notification.service';
import type { DriverDocumentType } from '@prisma/client';

/** The signed in driver's id. `authenticate` guarantees it is present. */
function driverId(req: { auth?: { id: string } }): string {
  return req.auth!.id;
}

export const driverController = {
  getOnboarding: asyncHandler(async (req, res) => {
    const data = await driverService.getOnboarding(driverId(req));
    sendSuccess(res, data, 'Onboarding loaded');
  }),

  /** This driver's own documents that have expired or are about to. */
  notifications: asyncHandler(async (req, res) => {
    const data = await getExpiryNotifications(driverId(req));
    sendSuccess(res, data, 'Notifications loaded');
  }),

  updatePersonal: asyncHandler(async (req, res) => {
    const data = await driverService.updatePersonal(driverId(req), req.body);
    sendSuccess(res, data, 'Personal details saved');
  }),

  updateAddresses: asyncHandler(async (req, res) => {
    const data = await driverService.updateAddresses(driverId(req), req.body);
    sendSuccess(res, data, 'Address saved');
  }),

  updateLicence: asyncHandler(async (req, res) => {
    const data = await driverService.upsertSection(driverId(req), 'licence', req.body);
    sendSuccess(res, data, 'Licence saved');
  }),

  updateDrivingHistory: asyncHandler(async (req, res) => {
    const data = await driverService.upsertSection(driverId(req), 'drivingHistory', req.body);
    sendSuccess(res, data, 'Driving history saved');
  }),

  updatePoliceVerification: asyncHandler(async (req, res) => {
    const data = await driverService.upsertSection(driverId(req), 'policeVerification', req.body);
    sendSuccess(res, data, 'Police verification saved');
  }),

  updateVisa: asyncHandler(async (req, res) => {
    const data = await driverService.upsertSection(driverId(req), 'visa', req.body);
    sendSuccess(res, data, 'Visa details saved');
  }),

  updateMedical: asyncHandler(async (req, res) => {
    const data = await driverService.upsertSection(driverId(req), 'medical', req.body);
    sendSuccess(res, data, 'Medical details saved');
  }),

  updateDrugTest: asyncHandler(async (req, res) => {
    const data = await driverService.upsertSection(driverId(req), 'drugTest', req.body);
    sendSuccess(res, data, 'Drug test saved');
  }),

  saveProgress: asyncHandler(async (req, res) => {
    const { step } = req.body as { step: number };
    const data = await driverService.saveProgress(driverId(req), step);
    sendSuccess(res, data, 'Progress saved');
  }),

  submit: asyncHandler(async (req, res) => {
    const data = await driverService.submitOnboarding(driverId(req));
    sendSuccess(res, data, 'Application submitted for review');
  }),

  listDocuments: asyncHandler(async (req, res) => {
    const docType = req.query.docType as DriverDocumentType | undefined;
    const data = await driverService.listDocuments(driverId(req), docType);
    sendSuccess(res, data, 'Documents loaded');
  }),

  uploadDocument: asyncHandler(async (req, res) => {
    if (!req.file) throw ApiError.badRequest('No file was uploaded');

    const { docType, category } = req.body as {
      docType: DriverDocumentType;
      category: string | null;
    };

    const document = await driverService.addDocument(driverId(req), {
      docType,
      category: category ?? null,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      sizeInBytes: req.file.size,
      // multer.memoryStorage keeps the bytes on the request, storage.service
      // decides whether they land in Azure Blob Storage or on local disk.
      buffer: req.file.buffer,
    });

    sendCreated(res, document, 'File uploaded');
  }),

  /** Short lived direct link, safe to use in an img or anchor tag. */
  documentLink: asyncHandler(async (req, res) => {
    const data = await driverService.createDocumentLink(driverId(req), req.params.id);
    sendSuccess(res, data, 'Document link created');
  }),

  downloadDocument: asyncHandler(async (req, res) => {
    const { document, file } = await driverService.openDocument(driverId(req), req.params.id);

    res.type(file.contentType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${document.fileName.replace(/"/g, '')}"`,
    );
    if (file.contentLength !== null) {
      res.setHeader('Content-Length', String(file.contentLength));
    }

    file.stream.on('error', (error) => {
      // Headers are already sent by this point, so the only option is to drop
      // the connection and let the client retry.
      res.destroy(error);
    });
    file.stream.pipe(res);
  }),

  deleteDocument: asyncHandler(async (req, res) => {
    const data = await driverService.deleteDocument(driverId(req), req.params.id);
    sendSuccess(res, data, 'File removed');
  }),
};
