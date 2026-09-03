import { useFieldArray, useFormContext } from "react-hook-form";
import { AnimatePresence, motion } from "framer-motion";
import { PackageCheck, Plus, Trash2 } from "lucide-react";
import { SectionCard } from "@/components/form/SectionCard";
import {
  TextField,
  SelectField,
  TextAreaField,
  DateField,
} from "@/components/form/Fields";
import { BookingAddressFields } from "./BookingAddressFields";
import { Button } from "@/components/ui/button";
import { TRAILERS } from "@/constants/bookingOptions";
import { OPTION_LISTS } from "@/constants/optionLists";

const GRID = "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3";

/** One blank pickup, appended when "Add More" is pressed. */
function emptyPickup() {
  return {
    id: crypto.randomUUID(),
    clientJobNumber: "",
    trailer: "",
    pickupTime: "",
    pickupCompany: "",
    suite: "",
    street1: "",
    suburb: "",
    state: "",
    postCode: "",
    country: "Australia",
    instructions: "",
  };
}

/**
 * Section 3 - one or more pickups.
 *
 * Every pickup asks for the same handful of details, so they are a field array:
 * the form opens with one, and "Add More" appends another exactly like it. The
 * address is asked for in the same six fields the customer form's Address
 * Information block uses - see `BookingAddressFields`.
 */
export function PickupDetailsSection() {
  const { control } = useFormContext();
  const pickups = useFieldArray({ control, name: "pickups" });

  return (
    <SectionCard
      index={3}
      id="step-pickup"
      icon={PackageCheck}
      title="Pickup Details"
      description="Where the job is collected. Add a pickup for every place it loads from."
    >
      <div className="space-y-4">
        <AnimatePresence initial={false}>
          {pickups.fields.map((field, index) => (
            <motion.div
              key={field.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.25 }}
              className="rounded-2xl border border-border/60 bg-secondary/30 p-5"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-foreground">
                  Pickup {index + 1}
                </span>
                {/* The first pickup always stays; the rest can be removed. */}
                {pickups.fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:bg-red-50 hover:text-red-500"
                    onClick={() => pickups.remove(index)}
                  >
                    <Trash2 className="h-4 w-4" /> Remove
                  </Button>
                )}
              </div>

              <div className={GRID}>
                <TextField
                  name={`pickups.${index}.clientJobNumber`}
                  label="Client Job Number"
                  placeholder="e.g. CJ-5567"
                />
                <SelectField
                  name={`pickups.${index}.trailer`}
                  label="Trailer"
                  options={TRAILERS}
                  listKey={OPTION_LISTS.trailer}
                  placeholder="Select trailer"
                />
                <DateField
                  name={`pickups.${index}.pickupTime`}
                  label="Pick-Up Time"
                  type="datetime-local"
                />
                <TextField
                  name={`pickups.${index}.pickupCompany`}
                  label="Pick-Up Company"
                  placeholder="Company collecting from"
                />
                <BookingAddressFields base={`pickups.${index}`} />
                <TextAreaField
                  name={`pickups.${index}.instructions`}
                  label="Instructions"
                  placeholder="Anything the driver needs to know for this pickup"
                  rows={3}
                  className="sm:col-span-2 lg:col-span-3"
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        <Button type="button" variant="outline" onClick={() => pickups.append(emptyPickup())}>
          <Plus className="h-4 w-4" /> Add More
        </Button>
      </div>
    </SectionCard>
  );
}
