import { useEffect, useRef } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { TextField, SelectField } from "@/components/form/Fields";
import { COUNTRIES } from "@/constants/options";
import { isStateOfCountry, statesFor } from "@/constants/regions";
import { OPTION_LISTS, statesListKey } from "@/constants/optionLists";
import { rules } from "@/utils/validation";
import type { FieldRules } from "@/components/form/Fields";

/**
 * One address inside a pickup or a delivery.
 *
 * The same six fields, in the same order and of the same kinds, as the Address
 * Information block on the customer onboarding form: Suite, Street 1, Suburb,
 * State, Post Code, Country. It used to ask for a free "Pick-Up Address" line
 * and a City on top of the suburb, which was the same address twice - the line
 * repeated what the fields under it already said, and in an Australian address
 * a city and a suburb are the same thing.
 *
 * Suite is the only optional one, because plenty of addresses are not inside a
 * subdivided building. State offers whichever divisions the chosen country has
 * and falls back to a text box for a country we hold no list for, so an address
 * abroad is never impossible to enter.
 *
 * `base` is the row path ("pickups.0"); every field sits at a fixed name under
 * it, so a pickup and a delivery hold their address identically.
 */

/** The State field, offering the chosen country's own divisions. */
function StateField({ base, rules: fieldRules }: { base: string; rules: FieldRules }) {
  const { control, setValue, getValues } = useFormContext();
  const country = useWatch({ control, name: `${base}.country` }) as string | undefined;
  const options = statesFor(country);

  // Only a change of country clears the state. Clearing on the first render
  // would wipe a state that arrived with the row.
  const previousCountry = useRef<string | null>(null);
  useEffect(() => {
    const previous = previousCountry.current;
    previousCountry.current = country ?? "";
    if (previous === null || previous === country) return;

    const state = getValues(`${base}.state`) as string | undefined;
    if (state && !isStateOfCountry(country ?? "", state)) {
      setValue(`${base}.state`, "", { shouldDirty: true });
    }
  }, [country, getValues, base, setValue]);

  if (!options) {
    return (
      <TextField
        name={`${base}.state`}
        label="State"
        placeholder={country ? "Region or province" : "Choose a country first"}
        required
        rules={fieldRules}
      />
    );
  }

  return (
    <SelectField
      name={`${base}.state`}
      label="State"
      options={options}
      // Per country: Victoria is not an option in Canada, so a state added here
      // is offered only under the country it was added against.
      listKey={statesListKey(country)}
      required
      rules={fieldRules}
    />
  );
}

export function BookingAddressFields({ base }: { base: string }) {
  return (
    <>
      <TextField
        name={`${base}.suite`}
        label="Suite"
        placeholder="Suite 3"
        hint="House, flat or unit number, if the address has one."
      />
      <TextField
        name={`${base}.street1`}
        label="Street 1"
        placeholder="12 Balaclava Road"
        required
        rules={rules.required("Street 1")}
      />
      <TextField
        name={`${base}.suburb`}
        label="Suburb"
        placeholder="Caulfield"
        required
        rules={rules.required("Suburb")}
      />
      <StateField base={base} rules={rules.required("State")} />
      <TextField
        name={`${base}.postCode`}
        label="Post Code"
        placeholder="3161"
        required
        rules={rules.required("Post code")}
      />
      {/* Last, although it is what decides the State options: that field
          watches the country's value, not the order these are rendered in. */}
      <SelectField
        name={`${base}.country`}
        label="Country"
        options={COUNTRIES}
        listKey={OPTION_LISTS.country}
        required
        rules={rules.required("Country")}
      />
    </>
  );
}
