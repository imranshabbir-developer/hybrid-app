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
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard, AuthRequestUser } from '../auth/jwt-auth.guard';
import { LookupsService } from './lookups.service';

class UpsertLookupDto {
  @IsString() type!: string;
  @IsOptional() @IsString() code?: string;
  @IsString() label!: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

@Controller('lookups')
@UseGuards(JwtAuthGuard)
export class LookupsController {
  constructor(private readonly service: LookupsService) {}

  @Get('types')
  types() {
    return this.service.types();
  }

  @Get()
  list(
    @Req() req: { user: AuthRequestUser },
    @Query('type') type?: string,
  ) {
    return this.service.list(req.user, type);
  }

  @Post()
  create(@Req() req: { user: AuthRequestUser }, @Body() dto: UpsertLookupDto) {
    return this.service.create(req.user, dto);
  }

  @Put(':id')
  update(
    @Req() req: { user: AuthRequestUser },
    @Param('id') id: string,
    @Body() dto: UpsertLookupDto,
  ) {
    return this.service.update(req.user, id, dto);
  }

  @Delete(':id')
  remove(@Req() req: { user: AuthRequestUser }, @Param('id') id: string) {
    return this.service.remove(req.user, id);
  }

  @Post('seed-defaults')
  seed(@Req() req: { user: AuthRequestUser }) {
    return this.service.seedDefaults(req.user);
  }
}
