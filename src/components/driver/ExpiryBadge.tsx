import { CheckCircle2, AlertTriangle, XCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { daysUntil, expiryLevel, expiryLabel } from "@/utils/date";

interface ExpiryBadgeProps {
  expiry?: string | null;
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
export function ExpiryBadge({ expiry, staticValid }: ExpiryBadgeProps) {
  if (staticValid) {
    return (
      <Badge variant="success">
        <CheckCircle2 className="h-3.5 w-3.5" /> Valid
      </Badge>
    );
  }
  const days = daysUntil(expiry);
  const level = expiryLevel(days);
  const { variant, Icon } = MAP[level];
  return (
    <Badge variant={variant}>
      <Icon className="h-3.5 w-3.5" /> {expiryLabel(days)}
    </Badge>
  );
}
