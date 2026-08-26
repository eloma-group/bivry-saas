import { request } from "./api";
import type { RoleSlug } from "@/types/auth";

/**
 * The Australian Business Register, reached through our own API.
 *
 * The register publishes no CORS headers, so the browser cannot call it
 * directly however public the data is. The backend proxies it, and mounts the
 * same handler on both portals: a vendor filling in their own form and an
 * admin filling it in for them ask the same question.
 */
export interface AbnLookupResult {
  abn: string;
  /** "Active", "Cancelled". Blank when the register omits it. */
  abnStatus: string;
  abnStatusFrom: string;
  /** Nine bare digits, or "" for a sole trader or a trust. */
  acn: string;
  /** The legal entity name. */
  entityName: string;
  /** Registered trading names, most recent first as the register lists them. */
  businessNames: string[];
  entityTypeCode: string;
  entityTypeName: string;
  postcode: string;
  state: string;
  gstFrom: string;
}

export function lookupAbn(abn: string, role: RoleSlug | undefined): Promise<AbnLookupResult> {
  // Only these two portals mount the route. Anything else is the development
  // auth bypass, which stands in a vendor's shoes.
  const portal = role === "admin" ? "admin" : "vendor";

  return request<AbnLookupResult>({
    url: `/${portal}/abn-lookup`,
    method: "GET",
    params: { abn },
  });
}

/**
 * The status the way the register prints it: "Active from 24 Nov 2025".
 *
 * Kept as one line because that is what the field shows and what it stores. The
 * two halves arrive separately so the register's wording is never guessed at.
 */
export function abnStatusLine(found: AbnLookupResult): string {
  if (!found.abnStatus) return "";
  return found.abnStatusFrom ? `${found.abnStatus} from ${found.abnStatusFrom}` : found.abnStatus;
}

/**
 * Where the business stands on GST, worded the way the register words it.
 *
 * The register publishes a date and nothing else, so a date means registered
 * and no date means not. Both readings are stated in full rather than left as a
 * bare date, because "01 Jul 2000" on its own says nothing about GST.
 */
export function gstLine(found: AbnLookupResult): string {
  return found.gstFrom ? `Registered from ${found.gstFrom}` : "Not registered";
}
