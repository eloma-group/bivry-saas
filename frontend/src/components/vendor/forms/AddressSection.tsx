import { useEffect, useRef } from "react";
import { MapPin, Plus, Tractor, Trash2, Warehouse } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { AnimatePresence, motion } from "framer-motion";
import { SectionCard } from "@/components/form/SectionCard";
import { TextField, SelectField } from "@/components/form/Fields";
import { LocationPicker } from "@/components/form/LocationPicker";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { COUNTRIES } from "@/constants/options";
import { isStateOfCountry, statesFor } from "@/constants/regions";
import { rules } from "@/utils/validation";
import type { FieldRules } from "@/components/form/Fields";
import type { AddressBlock as FoundAddress } from "@/types/driver";
import type { VendorFormValues } from "@/types/vendor";

const GRID = "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3";

/**
 * Where one address lives in the form.
 *
 * The two registered addresses sit at a name of their own; a yard or a warehouse
 * sits at an index in its list. Everything below takes the path rather than the
 * address, so one set of fields and one set of location tools serves them all.
 */
type AddressPath =
  | "principalAddress"
  | "billingAddress"
  | `yards.${number}`
  | `warehouses.${number}`;

/**
 * The State field, offering whichever divisions the chosen country actually has.
 *
 * A country we hold no list for gets a free text box instead, so an address
 * abroad is never impossible to enter. Changing the country clears a state that
 * belonged to the old one, rather than leaving Victoria sitting under Canada.
 */
function StateField({ path, rules: fieldRules }: { path: AddressPath; rules: FieldRules }) {
  const { control, setValue, getValues } = useFormContext<VendorFormValues>();
  const country = useWatch({ control, name: `${path}.country` });
  const options = statesFor(country);

  // Only a change of country clears the state. On the first render the stored
  // address is still loading in, and wiping it there would lose saved data.
  const previousCountry = useRef<string | null>(null);
  useEffect(() => {
    const previous = previousCountry.current;
    previousCountry.current = country ?? "";
    if (previous === null || previous === country) return;

    const state = getValues(`${path}.state`);
    if (state && !isStateOfCountry(country ?? "", state)) {
      setValue(`${path}.state`, "", { shouldDirty: true });
    }
  }, [country, getValues, path, setValue]);

  if (!options) {
    return (
      <TextField
        name={`${path}.state`}
        label="State"
        placeholder={country ? "Region or province" : "Choose a country first"}
        required
        rules={fieldRules}
      />
    );
  }

  return (
    <SelectField
      name={`${path}.state`}
      label="State"
      options={options}
      required
      rules={fieldRules}
    />
  );
}

/**
 * The six fields every address here asks for.
 *
 * Street 2 is the only optional one. It carries a unit, a level or a building
 * name, and plenty of addresses have none.
 */
function AddressFields({
  path,
  asked,
}: {
  path: AddressPath;
  /** Whether this block is on screen and therefore being asked for. */
  asked: () => boolean;
}) {
  const required = (label: string) => rules.requiredWhen(label, asked);

  return (
    <div className={GRID}>
      <TextField
        name={`${path}.street1`}
        label="Street 1"
        placeholder="12 Payne Street"
        required
        rules={required("Street 1")}
      />
      <TextField
        name={`${path}.street2`}
        label="Street 2"
        placeholder="Unit or level, if there is one"
      />
      <TextField
        name={`${path}.suburb`}
        label="Suburb"
        placeholder="Caulfield"
        required
        rules={required("Suburb")}
      />
      {/* Country first: it decides what the State field can offer. */}
      <SelectField
        name={`${path}.country`}
        label="Country"
        options={COUNTRIES}
        required
        rules={required("Country")}
      />
      <StateField path={path} rules={required("State")} />
      <TextField
        name={`${path}.postCode`}
        label="Post Code"
        placeholder="3161"
        required
        rules={required("Post code")}
      />
    </div>
  );
}

/**
 * The location tools over one address block.
 *
 * A fix from the browser and a search both come back in the shape the driver
 * form asks for, which splits the street number off the street. This form keeps
 * them on one line, so they are put back together on the way in. Street 2 is
 * never written: no lookup knows which unit anybody is in.
 *
 * The country is written first, so the State field has already switched to that
 * country's own divisions by the time the state lands in it. Only fields the
 * lookup answered are written, so a correction already typed into one it cannot
 * see is never wiped by an empty result.
 */
function AddressTools({ path, label }: { path: AddressPath; label: string }) {
  const { setValue, trigger } = useFormContext<VendorFormValues>();

  function apply(found: FoundAddress) {
    const street1 = [found.houseNumber, found.street].filter(Boolean).join(" ").trim();
    const filled: Array<[string, string]> = [
      ["country", found.country],
      ["state", found.state],
      ["street1", street1],
      ["suburb", found.suburb],
      ["postCode", found.postCode],
    ];

    for (const [key, value] of filled) {
      if (!value) continue;
      setValue(`${path}.${key}` as `${AddressPath}.street1`, value, { shouldDirty: true });
    }

    void trigger(path);
  }

  return <LocationPicker label={label} onPick={apply} className="mb-4" />;
}

