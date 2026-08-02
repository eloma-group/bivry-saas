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

/** Colour-coded expiry indicator: green / orange / red by days remaining. */
export function ExpiryBadge({ expiry, issue, staticValid }: ExpiryBadgeProps) {
  if (staticValid) {
    return (
      <Badge variant="success">
        <CheckCircle2 className="h-3.5 w-3.5" /> Valid
      </Badge>
    );
  }

  // The colour always comes from the real expiry against today: a document that
  // has lapsed has to look lapsed, whatever its issue date says.
  const days = daysUntil(expiry);
  const level = expiryLevel(days);
  const { variant, Icon } = MAP[level];

  const span = issue ? daysBetween(issue, expiry) : null;
  const label =
    level === "expired" || span === null ? expiryLabel(days) : validityLabel(span);

  return (
    <Badge variant={variant}>
      <Icon className="h-3.5 w-3.5" /> {label}
    </Badge>
  );
}
