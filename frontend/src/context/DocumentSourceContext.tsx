import { createContext, useContext, useMemo, type ReactNode } from "react";
import { ownDocuments, type DocumentSource } from "@/hooks/useDocumentUrl";

/**
 * Which API stored files are read through.
 *
 * The onboarding forms are built from small field components that sit several
 * levels deep, and any one of them may need to show a file uploaded earlier. A
 * driver reads those through the driver API and a supplier through the supplier
 * API; an admin editing either has to read them through the admin API, which
 * checks a different permission. Threading a source prop down through every
 * section to reach an avatar would be noise in nine files, so it travels by
 * context instead.
 *
 * The context holds null when nothing has provided one, which is how
 * `useDocumentSource` can tell "no provider" apart from "a provider that chose
 * the default". The two portals have different defaults, so that difference
 * matters: a supplier component left to itself must fall back to the supplier
 * API, not the driver one.
 */
const DocumentSourceContext = createContext<DocumentSource | null>(null);

export function DocumentSourceProvider({
  source,
  children,
}: {
  source: DocumentSource;
  children: ReactNode;
}) {
  // `useDocumentUrl` only re-runs on a changed id, so an unstable source would
  // silently go stale rather than refetch. Memoising on the two functions keeps
  // the identity steady for as long as they are.
  const value = useMemo(() => source, [source.link, source.blob]);
  return <DocumentSourceContext.Provider value={value}>{children}</DocumentSourceContext.Provider>;
}

/**
 * The source a component should read files through: whatever a provider above
 * it set, or `fallback` when it is standing on its own in its own portal.
 */
export function useDocumentSource(fallback: DocumentSource = ownDocuments): DocumentSource {
  return useContext(DocumentSourceContext) ?? fallback;
}
