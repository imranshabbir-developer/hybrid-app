import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard, AuthRequestUser } from '../auth/jwt-auth.guard';
import { ReportsService, ReportFilters } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('catalog')
  catalog() {
    return this.service.catalog();
  }

  @Get('summary')
  summary(@Req() req: { user: AuthRequestUser }) {
    return this.service.summary(req.user);
  }

  @Get('filter-options')
  filterOptions(@Req() req: { user: AuthRequestUser }) {
    return this.service.filterOptions(req.user);
  }

  @Get('run/:id')
  run(
    @Req() req: { user: AuthRequestUser },
    @Param('id') id: string,
    @Query() query: ReportFilters,
  ) {
    return this.service.run(req.user, id, query);
  }

  @Get('export/:id')
  async export(
    @Req() req: { user: AuthRequestUser },
    @Param('id') id: string,
    @Query() query: ReportFilters & { format?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { format, ...filters } = query;
    const result = await this.service.export(
      req.user,
      id,
      (format || 'csv').toLowerCase(),
      filters,
    );
    res.setHeader('Content-Type', result.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    return result.file;
  }
}
