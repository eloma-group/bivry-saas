import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, FormProvider, useFormContext, useWatch } from "react-hook-form";
import { motion } from "framer-motion";
import {
  ClipboardList,
  PackageCheck,
  Truck,
  Wallet,
  Handshake,
  Loader2,
  Save,
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PanelError, PanelLoader } from "@/components/common/PanelState";
import { BookingDetailsSection } from "@/components/booking/forms/BookingDetailsSection";
import { VehicleDetailsSection } from "@/components/booking/forms/VehicleDetailsSection";
import { PickupDetailsSection } from "@/components/booking/forms/PickupDetailsSection";
import { DeliveryDetailsSection } from "@/components/booking/forms/DeliveryDetailsSection";
import { OurPriceSection } from "@/components/booking/forms/OurPriceSection";
import { emptyPrice } from "@/components/booking/forms/priceMath";
import { VendorAllotmentSection } from "@/components/booking/forms/VendorAllotmentSection";
import { bookingService, buildBookingPayload, bookingToFormValues } from "@/services/bookingService";
import { useJobNumberReservation } from "@/hooks/useJobNumberReservation";
import { ACCOUNT_STATUSES } from "@/constants/bookingOptions";
import { ApiRequestError } from "@/services/api";
import { Stepper } from "@/components/driver/Stepper";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { StepProgress } from "@/hooks/useDriverProgress";

/**
 * Create / Edit Booking (Admin).
 *
 * Built to read exactly like the vendor onboarding wizard: the same canvas,
 * header, stepper and two-column layout with a sticky summary on the right.
 * The six sections mirror the booking lifecycle - what is being booked, the
 * vehicle, where it is picked up and delivered, what we charge, and which vendor
 * carries it for what price.
 *
 * The same page edits an existing booking: opened at /admin/bookings/:id/edit it
 * loads the booking, fills the form with it, and saves with a PUT instead of a
 * POST. Only Create reserves a job number - an edit keeps the one it has, since
 * that number is the booking's id.
 */

/** The value bag is intentionally loose while the fields are still being defined. */
type BookingFormValues = Record<string, unknown>;

const SECTIONS = [
  { id: "booking", label: "Booking Details", icon: ClipboardList },
  { id: "vehicle", label: "Vehicle Details", icon: Truck },
  { id: "pickup", label: "Pickup Details", icon: PackageCheck },
  { id: "delivery", label: "Delivery Details", icon: Truck },
  { id: "price", label: "Our Price", icon: Wallet },
  { id: "vendor", label: "Vendor Allotment & Price", icon: Handshake },
] as const;

/** A value counts as filled when it holds something other than blank space. */
function isFilled(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (value === null || value === undefined) return false;
  return String(value).trim() !== "";
}

/** [filled, total] across a list of values. */
function tally(values: unknown[]): [number, number] {
  return [values.filter(isFilled).length, values.length];
}

/** The fields that carry a pickup or delivery, flattened across every row. */
function stopValues(rows: unknown, kind: "pickup" | "delivery"): unknown[] {
  const list = Array.isArray(rows) ? (rows as Record<string, unknown>[]) : [];
  return list.flatMap((row) => [
    row[`${kind}Company`],
    row[`${kind}Time`],
    row.trailer,
    row.street1,
    row.suburb,
    row.state,
    row.postCode,
  ]);
}

/**
 * How far each section is filled in, and the booking's overall completion.
 *
 * A section's ratio is the share of its fields that carry something, and the
 * overall percent is the same share taken across every field at once, so a
 * saved booking opened for editing reads as the percentage it actually is
 * rather than a flat 0%. It updates live as the form is edited.
 */
