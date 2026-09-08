const fs = require('fs');
const path = require('path');

/**
 * Find repo root (folder that contains apps/ and data/).
 * Works from src/, dist/, or packaged layouts.
 */
function findRepoRoot(startDir) {
  let current = path.resolve(startDir);
  for (let i = 0; i < 8; i += 1) {
    const marker = path.join(current, 'apps', 'api');
    const dataDir = path.join(current, 'data');
    if (fs.existsSync(marker) && fs.existsSync(path.join(current, 'package.json'))) {
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  // Fallback: assume we are under apps/api/**
  return path.resolve(startDir, '../../..');
}

/**
 * Resolves where the SQLite file should live.
 * - Dev: <repo>/data/erp.sqlite
 * - Packaged desktop later: %APPDATA%/NexusERP/erp.sqlite (via ERP_DATA_DIR)
 */
function resolveSqlitePath() {
  if (process.env.ERP_DATA_DIR) {
    return path.join(process.env.ERP_DATA_DIR, 'erp.sqlite');
  }

  const root = findRepoRoot(__dirname);
  return path.join(root, 'data', 'erp.sqlite');
}

function ensureDataDir(sqliteFilePath) {
  const dir = path.dirname(sqliteFilePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function toPrismaSqliteUrl(sqliteFilePath) {
  const normalized = sqliteFilePath.replace(/\\/g, '/');
  return `file:${normalized}`;
}

module.exports = {
  resolveSqlitePath,
  ensureDataDir,
  toPrismaSqliteUrl,
};
