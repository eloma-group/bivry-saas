import { api, request } from "./api";
import type {
  DriverAddressPayload,
  DriverDocument,
  DriverOnboardingData,
  OnboardingStatus,
  VerificationStatus,
  ApiLicenceType,
} from "./driverService";
import type { VendorOnboardingData } from "./vendorService";

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
  nationality: string | null;
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

/** A supplier as the list endpoint returns them: enough for a table row. */
export interface AdminVendorRow {
  id: string;
  email: string;
  phone: string | null;
  companyName: string;
  tradingName: string | null;
  legalName: string | null;
  abn: string | null;
  supplierId: string | null;
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
    nhvasExpiry: string | null;
    verificationStatus: VerificationStatus;
  } | null;
  coverage: { areasCovered: string[]; businessOperations: string[] } | null;
  warehouses: Array<{ suburb: string | null; state: string | null; country: string | null }>;
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
  documents: { total: number; totalBytes: number };
  recentDrivers: AdminDriverRow[];
  recentVendors: AdminVendorRow[];
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
  nationality?: string | null;
  status?: AccountStatus;
}

export type UpdateDriverInput = Partial<Omit<CreateDriverInput, "email" | "password">>;

export type ReviewDecision = "APPROVED" | "REJECTED" | "UNDER_REVIEW";

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
  tradingName?: string | null;
  legalName?: string | null;
  contactPerson?: string | null;
  abn?: string | null;
  websiteAddress?: string | null;
  status?: AccountStatus;
}

export type UpdateVendorInput = Partial<Omit<CreateVendorInput, "email" | "password">>;

/** Supplier sections an admin can verify one at a time. */
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
  // Suppliers
  // -------------------------------------------------------------------------

  listVendors(params: VendorListParams = {}): Promise<VendorListResult> {
    return request<VendorListResult>({ url: "/admin/vendors", method: "GET", params });
  },

  /** One supplier in full: the same shape the supplier sees of themselves. */
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

  /** Short lived blob storage link for one of a supplier's documents. */
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

export type { DriverDocument, DriverOnboardingData, VendorOnboardingData };
