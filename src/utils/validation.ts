/** Shared, reusable field validators used across the driver form. */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_RE = /^[+]?[\d\s()-]{7,17}$/;

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

export function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${units[i]}`;
}
