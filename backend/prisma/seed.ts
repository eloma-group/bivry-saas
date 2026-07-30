/**
 * Development seed - one ready to use account per login portal.
 * Run with: npm run db:seed
 *
 * Safe to run repeatedly: every account is upserted by email.
 */
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = process.env.SEED_PASSWORD ?? 'Bivry@123';

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);
  const now = new Date();

  const admin = await prisma.admin.upsert({
    where: { email: 'admin@bivry.com' },
    update: {},
    create: {
      email: 'admin@bivry.com',
      passwordHash,
      firstName: 'BIVRY',
      lastName: 'Admin',
      isSuperAdmin: true,
      status: 'ACTIVE',
      emailVerifiedAt: now,
    },
  });

  const customer = await prisma.customer.upsert({
    where: { email: 'customer@bivry.com' },
    update: {},
    create: {
      email: 'customer@bivry.com',
      passwordHash,
      firstName: 'Sample',
      lastName: 'Customer',
      companyName: 'Sample Logistics Pty Ltd',
      status: 'ACTIVE',
      emailVerifiedAt: now,
    },
  });

  const vendor = await prisma.vendor.upsert({
    where: { email: 'vendor@bivry.com' },
    update: {},
    create: {
      email: 'vendor@bivry.com',
      passwordHash,
      companyName: 'Sample Vendor Services',
      contactPerson: 'Sample Contact',
      status: 'ACTIVE',
      emailVerifiedAt: now,
    },
  });

  const employee = await prisma.employee.upsert({
    where: { email: 'employee@bivry.com' },
    update: {},
    create: {
      email: 'employee@bivry.com',
      passwordHash,
      firstName: 'Sample',
      lastName: 'Employee',
      employeeCode: 'EMP-0001',
      department: 'Operations',
      designation: 'Fleet Coordinator',
      status: 'ACTIVE',
      emailVerifiedAt: now,
    },
  });

  const driver = await prisma.driver.upsert({
    where: { email: 'driver@bivry.com' },
    update: {},
    create: {
      email: 'driver@bivry.com',
      passwordHash,
      firstName: 'Sample',
      lastName: 'Driver',
      status: 'ACTIVE',
      emailVerifiedAt: now,
      onboardingStatus: 'NOT_STARTED',
    },
  });

  console.log('Seed complete. Password for every account:', DEFAULT_PASSWORD);
  console.table([
    { portal: '/admin/login', email: admin.email, id: admin.id },
    { portal: '/customer/login', email: customer.email, id: customer.id },
    { portal: '/vendor/login', email: vendor.email, id: vendor.id },
    { portal: '/employee/login', email: employee.email, id: employee.id },
    { portal: '/driver/login', email: driver.email, id: driver.id },
  ]);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
