import { request } from "./api";

/**
 * The Create Booking API. One call for now - raising a booking - plus the mapper
 * that turns the form's values into the payload the backend expects.
 *
 * The form keeps pickups and deliveries in their own field shapes (pickupTime,
 * deliveryCompany, and so on); the backend takes one shared stop shape, so the
 * mapping happens here rather than leaking either shape into the other.
 */

export interface BookingStopPayload {
  clientJobNumber: string;
  trailer: string;
  scheduledAt: string;
  company: string;
  address: string;
  city: string;
  suburb: string;
  state: string;
  country: string;
  instructions: string;
}

export interface BookingPricePayload {
  grossAmount: string;
  fuelLevyPct: string;
  fuelLevyAmount: string;
  gstPct: string;
  gstAmount: string;
  netAmount: string;
  totalAmount: string;
}

export interface BookingLanePayload {
  trailer: string;
  lane: string;
}

export interface CreateBookingPayload {
  bookingReceivedDate: string;
  financialYear: string;
  customerId: string;
  customerName: string;
  customerAccountNumber: string;
  accountStatus: string;
  agreementType: string;
  reference: string;
  cargoType: string;
  vehicleType: string;
  trailerCategory: string;
  pickups: BookingStopPayload[];
  deliveries: BookingStopPayload[];
  lanes: BookingLanePayload[];
  price: BookingPricePayload;
  vendor: { vendorId: string; vendorName: string };
  vendorPrice: BookingPricePayload;
}

export interface BookingCreated {
  id: string;
  jobNumber: string;
}

/** Reads a form value as a plain string, whatever it actually holds. */
function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
}

function priceOf(value: unknown): BookingPricePayload {
  const p = (value ?? {}) as Record<string, unknown>;
  return {
    grossAmount: str(p.grossAmount),
    fuelLevyPct: str(p.fuelLevyPct),
    fuelLevyAmount: str(p.fuelLevyAmount),
    gstPct: str(p.gstPct),
    gstAmount: str(p.gstAmount),
    netAmount: str(p.netAmount),
    totalAmount: str(p.totalAmount),
  };
}

/** Maps one pickup or delivery row onto the shared stop shape. */
function stopOf(row: Record<string, unknown>, kind: "pickup" | "delivery"): BookingStopPayload {
  return {
    clientJobNumber: str(row.clientJobNumber),
    trailer: str(row.trailer),
    scheduledAt: str(row[`${kind}Time`]),
    company: str(row[`${kind}Company`]),
    address: str(row[`${kind}Address`]),
    city: str(row.city),
    suburb: str(row.suburb),
    state: str(row.state),
    country: str(row.country),
    instructions: str(row.instructions),
  };
}

/** Turns the raw form values into the create-booking payload. */
export function buildBookingPayload(values: Record<string, unknown>): CreateBookingPayload {
  const vendor = (values.vendor ?? {}) as Record<string, unknown>;

  return {
    bookingReceivedDate: str(values.bookingReceivedDate),
    financialYear: str(values.financialYear),
    customerId: str(values.customerId),
    customerName: str(values.customer),
    customerAccountNumber: str(values.customerAccountNumber),
    accountStatus: str(values.accountStatus),
    agreementType: str(values.agreementType),
    reference: str(values.reference),
    cargoType: str(values.cargoType),
    vehicleType: str(values.vehicleType),
    trailerCategory: str(values.trailerCategory),
    pickups: toArray(values.pickups).map((row) => stopOf(row, "pickup")),
    deliveries: toArray(values.deliveries).map((row) => stopOf(row, "delivery")),
    lanes: toArray(values.lanes).map((row) => ({
      trailer: str(row.trailer),
      lane: str(row.lane),
    })),
    price: priceOf(values.price),
    vendor: { vendorId: str(vendor.vendorId), vendorName: str(vendor.vendorName) },
    vendorPrice: priceOf(values.vendorPrice),
  };
}

export const bookingService = {
  create(payload: CreateBookingPayload): Promise<BookingCreated> {
    return request<BookingCreated>({ url: "/admin/bookings", method: "POST", data: payload });
  },
};
