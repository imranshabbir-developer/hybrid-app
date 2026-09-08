import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthRequestUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpsertSupplierEntryDto } from './dto/upsert-supplier-entry.dto';
import { SupplierEntriesService } from './supplier-entries.service';

@Controller('supplier-entries')
@UseGuards(JwtAuthGuard)
export class SupplierEntriesController {
  constructor(private readonly supplierEntries: SupplierEntriesService) {}

  @Get()
  list(@Req() req: { user: AuthRequestUser }) {
    return this.supplierEntries.list(req.user);
  }

  @Get('prefill/:purchaseOrderId')
  prefill(
    @Req() req: { user: AuthRequestUser },
    @Param('purchaseOrderId') purchaseOrderId: string,
    @Query('lineNo') lineNo?: string,
  ) {
    const parsed = lineNo ? Number(lineNo) : undefined;
    return this.supplierEntries.prefill(
      req.user,
      purchaseOrderId,
      Number.isFinite(parsed) ? parsed : undefined,
    );
  }

  @Get(':id')
  getOne(@Req() req: { user: AuthRequestUser }, @Param('id') id: string) {
    return this.supplierEntries.getOne(req.user, id);
  }

  @Post()
  create(
    @Req() req: { user: AuthRequestUser },
    @Body() dto: UpsertSupplierEntryDto,
  ) {
    return this.supplierEntries.create(req.user, dto);
  }

  @Put(':id')
  update(
    @Req() req: { user: AuthRequestUser },
    @Param('id') id: string,
    @Body() dto: UpsertSupplierEntryDto,
  ) {
    return this.supplierEntries.update(req.user, id, dto);
  }

  @Delete(':id')
  remove(@Req() req: { user: AuthRequestUser }, @Param('id') id: string) {
    return this.supplierEntries.remove(req.user, id);
  }
}
