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
  | "PASSPORT_FRONT"
  | "PASSPORT_BACK"
  | "MEDICARE"
  | "ADDITIONAL";

export type OnboardingStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED";

/** Where a single onboarding section stands with the compliance team. */
export type VerificationStatus = "PENDING" | "VERIFIED" | "REJECTED" | "EXPIRED";

/** Licence classes as the database stores them. */
export type ApiLicenceType =
  | "CAR"
  | "HEAVY_RIGID"
  | "HEAVY_COMBINATION"
  | "MULTI_COMBINATION"
  | "MOTORCYCLE";

export interface DriverDocument {
  id: string;
  docType: DriverDocumentType;
  category: string | null;
  /** Only additional documents carry one. */
  expiryDate: string | null;
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

/** Personal details. The email is absent on purpose: it identifies the account. */
export interface PersonalPayload {
  firstName: string;
  middleName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  nationality: string | null;
  phone: string | null;
}

export interface LicencePayload {
  licenceNumber: string | null;
  licenceCardNumber: string | null;
  licenceType: ApiLicenceType | null;
  issuingState: string | null;
  expiryDate: string | null;
}

/** Driving history, police check and medical all carry an issue + expiry date. */
export interface IssueExpiryPayload {
  issueDate: string | null;
  expiryDate: string | null;
}

export interface VisaPayload {
  visaStatus: string | null;
  visaType: string | null;
  expiryDate: string | null;
}

/** Asked of Australian nationals, who hold no visa. */
export interface PassportPayload {
  passportNumber: string | null;
  expiryDate: string | null;
}

export interface MedicarePayload {
  cardNumber: string | null;
  expiryDate: string | null;
}

/** A stored section also reports where its review stands. */
type Reviewed<T> = T & { verificationStatus: VerificationStatus };

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
  status: "PENDING" | "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
  onboardingStatus: OnboardingStatus;
  onboardingStep: number;
  submittedAt: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  addresses: Array<DriverAddressPayload & { id: string; type: "CURRENT" | "PERMANENT" }>;
  licence: Reviewed<LicencePayload> | null;
  drivingHistory: Reviewed<IssueExpiryPayload> | null;
  policeVerification: Reviewed<IssueExpiryPayload> | null;
  visa: Reviewed<VisaPayload> | null;
  passport: Reviewed<PassportPayload> | null;
  medicare: Reviewed<MedicarePayload> | null;
  medical: Reviewed<IssueExpiryPayload> | null;
  drugTest: Reviewed<IssueExpiryPayload> | null;
  documents: DriverDocument[];
}

export const driverService = {
  getOnboarding(): Promise<DriverOnboardingData> {
    return request<DriverOnboardingData>({ url: "/driver/onboarding", method: "GET" });
  },

  savePersonal(values: PersonalPayload) {
    return request({ url: "/driver/onboarding/personal", method: "PUT", data: values });
  },

  saveAddress(values: {
    currentAddress: DriverAddressPayload;
    sameAsCurrent: boolean;
    permanentAddress?: DriverAddressPayload;
  }) {
    return request({ url: "/driver/onboarding/address", method: "PUT", data: values });
  },

  saveLicence(values: LicencePayload) {
    return request({ url: "/driver/onboarding/licence", method: "PUT", data: values });
  },

  saveDrivingHistory(values: IssueExpiryPayload) {
    return request({ url: "/driver/onboarding/driving-history", method: "PUT", data: values });
  },

  savePoliceVerification(values: IssueExpiryPayload) {
    return request({ url: "/driver/onboarding/police-verification", method: "PUT", data: values });
  },

  saveVisa(values: VisaPayload) {
    return request({ url: "/driver/onboarding/visa", method: "PUT", data: values });
  },

  savePassport(values: PassportPayload) {
    return request({ url: "/driver/onboarding/passport", method: "PUT", data: values });
  },

  saveMedicare(values: MedicarePayload) {
    return request({ url: "/driver/onboarding/medicare", method: "PUT", data: values });
  },

  saveMedical(values: IssueExpiryPayload) {
    return request({ url: "/driver/onboarding/medical", method: "PUT", data: values });
  },

  saveDrugTest(values: IssueExpiryPayload) {
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
    /** yyyy-MM-dd. Only additional documents carry one. */
    expiryDate?: string;
    onProgress?: (percent: number) => void;
  }): Promise<DriverDocument> {
    const form = new FormData();
    form.append("file", input.file);
    form.append("docType", input.docType);
    if (input.category) form.append("category", input.category);
    if (input.expiryDate) form.append("expiryDate", input.expiryDate);

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

  /**
   * Corrects the metadata of a file that is already stored. The bytes never
   * change here: replacing those means uploading again.
   */
  updateDocument(
    documentId: string,
    values: { category: string | null; expiryDate: string | null },
  ) {
    return request({ url: `/driver/documents/${documentId}`, method: "PATCH", data: values });
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
