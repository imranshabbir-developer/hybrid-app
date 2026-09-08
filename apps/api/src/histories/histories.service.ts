import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthRequestUser } from '../auth/jwt-auth.guard';

export type HistoryFilters = {
  q?: string;
  supplier?: string;
  category?: string;
  from?: string;
  to?: string;
};

function monthName(d?: Date | null) {
  if (!d) return '';
  return d.toLocaleString('en-US', { month: 'long' });
}

function daysBetween(a?: Date | null, b?: Date | null) {
  if (!a || !b) return null;
  return Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

@Injectable()
export class HistoriesService {
  constructor(private readonly prisma: PrismaService) {}

  private scopeWhere(user: AuthRequestUser): Prisma.SupplierMasterWhereInput {
    if (user.role === 'ADMIN') return {};
    if (!user.companyId) throw new ForbiddenException('Company account is not linked');
    return { companyId: user.companyId };
  }

  private matchText(hay: string, needle?: string) {
    if (!needle?.trim()) return true;
    return hay.toLowerCase().includes(needle.trim().toLowerCase());
  }

  private inDateRange(d: Date | null | undefined, from?: string, to?: string) {
    if (!d) return !(from || to);
    const t = d.getTime();
    if (from && t < new Date(from).getTime()) return false;
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      if (t > end.getTime()) return false;
    }
    return true;
  }

  private async loadJoined(user: AuthRequestUser) {
    const masters = await this.prisma.supplierMaster.findMany({
      where: this.scopeWhere(user),
      include: {
        importShipments: { orderBy: [{ updatedAt: 'desc' }] },
      },
      orderBy: [{ srNo: 'asc' }],
    });

    return masters.map((m) => {
      const closed = m.importShipments.find((s) => s.status === 'CLOSED');
      const open = m.importShipments.find((s) => s.status === 'OPEN');
      const its = closed || open || null;
      return { master: m, its };
    });
  }

  async purchaseHistory(user: AuthRequestUser, filters: HistoryFilters) {
    const rows = await this.loadJoined(user);
    const out = [];
    let sr = 1;
    for (const { master: m, its } of rows) {
      const poDate = m.entryDate;
      if (!this.inDateRange(poDate, filters.from, filters.to)) continue;
      if (!this.matchText(m.shipperName, filters.supplier)) continue;
      if (!this.matchText(m.productCategory || m.division, filters.category)) continue;

      const amount = Number(its?.totalAmount || m.totalValue || 0);
      const roe = Number(its?.bankRoe || 0);
      const bankRef = its?.bankTtLcNumber || its?.bankName || its?.bank || '';
      const mode = its?.modeOfShipment || '';
      const priceTerm = its?.incoterm || '';
      const qty = Number(its?.quantityShipped || m.totalQuantity || 0);
      const unit = Number(its?.unitValue || m.unitValue || 0);
      const month = its?.monthLabel || monthName(m.ppcDemandDate || poDate);

      const blob = [
        m.purchaseOrderNo,
        m.shipperName,
        m.productDescription,
        m.productHsCode,
        m.productItemCode,
        bankRef,
      ].join(' ');
      if (!this.matchText(blob, filters.q)) continue;

      out.push({
        srNo: sr++,
        category: m.productCategory || its?.category || m.division || '',
        hsCode: m.productHsCode || '',
        month,
        productItemCode: m.productItemCode || '',
        purchaseOrderNo: m.purchaseOrderNo,
        poDate,
        supplier: m.shipperName || '',
        description: m.productDescription || '',
        countryOfOrigin: m.countryOfOrigin || '',
        quantity: qty,
        unitPrice: unit,
        amount,
        paymentBankRef: bankRef,
        modeOfShipment: mode,
        priceTerm,
        roe,
        valueInPkr: Number((amount * (roe || 0)).toFixed(2)),
        itsStatus: its?.status || null,
        masterId: m.id,
        shipmentId: its?.id || null,
      });
    }
    return out;
  }

  async paymentHistory(user: AuthRequestUser, filters: HistoryFilters) {
    const purchase = await this.purchaseHistory(user, filters);
    const masters = await this.loadJoined(user);
    const payByPo = new Map<string, string>();
    for (const { master: m, its } of masters) {
      if (its) payByPo.set(m.purchaseOrderNo, (its as { paymentTerm?: string }).paymentTerm || '');
    }
    return purchase.map((r, i) => ({
      srNo: i + 1,
      purchaseOrderNo: r.purchaseOrderNo,
      poDate: r.poDate,
      supplier: r.supplier,
      amount: r.amount,
      paymentBankRef: r.paymentBankRef,
      paymentTerm: payByPo.get(r.purchaseOrderNo) || '',
      roe: r.roe,
      valueInPkr: r.valueInPkr,
      modeOfShipment: r.modeOfShipment,
      priceTerm: r.priceTerm,
      itsStatus: r.itsStatus,
      shipmentId: r.shipmentId,
      masterId: r.masterId,
    }));
  }

  async operationalHistory(user: AuthRequestUser, filters: HistoryFilters) {
    const rows = await this.loadJoined(user);
    const out = [];
    let sr = 1;
    for (const { master: m, its } of rows) {
      if (!this.inDateRange(m.entryDate, filters.from, filters.to)) continue;
      if (!this.matchText(m.shipperName, filters.supplier)) continue;

      const blob = [m.purchaseOrderNo, m.shipperName, m.productDescription].join(' ');
      if (!this.matchText(blob, filters.q)) continue;

      const poDate = m.entryDate;
      const lead = m.leadTimeDays ?? its?.supplierDeliveryTime ?? null;
      const supplierDeliveryDate =
        poDate && lead != null ? addDays(poDate, lead) : null;
      const actualReady = its?.actualShipmentReadyDate || null;
      const delayAgainstSupplier =
        supplierDeliveryDate && actualReady
          ? daysBetween(supplierDeliveryDate, actualReady)
          : null;
      const delayAbove =
        delayAgainstSupplier != null ? -delayAgainstSupplier : null;
      const delay1to10 =
        delayAbove != null && delayAbove >= 1 && delayAbove <= 10 ? delayAbove : null;
      const delay10to20 =
        delayAbove != null && delayAbove >= 11 && delayAbove <= 20 ? delayAbove : null;
      const mode = (its?.modeOfShipment || '').toUpperCase();
      const liftedByAirDueToDelay =
        mode === 'AIR' && delayAbove != null && delayAbove > 0;

      out.push({
        srNo: sr++,
        purchaseOrderNo: m.purchaseOrderNo,
        poDate,
        ppcDemandDate: m.ppcDemandDate,
        supplier: m.shipperName || '',
        quantity: Number(its?.quantityShipped || m.totalQuantity || 0),
        leadTimeDays: lead,
        supplierDeliveryDate,
        actualShipmentReadyDate: actualReady,
        ppSampleReadyDate: its?.ppSampleReadyDate || null,
        revision1: its?.revision1 || null,
        revision2: its?.revision2 || null,
        delayAgainstSupplier,
        delay1to10,
        delay10to20,
        modeOfShipment: its?.modeOfShipment || '',
        liftedByAirDueToDelay,
        itsStatus: its?.status || null,
        masterId: m.id,
        shipmentId: its?.id || null,
      });
    }
    return out;
  }
}
