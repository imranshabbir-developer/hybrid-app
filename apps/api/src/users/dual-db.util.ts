import { Role } from '@prisma/client';
import { existsSync } from 'fs';
import { join } from 'path';

type MirrorUser = {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  phone: string;
  jobTitle: string;
  role: Role;
  isActive: boolean;
  company: { code: string } | null;
};

type PgClient = {
  company: {
    findUnique: (args: {
      where: { code: string };
    }) => Promise<{ id: string } | null>;
  };
  user: {
    findUnique: (args: {
      where: { id?: string; email?: string };
    }) => Promise<{ id: string; email: string } | null>;
    upsert: (args: unknown) => Promise<unknown>;
    update: (args: unknown) => Promise<unknown>;
    delete: (args: unknown) => Promise<unknown>;
  };
  $disconnect: () => Promise<void>;
};

let cached: PgClient | null | undefined;

function pgUrl() {
  return (
    process.env.DATABASE_URL_POSTGRES ||
    `postgresql://${process.env.POSTGRES_USER || 'postgres'}:${process.env.POSTGRES_PASSWORD || 'ipsdb'}@${process.env.POSTGRES_HOST || '127.0.0.1'}:${process.env.POSTGRES_PORT || '5432'}/${process.env.POSTGRES_DB || 'erp_db'}?schema=public`
  );
}

function resolvePostgresClientPath() {
  const candidates = [
    join(process.cwd(), 'node_modules', '.prisma', 'postgres-client'),
    join(process.cwd(), '..', '..', 'node_modules', '.prisma', 'postgres-client'),
    join(__dirname, '..', '..', '..', '..', 'node_modules', '.prisma', 'postgres-client'),
    join(__dirname, '..', '..', '..', '..', '..', 'node_modules', '.prisma', 'postgres-client'),
  ];
  return candidates.find((p) => existsSync(join(p, 'index.js')) || existsSync(p)) || null;
}

export async function getPostgresMirror(): Promise<PgClient | null> {
  if (cached !== undefined) return cached;
  try {
    const clientPath = resolvePostgresClientPath();
    if (!clientPath) {
      cached = null;
      return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require(clientPath) as {
      PrismaClient: new (args: { datasources: { db: { url: string } } }) => PgClient;
    };
    cached = new mod.PrismaClient({
      datasources: { db: { url: pgUrl() } },
    });
    return cached;
  } catch {
    cached = null;
    return null;
  }
}

export async function mirrorUpsertUser(user: MirrorUser) {
  const pg = await getPostgresMirror();
  if (!pg) return { mirrored: false };

  let companyId: string | null = null;
  if (user.company?.code) {
    const company = await pg.company.findUnique({
      where: { code: user.company.code },
    });
    companyId = company?.id ?? null;
  }

  const existingById = await pg.user.findUnique({ where: { id: user.id } });
  const existingByEmail = await pg.user.findUnique({
    where: { email: user.email },
  });

  const data = {
    email: user.email,
    passwordHash: user.passwordHash,
    fullName: user.fullName,
    phone: user.phone,
    jobTitle: user.jobTitle,
    role: user.role,
    companyId,
    isActive: user.isActive,
  };

  if (existingById) {
    await pg.user.update({ where: { id: user.id }, data });
  } else if (existingByEmail) {
    await pg.user.update({ where: { id: existingByEmail.id }, data });
  } else {
    await pg.user.upsert({
      where: { email: user.email },
      create: { id: user.id, ...data },
      update: data,
    });
  }

  return { mirrored: true };
}

export async function mirrorDeleteUser(email: string, id: string) {
  const pg = await getPostgresMirror();
  if (!pg) return { mirrored: false };
  try {
    const byId = await pg.user.findUnique({ where: { id } });
    if (byId) {
      await pg.user.delete({ where: { id } });
      return { mirrored: true };
    }
    const byEmail = await pg.user.findUnique({ where: { email } });
    if (byEmail) {
      await pg.user.delete({ where: { id: byEmail.id } });
      return { mirrored: true };
    }
  } catch {
    // FK constraints — leave Postgres row; primary DB already handled
  }
  return { mirrored: false };
}
