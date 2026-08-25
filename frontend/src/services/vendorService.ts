import { api, request } from "./api";
import type { DocumentLink, OnboardingStatus, VerificationStatus } from "./driverService";

/**
 * Supplier module API. Every path lives under `/api/vendor`, which the backend
 * locks to an authenticated supplier, so these calls always act on the signed in
 * supplier's own records.
 */

export type VendorDocumentType =
  | "COMPANY_LOGO"
  | "ACCREDITATION"
  | "INSURANCE_PRODUCT_LIABILITY"
  | "INSURANCE_PUBLIC_LIABILITY"
  | "INSURANCE_WORK_COVER"
  | "INSURANCE_MARINE_GENERAL"
  | "INSURANCE_MARINE_ALCOHOL"
  | "INSURANCE_COC"
  | "COMPLIANCE_DRUG"
  | "COMPLIANCE_ALCOHOL_POLICY"
  | "COMPLIANCE_PROCEDURE"
  | "COMPLIANCE_RISK_MANAGEMENT"
  | "COMPLIANCE_SPEED_POLICY"
  | "COMPLIANCE_FATIGUE_POLICY"
  | "COMPLIANCE_GPS_SNAPSHOT"
  | "COMPLIANCE_WHS_POLICY"
  | "COMPLIANCE_ADDITIONAL";

export type VendorContactType = "OPERATIONS" | "COMPLIANCE" | "ADMIN" | "DISPATCH";

export type VendorInsuranceType =
  | "PRODUCT_LIABILITY"
  | "PUBLIC_LIABILITY"
  | "WORK_COVER"
  | "MARINE_GENERAL"
  | "MARINE_ALCOHOL"
  | "COC";

export interface VendorDocument {
  id: string;
  docType: VendorDocumentType;
  category: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  fileName: string;
  storageUrl: string | null;
  mimeType: string;
  sizeInBytes: number;
  createdAt: string;
}

export interface VendorContactPayload {
  type: VendorContactType;
  contactPerson: string | null;
  designation: string | null;
  contactNumber: string | null;
  email: string | null;
}

export interface VendorDirectorPayload {
  designation: string | null;
  email: string | null;
  contactNumber: string | null;
}

export interface VendorBankPayload {
  accountName: string | null;
  bankName: string | null;
  bsb: string | null;
  accountNumber: string | null;
}

export interface VendorCoveragePayload {
  areasCovered: string[];
  businessOperations: string[];
}

/** The two addresses the company is registered at, sent together. */
export interface VendorAddressesPayload {
  billingSameAsPrincipal: boolean;
  principal: VendorAddressPayload;
  billing: VendorAddressPayload;
}

export interface VendorAddressPayload {
  street1: string | null;
  street2: string | null;
  suburb: string | null;
  state: string | null;
  country: string | null;
  postCode: string | null;
}

export interface VendorWarehousePayload {
  street1: string | null;
  street2: string | null;
  suburb: string | null;
  state: string | null;
  country: string | null;
  postCode: string | null;
}

export interface VendorAccreditationPayload {
  accreditationNumber: string | null;
  massManagementExpiry: string | null;
  basicFatigueExpiry: string | null;
  dangerousGoodsExpiry: string | null;
  nhvasExpiry: string | null;
  haccpExpiry: string | null;
}

export interface VendorInsurancePayload {
  type: VendorInsuranceType;
  policyNumber: string | null;
  insurer: string | null;
  expiryDate: string | null;
  sumAssured: string | null;
  employerNumber: string | null;
  validFrom: string | null;
  validTill: string | null;
  dueInDays: number | null;
}

/** Company details. The email is absent on purpose: it identifies the account. */
export interface VendorCompanyPayload {
  companyName: string;
  tradingNames: string[];
  legalName: string | null;
  abn: string | null;
  acn: string | null;
  abnStatus: string | null;
  entityType: string | null;
  websiteAddress: string | null;
  phone: string | null;
  contactPerson: string | null;
}

/** A stored section also reports where its review stands. */
type Reviewed<T> = T & { verificationStatus: VerificationStatus };

export interface VendorOnboardingData {
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
  supplierId: string | null;
  websiteAddress: string | null;
  contactPerson: string | null;
  logoUrl: string | null;
  invoicePreference: string | null;
  invoiceEmails: string[];
  invoiceOther: string | null;
  status: "PENDING" | "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
  onboardingStatus: OnboardingStatus;
  onboardingStep: number;
  submittedAt: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  contacts: Array<VendorContactPayload & { id: string }>;
  directors: Array<VendorDirectorPayload & { id: string; position: number }>;
  bankDetail: (VendorBankPayload & { id: string }) | null;
  coverage: (VendorCoveragePayload & { id: string }) | null;
  billingSameAsPrincipal: boolean;
  addresses: Array<VendorAddressPayload & { id: string; type: "PRINCIPAL" | "BILLING" }>;
  warehouses: Array<VendorWarehousePayload & { id: string; position: number }>;
  yards: Array<VendorWarehousePayload & { id: string; position: number }>;
  accreditation: Reviewed<VendorAccreditationPayload> | null;
  insurances: Array<Reviewed<VendorInsurancePayload> & { id: string }>;
  documents: VendorDocument[];
}

