import { useEffect, useState } from "react";
import { driverService } from "@/services/driverService";

/**
 * Reading a stored document.
 *
 * Files live in Azure Blob Storage in a private container, so the API hands out
 * a short lived read only SAS link and the browser loads the file straight from
 * blob storage - the bytes never travel through the API.
 *
 * The one exception is a developer running without any Azure credentials, where
 * the API replies with its own streaming path instead of a signed URL. That path
 * needs the session token, so it is fetched and turned into an object URL.
 */

/**
 * Where the links come from. A driver reads their own documents through the
 * driver API; an admin reads a driver's documents through the admin API, which
 * checks a different permission. The component does not care which.
 */
export interface DocumentSource {
  link: (documentId: string) => Promise<{ url: string }>;
  blob: (documentId: string) => Promise<string>;
}

export const ownDocuments: DocumentSource = {
  link: (documentId) => driverService.documentLink(documentId),
  blob: (documentId) => driverService.fetchDocumentBlobUrl(documentId),
};

function isSignedLink(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

/** A displayable URL for a stored document, or null while it is being resolved. */
export function useDocumentUrl(
  documentId: string | null | undefined,
  source: DocumentSource = ownDocuments,
): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!documentId) {
      setUrl(null);
      return;
    }

    let objectUrl: string | null = null;
    let cancelled = false;

    (async () => {
      const link = await source.link(documentId);

      // Straight from blob storage: usable in an <img src> as it is.
      if (isSignedLink(link.url)) {
        if (!cancelled) setUrl(link.url);
        return;
      }

      const local = await source.blob(documentId);
      objectUrl = local;
      if (cancelled) {
        URL.revokeObjectURL(local);
        return;
      }
      setUrl(local);
    })().catch(() => {
      // A preview that cannot load is not worth interrupting anyone over; the
      // caller falls back to a placeholder.
    });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setUrl(null);
    };
    // A new source object on every render would refetch forever, so callers pass
    // a stable one and only the id is tracked.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  return url;
}

/** Opens a stored document in a new tab, loading it from blob storage. */
export async function openDocument(
  documentId: string,
  source: DocumentSource = ownDocuments,
): Promise<void> {
  const link = await source.link(documentId);
  const signed = isSignedLink(link.url);
  const url = signed ? link.url : await source.blob(documentId);

  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.target = "_blank";
  anchor.rel = "noopener";
  anchor.click();

  // Only a local object URL is ours to release, and the new tab has read it long
  // before this fires.
  if (!signed) window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
