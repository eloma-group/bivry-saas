import { prisma } from '../config/prisma';
import type { AddOptionInput } from '../validators/option.validator';

/**
 * Options added to a dropdown from a form.
 *
 * Every dropdown in the product ships with a list written in the frontend's
 * constants. This holds only what somebody added on top of one, keyed by the
 * list it belongs to, so a field renders the built in list followed by whatever
 * is stored here.
 *
 * Nothing reads a saved answer back through this table - a form stores the text
 * of the option itself - so a row here is an offer, never a lookup key.
 */

/** Every added option, grouped by the list it belongs to. */
export type OptionLists = Record<string, string[]>;

/**
 * All of them, in one call.
 *
 * Every dropdown in the app wants its additions the moment a form opens, and
 * there are far fewer rows here in total than there are dropdowns, so one read
 * of the lot beats one read per field. Ordered by when each was added, which
 * puts them under the built in list in the order people added them.
 */
export async function listOptions(): Promise<OptionLists> {
  const rows = await prisma.optionValue.findMany({
    orderBy: [{ listKey: 'asc' }, { createdAt: 'asc' }],
    select: { listKey: true, value: true },
  });

  const lists: OptionLists = {};
  for (const row of rows) {
    (lists[row.listKey] ??= []).push(row.value);
  }
  return lists;
}

/** One list's additions. */
export async function listOptionsFor(listKey: string): Promise<string[]> {
  const rows = await prisma.optionValue.findMany({
    where: { listKey },
    orderBy: { createdAt: 'asc' },
    select: { value: true },
  });
  return rows.map((row) => row.value);
}

/**
 * Adds one option to a list, or hands back the one already there.
 *
 * Two people adding "Double-B" to the same dropdown must not end up with it
 * listed twice, and neither of them should see an error for it: the option they
 * wanted is there either way. The unique index settles the race, and a clash on
 * it is read as success.
 *
 * The match is case insensitive, so "Semi" and "semi" are the same option. The
 * first spelling wins, because it is the one already stored against whoever
 * picked it - restoring it here would leave their saved answer reading
 * differently from the list it came from.
 */
export async function addOption(
  input: AddOptionInput,
  actor: { type: string; id: string } | null,
): Promise<{ listKey: string; value: string; values: string[] }> {
  const { listKey, value } = input;

  const existing = await prisma.optionValue.findFirst({
    where: { listKey, value: { equals: value, mode: 'insensitive' } },
    select: { value: true },
  });

  if (!existing) {
    try {
      await prisma.optionValue.create({
        data: {
          listKey,
          value,
          createdByType: actor?.type ?? null,
          createdById: actor?.id ?? null,
        },
      });
    } catch (error) {
      // The unique index refused it, so somebody else added the same option
      // between the read above and this write. That is the outcome we wanted.
      if ((error as { code?: string }).code !== 'P2002') throw error;
    }
  }

  return {
    listKey,
    value: existing?.value ?? value,
    values: await listOptionsFor(listKey),
  };
}
