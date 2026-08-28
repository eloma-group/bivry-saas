import { useFormContext } from "react-hook-form";
import { TextField, SelectField } from "@/components/form/Fields";
import { AddressAutocompleteField } from "@/components/form/AddressAutocompleteField";
import { COUNTRIES } from "@/constants/options";
import type { AddressBlock as FoundAddress } from "@/types/driver";

/** Turns a found address into the single line the address field carries. */
function formatLine(found: FoundAddress): string {
  const street = [found.houseNumber, found.street].filter(Boolean).join(" ").trim();
  const region = [found.state, found.postCode].filter(Boolean).join(" ").trim();
  return [street, found.suburb, region, found.country].filter(Boolean).join(", ");
}

/**
 * One address inside a pickup or a delivery.
 *
 * A single autocomplete line that suggests real addresses, with City, Suburb,
 * State and Country beneath it. Picking a suggestion fills the line and drops
 * the suburb, state and country into their own fields; everything stays editable.
 * The fields render as plain grid children, so they slot straight into the row's
 * existing grid.
 *
 * `base` is the row path ("pickups.0"); `addressName` is the line field on it
 * ("pickupAddress"). City, Suburb, State and Country always sit at `city`,
 * `suburb`, `state` and `country` under the same base.
 */
export function BookingAddressFields({
  base,
  addressName,
  label,
}: {
  base: string;
  addressName: string;
  label: string;
}) {
  const { setValue } = useFormContext();
  const line = `${base}.${addressName}`;

  return (
    <>
      <AddressAutocompleteField
        name={line}
        label={label}
        placeholder="Start typing an address"
        className="sm:col-span-2 lg:col-span-3"
        onPickAddress={(found) => {
          setValue(line, formatLine(found), { shouldDirty: true });
          if (found.suburb) setValue(`${base}.suburb`, found.suburb, { shouldDirty: true });
          if (found.state) setValue(`${base}.state`, found.state, { shouldDirty: true });
          if (found.country) setValue(`${base}.country`, found.country, { shouldDirty: true });
        }}
      />
      <TextField name={`${base}.city`} label="City" placeholder="City" />
      <TextField name={`${base}.suburb`} label="Suburb" placeholder="Suburb" />
      <TextField name={`${base}.state`} label="State" placeholder="State" />
      <SelectField
        name={`${base}.country`}
        label="Country"
        options={COUNTRIES}
        placeholder="Select country"
      />
    </>
  );
}
