import { api, request } from "./api";

/**
 * Driver module API. Every path lives under `/api/driver`, which the backend
 * locks to an authenticated driver, so these calls always act on the signed in
 * driver's own records.
 */

export type DriverDocumentType =
  | "PROFILE_PHOTO"
  | "LICENCE_FRONT"
  | "LICENCE_BACK"
  | "DRIVING_HISTORY"
  | "POLICE_VERIFICATION"
  | "VISA"
  | "MEDICAL"
  | "DRUG_TEST"
  | "ADDITIONAL";

export type OnboardingStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED";

export interface DriverDocument {
  id: string;
  docType: DriverDocumentType;
  category: string | null;
  fileName: string;
  storageUrl: string | null;
  mimeType: string;
  sizeInBytes: number;
  createdAt: string;
}

export interface DocumentLink {
  documentId: string;
  fileName: string;
  mimeType: string;
  url: string;
  /** null when the link cannot expire (local development fallback). */
  expiresAt: string | null;
}

export interface DriverAddressPayload {
  houseNumber: string | null;
  street: string | null;
  suburb: string | null;
  state: string | null;
  country: string | null;
  postCode: string | null;
}

export interface DriverOnboardingData {
  id: string;
  email: string;
  phone: string | null;
  firstName: string;
  middleName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  nationality: string | null;
  avatarUrl: string | null;
  onboardingStatus: OnboardingStatus;
  onboardingStep: number;
  submittedAt: string | null;
  addresses: Array<DriverAddressPayload & { id: string; type: "CURRENT" | "PERMANENT" }>;
  licence: Record<string, unknown> | null;
  drivingHistory: Record<string, unknown> | null;
  policeVerification: Record<string, unknown> | null;
  visa: Record<string, unknown> | null;
  medical: Record<string, unknown> | null;
  drugTest: Record<string, unknown> | null;
  documents: DriverDocument[];
}

export const driverService = {
  getOnboarding(): Promise<DriverOnboardingData> {
    return request<DriverOnboardingData>({ url: "/driver/onboarding", method: "GET" });
  },

  savePersonal(values: Record<string, unknown>) {
    return request({ url: "/driver/onboarding/personal", method: "PUT", data: values });
  },

  saveAddress(values: {
    currentAddress: DriverAddressPayload;
    sameAsCurrent: boolean;
    permanentAddress?: DriverAddressPayload;
  }) {
    return request({ url: "/driver/onboarding/address", method: "PUT", data: values });
  },

  saveLicence(values: Record<string, unknown>) {
    return request({ url: "/driver/onboarding/licence", method: "PUT", data: values });
  },

  saveDrivingHistory(values: Record<string, unknown>) {
    return request({ url: "/driver/onboarding/driving-history", method: "PUT", data: values });
  },

  savePoliceVerification(values: Record<string, unknown>) {
    return request({ url: "/driver/onboarding/police-verification", method: "PUT", data: values });
  },

  saveVisa(values: Record<string, unknown>) {
    return request({ url: "/driver/onboarding/visa", method: "PUT", data: values });
  },

  saveMedical(values: Record<string, unknown>) {
    return request({ url: "/driver/onboarding/medical", method: "PUT", data: values });
  },

  saveDrugTest(values: Record<string, unknown>) {
    return request({ url: "/driver/onboarding/drug-test", method: "PUT", data: values });
  },

  saveProgress(step: number) {
    return request({ url: "/driver/onboarding/progress", method: "POST", data: { step } });
  },

  submit() {
    return request({ url: "/driver/onboarding/submit", method: "POST" });
  },

  listDocuments(docType?: DriverDocumentType): Promise<DriverDocument[]> {
    return request<DriverDocument[]>({
      url: "/driver/documents",
      method: "GET",
      params: docType ? { docType } : undefined,
    });
  },

  async uploadDocument(input: {
    file: File;
    docType: DriverDocumentType;
    category?: string;
    onProgress?: (percent: number) => void;
  }): Promise<DriverDocument> {
    const form = new FormData();
    form.append("file", input.file);
    form.append("docType", input.docType);
    if (input.category) form.append("category", input.category);

    const response = await api.post<{ data: DriverDocument }>("/driver/documents", form, {
      // Let the browser set the multipart boundary.
      headers: { "Content-Type": undefined },
      onUploadProgress(event) {
        if (!input.onProgress || !event.total) return;
        input.onProgress(Math.round((event.loaded / event.total) * 100));
      },
    });

    return response.data.data;
  },

  deleteDocument(documentId: string) {
    return request({ url: `/driver/documents/${documentId}`, method: "DELETE" });
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
    return request<DocumentLink>({ url: `/driver/documents/${documentId}/url`, method: "GET" });
  },

  /**
   * Authenticated download that streams through the API. Returns an object URL
   * the caller must release with `URL.revokeObjectURL` when it is finished.
   */
  async fetchDocumentBlobUrl(documentId: string): Promise<string> {
    const response = await api.get<Blob>(`/driver/documents/${documentId}/file`, {
      responseType: "blob",
    });
    return URL.createObjectURL(response.data);
  },
};
