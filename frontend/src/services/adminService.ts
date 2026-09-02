import { api, request } from "./api";
import type {
  DriverAddressPayload,
  DriverDocument,
  DriverOnboardingData,
  OnboardingStatus,
  VerificationStatus,
  ApiLicenceType,
} from "./driverService";
import type { VendorContactType, VendorDocument, VendorOnboardingData } from "./vendorService";
import type {
  CustomerBillingTypeApi,
  CustomerContactType,
  CustomerDocument,
  CustomerOnboardingData,
} from "./customerService";
import type { DriverOnboardingGateway } from "./driverOnboarding";
import type { VendorOnboardingGateway } from "./vendorOnboarding";
import type { CustomerOnboardingGateway } from "./customerOnboarding";

/**
 * Admin module API. Every path lives under `/api/admin`, which the backend locks
 * to an authenticated admin, so these are the only calls in the app that read or
 * write somebody else's records.
 */

export type AccountStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "DEACTIVATED";

/** A driver as the list endpoint returns them: enough for a table row. */
export interface AdminDriverRow {
  id: string;
  email: string;
  phone: string | null;
  firstName: string;
  middleName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  country: string | null;
  status: AccountStatus;
  onboardingStatus: OnboardingStatus;
  onboardingStep: number;
  submittedAt: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  licence: {
    licenceNumber: string | null;
    licenceType: ApiLicenceType | null;
    expiryDate: string | null;
    verificationStatus: VerificationStatus;
  } | null;
  addresses: Array<Pick<DriverAddressPayload, "suburb" | "state" | "country"> & {
    type: "CURRENT" | "PERMANENT";
  }>;
  _count: { documents: number };
}

