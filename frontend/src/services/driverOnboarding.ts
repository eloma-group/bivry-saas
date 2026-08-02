import { driverService } from "./driverService";
import { dataUrlToFile } from "@/utils/validation";
import type {
  ApiLicenceType,
  DriverAddressPayload,
  DriverDocument,
  DriverDocumentType,
  DriverOnboardingData,
} from "./driverService";
import type {
  AddressBlock,
  DriverFormValues,
  LicenceType,
  UploadedFile,
} from "@/types/driver";

/**
 * The bridge between the onboarding wizard and the driver API.
 *
 * The form works in the shapes the inputs need (plain strings, yyyy-MM-dd dates,
 * files held as data URLs). The API works in the shapes the database needs. This
 * module is the only place that knows how to translate between the two, in both
 * directions, so the form and the profile page never have to.
 */

const emptyAddress: AddressBlock = {
  houseNumber: "",
  street: "",
  suburb: "",
  state: "",
  country: "",
  postCode: "",
};

/** A blank wizard, used before anything is loaded and by a brand new driver. */
export function emptyFormValues(): DriverFormValues {
  return {
    firstName: "",
    middleName: "",
    lastName: "",
    dob: "",
    nationality: "",
    phone: "",
    email: "",
    profilePhoto: null,
    currentAddress: { ...emptyAddress },
    sameAsCurrent: true,
    permanentAddress: { ...emptyAddress },
    licenceNumber: "",
    licenceCardNumber: "",
    licenceType: "",
    licenceState: "",
    licenceExpiry: "",
    licenceFront: null,
    licenceBack: null,
    drivingHistoryFile: null,
    drivingHistoryIssue: "",
    drivingHistoryExpiry: "",
    policeFile: null,
    policeIssue: "",
    policeExpiry: "",
    visaStatus: "",
    visaType: "",
    visaFile: null,
    visaExpiry: "",
    medicalFile: null,
    medicalIssue: "",
    medicalExpiry: "",
    drugTestFile: null,
    drugTestIssue: "",
    additionalDocs: [],
  };
}

// ---------------------------------------------------------------------------
// Field level translation
// ---------------------------------------------------------------------------

/** `<input type="date">` only understands yyyy-MM-dd, never a full timestamp. */
function dateInput(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : "";
}

function trimmedOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

const LICENCE_TYPE_TO_FORM: Record<ApiLicenceType, LicenceType> = {
  CAR: "Car",
  HEAVY_RIGID: "Heavy Rigid",
  HEAVY_COMBINATION: "Heavy Combination",
  MULTI_COMBINATION: "Multi Combination",
  MOTORCYCLE: "Motorcycle",
};

const LICENCE_TYPE_TO_API = Object.fromEntries(
  Object.entries(LICENCE_TYPE_TO_FORM).map(([api, form]) => [form, api]),
) as Record<LicenceType, ApiLicenceType>;

/** How a stored licence class reads on screen. */
export function licenceTypeLabel(type: ApiLicenceType | null | undefined): string {
  return type ? LICENCE_TYPE_TO_FORM[type] : "";
}

/**
 * Which slot in the form each stored document type belongs to. Every one of
 * these holds a single file: uploading again replaces what was there.
 */
type FileField =
  | "profilePhoto"
  | "licenceFront"
  | "licenceBack"
  | "drivingHistoryFile"
  | "policeFile"
  | "visaFile"
  | "medicalFile"
  | "drugTestFile";

const FILE_SLOTS: Record<FileField, DriverDocumentType> = {
  profilePhoto: "PROFILE_PHOTO",
  licenceFront: "LICENCE_FRONT",
  licenceBack: "LICENCE_BACK",
  drivingHistoryFile: "DRIVING_HISTORY",
  policeFile: "POLICE_VERIFICATION",
  visaFile: "VISA",
  medicalFile: "MEDICAL",
  drugTestFile: "DRUG_TEST",
};

const FILE_FIELDS = Object.keys(FILE_SLOTS) as FileField[];

/** A document that is already stored: the bytes stay on the server. */
function storedFile(doc: DriverDocument): UploadedFile {
  return {
    name: doc.fileName,
    size: doc.sizeInBytes,
    type: doc.mimeType,
    dataUrl: "",
    documentId: doc.id,
  };
}

