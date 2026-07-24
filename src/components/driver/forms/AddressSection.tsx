import { MapPin } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";
import { AnimatePresence, motion } from "framer-motion";
import { SectionCard } from "./SectionCard";
import { TextField, SelectField } from "./Fields";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { AU_STATES, COUNTRIES } from "@/constants/options";
import type { DriverFormValues } from "@/types/driver";

const GRID = "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3";

function AddressBlock({ prefix }: { prefix: "currentAddress" | "permanentAddress" }) {
  return (
    <div className={GRID}>
      <TextField
        name={`${prefix}.houseNumber`}
        label="House Number"
        placeholder="12/20"
      />
      <TextField
        name={`${prefix}.street`}
        label="Street"
        placeholder="Payne Street"
      />
      <TextField
        name={`${prefix}.suburb`}
        label="Suburb"
        placeholder="Caulfield"
      />
      <SelectField name={`${prefix}.state`} label="State" options={AU_STATES} />
      <SelectField
        name={`${prefix}.country`}
        label="Country"
        options={COUNTRIES}
      />
      <TextField
        name={`${prefix}.postCode`}
        label="Post Code"
        placeholder="3161"
      />
    </div>
  );
}

export function AddressSection() {
  const { control, setValue } = useFormContext<DriverFormValues>();
  const sameAsCurrent = useWatch({ control, name: "sameAsCurrent" });

  return (
    <SectionCard
      index={2}
      id="step-address"
      icon={MapPin}
      title="Address Information"
      description="Where the driver currently lives and their permanent address."
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="text-sm font-semibold text-foreground">
          Current Address
        </span>
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
