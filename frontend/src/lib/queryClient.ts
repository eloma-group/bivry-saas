import { QueryClient } from "@tanstack/react-query";
import { ApiRequestError } from "@/services/api";

/**
 * One cache for the whole admin panel.
 *
 * Moving between pages used to refetch everything that page showed, so a list
 * already on screen a moment ago was fetched again and the panel flashed its
 * loader on every step. What is cached here is served straight away and only
 * refreshed when it is actually stale, which is what makes the panel feel
 * continuous rather than reloaded.
 *
 * The defaults are set for admin data: it changes when somebody in this
 * building changes it, not on its own, so a few minutes of staleness is
 * accurate and a window regaining focus is not news.
 */

/** How long a list is trusted without asking the server again. */
const STALE_MS = 5 * 60 * 1000;

/** How long an unused list is kept, in case the admin comes back to it. */
const GC_MS = 30 * 60 * 1000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STALE_MS,
      gcTime: GC_MS,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      /**
       * A request the server refused is not worth repeating: a 401 will not
       * become a 200 on the third go, and retrying a 404 only delays the error
       * the page is going to show anyway. Anything else - a dropped connection,
       * a gateway hiccup - is worth one more try.
       */
      retry: (failureCount, error) => {
        const status = error instanceof ApiRequestError ? error.status : undefined;
        if (status !== undefined && status >= 400 && status < 500) return false;
        return failureCount < 1;
      },
    },
  },
});
