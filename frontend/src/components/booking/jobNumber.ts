/**
 * Job numbers for the Create Booking form, and nothing else.
 *
 * A job number reads BIVRY-<financial year>-<sequence>, e.g. BIVRY-2627-5000.
 * The sequence starts at 5000 and counts up, one per booking, kept per financial
 * year so each year begins again at 5000.
 *
 * There is no booking API yet, so the running count lives in the browser's own
 * storage. Creating a booking consumes the current number; the next form then
 * shows the one after it. This is deliberately local to the booking form - it is
 * not a shared utility and is used nowhere else.
 */

const STORAGE_KEY = "bivry.booking.jobSequence";
const SEQUENCE_START = 5000;

type SequenceStore = Record<string, number>;

function readStore(): SequenceStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SequenceStore) : {};
  } catch {
    return {};
  }
}

function writeStore(store: SequenceStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Storage can be full or blocked; the number simply will not persist.
  }
}

/** "26-27" -> "2627". Anything without four digits is not a usable year yet. */
function yearDigits(financialYear: string): string {
  return financialYear.replace(/\D/g, "");
}

/**
 * Today's Australian financial year, as "26-27".
 *
 * Used so a job number can show at once, before a booking date is picked. The
 * year runs 1 July to 30 June, so July onwards belongs to the year it starts.
 */
export function currentFinancialYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const startYear = month >= 7 ? year : year - 1;
  const two = (value: number) => String(value % 100).padStart(2, "0");
  return `${two(startYear)}-${two(startYear + 1)}`;
}

/** The number this financial year is up to, without consuming it. */
function peekSequence(financialYear: string): number {
  const digits = yearDigits(financialYear);
  if (digits.length < 4) return SEQUENCE_START;
  return readStore()[digits] ?? SEQUENCE_START;
}

/** The job number to show for a booking in the given financial year, or "". */
export function formatJobNumber(financialYear: string): string {
  const digits = yearDigits(financialYear);
  if (digits.length < 4) return "";
  return `BIVRY-${digits}-${peekSequence(financialYear)}`;
}

/** Marks the current number as used, so the next booking moves on to the next one. */
export function consumeJobNumber(financialYear: string): void {
  const digits = yearDigits(financialYear);
  if (digits.length < 4) return;
  const store = readStore();
  store[digits] = (store[digits] ?? SEQUENCE_START) + 1;
  writeStore(store);
}
