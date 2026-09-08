import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ImportStatus, Prisma, SupplierMaster } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthRequestUser } from '../auth/jwt-auth.guard';
import { UpdateImportShipmentDto } from './dto/update-import-shipment.dto';
import { optionalDate } from './date-util';

function daysBetween(a?: Date | null, b?: Date | null) {
  if (!a || !b) return null;
  const ms = a.getTime() - b.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function monthName(d?: Date | null) {
  if (!d) return '';
  return d.toLocaleString('en-US', { month: 'long' });
}

function mapShipVia(shipVia?: string) {
  const v = (shipVia || '').toLowerCase();
  if (v.includes('air')) return 'AIR';
  if (v.includes('courier') || v.includes('express')) return 'COURIER';
  if (v.includes('sea')) return 'SEA';
  return shipVia || '';
}

function bucket(value: number | null, min: number, max: number) {
  if (value == null) return null;
  if (value >= min && value <= max) return value;
  return null;
}

@Injectable()
export class ImportShipmentsService {
  constructor(private readonly prisma: PrismaService) {}

  private scopeWhere(user: AuthRequestUser): Prisma.ImportShipmentWhereInput {
    if (user.role === 'ADMIN') return {};
    if (!user.companyId) throw new ForbiddenException('Company account is not linked');
    return { companyId: user.companyId };
  }

  private masterScope(user: AuthRequestUser): Prisma.SupplierMasterWhereInput {
    if (user.role === 'ADMIN') return {};
    if (!user.companyId) throw new ForbiddenException('Company account is not linked');
    return { companyId: user.companyId };
  }

  computeDerived(row: {
    ppcDemandDate?: Date | null;
    purchaseOrderDate?: Date | null;
    supplierDeliveryTime?: number | null;
    standardLeadTime?: number | null;
    quantityShipped?: number | null;
    unitValue?: number | null;
    actualShipmentReadyDate?: Date | null;
    revision1?: Date | null;
    qcReportReceivedDate?: Date | null;
    qcReportStandardDays?: number | null;
    bankChargesAdvance?: number | null;
    bankChargesLcOpening?: number | null;
    bankChargesRetirement?: number | null;
  }) {
    const today = new Date();
    const ppc = row.ppcDemandDate || null;
    const poDate = row.purchaseOrderDate || null;
    const supplierDays = row.supplierDeliveryTime ?? null;
    const standard = row.standardLeadTime ?? 85;
    const qty = Number(row.quantityShipped || 0);
    const unit = Number(row.unitValue || 0);

    const elapsedLeadTime = ppc ? daysBetween(today, ppc) : null;
    const remainingLeadTime =
      elapsedLeadTime == null ? null : standard - elapsedLeadTime;
    const poTat = ppc && poDate ? daysBetween(poDate, ppc) : null;
    const supplierDeliveryDate =
      poDate && supplierDays != null ? addDays(poDate, supplierDays) : null;
    const delayAgainstSupplier =
      supplierDeliveryDate && row.actualShipmentReadyDate
        ? daysBetween(supplierDeliveryDate, row.actualShipmentReadyDate)
        : null;
    const delayAbove = delayAgainstSupplier != null ? -delayAgainstSupplier : null;
    const delay1to10 = bucket(delayAbove, 1, 10);
    const delay10to20 = bucket(delayAbove, 11, 20);
    const fetaDate = ppc ? addDays(ppc, standard) : null;
    const factoryArrivalDelay =
      fetaDate && row.revision1 ? daysBetween(row.revision1, fetaDate) : null;

    const delayAgainstStandard =
      fetaDate && row.actualShipmentReadyDate
        ? daysBetween(row.actualShipmentReadyDate, fetaDate)
        : null;
    const delayStd1to10 = bucket(delayAgainstStandard, 1, 10);
    const delayStd10to20 = bucket(delayAgainstStandard, 11, 20);

    const qcReportReceivedDays =
      row.qcReportReceivedDate && row.actualShipmentReadyDate
        ? daysBetween(row.qcReportReceivedDate, row.actualShipmentReadyDate)
        : null;
    const qcStd = row.qcReportStandardDays ?? 10;
    const qcAboveStd =
      qcReportReceivedDays != null ? qcReportReceivedDays - qcStd : null;
    const qcDelay10to20 = bucket(qcAboveStd, 10, 20);
    const qcDelay20to30 = bucket(qcAboveStd, 21, 30);

    const bankChargesTotal = Number(
      (
        Number(row.bankChargesAdvance || 0) +
        Number(row.bankChargesLcOpening || 0) +
        Number(row.bankChargesRetirement || 0)
      ).toFixed(4),
    );

    return {
      monthLabel: monthName(ppc || poDate),
      elapsedLeadTime,
      remainingLeadTime,
      poTat,
      supplierDeliveryDate,
      delayAgainstSupplier,
      delay1to10,
      delay10to20,
      fetaDate,
      factoryArrivalDelay,
      totalAmount: Number((qty * unit).toFixed(4)),
      standardLeadTime: standard,
      delayAgainstStandard,
      delayStd1to10,
      delayStd10to20,
      qcReportReceivedDays,
      qcDelay10to20,
      qcDelay20to30,
      bankChargesTotal,
    };
  }

  withComputed<T extends Record<string, unknown>>(row: T) {
    const derived = this.computeDerived(row as never);
    return { ...row, ...derived };
  }

  async list(user: AuthRequestUser, status: ImportStatus = ImportStatus.OPEN) {
    const rows = await this.prisma.importShipment.findMany({
      where: { ...this.scopeWhere(user), status },
      include: {
        supplierMaster: { select: { id: true, srNo: true, purchaseOrderNo: true } },
        company: { select: { id: true, code: true, name: true } },
      },
      orderBy: [{ srNo: 'asc' }],
    });
    return rows.map((r) => this.withComputed(r));
  }

  async getOne(user: AuthRequestUser, id: string) {
    const row = await this.prisma.importShipment.findFirst({
      where: { id, ...this.scopeWhere(user) },
      include: {
        supplierMaster: true,
        company: { select: { id: true, code: true, name: true } },
      },
    });
    if (!row) throw new NotFoundException('Import shipment not found');
    return this.withComputed(row);
  }

  async fromMaster(user: AuthRequestUser, masterId: string) {
    const master = await this.prisma.supplierMaster.findFirst({
      where: { id: masterId, ...this.masterScope(user) },
    });
    if (!master) throw new NotFoundException('Supplier master row not found');

    const existing = await this.prisma.importShipment.findFirst({
      where: {
        supplierMasterId: master.id,
        status: ImportStatus.OPEN,
        ...this.scopeWhere(user),
      },
    });
    if (existing) {
      throw new BadRequestException(
        `Open Import Tracking already exists for PO ${master.purchaseOrderNo}`,
      );
    }

    let shipVia = '';
    let incoterm = '';
    if (master.purchaseOrderId) {
      const po = await this.prisma.purchaseOrder.findUnique({
        where: { id: master.purchaseOrderId },
      });
      shipVia = mapShipVia(po?.shipVia);
      incoterm = po?.incoterms || '';
    }

    const last = await this.prisma.importShipment.findFirst({
      orderBy: { srNo: 'desc' },
      select: { srNo: true },
    });

    const created = await this.prisma.importShipment.create({
      data: {
        srNo: (last?.srNo || 0) + 1,
        status: ImportStatus.OPEN,
        supplierMasterId: master.id,
        purchaseOrderId: master.purchaseOrderId,
        purchaseOrderNo: master.purchaseOrderNo,
        division: master.division || '',
        merchandiser: '',
        monthLabel: monthName(master.ppcDemandDate || master.entryDate),
        ppcDemandNo: master.ppcDemandNo || '',
        ppcDemandDate: master.ppcDemandDate,
        purchaseOrderDate: master.entryDate,
        poQuantity: Number(master.totalQuantity || 0),
        shipperName: master.shipperName || '',
        productDescription: master.productDescription || '',
        quantityShipped: 0,
        unitValue: Number(master.unitValue || 0),
        totalAmount: 0,
        bank: '',
        paymentTerm: '',
        modeOfShipment: shipVia,
        incoterm,
        supplierDeliveryTime: master.leadTimeDays,
        standardLeadTime: 85,
        pol: master.portOfLoading || '',
        destinationPort: '',
        modeOfClearance: '',
        eouLimitUtilized: '',
        forwarder: '',
        clearingAgent: '',
        docToAgent: '',
        remarks: master.remarks || '',
        companyId: master.companyId ?? user.companyId,
        createdById: user.userId,
      },
    });

    return this.withComputed(created);
  }

  async update(user: AuthRequestUser, id: string, dto: UpdateImportShipmentDto) {
    const current = await this.getOne(user, id);
    const qty =
      dto.quantityShipped !== undefined
        ? Number(dto.quantityShipped)
        : Number(current.quantityShipped || 0);
    const unit =
      dto.unitValue !== undefined
        ? Number(dto.unitValue)
        : Number(current.unitValue || 0);
    const shouldRecalcAmount =
      dto.quantityShipped !== undefined || dto.unitValue !== undefined;

    const updated = await this.prisma.importShipment.update({
      where: { id },
      data: {
        division: dto.division,
        merchandiser: dto.merchandiser,
        monthLabel: dto.monthLabel,
        ppcDemandNo: dto.ppcDemandNo,
        ppcDemandDate: optionalDate(dto.ppcDemandDate),
        purchaseOrderDate: optionalDate(dto.purchaseOrderDate),
        purchaseOrderNo: dto.purchaseOrderNo,
        poQuantity: dto.poQuantity,
        shipperName: dto.shipperName,
        productDescription: dto.productDescription,
        quantityShipped: dto.quantityShipped !== undefined ? qty : undefined,
        unitValue: dto.unitValue !== undefined ? unit : undefined,
        totalAmount: shouldRecalcAmount
          ? Number((qty * unit).toFixed(4))
          : undefined,
        bank: dto.bank,
        paymentTerm: dto.paymentTerm,
        modeOfShipment: dto.modeOfShipment,
        incoterm: dto.incoterm,
        supplierDeliveryTime:
          dto.supplierDeliveryTime === undefined
            ? undefined
            : dto.supplierDeliveryTime,
        standardLeadTime: dto.standardLeadTime,
        ppSampleReadyDate: optionalDate(dto.ppSampleReadyDate),
        actualShipmentReadyDate: optionalDate(dto.actualShipmentReadyDate),
        onBoardDate: optionalDate(dto.onBoardDate),
        etaAtPort: optionalDate(dto.etaAtPort),
        blAwbNo: dto.blAwbNo,
        blDate: optionalDate(dto.blDate),
        pol: dto.pol,
        destinationPort: dto.destinationPort,
        modeOfClearance: dto.modeOfClearance,
        eouLimitUtilized: dto.eouLimitUtilized,
        revision1: optionalDate(dto.revision1),
        revision2: optionalDate(dto.revision2),
        revision3: optionalDate(dto.revision3),
        forwarder: dto.forwarder,
        clearingAgent: dto.clearingAgent,
        docToAgent: dto.docToAgent,
        remarks: dto.remarks,

        category: dto.category,
        delayCause: dto.delayCause,
        qcReportReceivedDate: optionalDate(dto.qcReportReceivedDate),
        qcOrderQty: dto.qcOrderQty,
        qcRejectedQty: dto.qcRejectedQty,
        qcLessQty: dto.qcLessQty,
        qcClaimDate: optionalDate(dto.qcClaimDate),
        qcReportStandardDays: dto.qcReportStandardDays,
        qcMaterialFinancialLoss: dto.qcMaterialFinancialLoss,
        poClosedFromErp: dto.poClosedFromErp,

        bankName: dto.bankName,
        bankTtLcNumber: dto.bankTtLcNumber,
        bankDate: optionalDate(dto.bankDate),
        bankRoe: dto.bankRoe,
        bankChargesAdvance: dto.bankChargesAdvance,
        bankChargesLcOpening: dto.bankChargesLcOpening,
        bankChargesRetirement: dto.bankChargesRetirement,
        bankDocsPayment: dto.bankDocsPayment,
        bankDocsFromBank: optionalDate(dto.bankDocsFromBank),
        bankOaAdvanceSettlement: dto.bankOaAdvanceSettlement,

        insuranceCompany: dto.insuranceCompany,
        insuranceBillNo: dto.insuranceBillNo,
        insuranceDate: optionalDate(dto.insuranceDate),
        insuranceAmount: dto.insuranceAmount,

        logisticsBillNo: dto.logisticsBillNo,
        logisticsDate: optionalDate(dto.logisticsDate),
        logisticsWeightCbm: dto.logisticsWeightCbm,
        logisticsAmount: dto.logisticsAmount,
        logisticsBillToFinance: optionalDate(dto.logisticsBillToFinance),

        gdNo: dto.gdNo,
        gdDate: optionalDate(dto.gdDate),
        shipmentClearanceDate: optionalDate(dto.shipmentClearanceDate),
        clearanceBillNo: dto.clearanceBillNo,
        clearanceBillDate: optionalDate(dto.clearanceBillDate),
        clearanceAmount: dto.clearanceAmount,
      },
    });

    return this.withComputed(updated);
  }

  async close(user: AuthRequestUser, id: string) {
    const row = await this.getOne(user, id);
    if (row.status === ImportStatus.CLOSED) {
      throw new BadRequestException('Shipment is already closed');
    }

    let category = String(row.category || '');
    if (!category && row.supplierMasterId) {
      const master = await this.prisma.supplierMaster.findUnique({
        where: { id: row.supplierMasterId },
        select: { productCategory: true, division: true },
      });
      category = master?.productCategory || master?.division || row.division || '';
    }

    const closed = await this.prisma.importShipment.update({
      where: { id },
      data: {
        status: ImportStatus.CLOSED,
        poClosedFromErp: true,
        category: category || row.division || '',
        bankName: row.bankName || row.bank || '',
        qcOrderQty: Number(row.qcOrderQty || row.poQuantity || 0),
      },
    });
    if (row.supplierMasterId) {
      await this.prisma.supplierMaster.update({
        where: { id: row.supplierMasterId },
        data: { poCompleted: true },
      });
    }
    return this.withComputed(closed);
  }

  async remove(user: AuthRequestUser, id: string) {
    await this.getOne(user, id);
    await this.prisma.importShipment.delete({ where: { id } });
    return { ok: true };
  }

  async mastersAvailable(user: AuthRequestUser) {
    const openLinks = await this.prisma.importShipment.findMany({
      where: { status: ImportStatus.OPEN, ...this.scopeWhere(user) },
      select: { supplierMasterId: true },
    });
    const used = new Set(
      openLinks.map((x) => x.supplierMasterId).filter(Boolean) as string[],
    );
    const masters = await this.prisma.supplierMaster.findMany({
      where: this.masterScope(user),
      orderBy: { srNo: 'asc' },
    });
    return masters.map((m: SupplierMaster) => ({
      ...m,
      alreadyInOpenIts: used.has(m.id),
    }));
  }
}
