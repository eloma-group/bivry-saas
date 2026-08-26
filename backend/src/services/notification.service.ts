import { prisma } from '../config/prisma';

/**
 * Expiry notifications.
 *
 * A driver's compliance documents and a vendor's policies each carry an expiry
 * date. Anything already past, or falling due inside the warning window, has to
 * reach both the account it belongs to (so they can renew it) and the admin (so
 * they can chase it). Every audience asks the same question of the same rows, so
 * it is answered in one place: an account scoped to itself, an admin across the
 * whole fleet.
 *
 * Nothing is stored. The list is derived from the dates on every read, which
 * means it can never drift out of date the way a notifications table would.
 */

export const EXPIRY_WARNING_DAYS = 7;

export type NotificationSection =
  | 'LICENCE'
  | 'DRIVING_HISTORY'
  | 'POLICE_VERIFICATION'
  | 'VISA'
  | 'MEDICAL'
  | 'ACCREDITATION_MASS_MANAGEMENT'
  | 'ACCREDITATION_BASIC_FATIGUE'
  | 'ACCREDITATION_DANGEROUS_GOODS'
  | 'ACCREDITATION_NHVAS'
  | 'ACCREDITATION_HACCP'
  | 'INSURANCE'
  | 'COMPLIANCE_DOCUMENT';

export interface ExpiryNotification {
  /** Stable across reads, so the UI can key and dismiss on it. */
  id: string;
  /** Which portal the record belongs to, so a link can be built for it. */
  subjectType: 'driver' | 'vendor';
  /** The driver or vendor the expiring record belongs to. */
  subjectId: string;
  subjectName: string;
  subjectEmail: string;
  section: NotificationSection;
  label: string;
  /** yyyy-MM-dd. The column is a date, so there is no time to carry. */
  expiryDate: string;
  /** Negative once it has lapsed. */
  daysLeft: number;
  severity: 'EXPIRED' | 'EXPIRING';
}

export interface NotificationFeed {
  items: ExpiryNotification[];
  expired: number;
  expiring: number;
  total: number;
  warningDays: number;
}

const SECTION_LABEL: Record<NotificationSection, string> = {
  LICENCE: 'Driving licence',
  DRIVING_HISTORY: 'Driving history',
  POLICE_VERIFICATION: 'Police verification',
  VISA: 'Visa',
  MEDICAL: 'Medical certificate',
  ACCREDITATION_MASS_MANAGEMENT: 'Mass management accreditation',
  ACCREDITATION_BASIC_FATIGUE: 'Basic fatigue management accreditation',
  ACCREDITATION_DANGEROUS_GOODS: 'Dangerous goods accreditation',
  ACCREDITATION_NHVAS: 'NHVAS accreditation',
  ACCREDITATION_HACCP: 'HACCP accreditation',
  INSURANCE: 'Insurance policy',
  COMPLIANCE_DOCUMENT: 'Compliance document',
};

/** Midnight UTC today, to match how a `@db.Date` column comes back. */
function startOfToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function dateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function wholeDaysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

/** A row that has been found to expire, before its owner's name is attached. */
interface ExpiringRow {
  ownerId: string;
  section: NotificationSection;
  expiryDate: Date | null;
  /** Overrides the section label, so one policy can name itself. */
  label?: string;
  /** Distinguishes several rows of the same section on one account. */
  key?: string;
}

/** The five driver tables that carry an expiry date. */
const DRIVER_SECTIONS: Array<{
  section: NotificationSection;
  find: (where: {
    expiryDate: { lte: Date };
    driverId?: string;
  }) => Promise<Array<{ driverId: string; expiryDate: Date | null }>>;
}> = [
  {
    section: 'LICENCE',
    find: (where) =>
      prisma.driverLicence.findMany({ where, select: { driverId: true, expiryDate: true } }),
  },
  {
    section: 'DRIVING_HISTORY',
    find: (where) =>
      prisma.driverDrivingHistory.findMany({ where, select: { driverId: true, expiryDate: true } }),
  },
  {
    section: 'POLICE_VERIFICATION',
    find: (where) =>
      prisma.driverPoliceVerification.findMany({
        where,
        select: { driverId: true, expiryDate: true },
      }),
  },
  {
    section: 'VISA',
    find: (where) =>
      prisma.driverVisa.findMany({ where, select: { driverId: true, expiryDate: true } }),
  },
  {
    section: 'MEDICAL',
    find: (where) =>
      prisma.driverMedical.findMany({ where, select: { driverId: true, expiryDate: true } }),
  },
];

