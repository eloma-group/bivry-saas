import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  BadgeCheck,
  Building2,
  Contact,
  ExternalLink,
  FileCheck2,
  Globe2,
  Landmark,
  Loader2,
  MapPin,
  Pencil,
  ShieldCheck,
  Tractor,
  Users2,
  Warehouse,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ExpiryBadge } from "@/components/driver/ExpiryBadge";
import { SuccessDialog } from "@/components/driver/SuccessDialog";
import {
  openDocument,
  useDocumentUrl,
  type DocumentSource,
} from "@/hooks/useDocumentUrl";
import { vendorDocuments } from "@/services/vendorDocuments";
import { CONTACT_BLOCKS, INSURANCE_POLICIES } from "@/constants/vendorOptions";
import { prettyDate } from "@/utils/date";
import { initialsOf } from "@/utils/user";
import { formatBytes } from "@/utils/validation";
import { cn } from "@/lib/utils";
import type { OnboardingStatus, VerificationStatus } from "@/services/driverService";
import type {
  VendorDocument,
  VendorDocumentType,
  VendorOnboardingData,
} from "@/services/vendorService";

/**
 * How each onboarding state reads to the vendor. The colours are tuned for the
 * navy header the badge sits on, where the light card variants would disappear.
 */
const STATUS_LABEL: Record<OnboardingStatus, { label: string; className: string }> = {
  NOT_STARTED: { label: "Not started", className: "bg-white/15 text-white/90" },
  IN_PROGRESS: { label: "In progress", className: "bg-amber-400/20 text-amber-100" },
  SUBMITTED: { label: "Submitted for review", className: "bg-sky-400/20 text-sky-100" },
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

const DOC_LABEL: Record<VendorDocumentType, string> = {
  COMPANY_LOGO: "Company logo",
  ACCREDITATION: "Certificate of accreditation",
  INSURANCE_PRODUCT_LIABILITY: "Product liability policy",
  INSURANCE_PUBLIC_LIABILITY: "Public liability policy",
  INSURANCE_WORK_COVER: "Work cover policy",
  INSURANCE_MARINE_GENERAL: "Marine (general & refrigerated) policy",
  INSURANCE_MARINE_ALCOHOL: "Marine (alcohol) policy",
  INSURANCE_COC: "COC policy",
  COMPLIANCE_DRUG: "Drug",
  COMPLIANCE_ALCOHOL_POLICY: "Alcohol policy",
  COMPLIANCE_PROCEDURE: "Procedure",
  COMPLIANCE_RISK_MANAGEMENT: "Risk management policy",
  COMPLIANCE_SPEED_POLICY: "Speed policy",
  COMPLIANCE_FATIGUE_POLICY: "Fatigue policy & presentation system",
  COMPLIANCE_GPS_SNAPSHOT: "GPS snapshot",
  COMPLIANCE_WHS_POLICY: "Work health & safety policy",
  COMPLIANCE_ADDITIONAL: "Additional document",
};

const EMPTY = "-";

function value(text: string | null | undefined): string {
  return text && text.trim() !== "" ? text : EMPTY;
}

function list(values: string[] | undefined): string {
  return values && values.length > 0 ? values.join(", ") : EMPTY;
}

/** One labelled fact. Label and value sit on one line and wrap independently. */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
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
      className={cn("rounded-3xl border border-border/70 bg-card p-6 shadow-card", className)}
    >
      <header className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Icon className="h-[1.125rem] w-[1.125rem]" />
          </span>
          <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
        </div>
        {action}
      </header>
      <Separator />
      <div className="mt-2 divide-y divide-border/60">{children}</div>
    </motion.section>
  );
}

/** A list of sites, warehouses or yards, counted in the header. */
function SiteCard({
  icon,
  title,
  empty,
  sites,
}: {
  icon: LucideIcon;
  title: string;
  empty: string;
  sites: VendorOnboardingData["warehouses"];
}) {
  return (
    <InfoCard
      icon={icon}
      title={title}
      action={<span className="text-sm font-medium text-muted-foreground">{sites.length}</span>}
    >
      {sites.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>
      ) : (
        sites.map((site, index) => (
          <Row key={site.id} label={`Address ${index + 1}`}>
            <span className="block whitespace-pre-line">
              {addressLines(site).join("\n") || EMPTY}
            </span>
          </Row>
        ))
      )}
    </InfoCard>
  );
}

