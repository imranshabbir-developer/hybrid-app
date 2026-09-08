const { PrismaClient: SqliteClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const dataDir = path.resolve(__dirname, '../../../data');
const sqliteFile = path.join(dataDir, 'erp.sqlite');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

async function seedUsers(prisma, label) {
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
      role: 'ADMIN',
      companyId: null,
      isActive: true,
    },
    create: {
      email: 'admin@erp.com',
      passwordHash,
      fullName: 'System Administrator',
      role: 'ADMIN',
    },
  });

  await prisma.user.upsert({
    where: { email: 'imran@erp.com' },
    update: {
      passwordHash,
      fullName: 'Imran (Company One)',
      role: 'COMPANY',
      companyId: company1.id,
      isActive: true,
    },
    create: {
      email: 'imran@erp.com',
      passwordHash,
      fullName: 'Imran (Company One)',
      role: 'COMPANY',
      companyId: company1.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'imranshabbir@erp.com' },
    update: {
      passwordHash,
      fullName: 'Imran Shabbir (Company Two)',
      role: 'COMPANY',
      companyId: company2.id,
      isActive: true,
    },
    create: {
      email: 'imranshabbir@erp.com',
      passwordHash,
      fullName: 'Imran Shabbir (Company Two)',
      role: 'COMPANY',
      companyId: company2.id,
    },
  });

  console.log(`Seed users complete (${label})`);
}

const LOOKUP_DEFAULTS = {
  DIVISION: ['Garments', 'Processing', 'Accessories', 'Home Textile'],
  MERCHANDISER: ['Demo Merch', 'Import Desk'],
  SUPPLIER_CATEGORY: ['Manufacturer', 'Trader', 'Customer Source'],
  PRODUCT_CATEGORY: [
    'Fabrics',
    'Accessories',
    'Machinery and spares',
    'Dyes and chemicals',
  ],
  PAYMENT_TERM: ['LC', 'ADV', 'O/A', 'DA', 'DP'],
  MODE_OF_SHIPMENT: ['SEA', 'AIR', 'COURIER'],
  INCOTERM: ['FOB', 'CNF', 'CIF', 'EXW'],
  PORT: ['Busan', 'Yokohama', 'Shanghai', 'Karachi', 'Port Qasim'],
  BANK: ['HBL', 'MCB', 'UBL', 'Standard Chartered'],
  FORWARDER: ['Demo Forwarder'],
  CLEARING_AGENT: ['Demo CA'],
  CLEARANCE_MODE: ['EOU', 'SEXP', 'Commercial'],
  TOLERANCE: ['5%', '7%', '10%'],
  CURRENCY: ['USD', 'EUR', 'PKR'],
  CERT_STATUS: ['YES', 'NO', 'UNDER_PROCESS'],
};

async function seedLookups(prisma, label) {
  if (!prisma.lookup) {
    console.warn(`Lookup model missing (${label}); skip lookup seed`);
    return;
  }
  let created = 0;
  for (const [type, labels] of Object.entries(LOOKUP_DEFAULTS)) {
    let i = 0;
    for (const value of labels) {
      const existing = await prisma.lookup.findFirst({
        where: { type, label: value, companyId: null },
      });
      if (existing) continue;
      await prisma.lookup.create({
        data: {
          type,
          label: value,
          code: value,
          sortOrder: i++,
          companyId: null,
          isActive: true,
        },
      });
      created += 1;
    }
  }
  console.log(`Seed lookups complete (${label}): +${created}`);
}

async function main() {
  process.env.DB_ENGINE = 'sqlite';
  process.env.DATABASE_URL = `file:${sqliteFile.replace(/\\/g, '/')}`;
  const sqlite = new SqliteClient();

  let postgres = null;
  try {
    const { PrismaClient: PostgresClient } = require('../../../node_modules/.prisma/postgres-client');
    const pgUrl =
      process.env.DATABASE_URL_POSTGRES ||
      `postgresql://${process.env.POSTGRES_USER || 'postgres'}:${process.env.POSTGRES_PASSWORD || 'ipsdb'}@${process.env.POSTGRES_HOST || '127.0.0.1'}:${process.env.POSTGRES_PORT || '5432'}/${process.env.POSTGRES_DB || 'erp_db'}?schema=public`;
    postgres = new PostgresClient({ datasources: { db: { url: pgUrl } } });
  } catch (e) {
    console.warn('PostgreSQL client unavailable; seeding SQLite only.', e.message);
  }

  try {
    await seedUsers(sqlite, `SQLite ${sqliteFile}`);
    await seedLookups(sqlite, `SQLite ${sqliteFile}`);
    if (postgres) {
      await seedUsers(postgres, 'PostgreSQL erp_db');
      await seedLookups(postgres, 'PostgreSQL erp_db');
    }
  } finally {
    await sqlite.$disconnect();
    if (postgres) await postgres.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
