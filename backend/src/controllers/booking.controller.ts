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
};
