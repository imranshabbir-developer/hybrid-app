import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module';
import { SupplierEntriesModule } from './supplier-entries/supplier-entries.module';
import { SupplierMastersModule } from './supplier-masters/supplier-masters.module';
import { ImportShipmentsModule } from './import-shipments/import-shipments.module';
import { HistoriesModule } from './histories/histories.module';
import { ReportsModule } from './reports/reports.module';
import { LookupsModule } from './lookups/lookups.module';
import { SystemModule } from './system/system.module';
import { UsersModule } from './users/users.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        join(__dirname, '../../../.env'),
        join(__dirname, '../../.env'),
        '.env',
      ],
    }),
    PrismaModule,
    AuthModule,
    PurchaseOrdersModule,
    SupplierEntriesModule,
    SupplierMastersModule,
    ImportShipmentsModule,
    HistoriesModule,
    ReportsModule,
    LookupsModule,
    SystemModule,
    UsersModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
