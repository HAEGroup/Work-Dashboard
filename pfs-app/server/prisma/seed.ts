import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 12);

  const user = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash,
      name: 'Admin',
    },
  });

  console.log('Created user:', user.email);

  // Create a sample statement
  const today = new Date();
  const statement = await prisma.statement.upsert({
    where: { id: 'sample-statement' },
    update: {},
    create: {
      id: 'sample-statement',
      userId: user.id,
      name: 'Personal Financial Statement',
      asOfDate: today,
      fullName: 'Admin User',
    },
  });

  console.log('Created sample statement:', statement.name);
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
