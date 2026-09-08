import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthRequestUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpsertPurchaseOrderDto } from './dto/upsert-purchase-order.dto';
import { PurchaseOrdersService } from './purchase-orders.service';

@Controller('purchase-orders')
@UseGuards(JwtAuthGuard)
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrders: PurchaseOrdersService) {}

  @Get()
  list(@Req() req: { user: AuthRequestUser }) {
    return this.purchaseOrders.list(req.user);
  }

  @Get(':id/pdf')
  async pdf(
    @Req() req: { user: AuthRequestUser },
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.purchaseOrders.printPdf(req.user, id);
    res.setHeader('Content-Type', result.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    return result.file;
  }

  @Get(':id')
  getOne(@Req() req: { user: AuthRequestUser }, @Param('id') id: string) {
    return this.purchaseOrders.getOne(req.user, id);
  }

  @Post()
  create(
    @Req() req: { user: AuthRequestUser },
    @Body() dto: UpsertPurchaseOrderDto,
  ) {
    return this.purchaseOrders.create(req.user, dto);
  }

  @Put(':id')
  update(
    @Req() req: { user: AuthRequestUser },
    @Param('id') id: string,
    @Body() dto: UpsertPurchaseOrderDto,
  ) {
    return this.purchaseOrders.update(req.user, id, dto);
  }

  @Delete(':id')
  remove(@Req() req: { user: AuthRequestUser }, @Param('id') id: string) {
    return this.purchaseOrders.remove(req.user, id);
  }
}
