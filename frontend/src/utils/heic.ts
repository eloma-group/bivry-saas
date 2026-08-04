/**
 * HEIC support.
 *
 * iPhones hand over photos as HEIC, which no browser except Safari can draw.
 * Uploading the file untouched means the driver, the admin and every later
 * viewer see a broken thumbnail, so a picked HEIC is converted to JPEG here,
 * once, before it is stored. Everything downstream then works with an image
 * every browser can render.
 *
 * The decoder is over a megabyte, and most drivers never upload a HEIC, so it
 * is imported only at the moment one is picked rather than on every page load.
 */

const HEIC_MIME = new Set(["image/heic", "image/heif", "image/heic-sequence", "image/heif-sequence"]);

/**
 * Whether a picked file is HEIC. The MIME type is missing on some platforms
 * (Windows reports an empty string for .heic), so the extension is the fallback.
 */
export function isHeic(file: File): boolean {
  if (HEIC_MIME.has(file.type.toLowerCase())) return true;
  return /\.hei[cf]$/i.test(file.name);
}

/** Swaps a .heic / .heif extension for .jpg, keeping the rest of the name. */
function jpegName(name: string): string {
  return /\.hei[cf]$/i.test(name) ? name.replace(/\.hei[cf]$/i, ".jpg") : `${name}.jpg`;
}

/**
 * A JPEG copy of a HEIC file. The original is returned untouched when the
 * conversion fails, so a picture is never lost to a decoder that gave up: it
 * still uploads and can still be downloaded, it just cannot be previewed.
 */
export async function heicToJpeg(file: File): Promise<File> {
  try {
    const { default: heic2any } = await import("heic2any");
    const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
    // heic2any returns an array for multi-image (burst) files.
    const blob = Array.isArray(converted) ? converted[0] : converted;
    return new File([blob], jpegName(file.name), { type: "image/jpeg" });
  } catch {
    return file;
  }
}
