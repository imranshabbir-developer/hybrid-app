/**
 * Legacy Excel ETL — imports File-A Master + File-B Current Status / Closed into SQLite.
 *
 * Usage:
 *   node scripts/import-legacy-excel.js
 *   node scripts/import-legacy-excel.js --dry-run
 *   node scripts/import-legacy-excel.js --file-a "Reports - SUPPLIER.xlsx" --file-b "Import Tracking Sheet.xlsx"
 */
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const ExcelJS = require('exceljs');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../apps/api/.env') });

const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

function argValue(flag, fallback) {
  const i = args.indexOf(flag);
  if (i >= 0 && args[i + 1]) return args[i + 1];
  return fallback;
}

const fileA = path.resolve(
  root,
  argValue('--file-a', 'Reports - SUPPLIER.xlsx'),
);
const fileB = path.resolve(
  root,
  argValue('--file-b', 'Import Tracking Sheet.xlsx'),
);

function cell(row, col) {
  const v = row.getCell(col).value;
  if (v == null) return '';
  if (typeof v === 'object' && v.result != null) return v.result;
  if (typeof v === 'object' && v.text != null) return v.text;
  if (v instanceof Date) return v;
  return v;
}

function asStr(v) {
  if (v == null || v === '') return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).trim();
}

function asNum(v) {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return v;
  const n = Number(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function asDate(v) {
  if (!v) return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v;
  const s = String(v).trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function findSheet(wb, names) {
  for (const name of names) {
    const s = wb.getWorksheet(name);
    if (s) return s;
  }
  const lower = names.map((n) => n.toLowerCase());
  return wb.worksheets.find((ws) =>
    lower.some((n) => ws.name.toLowerCase().includes(n.replace(/\d+/g, '').trim())),
  );
}

async function loadWorkbook(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  return wb;
}

async function main() {
  console.log('Legacy Excel ETL');
  console.log(`  File-A: ${fileA}`);
  console.log(`  File-B: ${fileB}`);
  console.log(`  Mode: ${dryRun ? 'DRY RUN' : 'WRITE'}`);

  const wbA = await loadWorkbook(fileA);
  const wbB = await loadWorkbook(fileB);

  const masterSheet =
    findSheet(wbA, ['Supplier Master Sheet', 'Supplier Master']) ||
    wbA.worksheets.find((w) => /master/i.test(w.name));
  const openSheet =
    findSheet(wbB, ['Current Status 2020', 'Current Status']) ||
    wbB.worksheets.find((w) => /status/i.test(w.name) && !/closed/i.test(w.name));
  const closedSheet =
    findSheet(wbB, ['Current Closed Files 2020', 'Current Closed Files']) ||
    wbB.worksheets.find((w) => /closed/i.test(w.name));

  if (!masterSheet) throw new Error('Supplier Master sheet not found in File-A');
  if (!openSheet) throw new Error('Current Status sheet not found in File-B');
  if (!closedSheet) throw new Error('Closed Files sheet not found in File-B');

  const masters = [];
  masterSheet.eachRow((row, rowNumber) => {
    if (rowNumber < 2) return;
    const purchaseOrderNo = asStr(cell(row, 2));
    if (!purchaseOrderNo) return;
    masters.push({
      srNo: asNum(cell(row, 1)) || masters.length + 1,
      purchaseOrderNo,
      entryDate: asDate(cell(row, 3)) || new Date(),
      ppcDemandNo: asStr(cell(row, 4)),
      ppcDemandDate: asDate(cell(row, 5)),
      division: asStr(cell(row, 6)),
      shipperName: asStr(cell(row, 7)),
      supplierCategory: asStr(cell(row, 8)),
      productCategory: asStr(cell(row, 9)),
      productItemCode: asStr(cell(row, 10)),
      shipperAddress: asStr(cell(row, 11)),
      country: asStr(cell(row, 12)),
      shipperEmail: asStr(cell(row, 13)),
      contactNo: asStr(cell(row, 14)),
      websiteName: asStr(cell(row, 15)),
      productDescription: asStr(cell(row, 16)),
      countryOfOrigin: asStr(cell(row, 17)),
      productHsCode: asStr(cell(row, 18)),
      unitValue: asNum(cell(row, 19)),
      totalQuantity: asNum(cell(row, 20)),
      totalValue: asNum(cell(row, 21)),
      leadTimeDays: asNum(cell(row, 22)) || null,
      portOfLoading: asStr(cell(row, 23)),
      remarks: asStr(cell(row, 27)),
    });
  });

  function parseIts(sheet, status) {
    const rows = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber < 2) return;
      const purchaseOrderNo = asStr(cell(row, 9)) || asStr(cell(row, 5));
      if (!purchaseOrderNo) return;
      rows.push({
        status,
        srNo: asNum(cell(row, 1)) || rows.length + 1,
        division: asStr(cell(row, 2)),
        merchandiser: asStr(cell(row, 3)),
        monthLabel: asStr(cell(row, 4)),
        ppcDemandNo: asStr(cell(row, 5)),
        ppcDemandDate: asDate(cell(row, 6)),
        purchaseOrderNo,
        purchaseOrderDate: asDate(cell(row, 10)),
        poQuantity: asNum(cell(row, 12)),
        shipperName: asStr(cell(row, 13)),
        productDescription: asStr(cell(row, 14)),
        quantityShipped: asNum(cell(row, 15)),
        unitValue: asNum(cell(row, 16)),
        totalAmount: asNum(cell(row, 17)),
        bank: asStr(cell(row, 18)),
        paymentTerm: asStr(cell(row, 19)),
        modeOfShipment: asStr(cell(row, 20)),
        incoterm: asStr(cell(row, 21)),
        supplierDeliveryTime: asNum(cell(row, 22)) || null,
        standardLeadTime: asNum(cell(row, 23)) || 85,
        ppSampleReadyDate: asDate(cell(row, 25)),
        actualShipmentReadyDate: asDate(cell(row, 26)),
        onBoardDate: asDate(cell(row, 30)),
        etaAtPort: asDate(cell(row, 31)),
        blAwbNo: asStr(cell(row, 32)),
        blDate: asDate(cell(row, 33)),
        pol: asStr(cell(row, 34)),
        destinationPort: asStr(cell(row, 35)),
        modeOfClearance: asStr(cell(row, 36)),
        forwarder: asStr(cell(row, 43)),
        clearingAgent: asStr(cell(row, 44)),
        remarks: asStr(cell(row, 46)),
        category: status === 'CLOSED' ? asStr(cell(row, 2)) : '',
      });
    });
    return rows;
  }

  const openRows = parseIts(openSheet, 'OPEN');
  const closedRows = parseIts(closedSheet, 'CLOSED');

  console.log(`Parsed Master rows: ${masters.length}`);
  console.log(`Parsed Open ITS rows: ${openRows.length}`);
  console.log(`Parsed Closed ITS rows: ${closedRows.length}`);

  if (dryRun) {
    console.log('Dry run complete — no DB writes.');
    return;
  }

  const dataDir = path.resolve(root, 'data');
  const sqliteFile = path.join(dataDir, 'erp.sqlite');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  process.env.DB_ENGINE = 'sqlite';
  process.env.DATABASE_URL = `file:${sqliteFile.replace(/\\/g, '/')}`;

  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  try {
    const company = await prisma.company.findFirst({
      where: { code: 'COMPANY1' },
    });
    if (!company) {
      throw new Error('COMPANY1 not found — run npm run db:seed first');
    }

    let masterUpserts = 0;
    for (const m of masters) {
      const existing = await prisma.supplierMaster.findFirst({
        where: { companyId: company.id, purchaseOrderNo: m.purchaseOrderNo },
      });
      const data = {
        ...m,
        companyId: company.id,
        oekotexCert: 'NO',
        isoCert: 'NO',
        reachCert: 'NO',
      };
      if (existing) {
        await prisma.supplierMaster.update({ where: { id: existing.id }, data });
      } else {
        await prisma.supplierMaster.create({ data });
      }
      masterUpserts += 1;
    }

    async function upsertShipment(row) {
      const master = await prisma.supplierMaster.findFirst({
        where: { companyId: company.id, purchaseOrderNo: row.purchaseOrderNo },
      });
      const existing = await prisma.importShipment.findFirst({
        where: {
          companyId: company.id,
          purchaseOrderNo: row.purchaseOrderNo,
          status: row.status,
        },
      });
      const data = {
        ...row,
        companyId: company.id,
        supplierMasterId: master?.id || null,
        totalAmount:
          row.totalAmount ||
          Number((Number(row.quantityShipped || 0) * Number(row.unitValue || 0)).toFixed(4)),
      };
      if (existing) {
        await prisma.importShipment.update({ where: { id: existing.id }, data });
      } else {
        await prisma.importShipment.create({ data });
      }
    }

    for (const r of openRows) await upsertShipment(r);
    for (const r of closedRows) await upsertShipment(r);

    console.log(`Upserted masters: ${masterUpserts}`);
    console.log(`Upserted ITS open: ${openRows.length}`);
    console.log(`Upserted ITS closed: ${closedRows.length}`);
    console.log('ETL complete.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
