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
  /**
   * Two further rates charged on the gross, the same way the fuel levy is.
   * Our Price asks for them; the vendor grid does not, and sends them empty.
   */
  splitChargePct: string;
  splitChargeAmount: string;
  otherChargesPct: string;
  otherChargesAmount: string;
  /** Fixed at 10 by Our Price rather than typed. Sent so the rate is stored. */
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
    splitChargePct: str(p.splitChargePct),
    splitChargeAmount: str(p.splitChargeAmount),
    otherChargesPct: str(p.otherChargesPct),
    otherChargesAmount: str(p.otherChargesAmount),
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

/**
 * A booking as the Manage Bookings list reads it back.
 *
 * The money columns arrive as strings: Prisma's Decimal serialises to a string
 * over JSON so no precision is lost on the way. The stops carry both pickups and
 * deliveries, told apart by `type`, so the list can show where a job loads and
 * where it goes.
 */
export interface BookingStopRow {
  id: string;
  type: "PICKUP" | "DELIVERY";
  position: number;
  clientJobNumber: string | null;
  trailer: string | null;
  scheduledAt: string | null;
  company: string | null;
  suite: string | null;
  street1: string | null;
  suburb: string | null;
  state: string | null;
  postCode: string | null;
  country: string | null;
  instructions: string | null;
}

export interface BookingPriceRow {
  id: string;
  position: number;
  grossAmount: string | null;
  fuelLevyPct: string | null;
  fuelLevyAmount: string | null;
  splitChargePct: string | null;
  splitChargeAmount: string | null;
  otherChargesPct: string | null;
  otherChargesAmount: string | null;
  gstPct: string | null;
  gstAmount: string | null;
  netAmount: string | null;
  totalAmount: string | null;
}

export interface BookingLaneRow {
  id: string;
  position: number;
  trailer: string | null;
  lane: string | null;
}

export interface BookingRow {
  id: string;
  jobNumber: string;
  bookingReceivedDate: string | null;
  financialYear: string | null;
  customerId: string | null;
  customerName: string | null;
  customerAccountNumber: string | null;
  accountStatus: string | null;
  agreementType: string | null;
  reference: string | null;
  invoiceTerm: string | null;
  cargoType: string | null;
  vehicleType: string | null;
  trailerCategory: string | null;
  priceFinalAmount: string | null;
  vendorId: string | null;
  vendorName: string | null;
  vendorTotalAmount: string | null;
  createdAt: string;
  stops: BookingStopRow[];
  prices: BookingPriceRow[];
}

/**
 * A booking with everything the detail page reads: the whole booking record, its
 * stops, its price rows and its lanes. Mirrors what `getBooking` returns on the
 * server, so the detail view can lay the saved booking back out section by
 * section the way the Create Booking form does.
 */
export interface BookingDetail extends BookingRow {
  updatedAt: string;
  vendorGrossAmount: string | null;
  vendorGrossAmount2: string | null;
  vendorFuelLevyPct: string | null;
  vendorFuelLevyAmount: string | null;
  vendorGstPct: string | null;
  vendorGstAmount: string | null;
  vendorNetAmount: string | null;
  lanes: BookingLaneRow[];
}

export interface BookingListQuery {
  search?: string;
  page: number;
  pageSize: number;
  sortBy: "createdAt" | "jobNumber" | "bookingReceivedDate";
  sortDir: "asc" | "desc";
}

