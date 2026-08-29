/**
 * Reports the 1970-01-01 dates left behind by the blank-date save bug.
 *
 * An empty optional date sent as null was coerced by `new Date(null)` into the
 * Unix epoch, so blank document dates were stored as 1970-01-01 and read as a
 * certificate that lapsed fifty years ago. The save path was fixed in the
 * validators and the stored values are cleared by the
 * 20260829000000_clear_epoch_dates migration.
 *
 * This is how to check either of those actually did what it says: run it before
 * a deploy to see what is waiting, and after one to confirm nothing is left.
 *
 *   npm run check:dates --prefix backend
 *
 * It only ever reads. Nothing here writes to the database.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** The day a blank date was coerced into. */
const EPOCH = '1970-01-01';

interface DateColumn {
  table_name: string;
  column_name: string;
}

/**
 * Every DATE column in the schema, read from the database itself rather than
 * from a list kept here, so a column added later is covered without this script
 * being remembered and updated.
 */
async function dateColumns(): Promise<DateColumn[]> {
  return prisma.$queryRaw<DateColumn[]>`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND data_type = 'date'
    ORDER BY table_name, column_name
  `;
}

/** How many rows hold the epoch in one column. */
async function epochCount(table: string, column: string): Promise<number> {
  const rows = await prisma.$queryRawUnsafe<Array<{ n: bigint }>>(
    `SELECT COUNT(*)::bigint AS n FROM "${table}" WHERE "${column}" = DATE '${EPOCH}'`,
  );
  return Number(rows[0]?.n ?? 0);
}

async function main(): Promise<void> {
  const columns = await dateColumns();

  // Dates of birth are reported on their own. A driver really can have been
  // born on 1 January 1970, so those are never cleared automatically and the
  // rows are named here to be checked against the driver's own paperwork.
  const documents = columns.filter(
    (c) => !(c.table_name === 'drivers' && c.column_name === 'date_of_birth'),
  );

  let total = 0;
  const hits: string[] = [];

  for (const column of documents) {
    const found = await epochCount(column.table_name, column.column_name);
    if (found > 0) {
      hits.push(`  ${String(found).padStart(5)}  ${column.table_name}.${column.column_name}`);
      total += found;
    }
  }

  console.log(`Scanned ${documents.length} document date columns.`);
  if (hits.length === 0) {
    console.log('  none holding the epoch. Nothing to clear.');
  } else {
    console.log(hits.join('\n'));
    console.log(`  ${String(total).padStart(5)}  total`);
  }

  const births = await prisma.$queryRaw<
    Array<{ id: string; first_name: string | null; last_name: string | null; email: string | null }>
  >`
    SELECT id, first_name, last_name, email
    FROM drivers
    WHERE date_of_birth = DATE '1970-01-01'
    ORDER BY created_at
  `;

  console.log(`\nDrivers holding ${EPOCH} as a date of birth: ${births.length}`);
  for (const driver of births) {
    const name = [driver.first_name, driver.last_name].filter(Boolean).join(' ') || '(no name)';
    console.log(`  ${name}  ${driver.email ?? '(no email)'}  ${driver.id}`);
  }
  if (births.length > 0) {
    console.log('  Check these against the driver\'s own paperwork before changing them.');
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
