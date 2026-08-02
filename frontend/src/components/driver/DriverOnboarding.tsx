import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, FormProvider } from "react-hook-form";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Stepper } from "./Stepper";
import { SummaryCard } from "./summary/SummaryCard";
import { PersonalInfoSection } from "./forms/PersonalInfoSection";
import { AddressSection } from "./forms/AddressSection";
import { LicenceSection } from "./forms/LicenceSection";
import { DrivingHistorySection } from "./forms/DrivingHistorySection";
import { PoliceVerificationSection } from "./forms/PoliceVerificationSection";
import { VisaSection } from "./forms/VisaSection";
import { MedicalSection } from "./forms/MedicalSection";
import { DrugTestSection } from "./forms/DrugTestSection";
import { AdditionalDocsSection } from "./forms/AdditionalDocsSection";
import { useDriverProgress } from "@/hooks/useDriverProgress";
import { useAuth } from "@/context/AuthContext";
import { driverService, type DriverOnboardingData } from "@/services/driverService";
import {
  emptyFormValues,
  needsSubmission,
  saveOnboarding,
  toFormValues,
} from "@/services/driverOnboarding";
import { ApiRequestError } from "@/services/api";
import type { AuthUser } from "@/types/auth";
import type { DriverFormValues } from "@/types/driver";

/** Role extras on the session profile arrive untyped, so narrow them here. */
function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/**
 * The identity the driver already gave when the account was created. Nobody
 * should have to type their name, email and phone a second time, so the form
 * opens with them filled in.
 */
function accountIdentity(user: AuthUser | null) {
  return {
    firstName: text(user?.firstName),
    middleName: text(user?.middleName),
    lastName: text(user?.lastName),
    email: user?.email ?? "",
    phone: user?.phone ?? "",
  };
}

/** The editable half of the identity, so a later profile load cannot overwrite typing. */
const EDITABLE_IDENTITY = ["firstName", "middleName", "lastName", "phone"] as const;

/** Inner body - lives inside FormProvider so it can read live progress. */
function OnboardingBody({
  submitting,
  submitLabel,
  editing,
}: {
  submitting: boolean;
  submitLabel: string;
  editing: boolean;
}) {
  const { percent, steps, activeIndex } = useDriverProgress();

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex items-start justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {editing ? "Edit Your Profile" : "Driver Onboarding"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {editing
              ? "Update any detail below and save. Your email stays as it is - it identifies your account."
              : "Complete each section to reach 100%, then submit for review."}
          </p>
        </div>
      </motion.div>

      <div className="mb-6">
        <Stepper steps={steps} activeIndex={activeIndex} percent={percent} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22.5rem]">
        <div className="space-y-6">
          <PersonalInfoSection />
          <AddressSection />
          <LicenceSection />
          <DrivingHistorySection />
          <PoliceVerificationSection />
          <VisaSection />
          <MedicalSection />
          <DrugTestSection />
          <AdditionalDocsSection />
        </div>

        <SummaryCard
          percent={percent}
          submitting={submitting}
          submitLabel={submitLabel}
        />
      </div>
    </>
  );
}

interface DriverOnboardingProps {
  /** Everything already saved for this driver, or null for a blank wizard. */
  initial: DriverOnboardingData | null;
}

export function DriverOnboarding({ initial }: DriverOnboardingProps) {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const identity = useMemo(() => accountIdentity(user), [user]);

  // Saved details win: they are the same account, only more complete. The
  // identity below fills the gaps for a driver who has not saved anything yet.
  const methods = useForm<DriverFormValues>({
    defaultValues: initial
      ? toFormValues(initial)
      : { ...emptyFormValues(), ...identity },
    mode: "onTouched",
  });
  const [submitting, setSubmitting] = useState(false);

  const firstSubmission = needsSubmission(initial);

  // The signed in account is loaded before this page renders, so the values
  // above are normally already correct. This keeps them correct in the other
  // cases too: the locked email always mirrors the account, and the editable
  // fields are seeded only while they are still empty and untouched.
  useEffect(() => {
    methods.setValue("email", identity.email);

    for (const field of EDITABLE_IDENTITY) {
      const untouched =
        !methods.getFieldState(field).isDirty && methods.getValues(field) === "";
      if (untouched && identity[field]) methods.setValue(field, identity[field]);
    }
  }, [identity, methods]);

  const onSubmit = async (data: DriverFormValues) => {
    // With no session (the development auth bypass) there is nothing to save
    // against, so the form only reports what it would have sent.
    if (!user) {
      toast.success("Form complete", {
        description: "Sign in as a driver to save this to an account.",
      });
      return;
    }

    setSubmitting(true);

    try {
      // Name and phone are editable here, so this also updates the account they
      // came from. The email is never sent: it identifies the account and can
      // only change elsewhere.
      await saveOnboarding(data, initial);
      if (firstSubmission) await driverService.submit();
      // So the header name and initials follow the edit straight away.
      await refreshUser();
    } catch (error) {
      setSubmitting(false);
      toast.error(
        firstSubmission ? "Could not submit your application" : "Could not save your changes",
        {
          description:
            error instanceof ApiRequestError
              ? error.message
              : "Please check your connection and try again.",
        },
      );
      return;
    }

    setSubmitting(false);

    // The profile is addressed by the driver's own id.
    const profilePath = `/driver/${user.id}`;

    if (firstSubmission) {
      // The driver is done with the form now, so they land on their profile
      // rather than sitting in the wizard they just completed.
      navigate(profilePath, { replace: true, state: { justSubmitted: true } });
    } else {
      toast.success("Profile updated", {
        description: "Your changes have been saved.",
      });
      navigate(profilePath, { replace: true });
    }
  };

  const onError = () => {
    toast.error("Please fix the highlighted fields", {
      description: "Some required information is missing or invalid.",
    });
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit, onError)} noValidate>
        <OnboardingBody
          submitting={submitting}
          submitLabel={firstSubmission ? "Submit Application" : "Save Changes"}
          editing={!firstSubmission}
        />
      </form>
    </FormProvider>
  );
}
