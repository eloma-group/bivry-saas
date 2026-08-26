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
    country: "",
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
    passportNumber: "",
    passportExpiry: "",
    passportFront: null,
    passportBack: null,
    medicareNumber: "",
    medicareExpiry: "",
    medicareFile: null,
    medicalFile: null,
    medicalIssue: "",
    medicalExpiry: "",
    drugTestFile: null,
    drugTestIssue: "",
    drugTestExpiry: "",
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
  | "passportFront"
  | "passportBack"
  | "medicareFile"
  | "medicalFile"
  | "drugTestFile";

const FILE_SLOTS: Record<FileField, DriverDocumentType> = {
  profilePhoto: "PROFILE_PHOTO",
  licenceFront: "LICENCE_FRONT",
  licenceBack: "LICENCE_BACK",
  drivingHistoryFile: "DRIVING_HISTORY",
  policeFile: "POLICE_VERIFICATION",
  visaFile: "VISA",
  passportFront: "PASSPORT_FRONT",
  passportBack: "PASSPORT_BACK",
  medicareFile: "MEDICARE",
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
    country: data.country ?? "",
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

    passportNumber: data.passport?.passportNumber ?? "",
    passportExpiry: dateInput(data.passport?.expiryDate),
    passportFront: storedFileOfType(documents, "PASSPORT_FRONT"),
    passportBack: storedFileOfType(documents, "PASSPORT_BACK"),

    medicareNumber: data.medicare?.cardNumber ?? "",
    medicareExpiry: dateInput(data.medicare?.expiryDate),
    medicareFile: storedFileOfType(documents, "MEDICARE"),

    medicalFile: storedFileOfType(documents, "MEDICAL"),
    medicalIssue: dateInput(data.medical?.issueDate),
    medicalExpiry: dateInput(data.medical?.expiryDate),

    drugTestFile: storedFileOfType(documents, "DRUG_TEST"),
    drugTestIssue: dateInput(data.drugTest?.issueDate),
    drugTestExpiry: dateInput(data.drugTest?.expiryDate),

    additionalDocs: documents
      .filter((doc) => doc.docType === "ADDITIONAL")
      .map((doc) => ({
        id: doc.id,
        category: doc.category ?? "Other",
        file: storedFile(doc),
        expiry: dateInput(doc.expiryDate),
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
/**
 * The set of calls saving an onboarding record needs. The driver portal passes
 * `driverService`, which writes the signed in driver's own record; the Admin
 * portal passes a gateway bound to whichever driver is being edited. Deriving
 * it from `driverService` rather than restating the payload types keeps the
 * two ends from drifting: a change to a payload breaks the admin gateway at
 * compile time instead of at runtime.
 */
export type DriverOnboardingGateway = Pick<
  typeof driverService,
  | "savePersonal"
  | "saveAddress"
  | "saveLicence"
  | "saveDrivingHistory"
  | "savePoliceVerification"
  | "saveVisa"
  | "savePassport"
  | "saveMedicare"
  | "saveMedical"
  | "saveDrugTest"
  | "uploadDocument"
  | "updateDocument"
  | "deleteDocument"
>;

export async function saveOnboarding(
  values: DriverFormValues,
  loaded: DriverOnboardingData | null,
  gateway: DriverOnboardingGateway = driverService,
): Promise<void> {
  await gateway.savePersonal({
    firstName: values.firstName.trim(),
    middleName: trimmedOrNull(values.middleName),
    lastName: trimmedOrNull(values.lastName),
    dateOfBirth: values.dob || null,
    country: trimmedOrNull(values.country),
    phone: trimmedOrNull(values.phone),
  });

  await gateway.saveAddress({
    currentAddress: addressPayload(values.currentAddress),
    sameAsCurrent: values.sameAsCurrent,
    permanentAddress: addressPayload(
      values.sameAsCurrent ? values.currentAddress : values.permanentAddress,
    ),
  });

  await gateway.saveLicence({
    licenceNumber: trimmedOrNull(values.licenceNumber),
    licenceCardNumber: trimmedOrNull(values.licenceCardNumber),
    licenceType: values.licenceType ? LICENCE_TYPE_TO_API[values.licenceType] : null,
    issuingState: trimmedOrNull(values.licenceState),
    expiryDate: values.licenceExpiry || null,
  });

  await gateway.saveDrivingHistory({
    issueDate: values.drivingHistoryIssue || null,
    expiryDate: values.drivingHistoryExpiry || null,
  });

  await gateway.savePoliceVerification({
    issueDate: values.policeIssue || null,
    expiryDate: values.policeExpiry || null,
  });

  // An Australian national holds no visa but is asked for a passport and a
  // Medicare card instead. Only one of the two sets is on screen at a time, so
  // whichever is hidden is cleared rather than left behind.
  const isAustralian = values.country === "Australia";

  await gateway.saveVisa({
    visaStatus: isAustralian ? null : trimmedOrNull(values.visaStatus),
    visaType: isAustralian ? null : trimmedOrNull(values.visaType),
    expiryDate: isAustralian ? null : values.visaExpiry || null,
  });

  await gateway.savePassport({
    passportNumber: isAustralian ? trimmedOrNull(values.passportNumber) : null,
    expiryDate: isAustralian ? values.passportExpiry || null : null,
  });

  await gateway.saveMedicare({
    cardNumber: isAustralian ? trimmedOrNull(values.medicareNumber) : null,
    expiryDate: isAustralian ? values.medicareExpiry || null : null,
  });

  await gateway.saveMedical({
    issueDate: values.medicalIssue || null,
    expiryDate: values.medicalExpiry || null,
  });

  await gateway.saveDrugTest({
    issueDate: values.drugTestIssue || null,
    expiryDate: values.drugTestExpiry || null,
  });

  // Same rule for the files: only the branch that was on screen is kept, so a
  // driver who corrects their country does not leave the other one behind.
  await syncDocuments(
    {
      ...values,
      visaFile: isAustralian ? null : values.visaFile,
      passportFront: isAustralian ? values.passportFront : null,
      passportBack: isAustralian ? values.passportBack : null,
      medicareFile: isAustralian ? values.medicareFile : null,
    },
    loaded?.documents ?? [],
    gateway,
  );
}

/**
 * Uploads what is new, removes what the driver took out, and leaves untouched
 * files alone. A single slot upload replaces its predecessor server side, so
 * only removals have to be deleted here.
 */
async function syncDocuments(
  values: DriverFormValues,
  stored: DriverDocument[],
  gateway: DriverOnboardingGateway,
): Promise<void> {
  for (const field of FILE_FIELDS) {
    const docType = FILE_SLOTS[field];
    const value = values[field];
    const existing = stored.find((doc) => doc.docType === docType);

    if (value?.documentId) continue;

    if (value?.dataUrl) {
      await gateway.uploadDocument({ file: dataUrlToFile(value), docType });
      continue;
    }

    if (!value && existing) await gateway.deleteDocument(existing.id);
  }

  const keptIds = new Set(
    values.additionalDocs
      .map((row) => row.file?.documentId)
      .filter((id): id is string => Boolean(id)),
  );

  for (const doc of stored) {
    if (doc.docType !== "ADDITIONAL") continue;
    if (!keptIds.has(doc.id)) await gateway.deleteDocument(doc.id);
  }

  for (const row of values.additionalDocs) {
    if (row.file?.dataUrl) {
      await gateway.uploadDocument({
        file: dataUrlToFile(row.file),
        docType: "ADDITIONAL",
        category: row.category || undefined,
        expiryDate: row.expiry || undefined,
      });
      continue;
    }

    // Already stored. The file itself cannot be changed without replacing it,
    // but the type and the expiry date can still be corrected in place.
    const documentId = row.file?.documentId;
    if (!documentId) continue;

    const existing = stored.find((doc) => doc.id === documentId);
    const unchanged =
      existing &&
      (existing.category ?? "") === row.category &&
      (existing.expiryDate?.slice(0, 10) ?? "") === row.expiry;
    if (unchanged) continue;

    await gateway.updateDocument(documentId, {
      category: row.category || null,
      expiryDate: row.expiry || null,
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
