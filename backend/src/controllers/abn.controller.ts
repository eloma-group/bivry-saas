import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { ApiError } from '../utils/apiError';
import { lookupAbn } from '../services/abn.service';

/**
 * The Australian Business Register, proxied.
 *
 * Public data, and the same call whoever asks for it, so both the vendor's
 * own onboarding form and an admin editing that form mount this handler. It
 * reads nothing from the account and writes nothing, and the register itself
 * decides what comes back.
 */
export const abnController = {
  lookup: asyncHandler(async (req, res) => {
    const abn = typeof req.query.abn === 'string' ? req.query.abn.trim() : '';
    if (!abn) throw ApiError.badRequest('An ABN is required');

    const data = await lookupAbn(abn);
    sendSuccess(res, data, 'Business Register details loaded');
  }),
};
