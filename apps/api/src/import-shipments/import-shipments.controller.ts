import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ImportStatus } from '@prisma/client';
import { JwtAuthGuard, AuthRequestUser } from '../auth/jwt-auth.guard';
import { ImportShipmentsService } from './import-shipments.service';
import { UpdateImportShipmentDto } from './dto/update-import-shipment.dto';

@Controller('import-shipments')
@UseGuards(JwtAuthGuard)
export class ImportShipmentsController {
  constructor(private readonly service: ImportShipmentsService) {}

  @Get()
  list(
    @Req() req: { user: AuthRequestUser },
    @Query('status') status?: string,
  ) {
    const st =
      status?.toUpperCase() === 'CLOSED' ? ImportStatus.CLOSED : ImportStatus.OPEN;
    return this.service.list(req.user, st);
  }

  @Get('masters-available')
  mastersAvailable(@Req() req: { user: AuthRequestUser }) {
    return this.service.mastersAvailable(req.user);
  }

  @Get(':id')
  getOne(@Req() req: { user: AuthRequestUser }, @Param('id') id: string) {
    return this.service.getOne(req.user, id);
  }

  @Post('from-master/:masterId')
  fromMaster(
    @Req() req: { user: AuthRequestUser },
    @Param('masterId') masterId: string,
  ) {
    return this.service.fromMaster(req.user, masterId);
  }

  @Patch(':id')
  update(
    @Req() req: { user: AuthRequestUser },
    @Param('id') id: string,
    @Body() dto: UpdateImportShipmentDto,
  ) {
    return this.service.update(req.user, id, dto);
  }

  @Post(':id/close')
  close(@Req() req: { user: AuthRequestUser }, @Param('id') id: string) {
    return this.service.close(req.user, id);
  }

  @Delete(':id')
  remove(@Req() req: { user: AuthRequestUser }, @Param('id') id: string) {
    return this.service.remove(req.user, id);
  }
}
