import { asyncHandler } from '../utils/asyncHandler';
import { sendCreated, sendSuccess } from '../utils/apiResponse';
import * as bookingService from '../services/booking.service';
import { bookingListQuerySchema, reserveJobNumberSchema } from '../validators/booking.validator';

/** The signed in admin's id. `authenticate` guarantees it is present. */
function adminId(req: { auth?: { id: string } }): string {
  return req.auth!.id;
}

export const bookingController = {
  list: asyncHandler(async (req, res) => {
    const query = bookingListQuerySchema.parse(req.query);
    const data = await bookingService.listBookings({
      search: query.search ?? undefined,
      page: query.page,
      pageSize: query.pageSize,
      sortBy: query.sortBy,
      sortDir: query.sortDir,
    });
    sendSuccess(res, data, 'Bookings loaded');
  }),

  /**
   * Parks the next job number for the admin opening the Create Booking form, so
   * the field can show it and no second admin is handed the same one.
   */
  reserveJobNumber: asyncHandler(async (req, res) => {
    const input = reserveJobNumberSchema.parse(req.body ?? {});
    const data = await bookingService.reserveJobNumber(input, adminId(req));
    sendSuccess(res, data, 'Job number reserved');
  }),

  /** Gives a parked number back when the form is left without being saved. */
  releaseJobNumber: asyncHandler(async (req, res) => {
    await bookingService.releaseJobNumber(req.params.jobNumber, adminId(req));
    sendSuccess(res, null, 'Job number released');
  }),

  create: asyncHandler(async (req, res) => {
    const data = await bookingService.createBooking(req.body, adminId(req));
    sendCreated(res, data, 'Booking created');
  }),

  get: asyncHandler(async (req, res) => {
    const data = await bookingService.getBooking(req.params.id);
    sendSuccess(res, data, 'Booking loaded');
  }),

  update: asyncHandler(async (req, res) => {
    const data = await bookingService.updateBooking(req.params.id, req.body);
    sendSuccess(res, data, 'Booking updated');
  }),

  remove: asyncHandler(async (req, res) => {
    await bookingService.deleteBooking(req.params.id);
    sendSuccess(res, null, 'Booking deleted');
  }),

  /** Moves the vendor payment status. Admin only; the vendor reads it. */
  updatePaymentStatus: asyncHandler(async (req, res) => {
    const { paymentStatus } = req.body as {
      paymentStatus: 'PENDING' | 'PAID' | 'HOLD' | 'ADJUSTED';
    };
    const data = await bookingService.updatePaymentStatus(req.params.id, paymentStatus);
    sendSuccess(res, data, 'Payment status updated');
  }),

  /** The files the vendor uploaded against a booking, for the admin's review. */
  listDocuments: asyncHandler(async (req, res) => {
    const data = await bookingService.listBookingDocumentsForAdmin(req.params.id);
    sendSuccess(res, data, 'Documents loaded');
  }),

  documentLink: asyncHandler(async (req, res) => {
    const data = await bookingService.createBookingDocumentLinkForAdmin(
      req.params.id,
      req.params.documentId,
    );
    sendSuccess(res, data, 'Document link created');
  }),

  downloadDocument: asyncHandler(async (req, res) => {
    const { document, file } = await bookingService.openBookingDocumentForAdmin(
      req.params.id,
      req.params.documentId,
    );

    res.type(file.contentType);
    res.setHeader('Content-Disposition', `inline; filename="${document.fileName.replace(/"/g, '')}"`);
    if (file.contentLength !== null) {
      res.setHeader('Content-Length', String(file.contentLength));
    }

    file.stream.on('error', (error) => {
      res.destroy(error);
    });
    file.stream.pipe(res);
  }),

  /** Approves or rejects one vendor-uploaded file. */
  setDocumentApproval: asyncHandler(async (req, res) => {
    const { approvalStatus } = req.body as {
      approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
    };
    const data = await bookingService.setBookingDocumentApproval(
      req.params.id,
      req.params.documentId,
      approvalStatus,
    );
    sendSuccess(res, data, 'Document review saved');
  }),
};
