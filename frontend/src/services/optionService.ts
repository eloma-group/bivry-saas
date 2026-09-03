import { request } from "./api";

/**
 * The dropdown options anyone has added.
 *
 * Every dropdown ships with a list written in `constants/`; this is what people
 * added to one from the form itself. The two are merged when a field renders,
 * so nothing here replaces a built in list - it only ever grows one.
 *
 * The endpoint is open to any signed in account, whichever portal they are on,
 * because the same dropdowns appear on all of them.
 */

/** Every added option, keyed by the list it belongs to. */
export type OptionLists = Record<string, string[]>;

export interface OptionAdded {
  listKey: string;
  /**
   * The option as it is now stored. Not always what was sent: an option that
   * already exists in another casing keeps the spelling already on the list, so
   * the value picked matches the option shown.
   */
  value: string;
  /** That whole list afterwards, so the caller does not have to re-read it. */
  values: string[];
}

/** The longest an option can be. The API refuses anything longer. */
export const OPTION_VALUE_MAX = 80;

export const optionService = {
  list(): Promise<OptionLists> {
    return request<OptionLists>({ url: "/options", method: "GET" });
  },

  add(listKey: string, value: string): Promise<OptionAdded> {
    return request<OptionAdded>({
      url: "/options",
      method: "POST",
      data: { listKey, value },
    });
  },
};
