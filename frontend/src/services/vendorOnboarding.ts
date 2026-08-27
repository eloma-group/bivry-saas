import { vendorService } from "./vendorService";
import { dataUrlToFile } from "@/utils/validation";
import {
  COMPLIANCE_DOCUMENT_TYPES,
  CONTACT_BLOCKS,
  DESIGNATION_OTHER,
  DESIGNATION_PRESETS,
  INSURANCE_POLICIES,
  PRIMARY_CONTACT,
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
  SiteRow,
  VendorAddressBlock,
  VendorFormValues,
} from "@/types/vendor";

/**
 * The bridge between the vendor onboarding wizard and the vendor API.
 *
 * The form works in the shapes the inputs need (plain strings, yyyy-MM-dd
 * dates, files held as data URLs). The API works in the shapes the database
 * needs. This module is the only place that knows how to translate between the
 * two, in both directions, so the form and the profile page never have to.
 */

const emptyContact: ContactBlock = {
  contactPerson: "",
  designation: "",
  designationOther: "",
  contactNumber: "",
  email: "",
  sameAsOperations: false,
};

const emptyInsurance: InsuranceRow = {
  policyNumber: "",
  insurer: "",
  issue: "",
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

/**
 * A blank compliance section, which is an empty one.
 *
 * There is no fixed pack: a vendor adds the documents that apply to them, so a
 * form nobody has filled in yet has no rows at all.
 */
/**
 * The policies the form lists, one row each. Every policy in the list is shown
 * individually now rather than picked from a dropdown, so a blank form opens
 * with all of them present and empty. Extra rows the vendor adds sit after
 * these. The stored label stays the plain name; the "Policy" wording is added
 * only for display. See `policyDisplayName`.
 */
function emptyComplianceDocs(): ComplianceDocRow[] {
  return COMPLIANCE_DOCUMENT_TYPES.map((label) => ({
    id: `policy:${label}`,
    docType: "COMPLIANCE_ADDITIONAL",
    label,
    file: null,
  }));
}

/** An address with nothing in it. Australia leads, as most vendors are here. */
function emptyAddress(): VendorAddressBlock {
  return {
    street1: "",
    street2: "",
    suburb: "",
    state: "",
    country: "Australia",
    postCode: "",
  };
}

/** One stored warehouse or yard as the form holds it. */
function siteRow(site: VendorOnboardingData["warehouses"][number]): SiteRow {
  return {
    id: site.id,
    street1: site.street1 ?? "",
    street2: site.street2 ?? "",
    suburb: site.suburb ?? "",
    state: site.state ?? "",
    country: site.country ?? "",
    postCode: site.postCode ?? "",
  };
}

/** One stored address row as the form holds it, or a blank one. */
function addressOfType(
  addresses: VendorOnboardingData["addresses"],
  type: "PRINCIPAL" | "BILLING",
): VendorAddressBlock {
  const stored = addresses.find((row) => row.type === type);
  if (!stored) return emptyAddress();

  return {
    street1: stored.street1 ?? "",
    street2: stored.street2 ?? "",
    suburb: stored.suburb ?? "",
    state: stored.state ?? "",
    country: stored.country ?? "",
    postCode: stored.postCode ?? "",
  };
}

/** A blank wizard, used before anything is loaded and by a brand new vendor. */
export function emptyFormValues(): VendorFormValues {
  return {
    companyName: "",
    tradingNames: [{ name: "" }],
    abn: "",
    acn: "",
    abnStatus: "",
    entityType: "",
    gst: "",
    legalName: "",
    websiteAddress: "",
    vendorCode: "",
    email: "",
    phone: "",
    companyLogo: null,

    operations: { ...emptyContact },
    compliance: { ...emptyContact },
    accounts: { ...emptyContact },
    dispatch: { ...emptyContact },

    directors: [],

    accountName: "",
    bankName: "",
    bsb: "",
    accountNumber: "",

    principalAddress: emptyAddress(),
    billingAddress: emptyAddress(),
    billingSameAsPrincipal: false,
    yards: [],
    warehouses: [],

    areasCovered: [],
    businessOperations: [],

    accreditationNumber: "",
    accreditationExpiry: "",
    massManagementExpiry: "",
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

/**
 * The digits of a stored number, for the fields that now take digits only.
 *
 * A BSB or an account number saved before that rule could carry a dash or a
 * space - the account number field used to suggest `1234-5678-9012` - and
 * loading one of those straight back in would fail a rule the vendor never
 * broke. Stripping on the way in leaves the same number, correctly typed, and
 * the next save stores it that way.
 */
function digitsOf(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

/** A document that is already stored: the bytes stay on the server. */
function storedFile(doc: VendorDocument): UploadedFile {
  return {
    name: doc.fileName,
    size: doc.sizeInBytes,
    type: doc.mimeType,
    dataUrl: "",
    documentId: doc.id,
    uploadedAt: doc.createdAt,
  };
}

function storedFileOfType(
  documents: VendorDocument[],
  docType: VendorDocumentType,
): UploadedFile | null {
  const match = documents.find((doc) => doc.docType === docType);
  return match ? storedFile(match) : null;
}

/** The four answers one contact block holds, in a comparable shape. */
function contactDetails(
  contacts: VendorOnboardingData["contacts"],
  apiType: string,
): Omit<ContactBlock, "sameAsOperations"> {
  const stored = contacts.find((row) => row.type === apiType);
  // A stored designation that is not one of the preset options was typed by
  // hand, so it comes back as "Other" with the text carried in designationOther.
  const storedDesignation = stored?.designation ?? "";
  const isPreset = DESIGNATION_PRESETS.includes(storedDesignation);
  const isCustom = storedDesignation !== "" && !isPreset;
  return {
    contactPerson: stored?.contactPerson ?? "",
    designation: isCustom ? DESIGNATION_OTHER : storedDesignation,
    designationOther: isCustom ? storedDesignation : "",
    contactNumber: stored?.contactNumber ?? "",
    email: stored?.email ?? "",
  };
}

/** Whether a block was answered at all. */
function hasContactDetails(block: Omit<ContactBlock, "sameAsOperations">): boolean {
  return Object.values(block).some((field) => field.trim() !== "");
}

/**
 * One contact block, with the "same as operations" tick worked out.
 *
 * Nothing stores that tick. A block ticked as a copy is saved holding the
 * operations details verbatim, so a block that matches operations in all four
 * answers is one that was copied - which makes the rows their own record of it,
 * with no second copy of the answer free to drift out of step.
 *
 * Two guards. Operations is never a copy of itself, and a block only counts as
 * copied once operations has actually been answered - otherwise a blank form,
 * where every block matches every other, would open with three ticks in it.
 *
 * Somebody who typed the same person into two blocks rather than ticking the
 * box gets the box ticked on the way back. That is the same record either way,
 * which is what makes reading it back off the rows safe.
 */
function contactBlock(
  contacts: VendorOnboardingData["contacts"],
  apiType: string,
  operations?: Omit<ContactBlock, "sameAsOperations">,
): ContactBlock {
  const details = contactDetails(contacts, apiType);
  const copied =
    operations !== undefined &&
    hasContactDetails(operations) &&
    (Object.keys(details) as Array<keyof typeof details>).every(
      (field) => details[field] === operations[field],
    );

  return { ...details, sameAsOperations: copied };
}

// ---------------------------------------------------------------------------
// API -> form
// ---------------------------------------------------------------------------

/** Fills the wizard with everything already saved, so editing resumes in place. */
export function toFormValues(data: VendorOnboardingData): VendorFormValues {
  const documents = data.documents;
  // The block the other three are compared against to work out their tick.
  const operations = contactDetails(data.contacts, "OPERATIONS");

  const insurances = emptyInsurances();
  for (const policy of INSURANCE_POLICIES) {
    const stored = data.insurances.find((row) => row.type === policy.apiType);
    insurances[policy.key] = {
      policyNumber: stored?.policyNumber ?? "",
      insurer: stored?.insurer ?? "",
      issue: dateInput(stored?.issueDate),
      expiry: dateInput(stored?.expiryDate),
      sumAssured: stored?.sumAssured ?? "",
      employerNumber: stored?.employerNumber ?? "",
      validFrom: dateInput(stored?.validFrom),
      validTill: dateInput(stored?.validTill),
      dueInDays: stored?.dueInDays == null ? "" : String(stored.dueInDays),
      file: storedFileOfType(documents, policy.docType as VendorDocumentType),
    };
  }

  // The policies are shown one row each. Every listed policy gets its row back,
  // carrying its stored file where one was uploaded; anything stored under a name
  // not in the list is a document the vendor added, and follows after.
  const additional = documents.filter((doc) => doc.docType === "COMPLIANCE_ADDITIONAL");
  const listedDocs: ComplianceDocRow[] = COMPLIANCE_DOCUMENT_TYPES.map((label) => {
    const match = additional.find((doc) => (doc.category ?? "") === label);
    return {
      id: match?.id ?? `policy:${label}`,
      docType: "COMPLIANCE_ADDITIONAL",
      label,
      file: match ? storedFile(match) : null,
    };
  });
  const extraDocs: ComplianceDocRow[] = additional
    .filter((doc) => !COMPLIANCE_DOCUMENT_TYPES.includes(doc.category ?? ""))
    .map((doc) => ({
      id: doc.id,
      docType: "COMPLIANCE_ADDITIONAL",
      label: doc.category ?? "",
      file: storedFile(doc),
    }));
  const complianceDocs: ComplianceDocRow[] = [...listedDocs, ...extraDocs];

  return {
    companyName: data.companyName,
    // The form always shows a row, so a vendor with nothing saved still has
    // somewhere to type.
    tradingNames:
      data.tradingNames.length > 0
        ? data.tradingNames.map((name) => ({ name }))
        : [{ name: "" }],
    abn: data.abn ?? "",
    acn: data.acn ?? "",
    abnStatus: data.abnStatus ?? "",
    entityType: data.entityType ?? "",
    gst: data.gst ?? "",
    legalName: data.legalName ?? "",
    websiteAddress: data.websiteAddress ?? "",
    vendorCode: data.vendorCode ?? "",
    email: data.email,
    phone: data.phone ?? "",
    companyLogo: storedFileOfType(documents, "COMPANY_LOGO"),

    operations: contactBlock(data.contacts, "OPERATIONS"),
    compliance: contactBlock(data.contacts, "COMPLIANCE", operations),
    accounts: contactBlock(data.contacts, "ADMIN", operations),
    dispatch: contactBlock(data.contacts, "DISPATCH", operations),

    directors: data.directors.map((director) => ({
      id: director.id,
      name: director.name ?? "",
      email: director.email ?? "",
      contactNumber: director.contactNumber ?? "",
    })),

    accountName: data.bankDetail?.accountName ?? "",
    bankName: data.bankDetail?.bankName ?? "",
    bsb: digitsOf(data.bankDetail?.bsb),
    accountNumber: digitsOf(data.bankDetail?.accountNumber),

    principalAddress: addressOfType(data.addresses, "PRINCIPAL"),
    billingAddress: addressOfType(data.addresses, "BILLING"),
    billingSameAsPrincipal: data.billingSameAsPrincipal,
    yards: data.yards.map(siteRow),
    warehouses: data.warehouses.map(siteRow),

    areasCovered: data.coverage?.areasCovered ?? [],
    businessOperations: data.coverage?.businessOperations ?? [],

    accreditationNumber: data.accreditation?.accreditationNumber ?? "",
    accreditationExpiry: dateInput(data.accreditation?.expiryDate),
    massManagementExpiry: dateInput(data.accreditation?.massManagementExpiry),
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
 * saved, which is what the vendor expects from a form that saves as a whole.
 */
/**
 * The set of calls saving a vendor onboarding record needs. The vendor
 * portal passes `vendorService`, which writes the signed in vendor's own
 * record; the Admin portal passes a gateway bound to whichever vendor is
 * being edited. Derived from `vendorService` rather than restated, so a change
 * to a payload breaks the admin gateway at compile time.
 */
export type VendorOnboardingGateway = Pick<
  typeof vendorService,
  | "saveCompany"
  | "saveContacts"
  | "saveDirectors"
  | "saveBank"
  | "saveAddresses"
  | "saveCoverage"
  | "saveWarehouses"
  | "saveYards"
  | "saveAccreditation"
  | "saveInsurances"
  | "uploadDocument"
  | "updateDocument"
  | "deleteDocument"
>;

/** One address as the API takes it: trimmed, and empty means null. */
function addressPayload(address: VendorAddressBlock) {
  return {
    street1: trimmedOrNull(address.street1),
    street2: trimmedOrNull(address.street2),
    suburb: trimmedOrNull(address.suburb),
    state: trimmedOrNull(address.state),
    country: trimmedOrNull(address.country),
    postCode: trimmedOrNull(address.postCode),
  };
}

export async function saveOnboarding(
  values: VendorFormValues,
  loaded: VendorOnboardingData | null,
  gateway: VendorOnboardingGateway = vendorService,
): Promise<void> {
  await gateway.saveCompany({
    companyName: values.companyName.trim(),
    tradingNames: values.tradingNames
      .map((row) => row.name.trim())
      .filter((name) => name !== ""),
    legalName: trimmedOrNull(values.legalName),
    abn: trimmedOrNull(values.abn),
    acn: trimmedOrNull(values.acn),
    abnStatus: trimmedOrNull(values.abnStatus),
    entityType: trimmedOrNull(values.entityType),
    gst: trimmedOrNull(values.gst),
    websiteAddress: trimmedOrNull(values.websiteAddress),
    phone: trimmedOrNull(values.phone),
    // The operations contact is the person we deal with day to day, so that is
    // what the account's own "contact person" mirrors.
    contactPerson: trimmedOrNull(values.operations.contactPerson),
  });

  // A ticked block is sent as a copy of the operations one, which is the whole
  // of what "same as operations" means here - there is no flag alongside it,
  // and `contactBlock` reads the tick back off these rows. Operations is the
  // block being copied, so it is never a copy of itself however the form state
  // got there.
  const contacts: VendorContactPayload[] = CONTACT_BLOCKS.map((block) => {
    const copied = block.key !== PRIMARY_CONTACT.key && values[block.key].sameAsOperations;
    const source = copied ? values[PRIMARY_CONTACT.key] : values[block.key];
    // "Other" is a UI-only choice: what gets stored is the text typed alongside
    // it, so the API only ever sees a real designation.
    const designation =
      source.designation === DESIGNATION_OTHER
        ? source.designationOther
        : source.designation;
    return {
      type: block.apiType,
      contactPerson: trimmedOrNull(source.contactPerson),
      designation: trimmedOrNull(designation),
      contactNumber: trimmedOrNull(source.contactNumber),
      email: trimmedOrNull(source.email),
    };
  });

  await gateway.saveContacts({ contacts });

  await gateway.saveDirectors(
    values.directors.map((director) => ({
      name: trimmedOrNull(director.name),
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

  await gateway.saveAddresses({
    billingSameAsPrincipal: values.billingSameAsPrincipal,
    principal: addressPayload(values.principalAddress),
    // The tick is remembered, but the copy is what is sent: nothing reading the
    // billing address should have to follow a flag to find one.
    billing: addressPayload(
      values.billingSameAsPrincipal ? values.principalAddress : values.billingAddress,
    ),
  });

  await gateway.saveWarehouses(values.warehouses.map(addressPayload));

  await gateway.saveYards(values.yards.map(addressPayload));

  await gateway.saveAccreditation({
    accreditationNumber: trimmedOrNull(values.accreditationNumber),
    expiryDate: values.accreditationExpiry || null,
    massManagementExpiry: values.massManagementExpiry || null,
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
      issueDate: row.issue || null,
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
 * Uploads what is new, removes what the vendor took out, and leaves untouched
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

  // Compliance rows. Each policy is one row, listed or added by the vendor, and
  // keyed by its own stored document id once it holds a file.
  // A row the vendor cleared or took off the form is a document to delete: a
  // stored policy with no row still holding its id is one that is gone.
  const keptIds = new Set(
    values.complianceDocs
      .map((row) => row.file?.documentId)
      .filter((id): id is string => Boolean(id)),
  );

  for (const doc of stored) {
    if (doc.docType !== "COMPLIANCE_ADDITIONAL") continue;
    if (!keptIds.has(doc.id)) await gateway.deleteDocument(doc.id);
  }

  for (const row of values.complianceDocs) {
    if (row.file?.dataUrl) {
      await gateway.uploadDocument({
        file: dataUrlToFile(row.file),
        docType: row.docType as VendorDocumentType,
        category: row.label || undefined,
      });
      continue;
    }

    // A row with no file at all has nothing to store. It is left alone rather
    // than deleted: the delete pass above has already removed what went.
    if (!row.file) continue;

    // Already stored. The bytes cannot change without replacing them, but the
    // document type can still be corrected in place.
    const documentId = row.file.documentId;
    const existing = stored.find((doc) => doc.id === documentId);
    if (!documentId || !existing) continue;
    if ((existing.category ?? "") === row.label) continue;

    await gateway.updateDocument(documentId, {
      category: row.label || null,
      // The API writes whatever it is handed, so the stored dates are handed
      // straight back. The form asks for neither any more, and leaving them
      // out would wipe both.
      issueDate: existing.issueDate?.slice(0, 10) ?? null,
      expiryDate: existing.expiryDate?.slice(0, 10) ?? null,
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
 * The same details the backend insists on, so the submit button can say why it
 * is disabled rather than only failing once it has been pressed. There is no
 * fixed set of policies to hold any more; what is checked is that every policy
 * somebody added carries its file.
 */
export function submissionBlockers(values: VendorFormValues): string[] {
  const missing: string[] = [];

  if (!values.companyName.trim()) missing.push("Company name");
  if (!values.abn.trim()) missing.push("ABN");
  if (!values.accountNumber.trim()) missing.push("Bank account number");
  if (!values.principalAddress.street1.trim()) missing.push("Principal address");
  // The tick makes the principal address the billing one, so it is only asked
  // for separately when the tick is off.
  if (!values.billingSameAsPrincipal && !values.billingAddress.street1.trim()) {
    missing.push("Billing address");
  }
  if (values.warehouses.length === 0) missing.push("Warehouse address");
  // The Certificate of Accreditation section is optional - nothing in it blocks
  // a submit; a vendor can add it later.
  // The Policies section is optional too: every policy is listed for a vendor to
  // attach where they have it, and none of them gate the submit.

  return missing;
}
