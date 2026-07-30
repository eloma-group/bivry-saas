import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormAlertProps {
  tone: "error" | "success";
  message: string;
  className?: string;
}

/** Inline banner for a failed or successful submit. */
export function FormAlert({ tone, message, className }: FormAlertProps) {
  const Icon = tone === "error" ? AlertCircle : CheckCircle2;

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm",
        tone === "error"
          ? "border-destructive/25 bg-destructive/5 text-destructive"
          : "border-brand-green/30 bg-brand-green/10 text-[#136f4f]",
        className,
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span className="leading-relaxed">{message}</span>
    </div>
  );
}
