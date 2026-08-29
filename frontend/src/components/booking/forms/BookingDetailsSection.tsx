import { useEffect } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { ClipboardList } from "lucide-react";
import { SectionCard } from "@/components/form/SectionCard";
import { TextField, DateField, SelectField } from "@/components/form/Fields";
import { rules } from "@/utils/validation";
import { CustomerField } from "./CustomerField";
import {
  ACCOUNT_STATUSES,
  AGREEMENT_TYPES,
  REFERENCES,
  CARGO_TYPES,
  VEHICLE_TYPES,
  TRAILER_CATEGORIES,
} from "@/constants/bookingOptions";

const GRID = "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3";

/**
 * The Australian financial year a date falls in, as "26-27".
 *
 * The year runs 1 July to 30 June: a date in July or later belongs to the year
 * that starts that calendar year, an earlier date to the one before. Empty in,
 * empty out.
 */
function australianFinancialYear(date: string | undefined): string {
  if (!date) return "";
  const [year, month] = date.split("-").map(Number);
  if (!year || !month) return "";
  const startYear = month >= 7 ? year : year - 1;
  const endYear = startYear + 1;
  const two = (value: number) => String(value % 100).padStart(2, "0");
  return `${two(startYear)}-${two(endYear)}`;
}

/** Section 1 - the booking's own particulars: who, what and under which terms. */
export function BookingDetailsSection() {
  const { control, setValue } = useFormContext();
  const receivedDate = useWatch({ control, name: "bookingReceivedDate" }) as string | undefined;

  // The financial year is not typed: it follows the received date.
  useEffect(() => {
    setValue("financialYear", australianFinancialYear(receivedDate));
  }, [receivedDate, setValue]);

  return (
    <SectionCard
      index={1}
      id="step-booking"
      icon={ClipboardList}
      title="Booking Details"
      description="Who the job is for, what is moving, and the terms it runs under."
    >
      <div className={GRID}>
        <DateField
          name="bookingReceivedDate"
          label="Booking Received Date"
          required
          rules={rules.required("Booking received date")}
        />
        <TextField
          name="financialYear"
          label="Financial Year"
          placeholder="Set from the booking date"
          readOnly
          hint="Australian financial year (1 July - 30 June), from the booking date."
        />
        <TextField
          name="jobNumber"
          label="Job Number"
          placeholder="Assigned when the booking is saved"
          readOnly
          hint="BIVRY-<year>-<number>, given by the server on save so two admins can never be handed the same one."
        />
        <CustomerField />
        <TextField
          name="customerAccountNumber"
          label="Customer Account Number"
          placeholder="Select a customer to fill this"
          readOnly
          hint="From the selected customer's record."
        />
        <SelectField
          name="accountStatus"
          label="Account Status"
          options={ACCOUNT_STATUSES}
          placeholder="Select status"
        />
        <SelectField
          name="agreementType"
          label="Agreement Type"
          options={AGREEMENT_TYPES}
          placeholder="Select agreement"
        />
        <SelectField
          name="reference"
          label="Reference"
          options={REFERENCES}
          placeholder="Select reference"
        />
        <SelectField
          name="cargoType"
          label="Cargo Type"
          options={CARGO_TYPES}
          placeholder="Select cargo"
        />
        <SelectField
          name="vehicleType"
          label="Vehicle Type"
          options={VEHICLE_TYPES}
          placeholder="Select vehicle"
        />
        <SelectField
          name="trailerCategory"
          label="Trailer Category"
          options={TRAILER_CATEGORIES}
          placeholder="Select trailer"
        />
      </div>
    </SectionCard>
  );
}
