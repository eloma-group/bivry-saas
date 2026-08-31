import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, FormProvider } from "react-hook-form";
import { motion } from "framer-motion";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Stepper } from "@/components/driver/Stepper";
import { CustomerSummaryCard } from "./summary/CustomerSummaryCard";
import { CustomerInfoSection } from "./forms/CustomerInfoSection";
import { AddressSection } from "./forms/AddressSection";
import { CommunicationSection } from "./forms/CommunicationSection";
import { DirectorsSection } from "./forms/DirectorsSection";
import { BillingSection } from "./forms/BillingSection";
import { DocumentsSection } from "./forms/DocumentsSection";
import { Button } from "@/components/ui/button";
import { OnboardingCanvas } from "@/components/form/OnboardingCanvas";
import { DocumentSourceProvider } from "@/context/DocumentSourceContext";
import { customerDocuments } from "@/services/customerDocuments";
import { useCustomerProgress } from "@/hooks/useCustomerProgress";
import { useAuth } from "@/context/AuthContext";
import { customerService, type CustomerOnboardingData } from "@/services/customerService";
import {
  emptyFormValues,
  needsSubmission,
  saveOnboarding,
  toFormValues,
} from "@/services/customerOnboarding";
import { ApiRequestError } from "@/services/api";
import type { AuthUser } from "@/types/auth";
import type { CustomerFormValues } from "@/types/customer";

/** Role extras on the session profile arrive untyped, so narrow them here. */
function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/**
 * The identity the customer already gave when the account was created. Nobody
 * should have to type their company and email a second time, so the form opens
 * with them filled in. The email rides along locked; the company is seeded and
 * stays editable.
 *
 * The account holder's name and phone are not here: the form no longer asks for
 * either. A customer is a business, and who we speak to is asked for once, per
 * department, in the Communication section.
 */
function accountIdentity(user: AuthUser | null) {
  return {
    companyName: text(user?.companyName),
    email: user?.email ?? "",
  };
}

/**
 * The parts of the identity the form seeds rather than mirrors, so a later
 * profile load cannot overwrite typing. They are filled only while still empty
 * and untouched. The email is not among them: it is always mirrored, because it
 * is the account and cannot be edited here.
 */
const SEEDED_IDENTITY = ["companyName"] as const;

/** Inner body - lives inside FormProvider so it can read live progress. */
function OnboardingBody({
  submitting,
  submitLabel,
  editing,
  savingDraft,
  onSaveDraft,
  firstSubmission,
}: {
  submitting: boolean;
  submitLabel: string;
  editing: boolean;
  savingDraft: boolean;
  onSaveDraft: () => void;
  firstSubmission: boolean;
}) {
  const { percent, steps, activeIndex } = useCustomerProgress();
  const busy = savingDraft || submitting;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex flex-wrap items-start justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {editing ? "Edit Your Profile" : "Customer Onboarding"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {editing
              ? "Update any detail below and save. Your email stays as it is - it identifies your account."
              : "Complete each section to reach 100%, then submit for review. You can save and come back at any time."}
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
        <Stepper steps={steps} activeIndex={activeIndex} percent={percent} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22.5rem]">
        <div className="space-y-6">
          <CustomerInfoSection />
          <AddressSection />
          <CommunicationSection />
          <DirectorsSection />
          <BillingSection />
          <DocumentsSection />
        </div>

        <CustomerSummaryCard
          percent={percent}
          submitting={submitting}
          submitLabel={submitLabel}
          savingDraft={savingDraft}
          onSaveDraft={onSaveDraft}
          firstSubmission={firstSubmission}
        />
      </div>
    </>
  );
}

interface CustomerOnboardingProps {
  /** Everything already saved for this customer, or null for a blank wizard. */
  initial: CustomerOnboardingData | null;
}