export const vendorService = {
  getOnboarding(): Promise<VendorOnboardingData> {
    return request<VendorOnboardingData>({ url: "/vendor/onboarding", method: "GET" });
  },

  saveCompany(values: VendorCompanyPayload) {
    return request({ url: "/vendor/onboarding/company", method: "PUT", data: values });
  },

  saveContacts(values: {
    contacts: VendorContactPayload[];
    invoicePreference: string | null;
    invoiceEmails: string[];
    invoiceOther: string | null;
  }) {
    return request({ url: "/vendor/onboarding/contacts", method: "PUT", data: values });
  },

  saveDirectors(directors: VendorDirectorPayload[]) {
    return request({ url: "/vendor/onboarding/directors", method: "PUT", data: { directors } });
  },

  saveBank(values: VendorBankPayload) {
    return request({ url: "/vendor/onboarding/bank", method: "PUT", data: values });
  },

  saveCoverage(values: VendorCoveragePayload) {
    return request({ url: "/vendor/onboarding/coverage", method: "PUT", data: values });
  },

  saveAddresses(values: VendorAddressesPayload) {
    return request({ url: "/vendor/onboarding/addresses", method: "PUT", data: values });
  },

  saveWarehouses(warehouses: VendorWarehousePayload[]) {
    return request({ url: "/vendor/onboarding/warehouses", method: "PUT", data: { warehouses } });
  },

  saveYards(yards: VendorWarehousePayload[]) {
    return request({ url: "/vendor/onboarding/yards", method: "PUT", data: { yards } });
  },

  saveAccreditation(values: VendorAccreditationPayload) {
    return request({ url: "/vendor/onboarding/accreditation", method: "PUT", data: values });
  },

  saveInsurances(insurances: VendorInsurancePayload[]) {
    return request({ url: "/vendor/onboarding/insurances", method: "PUT", data: { insurances } });
  },

  saveProgress(step: number) {
    return request({ url: "/vendor/onboarding/progress", method: "POST", data: { step } });
  },

  submit() {
    return request({ url: "/vendor/onboarding/submit", method: "POST" });
  },

  listDocuments(docType?: VendorDocumentType): Promise<VendorDocument[]> {
    return request<VendorDocument[]>({
      url: "/vendor/documents",
      method: "GET",
      params: docType ? { docType } : undefined,
    });
  },

  async uploadDocument(input: {
    file: File;
    docType: VendorDocumentType;
    category?: string;
    /** yyyy-MM-dd. */
    issueDate?: string;
    expiryDate?: string;
    onProgress?: (percent: number) => void;
  }): Promise<VendorDocument> {
    const form = new FormData();
    form.append("file", input.file);
    form.append("docType", input.docType);
    if (input.category) form.append("category", input.category);
    if (input.issueDate) form.append("issueDate", input.issueDate);
    if (input.expiryDate) form.append("expiryDate", input.expiryDate);

    const response = await api.post<{ data: VendorDocument }>("/vendor/documents", form, {
      // Let the browser set the multipart boundary.
      headers: { "Content-Type": undefined },
      onUploadProgress(event) {
        if (!input.onProgress || !event.total) return;
        input.onProgress(Math.round((event.loaded / event.total) * 100));
      },
    });

    return response.data.data;
  },

  /**
   * Corrects the metadata of a file that is already stored. The bytes never
   * change here: replacing those means uploading again.
   */
  updateDocument(
    documentId: string,
    values: { category: string | null; issueDate: string | null; expiryDate: string | null },
  ) {
    return request({ url: `/vendor/documents/${documentId}`, method: "PATCH", data: values });
  },

  deleteDocument(documentId: string) {
    return request({ url: `/vendor/documents/${documentId}`, method: "DELETE" });
  },

  /**
   * Short lived link for previewing or downloading a stored file.
   *
   * In production this is a read only Azure Blob Storage SAS URL, so it can go
   * straight into an `<img src>` or `<a href>` where no Authorization header is
   * ever sent. In local development it comes back as the API path below, which
   * the authenticated fetch helper handles instead.
   */
  documentLink(documentId: string): Promise<DocumentLink> {
    return request<DocumentLink>({ url: `/vendor/documents/${documentId}/url`, method: "GET" });
  },

  /**
   * Authenticated download that streams through the API. Returns an object URL
   * the caller must release with `URL.revokeObjectURL` when it is finished.
   */
  async fetchDocumentBlobUrl(documentId: string): Promise<string> {
    const response = await api.get<Blob>(`/vendor/documents/${documentId}/file`, {
      responseType: "blob",
    });
    return URL.createObjectURL(response.data);
  },
};
