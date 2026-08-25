import type { PixelCrop } from "react-image-crop";
import type { UploadedFile } from "@/types/driver";

/**
 * The longest side a cropped image is allowed to keep.
 *
 * A phone camera hands back something like 4032x3024, and a profile photo or a
 * company logo is never shown anywhere near that size. Capping the output keeps
 * the upload small without any visible loss, which matters most on the mobile
 * connections these forms are filled in on.
 */
const MAX_SIDE = 1920;

/** Quality for the re-encode. High enough that the crop is not the weak link. */
const QUALITY = 0.9;

/**
 * Cuts `pixelCrop` out of an image and returns it as a data URL.
 *
 * `pixelCrop` is in the coordinates of the image as it is drawn on screen,
 * which is what react-image-crop reports. The source is the full resolution
 * bitmap, so both axes are scaled back up before the cut is made - otherwise
 * cropping a photo that was shrunk to fit the dialog would return a thumbnail
 * of the corner rather than the region the person selected.
 */
export async function cropToDataUrl(
  image: HTMLImageElement,
  pixelCrop: PixelCrop,
  mimeType = "image/jpeg",
): Promise<string> {
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  const sourceWidth = Math.round(pixelCrop.width * scaleX);
  const sourceHeight = Math.round(pixelCrop.height * scaleY);

  const shrink = Math.min(1, MAX_SIDE / Math.max(sourceWidth, sourceHeight));
  const outWidth = Math.max(1, Math.round(sourceWidth * shrink));
  const outHeight = Math.max(1, Math.round(sourceHeight * shrink));

  const canvas = document.createElement("canvas");
  canvas.width = outWidth;
  canvas.height = outHeight;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not read the image");

  // A PNG with transparency would otherwise get black corners once it is
  // re-encoded as a JPEG, which is what a logo on a transparent background
  // looks like when it goes wrong.
  if (mimeType === "image/jpeg") {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, outWidth, outHeight);
  }

  context.imageSmoothingQuality = "high";
  context.drawImage(
    image,
    Math.round(pixelCrop.x * scaleX),
    Math.round(pixelCrop.y * scaleY),
    sourceWidth,
    sourceHeight,
    0,
    0,
    outWidth,
    outHeight,
  );

  return canvas.toDataURL(mimeType, QUALITY);
}

/** Bytes a base64 data URL will weigh once decoded, near enough for a size label. */
export function dataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.round((base64.length * 3) / 4) - padding);
}

/** The same file, with the cropped bytes in place of the original ones. */
export function withCroppedBytes(file: UploadedFile, dataUrl: string): UploadedFile {
  return {
    ...file,
    // The crop is re-encoded as a JPEG, so the name should not still claim .png.
    name: file.name.replace(/\.[^.]+$/, "") + ".jpg",
    type: "image/jpeg",
    size: dataUrlBytes(dataUrl),
    dataUrl,
    // Cropping produces new bytes, so whatever was stored before is no longer
    // this file. Dropping the id makes the save pipeline upload it again.
    documentId: undefined,
  };
}
