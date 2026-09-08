import { Module, forwardRef } from '@nestjs/common';
import { SupplierMastersController } from './supplier-masters.controller';
import { SupplierMastersService } from './supplier-masters.service';
import { SupplierEntriesModule } from '../supplier-entries/supplier-entries.module';

@Module({
  imports: [forwardRef(() => SupplierEntriesModule)],
  controllers: [SupplierMastersController],
  providers: [SupplierMastersService],
  exports: [SupplierMastersService],
})
export class SupplierMastersModule {}