/**
 * A list of sites the vendor operates: the yards, and the warehouses.
 *
 * Both lists ask for exactly the same address and carry the same location
 * tools, so they are the same component twice over. The fields for a site only
 * appear once one has been added, which is what keeps the yards out of the way
 * of a vendor who has none.
 */
function SiteList({
  name,
  icon: Icon,
  title,
  description,
  rowLabel,
  emptyLabel,
}: {
  name: "yards" | "warehouses";
  icon: LucideIcon;
  title: string;
  description: string;
  /** Names one row: "Yard 1", "Warehouse 2". */
  rowLabel: string;
  emptyLabel: string;
}) {
  const { control } = useFormContext<VendorFormValues>();
  const sites = useFieldArray({ control, name });

  return (
    <>
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
        {title}
      </div>
      <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{description}</p>

      <div className="space-y-4">
        <AnimatePresence initial={false}>
          {sites.fields.map((field, index) => (
            <motion.div
              key={field.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.25 }}
              className="rounded-2xl border border-border/60 bg-secondary/30 p-5"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-foreground">
                  {rowLabel} {index + 1}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:bg-red-50 hover:text-red-500"
                  onClick={() => sites.remove(index)}
                >
                  <Trash2 className="h-4 w-4" /> Remove
                </Button>
              </div>

              <AddressTools
                path={`${name}.${index}`}
                label={`${rowLabel.toLowerCase()} ${index + 1} address`}
              />
              <AddressFields path={`${name}.${index}`} asked={() => true} />
            </motion.div>
          ))}
        </AnimatePresence>

        {sites.fields.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border bg-secondary/30 px-5 py-6 text-center text-sm text-muted-foreground">
            {emptyLabel}
          </p>
        )}

        <Button
          type="button"
          variant="outline"
          onClick={() =>
            sites.append({
              id: crypto.randomUUID(),
              street1: "",
              street2: "",
              suburb: "",
              state: "",
              country: "Australia",
              postCode: "",
            })
          }
        >
          <Plus className="h-4 w-4" /> Add More Addresses
        </Button>
      </div>
    </>
  );
}

export function AddressSection() {
  const { control, getValues, setValue } = useFormContext<VendorFormValues>();
  const billingSameAsPrincipal = useWatch({ control, name: "billingSameAsPrincipal" });

  return (
    <SectionCard
      index={5}
      id="step-addresses"
      icon={MapPin}
      title="Address Information"
      description="Where the business is registered, where its invoices go, and every yard and warehouse you run."
    >
      <div className="mb-3 text-sm font-semibold text-foreground">Principal Address</div>
      <AddressTools path="principalAddress" label="principal address" />
      <AddressFields path="principalAddress" asked={() => true} />

      <div className="mt-6 flex items-center gap-3 rounded-xl border border-border/60 bg-secondary/40 px-4 py-3">
        <Checkbox
          id="billingSameAsPrincipal"
          checked={billingSameAsPrincipal}
          onCheckedChange={(checked) =>
            setValue("billingSameAsPrincipal", Boolean(checked), { shouldDirty: true })
          }
        />
        <label
          htmlFor="billingSameAsPrincipal"
          className="cursor-pointer text-sm font-medium text-foreground"
        >
          Billing address is the same as the principal address
        </label>
      </div>

      {/* The billing fields leave the screen when the tick says they match, but
          they stay registered, so their rules have to ask whether they are on
          show. The principal address is saved as the billing one either way. */}
      <AnimatePresence initial={false}>
        {!billingSameAsPrincipal && (
          <motion.div
            key="billing"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <Separator className="my-6" />
            <div className="mb-3 text-sm font-semibold text-foreground">Billing Address</div>
            <AddressTools path="billingAddress" label="billing address" />
            {/* Hidden fields stay registered, so the rule has to ask whether the
                block is on show rather than assume it is. */}
            <AddressFields
              path="billingAddress"
              asked={() => !getValues("billingSameAsPrincipal")}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <Separator className="my-6" />
      <SiteList
        name="yards"
        icon={Tractor}
        title="Yard Locations"
        description="Anywhere you park or stage. Add one only if you have a yard."
        rowLabel="Yard"
        emptyLabel="No yard addresses added yet."
      />

      <Separator className="my-6" />
      <SiteList
        name="warehouses"
        icon={Warehouse}
        title="Warehouse Locations"
        description="Every site we may collect from or deliver to. Add at least one."
        rowLabel="Warehouse"
        emptyLabel="No warehouse addresses added yet. Add at least one."
      />
    </SectionCard>
  );
}
