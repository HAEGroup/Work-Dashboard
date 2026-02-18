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

  // Create default CRM boards
  const existingBoards = await prisma.crmBoard.count();
  if (existingBoards === 0) {
    // Sales Pipeline board
    await prisma.crmBoard.create({
      data: {
        id: 'crm-sales-pipeline',
        name: 'Sales Pipeline',
        color: '#22c55e',
        icon: 'target',
        position: 0,
        columns: {
          create: [
            {
              name: 'Status', type: 'STATUS', position: 0,
              config: {
                options: [
                  { label: 'New Lead', color: '#6b7280' },
                  { label: 'Contacted', color: '#3b82f6' },
                  { label: 'Qualified', color: '#f59e0b' },
                  { label: 'Proposal Sent', color: '#8b5cf6' },
                  { label: 'Won', color: '#22c55e' },
                  { label: 'Lost', color: '#ef4444' },
                ],
              },
            },
            { name: 'Contact', type: 'PERSON', position: 1 },
            { name: 'Email', type: 'EMAIL', position: 2 },
            { name: 'Phone', type: 'PHONE', position: 3 },
            { name: 'Value', type: 'NUMBER', position: 4 },
            { name: 'Close Date', type: 'DATE', position: 5 },
            {
              name: 'Priority', type: 'STATUS', position: 6,
              config: {
                options: [
                  { label: 'Low', color: '#6b7280' },
                  { label: 'Medium', color: '#f59e0b' },
                  { label: 'High', color: '#ef4444' },
                ],
              },
            },
          ],
        },
        groups: {
          create: [
            { name: 'Active Leads', color: '#3b82f6', position: 0 },
            { name: 'In Negotiation', color: '#f59e0b', position: 1 },
            { name: 'Closed', color: '#22c55e', position: 2 },
          ],
        },
      },
    });

    // Contacts board
    await prisma.crmBoard.create({
      data: {
        id: 'crm-contacts',
        name: 'Contacts',
        color: '#3b82f6',
        icon: 'users',
        position: 1,
        columns: {
          create: [
            { name: 'Company', type: 'TEXT', position: 0 },
            { name: 'Email', type: 'EMAIL', position: 1 },
            { name: 'Phone', type: 'PHONE', position: 2 },
            {
              name: 'Type', type: 'STATUS', position: 3,
              config: {
                options: [
                  { label: 'Owner', color: '#3b82f6' },
                  { label: 'Tenant', color: '#22c55e' },
                  { label: 'Vendor', color: '#f59e0b' },
                  { label: 'Prospect', color: '#8b5cf6' },
                ],
              },
            },
            { name: 'Last Contact', type: 'DATE', position: 4 },
            { name: 'Rating', type: 'RATING', position: 5 },
            { name: 'Notes', type: 'TEXT', position: 6 },
          ],
        },
        groups: {
          create: [
            { name: 'Property Owners', color: '#3b82f6', position: 0 },
            { name: 'Tenants', color: '#22c55e', position: 1 },
            { name: 'Vendors & Contractors', color: '#f59e0b', position: 2 },
          ],
        },
      },
    });

    // Deals board
    await prisma.crmBoard.create({
      data: {
        id: 'crm-deals',
        name: 'Deals',
        color: '#8b5cf6',
        icon: 'handshake',
        position: 2,
        columns: {
          create: [
            {
              name: 'Stage', type: 'STATUS', position: 0,
              config: {
                options: [
                  { label: 'Discovery', color: '#6b7280' },
                  { label: 'Proposal', color: '#3b82f6' },
                  { label: 'Negotiation', color: '#f59e0b' },
                  { label: 'Contract', color: '#8b5cf6' },
                  { label: 'Closed Won', color: '#22c55e' },
                  { label: 'Closed Lost', color: '#ef4444' },
                ],
              },
            },
            { name: 'Contact', type: 'PERSON', position: 1 },
            { name: 'Property', type: 'TEXT', position: 2 },
            { name: 'Value', type: 'NUMBER', position: 3, width: 120 },
            { name: 'Monthly Rent', type: 'NUMBER', position: 4, width: 120 },
            { name: 'Expected Close', type: 'DATE', position: 5 },
            { name: 'Signed', type: 'CHECKBOX', position: 6, width: 80 },
          ],
        },
        groups: {
          create: [
            { name: 'New Listings', color: '#3b82f6', position: 0 },
            { name: 'Active Negotiations', color: '#f59e0b', position: 1 },
            { name: 'Pending Signature', color: '#8b5cf6', position: 2 },
          ],
        },
      },
    });

    console.log('Created default CRM boards');
  }

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
