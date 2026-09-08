import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CertStatus, Prisma, SupplierEntry } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthRequestUser } from '../auth/jwt-auth.guard';
import { UpdateSupplierMasterDto } from './dto/update-supplier-master.dto';

@Injectable()
export class SupplierMastersService {
  constructor(private readonly prisma: PrismaService) {}

  private scopeWhere(user: AuthRequestUser): Prisma.SupplierMasterWhereInput {
    if (user.role === 'ADMIN') return {};
    if (!user.companyId) {
      throw new ForbiddenException('Company account is not linked');
    }
    return { companyId: user.companyId };
  }

  private entryToMasterData(entry: SupplierEntry, user: AuthRequestUser) {
    return {
      supplierEntryId: entry.id,
      purchaseOrderId: entry.purchaseOrderId,
      purchaseOrderNo: entry.purchaseOrderNo,
      entryDate: entry.entryDate,
      ppcDemandNo: entry.ppcDemandNo || '',
      ppcDemandDate: entry.ppcDemandDate,
      division: entry.division || '',
      shipperName: entry.shipperName || '',
      supplierCategory: entry.supplierCategory || '',
      productCategory: entry.productCategory || '',
      productItemCode: entry.productItemCode || '',
      shipperAddress: entry.shipperAddress || '',
      country: entry.country || '',
      shipperEmail: entry.shipperEmail || '',
      contactNo: entry.contactNo || '',
      websiteName: entry.websiteName || '',
      productDescription: entry.productDescription || '',
      countryOfOrigin: entry.countryOfOrigin || '',
      productHsCode: entry.productHsCode || '',
      unitValue: Number(entry.unitValue || 0),
      totalQuantity: Number(entry.totalQuantity || 0),
      totalValue: Number(entry.totalValue || 0),
      leadTimeDays: entry.leadTimeDays,
      portOfLoading: entry.portOfLoading || '',
      oekotexCert: entry.oekotexCert,
      isoCert: entry.isoCert,
      reachCert: entry.reachCert,
      companyId: entry.companyId ?? user.companyId,
      createdById: user.userId,
    };
  }

  /** Upsert Master row from Supplier Entry (Step 2 → Step 3). Keeps manual remarks. */
  async syncFromEntry(user: AuthRequestUser, entryId: string) {
    const entry = await this.prisma.supplierEntry.findFirst({
      where: {
        id: entryId,
        ...(user.role === 'ADMIN'
          ? {}
          : { companyId: user.companyId || undefined }),
      },
    });
    if (!entry) throw new NotFoundException('Supplier entry not found');

    const existing = await this.prisma.supplierMaster.findUnique({
      where: { supplierEntryId: entry.id },
    });

    const mapped = this.entryToMasterData(entry, user);

    if (existing) {
      const { createdById: _c, ...updateData } = mapped;
      return this.prisma.supplierMaster.update({
        where: { id: existing.id },
        data: updateData,
      });
    }

    const last = await this.prisma.supplierMaster.findFirst({
      orderBy: { srNo: 'desc' },
      select: { srNo: true },
    });
    const srNo = (last?.srNo || 0) + 1;

    return this.prisma.supplierMaster.create({
      data: {
        ...mapped,
        srNo,
        remarks: entry.notes || '',
      },
    });
  }

  async list(user: AuthRequestUser, q?: string) {
    const where: Prisma.SupplierMasterWhereInput = {
      ...this.scopeWhere(user),
    };
    if (q?.trim()) {
      const term = q.trim();
      where.OR = [
        { purchaseOrderNo: { contains: term } },
        { shipperName: { contains: term } },
        { productItemCode: { contains: term } },
        { productDescription: { contains: term } },
        { productCategory: { contains: term } },
        { countryOfOrigin: { contains: term } },
        { productHsCode: { contains: term } },
      ];
    }

    return this.prisma.supplierMaster.findMany({
      where,
      include: {
        company: { select: { id: true, code: true, name: true } },
        supplierEntry: { select: { id: true } },
      },
      orderBy: [{ srNo: 'asc' }],
    });
  }

  async getOne(user: AuthRequestUser, id: string) {
    const row = await this.prisma.supplierMaster.findFirst({
      where: { id, ...this.scopeWhere(user) },
      include: {
        company: { select: { id: true, code: true, name: true } },
        supplierEntry: { select: { id: true, purchaseOrderNo: true } },
      },
    });
    if (!row) throw new NotFoundException('Supplier master row not found');
    return row;
  }

  async update(user: AuthRequestUser, id: string, dto: UpdateSupplierMasterDto) {
    await this.getOne(user, id);

    const qty =
      dto.totalQuantity !== undefined ? Number(dto.totalQuantity) : undefined;
    const unit = dto.unitValue !== undefined ? Number(dto.unitValue) : undefined;

    return this.prisma.supplierMaster.update({
      where: { id },
      data: {
        purchaseOrderNo: dto.purchaseOrderNo,
        entryDate: dto.entryDate ? new Date(dto.entryDate) : undefined,
        ppcDemandNo: dto.ppcDemandNo,
        ppcDemandDate:
          dto.ppcDemandDate === undefined
            ? undefined
            : dto.ppcDemandDate
              ? new Date(dto.ppcDemandDate)
              : null,
        division: dto.division,
        shipperName: dto.shipperName,
        supplierCategory: dto.supplierCategory,
        productCategory: dto.productCategory,
        productItemCode: dto.productItemCode,
        shipperAddress: dto.shipperAddress,
        country: dto.country,
        shipperEmail: dto.shipperEmail,
        contactNo: dto.contactNo,
        websiteName: dto.websiteName,
        productDescription: dto.productDescription,
        countryOfOrigin: dto.countryOfOrigin,
        productHsCode: dto.productHsCode,
        unitValue: unit,
        totalQuantity: qty,
        totalValue:
          dto.totalValue !== undefined
            ? Number(dto.totalValue)
            : qty !== undefined && unit !== undefined
              ? Number((qty * unit).toFixed(4))
              : undefined,
        leadTimeDays:
          dto.leadTimeDays === undefined
            ? undefined
            : dto.leadTimeDays === null
              ? null
              : Number(dto.leadTimeDays),
        portOfLoading: dto.portOfLoading,
        oekotexCert: dto.oekotexCert as CertStatus | undefined,
        isoCert: dto.isoCert as CertStatus | undefined,
        reachCert: dto.reachCert as CertStatus | undefined,
        remarks: dto.remarks,
        poCompleted: dto.poCompleted,
      },
    });
  }

  async remove(user: AuthRequestUser, id: string) {
    await this.getOne(user, id);
    await this.prisma.supplierMaster.delete({ where: { id } });
    return { ok: true };
  }

  async syncAllMissing(user: AuthRequestUser) {
    const entries = await this.prisma.supplierEntry.findMany({
      where:
        user.role === 'ADMIN'
          ? {}
          : { companyId: user.companyId || undefined },
      include: { masterRow: true },
    });
    const missing = entries.filter((e) => !e.masterRow);
    const results = [];
    for (const entry of missing) {
      results.push(await this.syncFromEntry(user, entry.id));
    }
    return { synced: results.length, rows: results };
  }
}
