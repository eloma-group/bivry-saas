import { useEffect, useId, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, Camera, X, Eye, FileText, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CameraCapture } from "@/components/upload/CameraCapture";
import { ImageCropDialog } from "@/components/upload/ImageCropDialog";
import { useDocumentSource } from "@/context/DocumentSourceContext";
import {
  ACCEPT_DOCUMENT,
  acceptLabel,
  dataUrlToFile,
  readAsDataUrl,
  formatBytes,
} from "@/utils/validation";
import { heicToJpeg, isHeic } from "@/utils/heic";
import type { UploadedFile } from "@/types/driver";

interface FileUploadProps {
  value: UploadedFile | null;
  onChange: (file: UploadedFile | null) => void;
  label?: string;
  accept?: string;
  /** Show a "Live Camera" button (image capture). */
  allowCamera?: boolean;
  cameraTitle?: string;
  /**
   * Offer a crop before an image is committed, whether it was picked from disk,
   * dropped or taken live.
   *
   * Opt in rather than always on: a PDF cannot be cropped and passes straight
   * through either way, but for a photographed document the crop is the
   * difference between the page and the desk it was lying on. The dialog can
   * always be skipped with "Use original".
   */
  allowCrop?: boolean;
  /** What is being cropped, for the dialog heading. Defaults to the label. */
  cropTitle?: string;
  className?: string;
  error?: string;
  /** Marks the box with a * so a missing file reads as missing, not optional. */
  required?: boolean;
  /**
   * Single row instead of the full dropzone. Used where an upload sits in a
   * table cell and a 6rem tall drop target would blow the row apart.
   */
  compact?: boolean;
}

/**
 * Reusable upload surface: drag & drop, file picker, optional webcam capture,
 * instant preview thumbnail and a remove control.
 *
 * An iPhone HEIC is converted to JPEG on the way in, so the thumbnail here and
 * every later view of the file render in any browser.
 */
