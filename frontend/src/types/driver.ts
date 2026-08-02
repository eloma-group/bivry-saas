/**
 * A file in the form.
 *
 * Freshly picked or captured files carry their bytes as a preview-able data URL.
 * Files that are already stored on the server come back with a `documentId` and
 * an empty `dataUrl` instead: their bytes stay on the server and are only
 * fetched when someone asks to view them.
 */
export interface UploadedFile {
  name: string;
  size: number;
  type: string;
  dataUrl: string;
  /** Set once the file lives in the driver's document store. */
  documentId?: string;
}

export type LicenceType =
  | "Car"
  | "Heavy Rigid"
  | "Heavy Combination"
  | "Multi Combination"
  | "Motorcycle";

export interface AddressBlock {
  houseNumber: string;
  street: string;
  suburb: string;
  state: string;
  country: string;
  postCode: string;
}

export interface AdditionalDoc {
  id: string;
  category: string;
  file: UploadedFile | null;
}

export interface DriverFormValues {
  /* Section 1 - Personal */
  firstName: string;
  middleName: string;
  lastName: string;
  dob: string;
  nationality: string;
  phone: string;
  email: string;
  profilePhoto: UploadedFile | null;

  /* Section 2 - Address */
  currentAddress: AddressBlock;
  sameAsCurrent: boolean;
  permanentAddress: AddressBlock;

  /* Section 3 - Licence */
  licenceNumber: string;
  licenceCardNumber: string;
  licenceType: LicenceType | "";
  licenceState: string;
  licenceExpiry: string;
  licenceFront: UploadedFile | null;
  licenceBack: UploadedFile | null;

  /* Section 4 - Driving history */
  drivingHistoryFile: UploadedFile | null;
  drivingHistoryIssue: string;
  drivingHistoryExpiry: string;

  /* Section 5 - Police verification */
  policeFile: UploadedFile | null;
  policeIssue: string;
  policeExpiry: string;

  /* Section 6 - Visa */
  visaStatus: string;
  visaType: string;
  visaFile: UploadedFile | null;
  visaExpiry: string;

  /* Section 7 - Medical */
  medicalFile: UploadedFile | null;
  medicalIssue: string;
  medicalExpiry: string;

  /* Section 8 - Drug test */
  drugTestFile: UploadedFile | null;
  drugTestIssue: string;

  /* Section 9 - Additional docs */
  additionalDocs: AdditionalDoc[];
}

export type ExpiryLevel = "valid" | "soon" | "expired" | "none";

export interface StepDef {
  id: string;
  label: string;
  /** Field paths that, when all filled, mark the step complete. */
  requires: (keyof DriverFormValues)[];
}
