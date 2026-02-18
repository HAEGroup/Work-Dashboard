import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create default admin user
  const passwordHash = await bcrypt.hash('admin123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
    },
  });

  console.log('Created admin user:', admin.email);

  // Create a default entity
  const entity = await prisma.entity.upsert({
    where: { id: 'default-entity' },
    update: {},
    create: {
      id: 'default-entity',
      name: 'Main Business',
      description: 'Default business entity',
    },
  });

  console.log('Created entity:', entity.name);

  // Create default chart of accounts
  const defaultAccounts = [
    // Assets
    { code: '1000', name: 'Cash', type: 'ASSET' as const },
    { code: '1010', name: 'Operating Bank Account', type: 'ASSET' as const },
    { code: '1020', name: 'Trust Bank Account', type: 'ASSET' as const },
    { code: '1100', name: 'Accounts Receivable', type: 'ASSET' as const },
    { code: '1200', name: 'Security Deposits Held', type: 'ASSET' as const },
    { code: '1500', name: 'Property & Equipment', type: 'ASSET' as const },

    // Liabilities
    { code: '2000', name: 'Accounts Payable', type: 'LIABILITY' as const },
    { code: '2100', name: 'Security Deposits Liability', type: 'LIABILITY' as const },
    { code: '2200', name: 'Tenant Prepayments', type: 'LIABILITY' as const },
    { code: '2500', name: 'Mortgage Payable', type: 'LIABILITY' as const },

    // Equity
    { code: '3000', name: 'Owner Equity', type: 'EQUITY' as const },
    { code: '3100', name: 'Retained Earnings', type: 'EQUITY' as const },

    // Revenue
    { code: '4000', name: 'Rental Income', type: 'REVENUE' as const },
    { code: '4100', name: 'Late Fee Income', type: 'REVENUE' as const },
    { code: '4200', name: 'Management Fee Income', type: 'REVENUE' as const },
    { code: '4300', name: 'Other Income', type: 'REVENUE' as const },

    // Expenses
    { code: '5000', name: 'Maintenance & Repairs', type: 'EXPENSE' as const },
    { code: '5100', name: 'Property Insurance', type: 'EXPENSE' as const },
    { code: '5200', name: 'Property Tax', type: 'EXPENSE' as const },
    { code: '5300', name: 'Utilities', type: 'EXPENSE' as const },
    { code: '5400', name: 'Management Fees', type: 'EXPENSE' as const },
    { code: '5500', name: 'Mortgage Interest', type: 'EXPENSE' as const },
    { code: '5600', name: 'Professional Services', type: 'EXPENSE' as const },
    { code: '5700', name: 'Office & Administrative', type: 'EXPENSE' as const },
    { code: '5800', name: 'Marketing & Advertising', type: 'EXPENSE' as const },
  ];

  for (const account of defaultAccounts) {
    await prisma.account.upsert({
      where: { entityId_code: { entityId: entity.id, code: account.code } },
      update: {},
      create: {
        entityId: entity.id,
        ...account,
      },
    });
  }

  console.log(`Created ${defaultAccounts.length} default accounts`);

  // Create a default project
  await prisma.project.upsert({
    where: { id: 'default-project' },
    update: {},
    create: {
      id: 'default-project',
      name: 'General',
      description: 'Default project for general tasks',
      color: '#3b82f6',
    },
  });

  console.log('Created default project');
  console.log('Seed completed successfully');
}

main()
  .catch(e => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
