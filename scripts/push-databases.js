/**
 * Pushes schema to SQLite (desktop) and PostgreSQL (online/future) when available.
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const apiDir = path.resolve(__dirname, '../apps/api');
const rootEnv = path.resolve(__dirname, '../.env');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const i = trimmed.indexOf('=');
    if (i < 0) continue;
    const key = trimmed.slice(0, i).trim();
    const val = trimmed.slice(i + 1).trim();
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadEnvFile(rootEnv);
loadEnvFile(path.join(apiDir, '.env'));

const dataDir = path.resolve(__dirname, '../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const sqliteFile = path.join(dataDir, 'erp.sqlite').replace(/\\/g, '/');
process.env.DATABASE_URL = `file:${sqliteFile}`;

console.log('→ Pushing SQLite schema...');
execSync('npx prisma db push --schema prisma/schema.prisma', {
  cwd: apiDir,
  stdio: 'inherit',
  env: process.env,
});

const pgUrl =
  process.env.DATABASE_URL_POSTGRES ||
  `postgresql://${process.env.POSTGRES_USER || 'postgres'}:${process.env.POSTGRES_PASSWORD || 'ipsdb'}@${process.env.POSTGRES_HOST || '127.0.0.1'}:${process.env.POSTGRES_PORT || '5432'}/${process.env.POSTGRES_DB || 'erp_db'}?schema=public`;

process.env.DATABASE_URL_POSTGRES = pgUrl;

try {
  console.log('→ Pushing PostgreSQL schema...');
  execSync('npx prisma db push --schema prisma/schema.postgres.prisma', {
    cwd: apiDir,
    stdio: 'inherit',
    env: process.env,
  });
  console.log('✓ Both SQLite and PostgreSQL schemas are up to date.');
} catch (err) {
  console.warn('⚠ PostgreSQL push skipped/failed (SQLite is ready for desktop).');
  console.warn(String(err && err.message ? err.message : err));
}
