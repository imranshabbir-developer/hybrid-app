import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard, AuthRequestUser } from '../auth/jwt-auth.guard';
import { HistoriesService } from './histories.service';

@Controller('histories')
@UseGuards(JwtAuthGuard)
export class HistoriesController {
  constructor(private readonly service: HistoriesService) {}

  @Get('purchase')
  purchase(
    @Req() req: { user: AuthRequestUser },
    @Query('q') q?: string,
    @Query('supplier') supplier?: string,
    @Query('category') category?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.purchaseHistory(req.user, { q, supplier, category, from, to });
  }

  @Get('payment')
  payment(
    @Req() req: { user: AuthRequestUser },
    @Query('q') q?: string,
    @Query('supplier') supplier?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.paymentHistory(req.user, { q, supplier, from, to });
  }

  @Get('operational')
  operational(
    @Req() req: { user: AuthRequestUser },
    @Query('q') q?: string,
    @Query('supplier') supplier?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.operationalHistory(req.user, { q, supplier, from, to });
  }
}