/** One address over three lines: the street, the area, then the country. */
function addressLines(address: {
  street1: string | null;
  street2: string | null;
  suburb: string | null;
  state: string | null;
  postCode: string | null;
  country: string | null;
}): string[] {
  const street = [address.street1, address.street2].filter(Boolean).join(", ");
  const region = [address.suburb, address.state, address.postCode].filter(Boolean).join(", ");
  return [street, region, address.country ?? ""].filter((line) => line.trim() !== "");
}

function DocumentRow({ doc, source }: { doc: VendorDocument; source: DocumentSource }) {
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
          {doc.expiryDate ? ` - expires ${prettyDate(doc.expiryDate)}` : ""}
        </p>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={handleOpen} disabled={opening}>
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

interface VendorProfileProps {
  data: VendorOnboardingData;
  /**
   * Someone other than the vendor is looking (an admin reviewing the record),
   * so the self-service controls and the submission confirmation are left off.
   */
  readOnly?: boolean;
  /** Signed blob storage link for one of this vendor's documents. */
  documentUrl?: (documentId: string) => Promise<{ url: string }>;
  /** Authenticated fallback used when links cannot be signed (local dev). */
  documentBlobUrl?: (documentId: string) => Promise<string>;
}

export function VendorProfile({
  data,
  readOnly = false,
  documentUrl,
  documentBlobUrl,
}: VendorProfileProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const justSubmitted =
    !readOnly &&
    Boolean((location.state as { justSubmitted?: boolean } | null)?.justSubmitted);
  const [celebrating, setCelebrating] = useState(justSubmitted);

  // Whoever is reading, the documents come from the API that will actually let
  // them: a vendor reads their own, an admin reads them through the admin API.
  const [source] = useState<DocumentSource>(() =>
    documentUrl && documentBlobUrl
      ? { link: documentUrl, blob: documentBlobUrl }
      : vendorDocuments,
  );

  // The confirmation belongs to the submission, not to the page: drop it from
  // history so a refresh does not celebrate all over again.
  useEffect(() => {
    if (justSubmitted) navigate(location.pathname, { replace: true, state: null });
  }, [justSubmitted, location.pathname, navigate]);

  const logo = data.documents.find((row) => row.docType === "COMPANY_LOGO");
  const logoUrl = useDocumentUrl(logo?.id, source);

  const name = data.companyName || data.email;
  const status = STATUS_LABEL[data.onboardingStatus];
  const documents = data.documents.filter((row) => row.docType !== "COMPANY_LOGO");

  const contact = (apiType: string) => data.contacts.find((row) => row.type === apiType);
  const insurance = (apiType: string) =>
    data.insurances.find((row) => row.type === apiType);

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
              {logoUrl ? (
                <img src={logoUrl} alt={name} className="h-full w-full object-cover" />
              ) : (
                <span aria-hidden>
                  {initialsOf({ displayName: name, email: data.email })}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">
                {name}
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
                {data.vendorCode && (
                  <span className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-white/90">
                    {data.vendorCode}
                  </span>
                )}
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
                <Link to="/vendor/onboarding">
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
        <InfoCard icon={Building2} title="Vendor Information">
          <Row label="Company name">{value(data.companyName)}</Row>
          <Row label="Trading names">{list(data.tradingNames)}</Row>
          <Row label="Legal name">{value(data.legalName)}</Row>
          <Row label="ABN">{value(data.abn)}</Row>
          <Row label="ACN">{value(data.acn)}</Row>
          <Row label="ABN status">{value(data.abnStatus)}</Row>
          <Row label="Entity type">{value(data.entityType)}</Row>
          <Row label="GST">{value(data.gst)}</Row>
          <Row label="Website">{value(data.websiteAddress)}</Row>
          <Row label="Phone">{value(data.phone)}</Row>
          <Row label="Email">
            <span className="inline-flex flex-wrap items-center justify-end gap-2">
              {data.email}
              <Badge variant="outline">Account ID</Badge>
            </span>
          </Row>
          <Row label="Vendor ID">{value(data.vendorCode)}</Row>
        </InfoCard>

        <InfoCard icon={Contact} title="Contact Information">
          {CONTACT_BLOCKS.map((block) => {
            const row = contact(block.apiType);
            return (
              <Row key={block.key} label={block.label}>
                {row?.contactPerson ? (
                  <span className="block whitespace-pre-line">
                    {[
                      [row.contactPerson, row.designation].filter(Boolean).join(" - "),
                      row.email ?? "",
                      row.contactNumber ?? "",
                    ]
                      .filter((line) => line.trim() !== "")
                      .join("\n")}
                  </span>
                ) : (
                  EMPTY
                )}
              </Row>
            );
          })}
        </InfoCard>

        <InfoCard
          icon={Users2}
          title="Company C-Suite"
          action={
            <span className="text-sm font-medium text-muted-foreground">
              {data.directors.length}
            </span>
          }
        >
          {data.directors.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No directors added yet.
            </p>
          ) : (
            data.directors.map((director, index) => (
              <Row key={director.id} label={director.name || `Director ${index + 1}`}>
                <span className="block whitespace-pre-line">
                  {[director.email ?? "", director.contactNumber ?? ""]
                    .filter((line) => line.trim() !== "")
                    .join("\n") || EMPTY}
                </span>
              </Row>
            ))
          )}
        </InfoCard>

        <InfoCard icon={Landmark} title="Bank Details">
          <Row label="Bank">{value(data.bankDetail?.bankName)}</Row>
          <Row label="Account name">{value(data.bankDetail?.accountName)}</Row>
          <Row label="BSB">{value(data.bankDetail?.bsb)}</Row>
          <Row label="Account number">{value(data.bankDetail?.accountNumber)}</Row>
        </InfoCard>

        <InfoCard icon={Globe2} title="Business Coverage">
          <Row label="Areas covered">{list(data.coverage?.areasCovered)}</Row>
          <Row label="Operations">{list(data.coverage?.businessOperations)}</Row>
        </InfoCard>

        <InfoCard icon={MapPin} title="Registered Addresses">
          {(["PRINCIPAL", "BILLING"] as const).map((type) => {
            const stored = data.addresses.find((row) => row.type === type);
            const label = type === "PRINCIPAL" ? "Principal address" : "Billing address";
            return (
              <Row key={type} label={label}>
                <span className="block whitespace-pre-line">
                  {stored ? addressLines(stored).join("\n") || EMPTY : EMPTY}
                </span>
              </Row>
            );
          })}
          <Row label="Billing matches principal">
            {data.billingSameAsPrincipal ? "Yes" : "No"}
          </Row>
        </InfoCard>

        <SiteCard
          icon={Tractor}
          title="Yard Locations"
          empty="No yard addresses added."
          sites={data.yards}
        />

        <SiteCard
          icon={Warehouse}
          title="Warehouse Locations"
          empty="No warehouse addresses added yet."
          sites={data.warehouses}
        />

        <InfoCard
          icon={BadgeCheck}
          title="Certificate Of Accreditation"
          action={
            data.accreditation && (
              <Badge
                variant={VERIFICATION_LABEL[data.accreditation.verificationStatus].variant}
              >
                {VERIFICATION_LABEL[data.accreditation.verificationStatus].label}
              </Badge>
            )
          }
        >
          <Row label="Accreditation number">
            {value(data.accreditation?.accreditationNumber)}
          </Row>
          <Row label="Date of expiry">
            <ExpiryBadge expiry={data.accreditation?.expiryDate} />
          </Row>
          <Row label="Mass management">
            <ExpiryBadge expiry={data.accreditation?.massManagementExpiry} />
          </Row>
          <Row label="Dangerous goods">
            <ExpiryBadge expiry={data.accreditation?.dangerousGoodsExpiry} />
          </Row>
          <Row label="NHVAS">
            <ExpiryBadge expiry={data.accreditation?.nhvasExpiry} />
          </Row>
          <Row label="HACCP">
            <ExpiryBadge expiry={data.accreditation?.haccpExpiry} />
          </Row>
        </InfoCard>

        <InfoCard icon={ShieldCheck} title="Insurance Details">
          {INSURANCE_POLICIES.map((policy) => {
            const row = insurance(policy.apiType);
            return (
              <Row key={policy.key} label={policy.label}>
                <span className="inline-flex flex-wrap items-center justify-end gap-2">
                  {value(policy.workCover ? row?.employerNumber : row?.policyNumber)}
                  <ExpiryBadge
                    expiry={policy.workCover ? row?.validTill : row?.expiryDate}
                  />
                </span>
              </Row>
            );
          })}
        </InfoCard>

        <InfoCard
          icon={FileCheck2}
          title="Documents"
          className="lg:col-span-2 2xl:col-span-3"
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
            documents.map((doc) => <DocumentRow key={doc.id} doc={doc} source={source} />)
          )}
        </InfoCard>
      </div>

      <SuccessDialog open={celebrating} onOpenChange={setCelebrating} name={name} />
    </>
  );
}
