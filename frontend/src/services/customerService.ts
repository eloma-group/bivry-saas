import { api, request } from "./api";
import type { DocumentLink, OnboardingStatus } from "./driverService";

/**
 * Customer module API. Every path lives under `/api/customer`, which the backend
 * locks to an authenticated customer, so these calls always act on the signed in
 * customer's own records.
 */

export type CustomerDocumentType = "COMPANY_LOGO" | "CONTRACT" | "ADDITIONAL";

export type CustomerContactType = "MAIN" | "OPERATIONS" | "ACCOUNTS" | "DISPATCH";

export type CustomerBillingTypeApi = "INVOICING" | "RCTI";

export interface CustomerDocument {
  id: string;
  docType: CustomerDocumentType;
  category: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  fileName: string;
  storageUrl: string | null;
  mimeType: string;
  sizeInBytes: number;
  createdAt: string;
}

export interface CustomerContactPayload {
  type: CustomerContactType;
  contactPerson: string | null;
  designation: string | null;
  contactNumber: string | null;
  email: string | null;
}

/** One block the customer added beyond the four departments. */
export interface CustomerAdditionalContactPayload {
  label: string | null;
  contactPerson: string | null;
  designation: string | null;
  contactNumber: string | null;
  email: string | null;
}

export interface CustomerDirectorPayload {
  name: string | null;
  email: string | null;
  contactNumber: string | null;
}

export interface CustomerAddressPayload {
  street1: string | null;
  street2: string | null;
  suburb: string | null;
  state: string | null;
  country: string | null;
  postCode: string | null;
}

/**
 * The address section, sent as a whole: the two addresses the company is
 * registered at, and every warehouse it operates.
 */
export interface CustomerAddressesPayload {
  billingSameAsPrincipal: boolean;
  principal: CustomerAddressPayload;
  billing: CustomerAddressPayload;
  warehouses: CustomerAddressPayload[];
}

export interface CustomerBillingPayload {
  term: string | null;
  billingType: CustomerBillingTypeApi | null;
}

/**
 * Company details.
 *
 * The email is absent on purpose: it identifies the account. So are the account
 * holder's name, designation and phone - the section is about the business, and
 * the people we speak to live in the Communication section instead.
 */
export interface CustomerCompanyPayload {
  companyName: string | null;
  tradingNames: string[];
  legalName: string | null;
  abn: string | null;
  acn: string | null;
  abnStatus: string | null;
  entityType: string | null;
  gst: string | null;
  websiteAddress: string | null;
  /** yyyy-MM-dd. */
  creationDate: string | null;
}

export interface CustomerOnboardingData {
  id: string;
  email: string;
  phone: string | null;
  accountNumber: string | null;
  cid: string | null;
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
  logoUrl: string | null;
  status: "PENDING" | "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
  onboardingStatus: OnboardingStatus;
  onboardingStep: number;
  submittedAt: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  billingSameAsPrincipal: boolean;
  contacts: Array<CustomerContactPayload & { id: string }>;
  additionalContacts: Array<
    CustomerAdditionalContactPayload & { id: string; position: number }
  >;
  directors: Array<CustomerDirectorPayload & { id: string; position: number }>;
  addresses: Array<
    CustomerAddressPayload & { id: string; type: "PRINCIPAL" | "BILLING" }
  >;
  warehouses: Array<CustomerAddressPayload & { id: string; position: number }>;
  billing: (CustomerBillingPayload & { id: string }) | null;
  documents: CustomerDocument[];
}

export const customerService = {
  getOnboarding(): Promise<CustomerOnboardingData> {
    return request<CustomerOnboardingData>({ url: "/customer/onboarding", method: "GET" });
  },

  saveCompany(values: CustomerCompanyPayload) {
    return request({ url: "/customer/onboarding/company", method: "PUT", data: values });
  },

  saveContacts(values: {
    contacts: CustomerContactPayload[];
    additionalContacts: CustomerAdditionalContactPayload[];
  }) {
    return request({ url: "/customer/onboarding/contacts", method: "PUT", data: values });
  },

  saveDirectors(directors: CustomerDirectorPayload[]) {
    return request({
      url: "/customer/onboarding/directors",
      method: "PUT",
      data: { directors },
    });
  },

  saveAddresses(values: CustomerAddressesPayload) {
    return request({ url: "/customer/onboarding/addresses", method: "PUT", data: values });
  },

  saveBilling(values: CustomerBillingPayload) {
    return request({ url: "/customer/onboarding/billing", method: "PUT", data: values });
  },

  saveProgress(step: number) {
    return request({ url: "/customer/onboarding/progress", method: "POST", data: { step } });
  },

  submit() {
    return request({ url: "/customer/onboarding/submit", method: "POST" });
  },

  listDocuments(docType?: CustomerDocumentType): Promise<CustomerDocument[]> {
    return request<CustomerDocument[]>({
      url: "/customer/documents",
      method: "GET",
      params: docType ? { docType } : undefined,
    });
  },

  async uploadDocument(input: {
    file: File;
    docType: CustomerDocumentType;
    category?: string;
    /** yyyy-MM-dd. */
    issueDate?: string;
    expiryDate?: string;
    onProgress?: (percent: number) => void;
  }): Promise<CustomerDocument> {
    const form = new FormData();
    form.append("file", input.file);
    form.append("docType", input.docType);
    if (input.category) form.append("category", input.category);
    if (input.issueDate) form.append("issueDate", input.issueDate);
    if (input.expiryDate) form.append("expiryDate", input.expiryDate);

    const response = await api.post<{ data: CustomerDocument }>("/customer/documents", form, {
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
    return request({ url: `/customer/documents/${documentId}`, method: "PATCH", data: values });
  },

  deleteDocument(documentId: string) {
    return request({ url: `/customer/documents/${documentId}`, method: "DELETE" });
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
    return request<DocumentLink>({
      url: `/customer/documents/${documentId}/url`,
      method: "GET",
    });
  },

  /**
   * Authenticated download that streams through the API. Returns an object URL
   * the caller must release with `URL.revokeObjectURL` when it is finished.
   */
  async fetchDocumentBlobUrl(documentId: string): Promise<string> {
    const response = await api.get<Blob>(`/customer/documents/${documentId}/file`, {
      responseType: "blob",
    });
    return URL.createObjectURL(response.data);
  },
};
