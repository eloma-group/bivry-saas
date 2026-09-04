import { useEffect, useState } from "react";
import {
  permanentDataService,
  type PermanentCustomer,
} from "@/services/permanentDataService";

/**
 * Our saved pickups, for the Create Booking form to fill itself in from.
 *
 * Every pickup row on the form offers the same list, and a booking that loads
 * at three places would otherwise ask the server three times for it. So the
 * request is made once and shared: the promise is held here, and every field
 * that asks joins whichever one is already in flight.
 *
 * `reload` throws the cache away and fetches again, which is what a form that
 * has been open while somebody added a record needs.
 */

let cached: Promise<PermanentCustomer[]> | null = null;

function fetchOnce(): Promise<PermanentCustomer[]> {
  if (!cached) {
    cached = permanentDataService.listCustomers().catch((error: unknown) => {
      // A failed load must not be remembered as the answer, or the form would
      // offer nothing for the rest of the session.
      cached = null;
      throw error;
    });
  }
  return cached;
}

export function usePermanentCustomers() {
  const [rows, setRows] = useState<PermanentCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;

    setLoading(true);
    void fetchOnce()
      .then((result) => {
        if (!live) return;
        setRows(result);
        setFailed(false);
      })
      .catch(() => {
        if (live) setFailed(true);
      })
      .finally(() => {
        if (live) setLoading(false);
      });

    return () => {
      live = false;
    };
  }, []);

  return { rows, loading, failed };
}

/** Forgets the shared list, so the next form to ask fetches it again. */
export function forgetPermanentCustomers(): void {
  cached = null;
}
