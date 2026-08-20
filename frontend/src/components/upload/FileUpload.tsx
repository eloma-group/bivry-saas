import { useId, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, Camera, X, FileText, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CameraCapture } from "@/components/upload/CameraCapture";
import {
  ACCEPT_DOCUMENT,
  acceptLabel,
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
  className,
  error,
  required = false,
  compact = false,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const [dragging, setDragging] = useState(false);
  const [camOpen, setCamOpen] = useState(false);
  const [converting, setConverting] = useState(false);

  const formats = acceptLabel(accept);

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
    onChange({ name: file.name, size: file.size, type: file.type, dataUrl });
  };

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

        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => void ingest(e.target.files?.[0])}
        />

        {error && <p className="mt-1 text-[0.7rem] font-medium text-red-500">{error}</p>}
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
            <button
              type="button"
              onClick={() => onChange(null)}
              className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-500"
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
              onChange={(e) => void ingest(e.target.files?.[0])}
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
          onCapture={(f) => onChange(f)}
        />
      )}
    </div>
  );
}
