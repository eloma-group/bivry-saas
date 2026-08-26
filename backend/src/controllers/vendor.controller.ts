import { asyncHandler } from '../utils/asyncHandler';
import { sendCreated, sendSuccess } from '../utils/apiResponse';
import { ApiError } from '../utils/apiError';
import * as vendorService from '../services/vendor.service';
import { getVendorExpiryNotifications } from '../services/notification.service';
import type { VendorDocumentType } from '@prisma/client';

/** The signed in vendor's id. `authenticate` guarantees it is present. */
function vendorId(req: { auth?: { id: string } }): string {
  return req.auth!.id;
}

export const vendorController = {
  getOnboarding: asyncHandler(async (req, res) => {
    const data = await vendorService.getOnboarding(vendorId(req));
    sendSuccess(res, data, 'Onboarding loaded');
  }),

  /** This vendor's own policies and documents that have expired or are about to. */
  notifications: asyncHandler(async (req, res) => {
    const data = await getVendorExpiryNotifications(vendorId(req));
    sendSuccess(res, data, 'Notifications loaded');
  }),

  updateCompany: asyncHandler(async (req, res) => {
    const data = await vendorService.updateCompany(vendorId(req), req.body);
    sendSuccess(res, data, 'Vendor information saved');
  }),

  updateContacts: asyncHandler(async (req, res) => {
    const data = await vendorService.updateContacts(vendorId(req), req.body);
    sendSuccess(res, data, 'Contact information saved');
  }),

  updateDirectors: asyncHandler(async (req, res) => {
    const { directors } = req.body as { directors: vendorService.DirectorInput[] };
    const data = await vendorService.updateDirectors(vendorId(req), directors);
    sendSuccess(res, data, 'Company C-suite saved');
  }),

  updateBank: asyncHandler(async (req, res) => {
    const data = await vendorService.updateBank(vendorId(req), req.body);
    sendSuccess(res, data, 'Bank details saved');
  }),

  updateCoverage: asyncHandler(async (req, res) => {
    const data = await vendorService.updateCoverage(vendorId(req), req.body);
    sendSuccess(res, data, 'Business coverage saved');
  }),

  updateAddresses: asyncHandler(async (req, res) => {
    const data = await vendorService.updateAddresses(
      vendorId(req),
      req.body as vendorService.AddressesInput,
    );
    sendSuccess(res, data, 'Addresses saved');
  }),

  updateWarehouses: asyncHandler(async (req, res) => {
    const { warehouses } = req.body as { warehouses: vendorService.WarehouseInput[] };
    const data = await vendorService.updateWarehouses(vendorId(req), warehouses);
    sendSuccess(res, data, 'Warehouse addresses saved');
  }),

  updateYards: asyncHandler(async (req, res) => {
    const { yards } = req.body as { yards: vendorService.WarehouseInput[] };
    const data = await vendorService.updateYards(vendorId(req), yards);
    sendSuccess(res, data, 'Yard addresses saved');
  }),

  updateAccreditation: asyncHandler(async (req, res) => {
    const data = await vendorService.updateAccreditation(vendorId(req), req.body);
    sendSuccess(res, data, 'Accreditation saved');
  }),

  updateInsurances: asyncHandler(async (req, res) => {
    const { insurances } = req.body as { insurances: vendorService.InsuranceInput[] };
    const data = await vendorService.updateInsurances(vendorId(req), insurances);
    sendSuccess(res, data, 'Insurance details saved');
  }),

  saveProgress: asyncHandler(async (req, res) => {
    const { step } = req.body as { step: number };
    const data = await vendorService.saveProgress(vendorId(req), step);
    sendSuccess(res, data, 'Progress saved');
  }),

  submit: asyncHandler(async (req, res) => {
    const data = await vendorService.submitOnboarding(vendorId(req));
    sendSuccess(res, data, 'Application submitted for review');
  }),

  listDocuments: asyncHandler(async (req, res) => {
    const docType = req.query.docType as VendorDocumentType | undefined;
    const data = await vendorService.listDocuments(vendorId(req), docType);
    sendSuccess(res, data, 'Documents loaded');
  }),

  uploadDocument: asyncHandler(async (req, res) => {
    if (!req.file) throw ApiError.badRequest('No file was uploaded');

    const { docType, category, issueDate, expiryDate } = req.body as {
      docType: VendorDocumentType;
      category: string | null;
      issueDate: Date | null;
      expiryDate: Date | null;
    };

    const document = await vendorService.addDocument(vendorId(req), {
      docType,
      category: category ?? null,
      issueDate: issueDate ?? null,
      expiryDate: expiryDate ?? null,
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
    const data = await vendorService.createDocumentLink(vendorId(req), req.params.id);
    sendSuccess(res, data, 'Document link created');
  }),

  downloadDocument: asyncHandler(async (req, res) => {
    const { document, file } = await vendorService.openDocument(vendorId(req), req.params.id);

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

  updateDocument: asyncHandler(async (req, res) => {
    const { category, issueDate, expiryDate } = req.body as {
      category: string | null;
      issueDate: Date | null;
      expiryDate: Date | null;
    };
    const data = await vendorService.updateDocument(vendorId(req), req.params.id, {
      category: category ?? null,
      issueDate: issueDate ?? null,
      expiryDate: expiryDate ?? null,
    });
    sendSuccess(res, data, 'File details saved');
  }),

  deleteDocument: asyncHandler(async (req, res) => {
    const data = await vendorService.deleteDocument(vendorId(req), req.params.id);
    sendSuccess(res, data, 'File removed');
  }),
};
