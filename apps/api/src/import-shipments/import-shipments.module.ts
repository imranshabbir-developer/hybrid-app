import { Module } from '@nestjs/common';
import { ImportShipmentsController } from './import-shipments.controller';
import { ImportShipmentsService } from './import-shipments.service';

@Module({
  controllers: [ImportShipmentsController],
  providers: [ImportShipmentsService],
  exports: [ImportShipmentsService],
})
export class ImportShipmentsModule {}