export function FileUpload({
  value,
  onChange,
  label = "Upload file",
  accept = ACCEPT_DOCUMENT,
  allowCamera = false,
  cameraTitle = "Capture image",
  allowCrop = false,
  cropTitle,
  className,
  error,
  required = false,
  compact = false,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const [dragging, setDragging] = useState(false);
  const [camOpen, setCamOpen] = useState(false);
  /** Picked or captured, waiting to be cropped. Null when nothing is waiting. */
  const [pending, setPending] = useState<UploadedFile | null>(null);
  const [converting, setConverting] = useState(false);
  const [opening, setOpening] = useState(false);
  const source = useDocumentSource();

  const formats = acceptLabel(accept);

  /**
   * Object URLs handed to tabs opened from here.
   *
   * Revoked when this field goes away rather than straight after opening: the
   * tab loads from the URL asynchronously, so revoking on the next line would
   * sometimes beat it to the bytes. Anything already loaded keeps working
   * after its URL is revoked.
   */
  const objectUrls = useRef<string[]>([]);
  useEffect(
    () => () => {
      for (const url of objectUrls.current) URL.revokeObjectURL(url);
      objectUrls.current = [];
    },
    [],
  );

  /**
   * Opens the attached file in a new tab.
   *
   * A file just picked has not been anywhere yet - it is a data URL held in the
   * form - so it is turned into a blob URL and opened as it is. It cannot be
   * opened directly: browsers refuse to navigate a top level tab to a data URL.
   *
   * A file already stored has its bytes in blob storage behind a short lived
   * signed link that has to be fetched first. The tab is opened before that
   * await, while the click is still the user gesture the popup blocker is
   * looking for, and pointed at the file once the link comes back.
   */
  const view = async () => {
    if (!value || opening) return;

    if (value.dataUrl) {
      const url = URL.createObjectURL(
        dataUrlToFile({ name: value.name, type: value.type, dataUrl: value.dataUrl }),
      );
      objectUrls.current.push(url);
      window.open(url, "_blank");
      return;
    }

    if (!value.documentId) return;

    const tab = window.open("", "_blank");
    setOpening(true);
    try {
      const link = await source.link(value.documentId);
      // Straight from blob storage when it is signed; a developer running
      // without Azure gets the API's own streaming path, which needs the
      // session token and so arrives as a blob.
      const target = /^https?:\/\//i.test(link.url)
        ? link.url
        : await source.blob(value.documentId);
      if (target.startsWith("blob:")) objectUrls.current.push(target);
      if (tab) tab.location.href = target;
    } catch {
      // Nothing to show. Closing the blank tab is less confusing than leaving
      // it sitting there empty.
      tab?.close();
    } finally {
      setOpening(false);
    }
  };

  /** Whether there is anything to open: bytes in hand, or bytes on the server. */
  const viewable = Boolean(value?.dataUrl || value?.documentId);

  const ingest = async (picked?: File | null) => {
    if (!picked) return;

    let file = picked;
    if (isHeic(picked)) {
      setConverting(true);
      try {
        file = await heicToJpeg(picked);
      } finally {
        setConverting(false);
      }
    }

    const dataUrl = await readAsDataUrl(file);
    const picked_file = { name: file.name, size: file.size, type: file.type, dataUrl };

    // Only an image can be cropped. A PDF goes straight in, so the crop offer
    // never stands between somebody and the document they just chose.
    if (allowCrop && file.type.startsWith("image/")) {
      setPending(picked_file);
      return;
    }

    onChange(picked_file);
  };

  /** What a live capture does: crop it first where this field asks for that. */
  const capture = (file: UploadedFile) => {
    if (allowCrop) setPending(file);
    else onChange(file);
  };

  /** The crop dialog, rendered by both layouts below. */
  const cropDialog = allowCrop ? (
    <ImageCropDialog
      file={pending}
      label={cropTitle ?? label}
      onConfirm={(cropped) => {
        onChange(cropped);
        setPending(null);
      }}
      onCancel={() => setPending(null)}
    />
  ) : null;

  // A file that is already stored keeps its bytes on the server, so there is
  // nothing local to draw a thumbnail from.
  const thumbnail = value?.type.startsWith("image/") ? value.dataUrl : "";

  // Table cells get a single row: the same picker, none of the height.
  if (compact) {
    return (
      <div className={cn("w-full", className)}>
        {value ? (
          <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-white px-2.5 py-1.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
              {value.name}
            </span>
            {viewable && (
              <button
                type="button"
                onClick={() => void view()}
                disabled={opening}
                className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary disabled:opacity-50"
                aria-label={`View ${value.name}`}
                title={`View ${value.name}`}
              >
                {opening ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => onChange(null)}
              className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-500"
              aria-label={`Remove ${value.name}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <Button
            type="button"
            variant={error ? "outline" : "secondary"}
            size="sm"
            className={cn("w-full", error && "border-red-300 text-red-600")}
            onClick={() => inputRef.current?.click()}
          >
            {converting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <UploadCloud className="h-3.5 w-3.5" />
            )}
            {label}
          </Button>
        )}

        {allowCamera && !value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-1 w-full text-muted-foreground hover:text-primary"
            onClick={() => setCamOpen(true)}
          >
            <Camera className="h-3.5 w-3.5" /> Use live camera
          </Button>
        )}

        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            void ingest(e.target.files?.[0]);
            // Clearing it means picking the same file twice still fires a
            // change. Without this, cancelling the crop and reaching for the
            // same picture again does nothing at all.
            e.target.value = "";
          }}
        />

        {error && <p className="mt-1 text-[0.7rem] font-medium text-red-500">{error}</p>}

        {allowCamera && (
          <CameraCapture
            open={camOpen}
            onOpenChange={setCamOpen}
            title={cameraTitle}
            onCapture={capture}
          />
        )}

        {cropDialog}
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <AnimatePresence mode="wait">
        {value ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex items-center gap-3 rounded-2xl border border-border/70 bg-white p-3"
          >
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-border/70 bg-secondary">
              {thumbnail ? (
                <img
                  src={thumbnail}
                  alt={value.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full w-full place-items-center text-muted-foreground">
                  <FileText className="h-6 w-6" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 truncate text-sm font-medium text-foreground">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                {value.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatBytes(value.size)}
                {value.documentId ? " - already uploaded" : ""}
              </p>
            </div>
            {viewable && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void view()}
                disabled={opening}
                className="shrink-0 text-muted-foreground hover:text-primary"
                aria-label={`View ${value.name}`}
              >
                {opening ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
                View
              </Button>
            )}
            <button
              type="button"
              onClick={() => onChange(null)}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-500"
              aria-label="Remove file"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ) : (
          <motion.label
            key="dropzone"
            htmlFor={id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              void ingest(e.dataTransfer.files?.[0]);
            }}
            className={cn(
              "group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-6 text-center transition-all",
              dragging
                ? "border-primary bg-primary/5"
                : "border-border bg-secondary/40 hover:border-primary/50 hover:bg-secondary",
              error && "border-red-300 bg-red-50/50"
            )}
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-105">
              {converting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <UploadCloud className="h-5 w-5" />
              )}
            </span>
            <span className="text-sm font-medium text-foreground">
              {label}
              {required && <span className="ml-0.5 text-primary">*</span>}
            </span>
            <span className="text-xs text-muted-foreground">
              {converting ? "Converting your iPhone photo…" : "Drag & drop or click to browse"}
            </span>
            <span className="text-[0.7rem] leading-relaxed text-muted-foreground">
              Accepts {formats}
            </span>
            <input
              ref={inputRef}
              id={id}
              type="file"
              accept={accept}
              className="hidden"
              onChange={(e) => {
                void ingest(e.target.files?.[0]);
                // See the note in the compact layout above: without this,
                // cancelling a crop and picking the same file again does nothing.
                e.target.value = "";
              }}
            />
          </motion.label>
        )}
      </AnimatePresence>

      {allowCamera && !value && (
        <div className="mt-2 flex justify-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-primary"
            onClick={() => setCamOpen(true)}
          >
            <Camera className="h-4 w-4" /> Use live camera
          </Button>
        </div>
      )}

      {error && <p className="mt-1.5 text-xs font-medium text-red-500">{error}</p>}

      {allowCamera && (
        <CameraCapture
          open={camOpen}
          onOpenChange={setCamOpen}
          title={cameraTitle}
          onCapture={capture}
        />
      )}

      {cropDialog}
    </div>
  );
}
