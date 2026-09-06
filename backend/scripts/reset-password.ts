/**
 * Resets a password for any account (admin, customer, vendor, employee, driver).
 *
 *   npx tsx scripts/reset-password.ts --email someone@example.com --password 'NewPass123'
 *
 * Finds the email across every portal that has a password and updates the hash.
 */
import { prisma } from '../src/config/prisma';
import { hashPassword } from '../src/services/auth/password.service';

interface Args {
  email?: string;
  password?: string;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    email: process.env.RESET_EMAIL,
    password: process.env.RESET_PASSWORD,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if ((arg === '--email' || arg === '-e') && argv[index + 1]) {
      args.email = argv[index + 1];
      index += 1;
    } else if ((arg === '--password' || arg === '-p') && argv[index + 1]) {
      args.password = argv[index + 1];
      index += 1;
    }
  }
  return args;
}

const PASSWORD_RULES = [
  { label: 'at least 8 characters', test: (v: string) => v.length >= 8 },
  { label: 'a lowercase letter', test: (v: string) => /[a-z]/.test(v) },
  { label: 'an uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
  { label: 'a number', test: (v: string) => /[0-9]/.test(v) },
];

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const email = args.email?.trim().toLowerCase();
  const password = args.password;

  if (!email) {
    console.error('\n--email is required.');
    process.exit(1);
  }
  if (!password) {
    console.error('\n--password is required.');
    process.exit(1);
  }

  const failed = PASSWORD_RULES.filter((rule) => !rule.test(password));
  if (failed.length > 0) {
    console.error(`\nThat password is too weak. It needs ${failed.map((r) => r.label).join(', ')}.`);
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);

  const portals = [
    { name: 'admin', model: prisma.admin },
    { name: 'customer', model: prisma.customer },
    { name: 'vendor', model: prisma.vendor },
    { name: 'employee', model: prisma.employee },
    { name: 'driver', model: prisma.driver },
  ] as const;

  const hits: string[] = [];
  for (const portal of portals) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const found = await (portal.model as any).findUnique({ where: { email } });
    if (found) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (portal.model as any).update({
        where: { email },
        data: {
          passwordHash,
          ...(('failedLoginAttempts' in found) ? { failedLoginAttempts: 0 } : {}),
          ...(('lockedUntil' in found) ? { lockedUntil: null } : {}),
        },
      });
      hits.push(portal.name);
    }
  }

  if (hits.length === 0) {
    console.error(`\nNo account found for ${email} in any portal.`);
    process.exit(1);
  }

  console.log(`\nPassword updated for ${email}`);
  console.log(`  portal(s): ${hits.join(', ')}`);
}

void main()
  .catch((error) => {
    console.error('\nCould not reset the password:', error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
