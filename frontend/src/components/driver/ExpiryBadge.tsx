import { CheckCircle2, AlertTriangle, XCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  daysBetween,
  daysUntil,
  expiryLevel,
  expiryLabel,
  validityLabel,
} from "@/utils/date";

interface ExpiryBadgeProps {
  expiry?: string | null;
  /**
   * The day the document was issued. Given one, the badge reports how long the
   * document is valid for counting from that day, instead of counting down from
   * today.
   */
  issue?: string | null;
  /** Show a static "Valid" state (e.g. drug test - no expiry). */
  staticValid?: boolean;
}

const MAP = {
  valid: { variant: "success" as const, Icon: CheckCircle2 },
  soon: { variant: "warning" as const, Icon: AlertTriangle },
  expired: { variant: "danger" as const, Icon: XCircle },
  none: { variant: "outline" as const, Icon: Clock },
};

/**
 * The 1970 epoch a blank date used to be stored as (a fixed save bug). A real
 * expiry or issue is never this day, so it is read as "not set" rather than
 * shown as a certificate that lapsed fifty years ago. The stored value is left
 * untouched; only how it reads here changes.
 */
const EPOCH_PLACEHOLDER = "1970-01-01";
function realDate(value?: string | null): string | null | undefined {
  return value && value.slice(0, 10) === EPOCH_PLACEHOLDER ? null : value;
}

/** Colour-coded expiry indicator: green / orange / red by days remaining. */
export function ExpiryBadge({ expiry, issue, staticValid }: ExpiryBadgeProps) {
  if (staticValid) {
    return (
      <Badge variant="success">
        <CheckCircle2 className="h-3.5 w-3.5" /> Valid
      </Badge>
    );
  }

  // A blank date stored as the 1970 epoch reads as "not set", not as expired.
  const expiryDate = realDate(expiry);
  const issueDate = realDate(issue);

  // The colour always comes from the real expiry against today: a document that
  // has lapsed has to look lapsed, whatever its issue date says.
  const days = daysUntil(expiryDate);
  const level = expiryLevel(days);
  const { variant, Icon } = MAP[level];

  const span = issueDate ? daysBetween(issueDate, expiryDate) : null;
  const label =
    level === "expired" || span === null ? expiryLabel(days) : validityLabel(span);

  return (
    <Badge variant={variant}>
      <Icon className="h-3.5 w-3.5" /> {label}
    </Badge>
  );
}
