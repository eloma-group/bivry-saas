import { useEffect, useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Route } from "lucide-react";
import { SectionCard } from "@/components/form/SectionCard";
import { TextField } from "@/components/form/Fields";

/** A pickup or delivery row, as far as a lane needs to read it. */
interface Stop {
  city?: string;
  trailer?: string;
}

/**
 * Section 4 - the lanes, worked out from the pickups and deliveries.
 *
 * Each pickup pairs with the delivery at the same position to make one lane:
 * its trailer, and a "Pick-Up City - Delivery City" line. Nothing here is typed -
 * add or remove a pickup or a delivery above and the lanes follow, one row per
 * pair. The derived rows are written into form state so a submit carries them.
 */
export function LaneSection() {
  const { control, setValue } = useFormContext();
  const pickups = useWatch({ control, name: "pickups" }) as Stop[] | undefined;
  const deliveries = useWatch({ control, name: "deliveries" }) as Stop[] | undefined;

  const lanes = useMemo(() => {
    const p = pickups ?? [];
    const d = deliveries ?? [];
    const count = Math.max(p.length, d.length);
    return Array.from({ length: count }, (_, i) => {
      const pickup = p[i];
      const delivery = d[i];
      const pickupCity = (pickup?.city ?? "").trim();
      const deliveryCity = (delivery?.city ?? "").trim();
      return {
        trailer: (pickup?.trailer || delivery?.trailer || "").trim(),
        lane: `${pickupCity} - ${deliveryCity}`,
      };
    });
  }, [pickups, deliveries]);

  // Keep the derived lanes in form state so a submit carries them. Keyed by the
  // content so this only writes when a city or trailer above actually changes.
  const signature = JSON.stringify(lanes);
  useEffect(() => {
    setValue("lanes", lanes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, setValue]);

  return (
    <SectionCard
      index={4}
      id="step-lane"
      icon={Route}
      title="Lane"
      description="Worked out from the pickups and deliveries above - one lane per pair."
    >
      {lanes.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-secondary/30 px-5 py-6 text-center text-sm text-muted-foreground">
          Lanes appear here once a pickup and a delivery are added above.
        </p>
      ) : (
        <div className="space-y-4">
          {lanes.map((_, index) => (
            <div
              key={index}
              className="rounded-2xl border border-border/60 bg-secondary/30 p-5"
            >
              <div className="mb-4 text-sm font-semibold text-foreground">Lane {index + 1}</div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <TextField
                  name={`lanes.${index}.trailer`}
                  label="Trailer"
                  readOnly
                  hint="From the pickup or delivery above."
                />
                <TextField
                  name={`lanes.${index}.lane`}
                  label="Pick-Up City - Delivery City"
                  readOnly
                  hint="Fills itself from the pickup and delivery cities."
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
