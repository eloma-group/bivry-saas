/** Shared, reusable field validators used across the driver form. */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_RE = /^[+]?[\d\s()-]{7,17}$/;

/**
 * What the document store actually accepts. Kept in step with the backend
 * upload filter, so a file is never picked here only to be refused on save.
 */
export const ACCEPT_IMAGE = "image/jpeg,image/png,image/webp,image/heic";
export const ACCEPT_DOCUMENT = `${ACCEPT_IMAGE},application/pdf`;

export const rules = {
  required: (label: string) => ({
    required: `${label} is required`,
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
