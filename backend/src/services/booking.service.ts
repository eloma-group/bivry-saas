import { prisma } from '../config/prisma';
import { ApiError } from '../utils/apiError';
import type { CreateBookingInput } from '../validators/booking.validator';

/**
 * Bookings raised in the Admin portal.
 *
 * A booking owns its pickups and deliveries (booking_stops, split by type) and
 * its lanes (booking_lanes); both prices are columns on the booking itself. The
 * customer and vendor are held by id and by a name snapshot, with no relation,
 * so those account tables are untouched by this feature.
 */

const BOOKING_INCLUDE = {
  stops: { orderBy: [{ type: 'asc' }, { position: 'asc' }] },
  lanes: { orderBy: { position: 'asc' } },
} satisfies import('@prisma/client').Prisma.BookingInclude;

export interface BookingListQuery {
  search?: string;
  page: number;
  pageSize: number;
  sortBy: 'createdAt' | 'jobNumber' | 'bookingReceivedDate';
  sortDir: 'asc' | 'desc';
}

export async function createBooking(input: CreateBookingInput, adminId: string) {
  const pickups = input.pickups.map((stop, index) => ({
    ...stop,
    type: 'PICKUP' as const,
    position: index,
  }));
  const deliveries = input.deliveries.map((stop, index) => ({
    ...stop,
    type: 'DELIVERY' as const,
    position: index,
  }));
  const lanes = input.lanes.map((lane, index) => ({ ...lane, position: index }));

  const price = input.price ?? {};
  const vendorPrice = input.vendorPrice ?? {};
  const vendor = input.vendor ?? {};

  return prisma.booking.create({
    data: {
      jobNumber: input.jobNumber,
      bookingReceivedDate: input.bookingReceivedDate,
      financialYear: input.financialYear,
      customerId: input.customerId,
      customerName: input.customerName,
      customerAccountNumber: input.customerAccountNumber,
      accountStatus: input.accountStatus,
      agreementType: input.agreementType,
      reference: input.reference,
      cargoType: input.cargoType,
      vehicleType: input.vehicleType,
      trailerCategory: input.trailerCategory,

      priceGrossAmount: price.grossAmount ?? null,
      priceFuelLevyPct: price.fuelLevyPct ?? null,
      priceFuelLevyAmount: price.fuelLevyAmount ?? null,
      priceGstPct: price.gstPct ?? null,
      priceGstAmount: price.gstAmount ?? null,
      priceNetAmount: price.netAmount ?? null,
      priceTotalAmount: price.totalAmount ?? null,

      vendorId: vendor.vendorId ?? null,
      vendorName: vendor.vendorName ?? null,
      vendorGrossAmount: vendorPrice.grossAmount ?? null,
      vendorFuelLevyPct: vendorPrice.fuelLevyPct ?? null,
      vendorFuelLevyAmount: vendorPrice.fuelLevyAmount ?? null,
      vendorGstPct: vendorPrice.gstPct ?? null,
      vendorGstAmount: vendorPrice.gstAmount ?? null,
      vendorNetAmount: vendorPrice.netAmount ?? null,
      vendorTotalAmount: vendorPrice.totalAmount ?? null,

      createdByAdminId: adminId,
      stops: { create: [...pickups, ...deliveries] },
      lanes: { create: lanes },
    },
    include: BOOKING_INCLUDE,
  });
}

export async function listBookings(query: BookingListQuery) {
  const where: Record<string, unknown> = { deletedAt: null };
  if (query.search) {
    const contains = { contains: query.search, mode: 'insensitive' };
    where.OR = [
      { jobNumber: contains },
      { customerName: contains },
      { customerAccountNumber: contains },
      { reference: contains },
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.booking.count({ where }),
    prisma.booking.findMany({
      where,
      orderBy: { [query.sortBy]: query.sortDir },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: BOOKING_INCLUDE,
    }),
  ]);

  return {
    rows,
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

export async function getBooking(id: string) {
  const booking = await prisma.booking.findFirst({
    where: { id, deletedAt: null },
    include: BOOKING_INCLUDE,
  });
  if (!booking) throw ApiError.notFound('Booking not found');
  return booking;
}
