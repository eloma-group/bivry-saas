/** Shared, reusable field validators used across the driver form. */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_RE = /^[+]?[\d\s()-]{7,17}$/;

/**
 * What the document store actually accepts. Kept in step with the backend
 * upload filter, so a file is never picked here only to be refused on save.
 *
 * The extensions are listed alongside the MIME types because Windows reports no
 * type at all for a .heic file, which would otherwise hide iPhone photos from
 * the picker. A HEIC is converted to JPEG on the way in, see `utils/heic`.
 */
export const ACCEPT_IMAGE =
  "image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif";
export const ACCEPT_DOCUMENT = `${ACCEPT_IMAGE},application/pdf`;

/** The same lists in the words a driver reads under an upload box. */
export const ACCEPT_IMAGE_LABEL = "JPG, PNG, WEBP or HEIC (iPhone)";
export const ACCEPT_DOCUMENT_LABEL = "PDF, JPG, PNG, WEBP or HEIC (iPhone)";

/** The wording that belongs under an upload box, picked from its accept list. */
export function acceptLabel(accept?: string): string {
  const list = accept ?? ACCEPT_DOCUMENT;
  return list.includes("application/pdf") ? ACCEPT_DOCUMENT_LABEL : ACCEPT_IMAGE_LABEL;
}

/** Whether a form value counts as answered. Files are objects, dates strings. */
export function isPresent(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim() !== "";
  return true;
}

export const rules = {
  required: (label: string) => ({
    required: `${label} is required`,
  }),
  /** An upload that has to be there. `required` cannot see a file object. */
  requiredFile: (label: string) => ({
    validate: (value: unknown) => isPresent(value) || `${label} is required`,
  }),
  /** A multi select that needs at least one tick. An empty array is not empty to `required`. */
  requiredList: (label: string) => ({
    validate: (value: unknown) =>
      (Array.isArray(value) && value.length > 0) || `${label} is required`,
  }),
  /**
   * Required, but only while the field is actually being asked for.
   *
   * Sections that appear and disappear - the permanent address, the visa half of
   * the identity section - keep their fields registered after they leave the
   * screen, so a plain `required` there would block a submit over a question
   * nobody was asked. The check is read at validation time, never captured.
   */
  requiredWhen: (label: string, asked: () => boolean) => ({
    validate: (value: unknown) => !asked() || isPresent(value) || `${label} is required`,
  }),
  email: {
    required: "Email is required",
    pattern: { value: EMAIL_RE, message: "Enter a valid email address" },
  },
  phone: {
    required: "Phone number is required",
    pattern: { value: PHONE_RE, message: "Enter a valid phone number" },
  },
  licenceNumber: {
    required: "Licence number is required",
    minLength: { value: 5, message: "Licence number looks too short" },
  },
};

/** Read a File as a data URL for instant preview. */
export function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Turns a data URL held in form state back into a `File`, so a file that was
 * picked or captured offline can be posted as multipart later on.
 */
export function dataUrlToFile(file: {
  name: string;
  type: string;
  dataUrl: string;
}): File {
  const [meta, base64] = file.dataUrl.split(",");
  const mimeType = /:(.*?);/.exec(meta ?? "")?.[1] || file.type || "application/octet-stream";

  const binary = atob(base64 ?? "");
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new File([bytes], file.name, { type: mimeType });
}

export function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${units[i]}`;
}
