import { z } from 'zod';

/**
 * Adding one option to a dropdown.
 *
 * Both halves are free text, because both are: the key names a dropdown in the
 * frontend's `optionLists.ts`, and the value is whatever the person typed. What
 * is checked here is shape, not membership - a key the frontend does not know
 * about stores fine and is simply never read back, which is what keeps this
 * endpoint from needing a deploy every time a new dropdown is added.
 */

/** The longest an option can be. Long enough for "Subclass 189 - Skilled Independent". */
export const OPTION_VALUE_MAX = 80;

/** The longest a list key can be. They are short, dotted names. */
const LIST_KEY_MAX = 60;

/** Letters, digits, dots, dashes and underscores. No spaces, no slashes. */
const LIST_KEY_RE = /^[a-zA-Z0-9._-]+$/;

const listKeySchema = z
  .string()
  .trim()
  .min(1, 'A list is required')
  .max(LIST_KEY_MAX, 'That list name is too long')
  .regex(LIST_KEY_RE, 'That is not a valid list name');

export const addOptionSchema = z.object({
  listKey: listKeySchema,
  value: z
    .string()
    .trim()
    .min(1, 'An option is required')
    .max(OPTION_VALUE_MAX, `An option can be at most ${OPTION_VALUE_MAX} characters`),
});

export type AddOptionInput = z.infer<typeof addOptionSchema>;
