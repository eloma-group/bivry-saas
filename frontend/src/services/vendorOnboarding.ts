import { vendorService } from "./vendorService";
import { dataUrlToFile } from "@/utils/validation";
import {
  CONTACT_BLOCKS,
  INSURANCE_POLICIES,
  REQUIRED_COMPLIANCE_DOCS,
} from "@/constants/vendorOptions";
import type {
  VendorContactPayload,
  VendorDocument,
  VendorDocumentType,
  VendorInsurancePayload,
  VendorOnboardingData,
} from "./vendorService";
import type { UploadedFile } from "@/types/driver";
import type {
  ComplianceDocRow,
  ContactBlock,
  InsuranceKey,
  InsuranceRow,
  VendorFormValues,
} from "@/types/vendor";

/**
 * The bridge between the supplier onboarding wizard and the vendor API.
 *
 * The form works in the shapes the inputs need (plain strings, yyyy-MM-dd
 * dates, files held as data URLs). The API works in the shapes the database
 * needs. This module is the only place that knows how to translate between the
 * two, in both directions, so the form and the profile page never have to.
 */

const emptyContact: ContactBlock = {
  contactPerson: "",
  designation: "",
  contactNumber: "",
  email: "",
};

const emptyInsurance: InsuranceRow = {
  policyNumber: "",
  insurer: "",
  expiry: "",
  sumAssured: "",
  employerNumber: "",
  validFrom: "",
  validTill: "",
  dueInDays: "",
  file: null,
};

function emptyInsurances(): Record<InsuranceKey, InsuranceRow> {
  return Object.fromEntries(
    INSURANCE_POLICIES.map((policy) => [policy.key, { ...emptyInsurance }]),
  ) as Record<InsuranceKey, InsuranceRow>;
}

/** The eight rows every supplier fills in, blank. Extra rows are appended after. */
function emptyComplianceDocs(): ComplianceDocRow[] {
  return REQUIRED_COMPLIANCE_DOCS.map((doc) => ({
    id: doc.docType,
    docType: doc.docType,
    label: doc.label,
    fixed: true,
    file: null,
    issue: "",
    expiry: "",
  }));
}

