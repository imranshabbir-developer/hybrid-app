import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PurchaseOrderLineDto {
  @IsOptional()
  @IsString()
  itemCode?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice?: number;
}

export class UpsertPurchaseOrderDto {
  @IsString()
  @MinLength(1)
  poNumber!: string;

  @IsDateString()
  poDate!: string;

  @IsOptional() @IsString() companyName?: string;
  @IsOptional() @IsString() companyStreet?: string;
  @IsOptional() @IsString() companyCity?: string;
  @IsOptional() @IsString() companyPhone?: string;
  @IsOptional() @IsString() companyFax?: string;
  @IsOptional() @IsString() companyWebsite?: string;

  @IsOptional() @IsString() beneficiaryName?: string;
  @IsOptional() @IsString() beneficiaryContact?: string;
  @IsOptional() @IsString() beneficiaryStreet?: string;
  @IsOptional() @IsString() beneficiaryCity?: string;
  @IsOptional() @IsString() beneficiaryPhone?: string;
  @IsOptional() @IsString() beneficiaryFax?: string;

  @IsOptional() @IsString() shipperName?: string;
  @IsOptional() @IsString() shipperContact?: string;
  @IsOptional() @IsString() shipperStreet?: string;
  @IsOptional() @IsString() shipperCity?: string;
  @IsOptional() @IsString() shipperPhone?: string;
  @IsOptional() @IsString() shipperFax?: string;

  @IsOptional() @IsString() consigneeName?: string;
  @IsOptional() @IsString() consigneeCompany?: string;
  @IsOptional() @IsString() consigneeStreet?: string;
  @IsOptional() @IsString() consigneeCity?: string;
  @IsOptional() @IsString() consigneePhone?: string;

  @IsOptional() @IsString() originOfGoods?: string;
  @IsOptional() @IsString() shipVia?: string;
  @IsOptional() @IsString() hsCode?: string;
  @IsOptional() @IsString() incoterms?: string;
  @IsOptional() @IsString() tolerance?: string;
  @IsOptional() @IsString() currency?: string;

  @IsOptional() @IsString() comments?: string;
  @IsOptional() @IsString() contactFooter?: string;

  @IsOptional() @IsString() status?: 'DRAFT' | 'SAVED' | 'POSTED';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderLineDto)
  lines!: PurchaseOrderLineDto[];
}
