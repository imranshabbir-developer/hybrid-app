/**
 * Seeds 3 end-to-end demo pipelines into SQLite AND PostgreSQL.
 * Real rows (not UI mocks): PO → Entry → Master → ITS (open/closed).
 */
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const { PrismaClient: SqliteClient } = require('@prisma/client');
const { PrismaClient: PostgresClient } = require('../node_modules/.prisma/postgres-client');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../apps/api/.env') });

const dataDir = path.resolve(__dirname, '../data');
const sqliteFile = path.join(dataDir, 'erp.sqlite');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const demos = [
  {
    poNumber: 'DEMO-PO-1001',
    shipper: 'Samtex Textiles',
    city: 'Seoul',
    origin: 'Korea',
    shipVia: 'Air',
    hs: '5407.61',
    item: 'FAB-DEMO-01',
    desc: 'Polyester stretch fabric sample lot',
    qty: 500,
    unit: 2.45,
    category: 'Fabrics',
    division: 'Garments',
    lead: 45,
    pol: 'Busan',
    statusIts: 'CLOSED',
    mode: 'AIR',
    payment: 'LC',
    bankName: 'HBL',
    bankRef: 'LC-DEMO-1001',
    roe: 278.5,
    delayDays: 7,
  },
  {
    poNumber: 'DEMO-PO-1002',
    shipper: 'YKK Accessories Co',
    city: 'Tokyo',
    origin: 'Japan',
    shipVia: 'Sea',
    hs: '9607.11',
    item: 'ACC-DEMO-02',
    desc: 'Metal zipper assortment #5',
    qty: 12000,
    unit: 0.18,
    category: 'Accessories',
    division: 'Garments',
    lead: 60,
    pol: 'Yokohama',
    statusIts: 'OPEN',
    mode: 'SEA',
    payment: 'O/A',
    bankName: 'MCB',
    bankRef: '',
    roe: 0,
    delayDays: 0,
  },
  {
    poNumber: 'DEMO-PO-1003',
    shipper: 'ChemTech Dyes Ltd',
    city: 'Shanghai',
    origin: 'China',
    shipVia: 'Sea',
    hs: '3204.11',
    item: 'CHM-DEMO-03',
    desc: 'Reactive dye blue R-19',
    qty: 800,
    unit: 6.75,
    category: 'Dyes and chemicals',
    division: 'Processing',
    lead: 50,
    pol: 'Shanghai',
    statusIts: 'CLOSED',
    mode: 'SEA',
    payment: 'ADV',
    bankName: 'UBL',
    bankRef: 'TT-DEMO-1003',
    roe: 279.1,
    delayDays: 12,
  },
];

