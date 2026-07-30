import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/Logo";

export function NotFoundPage() {
  return (
    <div className="grid min-h-[100dvh] w-full place-items-center bg-[#f7f8fa] px-5">
      <div className="w-full max-w-[30rem] text-center">
        <Logo className="mx-auto" />
        <p className="mt-10 text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Error 404
        </p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Page not found
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          The page you are looking for does not exist or has moved.
        </p>
        <Button asChild size="lg" className="mt-8">
          <Link to="/">Back to portals</Link>
        </Button>
      </div>
    </div>
  );
}