function computeBookingProgress(values: Record<string, unknown>): {
  steps: StepProgress[];
  percent: number;
} {
  const vendor = (values.vendor ?? {}) as Record<string, unknown>;
  const vendorPrice = (values.vendorPrice ?? {}) as Record<string, unknown>;
  const prices = Array.isArray(values.prices)
    ? (values.prices as Record<string, unknown>[])
    : [];

  const perSection: Record<string, [number, number]> = {
    booking: tally([
      values.bookingReceivedDate,
      values.customer,
      values.accountStatus,
      values.agreementType,
      values.reference,
      values.invoiceTerm,
    ]),
    vehicle: tally([values.cargoType, values.vehicleType, values.trailerCategory]),
    pickup: tally(stopValues(values.pickups, "pickup")),
    delivery: tally(stopValues(values.deliveries, "delivery")),
    price: tally(prices.map((row) => row.grossAmount)),
    vendor: tally([vendor.vendorName, vendorPrice.grossAmount]),
  };

  const steps: StepProgress[] = SECTIONS.map((section) => {
    const [filled, total] = perSection[section.id] ?? [0, 0];
    const ratio = total === 0 ? 0 : filled / total;
    return { id: section.id, label: section.label, complete: ratio >= 1, ratio };
  });

  const [filledAll, totalAll] = Object.values(perSection).reduce<[number, number]>(
    (acc, [filled, total]) => [acc[0] + filled, acc[1] + total],
    [0, 0],
  );
  const percent = totalAll === 0 ? 0 : Math.round((filledAll / totalAll) * 100);

  return { steps, percent };
}

/**
 * Reserves a job number for a new booking and shows any error reserving it.
 *
 * Kept in its own component so the reservation only runs when it is mounted -
 * that is, on Create. An edit never renders this, so it never asks the server
 * for a number, and the booking keeps the one it already has.
 */
function JobNumberReservation({
  onReservation,
}: {
  onReservation: (forget: () => void) => void;
}) {
  const { error, forget } = useJobNumberReservation();

  useEffect(() => {
    onReservation(forget);
  }, [forget, onReservation]);

  if (!error) return null;
  return (
    <p className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      {error}
    </p>
  );
}

function AdminBookingFormBody({
  edit,
  submitting,
  onSaveDraft,
  savingDraft,
  onCancel,
  onReservation,
}: {
  edit: boolean;
  submitting: boolean;
  onSaveDraft: () => void;
  savingDraft: boolean;
  /** Leaves the booking untouched and goes back to Manage Bookings. */
  onCancel: () => void;
  /** Hands the page the reservation, so a successful save can stop holding it. */
  onReservation: (forget: () => void) => void;
}) {
  const busy = submitting || savingDraft;

  // Live completion, read straight off the form, so an edit opens on the
  // booking's real progress rather than a flat 0% and the bar moves as fields
  // are filled. `useWatch` with the shared control tracks every value.
  const { control } = useFormContext<BookingFormValues>();
  const values = useWatch({ control }) as Record<string, unknown>;
  const { steps, percent } = computeBookingProgress(values);
  const firstIncomplete = steps.findIndex((step) => !step.complete);
  const activeIndex = firstIncomplete === -1 ? steps.length - 1 : firstIncomplete;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex flex-wrap items-start justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {edit ? "Edit Booking" : "Create Booking"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {edit
              ? "Change any section and save - the booking keeps its job number."
              : "Fill each section to raise a new booking - what is moving, the vehicle it moves on, where it is picked up and delivered, our price, and the vendor carrying it."}
          </p>
        </div>

        {edit ? (
          // Leaves everything as it is and goes back to Manage Bookings, for when
          // the booking was opened only to be looked over, not changed.
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
            <ArrowLeft className="h-4 w-4" /> Leave as it is
          </Button>
        ) : (
          <Button type="button" variant="outline" onClick={onSaveDraft} disabled={busy}>
            {savingDraft ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> Save
              </>
            )}
          </Button>
        )}
      </motion.div>

      {/* Only Create reserves a job number; an edit keeps the one it has. */}
      {!edit && <JobNumberReservation onReservation={onReservation} />}

      <div className="mb-6">
        <Stepper steps={steps} activeIndex={activeIndex} percent={percent} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22.5rem]">
        <div className="space-y-6">
          <BookingDetailsSection />
          <VehicleDetailsSection />
          <PickupDetailsSection />
          <DeliveryDetailsSection />
          <OurPriceSection />
          <VendorAllotmentSection />
        </div>

        <BookingSummaryCard
          edit={edit}
          steps={steps}
          percent={percent}
          submitting={submitting}
          savingDraft={savingDraft}
          onSaveDraft={onSaveDraft}
          onCancel={onCancel}
        />
      </div>
    </>
  );
}

