import { Loader2 } from "lucide-react";

/** Centred spinner used while a route decides what to render. */
export function FullPageLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div className="grid min-h-[100dvh] w-full place-items-center bg-[#f7f8fa]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
