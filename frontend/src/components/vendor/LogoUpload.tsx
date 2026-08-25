import { useRef, useState } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { motion } from "framer-motion";
import { Building2, Camera, ImageUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CameraCapture } from "@/components/upload/CameraCapture";
import { useDocumentUrl } from "@/hooks/useDocumentUrl";
import { vendorDocuments } from "@/services/vendorDocuments";
import { useDocumentSource } from "@/context/DocumentSourceContext";
import {
  ACCEPT_IMAGE,
  ACCEPT_IMAGE_LABEL,
  readAsDataUrl,
  rules,
} from "@/utils/validation";
import { heicToJpeg, isHeic } from "@/utils/heic";
import type { UploadedFile } from "@/types/driver";

/** Large company logo control: upload from disk or capture live. */
export function LogoUpload() {
  const { control } = useFormContext();
  const inputRef = useRef<HTMLInputElement>(null);
  const [camOpen, setCamOpen] = useState(false);
  const stored = useWatch({ control, name: "companyLogo" }) as UploadedFile | null;
  // A logo saved earlier has no local bytes, so it is fetched for the preview.
  const storedUrl = useDocumentUrl(
    stored?.dataUrl ? null : stored?.documentId,
    useDocumentSource(vendorDocuments),
  );

  return (
    <Controller
      control={control}
      name="companyLogo"
      rules={rules.requiredFile("Company logo")}
      render={({ field, fieldState }) => {
        const value = field.value as UploadedFile | null;
        const preview = value ? value.dataUrl || storedUrl : null;
        const onFile = async (picked?: File | null) => {
          if (!picked) return;
          // An iPhone HEIC becomes a JPEG here, so the logo draws everywhere.
          const file = isHeic(picked) ? await heicToJpeg(picked) : picked;
          const dataUrl = await readAsDataUrl(file);
          field.onChange({
            name: file.name,
            size: file.size,
            type: file.type,
            dataUrl,
          });
        };

        return (
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
            <div className="relative">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className="grid h-28 w-28 place-items-center overflow-hidden rounded-3xl border-4 border-white bg-secondary shadow-card ring-1 ring-border"
              >
                {preview ? (
                  <img src={preview} alt="Company logo" className="h-full w-full object-cover" />
                ) : (
                  <Building2 className="h-12 w-12 text-slate-300" />
                )}
              </motion.div>
              <button
                type="button"
                onClick={() => setCamOpen(true)}
                className="absolute bottom-1 right-1 grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground shadow-lift transition-transform hover:scale-105"
                aria-label="Take photo"
              >
                <Camera className="h-4 w-4" />
              </button>
              {value && (
                <button
                  type="button"
                  onClick={() => field.onChange(null)}
                  className="absolute -right-1 -top-1 grid h-7 w-7 place-items-center rounded-full border border-border bg-white text-muted-foreground shadow-soft transition-colors hover:text-red-500"
                  aria-label="Remove logo"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-col items-center gap-2 sm:items-start">
              <p className="text-sm font-medium text-foreground">
                Company Logo<span className="ml-0.5 text-primary">*</span>
              </p>
              <p className="max-w-xs text-center text-xs text-muted-foreground sm:text-left">
                Your business logo, square works best. Accepts {ACCEPT_IMAGE_LABEL}.
              </p>
              {fieldState.error && (
                <p className="text-xs font-medium text-red-500">{fieldState.error.message}</p>
              )}
              <div className="mt-1 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => inputRef.current?.click()}
                >
                  <ImageUp className="h-4 w-4" /> Upload Image
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setCamOpen(true)}
                >
                  <Camera className="h-4 w-4" /> Take Photo
                </Button>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPT_IMAGE}
                className="hidden"
                onChange={(e) => void onFile(e.target.files?.[0])}
              />
            </div>

            <CameraCapture
              open={camOpen}
              onOpenChange={setCamOpen}
              title="Take a photo of the logo"
              onCapture={(f) => field.onChange(f)}
            />
          </div>
        );
      }}
    />
  );
}
