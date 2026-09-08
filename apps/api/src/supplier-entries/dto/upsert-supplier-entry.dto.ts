import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

const CERT = ['YES', 'NO', 'UNDER_PROCESS'] as const;

export class UpsertSupplierEntryDto {
  @IsOptional()
  @IsString()
  purchaseOrderId?: string | null;

  @IsString()
  @MinLength(1)
  purchaseOrderNo!: string;

  @IsDateString()
  entryDate!: string;

  @IsOptional() @IsString() ppcDemandNo?: string;
  @IsOptional() @IsDateString() ppcDemandDate?: string | null;

  @IsOptional() @IsString() shipperName?: string;
  @IsOptional() @IsString() division?: string;
  @IsOptional() @IsString() supplierCategory?: string;
  @IsOptional() @IsString() productCategory?: string;
  @IsOptional() @IsString() tolerance?: string;
  @IsOptional() @IsString() productItemCode?: string;
  @IsOptional() @IsString() shipperAddress?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() shipperEmail?: string;
  @IsOptional() @IsString() contactNo?: string;
  @IsOptional() @IsString() websiteName?: string;
  @IsOptional() @IsString() productDescription?: string;
  @IsOptional() @IsString() countryOfOrigin?: string;
  @IsOptional() @IsString() productHsCode?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitValue?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalQuantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalValue?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  leadTimeDays?: number | null;

  @IsOptional() @IsString() portOfLoading?: string;

  @IsOptional()
  @IsIn(CERT)
  oekotexCert?: (typeof CERT)[number];

  @IsOptional()
  @IsIn(CERT)
  isoCert?: (typeof CERT)[number];

  @IsOptional()
  @IsIn(CERT)
  reachCert?: (typeof CERT)[number];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sourceLineNo?: number | null;

  @IsOptional() @IsString() notes?: string;
}