function BookingSummaryCard({
  edit,
  steps,
  percent,
  submitting,
  savingDraft,
  onSaveDraft,
  onCancel,
}: {
  edit: boolean;
  steps: StepProgress[];
  percent: number;
  submitting: boolean;
  savingDraft: boolean;
  onSaveDraft: () => void;
  onCancel: () => void;
}) {
  // The card follows the form: the chosen customer's name heads it. The job
  // number sits underneath and reads as not saved until it is, because the
  // server is what hands it out, on create.
  const customer = (useWatch({ name: "customer" }) as string | undefined)?.trim();
  const jobNumber = (useWatch({ name: "jobNumber" }) as string | undefined)?.trim();

  return (
    <aside className="lg:sticky lg:top-24">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-card"
      >
        <div className="bg-brand-navy p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/20">
              <CalendarCheck className="h-6 w-6 text-white/70" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold">{customer || "New Booking"}</p>
              <p className="truncate text-sm text-white/60">
                {jobNumber || (edit ? "" : "Not saved yet")}
              </p>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="text-white/70">Completion</span>
              <span className="font-semibold">{percent}%</span>
            </div>
            <Progress value={percent} className="h-1.5 bg-white/15 [&>div]:bg-white" />
          </div>
        </div>

        <div className="space-y-5 p-6">
          <div className="space-y-2.5">
            {steps.map((step) => {
              const stepPercent = Math.round(step.ratio * 100);
              return (
                <div key={step.id} className="flex items-center justify-between gap-2">
                  <span className="text-sm text-muted-foreground">{step.label}</span>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[0.7rem] font-medium",
                      step.complete
                        ? "bg-primary/10 text-primary"
                        : "bg-secondary text-muted-foreground",
                    )}
                  >
                    {step.complete ? "Done" : stepPercent > 0 ? `${stepPercent}%` : "Pending"}
                  </span>
                </div>
              );
            })}
          </div>

          <Separator />

          <div className="space-y-2.5">
            <Button type="submit" size="lg" className="w-full" disabled={submitting || savingDraft}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                </>
              ) : edit ? (
                <>
                  <Save className="h-4 w-4" /> Save changes
                </>
              ) : (
                <>
                  Create Booking <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>

            {edit ? (
              // Nothing is saved: the booking is left exactly as it was and the
              // page goes back to Manage Bookings.
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full"
                onClick={onCancel}
                disabled={submitting}
              >
                <ArrowLeft className="h-4 w-4" /> Leave as it is
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full"
                onClick={onSaveDraft}
                disabled={submitting || savingDraft}
              >
                {savingDraft ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" /> Save as draft
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </aside>
  );
}

export function AdminCreateBookingPage() {
  const navigate = useNavigate();
  const { bookingId } = useParams();
  const isEdit = Boolean(bookingId);

  const methods = useForm<BookingFormValues>({
    defaultValues: {
      // Nearly every booking is raised against a live account, so the status
      // opens on Active rather than empty. It stays a dropdown: an admin
      // raising one against a suspended or dormant account changes it here.
      accountStatus: ACCOUNT_STATUSES[0],

      // Open with a single pickup so the section has one row from the start.
      pickups: [
        {
          id: crypto.randomUUID(),
          clientJobNumber: "",
          trailer: "",
          pickupTime: "",
          pickupCompany: "",
          suite: "",
          street1: "",
          suburb: "",
          state: "",
          postCode: "",
          country: "Australia",
          instructions: "",
        },
      ],
      deliveries: [
        {
          id: crypto.randomUUID(),
          trailer: "",
          deliveryTime: "",
          deliveryCompany: "",
          suite: "",
          street1: "",
          suburb: "",
          state: "",
          postCode: "",
          country: "Australia",
          instructions: "",
        },
      ],

      // One price to begin with, matching the one pickup above. A second
      // pickup brings a second price with it; see OurPriceSection.
      prices: [emptyPrice()],
    },
    mode: "onTouched",
  });
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  // Edit mode loads the booking and fills the form with it before anything is shown.
  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadForEdit = useCallback(async () => {
    if (!bookingId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const booking = await bookingService.get(bookingId);
      methods.reset(bookingToFormValues(booking));
    } catch (caught) {
      setLoadError(
        caught instanceof ApiRequestError
          ? caught.message
          : "Could not load that booking. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [bookingId, methods]);

  useEffect(() => {
    if (isEdit) void loadForEdit();
  }, [isEdit, loadForEdit]);

  // Set by the body once its reservation is running. Calling it stops the page
  // holding the number, which is what a successful save wants: the server has
  // already consumed the reservation, so asking for it back on the way out
  // would be releasing a row that no longer exists. Only used on Create.
  const forgetJobNumber = useRef<() => void>(() => undefined);
  const onReservation = useCallback((forget: () => void) => {
    forgetJobNumber.current = forget;
  }, []);

  const onSubmit = async () => {
    setSubmitting(true);

    try {
      const payload = buildBookingPayload(methods.getValues());

      if (isEdit && bookingId) {
        const saved = await bookingService.update(bookingId, payload);
        toast.success("Booking updated", { description: saved.jobNumber });
        navigate(`/admin/bookings/${bookingId}`);
      } else {
        // The form sends the number it has been holding; the server checks it is
        // genuinely reserved for this admin and hands back the one it used, which
        // is a fresh one where the reservation had lapsed.
        const created = await bookingService.create(payload);
        forgetJobNumber.current();
        toast.success("Booking created", { description: created.jobNumber });
        // Land on Manage Bookings so the booking just raised is there to see. Only
        // this path (the Create Booking button) saves to the server; Save and Save
        // as draft do not, so neither sends anyone here.
        navigate("/admin/bookings");
      }
    } catch (error) {
      setSubmitting(false);
      toast.error(isEdit ? "Could not save the booking" : "Could not create the booking", {
        description:
          error instanceof ApiRequestError
            ? error.message
            : "Please check your connection and try again.",
      });
      return;
    }

    setSubmitting(false);
  };

  const saveDraft = () => {
    setSavingDraft(true);
    toast.success("Draft noted", {
      description: "Draft saving is wired up alongside the booking API.",
    });
    setSavingDraft(false);
  };

  const onError = () => {
    toast.error("Please fix the highlighted fields", {
      description: "Some required information is missing or invalid.",
    });
  };

  // Leaves the booking untouched and returns to Manage Bookings. Nothing is sent
  // to the server, so every field stays exactly as it was.
  const onCancel = () => navigate("/admin/bookings");

  return (
    <DashboardLayout>
      {loading ? (
        <PanelLoader label="Loading booking" />
      ) : loadError ? (
        <PanelError message={loadError} onRetry={() => void loadForEdit()} />
      ) : (
        <FormProvider {...methods}>
          {/* No OnboardingCanvas here, deliberately. That wrapper insets a form by
              a few percent either side, which suits the onboarding wizards; this
              page is worked through side by side with a customer on the phone and
              wants the screen it is given, so it sits straight on the layout's own
              padding and fills the width at every size. */}
          <form onSubmit={methods.handleSubmit(onSubmit, onError)} noValidate>
            <AdminBookingFormBody
              edit={isEdit}
              submitting={submitting}
              savingDraft={savingDraft}
              onSaveDraft={saveDraft}
              onCancel={onCancel}
              onReservation={onReservation}
            />
          </form>
        </FormProvider>
      )}
    </DashboardLayout>
  );
}
