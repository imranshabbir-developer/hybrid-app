import { Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard, AuthRequestUser } from '../auth/jwt-auth.guard';
import { SystemService } from './system.service';

@Controller('system')
@UseGuards(JwtAuthGuard)
export class SystemController {
  constructor(private readonly service: SystemService) {}

  @Get('backup')
  async backup(
    @Req() req: { user: AuthRequestUser },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.service.backupSqlite(req.user);
    res.setHeader('Content-Type', result.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    return result.file;
  }

  @Post('backup/copy')
  copyBackup(@Req() req: { user: AuthRequestUser }) {
    return this.service.copyBackupBesideDb(req.user);
  }

  @Get('info')
  info() {
    return this.service.info();
  }
}
