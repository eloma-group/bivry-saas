import { useCallback, useEffect, useRef, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { API_BASE_URL, ApiRequestError } from "@/services/api";
import { bookingService } from "@/services/bookingService";
import { sessionStore } from "@/services/session";

/**
 * Holds a job number for the admin filling in the Create Booking form.
 *
 * The number used to be handed out only on save, so the Job Number field sat
 * empty until the booking existed and two admins raising a booking at the same
 * time were both in line for the same one. This asks the server for it as soon
 * as the form opens: the server parks it against this admin, so it is on screen
 * from the start and the next form to open is offered the one after it.
 *
 * It is given back when the form is left without saving, and consumed by the
 * save itself, so a number is only spent on a booking that exists. A browser
 * that never got to say either is covered by the reservation's own expiry.
 */

/** Asks for the number back, and never makes a noise about failing to. */
function release(jobNumber: string): void {
  void bookingService.releaseJobNumber(jobNumber).catch(() => undefined);
}

export function useJobNumberReservation() {
  const { setValue } = useFormContext();
  const financialYear = useWatch({ name: "financialYear" }) as string | undefined;

  const [error, setError] = useState<string | null>(null);

  /** The number currently held, and the financial year it belongs to. */
  const held = useRef<{ jobNumber: string; financialYear: string } | null>(null);
  /**
   * The reserve already running, if any.
   *
   * Every reserve queues behind it rather than starting alongside it, so a
   * second render - or the effect being run twice over, as it is in development -
   * can never take two numbers where one was wanted.
   */
  const inFlight = useRef<Promise<void> | null>(null);
  /** Whether the form has gone away, so a late answer is given straight back. */
  const gone = useRef(false);

  /**
   * Stops holding the number, without asking for it back.
   *
   * Used by the save: the server consumes the reservation itself, so releasing
   * afterwards would be asking it to delete a row that is already gone - and,
   * worse, the unmount that follows the save would otherwise try to.
   */
  const forget = useCallback(() => {
    held.current = null;
  }, []);

  useEffect(() => {
    const year = (financialYear ?? "").trim();

    // Keep what is already held unless the form has moved into a different
    // financial year. The field starts empty and fills itself from the booking
    // date, so an empty year is "not said yet" rather than a change of mind,
    // and re-reserving on it would make the number on screen jump for nothing.
    const satisfied = () => {
      const current = held.current;
      return current !== null && (year === "" || year === current.financialYear);
    };

    if (satisfied()) return;

    const chain = (inFlight.current ?? Promise.resolve())
      .then(async () => {
        // Whatever ran ahead of this may already have taken the right number.
        if (gone.current || satisfied()) return;

        const previous = held.current;
        const reserved = await bookingService.reserveJobNumber(
          year === "" ? {} : { financialYear: year },
        );

        held.current = { jobNumber: reserved.jobNumber, financialYear: reserved.financialYear };
        setValue("jobNumber", reserved.jobNumber);
        setError(null);

        // The one held for the old year is only let go once its replacement is
        // in hand, so a failed re-reserve never leaves the form with nothing.
        if (previous && previous.jobNumber !== reserved.jobNumber) release(previous.jobNumber);

        // The form went away while the server was answering. Give the number
        // straight back rather than leaving it parked for nobody.
        if (gone.current) {
          held.current = null;
          release(reserved.jobNumber);
        }
      })
      .catch((caught: unknown) => {
        if (gone.current) return;
        setError(
          caught instanceof ApiRequestError
            ? caught.message
            : "Could not reserve a job number. One is assigned when the booking is saved.",
        );
      });

    inFlight.current = chain;
  }, [financialYear, setValue]);

  // Leaving the page gives the number back, so it is not stranded until it
  // expires. Both routes are covered: navigating away inside the app unmounts
  // this, and closing or reloading the tab fires `pagehide` with no unmount at
  // all. `keepalive` is what lets that last request outlive the page.
  useEffect(() => {
    gone.current = false;

    function releaseOnUnload() {
      const current = held.current;
      if (!current) return;
      held.current = null;

      const token = sessionStore.getAccessToken();
      if (!token) return;

      void fetch(
        `${API_BASE_URL}/admin/bookings/job-number/${encodeURIComponent(current.jobNumber)}`,
        {
          method: "DELETE",
          keepalive: true,
          credentials: "include",
          headers: { Authorization: `Bearer ${token}` },
        },
      ).catch(() => undefined);
    }

    window.addEventListener("pagehide", releaseOnUnload);
    return () => {
      window.removeEventListener("pagehide", releaseOnUnload);
      gone.current = true;
      const current = held.current;
      held.current = null;
      if (current) release(current.jobNumber);
    };
  }, []);

  return { error, forget };
}