export interface DriverListResult {
  rows: AdminDriverRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface DriverListParams {
  search?: string;
  onboardingStatus?: OnboardingStatus;
  page?: number;
  pageSize?: number;
  sortBy?: "createdAt" | "submittedAt" | "firstName" | "email" | "onboardingStatus";
  sortDir?: "asc" | "desc";
}

export interface AdminModuleSummary {
  slug: string;
  label: string;
  ready: boolean;
  records: number;
}

/** A vendor as the list endpoint returns them: enough for a table row. */
export interface AdminVendorRow {
  id: string;
  email: string;
  phone: string | null;
  companyName: string;
  tradingNames: string[];
  legalName: string | null;
  abn: string | null;
  acn: string | null;
  abnStatus: string | null;
  entityType: string | null;
  gst: string | null;
  vendorCode: string | null;
  websiteAddress: string | null;
  contactPerson: string | null;
  status: AccountStatus;
  onboardingStatus: OnboardingStatus;
  onboardingStep: number;
  submittedAt: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  accreditation: {
    accreditationNumber: string | null;
    /** The certificate's own expiry, as distinct from the scheme ones below. */
    expiryDate: string | null;
    massManagementExpiry: string | null;
    dangerousGoodsExpiry: string | null;
    nhvasExpiry: string | null;
    haccpExpiry: string | null;
    verificationStatus: VerificationStatus;
  } | null;
  coverage: { areasCovered: string[]; businessOperations: string[] } | null;
  warehouses: Array<{ suburb: string | null; state: string | null; country: string | null }>;
  /** Department contact numbers, which stand in when the account has no phone. */
  contacts: Array<{ type: VendorContactType; contactNumber: string | null }>;
  _count: { documents: number };
}

export interface VendorListResult {
  rows: AdminVendorRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface VendorListParams {
  search?: string;
  onboardingStatus?: OnboardingStatus;
  page?: number;
  pageSize?: number;
  sortBy?: "createdAt" | "submittedAt" | "companyName" | "email" | "onboardingStatus";
  sortDir?: "asc" | "desc";
}

/** A customer as the list endpoint returns them: enough for a table row. */
export interface AdminCustomerRow {
  id: string;
  email: string;
  phone: string | null;
  cid: string | null;
  accountNumber: string | null;
  firstName: string;
  lastName: string | null;
  companyName: string | null;
  designation: string | null;
  tradingNames: string[];
  legalName: string | null;
  abn: string | null;
  acn: string | null;
  abnStatus: string | null;
  entityType: string | null;
  gst: string | null;
  websiteAddress: string | null;
  creationDate: string | null;
  status: AccountStatus;
  onboardingStatus: OnboardingStatus;
  onboardingStep: number;
  submittedAt: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  /** Department contact numbers, which stand in when the account has no phone. */
  contacts: Array<{ type: CustomerContactType; contactNumber: string | null }>;
  billing: { term: string | null; billingType: CustomerBillingTypeApi | null } | null;
  addresses: Array<{
    type: "PRINCIPAL" | "BILLING";
    suburb: string | null;
    state: string | null;
    country: string | null;
  }>;
  _count: { documents: number };
}

export interface CustomerListResult {
  rows: AdminCustomerRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface CustomerListParams {
  search?: string;
  onboardingStatus?: OnboardingStatus;
  page?: number;
  pageSize?: number;
  sortBy?: "createdAt" | "submittedAt" | "companyName" | "firstName" | "email" | "onboardingStatus";
  sortDir?: "asc" | "desc";
}

export interface CreateCustomerInput {
  email: string;
  password: string;
  phone?: string | null;
  /**
   * Optional, unlike every other portal: the customer form no longer asks for a
   * person at the business, so the server files the account under the company
   * name (or the email) when this is left out.
   */
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  designation?: string | null;
  tradingNames?: string[];
  legalName?: string | null;
  abn?: string | null;
  acn?: string | null;
  abnStatus?: string | null;
  entityType?: string | null;
  gst?: string | null;
  websiteAddress?: string | null;
  /** yyyy-MM-dd. */
  creationDate?: string | null;
  status?: AccountStatus;
}

/**
 * The email is here but the password is not: an admin can correct the address
 * somebody mistyped at signup, but replacing a password goes through
 * `setCustomerPassword`, which also signs the existing sessions out.
 */
export type UpdateCustomerInput = Partial<Omit<CreateCustomerInput, "password">>;

/** Headline numbers, one block per record type the dashboard tracks. */
export interface OnboardingCounts {
  total: number;
  pendingReview: number;
  notStarted: number;
  inProgress: number;
  submitted: number;
  underReview: number;
  approved: number;
  rejected: number;
}

export interface AdminDashboard {
  drivers: OnboardingCounts;
  vendors: OnboardingCounts;
  customers: OnboardingCounts;
  documents: { total: number; totalBytes: number };
  recentDrivers: AdminDriverRow[];
  recentVendors: AdminVendorRow[];
  recentCustomers: AdminCustomerRow[];
  modules: AdminModuleSummary[];
}

export interface AdminProfile {
  id: string;
  email: string;
  phone: string | null;
  firstName: string;
  lastName: string | null;
  avatarUrl: string | null;
  isSuperAdmin: boolean;
  status: AccountStatus;
  lastLoginAt?: string | null;
  createdAt: string;
}

export interface CreateDriverInput {
  email: string;
  password: string;
  phone?: string | null;
  firstName: string;
  middleName?: string | null;
  lastName?: string | null;
  dateOfBirth?: string | null;
  country?: string | null;
  status?: AccountStatus;
}

/**
 * The email is here but the password is not: an admin can correct the address
 * somebody mistyped at signup, but replacing a password goes through
 * `setDriverPassword`, which also signs the existing sessions out.
 */
export type UpdateDriverInput = Partial<Omit<CreateDriverInput, "password">>;

export type ReviewDecision = "APPROVED" | "REJECTED" | "UNDER_REVIEW";

/** Where a plain account module lives under /admin. */
export type SimpleAccountPath = "employees";

/**
 * One plain account row. The shared columns are typed; the ones specific to a
 * kind are read through the index signature, because the pages that render them
 * are driven by a field config rather than by this type.
 */
export interface SimpleAccount {
  id: string;
  email: string;
  phone: string | null;
  firstName: string;
  lastName: string | null;
  avatarUrl: string | null;
  status: AccountStatus;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  [column: string]: unknown;
}

export interface SimpleAccountListParams {
  search?: string;
  status?: AccountStatus;
  page?: number;
  pageSize?: number;
  sortBy?: "createdAt" | "email" | "firstName";
  sortDir?: "asc" | "desc";
}

export interface SimpleAccountListResult {
  rows: SimpleAccount[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export type ReviewableSection =
  | "licence"
  | "drivingHistory"
  | "policeVerification"
  | "visa"
  | "medical"
  | "drugTest";

export interface CreateVendorInput {
  email: string;
  password: string;
  phone?: string | null;
  companyName: string;
  tradingNames?: string[];
  legalName?: string | null;
  contactPerson?: string | null;
  abn?: string | null;
  acn?: string | null;
  abnStatus?: string | null;
  entityType?: string | null;
  gst?: string | null;
  websiteAddress?: string | null;
  status?: AccountStatus;
}

/**
 * The email is here but the password is not: an admin can correct the address
 * somebody mistyped at signup, but replacing a password goes through
 * `setVendorPassword`, which also signs the existing sessions out.
 */
export type UpdateVendorInput = Partial<Omit<CreateVendorInput, "password">>;

/** Vendor sections an admin can verify one at a time. */
export type ReviewableVendorSection =
  | "accreditation"
  | "productLiability"
  | "publicLiability"
  | "workCover"
  | "marineGeneral"
  | "marineAlcohol"
  | "coc";

export const adminService = {
  dashboard(): Promise<AdminDashboard> {
    return request<AdminDashboard>({ url: "/admin/dashboard", method: "GET" });
  },

  // -------------------------------------------------------------------------
  // Drivers
  // -------------------------------------------------------------------------

  listDrivers(params: DriverListParams = {}): Promise<DriverListResult> {
    return request<DriverListResult>({ url: "/admin/drivers", method: "GET", params });
  },

  /** One driver in full: the same shape the driver sees of themselves. */
  getDriver(driverId: string): Promise<DriverOnboardingData> {
    return request<DriverOnboardingData>({ url: `/admin/drivers/${driverId}`, method: "GET" });
  },

  createDriver(values: CreateDriverInput): Promise<AdminDriverRow> {
    return request<AdminDriverRow>({ url: "/admin/drivers", method: "POST", data: values });
  },

  updateDriver(driverId: string, values: UpdateDriverInput): Promise<AdminDriverRow> {
    return request<AdminDriverRow>({
      url: `/admin/drivers/${driverId}`,
      method: "PUT",
      data: values,
    });
  },

  deleteDriver(driverId: string) {
    return request({ url: `/admin/drivers/${driverId}`, method: "DELETE" });
  },

  /** Replaces a driver's password and signs every one of their sessions out. */
  setDriverPassword(driverId: string, password: string) {
    return request<{ id: string; email: string }>({
      url: `/admin/drivers/${driverId}/password`,
      method: "PUT",
      data: { password },
    });
  },

  /**
   * The onboarding record of one driver, written by an admin.
   *
   * Shaped to match `driverService` method for method so it satisfies
   * `DriverOnboardingGateway`. That is what lets the Admin portal reuse the
   * driver's own onboarding form and its save pipeline rather than growing a
   * second one that would have to be kept in step by hand.
   */
  driverOnboarding(driverId: string): DriverOnboardingGateway {
    const base = `/admin/drivers/${driverId}`;
    const section = <T,>(path: string) => (values: T) =>
      request({ url: `${base}/onboarding/${path}`, method: "PUT", data: values });

    return {
      savePersonal: section("personal"),
      saveAddress: section("address"),
      saveLicence: section("licence"),
      saveDrivingHistory: section("driving-history"),
      savePoliceVerification: section("police-verification"),
      saveVisa: section("visa"),
      savePassport: section("passport"),
      saveMedicare: section("medicare"),
      saveMedical: section("medical"),
      saveDrugTest: section("drug-test"),

      async uploadDocument(input) {
        const form = new FormData();
        form.append("file", input.file);
        form.append("docType", input.docType);
        if (input.category) form.append("category", input.category);
        if (input.expiryDate) form.append("expiryDate", input.expiryDate);

        const response = await api.post<{ data: DriverDocument }>(`${base}/documents`, form, {
          // Let the browser set the multipart boundary.
          headers: { "Content-Type": undefined },
          onUploadProgress(event) {
            if (!input.onProgress || !event.total) return;
            input.onProgress(Math.round((event.loaded / event.total) * 100));
          },
        });

        return response.data.data;
      },

      updateDocument(documentId, values) {
        return request({ url: `${base}/documents/${documentId}`, method: "PATCH", data: values });
      },

      deleteDocument(documentId) {
        return request({ url: `${base}/documents/${documentId}`, method: "DELETE" });
      },
    };
  },

  reviewDriver(driverId: string, decision: ReviewDecision, reason?: string | null) {
    return request<AdminDriverRow>({
      url: `/admin/drivers/${driverId}/review`,
      method: "POST",
      data: { decision, reason: reason ?? null },
    });
  },

  reviewSection(
    driverId: string,
    section: ReviewableSection,
    status: VerificationStatus,
    remarks?: string | null,
  ) {
    return request({
      url: `/admin/drivers/${driverId}/sections/${section}/review`,
      method: "POST",
      data: { status, remarks: remarks ?? null },
    });
  },

  /** Short lived blob storage link for one of a driver's documents. */
  driverDocumentLink(driverId: string, documentId: string) {
    return request<{ url: string; expiresAt: string | null; fileName: string; mimeType: string }>({
      url: `/admin/drivers/${driverId}/documents/${documentId}/url`,
      method: "GET",
    });
  },

  async fetchDriverDocumentBlobUrl(driverId: string, documentId: string): Promise<string> {
    const response = await api.get<Blob>(
      `/admin/drivers/${driverId}/documents/${documentId}/file`,
      { responseType: "blob" },
    );
    return URL.createObjectURL(response.data);
  },

  // -------------------------------------------------------------------------
  // Employees
  //
  // A plain account with no onboarding record behind it, so the whole module is
  // these six calls. Customers used to share this shape and have a full module
  // of their own below now.
  // -------------------------------------------------------------------------

  simpleAccounts(path: SimpleAccountPath) {
    const base = `/admin/${path}`;
    return {
      list(params: SimpleAccountListParams = {}): Promise<SimpleAccountListResult> {
        return request<SimpleAccountListResult>({ url: base, method: "GET", params });
      },
      get(id: string): Promise<SimpleAccount> {
        return request<SimpleAccount>({ url: `${base}/${id}`, method: "GET" });
      },
      create(values: Record<string, unknown>): Promise<SimpleAccount> {
        return request<SimpleAccount>({ url: base, method: "POST", data: values });
      },
      update(id: string, values: Record<string, unknown>): Promise<SimpleAccount> {
        return request<SimpleAccount>({ url: `${base}/${id}`, method: "PUT", data: values });
      },
      remove(id: string) {
        return request<{ id: string; email: string }>({ url: `${base}/${id}`, method: "DELETE" });
      },
      setPassword(id: string, password: string) {
        return request<{ id: string; email: string }>({
          url: `${base}/${id}/password`,
          method: "PUT",
          data: { password },
        });
      },
    };
  },

  // -------------------------------------------------------------------------
  // Vendors
  // -------------------------------------------------------------------------

  listVendors(params: VendorListParams = {}): Promise<VendorListResult> {
    return request<VendorListResult>({ url: "/admin/vendors", method: "GET", params });
  },

  /** One vendor in full: the same shape the vendor sees of themselves. */
  getVendor(vendorId: string): Promise<VendorOnboardingData> {
    return request<VendorOnboardingData>({ url: `/admin/vendors/${vendorId}`, method: "GET" });
  },

  createVendor(values: CreateVendorInput): Promise<AdminVendorRow> {
    return request<AdminVendorRow>({ url: "/admin/vendors", method: "POST", data: values });
  },

  updateVendor(vendorId: string, values: UpdateVendorInput): Promise<AdminVendorRow> {
    return request<AdminVendorRow>({
      url: `/admin/vendors/${vendorId}`,
      method: "PUT",
      data: values,
    });
  },

  deleteVendor(vendorId: string) {
    return request({ url: `/admin/vendors/${vendorId}`, method: "DELETE" });
  },

  /** Replaces a vendor's password and signs every one of their sessions out. */
  setVendorPassword(vendorId: string, password: string) {
    return request<{ id: string; email: string }>({
      url: `/admin/vendors/${vendorId}/password`,
      method: "PUT",
      data: { password },
    });
  },

  /**
   * The onboarding record of one vendor, written by an admin. Shaped to match
   * `vendorService` method for method so it satisfies `VendorOnboardingGateway`,
   * which is what lets the Admin portal reuse the vendor's own form.
   */
  vendorOnboarding(vendorId: string): VendorOnboardingGateway {
    const base = `/admin/vendors/${vendorId}`;
    const section = <T,>(path: string) => (values: T) =>
      request({ url: `${base}/onboarding/${path}`, method: "PUT", data: values });

    return {
      saveCompany: section("company"),
      saveContacts: section("contacts"),
      saveDirectors: (directors) =>
        request({ url: `${base}/onboarding/directors`, method: "PUT", data: { directors } }),
      saveBank: section("bank"),
      saveAddresses: section("addresses"),
      saveCoverage: section("coverage"),
      saveWarehouses: (warehouses) =>
        request({ url: `${base}/onboarding/warehouses`, method: "PUT", data: { warehouses } }),
      saveYards: (yards) =>
        request({ url: `${base}/onboarding/yards`, method: "PUT", data: { yards } }),
      saveAccreditation: section("accreditation"),
      saveInsurances: (insurances) =>
        request({ url: `${base}/onboarding/insurances`, method: "PUT", data: { insurances } }),

      async uploadDocument(input) {
        const form = new FormData();
        form.append("file", input.file);
        form.append("docType", input.docType);
        if (input.category) form.append("category", input.category);
        if (input.issueDate) form.append("issueDate", input.issueDate);
        if (input.expiryDate) form.append("expiryDate", input.expiryDate);

        const response = await api.post<{ data: VendorDocument }>(`${base}/documents`, form, {
          // Let the browser set the multipart boundary.
          headers: { "Content-Type": undefined },
          onUploadProgress(event) {
            if (!input.onProgress || !event.total) return;
            input.onProgress(Math.round((event.loaded / event.total) * 100));
          },
        });

        return response.data.data;
      },

      updateDocument(documentId, values) {
        return request({ url: `${base}/documents/${documentId}`, method: "PATCH", data: values });
      },

      deleteDocument(documentId) {
        return request({ url: `${base}/documents/${documentId}`, method: "DELETE" });
      },
    };
  },

  reviewVendor(vendorId: string, decision: ReviewDecision, reason?: string | null) {
    return request<AdminVendorRow>({
      url: `/admin/vendors/${vendorId}/review`,
      method: "POST",
      data: { decision, reason: reason ?? null },
    });
  },

  reviewVendorSection(
    vendorId: string,
    section: ReviewableVendorSection,
    status: VerificationStatus,
    remarks?: string | null,
  ) {
    return request({
      url: `/admin/vendors/${vendorId}/sections/${section}/review`,
      method: "POST",
      data: { status, remarks: remarks ?? null },
    });
  },

  /** Short lived blob storage link for one of a vendor's documents. */
  vendorDocumentLink(vendorId: string, documentId: string) {
    return request<{ url: string; expiresAt: string | null; fileName: string; mimeType: string }>({
      url: `/admin/vendors/${vendorId}/documents/${documentId}/url`,
      method: "GET",
    });
  },

  async fetchVendorDocumentBlobUrl(vendorId: string, documentId: string): Promise<string> {
    const response = await api.get<Blob>(
      `/admin/vendors/${vendorId}/documents/${documentId}/file`,
      { responseType: "blob" },
    );
    return URL.createObjectURL(response.data);
  },

  // -------------------------------------------------------------------------
  // Customers
  // -------------------------------------------------------------------------

  listCustomers(params: CustomerListParams = {}): Promise<CustomerListResult> {
    return request<CustomerListResult>({ url: "/admin/customers", method: "GET", params });
  },

  /** One customer in full: the same shape the customer sees of themselves. */
  getCustomer(customerId: string): Promise<CustomerOnboardingData> {
    return request<CustomerOnboardingData>({
      url: `/admin/customers/${customerId}`,
      method: "GET",
    });
  },

  createCustomer(values: CreateCustomerInput): Promise<AdminCustomerRow> {
    return request<AdminCustomerRow>({ url: "/admin/customers", method: "POST", data: values });
  },

  updateCustomer(customerId: string, values: UpdateCustomerInput): Promise<AdminCustomerRow> {
    return request<AdminCustomerRow>({
      url: `/admin/customers/${customerId}`,
      method: "PUT",
      data: values,
    });
  },

  deleteCustomer(customerId: string) {
    return request({ url: `/admin/customers/${customerId}`, method: "DELETE" });
  },

  /** Replaces a customer's password and signs every one of their sessions out. */
  setCustomerPassword(customerId: string, password: string) {
    return request<{ id: string; email: string }>({
      url: `/admin/customers/${customerId}/password`,
      method: "PUT",
      data: { password },
    });
  },

  /**
   * The onboarding record of one customer, written by an admin. Shaped to match
   * `customerService` method for method so it satisfies
   * `CustomerOnboardingGateway`, which is what lets the Admin portal reuse the
   * customer's own form.
   */
  customerOnboarding(customerId: string): CustomerOnboardingGateway {
    const base = `/admin/customers/${customerId}`;
    const section = <T,>(path: string) => (values: T) =>
      request({ url: `${base}/onboarding/${path}`, method: "PUT", data: values });

    return {
      saveCompany: section("company"),
      saveContacts: section("contacts"),
      saveDirectors: (directors) =>
        request({ url: `${base}/onboarding/directors`, method: "PUT", data: { directors } }),
      saveAddresses: section("addresses"),
      saveBilling: section("billing"),

      async uploadDocument(input) {
        const form = new FormData();
        form.append("file", input.file);
        form.append("docType", input.docType);
        if (input.category) form.append("category", input.category);
        if (input.issueDate) form.append("issueDate", input.issueDate);
        if (input.expiryDate) form.append("expiryDate", input.expiryDate);

        const response = await api.post<{ data: CustomerDocument }>(`${base}/documents`, form, {
          // Let the browser set the multipart boundary.
          headers: { "Content-Type": undefined },
          onUploadProgress(event) {
            if (!input.onProgress || !event.total) return;
            input.onProgress(Math.round((event.loaded / event.total) * 100));
          },
        });

        return response.data.data;
      },

      updateDocument(documentId, values) {
        return request({ url: `${base}/documents/${documentId}`, method: "PATCH", data: values });
      },

      deleteDocument(documentId) {
        return request({ url: `${base}/documents/${documentId}`, method: "DELETE" });
      },
    };
  },

  reviewCustomer(customerId: string, decision: ReviewDecision, reason?: string | null) {
    return request<AdminCustomerRow>({
      url: `/admin/customers/${customerId}/review`,
      method: "POST",
      data: { decision, reason: reason ?? null },
    });
  },

  /** Short lived blob storage link for one of a customer's documents. */
  customerDocumentLink(customerId: string, documentId: string) {
    return request<{ url: string; expiresAt: string | null; fileName: string; mimeType: string }>({
      url: `/admin/customers/${customerId}/documents/${documentId}/url`,
      method: "GET",
    });
  },

  async fetchCustomerDocumentBlobUrl(customerId: string, documentId: string): Promise<string> {
    const response = await api.get<Blob>(
      `/admin/customers/${customerId}/documents/${documentId}/file`,
      { responseType: "blob" },
    );
    return URL.createObjectURL(response.data);
  },

  // -------------------------------------------------------------------------
  // The admin's own account
  // -------------------------------------------------------------------------

  me(): Promise<AdminProfile> {
    return request<AdminProfile>({ url: "/admin/me", method: "GET" });
  },

  updateMe(values: { firstName?: string; lastName?: string | null; phone?: string | null }) {
    return request<AdminProfile>({ url: "/admin/me", method: "PUT", data: values });
  },

  /** Uploads to the admin container, kept apart from driver documents. */
  async uploadAvatar(file: File): Promise<{ id: string; avatarUrl: string | null }> {
    const form = new FormData();
    form.append("file", file);
    const response = await api.post<{ data: { id: string; avatarUrl: string | null } }>(
      "/admin/me/avatar",
      form,
      { headers: { "Content-Type": undefined } },
    );
    return response.data.data;
  },

  avatarLink() {
    return request<{ url: string; expiresAt: string | null }>({
      url: "/admin/me/avatar/url",
      method: "GET",
    });
  },
};

export type {
  DriverDocument,
  DriverOnboardingData,
  VendorOnboardingData,
  CustomerOnboardingData,
};