/** A blank wizard, used before anything is loaded and by a brand new supplier. */
export function emptyFormValues(): VendorFormValues {
  return {
    companyName: "",
    tradingName: "",
    abn: "",
    legalName: "",
    websiteAddress: "",
    supplierId: "",
    email: "",
    phone: "",
    companyLogo: null,

    operations: { ...emptyContact },
    compliance: { ...emptyContact },
    admin: { ...emptyContact },
    dispatch: { ...emptyContact },
    invoicePreference: "",
    invoiceEmails: [],
    invoiceOther: "",

    directors: [],

    accountName: "",
    bankName: "",
    bsb: "",
    accountNumber: "",

    areasCovered: [],
    businessOperations: [],

    warehouses: [],

    accreditationNumber: "",
    massManagementExpiry: "",
    basicFatigueExpiry: "",
    dangerousGoodsExpiry: "",
    nhvasExpiry: "",
    haccpExpiry: "",
    accreditationFile: null,

    insurances: emptyInsurances(),

    complianceDocs: emptyComplianceDocs(),
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

/** A document that is already stored: the bytes stay on the server. */
function storedFile(doc: VendorDocument): UploadedFile {
  return {
    name: doc.fileName,
    size: doc.sizeInBytes,
    type: doc.mimeType,
    dataUrl: "",
    documentId: doc.id,
  };
}

function storedFileOfType(
  documents: VendorDocument[],
  docType: VendorDocumentType,
): UploadedFile | null {
  const match = documents.find((doc) => doc.docType === docType);
  return match ? storedFile(match) : null;
}

function contactBlock(
  contacts: VendorOnboardingData["contacts"],
  apiType: string,
): ContactBlock {
  const stored = contacts.find((row) => row.type === apiType);
  return {
    contactPerson: stored?.contactPerson ?? "",
    designation: stored?.designation ?? "",
    contactNumber: stored?.contactNumber ?? "",
    email: stored?.email ?? "",
  };
}

// ---------------------------------------------------------------------------
// API -> form
// ---------------------------------------------------------------------------

/** Fills the wizard with everything already saved, so editing resumes in place. */
export function toFormValues(data: VendorOnboardingData): VendorFormValues {
  const documents = data.documents;

  const insurances = emptyInsurances();
  for (const policy of INSURANCE_POLICIES) {
    const stored = data.insurances.find((row) => row.type === policy.apiType);
    insurances[policy.key] = {
      policyNumber: stored?.policyNumber ?? "",
      insurer: stored?.insurer ?? "",
      expiry: dateInput(stored?.expiryDate),
      sumAssured: stored?.sumAssured ?? "",
      employerNumber: stored?.employerNumber ?? "",
      validFrom: dateInput(stored?.validFrom),
      validTill: dateInput(stored?.validTill),
      dueInDays: stored?.dueInDays == null ? "" : String(stored.dueInDays),
      file: storedFileOfType(documents, policy.docType as VendorDocumentType),
    };
  }

  // The eight fixed rows first, then whatever the supplier added themselves.
  const complianceDocs: ComplianceDocRow[] = REQUIRED_COMPLIANCE_DOCS.map((required) => {
    const stored = documents.find((doc) => doc.docType === required.docType);
    return {
      id: required.docType,
      docType: required.docType,
      label: required.label,
      fixed: true,
      file: stored ? storedFile(stored) : null,
      issue: dateInput(stored?.issueDate),
      expiry: dateInput(stored?.expiryDate),
    };
  });

  for (const doc of documents) {
    if (doc.docType !== "COMPLIANCE_ADDITIONAL") continue;
    complianceDocs.push({
      id: doc.id,
      docType: "COMPLIANCE_ADDITIONAL",
      label: doc.category ?? "Other",
      fixed: false,
      file: storedFile(doc),
      issue: dateInput(doc.issueDate),
      expiry: dateInput(doc.expiryDate),
    });
  }

  return {
    companyName: data.companyName,
    tradingName: data.tradingName ?? "",
    abn: data.abn ?? "",
    legalName: data.legalName ?? "",
    websiteAddress: data.websiteAddress ?? "",
    supplierId: data.supplierId ?? "",
    email: data.email,
    phone: data.phone ?? "",
    companyLogo: storedFileOfType(documents, "COMPANY_LOGO"),

    operations: contactBlock(data.contacts, "OPERATIONS"),
    compliance: contactBlock(data.contacts, "COMPLIANCE"),
    admin: contactBlock(data.contacts, "ADMIN"),
    dispatch: contactBlock(data.contacts, "DISPATCH"),
    invoicePreference: data.invoicePreference ?? "",
    invoiceEmails: data.invoiceEmails ?? [],
    invoiceOther: data.invoiceOther ?? "",

    directors: data.directors.map((director) => ({
      id: director.id,
      designation: director.designation ?? "",
      email: director.email ?? "",
      contactNumber: director.contactNumber ?? "",
    })),

    accountName: data.bankDetail?.accountName ?? "",
    bankName: data.bankDetail?.bankName ?? "",
    bsb: data.bankDetail?.bsb ?? "",
    accountNumber: data.bankDetail?.accountNumber ?? "",

    areasCovered: data.coverage?.areasCovered ?? [],
    businessOperations: data.coverage?.businessOperations ?? [],

    warehouses: data.warehouses.map((warehouse) => ({
      id: warehouse.id,
      street1: warehouse.street1 ?? "",
      street2: warehouse.street2 ?? "",
      suburb: warehouse.suburb ?? "",
      state: warehouse.state ?? "",
      country: warehouse.country ?? "",
      postCode: warehouse.postCode ?? "",
    })),

    accreditationNumber: data.accreditation?.accreditationNumber ?? "",
    massManagementExpiry: dateInput(data.accreditation?.massManagementExpiry),
    basicFatigueExpiry: dateInput(data.accreditation?.basicFatigueExpiry),
    dangerousGoodsExpiry: dateInput(data.accreditation?.dangerousGoodsExpiry),
    nhvasExpiry: dateInput(data.accreditation?.nhvasExpiry),
    haccpExpiry: dateInput(data.accreditation?.haccpExpiry),
    accreditationFile: storedFileOfType(documents, "ACCREDITATION"),

    insurances,
    complianceDocs,
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
 * saved, which is what the supplier expects from a form that saves as a whole.
 */
/**
 * The set of calls saving a supplier onboarding record needs. The supplier
 * portal passes `vendorService`, which writes the signed in supplier's own
 * record; the Admin portal passes a gateway bound to whichever supplier is
 * being edited. Derived from `vendorService` rather than restated, so a change
 * to a payload breaks the admin gateway at compile time.
 */
export type VendorOnboardingGateway = Pick<
  typeof vendorService,
  | "saveCompany"
  | "saveContacts"
  | "saveDirectors"
  | "saveBank"
  | "saveCoverage"
  | "saveWarehouses"
  | "saveAccreditation"
  | "saveInsurances"
  | "uploadDocument"
  | "updateDocument"
  | "deleteDocument"
>;

export async function saveOnboarding(
  values: VendorFormValues,
  loaded: VendorOnboardingData | null,
  gateway: VendorOnboardingGateway = vendorService,
): Promise<void> {
  await gateway.saveCompany({
    companyName: values.companyName.trim(),
    tradingName: trimmedOrNull(values.tradingName),
    legalName: trimmedOrNull(values.legalName),
    abn: trimmedOrNull(values.abn),
    websiteAddress: trimmedOrNull(values.websiteAddress),
    phone: trimmedOrNull(values.phone),
    // The operations contact is the person we deal with day to day, so that is
    // what the account's own "contact person" mirrors.
    contactPerson: trimmedOrNull(values.operations.contactPerson),
  });

  const contacts: VendorContactPayload[] = CONTACT_BLOCKS.map((block) => {
    const source = values[block.key];
    return {
      type: block.apiType,
      contactPerson: trimmedOrNull(source.contactPerson),
      designation: trimmedOrNull(source.designation),
      contactNumber: trimmedOrNull(source.contactNumber),
      email: trimmedOrNull(source.email),
    };
  });

  await gateway.saveContacts({
    contacts,
    invoicePreference: trimmedOrNull(values.invoicePreference),
    invoiceEmails: values.invoiceEmails,
    invoiceOther: trimmedOrNull(values.invoiceOther),
  });

  await gateway.saveDirectors(
    values.directors.map((director) => ({
      designation: trimmedOrNull(director.designation),
      email: trimmedOrNull(director.email),
      contactNumber: trimmedOrNull(director.contactNumber),
    })),
  );

  await gateway.saveBank({
    accountName: trimmedOrNull(values.accountName),
    bankName: trimmedOrNull(values.bankName),
    bsb: trimmedOrNull(values.bsb),
    accountNumber: trimmedOrNull(values.accountNumber),
  });

  await gateway.saveCoverage({
    areasCovered: values.areasCovered,
    businessOperations: values.businessOperations,
  });

  await gateway.saveWarehouses(
    values.warehouses.map((warehouse) => ({
      street1: trimmedOrNull(warehouse.street1),
      street2: trimmedOrNull(warehouse.street2),
      suburb: trimmedOrNull(warehouse.suburb),
      state: trimmedOrNull(warehouse.state),
      country: trimmedOrNull(warehouse.country),
      postCode: trimmedOrNull(warehouse.postCode),
    })),
  );

  await gateway.saveAccreditation({
    accreditationNumber: trimmedOrNull(values.accreditationNumber),
    massManagementExpiry: values.massManagementExpiry || null,
    basicFatigueExpiry: values.basicFatigueExpiry || null,
    dangerousGoodsExpiry: values.dangerousGoodsExpiry || null,
    nhvasExpiry: values.nhvasExpiry || null,
    haccpExpiry: values.haccpExpiry || null,
  });

  const insurances: VendorInsurancePayload[] = INSURANCE_POLICIES.map((policy) => {
    const row = values.insurances[policy.key];
    const dueInDays = Number.parseInt(row.dueInDays, 10);
    return {
      type: policy.apiType as VendorInsurancePayload["type"],
      policyNumber: trimmedOrNull(row.policyNumber),
      insurer: trimmedOrNull(row.insurer),
      expiryDate: row.expiry || null,
      sumAssured: trimmedOrNull(row.sumAssured),
      employerNumber: trimmedOrNull(row.employerNumber),
      validFrom: row.validFrom || null,
      validTill: row.validTill || null,
      dueInDays: Number.isNaN(dueInDays) ? null : dueInDays,
    };
  });

  await gateway.saveInsurances(insurances);

  await syncDocuments(values, loaded?.documents ?? [], gateway);
}

/**
 * Uploads what is new, removes what the supplier took out, and leaves untouched
 * files alone. A single slot upload replaces its predecessor server side, so
 * only removals have to be deleted here.
 */
async function syncDocuments(
  values: VendorFormValues,
  stored: VendorDocument[],
  gateway: VendorOnboardingGateway,
): Promise<void> {
  /** The single slot uploads: the logo, the accreditation, the six policies. */
  const slots: Array<{ docType: VendorDocumentType; value: UploadedFile | null }> = [
    { docType: "COMPANY_LOGO", value: values.companyLogo },
    { docType: "ACCREDITATION", value: values.accreditationFile },
    ...INSURANCE_POLICIES.map((policy) => ({
      docType: policy.docType as VendorDocumentType,
      value: values.insurances[policy.key].file,
    })),
  ];

  for (const slot of slots) {
    const existing = stored.find((doc) => doc.docType === slot.docType);

    if (slot.value?.documentId) continue;

    if (slot.value?.dataUrl) {
      await gateway.uploadDocument({
        file: dataUrlToFile(slot.value),
        docType: slot.docType,
      });
      continue;
    }

    if (!slot.value && existing) await gateway.deleteDocument(existing.id);
  }

  // Compliance rows. The eight fixed ones are single slot too; the extras the
  // supplier added are keyed by their own document id.
  const keptAdditionalIds = new Set(
    values.complianceDocs
      .filter((row) => !row.fixed)
      .map((row) => row.file?.documentId)
      .filter((id): id is string => Boolean(id)),
  );

  for (const doc of stored) {
    if (doc.docType !== "COMPLIANCE_ADDITIONAL") continue;
    if (!keptAdditionalIds.has(doc.id)) await gateway.deleteDocument(doc.id);
  }

  for (const row of values.complianceDocs) {
    const docType = row.docType as VendorDocumentType;
    const existing = row.fixed
      ? stored.find((doc) => doc.docType === docType)
      : stored.find((doc) => doc.id === row.file?.documentId);

    if (row.file?.dataUrl) {
      await gateway.uploadDocument({
        file: dataUrlToFile(row.file),
        docType,
        category: row.fixed ? undefined : row.label || "Other",
        issueDate: row.issue || undefined,
        expiryDate: row.expiry || undefined,
      });
      continue;
    }

    if (!row.file) {
      if (row.fixed && existing) await gateway.deleteDocument(existing.id);
      continue;
    }

    // Already stored. The bytes cannot change without replacing them, but the
    // dates and the label on an extra row can still be corrected in place.
    const documentId = row.file.documentId;
    if (!documentId || !existing) continue;

    const unchanged =
      (existing.issueDate?.slice(0, 10) ?? "") === row.issue &&
      (existing.expiryDate?.slice(0, 10) ?? "") === row.expiry &&
      (row.fixed || (existing.category ?? "") === row.label);
    if (unchanged) continue;

    await gateway.updateDocument(documentId, {
      category: row.fixed ? existing.category : row.label || null,
      issueDate: row.issue || null,
      expiryDate: row.expiry || null,
    });
  }
}

/**
 * Whether the application still has to be handed in. Editing an application
 * that is already with the compliance team saves the changes without asking to
 * be reviewed a second time.
 */
export function needsSubmission(data: VendorOnboardingData | null): boolean {
  const status = data?.onboardingStatus ?? "NOT_STARTED";
  return status === "NOT_STARTED" || status === "IN_PROGRESS" || status === "REJECTED";
}

/**
 * What is still missing before the form can be handed in.
 *
 * All eight compliance documents are required, along with the details the
 * backend also insists on, so the submit button can say why it is disabled
 * rather than only failing once it has been pressed.
 */
export function submissionBlockers(values: VendorFormValues): string[] {
  const missing: string[] = [];

  if (!values.companyName.trim()) missing.push("Company name");
  if (!values.abn.trim()) missing.push("ABN");
  if (!values.accountNumber.trim()) missing.push("Bank account number");
  if (values.warehouses.length === 0) missing.push("Warehouse address");
  if (!values.accreditationNumber.trim()) missing.push("Accreditation number");

  for (const row of values.complianceDocs) {
    if (!row.fixed) continue;
    if (!row.file) missing.push(row.label);
  }

  return missing;
}
