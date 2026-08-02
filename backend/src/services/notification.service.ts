import { prisma } from '../config/prisma';

/**
 * Expiry notifications.
 *
 * A driver's compliance documents each carry an expiry date. Anything already
 * past, or falling due inside the warning window, has to reach both the driver
 * (so they can renew it) and the admin (so they can chase it). Both audiences ask
 * the same question of the same rows, so it is answered in one place: the driver
 * scoped to themselves, the admin across the whole fleet.
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
  | 'MEDICAL';

export interface ExpiryNotification {
  /** Stable across reads, so the UI can key and dismiss on it. */
  id: string;
  driverId: string;
  driverName: string;
  driverEmail: string;
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

/** The five section tables that carry an expiry date. */
const SECTION_DELEGATES: Array<{
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

/**
 * Everything expired or expiring within the warning window.
 *
 * @param driverId scope to one driver, or leave undefined for the whole fleet.
 */
export async function getExpiryNotifications(driverId?: string): Promise<NotificationFeed> {
  const today = startOfToday();
  const cutoff = new Date(today.getTime() + EXPIRY_WARNING_DAYS * 86_400_000);

  const perSection = await Promise.all(
    SECTION_DELEGATES.map(async ({ section, find }) => {
      const rows = await find({
        expiryDate: { lte: cutoff },
        ...(driverId ? { driverId } : {}),
      });
      return rows.map((row) => ({ section, ...row }));
    }),
  );

  const rows = perSection.flat().filter((row) => row.expiryDate !== null);
  if (rows.length === 0) {
    return { items: [], expired: 0, expiring: 0, total: 0, warningDays: EXPIRY_WARNING_DAYS };
  }

  // One lookup for the names, rather than joining the driver onto five queries.
  // Soft deleted accounts are left out: nobody needs chasing about those.
  const drivers = await prisma.driver.findMany({
    where: { id: { in: [...new Set(rows.map((row) => row.driverId))] }, deletedAt: null },
    select: { id: true, firstName: true, lastName: true, email: true },
  });
  const byId = new Map(drivers.map((driver) => [driver.id, driver]));

  const items: ExpiryNotification[] = [];

  for (const row of rows) {
    const driver = byId.get(row.driverId);
    if (!driver || !row.expiryDate) continue;

    const daysLeft = wholeDaysBetween(today, row.expiryDate);

    items.push({
      id: `${row.driverId}:${row.section}`,
      driverId: row.driverId,
      driverName:
        [driver.firstName, driver.lastName].filter(Boolean).join(' ') || driver.email,
      driverEmail: driver.email,
      section: row.section,
      label: SECTION_LABEL[row.section],
      expiryDate: dateOnly(row.expiryDate),
      daysLeft,
      severity: daysLeft < 0 ? 'EXPIRED' : 'EXPIRING',
    });
  }

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
