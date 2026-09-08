import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthRequestUser } from '../auth/jwt-auth.guard';
import { getReportDef, REPORT_CATALOG } from './report-catalog';
import { toCsv, toPdf, toXlsx } from './export.util';

export type ReportFilters = {
  from?: string;
  to?: string;
  supplier?: string;
  category?: string;
  division?: string;
  country?: string;
  status?: string;
  paymentTerm?: string;
  modeOfShipment?: string;
  hsCode?: string;
  pol?: string;
  q?: string;
  shipVariance?: string;
};

function contains(hay: string | null | undefined, needle?: string) {
  if (!needle?.trim()) return true;
  return (hay || '').toLowerCase().includes(needle.trim().toLowerCase());
}

function inRange(d: Date | null | undefined, from?: string, to?: string) {
  if (!from && !to) return true;
  if (!d) return false;
  const t = d.getTime();
  if (from && t < new Date(from).getTime()) return false;
  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    if (t > end.getTime()) return false;
  }
  return true;
}

function dstr(v?: Date | string | null) {
  if (!v) return '';
  return String(v).slice(0, 10);
}

function monthName(d?: Date | null) {
  if (!d) return '';
  return d.toLocaleString('en-US', { month: 'long' });
}

function daysBetween(a?: Date | null, b?: Date | null) {
  if (!a || !b) return null;
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private companyFilter(user: AuthRequestUser): { companyId?: string } {
    if (user.role === 'ADMIN') return {};
    if (!user.companyId) throw new ForbiddenException('Company account is not linked');
    return { companyId: user.companyId };
  }

  catalog() {
    return REPORT_CATALOG.map((r) => ({
      id: r.id,
      group: r.group,
      title: r.title,
      description: r.description,
      filters: r.filters,
      columns: r.columns,
    }));
  }

  async summary(user: AuthRequestUser) {
    const scope = this.companyFilter(user);
    const [poTotal, masterCount, openIts, closedIts] = await Promise.all([
      this.prisma.purchaseOrder.count({ where: scope }),
      this.prisma.supplierMaster.count({ where: scope }),
      this.prisma.importShipment.count({ where: { ...scope, status: 'OPEN' } }),
      this.prisma.importShipment.count({ where: { ...scope, status: 'CLOSED' } }),
    ]);
    return {
      purchaseOrders: { total: poTotal },
      supplierMasters: masterCount,
      importTracking: { open: openIts, closed: closedIts },
      reportCount: REPORT_CATALOG.length,
    };
  }

  async filterOptions(user: AuthRequestUser) {
    const scope = this.companyFilter(user);
    const [masters, shipments] = await Promise.all([
      this.prisma.supplierMaster.findMany({
        where: scope,
        select: {
          shipperName: true,
          productCategory: true,
          division: true,
          country: true,
          countryOfOrigin: true,
          productHsCode: true,
          portOfLoading: true,
        },
      }),
      this.prisma.importShipment.findMany({
        where: scope,
        select: {
          paymentTerm: true,
          modeOfShipment: true,
          pol: true,
          division: true,
        },
      }),
    ]);

    const uniq = (vals: (string | null | undefined)[]) =>
      [...new Set(vals.map((v) => (v || '').trim()).filter(Boolean))].sort();

    return {
      suppliers: uniq(masters.map((m) => m.shipperName)),
      categories: uniq(masters.map((m) => m.productCategory)),
      divisions: uniq([
        ...masters.map((m) => m.division),
        ...shipments.map((s) => s.division),
      ]),
      countries: uniq([
        ...masters.map((m) => m.country),
        ...masters.map((m) => m.countryOfOrigin),
      ]),
      hsCodes: uniq(masters.map((m) => m.productHsCode)),
      pols: uniq([
        ...masters.map((m) => m.portOfLoading),
        ...shipments.map((s) => s.pol),
      ]),
      paymentTerms: uniq(shipments.map((s) => s.paymentTerm)),
      modes: uniq(shipments.map((s) => s.modeOfShipment)),
      statuses: ['DRAFT', 'SAVED', 'POSTED', 'OPEN', 'CLOSED'],
      shipVariance: ['SHORT', 'OVER', 'EXACT'],
    };
  }

  async run(user: AuthRequestUser, reportId: string, filters: ReportFilters) {
    const def = getReportDef(reportId);
    if (!def) throw new NotFoundException('Report not found');
    const rows = await this.buildRows(user, reportId, filters);
    return {
      id: def.id,
      title: def.title,
      group: def.group,
      description: def.description,
      columns: def.columns,
      filters,
      generatedAt: new Date().toISOString(),
      rowCount: rows.length,
      rows,
    };
  }

  async export(
    user: AuthRequestUser,
    reportId: string,
    format: string,
    filters: ReportFilters,
  ) {
    const def = getReportDef(reportId);
    if (!def) throw new NotFoundException('Report not found');
    const rows = await this.buildRows(user, reportId, filters);
    const note = this.filtersNote(filters);
    const safeName = def.title.replace(/[^\w\-]+/g, '_');
    const stamp = new Date().toISOString().slice(0, 10);

    if (format === 'csv') {
      const buf = toCsv(def.title, def.columns, rows);
      return {
        file: new StreamableFile(buf),
        filename: `${safeName}_${stamp}.csv`,
        contentType: 'text/csv; charset=utf-8',
      };
    }
    if (format === 'xlsx' || format === 'excel') {
      const buf = await toXlsx(def.title, def.columns, rows, note);
      return {
        file: new StreamableFile(buf),
        filename: `${safeName}_${stamp}.xlsx`,
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
    }
    if (format === 'pdf') {
      const buf = await toPdf(def.title, def.columns, rows, note);
      return {
        file: new StreamableFile(buf),
        filename: `${safeName}_${stamp}.pdf`,
        contentType: 'application/pdf',
      };
    }
    throw new BadRequestException('format must be csv, xlsx, or pdf');
  }

  private filtersNote(f: ReportFilters) {
    const parts = Object.entries(f)
      .filter(([, v]) => v != null && String(v).trim() !== '')
      .map(([k, v]) => `${k}=${v}`);
    const base = `Generated ${new Date().toLocaleString()} · Nexus ERP`;
    return parts.length ? `${base} · Filters: ${parts.join(', ')}` : base;
  }

  private async buildRows(
    user: AuthRequestUser,
    reportId: string,
    f: ReportFilters,
  ): Promise<Record<string, unknown>[]> {
    const scope = this.companyFilter(user);
    switch (reportId) {
      case 'purchase-orders':
        return this.purchaseOrders(scope, f);
      case 'supplier-master':
        return this.supplierMaster(scope, f);
      case 'import-open':
        return this.importShipments(scope, f, 'OPEN');
      case 'import-closed':
        return this.importShipments(scope, f, 'CLOSED');
      case 'history-purchase':
        return this.historyPurchase(scope, f);
      case 'history-payment':
        return this.historyPayment(scope, f);
      case 'history-operational':
        return this.historyOperational(scope, f);
      case 'analytics-suppliers-category':
        return this.analyticsSuppliersCategory(scope, f);
      case 'analytics-orders-supplier':
        return this.analyticsOrdersSupplier(scope, f);
      case 'analytics-certifications':
        return this.analyticsCertifications(scope, f);
      case 'analytics-supplier-status':
        return this.analyticsSupplierStatus(scope, f);
      case 'analytics-hs-pol':
        return this.analyticsHsPol(scope, f);
      case 'analytics-po-variance':
        return this.analyticsPoVariance(scope, f);
      case 'analytics-division':
        return this.analyticsDivision(scope, f);
      case 'analytics-payments':
        return this.analyticsPayments(scope, f);
      case 'analytics-lead-time':
        return this.analyticsLeadTime(scope, f);
      case 'analytics-qc':
        return this.analyticsQc(scope, f);
      case 'analytics-claims':
        return this.analyticsClaims(scope, f);
      case 'analytics-development-air-courier':
        return this.analyticsDevelopmentAirCourier(scope, f);
      case 'analytics-dashboard-quarterly':
        return this.analyticsDashboardQuarterly(scope, f);
      default:
        throw new NotFoundException('Report not found');
    }
  }

  private async purchaseOrders(
    scope: { companyId?: string },
    f: ReportFilters,
  ) {
    const where: Prisma.PurchaseOrderWhereInput = { ...scope };
    if (f.status) where.status = f.status as never;
    if (f.supplier) where.shipperName = { contains: f.supplier };
    if (f.q) {
      where.OR = [
        { poNumber: { contains: f.q } },
        { shipperName: { contains: f.q } },
        { hsCode: { contains: f.q } },
      ];
    }
    const rows = await this.prisma.purchaseOrder.findMany({
      where,
      include: { _count: { select: { lines: true } } },
      orderBy: { poDate: 'desc' },
    });
    return rows
      .filter((r) => inRange(r.poDate, f.from, f.to))
      .map((r) => ({
        poNumber: r.poNumber,
        poDate: dstr(r.poDate),
        status: r.status,
        shipperName: r.shipperName,
        originOfGoods: r.originOfGoods,
        shipVia: r.shipVia,
        hsCode: r.hsCode,
        incoterms: r.incoterms,
        currency: r.currency,
        grandTotal: r.grandTotal,
        lineCount: r._count.lines,
      }));
  }

  private async supplierMaster(
    scope: { companyId?: string },
    f: ReportFilters,
  ) {
    const where: Prisma.SupplierMasterWhereInput = { ...scope };
    if (f.supplier) where.shipperName = { contains: f.supplier };
    if (f.category) where.productCategory = { contains: f.category };
    if (f.division) where.division = { contains: f.division };
    if (f.country) {
      where.OR = [
        { country: { contains: f.country } },
        { countryOfOrigin: { contains: f.country } },
      ];
    }
    if (f.hsCode) where.productHsCode = { contains: f.hsCode };
    if (f.pol) where.portOfLoading = { contains: f.pol };
    if (f.q) {
      where.OR = [
        ...(where.OR || []),
        { purchaseOrderNo: { contains: f.q } },
        { productDescription: { contains: f.q } },
        { productItemCode: { contains: f.q } },
      ];
    }
    const rows = await this.prisma.supplierMaster.findMany({
      where,
      orderBy: { srNo: 'asc' },
    });
    return rows
      .filter((r) => inRange(r.entryDate, f.from, f.to))
      .map((r) => ({
        srNo: r.srNo,
        purchaseOrderNo: r.purchaseOrderNo,
        entryDate: dstr(r.entryDate),
        shipperName: r.shipperName,
        productCategory: r.productCategory,
        division: r.division,
        productItemCode: r.productItemCode,
        productHsCode: r.productHsCode,
        countryOfOrigin: r.countryOfOrigin,
        unitValue: r.unitValue,
        totalQuantity: r.totalQuantity,
        totalValue: r.totalValue,
        leadTimeDays: r.leadTimeDays,
        portOfLoading: r.portOfLoading,
        oekotexCert: r.oekotexCert,
        isoCert: r.isoCert,
        reachCert: r.reachCert,
        poCompleted: r.poCompleted ? 'Yes' : 'No',
      }));
  }

  private async importShipments(
    scope: { companyId?: string },
    f: ReportFilters,
    status: 'OPEN' | 'CLOSED',
  ) {
    const where: Prisma.ImportShipmentWhereInput = { ...scope, status };
    if (f.supplier) where.shipperName = { contains: f.supplier };
    if (f.division) where.division = { contains: f.division };
    if (f.category) where.category = { contains: f.category };
    if (f.modeOfShipment) where.modeOfShipment = { contains: f.modeOfShipment };
    if (f.paymentTerm) where.paymentTerm = { contains: f.paymentTerm };
    if (f.pol) where.pol = { contains: f.pol };
    if (f.q) {
      where.OR = [
        { purchaseOrderNo: { contains: f.q } },
        { productDescription: { contains: f.q } },
        { bankName: { contains: f.q } },
      ];
    }
    const rows = await this.prisma.importShipment.findMany({
      where,
      orderBy: { srNo: 'asc' },
    });
    return rows
      .filter((r) => inRange(r.purchaseOrderDate || r.createdAt, f.from, f.to))
      .map((r) => ({
        srNo: r.srNo,
        purchaseOrderNo: r.purchaseOrderNo,
        division: r.division,
        category: r.category,
        shipperName: r.shipperName,
        productDescription: r.productDescription,
        poQuantity: r.poQuantity,
        quantityShipped: r.quantityShipped,
        unitValue: r.unitValue,
        totalAmount: r.totalAmount,
        paymentTerm: r.paymentTerm,
        modeOfShipment: r.modeOfShipment,
        incoterm: r.incoterm,
        pol: r.pol,
        destinationPort: r.destinationPort,
        actualShipmentReadyDate: dstr(r.actualShipmentReadyDate),
        remarks: r.remarks,
        bankName: r.bankName || r.bank,
        bankTtLcNumber: r.bankTtLcNumber,
        bankRoe: r.bankRoe,
        qcRejectedQty: r.qcRejectedQty,
        qcMaterialFinancialLoss: r.qcMaterialFinancialLoss,
        insuranceCompany: r.insuranceCompany,
        forwarder: r.forwarder,
        gdNo: r.gdNo,
        shipmentClearanceDate: dstr(r.shipmentClearanceDate),
        clearanceAmount: r.clearanceAmount,
        delayCause: r.delayCause,
      }));
  }

  private async joinedMasterIts(scope: { companyId?: string }) {
    return this.prisma.supplierMaster.findMany({
      where: scope,
      include: { importShipments: { orderBy: { updatedAt: 'desc' } } },
      orderBy: { srNo: 'asc' },
    });
  }

  private pickIts(
    shipments: {
      status: string;
      updatedAt: Date;
    }[],
  ) {
    return (
      shipments.find((s) => s.status === 'CLOSED') ||
      shipments.find((s) => s.status === 'OPEN') ||
      null
    );
  }

  private async historyPurchase(
    scope: { companyId?: string },
    f: ReportFilters,
  ) {
    const masters = await this.joinedMasterIts(scope);
    const out: Record<string, unknown>[] = [];
    let sr = 1;
    for (const m of masters) {
      if (!inRange(m.entryDate, f.from, f.to)) continue;
      if (!contains(m.shipperName, f.supplier)) continue;
      if (!contains(m.productCategory || m.division, f.category)) continue;
      const its = this.pickIts(m.importShipments) as
        | (typeof m.importShipments)[number]
        | null;
      const amount = Number(its?.totalAmount || m.totalValue || 0);
      const roe = Number(its?.bankRoe || 0);
      const blob = [
        m.purchaseOrderNo,
        m.shipperName,
        m.productDescription,
        m.productHsCode,
      ].join(' ');
      if (!contains(blob, f.q)) continue;
      out.push({
        srNo: sr++,
        category: m.productCategory || its?.category || '',
        hsCode: m.productHsCode,
        month: its?.monthLabel || monthName(m.ppcDemandDate || m.entryDate),
        productItemCode: m.productItemCode,
        purchaseOrderNo: m.purchaseOrderNo,
        poDate: dstr(m.entryDate),
        supplier: m.shipperName,
        description: m.productDescription,
        countryOfOrigin: m.countryOfOrigin,
        quantity: Number(its?.quantityShipped || m.totalQuantity || 0),
        unitPrice: Number(its?.unitValue || m.unitValue || 0),
        amount,
        paymentBankRef: its?.bankTtLcNumber || its?.bankName || its?.bank || '',
        modeOfShipment: its?.modeOfShipment || '',
        priceTerm: its?.incoterm || '',
        roe,
        valueInPkr: Number((amount * roe).toFixed(2)),
      });
    }
    return out;
  }

  private async historyPayment(
    scope: { companyId?: string },
    f: ReportFilters,
  ) {
    const purchase = await this.historyPurchase(scope, f);
    const masters = await this.joinedMasterIts(scope);
    const payTermByPo = new Map<string, string>();
    for (const m of masters) {
      const its = this.pickIts(m.importShipments) as
        | (typeof m.importShipments)[number]
        | null;
      if (its) payTermByPo.set(m.purchaseOrderNo, its.paymentTerm || '');
    }
    return purchase
      .filter((r) => contains(String(payTermByPo.get(String(r.purchaseOrderNo)) || ''), f.paymentTerm))
      .map((r, i) => ({
        ...r,
        srNo: i + 1,
        paymentTerm: payTermByPo.get(String(r.purchaseOrderNo)) || '',
      }));
  }

  private async historyOperational(
    scope: { companyId?: string },
    f: ReportFilters,
  ) {
    const masters = await this.joinedMasterIts(scope);
    const out: Record<string, unknown>[] = [];
    let sr = 1;
    for (const m of masters) {
      if (!inRange(m.entryDate, f.from, f.to)) continue;
      if (!contains(m.shipperName, f.supplier)) continue;
      const its = this.pickIts(m.importShipments) as
        | (typeof m.importShipments)[number]
        | null;
      if (!contains(its?.modeOfShipment || '', f.modeOfShipment)) continue;
      if (!contains([m.purchaseOrderNo, m.shipperName].join(' '), f.q)) continue;
      const lead = m.leadTimeDays ?? its?.supplierDeliveryTime ?? null;
      const supplierDeliveryDate =
        lead != null ? addDays(m.entryDate, lead) : null;
      const actual = its?.actualShipmentReadyDate || null;
      const delayAgainst =
        supplierDeliveryDate && actual
          ? daysBetween(supplierDeliveryDate, actual)
          : null;
      const delayAbove = delayAgainst != null ? -delayAgainst : null;
      out.push({
        srNo: sr++,
        purchaseOrderNo: m.purchaseOrderNo,
        poDate: dstr(m.entryDate),
        supplier: m.shipperName,
        quantity: Number(its?.quantityShipped || m.totalQuantity || 0),
        leadTimeDays: lead,
        supplierDeliveryDate: dstr(supplierDeliveryDate),
        actualShipmentReadyDate: dstr(actual),
        ppSampleReadyDate: dstr(its?.ppSampleReadyDate),
        delay1to10:
          delayAbove != null && delayAbove >= 1 && delayAbove <= 10
            ? delayAbove
            : '',
        delay10to20:
          delayAbove != null && delayAbove >= 11 && delayAbove <= 20
            ? delayAbove
            : '',
        modeOfShipment: its?.modeOfShipment || '',
        liftedByAirDueToDelay:
          (its?.modeOfShipment || '').toUpperCase() === 'AIR' &&
          delayAbove != null &&
          delayAbove > 0
            ? 'Yes'
            : 'No',
      });
    }
    return out;
  }

  private async analyticsSuppliersCategory(
    scope: { companyId?: string },
    f: ReportFilters,
  ) {
    const rows = await this.prisma.supplierMaster.findMany({ where: scope });
    const map = new Map<
      string,
      { suppliers: Set<string>; pos: Set<string>; value: number; items: Set<string> }
    >();
    for (const m of rows) {
      if (!inRange(m.entryDate, f.from, f.to)) continue;
      if (!contains(m.productCategory, f.category)) continue;
      if (!contains(m.country || m.countryOfOrigin, f.country)) continue;
      const cat = m.productCategory || 'Unspecified';
      const bucket =
        map.get(cat) ||
        { suppliers: new Set(), pos: new Set(), value: 0, items: new Set() };
      bucket.suppliers.add(m.shipperName || 'Unknown');
      bucket.pos.add(m.purchaseOrderNo);
      bucket.value += Number(m.totalValue || 0);
      if (m.productItemCode) bucket.items.add(m.productItemCode);
      map.set(cat, bucket);
    }
    return [...map.entries()].map(([category, v]) => ({
      category,
      supplierCount: v.suppliers.size,
      poCount: v.pos.size,
      totalValue: Number(v.value.toFixed(2)),
      itemCodes: v.items.size,
    }));
  }

  private async analyticsOrdersSupplier(
    scope: { companyId?: string },
    f: ReportFilters,
  ) {
    const rows = await this.prisma.supplierMaster.findMany({ where: scope });
    const map = new Map<
      string,
      { poCount: number; qty: number; value: number; units: number[] }
    >();
    for (const m of rows) {
      if (!inRange(m.entryDate, f.from, f.to)) continue;
      if (!contains(m.shipperName, f.supplier)) continue;
      if (!contains(m.countryOfOrigin || m.country, f.country)) continue;
      if (!contains(m.productCategory, f.category)) continue;
      const key = `${m.shipperName}|${m.countryOfOrigin || m.country}|${m.productCategory}`;
      const b = map.get(key) || { poCount: 0, qty: 0, value: 0, units: [] };
      b.poCount += 1;
      b.qty += Number(m.totalQuantity || 0);
      b.value += Number(m.totalValue || 0);
      b.units.push(Number(m.unitValue || 0));
      map.set(key, b);
    }
    return [...map.entries()].map(([key, v]) => {
      const [supplier, country, category] = key.split('|');
      const avg =
        v.units.length > 0
          ? v.units.reduce((a, b) => a + b, 0) / v.units.length
          : 0;
      return {
        supplier,
        country,
        category,
        poCount: v.poCount,
        totalQty: Number(v.qty.toFixed(2)),
        avgUnitValue: Number(avg.toFixed(4)),
        totalValue: Number(v.value.toFixed(2)),
      };
    });
  }

  private async analyticsCertifications(
    scope: { companyId?: string },
    f: ReportFilters,
  ) {
    const rows = await this.prisma.supplierMaster.findMany({
      where: scope,
      orderBy: { updatedAt: 'desc' },
    });
    const seen = new Set<string>();
    const out: Record<string, unknown>[] = [];
    for (const m of rows) {
      if (!contains(m.productCategory, f.category)) continue;
      if (!contains(m.shipperName, f.supplier)) continue;
      if (!contains(m.country || m.countryOfOrigin, f.country)) continue;
      const key = `${m.shipperName}|${m.productCategory}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        shipperName: m.shipperName,
        productCategory: m.productCategory,
        country: m.countryOfOrigin || m.country,
        oekotexCert: m.oekotexCert,
        isoCert: m.isoCert,
        reachCert: m.reachCert,
        purchaseOrderNo: m.purchaseOrderNo,
      });
    }
    return out;
  }

  private async analyticsSupplierStatus(
    scope: { companyId?: string },
    f: ReportFilters,
  ) {
    const rows = await this.prisma.supplierMaster.findMany({ where: scope });
    const map = new Map<string, { count: number; value: number }>();
    for (const m of rows) {
      if (!contains(m.productCategory, f.category)) continue;
      if (!contains(m.country || m.countryOfOrigin, f.country)) continue;
      const key = `${m.productCategory || 'Unspecified'}|${m.supplierCategory || 'Unspecified'}`;
      const b = map.get(key) || { count: 0, value: 0 };
      b.count += 1;
      b.value += Number(m.totalValue || 0);
      map.set(key, b);
    }
    return [...map.entries()].map(([key, v]) => {
      const [productCategory, supplierCategory] = key.split('|');
      return {
        productCategory,
        supplierCategory,
        count: v.count,
        totalValue: Number(v.value.toFixed(2)),
      };
    });
  }

  private async analyticsHsPol(
    scope: { companyId?: string },
    f: ReportFilters,
  ) {
    const rows = await this.prisma.supplierMaster.findMany({ where: scope });
    const map = new Map<string, { shipments: number; qty: number; value: number }>();
    for (const m of rows) {
      if (!inRange(m.entryDate, f.from, f.to)) continue;
      if (!contains(m.productHsCode, f.hsCode)) continue;
      if (!contains(m.portOfLoading, f.pol)) continue;
      if (!contains(m.productCategory, f.category)) continue;
      const key = `${m.productHsCode || '—'}|${m.portOfLoading || '—'}`;
      const b = map.get(key) || { shipments: 0, qty: 0, value: 0 };
      b.shipments += 1;
      b.qty += Number(m.totalQuantity || 0);
      b.value += Number(m.totalValue || 0);
      map.set(key, b);
    }
    return [...map.entries()].map(([key, v]) => {
      const [productHsCode, portOfLoading] = key.split('|');
      return {
        productHsCode,
        portOfLoading,
        shipments: v.shipments,
        totalQty: Number(v.qty.toFixed(2)),
        totalValue: Number(v.value.toFixed(2)),
      };
    });
  }

  private async analyticsPoVariance(
    scope: { companyId?: string },
    f: ReportFilters,
  ) {
    const masters = await this.joinedMasterIts(scope);
    const out: Record<string, unknown>[] = [];
    for (const m of masters) {
      if (!inRange(m.entryDate, f.from, f.to)) continue;
      if (!contains(m.shipperName, f.supplier)) continue;
      const its = this.pickIts(m.importShipments) as
        | (typeof m.importShipments)[number]
        | null;
      const poQty = Number(its?.poQuantity || m.totalQuantity || 0);
      const shipped = Number(its?.quantityShipped || 0);
      const variance = Number((shipped - poQty).toFixed(4));
      let shipFlag = 'NONE';
      if (shipped > 0) {
        if (shipped < poQty) shipFlag = 'SHORT';
        else if (shipped > poQty) shipFlag = 'OVER';
        else shipFlag = 'EXACT';
      }
      if (f.shipVariance && shipFlag !== f.shipVariance.toUpperCase()) continue;
      if (f.status) {
        const st = (its?.status || (m.poCompleted ? 'CLOSED' : 'OPEN')).toUpperCase();
        if (st !== f.status.toUpperCase()) continue;
      }
      out.push({
        purchaseOrderNo: m.purchaseOrderNo,
        poDate: dstr(m.entryDate),
        shipperName: m.shipperName,
        masterDone: m.poCompleted ? 'Yes' : 'No',
        itsStatus: its?.status || '—',
        poQuantity: poQty,
        quantityShipped: shipped,
        variance,
        shipFlag,
      });
    }
    return out;
  }

  private async analyticsDivision(
    scope: { companyId?: string },
    f: ReportFilters,
  ) {
    const rows = await this.prisma.supplierMaster.findMany({ where: scope });
    const map = new Map<string, { poCount: number; value: number }>();
    for (const m of rows) {
      if (!inRange(m.entryDate, f.from, f.to)) continue;
      if (!contains(m.division, f.division)) continue;
      if (!contains(m.productCategory, f.category)) continue;
      const month = monthName(m.entryDate);
      const key = `${m.division || 'Unspecified'}|${month}`;
      const b = map.get(key) || { poCount: 0, value: 0 };
      b.poCount += 1;
      b.value += Number(m.totalValue || 0);
      map.set(key, b);
    }
    return [...map.entries()].map(([key, v]) => {
      const [division, month] = key.split('|');
      return {
        division,
        month,
        poCount: v.poCount,
        totalValue: Number(v.value.toFixed(2)),
      };
    });
  }

  private async analyticsPayments(
    scope: { companyId?: string },
    f: ReportFilters,
  ) {
    const rows = await this.prisma.importShipment.findMany({
      where: scope,
      orderBy: { srNo: 'asc' },
    });
    return rows
      .filter((r) => inRange(r.purchaseOrderDate || r.bankDate, f.from, f.to))
      .filter((r) => contains(r.paymentTerm, f.paymentTerm))
      .filter((r) => contains(r.shipperName, f.supplier))
      .filter((r) => contains(r.category, f.category))
      .map((r) => {
        const amount = Number(r.totalAmount || 0);
        const roe = Number(r.bankRoe || 0);
        return {
          purchaseOrderNo: r.purchaseOrderNo,
          shipperName: r.shipperName,
          category: r.category,
          paymentTerm: r.paymentTerm,
          bankName: r.bankName || r.bank,
          bankTtLcNumber: r.bankTtLcNumber,
          totalAmount: amount,
          bankRoe: roe,
          valuePkr: Number((amount * roe).toFixed(2)),
          gdNo: r.gdNo,
          daysGdToBank: daysBetween(r.bankDate, r.gdDate),
        };
      });
  }

  private async analyticsLeadTime(
    scope: { companyId?: string },
    f: ReportFilters,
  ) {
    const rows = await this.prisma.importShipment.findMany({
      where: scope,
      orderBy: { srNo: 'asc' },
    });
    return rows
      .filter((r) => inRange(r.purchaseOrderDate, f.from, f.to))
      .filter((r) => contains(r.shipperName, f.supplier))
      .filter((r) => contains(r.division, f.division))
      .filter((r) => contains(r.modeOfShipment, f.modeOfShipment))
      .map((r) => {
        const poDate = r.purchaseOrderDate;
        const lead = r.supplierDeliveryTime;
        const supplierDeliveryDate =
          poDate && lead != null ? addDays(poDate, lead) : null;
        const actual = r.actualShipmentReadyDate;
        const delayAgainst =
          supplierDeliveryDate && actual
            ? daysBetween(supplierDeliveryDate, actual)
            : null;
        const delayAbove = delayAgainst != null ? -delayAgainst : null;
        return {
          purchaseOrderNo: r.purchaseOrderNo,
          shipperName: r.shipperName,
          supplierDeliveryTime: lead,
          standardLeadTime: r.standardLeadTime,
          ppSampleReadyDate: dstr(r.ppSampleReadyDate),
          actualShipmentReadyDate: dstr(actual),
          delay1to10:
            delayAbove != null && delayAbove >= 1 && delayAbove <= 10
              ? delayAbove
              : '',
          delay10to20:
            delayAbove != null && delayAbove >= 11 && delayAbove <= 20
              ? delayAbove
              : '',
          modeOfShipment: r.modeOfShipment,
        };
      });
  }

  private async analyticsQc(scope: { companyId?: string }, f: ReportFilters) {
    const rows = await this.prisma.importShipment.findMany({
      where: { ...scope, status: 'CLOSED' },
      orderBy: { srNo: 'asc' },
    });
    return rows
      .filter((r) => inRange(r.qcReportReceivedDate || r.purchaseOrderDate, f.from, f.to))
      .filter((r) => contains(r.shipperName, f.supplier))
      .filter((r) => contains(r.category, f.category))
      .map((r) => ({
        purchaseOrderNo: r.purchaseOrderNo,
        shipperName: r.shipperName,
        category: r.category,
        qcOrderQty: r.qcOrderQty,
        qcRejectedQty: r.qcRejectedQty,
        qcLessQty: r.qcLessQty,
        qcMaterialFinancialLoss: r.qcMaterialFinancialLoss,
        qcReportReceivedDate: dstr(r.qcReportReceivedDate),
        qcClaimDate: dstr(r.qcClaimDate),
      }));
  }

  private claimStatus(r: {
    qcClaimDate: Date | null;
    qcRejectedQty: number;
    qcLessQty: number;
    qcMaterialFinancialLoss: number;
  }) {
    if (!r.qcClaimDate && !r.qcRejectedQty && !r.qcLessQty && !r.qcMaterialFinancialLoss) {
      return '';
    }
    if (r.qcClaimDate && r.qcRejectedQty > 0 && r.qcMaterialFinancialLoss <= 0) {
      return 'LAUNCHED';
    }
    if (r.qcClaimDate && r.qcMaterialFinancialLoss > 0) {
      return 'ACCEPTED';
    }
    if (r.qcClaimDate && r.qcRejectedQty <= 0 && r.qcLessQty <= 0) {
      return 'RECEIVED';
    }
    if (r.qcRejectedQty > 0 && !r.qcClaimDate) {
      return 'REJECTED';
    }
    return 'LAUNCHED';
  }

  private async analyticsClaims(scope: { companyId?: string }, f: ReportFilters) {
    const rows = await this.prisma.importShipment.findMany({
      where: { ...scope, status: 'CLOSED' },
      orderBy: { srNo: 'asc' },
    });
    return rows
      .filter((r) => inRange(r.qcClaimDate || r.qcReportReceivedDate || r.purchaseOrderDate, f.from, f.to))
      .filter((r) => contains(r.shipperName, f.supplier))
      .filter((r) => contains(r.category, f.category))
      .map((r) => {
        const claimStatus = this.claimStatus(r);
        return {
          purchaseOrderNo: r.purchaseOrderNo,
          shipperName: r.shipperName,
          category: r.category,
          claimStatus,
          qcClaimDate: dstr(r.qcClaimDate),
          qcRejectedQty: r.qcRejectedQty,
          qcLessQty: r.qcLessQty,
          claimExpenses: r.qcMaterialFinancialLoss,
          qcReportReceivedDate: dstr(r.qcReportReceivedDate),
          remarks: r.remarks,
        };
      })
      .filter((r) => r.claimStatus)
      .filter((r) => !f.status || contains(r.claimStatus, f.status));
  }

  private async analyticsDevelopmentAirCourier(
    scope: { companyId?: string },
    f: ReportFilters,
  ) {
    const rows = await this.prisma.importShipment.findMany({
      where: scope,
      orderBy: { srNo: 'asc' },
    });
    return rows
      .filter((r) => {
        const mode = (r.modeOfShipment || '').toUpperCase();
        return mode.includes('AIR') || mode.includes('COURIER');
      })
      .filter((r) => inRange(r.purchaseOrderDate, f.from, f.to))
      .filter((r) => contains(r.shipperName, f.supplier))
      .filter((r) => contains(r.division, f.division))
      .filter((r) => !f.modeOfShipment || contains(r.modeOfShipment, f.modeOfShipment))
      .map((r) => {
        const mode = (r.modeOfShipment || '').toUpperCase();
        const delayHint =
          mode.includes('AIR') && (r.remarks || '').toLowerCase().includes('delay');
        return {
          purchaseOrderNo: r.purchaseOrderNo,
          shipperName: r.shipperName,
          division: r.division,
          modeOfShipment: r.modeOfShipment,
          quantityShipped: r.quantityShipped,
          totalAmount: r.totalAmount,
          forwarder: r.forwarder,
          logisticsBillNo: r.logisticsBillNo,
          logisticsWeightCbm: r.logisticsWeightCbm,
          logisticsAmount: r.logisticsAmount,
          liftedByAirDueToDelay: delayHint ? 'Yes' : 'No',
        };
      });
  }

  private async analyticsDashboardQuarterly(
    scope: { companyId?: string },
    f: ReportFilters,
  ) {
    const rows = await this.prisma.importShipment.findMany({
      where: scope,
      orderBy: { purchaseOrderDate: 'asc' },
    });
    const buckets = new Map<
      string,
      {
        period: string;
        openCount: number;
        closedCount: number;
        poCount: number;
        totalValue: number;
        qcLoss: number;
        airCourierCount: number;
        logisticsSpend: number;
        pos: Set<string>;
      }
    >();

    for (const r of rows) {
      if (!inRange(r.purchaseOrderDate, f.from, f.to)) continue;
      if (!contains(r.shipperName, f.supplier)) continue;
      if (!contains(r.category || r.division, f.category)) continue;
      if (!contains(r.division, f.division)) continue;
      const dt = r.purchaseOrderDate || r.createdAt;
      const y = dt.getUTCFullYear();
      const q = Math.floor(dt.getUTCMonth() / 3) + 1;
      const period = `${y}-Q${q}`;
      let b = buckets.get(period);
      if (!b) {
        b = {
          period,
          openCount: 0,
          closedCount: 0,
          poCount: 0,
          totalValue: 0,
          qcLoss: 0,
          airCourierCount: 0,
          logisticsSpend: 0,
          pos: new Set(),
        };
        buckets.set(period, b);
      }
      if (r.status === 'OPEN') b.openCount += 1;
      else b.closedCount += 1;
      b.pos.add(r.purchaseOrderNo);
      b.totalValue += Number(r.totalAmount || 0);
      b.qcLoss += Number(r.qcMaterialFinancialLoss || 0);
      b.logisticsSpend += Number(r.logisticsAmount || 0);
      const mode = (r.modeOfShipment || '').toUpperCase();
      if (mode.includes('AIR') || mode.includes('COURIER')) b.airCourierCount += 1;
    }

    return [...buckets.values()]
      .sort((a, b) => a.period.localeCompare(b.period))
      .map((b) => ({
        period: b.period,
        openCount: b.openCount,
        closedCount: b.closedCount,
        poCount: b.pos.size,
        totalValue: Number(b.totalValue.toFixed(2)),
        qcLoss: Number(b.qcLoss.toFixed(2)),
        airCourierCount: b.airCourierCount,
        logisticsSpend: Number(b.logisticsSpend.toFixed(2)),
      }));
  }
}