export interface BookingListResult {
  rows: BookingRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** A stored value back into a form string: null and undefined both read empty. */
function fromValue(value: string | null | undefined): string {
  return value === null || value === undefined ? "" : value;
}

/**
 * Turns a saved booking back into the shape the Create Booking form fills, so
 * the same form can edit it. The reverse of `buildBookingPayload`: the shared
 * stop shape is split back into the form's pickup/delivery field names, and the
 * amounts come back as the strings the fields hold. The job number rides along
 * read-only - editing never changes it.
 */
export function bookingToFormValues(booking: BookingDetail): Record<string, unknown> {
  const stopToForm = (stop: BookingStopRow, kind: "pickup" | "delivery") => ({
    id: stop.id,
    clientJobNumber: fromValue(stop.clientJobNumber),
    trailer: fromValue(stop.trailer),
    [`${kind}Time`]: fromValue(stop.scheduledAt),
    [`${kind}Company`]: fromValue(stop.company),
    suite: fromValue(stop.suite),
    street1: fromValue(stop.street1),
    suburb: fromValue(stop.suburb),
    state: fromValue(stop.state),
    postCode: fromValue(stop.postCode),
    country: fromValue(stop.country) || "Australia",
    instructions: fromValue(stop.instructions),
  });

  const priceToForm = (price: BookingPriceRow) => ({
    id: price.id,
    grossAmount: fromValue(price.grossAmount),
    grossAmount2: "",
    fuelLevyPct: fromValue(price.fuelLevyPct),
    fuelLevyAmount: fromValue(price.fuelLevyAmount),
    splitChargePct: fromValue(price.splitChargePct),
    splitChargeAmount: fromValue(price.splitChargeAmount),
    otherChargesPct: fromValue(price.otherChargesPct),
    otherChargesAmount: fromValue(price.otherChargesAmount),
    gstPct: fromValue(price.gstPct),
    gstAmount: fromValue(price.gstAmount),
    netAmount: fromValue(price.netAmount),
    totalAmount: fromValue(price.totalAmount),
  });

  const pickups = booking.stops
    .filter((stop) => stop.type === "PICKUP")
    .sort((a, b) => a.position - b.position)
    .map((stop) => stopToForm(stop, "pickup"));
  const deliveries = booking.stops
    .filter((stop) => stop.type === "DELIVERY")
    .sort((a, b) => a.position - b.position)
    .map((stop) => stopToForm(stop, "delivery"));
  const prices = [...booking.prices].sort((a, b) => a.position - b.position).map(priceToForm);

  return {
    jobNumber: fromValue(booking.jobNumber),
    bookingReceivedDate: fromValue(booking.bookingReceivedDate),
    financialYear: fromValue(booking.financialYear),
    customerId: fromValue(booking.customerId),
    customer: fromValue(booking.customerName),
    customerAccountNumber: fromValue(booking.customerAccountNumber),
    accountStatus: fromValue(booking.accountStatus),
    agreementType: fromValue(booking.agreementType),
    reference: fromValue(booking.reference),
    invoiceTerm: fromValue(booking.invoiceTerm),
    cargoType: fromValue(booking.cargoType),
    vehicleType: fromValue(booking.vehicleType),
    trailerCategory: fromValue(booking.trailerCategory),
    pickups,
    deliveries,
    prices,
    priceFinalAmount: fromValue(booking.priceFinalAmount),
    vendor: {
      vendorId: fromValue(booking.vendorId),
      vendorName: fromValue(booking.vendorName),
    },
    vendorPrice: {
      grossAmount: fromValue(booking.vendorGrossAmount),
      grossAmount2: fromValue(booking.vendorGrossAmount2),
      fuelLevyPct: fromValue(booking.vendorFuelLevyPct),
      fuelLevyAmount: fromValue(booking.vendorFuelLevyAmount),
      splitChargePct: "",
      splitChargeAmount: "",
      otherChargesPct: "",
      otherChargesAmount: "",
      gstPct: fromValue(booking.vendorGstPct),
      gstAmount: fromValue(booking.vendorGstAmount),
      netAmount: fromValue(booking.vendorNetAmount),
      totalAmount: fromValue(booking.vendorTotalAmount),
    },
  };
}

export const bookingService = {
  create(payload: CreateBookingPayload): Promise<BookingCreated> {
    return request<BookingCreated>({ url: "/admin/bookings", method: "POST", data: payload });
  },

  /** Saves edits to an existing booking. The job number is unchanged by this. */
  update(id: string, payload: CreateBookingPayload): Promise<BookingCreated> {
    return request<BookingCreated>({
      url: `/admin/bookings/${encodeURIComponent(id)}`,
      method: "PUT",
      data: payload,
    });
  },

  /** The bookings raised in the Admin portal, newest first, paged and searchable. */
  list(query: BookingListQuery): Promise<BookingListResult> {
    return request<BookingListResult>({
      url: "/admin/bookings",
      method: "GET",
      params: {
        search: query.search,
        page: query.page,
        pageSize: query.pageSize,
        sortBy: query.sortBy,
        sortDir: query.sortDir,
      },
    });
  },

  /** Removes a booking. A soft delete server-side; it drops out of the list. */
  remove(id: string): Promise<null> {
    return request<null>({ url: `/admin/bookings/${encodeURIComponent(id)}`, method: "DELETE" });
  },

  /** One booking with its stops, prices and lanes, addressed by id. */
  get(id: string): Promise<BookingDetail> {
    return request<BookingDetail>({
      url: `/admin/bookings/${encodeURIComponent(id)}`,
      method: "GET",
    });
  },

  /**
   * Takes the next job number and holds it for this admin, so the form can show
   * the number it is going to be given and no second admin is offered it.
   */
  reserveJobNumber(input: {
    pickupTime?: string;
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
