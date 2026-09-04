import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  permanentDataService,
  type PermanentCustomer,
  type PermanentVendor,
} from "@/services/permanentDataService";

/**
 * Our saved pickups and vendor prices, cached for the whole session.
 *
 * Three places read them: the Permanent Data page, the Pick-Up Company field on
 * a booking, and Vendor Allotment. They share one cache entry each, so a form
 * with three pickups asks once, and opening the page after using the form shows
 * what is already in hand rather than a loader.
 *
 * Both lists are fetched whole and searched in the browser. They are reference
 * data - hundreds of rows at the outside - so paging or searching against the
 * server would spend a request on something already in memory, and a table that
 * refetches every time somebody types is exactly what makes an admin panel feel
 * slow.
 */

export const permanentKeys = {
  customers: ["permanent", "customers"] as const,
  vendors: ["permanent", "vendors"] as const,
};

export function usePermanentCustomers() {
  return useQuery<PermanentCustomer[]>({
    queryKey: permanentKeys.customers,
    queryFn: () => permanentDataService.listCustomers(),
  });
}

export function usePermanentVendors() {
  return useQuery<PermanentVendor[]>({
    queryKey: permanentKeys.vendors,
    queryFn: () => permanentDataService.listVendors(),
  });
}

/**
 * Marks both lists stale after something is added, edited or deleted.
 *
 * Returned as a function rather than done inside a mutation so the caller
 * decides when: a page that has just written a row wants the table to catch up
 * immediately, and a booking form that only reads never needs to.
 */
export function useRefreshPermanentData() {
  const client = useQueryClient();
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: permanentKeys.customers }),
      client.invalidateQueries({ queryKey: permanentKeys.vendors }),
    ]);
}
