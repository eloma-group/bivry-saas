import { Truck } from "lucide-react";
import { SectionCard } from "@/components/form/SectionCard";
import { SelectField } from "@/components/form/Fields";
import { CARGO_TYPES, VEHICLE_TYPES, TRAILER_CATEGORIES } from "@/constants/bookingOptions";
import { OPTION_LISTS } from "@/constants/optionLists";

const GRID = "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3";

/**
 * Section 2 - what carries the job.
 *
 * Split out of Booking Details, which had grown to hold both the commercial
 * terms and the equipment. These three answer one question between them - what
 * is moving and on what - so they read better as a section of their own, and
 * the values still sit on the same form under the same names.
 */
export function VehicleDetailsSection() {
  return (
    <SectionCard
      index={2}
      id="step-vehicle"
      icon={Truck}
      title="Vehicle Details"
      description="What is moving, and the vehicle and trailer it moves on."
    >
      <div className={GRID}>
        <SelectField
          name="vehicleType"
          label="Vehicle Type"
          options={VEHICLE_TYPES}
          listKey={OPTION_LISTS.vehicleType}
          placeholder="Select vehicle"
        />
        <SelectField
          name="cargoType"
          label="Cargo Type"
          options={CARGO_TYPES}
          listKey={OPTION_LISTS.cargoType}
          placeholder="Select cargo"
        />
        <SelectField
          name="trailerCategory"
          label="Trailer Category"
          options={TRAILER_CATEGORIES}
          listKey={OPTION_LISTS.trailerCategory}
          placeholder="Select trailer"
        />
      </div>
    </SectionCard>
  );
}
