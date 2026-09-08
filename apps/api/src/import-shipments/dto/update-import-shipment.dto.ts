import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateImportShipmentDto {
  @IsOptional() @IsString() division?: string;
  @IsOptional() @IsString() merchandiser?: string;
  @IsOptional() @IsString() monthLabel?: string;
  @IsOptional() @IsString() ppcDemandNo?: string;
  @IsOptional() @IsDateString() ppcDemandDate?: string | null;
  @IsOptional() @IsDateString() purchaseOrderDate?: string | null;
  @IsOptional() @IsString() purchaseOrderNo?: string;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) poQuantity?: number;
  @IsOptional() @IsString() shipperName?: string;
  @IsOptional() @IsString() productDescription?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) quantityShipped?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) unitValue?: number;

  @IsOptional() @IsString() bank?: string;
  @IsOptional() @IsString() paymentTerm?: string;
  @IsOptional() @IsString() modeOfShipment?: string;
  @IsOptional() @IsString() incoterm?: string;

  @IsOptional() @Type(() => Number) @IsInt() supplierDeliveryTime?: number | null;
  @IsOptional() @Type(() => Number) @IsInt() standardLeadTime?: number;

  @IsOptional() @IsDateString() ppSampleReadyDate?: string | null;
  @IsOptional() @IsDateString() actualShipmentReadyDate?: string | null;
  @IsOptional() @IsDateString() onBoardDate?: string | null;
  @IsOptional() @IsDateString() etaAtPort?: string | null;
  @IsOptional() @IsString() blAwbNo?: string;
  @IsOptional() @IsDateString() blDate?: string | null;
  @IsOptional() @IsString() pol?: string;
  @IsOptional() @IsString() destinationPort?: string;
  @IsOptional() @IsString() modeOfClearance?: string;
  @IsOptional() @IsString() eouLimitUtilized?: string;

  @IsOptional() @IsDateString() revision1?: string | null;
  @IsOptional() @IsDateString() revision2?: string | null;
  @IsOptional() @IsDateString() revision3?: string | null;

  @IsOptional() @IsString() forwarder?: string;
  @IsOptional() @IsString() clearingAgent?: string;
  @IsOptional() @IsString() docToAgent?: string;
  @IsOptional() @IsString() remarks?: string;

  // Closed Files
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() delayCause?: string;
  @IsOptional() @IsDateString() qcReportReceivedDate?: string | null;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) qcOrderQty?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) qcRejectedQty?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) qcLessQty?: number;
  @IsOptional() @IsDateString() qcClaimDate?: string | null;
  @IsOptional() @Type(() => Number) @IsInt() qcReportStandardDays?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) qcMaterialFinancialLoss?: number;
  @IsOptional() @IsBoolean() poClosedFromErp?: boolean;

  @IsOptional() @IsString() bankName?: string;
  @IsOptional() @IsString() bankTtLcNumber?: string;
  @IsOptional() @IsDateString() bankDate?: string | null;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) bankRoe?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) bankChargesAdvance?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) bankChargesLcOpening?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) bankChargesRetirement?: number;
  @IsOptional() @IsString() bankDocsPayment?: string;
  @IsOptional() @IsDateString() bankDocsFromBank?: string | null;
  @IsOptional() @IsString() bankOaAdvanceSettlement?: string;

  @IsOptional() @IsString() insuranceCompany?: string;
  @IsOptional() @IsString() insuranceBillNo?: string;
  @IsOptional() @IsDateString() insuranceDate?: string | null;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) insuranceAmount?: number;

  @IsOptional() @IsString() logisticsBillNo?: string;
  @IsOptional() @IsDateString() logisticsDate?: string | null;
  @IsOptional() @IsString() logisticsWeightCbm?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) logisticsAmount?: number;
  @IsOptional() @IsDateString() logisticsBillToFinance?: string | null;

  @IsOptional() @IsString() gdNo?: string;
  @IsOptional() @IsDateString() gdDate?: string | null;
  @IsOptional() @IsDateString() shipmentClearanceDate?: string | null;
  @IsOptional() @IsString() clearanceBillNo?: string;
  @IsOptional() @IsDateString() clearanceBillDate?: string | null;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) clearanceAmount?: number;
}