export function CustomerOnboarding({ initial }: CustomerOnboardingProps) {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const identity = useMemo(() => accountIdentity(user), [user]);

  // Saved details win: they are the same account, only more complete. The
  // identity below fills the gaps for a customer who has saved nothing yet.
  const methods = useForm<CustomerFormValues>({
    defaultValues: initial ? toFormValues(initial) : { ...emptyFormValues(), ...identity },
    mode: "onTouched",
  });
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  /**
   * What the server currently holds. A draft save moves this on, so the next
   * save knows which files are already stored and does not upload them twice.
   */
  const [saved, setSaved] = useState(initial);

  const firstSubmission = needsSubmission(saved);

  // The signed in account is loaded before this page renders, so the values
  // above are normally already correct. This keeps them correct in the other
  // cases too: the locked email always mirrors the account, and the seeded
  // fields are filled only while they are still empty and untouched.
  useEffect(() => {
    methods.setValue("email", identity.email);

    for (const field of SEEDED_IDENTITY) {
      const untouched =
        !methods.getFieldState(field).isDirty && methods.getValues(field) === "";
      if (untouched && identity[field]) methods.setValue(field, identity[field]);
    }
  }, [identity, methods]);

  /**
   * Writes everything typed so far without asking the form to be complete.
   *
   * The pack is long and the paperwork behind it is not always to hand, so a
   * customer has to be able to stop half way and pick it up later. This runs no
   * validation on purpose: a half filled section is exactly what a draft is.
   * Only the submit at the end insists on the whole thing.
   */
  async function saveDraft() {
    if (!user) {
      toast.success("Nothing to save", {
        description: "Sign in as a customer to save this to an account.",
      });
      return;
    }

    setSavingDraft(true);

    try {
      await saveOnboarding(methods.getValues(), saved);

      // Reading it back gives the freshly uploaded files their stored ids, so a
      // second save leaves them where they are instead of uploading again.
      const fresh = await customerService.getOnboarding();
      setSaved(fresh);
      methods.reset(toFormValues(fresh), { keepErrors: true, keepIsSubmitted: true });
      await refreshUser();

      toast.success("Progress saved", {
        description: "Come back whenever you are ready to finish the rest.",
      });
    } catch (error) {
      toast.error("Could not save your progress", {
        description:
          error instanceof ApiRequestError
            ? error.message
            : "Please check your connection and try again.",
      });
    } finally {
      setSavingDraft(false);
    }
  }

  const onSubmit = async (data: CustomerFormValues) => {
    // With no session (the development auth bypass) there is nothing to save
    // against, so the form only reports what it would have sent.
    if (!user) {
      toast.success("Form complete", {
        description: "Sign in as a customer to save this to an account.",
      });
      return;
    }

    setSubmitting(true);

    try {
      // The company is editable here, so this also updates the account it came
      // from. The email is never sent: it identifies the account and can only
      // change elsewhere.
      await saveOnboarding(data, saved);
      if (firstSubmission) await customerService.submit();
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

    // The profile is addressed by the customer's own id.
    const profilePath = `/customer/${user.id}`;

    if (firstSubmission) {
      // The customer is done with the form now, so they land on their profile
      // rather than sitting in the wizard they just completed.
      navigate(profilePath, { replace: true, state: { justSubmitted: true } });
    } else {
      toast.success("Profile updated", { description: "Your changes have been saved." });
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
      {/* Every upload box below may hold a file already stored. They read it
          back through the customer API; left to itself the shared upload
          component would fall back to the driver one. */}
      <DocumentSourceProvider source={customerDocuments}>
        <OnboardingCanvas>
          <form onSubmit={methods.handleSubmit(onSubmit, onError)} noValidate>
            <OnboardingBody
              submitting={submitting}
              submitLabel={firstSubmission ? "Submit Application" : "Save Changes"}
              editing={!firstSubmission}
              savingDraft={savingDraft}
              onSaveDraft={() => void saveDraft()}
              firstSubmission={firstSubmission}
            />
          </form>
        </OnboardingCanvas>
      </DocumentSourceProvider>
    </FormProvider>
  );
}
