import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, FormProvider, useWatch } from "react-hook-form";
import { motion } from "framer-motion";
import {
  ClipboardList,
  PackageCheck,
  Truck,
  Route,
  Wallet,
  Handshake,
  Loader2,
  Save,
  ArrowRight,
  CalendarCheck,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { OnboardingCanvas } from "@/components/form/OnboardingCanvas";
import { BookingDetailsSection } from "@/components/booking/forms/BookingDetailsSection";
import { PickupDetailsSection } from "@/components/booking/forms/PickupDetailsSection";
import { DeliveryDetailsSection } from "@/components/booking/forms/DeliveryDetailsSection";
import { LaneSection } from "@/components/booking/forms/LaneSection";
import { OurPriceSection } from "@/components/booking/forms/OurPriceSection";
import { VendorAllotmentSection } from "@/components/booking/forms/VendorAllotmentSection";
import { bookingService, buildBookingPayload } from "@/services/bookingService";
import { ApiRequestError } from "@/services/api";
import { Stepper } from "@/components/driver/Stepper";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import type { StepProgress } from "@/hooks/useDriverProgress";

/**
 * Create Booking (Admin).
 *
 * Built to read exactly like the vendor onboarding wizard: the same canvas,
 * header, stepper and two-column layout with a sticky summary on the right.
 * The five sections mirror the booking lifecycle - what is being booked, where
 * it is picked up, where it goes, what we charge, and which vendor carries it
 * for what price.
 *
 * The fields inside each section are filled in as they are specified; the shell
 * and its design are settled here so every section drops straight into place.
 */

/** The value bag is intentionally loose while the fields are still being defined. */
type BookingFormValues = Record<string, unknown>;

const SECTIONS = [
  { id: "booking", label: "Booking Details", icon: ClipboardList },
  { id: "pickup", label: "Pickup Details", icon: PackageCheck },
  { id: "delivery", label: "Delivery Details", icon: Truck },
  { id: "lane", label: "Lane", icon: Route },
  { id: "price", label: "Our Price", icon: Wallet },
  { id: "vendor", label: "Vendor Allotment & Price", icon: Handshake },
] as const;

function AdminCreateBookingBody({
  submitting,
  onSaveDraft,
  savingDraft,
}: {
  submitting: boolean;
  onSaveDraft: () => void;
  savingDraft: boolean;
}) {
  const busy = submitting || savingDraft;

  // No completion logic yet - the stepper renders the five sections so the page
  // reads like the vendor wizard. Progress fills in once the fields land.
  const steps: StepProgress[] = SECTIONS.map((section) => ({
    id: section.id,
    label: section.label,
    complete: false,
    ratio: 0,
  }));

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex flex-wrap items-start justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Create Booking
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Fill each section to raise a new booking - what is moving, where it is
            picked up and delivered, our price, and the vendor carrying it.
          </p>
        </div>

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
      </motion.div>

      <div className="mb-6">
        <Stepper steps={steps} activeIndex={0} percent={0} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22.5rem]">
        <div className="space-y-6">
          <BookingDetailsSection />
          <PickupDetailsSection />
          <DeliveryDetailsSection />
          <LaneSection />
          <OurPriceSection />
          <VendorAllotmentSection />
        </div>

        <BookingSummaryCard submitting={submitting} savingDraft={savingDraft} onSaveDraft={onSaveDraft} />
      </div>
    </>
  );
}

function BookingSummaryCard({
  submitting,
  savingDraft,
  onSaveDraft,
}: {
  submitting: boolean;
  savingDraft: boolean;
  onSaveDraft: () => void;
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
              <p className="truncate text-sm text-white/60">{jobNumber || "Not saved yet"}</p>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="text-white/70">Completion</span>
              <span className="font-semibold">0%</span>
            </div>
            <Progress value={0} className="h-1.5 bg-white/15 [&>div]:bg-white" />
          </div>
        </div>

        <div className="space-y-5 p-6">
          <div className="space-y-2.5">
            {SECTIONS.map((section) => (
              <div key={section.id} className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground">{section.label}</span>
                <span className="rounded-full bg-secondary px-2.5 py-1 text-[0.7rem] font-medium text-muted-foreground">
                  Pending
                </span>
              </div>
            ))}
          </div>

          <Separator />

          <div className="space-y-2.5">
            <Button type="submit" size="lg" className="w-full" disabled={submitting || savingDraft}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                </>
              ) : (
                <>
                  Create Booking <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>

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
          </div>
        </div>
      </motion.div>
    </aside>
  );
}

export function AdminCreateBookingPage() {
  const navigate = useNavigate();
  const methods = useForm<BookingFormValues>({
    // Open with a single pickup so the section has one row from the start.
    defaultValues: {
      pickups: [
        {
          id: crypto.randomUUID(),
          clientJobNumber: "",
          trailer: "",
          pickupTime: "",
          pickupCompany: "",
          pickupAddress: "",
          city: "",
          suburb: "",
          state: "",
          country: "Australia",
          instructions: "",
        },
      ],
      deliveries: [
        {
          id: crypto.randomUUID(),
          clientJobNumber: "",
          trailer: "",
          deliveryTime: "",
          deliveryCompany: "",
          deliveryAddress: "",
          city: "",
          suburb: "",
          state: "",
          country: "Australia",
          instructions: "",
        },
      ],
    },
    mode: "onTouched",
  });
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  const onSubmit = async () => {
    setSubmitting(true);

    try {
      // The job number comes back with the booking: the server allocates it on
      // save, so it is only known once the create has succeeded.
      const created = await bookingService.create(buildBookingPayload(methods.getValues()));

      toast.success("Booking created", { description: created.jobNumber });
      navigate("/admin");
    } catch (error) {
      setSubmitting(false);
      toast.error("Could not create the booking", {
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

  return (
    <DashboardLayout>
      <FormProvider {...methods}>
        <OnboardingCanvas>
          <form onSubmit={methods.handleSubmit(onSubmit, onError)} noValidate>
            <AdminCreateBookingBody
              submitting={submitting}
              savingDraft={savingDraft}
              onSaveDraft={saveDraft}
            />
          </form>
        </OnboardingCanvas>
      </FormProvider>
    </DashboardLayout>
  );
}
