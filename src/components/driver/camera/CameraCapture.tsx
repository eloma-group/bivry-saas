import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, RotateCcw, Check, VideoOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCamera } from "@/hooks/useCamera";
import type { UploadedFile } from "@/types/driver";

interface CameraCaptureProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  onCapture: (file: UploadedFile) => void;
}

/**
 * Reusable webcam capture dialog: live preview → capture → retake / save.
 * Handles permissions and always releases the media stream when closed.
 */
export function CameraCapture({
  open,
  onOpenChange,
  title = "Take a photo",
  onCapture,
}: CameraCaptureProps) {
  const { videoRef, ready, error, start, stop, capture } = useCamera();
  const [shot, setShot] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setShot(null);
      void start();
    } else {
      stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleCapture = () => {
    const url = capture();
    if (url) setShot(url);
  };

  const handleSave = () => {
    if (!shot) return;
    onCapture({
      name: `capture-${Date.now()}.jpg`,
      size: Math.round((shot.length * 3) / 4),
      type: "image/jpeg",
      dataUrl: shot,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Position within the frame and capture. You can retake before saving.
          </DialogDescription>
        </DialogHeader>

        <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-brand-navy">
          {error ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-slate-200">
              <VideoOff className="h-8 w-8 opacity-70" />
              <p className="text-sm">{error}</p>
              <Button size="sm" variant="secondary" onClick={() => start()}>
                Retry
              </Button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                className="h-full w-full object-cover"
              />
              <AnimatePresence>
                {shot && (
                  <motion.img
                    key="shot"
                    src={shot}
                    initial={{ opacity: 0, scale: 1.04 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                )}
              </AnimatePresence>
              {!ready && !shot && (
                <div className="absolute inset-0 grid place-items-center text-sm text-slate-300">
                  Starting camera…
                </div>
              )}
              <div className="pointer-events-none absolute inset-4 rounded-xl border-2 border-white/25" />
            </>
          )}
        </div>

        <div className="flex items-center justify-center gap-3">
          {!shot ? (
            <Button onClick={handleCapture} disabled={!ready} className="min-w-40">
              <Camera className="h-4 w-4" /> Capture
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setShot(null)}>
                <RotateCcw className="h-4 w-4" /> Retake
              </Button>
              <Button onClick={handleSave} className="min-w-32">
                <Check className="h-4 w-4" /> Save
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
