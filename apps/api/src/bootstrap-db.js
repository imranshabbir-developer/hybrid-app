/**
 * Ensures DATABASE_URL points at the desktop SQLite file before Nest boots.
 * Safe to require at the top of main.ts.
 */
const {
  resolveSqlitePath,
  ensureDataDir,
  toPrismaSqliteUrl,
} = require('./db-path');

const engine = (process.env.DB_ENGINE || 'sqlite').toLowerCase();

if (engine === 'sqlite') {
  const sqlitePath = resolveSqlitePath();
  ensureDataDir(sqlitePath);
  process.env.DATABASE_URL = toPrismaSqliteUrl(sqlitePath);
  console.log(`[db] SQLite ready at ${sqlitePath}`);
}
