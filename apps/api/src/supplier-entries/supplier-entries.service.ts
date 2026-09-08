import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { CertStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthRequestUser } from '../auth/jwt-auth.guard';
import { UpsertSupplierEntryDto } from './dto/upsert-supplier-entry.dto';
import { SupplierMastersService } from '../supplier-masters/supplier-masters.service';

type PoWithLines = Prisma.PurchaseOrderGetPayload<{
  include: { lines: true };
}>;

@Injectable()
export class SupplierEntriesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => SupplierMastersService))
    private readonly masters: SupplierMastersService,
  ) {}

  private scopeWhere(user: AuthRequestUser): Prisma.SupplierEntryWhereInput {
    if (user.role === 'ADMIN') return {};
    if (!user.companyId) {
      throw new ForbiddenException('Company account is not linked');
    }
    return { companyId: user.companyId };
  }

  private poScopeWhere(user: AuthRequestUser): Prisma.PurchaseOrderWhereInput {
    if (user.role === 'ADMIN') return {};
    if (!user.companyId) {
      throw new ForbiddenException('Company account is not linked');
    }
    return { companyId: user.companyId };
  }

  private joinAddress(street: string, city: string) {
    return [street, city].map((s) => (s || '').trim()).filter(Boolean).join(', ');
  }

  /** Map Step-1 PO fields into Step-2 Supplier Entry defaults. */
  mapFromPurchaseOrder(po: PoWithLines, lineNo?: number | null) {
    const usableLines = po.lines.filter(
      (l) => l.itemCode || l.description || l.quantity > 0 || l.unitPrice > 0,
    );
    const selected =
      (lineNo
        ? usableLines.find((l) => l.lineNo === lineNo) || po.lines.find((l) => l.lineNo === lineNo)
        : null) ||
      usableLines[0] ||
      po.lines[0] ||
      null;

    const quantity = selected ? Number(selected.quantity || 0) : 0;
    const unitValue = selected ? Number(selected.unitPrice || 0) : 0;
    const totalValue = selected
      ? Number(selected.lineTotal || quantity * unitValue)
      : Number(po.grandTotal || 0);

    const totalQuantity = selected
      ? quantity
      : usableLines.reduce((sum, l) => sum + Number(l.quantity || 0), 0);

    return {
      purchaseOrderId: po.id,
      purchaseOrderNo: po.poNumber,
      entryDate: po.poDate.toISOString().slice(0, 10),
      shipperName: po.shipperName || '',
      shipperAddress: this.joinAddress(po.shipperStreet, po.shipperCity),
      contactNo: po.shipperPhone || '',
      websiteName: '',
      countryOfOrigin: po.originOfGoods || '',
      productHsCode: po.hsCode || '',
      tolerance: po.tolerance || '',
      productItemCode: selected?.itemCode || '',
      productDescription: selected?.description || '',
      unitValue,
      totalQuantity: selected ? quantity : totalQuantity,
      totalValue: selected ? totalValue : Number(po.grandTotal || 0),
      sourceLineNo: selected?.lineNo ?? null,
      // Manual-only fields stay empty for user input
      ppcDemandNo: '',
      ppcDemandDate: null as string | null,
      division: '',
      supplierCategory: '',
      productCategory: '',
      country: '',
      shipperEmail: '',
      leadTimeDays: null as number | null,
      portOfLoading: '',
      oekotexCert: 'NO' as CertStatus,
      isoCert: 'NO' as CertStatus,
      reachCert: 'NO' as CertStatus,
      notes: '',
      availableLines: po.lines.map((l) => ({
        lineNo: l.lineNo,
        itemCode: l.itemCode,
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        lineTotal: l.lineTotal,
      })),
      prefilledFrom: [
        'purchaseOrderNo',
        'entryDate',
        'shipperName',
        'shipperAddress',
        'contactNo',
        'countryOfOrigin',
        'productHsCode',
        'tolerance',
        'productItemCode',
        'productDescription',
        'unitValue',
        'totalQuantity',
        'totalValue',
      ],
      manualFields: [
        'ppcDemandNo',
        'ppcDemandDate',
        'division',
        'supplierCategory',
        'productCategory',
        'country',
        'shipperEmail',
        'websiteName',
        'leadTimeDays',
        'portOfLoading',
        'oekotexCert',
        'isoCert',
        'reachCert',
      ],
    };
  }

  async prefill(user: AuthRequestUser, purchaseOrderId: string, lineNo?: number) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id: purchaseOrderId, ...this.poScopeWhere(user) },
      include: { lines: { orderBy: { lineNo: 'asc' } } },
    });
    if (!po) throw new NotFoundException('Purchase order not found');
    return this.mapFromPurchaseOrder(po, lineNo ?? null);
  }

  async list(user: AuthRequestUser) {
    return this.prisma.supplierEntry.findMany({
      where: this.scopeWhere(user),
      include: {
        purchaseOrder: { select: { id: true, poNumber: true, poDate: true } },
        company: { select: { id: true, code: true, name: true } },
        createdBy: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async getOne(user: AuthRequestUser, id: string) {
    const row = await this.prisma.supplierEntry.findFirst({
      where: { id, ...this.scopeWhere(user) },
      include: {
        purchaseOrder: {
          select: {
            id: true,
            poNumber: true,
            poDate: true,
            lines: { orderBy: { lineNo: 'asc' } },
          },
        },
        company: { select: { id: true, code: true, name: true } },
        createdBy: { select: { id: true, fullName: true, email: true } },
      },
    });
    if (!row) throw new NotFoundException('Supplier entry not found');
    return row;
  }

  private async resolveLinkedPo(user: AuthRequestUser, dto: UpsertSupplierEntryDto) {
    if (dto.purchaseOrderId) {
      const po = await this.prisma.purchaseOrder.findFirst({
        where: { id: dto.purchaseOrderId, ...this.poScopeWhere(user) },
      });
      if (!po) throw new BadRequestException('Linked purchase order not found');
      return po;
    }
    const poNumber = dto.purchaseOrderNo.trim();
    if (!poNumber) return null;
    return this.prisma.purchaseOrder.findFirst({
      where: { poNumber, ...this.poScopeWhere(user) },
    });
  }

  private buildData(user: AuthRequestUser, dto: UpsertSupplierEntryDto, poId: string | null) {
    const qty = Number(dto.totalQuantity || 0);
    const unit = Number(dto.unitValue || 0);
    const totalValue =
      dto.totalValue !== undefined && dto.totalValue !== null
        ? Number(dto.totalValue)
        : Number((qty * unit).toFixed(4));

    return {
      purchaseOrderId: poId,
      purchaseOrderNo: dto.purchaseOrderNo.trim(),
      entryDate: new Date(dto.entryDate),
      ppcDemandNo: dto.ppcDemandNo || '',
      ppcDemandDate: dto.ppcDemandDate ? new Date(dto.ppcDemandDate) : null,
      shipperName: dto.shipperName || '',
      division: dto.division || '',
      supplierCategory: dto.supplierCategory || '',
      productCategory: dto.productCategory || '',
      tolerance: dto.tolerance || '',
      productItemCode: dto.productItemCode || '',
      shipperAddress: dto.shipperAddress || '',
      country: dto.country || '',
      shipperEmail: dto.shipperEmail || '',
      contactNo: dto.contactNo || '',
      websiteName: dto.websiteName || '',
      productDescription: dto.productDescription || '',
      countryOfOrigin: dto.countryOfOrigin || '',
      productHsCode: dto.productHsCode || '',
      unitValue: unit,
      totalQuantity: qty,
      totalValue,
      leadTimeDays:
        dto.leadTimeDays === undefined || dto.leadTimeDays === null
          ? null
          : Number(dto.leadTimeDays),
      portOfLoading: dto.portOfLoading || '',
      oekotexCert: (dto.oekotexCert || 'NO') as CertStatus,
      isoCert: (dto.isoCert || 'NO') as CertStatus,
      reachCert: (dto.reachCert || 'NO') as CertStatus,
      sourceLineNo:
        dto.sourceLineNo === undefined || dto.sourceLineNo === null
          ? null
          : Number(dto.sourceLineNo),
      notes: dto.notes || '',
      companyId: user.companyId,
      createdById: user.userId,
    };
  }

  async create(user: AuthRequestUser, dto: UpsertSupplierEntryDto) {
    const po = await this.resolveLinkedPo(user, dto);
    const data = this.buildData(user, dto, po?.id ?? null);
    if (po && data.purchaseOrderNo !== po.poNumber) {
      data.purchaseOrderNo = po.poNumber;
    }
    const created = await this.prisma.supplierEntry.create({
      data,
      include: {
        purchaseOrder: { select: { id: true, poNumber: true } },
        company: { select: { id: true, code: true, name: true } },
      },
    });
    const master = await this.masters.syncFromEntry(user, created.id);
    return { ...created, masterId: master.id, masterSrNo: master.srNo };
  }

  async update(user: AuthRequestUser, id: string, dto: UpsertSupplierEntryDto) {
    await this.getOne(user, id);
    const po = await this.resolveLinkedPo(user, dto);
    const data = this.buildData(user, dto, po?.id ?? null);
    if (po && data.purchaseOrderNo !== po.poNumber) {
      data.purchaseOrderNo = po.poNumber;
    }
    const { createdById: _c, ...updateData } = data;
    const updated = await this.prisma.supplierEntry.update({
      where: { id },
      data: updateData,
      include: {
        purchaseOrder: { select: { id: true, poNumber: true } },
        company: { select: { id: true, code: true, name: true } },
      },
    });
    const master = await this.masters.syncFromEntry(user, updated.id);
    return { ...updated, masterId: master.id, masterSrNo: master.srNo };
  }

  async remove(user: AuthRequestUser, id: string) {
    await this.getOne(user, id);
    await this.prisma.supplierEntry.delete({ where: { id } });
    return { ok: true };
  }
}
