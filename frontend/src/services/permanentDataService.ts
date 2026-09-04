import { request } from "./api";

/**
 * Permanent Data: the pickups and the vendor prices we keep on file.
 *
 * Two readers, one API. The Permanent Data page lists, adds, edits and deletes
 * them; Create Booking only ever reads, and fills its own fields from what it
 * finds, so nothing on a booking form can change what is stored here.
 *
 * Amounts come back from Postgres as decimal strings rather than numbers, which
 * suits both readers: a form field holds a string, and a table shows one.
 */

/** The address, in the six parts every form in the product asks for. */
export interface PermanentAddress {
  suite: string | null;
  street1: string | null;
  suburb: string | null;
  state: string | null;
  postCode: string | null;
  country: string | null;
  /** The whole address on one line, as it was entered. */
  fullAddress: string | null;
}

export interface PermanentCustomer extends PermanentAddress {
  id: string;
  /** BIVRY-CJOB-5000, given by the server when the row was added. */
  clientJobId: string;
  /** The site as a booking picks it: "Amazon - AVV2 - Cranbourne West". */
  pickUpCompany: string;
  agreementType: string | null;
  reference: string | null;
  trailer: string | null;
  grossAmount: string | null;
  fuelLevyPct: string | null;
  fuelLevyAmount: string | null;
  splitChargePct: string | null;
  splitChargeAmount: string | null;
  otherChargesPct: string | null;
  otherChargesAmount: string | null;
  gstPct: string | null;
  gstAmount: string | null;
  netAmount: string | null;
  totalAmount: string | null;
  finalAmount: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PermanentVendor extends PermanentAddress {
  id: string;
  /** BIVRY-VJOB-5000, given by the server when the row was added. */
  vendorJobId: string;
  /** The vendor record this belongs to. One saved price per vendor. */
  vendorId: string;
  vendorName: string | null;
  /** The gross for trailer A, and for trailer B where the load runs on two. */
  grossAmount: string | null;
  grossAmount2: string | null;
  fuelLevyPct: string | null;
  fuelLevyAmount: string | null;
  gstPct: string | null;
  gstAmount: string | null;
  netAmount: string | null;
  totalAmount: string | null;
  createdAt: string;
  updatedAt: string;
}

/** What a form sends. Every value is a string, as the fields hold them. */
export type PermanentCustomerInput = Partial<
  Omit<PermanentCustomer, "id" | "clientJobId" | "createdAt" | "updatedAt">
> & { pickUpCompany: string };

export type PermanentVendorInput = Partial<
  Omit<PermanentVendor, "id" | "vendorJobId" | "createdAt" | "updatedAt">
> & { vendorId: string };

export const permanentDataService = {
  listCustomers(search?: string): Promise<PermanentCustomer[]> {
    return request<PermanentCustomer[]>({
      url: "/admin/permanent/customers",
      method: "GET",
      params: search ? { search } : undefined,
    });
  },

  createCustomer(payload: PermanentCustomerInput): Promise<PermanentCustomer> {
    return request<PermanentCustomer>({
      url: "/admin/permanent/customers",
      method: "POST",
      data: payload,
    });
  },

  updateCustomer(
    id: string,
    payload: Partial<PermanentCustomerInput>,
  ): Promise<PermanentCustomer> {
    return request<PermanentCustomer>({
      url: `/admin/permanent/customers/${id}`,
      method: "PUT",
      data: payload,
    });
  },

  deleteCustomer(id: string): Promise<null> {
    return request<null>({ url: `/admin/permanent/customers/${id}`, method: "DELETE" });
  },

  listVendors(search?: string): Promise<PermanentVendor[]> {
    return request<PermanentVendor[]>({
      url: "/admin/permanent/vendors",
      method: "GET",
      params: search ? { search } : undefined,
    });
  },

  createVendor(payload: PermanentVendorInput): Promise<PermanentVendor> {
    return request<PermanentVendor>({
      url: "/admin/permanent/vendors",
      method: "POST",
      data: payload,
    });
  },

  /** The vendor a row belongs to is fixed; only its figures and address change. */
  updateVendor(
    id: string,
    payload: Partial<Omit<PermanentVendorInput, "vendorId">>,
  ): Promise<PermanentVendor> {
    return request<PermanentVendor>({
      url: `/admin/permanent/vendors/${id}`,
      method: "PUT",
      data: payload,
    });
  },

  deleteVendor(id: string): Promise<null> {
    return request<null>({ url: `/admin/permanent/vendors/${id}`, method: "DELETE" });
  },
};
