import { customerService } from "./customerService";
import type { DocumentSource } from "@/hooks/useDocumentUrl";

/**
 * Where a customer's own document previews come from.
 *
 * Kept in its own module so the components that need it do not have to reach
 * past `useDocumentUrl`, whose default source is the driver API.
 */
export const customerDocuments: DocumentSource = {
  link: (documentId) => customerService.documentLink(documentId),
  blob: (documentId) => customerService.fetchDocumentBlobUrl(documentId),
};