/** The five accreditation columns, each with its own expiry date. */
const ACCREDITATION_COLUMNS = [
  { column: 'massManagementExpiry', section: 'ACCREDITATION_MASS_MANAGEMENT' },
  { column: 'basicFatigueExpiry', section: 'ACCREDITATION_BASIC_FATIGUE' },
  { column: 'dangerousGoodsExpiry', section: 'ACCREDITATION_DANGEROUS_GOODS' },
  { column: 'nhvasExpiry', section: 'ACCREDITATION_NHVAS' },
  { column: 'haccpExpiry', section: 'ACCREDITATION_HACCP' },
] as const;

const INSURANCE_LABEL: Record<string, string> = {
  PRODUCT_LIABILITY: 'Product liability insurance',
  PUBLIC_LIABILITY: 'Public liability insurance',
  WORK_COVER: 'Work cover',
  MARINE_GENERAL: 'Marine (general & refrigerated) insurance',
  MARINE_ALCOHOL: 'Marine (alcohol) insurance',
  COC: 'COC insurance',
};

async function findDriverRows(cutoff: Date, driverId?: string): Promise<ExpiringRow[]> {
  const perSection = await Promise.all(
    DRIVER_SECTIONS.map(async ({ section, find }) => {
      const rows = await find({
        expiryDate: { lte: cutoff },
        ...(driverId ? { driverId } : {}),
      });
      return rows.map((row) => ({
        ownerId: row.driverId,
        section,
        expiryDate: row.expiryDate,
      }));
    }),
  );

  return perSection.flat();
}

async function findVendorRows(cutoff: Date, vendorId?: string): Promise<ExpiringRow[]> {
  const scope = vendorId ? { vendorId } : {};

  const [accreditations, insurances, documents] = await Promise.all([
    prisma.vendorAccreditation.findMany({
      where: {
        ...scope,
        // One query for all five columns, filtered per column below.
        OR: ACCREDITATION_COLUMNS.map((entry) => ({ [entry.column]: { lte: cutoff } })),
      },
    }),
    prisma.vendorInsurance.findMany({
      where: {
        ...scope,
        // Work cover expires on its validity window, the rest on expiryDate.
        OR: [{ expiryDate: { lte: cutoff } }, { validTill: { lte: cutoff } }],
      },
    }),
    prisma.vendorDocument.findMany({
      where: { ...scope, deletedAt: null, expiryDate: { lte: cutoff } },
      select: { id: true, vendorId: true, docType: true, category: true, expiryDate: true },
    }),
  ]);

  const rows: ExpiringRow[] = [];

  for (const accreditation of accreditations) {
    for (const entry of ACCREDITATION_COLUMNS) {
      const expiryDate = accreditation[entry.column];
      if (!expiryDate || expiryDate.getTime() > cutoff.getTime()) continue;
      rows.push({ ownerId: accreditation.vendorId, section: entry.section, expiryDate });
    }
  }

  for (const insurance of insurances) {
    const expiryDate =
      insurance.type === 'WORK_COVER' ? insurance.validTill : insurance.expiryDate;
    if (!expiryDate || expiryDate.getTime() > cutoff.getTime()) continue;
    rows.push({
      ownerId: insurance.vendorId,
      section: 'INSURANCE',
      expiryDate,
      label: INSURANCE_LABEL[insurance.type] ?? SECTION_LABEL.INSURANCE,
      key: insurance.type,
    });
  }

  for (const document of documents) {
    rows.push({
      ownerId: document.vendorId,
      section: 'COMPLIANCE_DOCUMENT',
      expiryDate: document.expiryDate,
      label: document.category ?? SECTION_LABEL.COMPLIANCE_DOCUMENT,
      key: document.id,
    });
  }

  return rows;
}