function storedFileOfType(
  documents: DriverDocument[],
  docType: DriverDocumentType,
): UploadedFile | null {
  const match = documents.find((doc) => doc.docType === docType);
  return match ? storedFile(match) : null;
}

function addressBlock(stored?: DriverAddressPayload): AddressBlock {
  return {
    houseNumber: stored?.houseNumber ?? "",
    street: stored?.street ?? "",
    suburb: stored?.suburb ?? "",
    state: stored?.state ?? "",
    country: stored?.country ?? "",
    postCode: stored?.postCode ?? "",
  };
}

function sameAddress(a: AddressBlock, b: AddressBlock): boolean {
  return (Object.keys(a) as (keyof AddressBlock)[]).every((key) => a[key] === b[key]);
}

function addressPayload(block: AddressBlock): DriverAddressPayload {
  return {
    houseNumber: trimmedOrNull(block.houseNumber),
    street: trimmedOrNull(block.street),
    suburb: trimmedOrNull(block.suburb),
    state: trimmedOrNull(block.state),
    country: trimmedOrNull(block.country),
    postCode: trimmedOrNull(block.postCode),
  };
}

// ---------------------------------------------------------------------------
// API -> form
// ---------------------------------------------------------------------------

/** Fills the wizard with everything already saved, so editing resumes in place. */
export function toFormValues(data: DriverOnboardingData): DriverFormValues {
  const documents = data.documents;
  const current = addressBlock(data.addresses.find((row) => row.type === "CURRENT"));
  const permanentStored = data.addresses.find((row) => row.type === "PERMANENT");
  const permanent = addressBlock(permanentStored);

  return {
    firstName: data.firstName,
    middleName: data.middleName ?? "",
    lastName: data.lastName ?? "",
    dob: dateInput(data.dateOfBirth),
    nationality: data.nationality ?? "",
    phone: data.phone ?? "",
    email: data.email,
    profilePhoto: storedFileOfType(documents, "PROFILE_PHOTO"),

    currentAddress: current,
    // The permanent address is stored in full even when it was copied from the
    // current one, so the tick box state is derived by comparing them.
    sameAsCurrent: !permanentStored || sameAddress(current, permanent),
    permanentAddress: permanent,

    licenceNumber: data.licence?.licenceNumber ?? "",
    licenceCardNumber: data.licence?.licenceCardNumber ?? "",
    licenceType: data.licence?.licenceType
      ? LICENCE_TYPE_TO_FORM[data.licence.licenceType]
      : "",
    licenceState: data.licence?.issuingState ?? "",
    licenceExpiry: dateInput(data.licence?.expiryDate),
    licenceFront: storedFileOfType(documents, "LICENCE_FRONT"),
    licenceBack: storedFileOfType(documents, "LICENCE_BACK"),

    drivingHistoryFile: storedFileOfType(documents, "DRIVING_HISTORY"),
    drivingHistoryIssue: dateInput(data.drivingHistory?.issueDate),
    drivingHistoryExpiry: dateInput(data.drivingHistory?.expiryDate),

    policeFile: storedFileOfType(documents, "POLICE_VERIFICATION"),
    policeIssue: dateInput(data.policeVerification?.issueDate),
    policeExpiry: dateInput(data.policeVerification?.expiryDate),

    visaStatus: data.visa?.visaStatus ?? "",
    visaType: data.visa?.visaType ?? "",
    visaFile: storedFileOfType(documents, "VISA"),
    visaExpiry: dateInput(data.visa?.expiryDate),

    medicalFile: storedFileOfType(documents, "MEDICAL"),
    medicalIssue: dateInput(data.medical?.issueDate),
    medicalExpiry: dateInput(data.medical?.expiryDate),

    drugTestFile: storedFileOfType(documents, "DRUG_TEST"),
    drugTestIssue: dateInput(data.drugTest?.issueDate),

    additionalDocs: documents
      .filter((doc) => doc.docType === "ADDITIONAL")
      .map((doc) => ({
        id: doc.id,
        category: doc.category ?? "Other",
        file: storedFile(doc),
      })),
  };
}

// ---------------------------------------------------------------------------
// Form -> API
// ---------------------------------------------------------------------------

