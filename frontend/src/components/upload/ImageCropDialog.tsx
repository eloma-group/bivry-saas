import { useEffect, useRef, useState } from "react";
import ReactCrop, { type Crop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Crop as CropIcon, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cropToDataUrl, withCroppedBytes } from "@/utils/cropImage";
import type { UploadedFile } from "@/types/driver";

/**
 * Opens on 80% of the image rather than the whole of it, so the handles are
 * visible the moment the dialog appears and it is obvious the box can be
 * dragged. Starting at 100% looks like a plain preview.
 */
const INITIAL_CROP: Crop = { unit: "%", x: 10, y: 10, width: 80, height: 80 };

interface ImageCropDialogProps {
  /** The picture just picked or taken, or null when nothing is waiting. */
  file: UploadedFile | null;
  /** What is being cropped, for the heading: "Profile photo", "Company logo". */
  label: string;
  /** The cropped picture, or the original if the crop was skipped. */
  onConfirm: (file: UploadedFile) => void;
  onCancel: () => void;
}

/**
 * Crop an image on the way in.
 *
 * Free ratio on purpose: there is no `aspect`, so the box can be dragged to any
 * shape. A profile photo is drawn in a circle and a logo on a white card, and
 * forcing a square on either would cut off the half somebody wanted to keep.
 *
 * Skipping is a first class choice. Somebody who already cropped the picture on
 * their phone should not have to do it again, so "Use original" keeps the bytes
 * exactly as they arrived.
 */
export function ImageCropDialog({ file, label, onConfirm, onCancel }: ImageCropDialogProps) {
  const [crop, setCrop] = useState<Crop>(INITIAL_CROP);
  const [applying, setApplying] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // A second picture opening in the same dialog starts from the default box
  // rather than inheriting wherever the last one was dragged to.
  useEffect(() => {
    if (file) {
      setCrop(INITIAL_CROP);
      setFailed(null);
    }
  }, [file]);

  async function apply() {
    const image = imageRef.current;
    if (!image || !file) return;

    // `crop` is the box on screen and it updates on every drag, so it is the
    // only honest source for what to cut. The obvious alternative, keeping
    // whatever onComplete last reported, quietly disagrees with the screen: it
    // only fires on pointer up, so a drag that ends outside the window, or is
    // interrupted, leaves it stale and crops something the person never drew.
    const box: PixelCrop =
      crop.unit === "%"
        ? {
            unit: "px",
            x: (crop.x / 100) * image.width,
            y: (crop.y / 100) * image.height,
            width: (crop.width / 100) * image.width,
            height: (crop.height / 100) * image.height,
          }
        : { ...crop, unit: "px" };

    if (box.width < 1 || box.height < 1) {
      setFailed("Drag out a larger area to crop.");
      return;
    }

    setApplying(true);
    setFailed(null);
    try {
      onConfirm(withCroppedBytes(file, await cropToDataUrl(image, box)));
    } catch {
      setFailed("That image could not be cropped. Use it as it is, or try another.");
    } finally {
      setApplying(false);
    }
  }

  return (
    <Dialog open={file !== null} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Crop {label.toLowerCase()}</DialogTitle>
          <DialogDescription>
            Drag the box or any of its corners. It is free form, so the crop can be
            any shape you like.
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[60vh] place-items-center overflow-auto rounded-2xl bg-secondary/60 p-3">
          {file ? (
            <ReactCrop
              crop={crop}
              // Kept as percentages so the box survives the image being
              // re-laid out, which happens the moment the window is resized.
              onChange={(_pixel, percent) => setCrop(percent)}
              ruleOfThirds
            >
              {/* Not next/image or a background: react-image-crop measures this
                  element to map the box back onto the source bitmap. */}
              <img
                ref={imageRef}
                src={file.dataUrl}
                alt={label}
                className="block max-h-[52vh] w-auto max-w-full"
              />
            </ReactCrop>
          ) : null}
        </div>

        {failed ? <p className="text-sm font-medium text-destructive">{failed}</p> : null}

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={applying}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => file && onConfirm(file)}
            disabled={applying}
          >
            Use original
          </Button>
          <Button type="button" onClick={() => void apply()} disabled={applying}>
            {applying ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Cropping
              </>
            ) : (
              <>
                <CropIcon className="h-4 w-4" /> Crop and use
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