async function seedEngine(prisma, label) {
  const company1 = await prisma.company.findUnique({ where: { code: 'COMPANY1' } });
  const user1 = await prisma.user.findUnique({ where: { email: 'imran@erp.com' } });
  if (!company1 || !user1) {
    throw new Error(`[${label}] Seed users/companies first (npm run db:seed)`);
  }

  let masterSr =
    (
      await prisma.supplierMaster.findFirst({
        orderBy: { srNo: 'desc' },
        select: { srNo: true },
      })
    )?.srNo || 0;
  let itsSr =
    (
      await prisma.importShipment.findFirst({
        orderBy: { srNo: 'desc' },
        select: { srNo: true },
      })
    )?.srNo || 0;

  for (const d of demos) {
    const existingPo = await prisma.purchaseOrder.findUnique({
      where: { poNumber: d.poNumber },
    });
    if (existingPo) {
      // wipe prior demo chain for this PO (idempotent reseed)
      await prisma.importShipment.deleteMany({
        where: { purchaseOrderNo: d.poNumber },
      });
      await prisma.supplierMaster.deleteMany({
        where: { purchaseOrderNo: d.poNumber },
      });
      await prisma.supplierEntry.deleteMany({
        where: { purchaseOrderNo: d.poNumber },
      });
      await prisma.purchaseOrder.delete({ where: { id: existingPo.id } });
    }

    const poDate = new Date('2026-07-15');
    const ppcDate = new Date('2026-07-01');
    const lineTotal = Number((d.qty * d.unit).toFixed(4));
    const actualReady = new Date(poDate);
    actualReady.setDate(actualReady.getDate() + d.lead + d.delayDays);

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber: d.poNumber,
        poDate,
        status: 'SAVED',
        companyName: 'Company One',
        companyStreet: '12 Industrial Ave',
        companyCity: 'Lahore',
        companyPhone: '+92-42-111000',
        companyWebsite: 'https://company1.local',
        beneficiaryName: d.shipper,
        beneficiaryContact: 'Export Desk',
        beneficiaryStreet: 'Export Road 1',
        beneficiaryCity: d.city,
        beneficiaryPhone: '+00-100-200',
        shipperName: d.shipper,
        shipperContact: 'Sales',
        shipperStreet: 'Mill Street 9',
        shipperCity: d.city,
        shipperPhone: '+00-100-201',
        consigneeName: 'Company One Receiving',
        consigneeCompany: 'Company One',
        consigneeStreet: 'Warehouse Gate 2',
        consigneeCity: 'Lahore',
        consigneePhone: '+92-42-111001',
        originOfGoods: d.origin,
        shipVia: d.shipVia,
        hsCode: d.hs,
        incoterms: 'FOB',
        tolerance: '5%',
        currency: 'USD',
        comments: `Demo seed ${d.poNumber}`,
        contactFooter: 'procurement@company1.local',
        grandTotal: lineTotal,
        companyId: company1.id,
        createdById: user1.id,
        lines: {
          create: [
            {
              lineNo: 1,
              itemCode: d.item,
              description: d.desc,
              quantity: d.qty,
              unitPrice: d.unit,
              lineTotal,
            },
          ],
        },
      },
    });

    const entry = await prisma.supplierEntry.create({
      data: {
        purchaseOrderId: po.id,
        purchaseOrderNo: d.poNumber,
        entryDate: poDate,
        ppcDemandNo: `PPC-${d.poNumber.slice(-4)}`,
        ppcDemandDate: ppcDate,
        shipperName: d.shipper,
        division: d.division,
        supplierCategory: 'Manufacturer',
        productCategory: d.category,
        tolerance: '5%',
        productItemCode: d.item,
        shipperAddress: `Mill Street 9, ${d.city}`,
        country: d.origin,
        shipperEmail: 'export@demo-supplier.local',
        contactNo: '+00-100-201',
        websiteName: 'https://demo-supplier.local',
        productDescription: d.desc,
        countryOfOrigin: d.origin,
        productHsCode: d.hs,
        unitValue: d.unit,
        totalQuantity: d.qty,
        totalValue: lineTotal,
        leadTimeDays: d.lead,
        portOfLoading: d.pol,
        oekotexCert: 'YES',
        isoCert: 'YES',
        reachCert: 'UNDER_PROCESS',
        sourceLineNo: 1,
        notes: 'Demo supplier entry',
        companyId: company1.id,
        createdById: user1.id,
      },
    });

    masterSr += 1;
    const master = await prisma.supplierMaster.create({
      data: {
        srNo: masterSr,
        supplierEntryId: entry.id,
        purchaseOrderId: po.id,
        purchaseOrderNo: d.poNumber,
        entryDate: poDate,
        ppcDemandNo: entry.ppcDemandNo,
        ppcDemandDate: ppcDate,
        division: d.division,
        shipperName: d.shipper,
        supplierCategory: 'Manufacturer',
        productCategory: d.category,
        productItemCode: d.item,
        shipperAddress: entry.shipperAddress,
        country: d.origin,
        shipperEmail: entry.shipperEmail,
        contactNo: entry.contactNo,
        websiteName: entry.websiteName,
        productDescription: d.desc,
        countryOfOrigin: d.origin,
        productHsCode: d.hs,
        unitValue: d.unit,
        totalQuantity: d.qty,
        totalValue: lineTotal,
        leadTimeDays: d.lead,
        portOfLoading: d.pol,
        oekotexCert: 'YES',
        isoCert: 'YES',
        reachCert: 'UNDER_PROCESS',
        remarks: d.statusIts === 'CLOSED' ? 'Goods received — demo closed' : 'In transit — demo open',
        poCompleted: d.statusIts === 'CLOSED',
        companyId: company1.id,
        createdById: user1.id,
      },
    });

    itsSr += 1;
    const qtyShipped = d.statusIts === 'CLOSED' ? d.qty : Math.round(d.qty * 0.4);
    const totalAmount = Number((qtyShipped * d.unit).toFixed(4));
    const supplierDeliveryDate = new Date(poDate);
    supplierDeliveryDate.setDate(supplierDeliveryDate.getDate() + d.lead);

    await prisma.importShipment.create({
      data: {
        srNo: itsSr,
        status: d.statusIts,
        supplierMasterId: master.id,
        purchaseOrderId: po.id,
        purchaseOrderNo: d.poNumber,
        division: d.division,
        merchandiser: 'Demo Merch',
        monthLabel: 'July',
        ppcDemandNo: entry.ppcDemandNo,
        ppcDemandDate: ppcDate,
        purchaseOrderDate: poDate,
        poQuantity: d.qty,
        shipperName: d.shipper,
        productDescription: d.desc,
        quantityShipped: qtyShipped,
        unitValue: d.unit,
        totalAmount,
        bank: d.bankName,
        paymentTerm: d.payment,
        modeOfShipment: d.mode,
        incoterm: 'FOB',
        supplierDeliveryTime: d.lead,
        standardLeadTime: 85,
        ppSampleReadyDate: new Date('2026-07-20'),
        actualShipmentReadyDate: actualReady,
        onBoardDate: d.statusIts === 'CLOSED' ? new Date('2026-08-25') : null,
        etaAtPort: d.statusIts === 'CLOSED' ? new Date('2026-09-05') : null,
        blAwbNo: d.statusIts === 'CLOSED' ? `BL-${d.poNumber.slice(-4)}` : '',
        blDate: d.statusIts === 'CLOSED' ? new Date('2026-08-26') : null,
        pol: d.pol,
        destinationPort: 'Karachi',
        modeOfClearance: 'EOU',
        eouLimitUtilized: d.statusIts === 'CLOSED' ? 'Partial' : '',
        revision1: d.statusIts === 'CLOSED' ? new Date('2026-09-10') : null,
        forwarder: 'Demo Forwarder',
        clearingAgent: 'Demo CA',
        docToAgent: d.statusIts === 'CLOSED' ? 'Sent' : '',
        remarks: master.remarks,
        category: d.category,
        delayCause: d.delayDays > 0 ? 'Factory delay' : '',
        qcReportReceivedDate: d.statusIts === 'CLOSED' ? new Date('2026-09-12') : null,
        qcOrderQty: d.qty,
        qcRejectedQty: d.statusIts === 'CLOSED' ? 5 : 0,
        qcLessQty: d.statusIts === 'CLOSED' ? 2 : 0,
        qcClaimDate: null,
        qcReportStandardDays: 10,
        qcMaterialFinancialLoss: d.statusIts === 'CLOSED' ? 120 : 0,
        poClosedFromErp: d.statusIts === 'CLOSED',
        bankName: d.bankName,
        bankTtLcNumber: d.bankRef,
        bankDate: d.statusIts === 'CLOSED' ? new Date('2026-09-15') : null,
        bankRoe: d.roe,
        bankChargesAdvance: d.statusIts === 'CLOSED' ? 15 : 0,
        bankChargesLcOpening: d.statusIts === 'CLOSED' && d.payment === 'LC' ? 25 : 0,
        bankChargesRetirement: d.statusIts === 'CLOSED' && d.payment === 'LC' ? 10 : 0,
        bankDocsPayment: d.statusIts === 'CLOSED' ? 'Paid' : '',
        bankDocsFromBank: d.statusIts === 'CLOSED' ? new Date('2026-09-16') : null,
        bankOaAdvanceSettlement: d.payment === 'O/A' ? 'Pending' : '',
        insuranceCompany: d.statusIts === 'CLOSED' ? 'EFU' : '',
        insuranceBillNo: d.statusIts === 'CLOSED' ? `INS-${d.poNumber.slice(-4)}` : '',
        insuranceDate: d.statusIts === 'CLOSED' ? new Date('2026-08-20') : null,
        insuranceAmount: d.statusIts === 'CLOSED' ? 220 : 0,
        logisticsBillNo: d.statusIts === 'CLOSED' ? `LOG-${d.poNumber.slice(-4)}` : '',
        logisticsDate: d.statusIts === 'CLOSED' ? new Date('2026-08-28') : null,
        logisticsWeightCbm: d.statusIts === 'CLOSED' ? '12 CBM' : '',
        logisticsAmount: d.statusIts === 'CLOSED' ? 350 : 0,
        logisticsBillToFinance: d.statusIts === 'CLOSED' ? new Date('2026-09-01') : null,
        gdNo: d.statusIts === 'CLOSED' ? `GD-${d.poNumber.slice(-4)}` : '',
        gdDate: d.statusIts === 'CLOSED' ? new Date('2026-09-06') : null,
        shipmentClearanceDate: d.statusIts === 'CLOSED' ? new Date('2026-09-08') : null,
        clearanceBillNo: d.statusIts === 'CLOSED' ? `CLR-${d.poNumber.slice(-4)}` : '',
        clearanceBillDate: d.statusIts === 'CLOSED' ? new Date('2026-09-09') : null,
        clearanceAmount: d.statusIts === 'CLOSED' ? 95 : 0,
        companyId: company1.id,
        createdById: user1.id,
      },
    });

    console.log(`[${label}] seeded ${d.poNumber} → Master + ITS(${d.statusIts})`);
  }
}

async function main() {
  process.env.DB_ENGINE = 'sqlite';
  process.env.DATABASE_URL = `file:${sqliteFile.replace(/\\/g, '/')}`;
  const sqlite = new SqliteClient();

  const pgUrl =
    process.env.DATABASE_URL_POSTGRES ||
    `postgresql://${process.env.POSTGRES_USER || 'postgres'}:${process.env.POSTGRES_PASSWORD || 'ipsdb'}@${process.env.POSTGRES_HOST || '127.0.0.1'}:${process.env.POSTGRES_PORT || '5432'}/${process.env.POSTGRES_DB || 'erp_db'}?schema=public`;
  process.env.DATABASE_URL_POSTGRES = pgUrl;
  const postgres = new PostgresClient({
    datasources: { db: { url: pgUrl } },
  });

  try {
    await seedEngine(sqlite, 'SQLite');
    await seedEngine(postgres, 'PostgreSQL');
    console.log('Demo pipeline seed complete for SQLite + PostgreSQL.');
  } finally {
    await sqlite.$disconnect();
    await postgres.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
