import {
  ForbiddenException,
  Injectable,
  StreamableFile,
} from '@nestjs/common';
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { AuthRequestUser } from '../auth/jwt-auth.guard';

// CommonJS helper shared with bootstrap
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resolveSqlitePath } = require('../db-path') as {
  resolveSqlitePath: () => string;
};

@Injectable()
export class SystemService {
  info() {
    const sqlitePath = resolveSqlitePath();
    return {
      dbEngine: process.env.DB_ENGINE || 'sqlite',
      sqlitePath,
      sqliteExists: existsSync(sqlitePath),
      sqliteBytes: existsSync(sqlitePath) ? statSync(sqlitePath).size : 0,
      apiPort: Number(process.env.API_PORT || 3001),
    };
  }

  private assertAdmin(user: AuthRequestUser) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('Only administrators can manage backups');
    }
  }

  async backupSqlite(user: AuthRequestUser) {
    this.assertAdmin(user);
    const sqlitePath = resolveSqlitePath();
    if (!existsSync(sqlitePath)) {
      throw new ForbiddenException('SQLite database file not found');
    }
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `erp-backup-${stamp}.sqlite`;
    const buf = readFileSync(sqlitePath);
    return {
      file: new StreamableFile(buf),
      filename,
      contentType: 'application/octet-stream',
    };
  }

  copyBackupBesideDb(user: AuthRequestUser) {
    this.assertAdmin(user);
    const sqlitePath = resolveSqlitePath();
    if (!existsSync(sqlitePath)) {
      throw new ForbiddenException('SQLite database file not found');
    }
    const dir = join(sqlitePath, '..', 'backups');
    mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dest = join(dir, `erp-backup-${stamp}.sqlite`);
    copyFileSync(sqlitePath, dest);
    return { ok: true, path: dest };
  }
}
