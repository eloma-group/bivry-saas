import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface SuccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
}

/** Celebratory confirmation with an animated tick draw-in. */
export function SuccessDialog({ open, onOpenChange, name }: SuccessDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md text-center" hideClose>
        <div className="flex flex-col items-center gap-4 py-2">
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 240, damping: 16 }}
            className="grid h-20 w-20 place-items-center rounded-full bg-emerald-50"
          >
            <svg viewBox="0 0 52 52" className="h-12 w-12">
              <motion.circle
                cx="26"
                cy="26"
                r="23"
                fill="none"
                stroke="#10b981"
                strokeWidth="3"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5 }}
              />
              <motion.path
                d="M16 27 L23 34 L37 19"
                fill="none"
                stroke="#10b981"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.4, delay: 0.35 }}
              />
            </svg>
          </motion.div>

          <div>
            <DialogTitle className="text-xl">Application submitted</DialogTitle>
            <DialogDescription className="mt-1.5">
              {name || "The driver"} has been submitted successfully and is now
              pending review by the compliance team. You can keep editing these
              details while the review is in progress.
            </DialogDescription>
          </div>

          <div className="mt-2 flex w-full">
            <Button className="flex-1" onClick={() => onOpenChange(false)}>
              View my profile
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
