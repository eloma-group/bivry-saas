import { asyncHandler } from '../utils/asyncHandler';
import { sendCreated, sendSuccess } from '../utils/apiResponse';
import { addOption, listOptions } from '../services/option.service';
import type { AddOptionInput } from '../validators/option.validator';

/**
 * The dropdown options anyone has added.
 *
 * Every portal reads and writes these: the driver, vendor and customer
 * onboarding forms carry the same dropdowns the admin's own forms do, and an
 * option added on one of them has to show up on the others. So these two
 * handlers are mounted behind `authenticate` alone, with no role check - being
 * signed in is the whole of it.
 */
export const optionController = {
  list: asyncHandler(async (_req, res) => {
    sendSuccess(res, await listOptions(), 'Options loaded');
  }),

  add: asyncHandler(async (req, res) => {
    const input = req.body as AddOptionInput;
    const actor = req.auth ? { type: req.auth.actorType, id: req.auth.id } : null;
    sendCreated(res, await addOption(input, actor), 'Option added');
  }),
};