/**
 * Writes the whole wizard to the API, one section at a time, then brings the
 * document store in line with what the form is now holding.
 *
 * Sequential on purpose: a failure part way through leaves the earlier sections
 * saved, which is what the driver expects from a form that saves as a whole.
 */
export async function saveOnboarding(
  values: DriverFormValues,
  loaded: DriverOnboardingData | null,
): Promise<void> {
  await driverService.savePersonal({
    firstName: values.firstName.trim(),
    middleName: trimmedOrNull(values.middleName),
    lastName: trimmedOrNull(values.lastName),
    dateOfBirth: values.dob || null,
    nationality: trimmedOrNull(values.nationality),
    phone: trimmedOrNull(values.phone),
  });

  await driverService.saveAddress({
    currentAddress: addressPayload(values.currentAddress),
    sameAsCurrent: values.sameAsCurrent,
    permanentAddress: addressPayload(
      values.sameAsCurrent ? values.currentAddress : values.permanentAddress,
    ),
  });

  await driverService.saveLicence({
    licenceNumber: trimmedOrNull(values.licenceNumber),
    licenceCardNumber: trimmedOrNull(values.licenceCardNumber),
    licenceType: values.licenceType ? LICENCE_TYPE_TO_API[values.licenceType] : null,
    issuingState: trimmedOrNull(values.licenceState),
    expiryDate: values.licenceExpiry || null,
  });

  await driverService.saveDrivingHistory({
    issueDate: values.drivingHistoryIssue || null,
    expiryDate: values.drivingHistoryExpiry || null,
  });

  await driverService.savePoliceVerification({
    issueDate: values.policeIssue || null,
    expiryDate: values.policeExpiry || null,
  });

  // An Australian national needs no visa, and the section is hidden for them,
  // so anything held from before is cleared rather than left behind.
  const needsVisa = values.nationality !== "Australia";
  await driverService.saveVisa({
    visaStatus: needsVisa ? trimmedOrNull(values.visaStatus) : null,
    visaType: needsVisa ? trimmedOrNull(values.visaType) : null,
    expiryDate: needsVisa ? values.visaExpiry || null : null,
  });

  await driverService.saveMedical({
    issueDate: values.medicalIssue || null,
    expiryDate: values.medicalExpiry || null,
  });

  await driverService.saveDrugTest({ issueDate: values.drugTestIssue || null });

  await syncDocuments(values, loaded?.documents ?? []);
}

/**
 * Uploads what is new, removes what the driver took out, and leaves untouched
 * files alone. A single slot upload replaces its predecessor server side, so
 * only removals have to be deleted here.
 */
async function syncDocuments(
  values: DriverFormValues,
  stored: DriverDocument[],
): Promise<void> {
  for (const field of FILE_FIELDS) {
    const docType = FILE_SLOTS[field];
    const value = values[field];
    const existing = stored.find((doc) => doc.docType === docType);

    if (value?.documentId) continue;

    if (value?.dataUrl) {
      await driverService.uploadDocument({ file: dataUrlToFile(value), docType });
      continue;
    }

    if (!value && existing) await driverService.deleteDocument(existing.id);
  }

  const keptIds = new Set(
    values.additionalDocs
      .map((row) => row.file?.documentId)
      .filter((id): id is string => Boolean(id)),
  );

  for (const doc of stored) {
    if (doc.docType !== "ADDITIONAL") continue;
    if (!keptIds.has(doc.id)) await driverService.deleteDocument(doc.id);
  }

  for (const row of values.additionalDocs) {
    // Already stored, or an empty row the driver never attached a file to. The
    // category of a stored file cannot be changed without replacing the file.
    if (!row.file?.dataUrl) continue;
    await driverService.uploadDocument({
      file: dataUrlToFile(row.file),
      docType: "ADDITIONAL",
      category: row.category || undefined,
    });
  }
}

/**
 * Whether the application still has to be handed in. Editing an application
 * that is already with the compliance team saves the changes without asking to
 * be reviewed a second time.
 */
export function needsSubmission(data: DriverOnboardingData | null): boolean {
  const status = data?.onboardingStatus ?? "NOT_STARTED";
  return status === "NOT_STARTED" || status === "IN_PROGRESS" || status === "REJECTED";
}
