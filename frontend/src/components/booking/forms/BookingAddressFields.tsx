import { TextField, SelectField } from "@/components/form/Fields";
import { COUNTRIES } from "@/constants/options";

/**
 * One address inside a pickup or a delivery.
 *
 * A suite, then the address line, with City, Suburb, State and Country beneath.
 * All of it is typed: the address line used to suggest real addresses as it was
 * typed, and the search behind that is not offered on this form any more, the
 * same way it is off on the customer and vendor address blocks. The fields
 * render as plain grid children, so they slot straight into the row's existing
 * grid.
 *
 * `base` is the row path ("pickups.0"); `addressName` is the line field on it
 * ("pickupAddress"). Suite, City, Suburb, State and Country always sit at
 * `suite`, `city`, `suburb`, `state` and `country` under the same base.
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
  return (
    <>
      <TextField
        name={`${base}.suite`}
        label="Suite"
        placeholder="Suite 3"
        hint="House, flat or unit number, if the address has one."
      />
      <TextField
        name={`${base}.${addressName}`}
        label={label}
        placeholder="12 Balaclava Road, Caulfield VIC 3161"
        className="sm:col-span-2 lg:col-span-2"
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
