import { useFieldArray, useFormContext } from "react-hook-form";
import { AnimatePresence, motion } from "framer-motion";
import { Truck, Plus, Trash2 } from "lucide-react";
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

const GRID = "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3";

/** One blank delivery, appended when "Add More" is pressed. */
function emptyDelivery() {
  return {
    id: crypto.randomUUID(),
    clientJobNumber: "",
    trailer: "",
    deliveryTime: "",
    deliveryCompany: "",
    deliveryAddress: "",
    city: "",
    suburb: "",
    state: "",
    country: "Australia",
    instructions: "",
  };
}

/**
 * Section 3 - one or more deliveries.
 *
 * The same shape as the pickups above it: a field array that opens with one and
 * grows by "Add More", where "Pick-Up" reads as "Delivery" throughout.
 */
export function DeliveryDetailsSection() {
  const { control } = useFormContext();
  const deliveries = useFieldArray({ control, name: "deliveries" });

  return (
    <SectionCard
      index={3}
      id="step-delivery"
      icon={Truck}
      title="Delivery Details"
      description="Where the job is delivered. Add a delivery for every place it drops at."
    >
      <div className="space-y-4">
        <AnimatePresence initial={false}>
          {deliveries.fields.map((field, index) => (
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
                  Delivery {index + 1}
                </span>
                {/* The first delivery always stays; the rest can be removed. */}
                {deliveries.fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:bg-red-50 hover:text-red-500"
                    onClick={() => deliveries.remove(index)}
                  >
                    <Trash2 className="h-4 w-4" /> Remove
                  </Button>
                )}
              </div>

              <div className={GRID}>
                <TextField
                  name={`deliveries.${index}.clientJobNumber`}
                  label="Client Job Number"
                  placeholder="e.g. CJ-5567"
                />
                <SelectField
                  name={`deliveries.${index}.trailer`}
                  label="Trailer"
                  options={TRAILERS}
                  placeholder="Select trailer"
                />
                <DateField
                  name={`deliveries.${index}.deliveryTime`}
                  label="Delivery Time"
                  type="datetime-local"
                />
                <TextField
                  name={`deliveries.${index}.deliveryCompany`}
                  label="Delivery Company"
                  placeholder="Company delivering to"
                />
                <BookingAddressFields
                  base={`deliveries.${index}`}
                  addressName="deliveryAddress"
                  label="Delivery Address"
                />
                <TextAreaField
                  name={`deliveries.${index}.instructions`}
                  label="Instructions"
                  placeholder="Anything the driver needs to know for this delivery"
                  rows={3}
                  className="sm:col-span-2 lg:col-span-3"
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        <Button type="button" variant="outline" onClick={() => deliveries.append(emptyDelivery())}>
          <Plus className="h-4 w-4" /> Add More
        </Button>
      </div>
    </SectionCard>
  );
}
