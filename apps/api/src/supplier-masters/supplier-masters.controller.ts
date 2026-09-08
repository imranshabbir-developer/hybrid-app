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
import { UpdateSupplierMasterDto } from './dto/update-supplier-master.dto';
import { SupplierMastersService } from './supplier-masters.service';

@Controller('supplier-masters')
@UseGuards(JwtAuthGuard)
export class SupplierMastersController {
  constructor(private readonly masters: SupplierMastersService) {}

  @Get()
  list(@Req() req: { user: AuthRequestUser }, @Query('q') q?: string) {
    return this.masters.list(req.user, q);
  }

  @Post('sync-missing')
  syncMissing(@Req() req: { user: AuthRequestUser }) {
    return this.masters.syncAllMissing(req.user);
  }

  @Post('from-entry/:entryId')
  fromEntry(
    @Req() req: { user: AuthRequestUser },
    @Param('entryId') entryId: string,
  ) {
    return this.masters.syncFromEntry(req.user, entryId);
  }

  @Get(':id')
  getOne(@Req() req: { user: AuthRequestUser }, @Param('id') id: string) {
    return this.masters.getOne(req.user, id);
  }

  @Put(':id')
  update(
    @Req() req: { user: AuthRequestUser },
    @Param('id') id: string,
    @Body() dto: UpdateSupplierMasterDto,
  ) {
    return this.masters.update(req.user, id, dto);
  }

  @Delete(':id')
  remove(@Req() req: { user: AuthRequestUser }, @Param('id') id: string) {
    return this.masters.remove(req.user, id);
  }
}
