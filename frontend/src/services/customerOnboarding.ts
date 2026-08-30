import { customerService } from "./customerService";
import { dataUrlToFile } from "@/utils/validation";
import { todayInput } from "@/utils/date";
import {
  BILLING_TYPE_FROM_API,
  BILLING_TYPE_TO_API,
  CONTACT_BLOCKS,
  CUSTOMER_DOCUMENT_TYPES,
  DESIGNATION_OTHER,
  DESIGNATION_PRESETS,
  PRIMARY_CONTACT,
} from "@/constants/customerOptions";
import type {
  CustomerContactPayload,
  CustomerDocument,
  CustomerDocumentType,
  CustomerOnboardingData,
} from "./customerService";
import type { UploadedFile } from "@/types/driver";
import type {
  CustomerAddressBlock,
  CustomerContactBlock,
  CustomerDocRow,
  CustomerFormValues,
} from "@/types/customer";

/**
 * The bridge between the customer onboarding wizard and the customer API.
 *
 * The form works in the shapes the inputs need (plain strings, yyyy-MM-dd
 * dates, files held as data URLs). The API works in the shapes the database
 * needs. This module is the only place that knows how to translate between the
 * two, in both directions, so the form and the profile page never have to.
 */

const emptyContact: CustomerContactBlock = {
  contactPerson: "",
  designation: "",
  designationOther: "",
  contactNumber: "",
  email: "",
  sameAsOperations: false,
};

/** An address with nothing in it. Australia leads, as most customers are here. */
function emptyAddress(): CustomerAddressBlock {
  return {
    street1: "",
    street2: "",
    suburb: "",
    state: "",
    country: "Australia",
    postCode: "",
  };
}

/**
 * The documents the form lists, one row each. Extra rows the customer adds sit
 * after these. The stored label is the plain name.
 */
function emptyDocuments(): CustomerDocRow[] {
  return CUSTOMER_DOCUMENT_TYPES.map((label) => ({
    id: `document:${label}`,
    docType: "ADDITIONAL",
    label,
    file: null,
  }));
}

