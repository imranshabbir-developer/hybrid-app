import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthRequestUser } from '../auth/jwt-auth.guard';

export const LOOKUP_TYPES = [
  { type: 'DIVISION', label: 'Division' },
  { type: 'MERCHANDISER', label: 'Merchandiser' },
  { type: 'SUPPLIER_CATEGORY', label: 'Supplier Category' },
  { type: 'PRODUCT_CATEGORY', label: 'Product Category' },
  { type: 'PAYMENT_TERM', label: 'Payment Term' },
  { type: 'MODE_OF_SHIPMENT', label: 'Mode of Shipment' },
  { type: 'INCOTERM', label: 'Incoterm' },
  { type: 'PORT', label: 'Port of Loading / Destination' },
  { type: 'BANK', label: 'Bank' },
  { type: 'FORWARDER', label: 'Forwarder' },
  { type: 'CLEARING_AGENT', label: 'Clearing Agent' },
  { type: 'CLEARANCE_MODE', label: 'Mode of Clearance' },
  { type: 'TOLERANCE', label: 'Tolerance' },
  { type: 'CURRENCY', label: 'Currency' },
  { type: 'CERT_STATUS', label: 'Certification Status' },
] as const;

const DEFAULTS: Record<string, string[]> = {
  DIVISION: ['Garments', 'Processing', 'Accessories', 'Home Textile'],
  MERCHANDISER: ['Demo Merch', 'Import Desk'],
  SUPPLIER_CATEGORY: ['Manufacturer', 'Trader', 'Customer Source'],
  PRODUCT_CATEGORY: [
    'Fabrics',
    'Accessories',
    'Machinery and spares',
    'Dyes and chemicals',
  ],
  PAYMENT_TERM: ['LC', 'ADV', 'O/A', 'DA', 'DP'],
  MODE_OF_SHIPMENT: ['SEA', 'AIR', 'COURIER'],
  INCOTERM: ['FOB', 'CNF', 'CIF', 'EXW'],
  PORT: ['Busan', 'Yokohama', 'Shanghai', 'Karachi', 'Port Qasim'],
  BANK: ['HBL', 'MCB', 'UBL', 'Standard Chartered'],
  FORWARDER: ['Demo Forwarder'],
  CLEARING_AGENT: ['Demo CA'],
  CLEARANCE_MODE: ['EOU', 'SEXP', 'Commercial'],
  TOLERANCE: ['5%', '7%', '10%'],
  CURRENCY: ['USD', 'EUR', 'PKR'],
  CERT_STATUS: ['YES', 'NO', 'UNDER_PROCESS'],
};

@Injectable()
export class LookupsService {
  constructor(private readonly prisma: PrismaService) {}

  types() {
    return LOOKUP_TYPES;
  }

  private scope(user: AuthRequestUser): Prisma.LookupWhereInput {
    if (user.role === 'ADMIN') return {};
    if (!user.companyId) throw new ForbiddenException('Company account is not linked');
    return {
      OR: [{ companyId: null }, { companyId: user.companyId }],
    };
  }

  list(user: AuthRequestUser, type?: string) {
    return this.prisma.lookup.findMany({
      where: {
        ...this.scope(user),
        ...(type ? { type } : {}),
        isActive: true,
      },
      orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }, { label: 'asc' }],
    });
  }

  async create(
    user: AuthRequestUser,
    dto: {
      type: string;
      code?: string;
      label: string;
      sortOrder?: number;
      isActive?: boolean;
    },
  ) {
    return this.prisma.lookup.create({
      data: {
        type: dto.type.trim().toUpperCase(),
        code: dto.code || '',
        label: dto.label.trim(),
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
        companyId: user.role === 'ADMIN' ? null : user.companyId,
      },
    });
  }

  async update(
    user: AuthRequestUser,
    id: string,
    dto: {
      type: string;
      code?: string;
      label: string;
      sortOrder?: number;
      isActive?: boolean;
    },
  ) {
    const row = await this.prisma.lookup.findFirst({
      where: { id, ...this.scope(user) },
    });
    if (!row) throw new NotFoundException('Lookup not found');
    return this.prisma.lookup.update({
      where: { id },
      data: {
        type: dto.type.trim().toUpperCase(),
        code: dto.code ?? row.code,
        label: dto.label.trim(),
        sortOrder: dto.sortOrder ?? row.sortOrder,
        isActive: dto.isActive ?? row.isActive,
      },
    });
  }

  async remove(user: AuthRequestUser, id: string) {
    const row = await this.prisma.lookup.findFirst({
      where: { id, ...this.scope(user) },
    });
    if (!row) throw new NotFoundException('Lookup not found');
    await this.prisma.lookup.update({
      where: { id },
      data: { isActive: false },
    });
    return { ok: true };
  }

  async seedDefaults(user: AuthRequestUser) {
    let created = 0;
    for (const [type, labels] of Object.entries(DEFAULTS)) {
      let i = 0;
      for (const label of labels) {
        const existing = await this.prisma.lookup.findFirst({
          where: {
            type,
            label,
            companyId: user.role === 'ADMIN' ? null : user.companyId,
          },
        });
        if (existing) {
          if (!existing.isActive) {
            await this.prisma.lookup.update({
              where: { id: existing.id },
              data: { isActive: true },
            });
          }
          continue;
        }
        await this.prisma.lookup.create({
          data: {
            type,
            label,
            code: label,
            sortOrder: i++,
            companyId: user.role === 'ADMIN' ? null : user.companyId,
          },
        });
        created += 1;
      }
    }
    return { created };
  }
}
