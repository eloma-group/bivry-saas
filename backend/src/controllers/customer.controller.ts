import { asyncHandler } from '../utils/asyncHandler';
import { sendCreated, sendSuccess } from '../utils/apiResponse';
import { ApiError } from '../utils/apiError';
import * as customerService from '../services/customer.service';
import type { CustomerDocumentType } from '@prisma/client';

/** The signed in customer's id. `authenticate` guarantees it is present. */
function customerId(req: { auth?: { id: string } }): string {
  return req.auth!.id;
}

export const customerController = {
  getOnboarding: asyncHandler(async (req, res) => {
    const data = await customerService.getOnboarding(customerId(req));
    sendSuccess(res, data, 'Onboarding loaded');
  }),

  updateCompany: asyncHandler(async (req, res) => {
    const data = await customerService.updateCompany(customerId(req), req.body);
    sendSuccess(res, data, 'Customer information saved');
  }),

  updateContacts: asyncHandler(async (req, res) => {
    const data = await customerService.updateContacts(customerId(req), req.body);
    sendSuccess(res, data, 'Communication details saved');
  }),

  updateDirectors: asyncHandler(async (req, res) => {
    const { directors } = req.body as { directors: customerService.DirectorInput[] };
    const data = await customerService.updateDirectors(customerId(req), directors);
    sendSuccess(res, data, 'Director information saved');
  }),

  updateAddresses: asyncHandler(async (req, res) => {
    const data = await customerService.updateAddresses(
      customerId(req),
      req.body as customerService.AddressesInput,
    );
    sendSuccess(res, data, 'Addresses saved');
  }),

  updateBilling: asyncHandler(async (req, res) => {
    const data = await customerService.updateBilling(customerId(req), req.body);
    sendSuccess(res, data, 'Billing saved');
  }),

  saveProgress: asyncHandler(async (req, res) => {
    const { step } = req.body as { step: number };
    const data = await customerService.saveProgress(customerId(req), step);
    sendSuccess(res, data, 'Progress saved');
  }),

  submit: asyncHandler(async (req, res) => {
    const data = await customerService.submitOnboarding(customerId(req));
    sendSuccess(res, data, 'Application submitted for review');
  }),

  listDocuments: asyncHandler(async (req, res) => {
    const docType = req.query.docType as CustomerDocumentType | undefined;
    const data = await customerService.listDocuments(customerId(req), docType);
    sendSuccess(res, data, 'Documents loaded');
  }),

  uploadDocument: asyncHandler(async (req, res) => {
    if (!req.file) throw ApiError.badRequest('No file was uploaded');

    const { docType, category, issueDate, expiryDate } = req.body as {
      docType: CustomerDocumentType;
      category: string | null;
      issueDate: Date | null;
      expiryDate: Date | null;
    };

    const document = await customerService.addDocument(customerId(req), {
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
    const data = await customerService.createDocumentLink(customerId(req), req.params.id);
    sendSuccess(res, data, 'Document link created');
  }),

  downloadDocument: asyncHandler(async (req, res) => {
    const { document, file } = await customerService.openDocument(customerId(req), req.params.id);

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
    const data = await customerService.updateDocument(customerId(req), req.params.id, {
      category: category ?? null,
      issueDate: issueDate ?? null,
      expiryDate: expiryDate ?? null,
    });
    sendSuccess(res, data, 'File details saved');
  }),

  deleteDocument: asyncHandler(async (req, res) => {
    const data = await customerService.deleteDocument(customerId(req), req.params.id);
    sendSuccess(res, data, 'File removed');
  }),
};
