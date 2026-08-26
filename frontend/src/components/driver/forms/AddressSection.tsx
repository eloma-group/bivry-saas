import { useEffect, useRef, useState } from "react";
import { Loader2, LocateFixed, MapPin } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { SectionCard } from "@/components/form/SectionCard";
import { TextField, SelectField } from "@/components/form/Fields";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { COUNTRIES } from "@/constants/options";
import { isStateOfCountry, statesFor } from "@/constants/regions";
import { locateCurrentAddress } from "@/services/geocode";
import { rules } from "@/utils/validation";
import type { FieldRules } from "@/components/form/Fields";
import type { AddressBlock as AddressBlockValues, DriverFormValues } from "@/types/driver";

const GRID = "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3";

type AddressPrefix = "currentAddress" | "permanentAddress";

/**
 * The State field, offering whichever divisions the chosen country actually has.
 *
 * A country we hold no list for - a city state, or one we would rather not
 * guess at - gets a free text box instead, so an address abroad is never
 * impossible to enter. Changing the country clears a state that belonged to the
 * old one, rather than leaving Victoria sitting under Canada.
 */
function StateField({
  prefix,
  rules: fieldRules,
}: {
  prefix: AddressPrefix;
  rules: FieldRules;
}) {
  const { control, setValue, getValues } = useFormContext<DriverFormValues>();
  const country = useWatch({ control, name: `${prefix}.country` });
  const options = statesFor(country);

  // Only a change of country clears the state. On the first render the stored
  // address is still loading in, and wiping it there would lose saved data.
  const previousCountry = useRef<string | null>(null);
  useEffect(() => {
    const previous = previousCountry.current;
    previousCountry.current = country ?? "";
    if (previous === null || previous === country) return;

    const state = getValues(`${prefix}.state`);
    if (state && !isStateOfCountry(country ?? "", state)) {
      setValue(`${prefix}.state`, "", { shouldDirty: true });
    }
  }, [country, getValues, prefix, setValue]);

  if (!options) {
    return (
      <TextField
        name={`${prefix}.state`}
        label="State / Province"
        placeholder={country ? "Region or province" : "Choose a country first"}
        required
        rules={fieldRules}
      />
    );
  }

  return (
    <SelectField
      name={`${prefix}.state`}
      label="State / Province"
      options={options}
      required
      rules={fieldRules}
    />
  );
}

function AddressBlock({ prefix }: { prefix: AddressPrefix }) {
  const { getValues } = useFormContext<DriverFormValues>();

  // The permanent block leaves the screen when it matches the current one, but
  // its fields stay registered, so the rule has to ask whether it is on show.
  const asked = () => prefix === "currentAddress" || !getValues("sameAsCurrent");
  const required = (label: string) => rules.requiredWhen(label, asked);

  return (
    <div className={GRID}>
      <TextField
        name={`${prefix}.houseNumber`}
        label="House Number"
        placeholder="12/20"
        required
        rules={required("House number")}
      />
      <TextField
        name={`${prefix}.street`}
        label="Street"
        placeholder="Payne Street"
        required
        rules={required("Street")}
      />
      <TextField
        name={`${prefix}.suburb`}
        label="Suburb"
        placeholder="Caulfield"
        required
        rules={required("Suburb")}
      />
      {/* Country first: it decides what the State field can offer. */}
      <SelectField
        name={`${prefix}.country`}
        label="Country"
        options={COUNTRIES}
        required
        rules={required("Country")}
      />
      <StateField prefix={prefix} rules={required("State")} />
      <TextField
        name={`${prefix}.postCode`}
        label="Post Code"
        placeholder="3161"
        required
        rules={required("Post code")}
      />
    </div>
  );
}

export function AddressSection() {
  const { control, setValue, trigger } = useFormContext<DriverFormValues>();
  const sameAsCurrent = useWatch({ control, name: "sameAsCurrent" });
  const [locating, setLocating] = useState(false);

  /**
   * Fills the current address from where the driver is standing.
   *
   * The country is written first so the State field has already switched to that
   * country's own divisions by the time the state lands in it. Only fields the
   * lookup actually answered are written, so a correction already typed into a
   * field the lookup cannot see is never wiped by an empty result.
   */
  async function fillFromMyLocation() {
    setLocating(true);
    try {
      const found = await locateCurrentAddress();

      // Country leads, then the rest. Writing it first also lets the state
      // clearing above settle before the new state arrives.
      const order: (keyof AddressBlockValues)[] = [
        "country",
        "state",
        "houseNumber",
        "street",
        "suburb",
        "postCode",
      ];

      let filled = 0;
      for (const key of order) {
        if (!found[key]) continue;
        setValue(`currentAddress.${key}`, found[key], { shouldDirty: true });
        filled += 1;
      }

      if (filled === 0) {
        toast.error("Nothing to fill in", {
          description: "No address details came back for your location.",
        });
        return;
      }

      await trigger("currentAddress");

      const missing = order.filter((key) => !found[key]);
      toast.success("Address filled in", {
        description:
          missing.length > 0
            ? "Check every field, and complete the ones the lookup could not answer."
            : "Check every field and correct anything that is not right.",
      });
    } catch (error) {
      toast.error("Could not get your location", {
        description:
          error instanceof Error ? error.message : "Please fill the address in yourself.",
      });
    } finally {
      setLocating(false);
    }
  }

  return (
    <SectionCard
      index={2}
      id="step-address"
      icon={MapPin}
      title="Address Information"
      description="Where the driver currently lives and their permanent address."
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-semibold text-foreground">Current Address</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void fillFromMyLocation()}
          disabled={locating}
        >
          {locating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Finding you
            </>
          ) : (
            <>
              <LocateFixed className="h-4 w-4" /> Get location
            </>
          )}
        </Button>
      </div>
      <AddressBlock prefix="currentAddress" />

      <div className="mt-6 flex items-center gap-3 rounded-xl border border-border/60 bg-secondary/40 px-4 py-3">
        <Checkbox
          id="sameAsCurrent"
          checked={sameAsCurrent}
          onCheckedChange={(v) =>
            setValue("sameAsCurrent", Boolean(v), { shouldDirty: true })
          }
        />
        <label
          htmlFor="sameAsCurrent"
          className="cursor-pointer text-sm font-medium text-foreground"
        >
          Permanent address is the same as current address
        </label>
      </div>

      <AnimatePresence initial={false}>
        {!sameAsCurrent && (
          <motion.div
            key="permanent"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <Separator className="my-6" />
            <div className="mb-3 text-sm font-semibold text-foreground">
              Permanent Address
            </div>
            <AddressBlock prefix="permanentAddress" />
          </motion.div>
        )}
      </AnimatePresence>
    </SectionCard>
  );
}