/** A blank wizard, used before anything is loaded and by a brand new customer. */
export function emptyFormValues(): CustomerFormValues {
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
    cid: "",
    email: "",
    phone: "",
    firstName: "",
    lastName: "",
    designation: "",
    // The form opens on today, which is what somebody filling it in now means
    // by a creation date. It stays editable for a record being backdated.
    creationDate: todayInput(),
    companyLogo: null,

    principalAddress: emptyAddress(),
    billingAddress: emptyAddress(),
    billingSameAsPrincipal: false,

    operations: { ...emptyContact },
    accounts: { ...emptyContact },
    dispatch: { ...emptyContact },
    main: { ...emptyContact },

    directors: [],

    term: "",
    billingType: "",

    contractDocument: null,
    documents: emptyDocuments(),
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
function storedFile(doc: CustomerDocument): UploadedFile {
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
  documents: CustomerDocument[],
  docType: CustomerDocumentType,
): UploadedFile | null {
  const match = documents.find((doc) => doc.docType === docType);
  return match ? storedFile(match) : null;
}

/** One stored address row as the form holds it, or a blank one. */
function addressOfType(
  addresses: CustomerOnboardingData["addresses"],
  type: "PRINCIPAL" | "BILLING",
): CustomerAddressBlock {
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

/** The four answers one contact block holds, in a comparable shape. */
function contactDetails(
  contacts: CustomerOnboardingData["contacts"],
  apiType: string,
): Omit<CustomerContactBlock, "sameAsOperations"> {
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
function hasContactDetails(block: Omit<CustomerContactBlock, "sameAsOperations">): boolean {
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
 */
function contactBlock(
  contacts: CustomerOnboardingData["contacts"],
  apiType: string,
  operations?: Omit<CustomerContactBlock, "sameAsOperations">,
): CustomerContactBlock {
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
export function toFormValues(data: CustomerOnboardingData): CustomerFormValues {
  const documents = data.documents;
  // The block the other three are compared against to work out their tick.
  const operations = contactDetails(data.contacts, "OPERATIONS");

  // The documents are shown one row each. Every listed one gets its row back,
  // carrying its stored file where one was uploaded; anything stored under a
  // name not in the list is a document the customer added, and follows after.
  const additional = documents.filter((doc) => doc.docType === "ADDITIONAL");
  const listedDocs: CustomerDocRow[] = CUSTOMER_DOCUMENT_TYPES.map((label) => {
    const match = additional.find((doc) => (doc.category ?? "") === label);
    return {
      id: match?.id ?? `document:${label}`,
      docType: "ADDITIONAL",
      label,
      file: match ? storedFile(match) : null,
    };
  });
  const extraDocs: CustomerDocRow[] = additional
    .filter((doc) => !CUSTOMER_DOCUMENT_TYPES.includes(doc.category ?? ""))
    .map((doc) => ({
      id: doc.id,
      docType: "ADDITIONAL",
      label: doc.category ?? "",
      file: storedFile(doc),
    }));

  return {
    companyName: data.companyName ?? "",
    // The form always shows a row, so a customer with nothing saved still has
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
    cid: data.cid ?? "",
    email: data.email,
    phone: data.phone ?? "",
    firstName: data.firstName ?? "",
    lastName: data.lastName ?? "",
    designation: data.designation ?? "",
    // A record saved before this field existed has no date on it. It opens on
    // today rather than empty, which is what the blank form does too.
    creationDate: dateInput(data.creationDate) || todayInput(),
    companyLogo: storedFileOfType(documents, "COMPANY_LOGO"),

    principalAddress: addressOfType(data.addresses, "PRINCIPAL"),
    billingAddress: addressOfType(data.addresses, "BILLING"),
    billingSameAsPrincipal: data.billingSameAsPrincipal,

    operations: contactBlock(data.contacts, "OPERATIONS"),
    accounts: contactBlock(data.contacts, "ACCOUNTS", operations),
    dispatch: contactBlock(data.contacts, "DISPATCH", operations),
    main: contactBlock(data.contacts, "MAIN", operations),

    directors: data.directors.map((director) => ({
      id: director.id,
      name: director.name ?? "",
      designation: director.designation ?? "",
      email: director.email ?? "",
      contactNumber: director.contactNumber ?? "",
    })),

    term: data.billing?.term ?? "",
    billingType: data.billing?.billingType
      ? (BILLING_TYPE_FROM_API[data.billing.billingType] ?? "")
      : "",

    contractDocument: storedFileOfType(documents, "CONTRACT"),
    documents: [...listedDocs, ...extraDocs],
  };
}

// ---------------------------------------------------------------------------
// Form -> API
// ---------------------------------------------------------------------------

/**
 * The set of calls saving a customer onboarding record needs. The customer
 * portal passes `customerService`, which writes the signed in customer's own
 * record; the Admin portal passes a gateway bound to whichever customer is
 * being edited. Derived from `customerService` rather than restated, so a
 * change to a payload breaks the admin gateway at compile time.
 */
export type CustomerOnboardingGateway = Pick<
  typeof customerService,
  | "saveCompany"
  | "saveContacts"
  | "saveDirectors"
  | "saveAddresses"
  | "saveBilling"
  | "uploadDocument"
  | "updateDocument"
  | "deleteDocument"
>;

/** One address as the API takes it: trimmed, and empty means null. */
function addressPayload(address: CustomerAddressBlock) {
  return {
    street1: trimmedOrNull(address.street1),
    street2: trimmedOrNull(address.street2),
    suburb: trimmedOrNull(address.suburb),
    state: trimmedOrNull(address.state),
    country: trimmedOrNull(address.country),
    postCode: trimmedOrNull(address.postCode),
  };
}

/**
 * Writes the whole wizard to the API, one section at a time, then brings the
 * document store in line with what the form is now holding.
 *
 * Sequential on purpose: a failure part way through leaves the earlier sections
 * saved, which is what the customer expects from a form that saves as a whole.
 */
export async function saveOnboarding(
  values: CustomerFormValues,
  loaded: CustomerOnboardingData | null,
  gateway: CustomerOnboardingGateway = customerService,
): Promise<void> {
  await gateway.saveCompany({
    companyName: trimmedOrNull(values.companyName),
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
    firstName: trimmedOrNull(values.firstName),
    lastName: trimmedOrNull(values.lastName),
    designation: trimmedOrNull(values.designation),
    creationDate: values.creationDate || null,
  });

  // A ticked block is sent as a copy of the operations one, which is the whole
  // of what "same as operations" means here - there is no flag alongside it,
  // and `contactBlock` reads the tick back off these rows. Operations is the
  // block being copied, so it is never a copy of itself however the form state
  // got there.
  const contacts: CustomerContactPayload[] = CONTACT_BLOCKS.map((block) => {
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
      designation: trimmedOrNull(director.designation),
      email: trimmedOrNull(director.email),
      contactNumber: trimmedOrNull(director.contactNumber),
    })),
  );

  await gateway.saveAddresses({
    billingSameAsPrincipal: values.billingSameAsPrincipal,
    principal: addressPayload(values.principalAddress),
    // The tick is remembered, but the copy is what is sent: nothing reading the
    // billing address should have to follow a flag to find one.
    billing: addressPayload(
      values.billingSameAsPrincipal ? values.principalAddress : values.billingAddress,
    ),
  });

  await gateway.saveBilling({
    term: trimmedOrNull(values.term),
    billingType: BILLING_TYPE_TO_API[values.billingType] ?? null,
  });

  await syncDocuments(values, loaded?.documents ?? [], gateway);
}

/**
 * Uploads what is new, removes what the customer took out, and leaves untouched
 * files alone. A single slot upload replaces its predecessor server side, so
 * only removals have to be deleted here.
 */
async function syncDocuments(
  values: CustomerFormValues,
  stored: CustomerDocument[],
  gateway: CustomerOnboardingGateway,
): Promise<void> {
  /** The single slot uploads: the logo and the contract. */
  const slots: Array<{ docType: CustomerDocumentType; value: UploadedFile | null }> = [
    { docType: "COMPANY_LOGO", value: values.companyLogo },
    { docType: "CONTRACT", value: values.contractDocument },
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

  // The document rows. Each is one row, listed or added by the customer, and
  // keyed by its own stored document id once it holds a file. A row the
  // customer cleared or took off the form is a document to delete: a stored
  // document with no row still holding its id is one that is gone.
  const keptIds = new Set(
    values.documents
      .map((row) => row.file?.documentId)
      .filter((id): id is string => Boolean(id)),
  );

  for (const doc of stored) {
    if (doc.docType !== "ADDITIONAL") continue;
    if (!keptIds.has(doc.id)) await gateway.deleteDocument(doc.id);
  }

  for (const row of values.documents) {
    if (row.file?.dataUrl) {
      await gateway.uploadDocument({
        file: dataUrlToFile(row.file),
        docType: row.docType as CustomerDocumentType,
        category: row.label || undefined,
      });
      continue;
    }

    // A row with no file at all has nothing to store. It is left alone rather
    // than deleted: the delete pass above has already removed what went.
    if (!row.file) continue;

    // Already stored. The bytes cannot change without replacing them, but the
    // name it is filed under can still be corrected in place.
    const documentId = row.file.documentId;
    const existing = stored.find((doc) => doc.id === documentId);
    if (!documentId || !existing) continue;
    if ((existing.category ?? "") === row.label) continue;

    await gateway.updateDocument(documentId, {
      category: row.label || null,
      // The API writes whatever it is handed, so the stored dates are handed
      // straight back. The form asks for neither, and leaving them out would
      // wipe both.
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
export function needsSubmission(data: CustomerOnboardingData | null): boolean {
  const status = data?.onboardingStatus ?? "NOT_STARTED";
  return status === "NOT_STARTED" || status === "IN_PROGRESS" || status === "REJECTED";
}

/**
 * What is still missing before the form can be handed in.
 *
 * The same details the backend insists on, so the submit button can say why it
 * is disabled rather than only failing once it has been pressed.
 */
export function submissionBlockers(values: CustomerFormValues): string[] {
  const missing: string[] = [];

  if (!values.companyName.trim()) missing.push("Company name");
  if (!values.abn.trim()) missing.push("ABN");
  if (!values.principalAddress.street1.trim()) missing.push("Principal address");
  // The tick makes the principal address the billing one, so it is only asked
  // for separately when the tick is off.
  if (!values.billingSameAsPrincipal && !values.billingAddress.street1.trim()) {
    missing.push("Billing address");
  }
  if (!values.operations.contactPerson.trim() || !values.operations.email.trim()) {
    missing.push("Operations contact");
  }
  if (!values.billingType.trim()) missing.push("Billing type");
  // The Documents section is optional: every document is listed for a customer
  // to attach where they have it, and none of them gate the submit.

  return missing;
}
