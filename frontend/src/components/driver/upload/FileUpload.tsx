import { useId, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, Camera, X, FileText, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CameraCapture } from "@/components/driver/camera/CameraCapture";
import { ACCEPT_DOCUMENT, readAsDataUrl, formatBytes } from "@/utils/validation";
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
}

/**
 * Reusable upload surface: drag & drop, file picker, optional webcam capture,
 * instant preview thumbnail and a remove control.
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
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const [dragging, setDragging] = useState(false);
  const [camOpen, setCamOpen] = useState(false);

  const ingest = async (file?: File | null) => {
    if (!file) return;
    const dataUrl = await readAsDataUrl(file);
    onChange({ name: file.name, size: file.size, type: file.type, dataUrl });
  };

  // A file that is already stored keeps its bytes on the server, so there is
  // nothing local to draw a thumbnail from.
  const thumbnail = value?.type.startsWith("image/") ? value.dataUrl : "";

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
              <UploadCloud className="h-5 w-5" />
            </span>
            <span className="text-sm font-medium text-foreground">{label}</span>
            <span className="text-xs text-muted-foreground">
              Drag & drop or click to browse
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
