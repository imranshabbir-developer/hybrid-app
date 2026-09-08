import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('admin@123', 10);

  const company1 = await prisma.company.upsert({
    where: { code: 'COMPANY1' },
    update: { name: 'Company One', isActive: true },
    create: { code: 'COMPANY1', name: 'Company One' },
  });

  const company2 = await prisma.company.upsert({
    where: { code: 'COMPANY2' },
    update: { name: 'Company Two', isActive: true },
    create: { code: 'COMPANY2', name: 'Company Two' },
  });

  await prisma.user.upsert({
    where: { email: 'admin@erp.com' },
    update: {
      passwordHash,
      fullName: 'System Administrator',
      role: Role.ADMIN,
      companyId: null,
      isActive: true,
    },
    create: {
      email: 'admin@erp.com',
      passwordHash,
      fullName: 'System Administrator',
      role: Role.ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { email: 'imran@erp.com' },
    update: {
      passwordHash,
      fullName: 'Imran (Company One)',
      role: Role.COMPANY,
      companyId: company1.id,
      isActive: true,
    },
    create: {
      email: 'imran@erp.com',
      passwordHash,
      fullName: 'Imran (Company One)',
      role: Role.COMPANY,
      companyId: company1.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'imranshabbir@erp.com' },
    update: {
      passwordHash,
      fullName: 'Imran Shabbir (Company Two)',
      role: Role.COMPANY,
      companyId: company2.id,
      isActive: true,
    },
    create: {
      email: 'imranshabbir@erp.com',
      passwordHash,
      fullName: 'Imran Shabbir (Company Two)',
      role: Role.COMPANY,
      companyId: company2.id,
    },
  });

  console.log('Seed complete: admin + company1 + company2 users');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
