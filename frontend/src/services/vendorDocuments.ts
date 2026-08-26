import { vendorService } from "./vendorService";
import type { DocumentSource } from "@/hooks/useDocumentUrl";

/**
 * Where a vendor's own document previews come from.
 *
 * Kept in its own module so the components that need it do not have to reach
 * past `useDocumentUrl`, whose default source is the driver API.
 */
export const vendorDocuments: DocumentSource = {
  link: (documentId) => vendorService.documentLink(documentId),
  blob: (documentId) => vendorService.fetchDocumentBlobUrl(documentId),
};
