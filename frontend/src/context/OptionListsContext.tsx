import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { optionService, type OptionLists } from "@/services/optionService";
import { useAuth } from "@/context/AuthContext";

/**
 * The options people have added to the product's dropdowns.
 *
 * Every dropdown ships with a list written in `constants/`. A field can also
 * offer an "Add" row at the bottom, and what somebody types there is stored
 * against that dropdown's key and offered to everybody afterwards. This holds
 * those additions for the whole app: they are read once when a session starts,
 * because a form that asks for a country in six places would otherwise ask the
 * API six times for the same answer.
 *
 * Signed out, it holds nothing and adding is not offered. Every dropdown still
 * works - the built in list is in the bundle - so a form on a public page is
 * unaffected by any of this.
 */

interface OptionListsValue {
  /** What has been added to one list, or an empty array. Never null. */
  added: (listKey: string | undefined) => readonly string[];
  /**
   * Adds one option and returns it as stored, which is not always what was
   * sent: an option already on the list in another casing keeps the spelling
   * that is already there, so the value picked matches the option shown.
   */
  add: (listKey: string, value: string) => Promise<string>;
  /** Whether adding is possible at all. False when signed out. */
  canAdd: boolean;
}

const EMPTY: readonly string[] = [];

const OptionListsContext = createContext<OptionListsValue | null>(null);

export function OptionListsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [lists, setLists] = useState<OptionLists>({});

  // Read once per sign in. A sign out empties it, so the next account does not
  // start from the last one's copy.
  useEffect(() => {
    if (!isAuthenticated) {
      setLists({});
      return;
    }

    let cancelled = false;
    optionService
      .list()
      .then((loaded) => {
        if (!cancelled) setLists(loaded);
      })
      .catch(() => {
        // Nothing to show the user: every dropdown still has its built in list,
        // and this only ever adds to one. Adding still works and puts what it
        // stored straight into the list below.
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const added = useCallback(
    (listKey: string | undefined) => (listKey ? lists[listKey] ?? EMPTY : EMPTY),
    [lists],
  );

  const add = useCallback(async (listKey: string, value: string) => {
    const result = await optionService.add(listKey, value);
    // The server hands back the whole list, which is what settles a second
    // person having added to the same dropdown since this page loaded.
    setLists((current) => ({ ...current, [listKey]: result.values }));
    return result.value;
  }, []);

  const value = useMemo<OptionListsValue>(
    () => ({ added, add, canAdd: isAuthenticated }),
    [added, add, isAuthenticated],
  );

  return <OptionListsContext.Provider value={value}>{children}</OptionListsContext.Provider>;
}

/**
 * The added options, for a field that offers an "Add" row.
 *
 * Safe outside the provider: a field rendered on a page that has none simply
 * shows its built in list and offers no "Add" row, rather than throwing.
 */
export function useOptionLists(): OptionListsValue {
  const context = useContext(OptionListsContext);
  return (
    context ?? {
      added: () => EMPTY,
      add: async (_listKey: string, value: string) => value,
      canAdd: false,
    }
  );
}
