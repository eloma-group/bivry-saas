import { asyncHandler } from '../utils/asyncHandler';
import { sendCreated, sendSuccess } from '../utils/apiResponse';
import * as permanentDataService from '../services/permanentData.service';
import { permanentListQuerySchema } from '../validators/permanentData.validator';

/**
 * The Permanent Data page: our saved pickups and vendor prices.
 *
 * Both halves read and write the same way - list, create, update, delete - so
 * the page can show a table and act on a row without a second kind of call.
 */
export const permanentDataController = {
  listCustomers: asyncHandler(async (req, res) => {
    const query = permanentListQuerySchema.parse(req.query);
    const data = await permanentDataService.listPermanentCustomers(query.search ?? undefined);
    sendSuccess(res, data, 'Saved pickups loaded');
  }),

  createCustomer: asyncHandler(async (req, res) => {
    const data = await permanentDataService.createPermanentCustomer(req.body);
    sendCreated(res, data, 'Saved pickup added');
  }),

  updateCustomer: asyncHandler(async (req, res) => {
    const data = await permanentDataService.updatePermanentCustomer(req.params.id, req.body);
    sendSuccess(res, data, 'Saved pickup updated');
  }),

  deleteCustomer: asyncHandler(async (req, res) => {
    await permanentDataService.deletePermanentCustomer(req.params.id);
    sendSuccess(res, null, 'Saved pickup deleted');
  }),

  listVendors: asyncHandler(async (req, res) => {
    const query = permanentListQuerySchema.parse(req.query);
    const data = await permanentDataService.listPermanentVendors(query.search ?? undefined);
    sendSuccess(res, data, 'Saved vendor prices loaded');
  }),

  createVendor: asyncHandler(async (req, res) => {
    const data = await permanentDataService.createPermanentVendor(req.body);
    sendCreated(res, data, 'Saved vendor price added');
  }),

  updateVendor: asyncHandler(async (req, res) => {
    const data = await permanentDataService.updatePermanentVendor(req.params.id, req.body);
    sendSuccess(res, data, 'Saved vendor price updated');
  }),

  deleteVendor: asyncHandler(async (req, res) => {
    await permanentDataService.deletePermanentVendor(req.params.id);
    sendSuccess(res, null, 'Saved vendor price deleted');
  }),
};
