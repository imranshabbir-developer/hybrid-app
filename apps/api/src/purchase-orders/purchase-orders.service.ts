import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { Prisma, PurchaseOrderStatus } from '@prisma/client';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../prisma/prisma.service';
import { AuthRequestUser } from '../auth/jwt-auth.guard';
import { UpsertPurchaseOrderDto } from './dto/upsert-purchase-order.dto';

@Injectable()
export class PurchaseOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  private scopeWhere(user: AuthRequestUser): Prisma.PurchaseOrderWhereInput {
    if (user.role === 'ADMIN') return {};
    if (!user.companyId) {
      throw new ForbiddenException('Company account is not linked');
    }
    return { companyId: user.companyId };
  }

  private normalizeLines(lines: UpsertPurchaseOrderDto['lines']) {
    const normalized = (lines || [])
      .map((line, index) => {
        const quantity = Number(line.quantity || 0);
        const unitPrice = Number(line.unitPrice || 0);
        const itemCode = (line.itemCode || '').trim();
        const description = (line.description || '').trim();
        const lineTotal = Number((quantity * unitPrice).toFixed(4));
        return {
          lineNo: index + 1,
          itemCode,
          description,
          quantity,
          unitPrice,
          lineTotal,
        };
      })
      .filter(
        (l) =>
          l.itemCode ||
          l.description ||
          l.quantity > 0 ||
          l.unitPrice > 0,
      );

    while (normalized.length < 1) {
      normalized.push({
        lineNo: 1,
        itemCode: '',
        description: '',
        quantity: 0,
        unitPrice: 0,
        lineTotal: 0,
      });
    }

    const grandTotal = Number(
      normalized.reduce((sum, l) => sum + l.lineTotal, 0).toFixed(4),
    );

    return { normalized, grandTotal };
  }

  async list(user: AuthRequestUser) {
    return this.prisma.purchaseOrder.findMany({
      where: this.scopeWhere(user),
      include: {
        lines: { orderBy: { lineNo: 'asc' } },
        company: { select: { id: true, code: true, name: true } },
        createdBy: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: [{ poDate: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async getOne(user: AuthRequestUser, id: string) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, ...this.scopeWhere(user) },
      include: {
        lines: { orderBy: { lineNo: 'asc' } },
        company: { select: { id: true, code: true, name: true } },
        createdBy: { select: { id: true, fullName: true, email: true } },
      },
    });
    if (!po) throw new NotFoundException('Purchase order not found');
    return po;
  }

  async create(user: AuthRequestUser, dto: UpsertPurchaseOrderDto) {
    const poNumber = dto.poNumber.trim();
    if (!poNumber) throw new BadRequestException('PO # is required');

    const existing = await this.prisma.purchaseOrder.findUnique({
      where: { poNumber },
    });
    if (existing) {
      throw new BadRequestException(`PO # ${poNumber} already exists`);
    }

    const { normalized, grandTotal } = this.normalizeLines(dto.lines);
    const status = (dto.status || 'SAVED') as PurchaseOrderStatus;

    return this.prisma.purchaseOrder.create({
      data: {
        poNumber,
        poDate: new Date(dto.poDate),
        status,
        companyName: dto.companyName || '',
        companyStreet: dto.companyStreet || '',
        companyCity: dto.companyCity || '',
        companyPhone: dto.companyPhone || '',
        companyFax: dto.companyFax || '',
        companyWebsite: dto.companyWebsite || '',
        beneficiaryName: dto.beneficiaryName || '',
        beneficiaryContact: dto.beneficiaryContact || '',
        beneficiaryStreet: dto.beneficiaryStreet || '',
        beneficiaryCity: dto.beneficiaryCity || '',
        beneficiaryPhone: dto.beneficiaryPhone || '',
        beneficiaryFax: dto.beneficiaryFax || '',
        shipperName: dto.shipperName || '',
        shipperContact: dto.shipperContact || '',
        shipperStreet: dto.shipperStreet || '',
        shipperCity: dto.shipperCity || '',
        shipperPhone: dto.shipperPhone || '',
        shipperFax: dto.shipperFax || '',
        consigneeName: dto.consigneeName || '',
        consigneeCompany: dto.consigneeCompany || '',
        consigneeStreet: dto.consigneeStreet || '',
        consigneeCity: dto.consigneeCity || '',
        consigneePhone: dto.consigneePhone || '',
        originOfGoods: dto.originOfGoods || '',
        shipVia: dto.shipVia || '',
        hsCode: dto.hsCode || '',
        incoterms: dto.incoterms || 'FOB',
        tolerance: dto.tolerance || '5%',
        currency: dto.currency || 'USD',
        comments: dto.comments || '',
        contactFooter: dto.contactFooter || '',
        grandTotal,
        companyId: user.companyId,
        createdById: user.userId,
        lines: { create: normalized },
      },
      include: {
        lines: { orderBy: { lineNo: 'asc' } },
        company: { select: { id: true, code: true, name: true } },
      },
    });
  }

  async update(user: AuthRequestUser, id: string, dto: UpsertPurchaseOrderDto) {
    const current = await this.getOne(user, id);
    const poNumber = dto.poNumber.trim();

    if (poNumber !== current.poNumber) {
      const clash = await this.prisma.purchaseOrder.findUnique({
        where: { poNumber },
      });
      if (clash) {
        throw new BadRequestException(`PO # ${poNumber} already exists`);
      }
    }

    const { normalized, grandTotal } = this.normalizeLines(dto.lines);
    const status = (dto.status || current.status) as PurchaseOrderStatus;

    await this.prisma.purchaseOrderLine.deleteMany({
      where: { purchaseOrderId: id },
    });

    return this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        poNumber,
        poDate: new Date(dto.poDate),
        status,
        companyName: dto.companyName || '',
        companyStreet: dto.companyStreet || '',
        companyCity: dto.companyCity || '',
        companyPhone: dto.companyPhone || '',
        companyFax: dto.companyFax || '',
        companyWebsite: dto.companyWebsite || '',
        beneficiaryName: dto.beneficiaryName || '',
        beneficiaryContact: dto.beneficiaryContact || '',
        beneficiaryStreet: dto.beneficiaryStreet || '',
        beneficiaryCity: dto.beneficiaryCity || '',
        beneficiaryPhone: dto.beneficiaryPhone || '',
        beneficiaryFax: dto.beneficiaryFax || '',
        shipperName: dto.shipperName || '',
        shipperContact: dto.shipperContact || '',
        shipperStreet: dto.shipperStreet || '',
        shipperCity: dto.shipperCity || '',
        shipperPhone: dto.shipperPhone || '',
        shipperFax: dto.shipperFax || '',
        consigneeName: dto.consigneeName || '',
        consigneeCompany: dto.consigneeCompany || '',
        consigneeStreet: dto.consigneeStreet || '',
        consigneeCity: dto.consigneeCity || '',
        consigneePhone: dto.consigneePhone || '',
        originOfGoods: dto.originOfGoods || '',
        shipVia: dto.shipVia || '',
        hsCode: dto.hsCode || '',
        incoterms: dto.incoterms || 'FOB',
        tolerance: dto.tolerance || '5%',
        currency: dto.currency || 'USD',
        comments: dto.comments || '',
        contactFooter: dto.contactFooter || '',
        grandTotal,
        lines: { create: normalized },
      },
      include: {
        lines: { orderBy: { lineNo: 'asc' } },
        company: { select: { id: true, code: true, name: true } },
      },
    });
  }

  async remove(user: AuthRequestUser, id: string) {
    await this.getOne(user, id);
    await this.prisma.purchaseOrder.delete({ where: { id } });
    return { ok: true };
  }

  async printPdf(user: AuthRequestUser, id: string) {
    const po = await this.getOne(user, id);
    const buf = await new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fillColor('#0f766e').fontSize(18).text('PURCHASE ORDER FORMAT');
      doc.moveDown(0.4);
      doc.fillColor('#0f172a').fontSize(11).text(po.companyName || 'Company');
      doc.fontSize(9).fillColor('#475569');
      [po.companyStreet, po.companyCity, po.companyPhone, po.companyWebsite]
        .filter(Boolean)
        .forEach((line) => doc.text(String(line)));

      doc.moveDown();
      doc.fillColor('#0f172a').fontSize(11);
      doc.text(`PO #: ${po.poNumber}`);
      doc.text(`Date: ${String(po.poDate).slice(0, 10)}`);
      doc.text(`Status: ${po.status}`);
      doc.moveDown();

      const party = (title: string, lines: Array<string | null | undefined>) => {
        doc.fillColor('#0f766e').fontSize(10).text(title);
        doc.fillColor('#0f172a').fontSize(9);
        lines.filter(Boolean).forEach((l) => doc.text(String(l)));
        doc.moveDown(0.45);
      };

      party('Beneficiary', [
        po.beneficiaryName,
        po.beneficiaryContact,
        po.beneficiaryStreet,
        po.beneficiaryCity,
        po.beneficiaryPhone,
      ]);
      party('Shipper', [
        po.shipperName,
        po.shipperContact,
        po.shipperStreet,
        po.shipperCity,
        po.shipperPhone,
      ]);
      party('Consignee', [
        po.consigneeName,
        po.consigneeCompany,
        po.consigneeStreet,
        po.consigneeCity,
        po.consigneePhone,
      ]);

      doc.fillColor('#0f766e').fontSize(10).text('Shipment / Commercial');
      doc.fillColor('#0f172a').fontSize(9);
      doc.text(
        `Origin: ${po.originOfGoods || '—'} | Ship Via: ${po.shipVia || '—'} | HS: ${po.hsCode || '—'}`,
      );
      doc.text(
        `Incoterms: ${po.incoterms || '—'} | Tolerance: ${po.tolerance || '—'} | Currency: ${po.currency || '—'}`,
      );
      doc.moveDown();

      doc.fillColor('#0f766e').fontSize(10).text('Line Items');
      doc.moveDown(0.2);
      doc.fillColor('#0f172a').fontSize(8);
      for (const line of po.lines) {
        doc.text(
          `${line.lineNo}. [${line.itemCode || '-'}] ${line.description || ''} | Qty ${line.quantity} x ${line.unitPrice} = ${line.lineTotal}`,
        );
      }

      doc.moveDown();
      doc.fontSize(12).text(`Grand Total: ${po.grandTotal} ${po.currency || ''}`);
      if (po.comments) {
        doc.moveDown();
        doc.fillColor('#0f766e').fontSize(10).text('Comments');
        doc.fillColor('#0f172a').fontSize(9).text(po.comments);
      }
      if (po.contactFooter) {
        doc.moveDown();
        doc.fillColor('#64748b').fontSize(8).text(po.contactFooter);
      }
      doc.end();
    });

    return {
      file: new StreamableFile(buf),
      filename: `PO-${po.poNumber}.pdf`,
      contentType: 'application/pdf',
    };
  }
}