/** Turns raw rows into the feed, once the owners' names are known. */
function buildFeed(
  rows: ExpiringRow[],
  subjectType: 'driver' | 'vendor',
  owners: Map<string, { name: string; email: string }>,
  today: Date,
): ExpiryNotification[] {
  const items: ExpiryNotification[] = [];

  for (const row of rows) {
    const owner = owners.get(row.ownerId);
    if (!owner || !row.expiryDate) continue;

    items.push({
      id: `${row.ownerId}:${row.section}${row.key ? `:${row.key}` : ''}`,
      subjectType,
      subjectId: row.ownerId,
      subjectName: owner.name,
      subjectEmail: owner.email,
      section: row.section,
      label: row.label ?? SECTION_LABEL[row.section],
      expiryDate: dateOnly(row.expiryDate),
      daysLeft: wholeDaysBetween(today, row.expiryDate),
      severity: wholeDaysBetween(today, row.expiryDate) < 0 ? 'EXPIRED' : 'EXPIRING',
    });
  }

  return items;
}

function toFeed(items: ExpiryNotification[]): NotificationFeed {
  // Most urgent first: the longest expired at the top, then the soonest due.
  items.sort((a, b) => a.daysLeft - b.daysLeft);

  return {
    items,
    expired: items.filter((item) => item.severity === 'EXPIRED').length,
    expiring: items.filter((item) => item.severity === 'EXPIRING').length,
    total: items.length,
    warningDays: EXPIRY_WARNING_DAYS,
  };
}

function cutoffFrom(today: Date): Date {
  return new Date(today.getTime() + EXPIRY_WARNING_DAYS * 86_400_000);
}

/**
 * Driver documents expired or expiring within the warning window.
 *
 * @param driverId scope to one driver, or leave undefined for every driver.
 */
export async function getExpiryNotifications(driverId?: string): Promise<NotificationFeed> {
  const today = startOfToday();
  const rows = (await findDriverRows(cutoffFrom(today), driverId)).filter(
    (row) => row.expiryDate !== null,
  );
  if (rows.length === 0) return toFeed([]);

  // One lookup for the names, rather than joining the driver onto five queries.
  // Soft deleted accounts are left out: nobody needs chasing about those.
  const drivers = await prisma.driver.findMany({
    where: { id: { in: [...new Set(rows.map((row) => row.ownerId))] }, deletedAt: null },
    select: { id: true, firstName: true, lastName: true, email: true },
  });

  const owners = new Map(
    drivers.map((driver) => [
      driver.id,
      {
        name: [driver.firstName, driver.lastName].filter(Boolean).join(' ') || driver.email,
        email: driver.email,
      },
    ]),
  );

  return toFeed(buildFeed(rows, 'driver', owners, today));
}

/**
 * Vendor accreditations, policies and compliance documents expired or
 * expiring within the warning window.
 *
 * @param vendorId scope to one vendor, or leave undefined for every vendor.
 */
export async function getVendorExpiryNotifications(vendorId?: string): Promise<NotificationFeed> {
  const today = startOfToday();
  const rows = (await findVendorRows(cutoffFrom(today), vendorId)).filter(
    (row) => row.expiryDate !== null,
  );
  if (rows.length === 0) return toFeed([]);

  const vendors = await prisma.vendor.findMany({
    where: { id: { in: [...new Set(rows.map((row) => row.ownerId))] }, deletedAt: null },
    select: { id: true, companyName: true, email: true },
  });

  const owners = new Map(
    vendors.map((vendor) => [
      vendor.id,
      { name: vendor.companyName || vendor.email, email: vendor.email },
    ]),
  );

  return toFeed(buildFeed(rows, 'vendor', owners, today));
}

/** Everything across the fleet, drivers and vendors together. Admin only. */
export async function getAllExpiryNotifications(): Promise<NotificationFeed> {
  const [drivers, vendors] = await Promise.all([
    getExpiryNotifications(),
    getVendorExpiryNotifications(),
  ]);

  return toFeed([...drivers.items, ...vendors.items]);
}
