import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminService,
  type CustomerListParams,
  type CustomerListResult,
  type DriverListParams,
  type DriverListResult,
  type VendorListParams,
  type VendorListResult,
} from "@/services/adminService";

/**
 * The Customer, Vendor and Driver registers, cached per page of results.
 *
 * These three lists are paged, sorted and searched by the server, so a page of
 * them is only as good as the parameters that fetched it - which is exactly
 * what a query key is. Page 2 sorted by name is its own entry, and going back
 * to page 1 shows what is already in hand instead of asking again.
 *
 * `keepPreviousData` is what makes paging feel like paging: the rows on screen
 * stay put while the next page is fetched, so the table does not blank out and
 * then jump back. The pager reads `isFetching` to say something is on its way.
 *
 * A write - an approval, a delete - calls the matching invalidate below rather
 * than refetching one page by hand, because a deleted row shifts every page
 * after it and only the server knows what page 3 holds now.
 */

export const adminListKeys = {
  customers: (params: CustomerListParams) => ["admin", "customers", "list", params] as const,
  vendors: (params: VendorListParams) => ["admin", "vendors", "list", params] as const,
  drivers: (params: DriverListParams) => ["admin", "drivers", "list", params] as const,
};

export function useCustomerList(params: CustomerListParams) {
  return useQuery<CustomerListResult>({
    queryKey: adminListKeys.customers(params),
    queryFn: () => adminService.listCustomers(params),
    placeholderData: keepPreviousData,
  });
}

export function useVendorList(params: VendorListParams) {
  return useQuery<VendorListResult>({
    queryKey: adminListKeys.vendors(params),
    queryFn: () => adminService.listVendors(params),
    placeholderData: keepPreviousData,
  });
}

export function useDriverList(params: DriverListParams) {
  return useQuery<DriverListResult>({
    queryKey: adminListKeys.drivers(params),
    queryFn: () => adminService.listDrivers(params),
    placeholderData: keepPreviousData,
  });
}

/**
 * Marks every cached page of one register stale.
 *
 * Whole register rather than the page in hand: a row removed from page 1 pulls
 * a row back from page 2, so the pages after it are wrong too.
 */
export function useRefreshAdminList(kind: "customers" | "vendors" | "drivers") {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: ["admin", kind, "list"] });
}
