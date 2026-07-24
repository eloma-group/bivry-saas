import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
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
import { SuccessDialog } from "./SuccessDialog";
import { useDriverProgress } from "@/hooks/useDriverProgress";
import { Button } from "@/components/ui/button";
import type { DriverFormValues } from "@/types/driver";

const emptyAddress = {
  houseNumber: "",
  street: "",
  suburb: "",
  state: "",
  country: "",
  postCode: "",
};

const defaultValues: DriverFormValues = {
  firstName: "",
  middleName: "",
  lastName: "",
  dob: "",
  nationality: "",
  phone: "",
  email: "",
  profilePhoto: null,
  currentAddress: { ...emptyAddress },
  sameAsCurrent: true,
  permanentAddress: { ...emptyAddress },
  licenceNumber: "",
  licenceCardNumber: "",
  licenceType: "",
  licenceState: "",
  licenceExpiry: "",
  licenceFront: null,
  licenceBack: null,
  drivingHistoryFile: null,
  drivingHistoryIssue: "",
  drivingHistoryExpiry: "",
  policeFile: null,
  policeIssue: "",
  policeExpiry: "",
  visaStatus: "",
  visaType: "",
  visaFile: null,
  visaExpiry: "",
  medicalFile: null,
  medicalIssue: "",
  medicalExpiry: "",
  drugTestFile: null,
  drugTestIssue: "",
  additionalDocs: [],
};

/** Inner body - lives inside FormProvider so it can read live progress. */
function OnboardingBody({ submitting }: { submitting: boolean }) {
  const { percent, steps, activeIndex } = useDriverProgress();

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Driver Onboarding
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Add a new driver to your fleet. Complete each section to reach 100%.
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          type="button"
          className="hidden shrink-0 rounded-full sm:flex"
          aria-label="Edit"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </motion.div>

      <div className="mb-6">
        <Stepper steps={steps} activeIndex={activeIndex} percent={percent} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
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

        <SummaryCard percent={percent} submitting={submitting} />
      </div>
    </>
  );
}

export function DriverOnboarding() {
  const methods = useForm<DriverFormValues>({
    defaultValues,
    mode: "onTouched",
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submittedName, setSubmittedName] = useState("");

  const onSubmit = async (data: DriverFormValues) => {
    setSubmitting(true);
    // Simulate an API round-trip.
    await new Promise((r) => setTimeout(r, 1400));
    setSubmitting(false);
    setSubmittedName(`${data.firstName} ${data.lastName}`.trim() || "Driver");
    setSuccess(true);
    toast.success("Driver submitted", {
      description: `${data.firstName || "Driver"} ${data.lastName || ""} has been added to onboarding.`,
    });
  };

  const onError = () => {
    toast.error("Please fix the highlighted fields", {
      description: "Some required information is missing or invalid.",
    });
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit, onError)} noValidate>
        <OnboardingBody submitting={submitting} />
      </form>
      <SuccessDialog
        open={success}
        onOpenChange={setSuccess}
        name={submittedName}
      />
    </FormProvider>
  );
}
