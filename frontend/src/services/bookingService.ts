import { request } from "./api";

/**
 * The Create Booking API. One call for now - raising a booking - plus the mapper
 * that turns the form's values into the payload the backend expects.
 *
 * The form keeps pickups and deliveries in their own field shapes (pickupTime,
 * deliveryCompany, and so on); the backend takes one shared stop shape, so the
 * mapping happens here rather than leaking either shape into the other. The
 * address is the exception: both hold it under the same six names, so it maps
 * straight across.
 */

export interface BookingStopPayload {
  clientJobNumber: string;
  trailer: string;
  scheduledAt: string;
  company: string;
  /** Unit, suite or flat number. Kept off the street line. */
  suite: string;
  street1: string;
  suburb: string;
  state: string;
  postCode: string;
  country: string;
  instructions: string;
}

export interface BookingPricePayload {
  grossAmount: string;
  /**
   * The gross for the second trailer, on the vendor price only: that grid asks
   * for a gross per trailer and works everything else out from their sum. Our
   * Price sends it empty, and the API stores it for the vendor alone.
   */
  grossAmount2: string;
  fuelLevyPct: string;
  fuelLevyAmount: string;
  gstPct: string;
  gstAmount: string;
  netAmount: string;
  totalAmount: string;
}

export interface CreateBookingPayload {
  /**
   * The number the server parked for this admin when the form opened. Sent back
   * so the save can consume that reservation; the server checks it is genuinely
   * held before honouring it, and allocates a fresh one otherwise.
   */
  jobNumber: string;
  bookingReceivedDate: string;
  financialYear: string;
  customerId: string;
  customerName: string;
  customerAccountNumber: string;
  accountStatus: string;
  agreementType: string;
  reference: string;
  /** The invoice term as worded: "Net 7". From the customer, or typed over. */
  invoiceTerm: string;
  cargoType: string;
  vehicleType: string;
  trailerCategory: string;
  pickups: BookingStopPayload[];
  deliveries: BookingStopPayload[];
  /**
   * What we charge, one entry per price column on the form. A booking that
   * loads at one place sends one; one that loads at two sends two, and the
   * order here is the order they were shown in.
   */
  prices: BookingPricePayload[];
  /** Every price total added together, as shown on the form. */
  priceFinalAmount: string;
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
    grossAmount2: str(p.grossAmount2),
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
    suite: str(row.suite),
    street1: str(row.street1),
    suburb: str(row.suburb),
    state: str(row.state),
    postCode: str(row.postCode),
    country: str(row.country),
    instructions: str(row.instructions),
  };
}

/** Turns the raw form values into the create-booking payload. */
export function buildBookingPayload(values: Record<string, unknown>): CreateBookingPayload {
  const vendor = (values.vendor ?? {}) as Record<string, unknown>;

  return {
    jobNumber: str(values.jobNumber),
    bookingReceivedDate: str(values.bookingReceivedDate),
    financialYear: str(values.financialYear),
    customerId: str(values.customerId),
    customerName: str(values.customer),
    customerAccountNumber: str(values.customerAccountNumber),
    accountStatus: str(values.accountStatus),
    agreementType: str(values.agreementType),
    reference: str(values.reference),
    invoiceTerm: str(values.invoiceTerm),
    cargoType: str(values.cargoType),
    vehicleType: str(values.vehicleType),
    trailerCategory: str(values.trailerCategory),
    pickups: toArray(values.pickups).map((row) => stopOf(row, "pickup")),
    deliveries: toArray(values.deliveries).map((row) => stopOf(row, "delivery")),
    prices: toArray(values.prices).map(priceOf),
    priceFinalAmount: str(values.priceFinalAmount),
    vendor: { vendorId: str(vendor.vendorId), vendorName: str(vendor.vendorName) },
    vendorPrice: priceOf(values.vendorPrice),
  };
}

/** A job number parked for this admin while the Create Booking form is open. */
export interface ReservedJobNumber {
  jobNumber: string;
  financialYear: string;
  expiresAt: string;
}

export const bookingService = {
  create(payload: CreateBookingPayload): Promise<BookingCreated> {
    return request<BookingCreated>({ url: "/admin/bookings", method: "POST", data: payload });
  },

  /**
   * Takes the next job number and holds it for this admin, so the form can show
   * the number it is going to be given and no second admin is offered it.
   */
  reserveJobNumber(input: {
    bookingReceivedDate?: string;
    financialYear?: string;
  }): Promise<ReservedJobNumber> {
    return request<ReservedJobNumber>({
      url: "/admin/bookings/job-number",
      method: "POST",
      data: input,
    });
  },

  /** Gives a held number back, so the next form to open is offered it. */
  releaseJobNumber(jobNumber: string): Promise<null> {
    return request<null>({
      url: `/admin/bookings/job-number/${encodeURIComponent(jobNumber)}`,
      method: "DELETE",
    });
  },
};
