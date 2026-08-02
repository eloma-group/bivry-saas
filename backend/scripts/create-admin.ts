/**
 * Creates (or updates) an admin account from the command line.
 *
 *   npx tsx scripts/create-admin.ts --email you@company.com --password 'Str0ngPass' --name "Your Name" --super
 *
 * Call it through tsx, not through `npm run`: npm on Windows parses `--email`
 * and friends as its own config options and forwards only the bare values, so
 * the flags never arrive. `npm run create:admin` is kept for the env var form
 * below, which npm cannot swallow.
 *
 *   $env:ADMIN_EMAIL='you@company.com'; $env:ADMIN_PASSWORD='Str0ngPass'; npm run create:admin
 *
 * This is the safe way to make the first admin: it needs a shell on the machine
 * that holds DATABASE_URL, so ALLOW_ADMIN_SIGNUP can stay false and
 * /admin/register can stay closed to the public internet.
 *
 * Re-running it for an email that already exists updates the name and the super
 * admin flag, and only touches the password when a new one is passed.
 */
import { prisma } from '../src/config/prisma';
import { hashPassword } from '../src/services/auth/password.service';

interface Args {
  email?: string;
  password?: string;
  name?: string;
  super?: boolean;
  help?: boolean;
}

function parseArgs(argv: string[]): Args {
  // Environment variables come first so they survive npm eating the flags, and
  // any flag that does arrive overrides them.
  const args: Args = {
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
    name: process.env.ADMIN_NAME,
    super: process.env.ADMIN_SUPER === 'true' || undefined,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => argv[index + 1];

    switch (arg) {
      case '--email':
      case '-e':
        args.email = next();
        index += 1;
        break;
      case '--password':
      case '-p':
        args.password = next();
        index += 1;
        break;
      case '--name':
      case '-n':
        args.name = next();
        index += 1;
        break;
      case '--super':
        args.super = true;
        break;
      case '--help':
      case '-h':
        args.help = true;
        break;
      default:
        // Also accept KEY=value, which is easier to quote on Windows.
        if (arg.startsWith('--') && arg.includes('=')) {
          const [key, ...rest] = arg.slice(2).split('=');
          const value = rest.join('=');
          if (key === 'email') args.email = value;
          if (key === 'password') args.password = value;
          if (key === 'name') args.name = value;
        }
        break;
    }
  }

  return args;
}

const PASSWORD_RULES = [
  { label: 'at least 8 characters', test: (value: string) => value.length >= 8 },
  { label: 'a lowercase letter', test: (value: string) => /[a-z]/.test(value) },
  { label: 'an uppercase letter', test: (value: string) => /[A-Z]/.test(value) },
  { label: 'a number', test: (value: string) => /[0-9]/.test(value) },
];

function usage(): void {
  console.log(`
Create an admin account

  npx tsx scripts/create-admin.ts --email you@company.com --password 'Str0ngPass' --name "Your Name" --super

Options
  -e, --email      Email to sign in with. Required.
  -p, --password   Password. Required for a new account, optional when updating.
  -n, --name       Full name, e.g. "Ritesh Gita". Defaults to "BIVRY Admin".
      --super      Make this a super admin.
  -h, --help       Show this.

Or set ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME and ADMIN_SUPER instead of flags.

Do not run this through "npm run create:admin --": npm on Windows treats --email
and --password as its own options and forwards only the values, so the flags are
lost. Use npx tsx as above, or the environment variables.

The password is read from the argument, so it lands in your shell history. Either
clear it afterwards or change it from inside the app once you are signed in.
`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    usage();
    return;
  }

  const email = args.email?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error('\nA valid --email is required.');
    usage();
    process.exit(1);
  }

  const existing = await prisma.admin.findUnique({ where: { email } });

  if (!existing && !args.password) {
    console.error(`\nNo admin exists for ${email}, so --password is required to create one.`);
    process.exit(1);
  }

  if (args.password) {
    const failed = PASSWORD_RULES.filter((rule) => !rule.test(args.password!));
    if (failed.length > 0) {
      console.error(
        `\nThat password is too weak. It needs ${failed.map((rule) => rule.label).join(', ')}.`,
      );
      process.exit(1);
    }
  }

  const [firstName, ...lastNameParts] = (args.name ?? 'BIVRY Admin').trim().split(/\s+/);
  const lastName = lastNameParts.join(' ') || null;

  const passwordHash = args.password ? await hashPassword(args.password) : undefined;

  const admin = await prisma.admin.upsert({
    where: { email },
    update: {
      firstName,
      lastName,
      ...(args.super ? { isSuperAdmin: true } : {}),
      ...(passwordHash ? { passwordHash } : {}),
      // An account that was deactivated or soft deleted comes back usable.
      status: 'ACTIVE',
      deletedAt: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
    create: {
      email,
      passwordHash: passwordHash!,
      firstName,
      lastName,
      isSuperAdmin: args.super ?? false,
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
    select: { id: true, email: true, firstName: true, lastName: true, isSuperAdmin: true },
  });

  console.log(`\n${existing ? 'Updated' : 'Created'} admin account`);
  console.log(`  email : ${admin.email}`);
  console.log(`  name  : ${[admin.firstName, admin.lastName].filter(Boolean).join(' ')}`);
  console.log(`  super : ${admin.isSuperAdmin ? 'yes' : 'no'}`);
  console.log(`\nSign in at /admin/login\n`);
}

void main()
  .catch((error) => {
    console.error('\nCould not create the admin account:', error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
