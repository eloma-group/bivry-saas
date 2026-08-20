import { useEffect, useRef } from "react";
import { Warehouse, Plus, Trash2 } from "lucide-react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { AnimatePresence, motion } from "framer-motion";
import { SectionCard } from "@/components/form/SectionCard";
import { TextField, SelectField } from "@/components/form/Fields";
import { Button } from "@/components/ui/button";
import { COUNTRIES } from "@/constants/options";
import { isStateOfCountry, statesFor } from "@/constants/regions";
import { rules } from "@/utils/validation";
import type { FieldRules } from "@/components/form/Fields";
import type { VendorFormValues } from "@/types/vendor";

const GRID = "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3";

/**
 * The State field, offering whichever divisions the chosen country actually has.
 *
 * A country we hold no list for gets a free text box instead, so a warehouse
 * abroad is never impossible to enter. Changing the country clears a state that
 * belonged to the old one.
 */
function StateField({ index, rules: fieldRules }: { index: number; rules: FieldRules }) {
  const { control, setValue, getValues } = useFormContext<VendorFormValues>();
  const country = useWatch({ control, name: `warehouses.${index}.country` });
  const options = statesFor(country);

  // Only a change of country clears the state. On the first render the stored
  // address is still loading in, and wiping it there would lose saved data.
  const previousCountry = useRef<string | null>(null);
  useEffect(() => {
    const previous = previousCountry.current;
    previousCountry.current = country ?? "";
    if (previous === null || previous === country) return;

    const state = getValues(`warehouses.${index}.state`);
    if (state && !isStateOfCountry(country ?? "", state)) {
      setValue(`warehouses.${index}.state`, "", { shouldDirty: true });
    }
  }, [country, getValues, index, setValue]);

  if (!options) {
    return (
      <TextField
        name={`warehouses.${index}.state`}
        label="State"
        placeholder={country ? "Region or province" : "Choose a country first"}
        required
        rules={fieldRules}
      />
    );
  }

  return (
    <SelectField
      name={`warehouses.${index}.state`}
      label="State"
      options={options}
      required
      rules={fieldRules}
    />
  );
}

export function WarehouseSection() {
  const { control } = useFormContext<VendorFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: "warehouses" });

  return (
    <SectionCard
      index={6}
      id="step-warehouses"
      icon={Warehouse}
      title="Warehouse Locations & Address"
      description="Every site we may collect from or deliver to."
    >
      <div className="space-y-4">
        <AnimatePresence initial={false}>
          {fields.map((field, index) => (
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
                  Address {index + 1}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:bg-red-50 hover:text-red-500"
                  onClick={() => remove(index)}
                >
                  <Trash2 className="h-4 w-4" /> Remove
                </Button>
              </div>

              <div className={GRID}>
                <TextField
                  name={`warehouses.${index}.street1`}
                  label="Street 1"
                  placeholder="Payne Street"
                  required
                  rules={rules.required("Street 1")}
                />
                <TextField
                  name={`warehouses.${index}.street2`}
                  label="Street 2"
                  placeholder="Payne Street"
                  required
                  rules={rules.required("Street 2")}
                />
                <TextField
                  name={`warehouses.${index}.suburb`}
                  label="Suburb"
                  placeholder="Caulfield"
                  required
                  rules={rules.required("Suburb")}
                />
                {/* Country first: it decides what the State field can offer. */}
                <SelectField
                  name={`warehouses.${index}.country`}
                  label="Country"
                  options={COUNTRIES}
                  required
                  rules={rules.required("Country")}
                />
                <StateField index={index} rules={rules.required("State")} />
                <TextField
                  name={`warehouses.${index}.postCode`}
                  label="Post Code"
                  placeholder="3161"
                  required
                  rules={rules.required("Post code")}
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {fields.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border bg-secondary/30 px-5 py-6 text-center text-sm text-muted-foreground">
            No warehouse addresses added yet. Add at least one.
          </p>
        )}

        <Button
          type="button"
          variant="outline"
          onClick={() =>
            append({
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
    </SectionCard>
  );
}
