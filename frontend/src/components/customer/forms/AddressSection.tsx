import { useEffect, useRef } from "react";
import { MapPin, Plus, Trash2, Warehouse } from "lucide-react";
import {
  useFieldArray,
  useFormContext,
  useWatch,
  type UseFormSetValue,
  type UseFormTrigger,
} from "react-hook-form";
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
import type { CustomerFormValues } from "@/types/customer";

const GRID = "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3";

/**
 * Where one address lives in the form.
 *
 * The two addresses the company is registered at sit at a name of their own; a
 * warehouse sits at an index in its list. All of them take the same fields and
 * the same location tools, so everything below takes the path rather than the
 * address.
 */
type AddressPath = "principalAddress" | "billingAddress" | `warehouses.${number}`;

/**
 * The State field, offering whichever divisions the chosen country actually has.
 *
 * A country we hold no list for gets a free text box instead, so an address
 * abroad is never impossible to enter. Changing the country clears a state that
 * belonged to the old one, rather than leaving Victoria sitting under Canada.
 */
function StateField({ path, rules: fieldRules }: { path: AddressPath; rules: FieldRules }) {
  const { control, setValue, getValues } = useFormContext<CustomerFormValues>();
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
 * Writes a found address onto one block's fields.
 *
 * The lookup splits the street number off the street; this form keeps them on
 * one line, so they are put back together on the way in. The country is written
 * first, so the State field has already switched to that country's own divisions
 * by the time the state lands in it. Only fields the lookup answered are
 * written, so a correction already typed into one it cannot see is never wiped.
 */
function applyFoundAddress(
  path: AddressPath,
  found: FoundAddress,
  setValue: UseFormSetValue<CustomerFormValues>,
  trigger: UseFormTrigger<CustomerFormValues>,
) {
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

/**
 * The five fields every address here asks for.
 *
 * Street 1 is typed, not searched. The search sits once above the block, in the
 * tools, so having the street line suggest as well was the same lookup offered
 * twice over. Whatever is picked up there still lands in this field.
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
        placeholder="12 Balaclava Road"
        required
        rules={required("Street 1")}
      />
      <TextField
        name={`${path}.suburb`}
        label="Suburb"
        placeholder="Caulfield"
        required
        rules={required("Suburb")}
      />
      <StateField path={path} rules={required("State")} />
      <TextField
        name={`${path}.postCode`}
        label="Post Code"
        placeholder="3161"
        required
        rules={required("Post code")}
      />
      {/* Last, although it is what decides the State options: that field watches
          the country's value, not the order these are rendered in. */}
      <SelectField
        name={`${path}.country`}
        label="Country"
        options={COUNTRIES}
        required
        rules={required("Country")}
      />
    </div>
  );
}

/**
 * The location tools over one address block: a fix from the browser, and a
 * worldwide search. These are the only lookup an address has; the fields below
 * are all typed, and everything found here is written into them.
 */
function AddressTools({ path, label }: { path: AddressPath; label: string }) {
  const { setValue, trigger } = useFormContext<CustomerFormValues>();
  return (
    <LocationPicker
      label={label}
      onPick={(found) => applyFoundAddress(path, found, setValue, trigger)}
      className="mb-4"
    />
  );
}

/**
 * The warehouses the customer operates.
 *
 * The same list, the same address fields and the same location tools the vendor
 * form gives its own sites, so a business that is both is asked the same
 * question once rather than two different ones. The State field offers whichever
 * divisions the chosen country has, which is what makes these state wise.
 *
 * The fields for a warehouse only appear once one has been added, which is what
 * keeps them out of the way of a customer who runs none.
 */
function WarehouseList() {
  const { control } = useFormContext<CustomerFormValues>();
  const sites = useFieldArray({ control, name: "warehouses" });

  return (
    <>
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Warehouse className="h-4 w-4 text-muted-foreground" aria-hidden />
        Warehouse Locations
      </div>
      <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
        Every site we may collect from or deliver to. Add one for each state you hold stock
        in.
      </p>

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
                  Warehouse {index + 1}
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

              <AddressTools path={`warehouses.${index}`} label={`warehouse ${index + 1} address`} />
              <AddressFields path={`warehouses.${index}`} asked={() => true} />
            </motion.div>
          ))}
        </AnimatePresence>

        {sites.fields.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border bg-secondary/30 px-5 py-6 text-center text-sm text-muted-foreground">
            No warehouse addresses added yet.
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
  const { control, getValues, setValue } = useFormContext<CustomerFormValues>();
  const billingSameAsPrincipal = useWatch({ control, name: "billingSameAsPrincipal" });

  return (
    <SectionCard
      index={2}
      id="step-addresses"
      icon={MapPin}
      title="Address Information"
      description="Where the business is run from, where its invoices go, and every warehouse you run."
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
      <WarehouseList />
    </SectionCard>
  );
}
