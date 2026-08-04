import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  CreditCard,
  ExternalLink,
  FileCheck2,
  Loader2,
  MapPin,
  Pencil,
  Plane,
  ShieldCheck,
  User,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ExpiryBadge } from "@/components/driver/ExpiryBadge";
import { SuccessDialog } from "@/components/driver/SuccessDialog";
import {
  openDocument,
  ownDocuments,
  useDocumentUrl,
  type DocumentSource,
} from "@/hooks/useDocumentUrl";
import { licenceTypeLabel } from "@/services/driverOnboarding";
import { prettyDate } from "@/utils/date";
import { initialsOf } from "@/utils/user";
import { formatBytes } from "@/utils/validation";
import { cn } from "@/lib/utils";
import type {
  DriverDocument,
  DriverDocumentType,
  DriverOnboardingData,
  OnboardingStatus,
  VerificationStatus,
} from "@/services/driverService";

/**
 * How each onboarding state reads to the driver. The colours are tuned for the
 * navy header the badge sits on, where the light card variants would disappear.
 */
const STATUS_LABEL: Record<OnboardingStatus, { label: string; className: string }> = {
  NOT_STARTED: { label: "Not started", className: "bg-white/15 text-white/90" },
  IN_PROGRESS: { label: "In progress", className: "bg-amber-400/20 text-amber-100" },
  SUBMITTED: {
    label: "Submitted for review",
    className: "bg-sky-400/20 text-sky-100",
  },
  UNDER_REVIEW: { label: "Under review", className: "bg-sky-400/20 text-sky-100" },
  APPROVED: { label: "Approved", className: "bg-emerald-400/20 text-emerald-100" },
  REJECTED: { label: "Changes requested", className: "bg-red-400/25 text-red-100" },
};

const VERIFICATION_LABEL: Record<
  VerificationStatus,
  { label: string; variant: "success" | "warning" | "danger" | "outline" }
> = {
  PENDING: { label: "Awaiting review", variant: "warning" },
  VERIFIED: { label: "Verified", variant: "success" },
  REJECTED: { label: "Rejected", variant: "danger" },
  EXPIRED: { label: "Expired", variant: "danger" },
};

const DOC_LABEL: Record<DriverDocumentType, string> = {
  PROFILE_PHOTO: "Profile photo",
  LICENCE_FRONT: "Licence - front",
  LICENCE_BACK: "Licence - back",
  DRIVING_HISTORY: "Driving history",
  POLICE_VERIFICATION: "Police verification",
  VISA: "Visa document",
  MEDICAL: "Medical certificate",
  DRUG_TEST: "Drug test",
  PASSPORT_FRONT: "Passport - front",
  PASSPORT_BACK: "Passport - back",
  MEDICARE: "Medicare card",
  ADDITIONAL: "Additional document",
};

const EMPTY = "-";

function value(text: string | null | undefined): string {
  return text && text.trim() !== "" ? text : EMPTY;
}

/** One labelled fact. Label and value sit on one line and wrap independently. */
function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right text-sm font-medium text-foreground">
        {children}
      </span>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  title,
  action,
  className,
  children,
}: {
  icon: LucideIcon;
  title: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "rounded-3xl border border-border/70 bg-card p-6 shadow-card",
        className,
      )}
    >
      <header className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Icon className="h-[1.125rem] w-[1.125rem]" />
          </span>
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            {title}
          </h2>
        </div>
        {action}
      </header>
      <Separator />
      <div className="mt-2 divide-y divide-border/60">{children}</div>
    </motion.section>
  );
}

function addressLines(
  address: DriverOnboardingData["addresses"][number] | undefined,
): string[] {
  if (!address) return [];
  const street = [address.houseNumber, address.street].filter(Boolean).join(" ");
  const region = [address.suburb, address.state, address.postCode]
    .filter(Boolean)
    .join(", ");
  return [street, region, address.country ?? ""].filter((line) => line.trim() !== "");
}

function DocumentRow({ doc, source }: { doc: DriverDocument; source: DocumentSource }) {
  const [opening, setOpening] = useState(false);

  async function handleOpen() {
    setOpening(true);
    try {
      await openDocument(doc.id, source);
    } catch {
      toast.error("Could not open that document", {
        description: "Please try again in a moment.",
      });
    } finally {
      setOpening(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">
          {doc.category ?? DOC_LABEL[doc.docType]}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {doc.fileName} - {formatBytes(doc.sizeInBytes)} - uploaded{" "}
          {prettyDate(doc.createdAt)}
          {/* Only additional documents carry their own expiry date. */}
          {doc.expiryDate ? ` - expires ${prettyDate(doc.expiryDate)}` : ""}
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleOpen}
        disabled={opening}
      >
        {opening ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ExternalLink className="h-4 w-4" />
        )}
        Open
      </Button>
    </div>
  );
}

