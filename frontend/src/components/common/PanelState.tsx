import { AlertTriangle, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Spinner for a page whose data is still on the way. Sits inside the shell. */
export function PanelLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div className="grid min-h-[60vh] w-full place-items-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

/** The same slot when the load failed, with a way to try again. */
export function PanelError({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="grid min-h-[60vh] w-full place-items-center">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-red-50 text-red-500">
          <AlertTriangle className="h-6 w-6" />
        </span>
        <div>
          <p className="text-base font-semibold text-foreground">
            Something went wrong
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{message}</p>
        </div>
        {onRetry && (
          <Button variant="outline" onClick={onRetry}>
            <RotateCcw className="h-4 w-4" /> Try again
          </Button>
        )}
      </div>
    </div>
  );
}
