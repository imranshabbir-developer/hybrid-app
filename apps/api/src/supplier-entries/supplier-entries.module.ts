import { Module, forwardRef } from '@nestjs/common';
import { SupplierEntriesController } from './supplier-entries.controller';
import { SupplierEntriesService } from './supplier-entries.service';
import { SupplierMastersModule } from '../supplier-masters/supplier-masters.module';

@Module({
  imports: [forwardRef(() => SupplierMastersModule)],
  controllers: [SupplierEntriesController],
  providers: [SupplierEntriesService],
  exports: [SupplierEntriesService],
})
export class SupplierEntriesModule {}