interface DriverProfileProps {
  data: DriverOnboardingData;
  /**
   * Someone other than the driver is looking (an admin reviewing the record), so
   * the self-service controls and the submission confirmation are left off.
   */
  readOnly?: boolean;
  /** Signed blob storage link for one of this driver's documents. */
  documentUrl?: (documentId: string) => Promise<{ url: string }>;
  /** Authenticated fallback used when links cannot be signed (local dev). */
  documentBlobUrl?: (documentId: string) => Promise<string>;
}

export function DriverProfile({
  data,
  readOnly = false,
  documentUrl,
  documentBlobUrl,
}: DriverProfileProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const justSubmitted =
    !readOnly &&
    Boolean((location.state as { justSubmitted?: boolean } | null)?.justSubmitted);
  const [celebrating, setCelebrating] = useState(justSubmitted);

  // Whoever is reading, the documents come from the API that will actually let
  // them: a driver reads their own, an admin reads them through the admin API.
  const [source] = useState<DocumentSource>(() =>
    documentUrl && documentBlobUrl
      ? { link: documentUrl, blob: documentBlobUrl }
      : ownDocuments,
  );

  // The confirmation belongs to the submission, not to the page: drop it from
  // history so a refresh does not celebrate all over again.
  useEffect(() => {
    if (justSubmitted) navigate(location.pathname, { replace: true, state: null });
  }, [justSubmitted, location.pathname, navigate]);

  const photo = data.documents.find((row) => row.docType === "PROFILE_PHOTO");
  const photoUrl = useDocumentUrl(photo?.id, source);

  const fullName =
    [data.firstName, data.middleName, data.lastName].filter(Boolean).join(" ") ||
    data.email;
  const status = STATUS_LABEL[data.onboardingStatus];
  const isAustralian = data.nationality === "Australia";

  const current = data.addresses.find((row) => row.type === "CURRENT");
  const permanent = data.addresses.find((row) => row.type === "PERMANENT");
  const currentLines = addressLines(current);
  const permanentLines = addressLines(permanent);
  const samePermanent =
    permanentLines.length > 0 &&
    permanentLines.join("|") === currentLines.join("|");

  const documents = data.documents.filter((row) => row.docType !== "PROFILE_PHOTO");

  return (
    <>
      {/* Header */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-6 overflow-hidden rounded-3xl bg-brand-navy text-white shadow-card"
      >
        <div className="flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-5">
            <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-3xl bg-white/10 text-xl font-semibold ring-1 ring-white/20 sm:h-24 sm:w-24">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={fullName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span aria-hidden>
                  {initialsOf({ displayName: fullName, email: data.email })}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">
                {fullName}
              </h1>
              <p className="mt-1 truncate text-sm text-white/70">{data.email}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                    status.className,
                  )}
                >
                  {status.label}
                </span>
                {data.submittedAt && (
                  <span className="text-xs text-white/60">
                    Submitted {prettyDate(data.submittedAt)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {!readOnly && (
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:items-center">
              <Button asChild size="lg" variant="secondary">
                <Link to="/driver/onboarding">
                  <Pencil className="h-4 w-4" /> Edit Profile
                </Link>
              </Button>
            </div>
          )}
        </div>

        {data.onboardingStatus === "REJECTED" && data.rejectionReason && (
          <div className="border-t border-white/10 bg-red-500/10 px-6 py-4 text-sm text-white/90 sm:px-8">
            <span className="font-semibold">Changes requested: </span>
            {data.rejectionReason}
          </div>
        )}
      </motion.section>

      {/* Details. Fills the width on large monitors instead of leaving gutters. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 2xl:grid-cols-3">
        <InfoCard icon={User} title="Personal Information">
          <Row label="Full name">{value(fullName)}</Row>
          <Row label="Date of birth">{prettyDate(data.dateOfBirth)}</Row>
          <Row label="Nationality">{value(data.nationality)}</Row>
          <Row label="Phone">{value(data.phone)}</Row>
          <Row label="Email">
            <span className="inline-flex flex-wrap items-center justify-end gap-2">
              {data.email}
              <Badge variant="outline">Account ID</Badge>
            </span>
          </Row>
        </InfoCard>

        <InfoCard icon={MapPin} title="Address">
          {currentLines.length > 0 ? (
            <Row label="Current">
              <span className="block whitespace-pre-line">
                {currentLines.join("\n")}
              </span>
            </Row>
          ) : (
            <Row label="Current">{EMPTY}</Row>
          )}
          <Row label="Permanent">
            {samePermanent ? (
              "Same as current"
            ) : permanentLines.length > 0 ? (
              <span className="block whitespace-pre-line">
                {permanentLines.join("\n")}
              </span>
            ) : (
              EMPTY
            )}
          </Row>
        </InfoCard>

        <InfoCard
          icon={CreditCard}
          title="Driving Licence"
          action={
            data.licence && (
              <Badge variant={VERIFICATION_LABEL[data.licence.verificationStatus].variant}>
                {VERIFICATION_LABEL[data.licence.verificationStatus].label}
              </Badge>
            )
          }
        >
          <Row label="Licence number">{value(data.licence?.licenceNumber)}</Row>
          <Row label="Card number">{value(data.licence?.licenceCardNumber)}</Row>
          <Row label="Class">{value(licenceTypeLabel(data.licence?.licenceType))}</Row>
          <Row label="Issuing state">{value(data.licence?.issuingState)}</Row>
          <Row label="Expiry">
            <span className="inline-flex flex-wrap items-center justify-end gap-2">
              {prettyDate(data.licence?.expiryDate)}
              <ExpiryBadge expiry={data.licence?.expiryDate} />
            </span>
          </Row>
        </InfoCard>

        <InfoCard icon={ShieldCheck} title="Compliance">
          <Row label="Driving history">
            <ExpiryBadge
              issue={data.drivingHistory?.issueDate}
              expiry={data.drivingHistory?.expiryDate}
            />
          </Row>
          <Row label="Police verification">
            <ExpiryBadge
              issue={data.policeVerification?.issueDate}
              expiry={data.policeVerification?.expiryDate}
            />
          </Row>
          <Row label="Medical">
            <ExpiryBadge
              issue={data.medical?.issueDate}
              expiry={data.medical?.expiryDate}
            />
          </Row>
          <Row label="Drug test">
            <ExpiryBadge
              issue={data.drugTest?.issueDate}
              expiry={data.drugTest?.expiryDate}
            />
          </Row>
        </InfoCard>

        <InfoCard icon={Plane} title={isAustralian ? "Passport & Medicare" : "Visa"}>
          {isAustralian ? (
            <>
              {/* An Australian national holds no visa, so these stand in for it. */}
              <Row label="Passport number">{value(data.passport?.passportNumber)}</Row>
              <Row label="Passport expiry">
                <span className="inline-flex flex-wrap items-center justify-end gap-2">
                  {prettyDate(data.passport?.expiryDate)}
                  <ExpiryBadge expiry={data.passport?.expiryDate} />
                </span>
              </Row>
              <Row label="Medicare card">{value(data.medicare?.cardNumber)}</Row>
              <Row label="Medicare expiry">
                <span className="inline-flex flex-wrap items-center justify-end gap-2">
                  {prettyDate(data.medicare?.expiryDate)}
                  <ExpiryBadge expiry={data.medicare?.expiryDate} />
                </span>
              </Row>
            </>
          ) : (
            <>
              <Row label="Status">{value(data.visa?.visaStatus)}</Row>
              <Row label="Type">{value(data.visa?.visaType)}</Row>
              <Row label="Expiry">
                <span className="inline-flex flex-wrap items-center justify-end gap-2">
                  {prettyDate(data.visa?.expiryDate)}
                  <ExpiryBadge expiry={data.visa?.expiryDate} />
                </span>
              </Row>
            </>
          )}
        </InfoCard>

        <InfoCard
          icon={FileCheck2}
          title="Documents"
          className="lg:col-span-2 2xl:col-span-1"
          action={
            <span className="text-sm font-medium text-muted-foreground">
              {documents.length}
            </span>
          }
        >
          {documents.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No documents uploaded yet.
            </p>
          ) : (
            documents.map((doc) => (
              <DocumentRow key={doc.id} doc={doc} source={source} />
            ))
          )}
        </InfoCard>
      </div>

      <SuccessDialog
        open={celebrating}
        onOpenChange={setCelebrating}
        name={fullName}
      />
    </>
  );
}
