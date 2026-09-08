import * as ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

export type ExportColumn = { key: string; label: string; align?: 'left' | 'right' };

function cell(v: unknown) {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  return String(v);
}

export function toCsv(title: string, columns: ExportColumn[], rows: Record<string, unknown>[]) {
  const escape = (s: string) => {
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [
    escape(title),
    columns.map((c) => escape(c.label)).join(','),
    ...rows.map((r) => columns.map((c) => escape(cell(r[c.key]))).join(',')),
  ];
  return Buffer.from(lines.join('\r\n'), 'utf8');
}

export async function toXlsx(
  title: string,
  columns: ExportColumn[],
  rows: Record<string, unknown>[],
  filtersNote?: string,
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Nexus ERP';
  wb.created = new Date();
  const ws = wb.addWorksheet('Report', {
    views: [{ state: 'frozen', ySplit: 3 }],
  });

  ws.mergeCells(1, 1, 1, columns.length);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = { bold: true, size: 14, color: { argb: 'FF0F766E' } };
  titleCell.alignment = { vertical: 'middle' };

  ws.mergeCells(2, 1, 2, columns.length);
  ws.getCell(2, 1).value = filtersNote || `Generated ${new Date().toISOString().slice(0, 19)}`;
  ws.getCell(2, 1).font = { size: 10, color: { argb: 'FF64748B' } };

  const header = ws.getRow(3);
  columns.forEach((c, i) => {
    const cellRef = header.getCell(i + 1);
    cellRef.value = c.label;
    cellRef.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cellRef.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F766E' },
    };
    cellRef.alignment = {
      horizontal: c.align === 'right' ? 'right' : 'left',
      vertical: 'middle',
    };
  });
  header.height = 20;

  rows.forEach((r, idx) => {
    const row = ws.getRow(4 + idx);
    columns.forEach((c, i) => {
      const cellRef = row.getCell(i + 1);
      const raw = r[c.key];
      cellRef.value =
        typeof raw === 'number'
          ? raw
          : raw instanceof Date
            ? raw
            : cell(raw);
      cellRef.alignment = {
        horizontal: c.align === 'right' ? 'right' : 'left',
      };
      if (idx % 2 === 1) {
        cellRef.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF0FDFA' },
        };
      }
    });
  });

  columns.forEach((c, i) => {
    let width = Math.max(10, c.label.length + 2);
    for (const r of rows.slice(0, 100)) {
      width = Math.max(width, cell(r[c.key]).length + 2);
    }
    ws.getColumn(i + 1).width = Math.min(42, width);
  });

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

export async function toPdf(
  title: string,
  columns: ExportColumn[],
  rows: Record<string, unknown>[],
  filtersNote?: string,
) {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      margin: 36,
      size: 'A4',
      layout: columns.length > 8 ? 'landscape' : 'portrait',
    });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fillColor('#0f766e').fontSize(16).text(title, { continued: false });
    doc.moveDown(0.3);
    doc
      .fillColor('#64748b')
      .fontSize(9)
      .text(filtersNote || `Generated ${new Date().toLocaleString()}`);
    doc.moveDown(0.6);

    const usableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const colWidth = usableWidth / Math.max(columns.length, 1);
    const startX = doc.page.margins.left;
    let y = doc.y;

    const drawHeader = () => {
      doc.rect(startX, y, usableWidth, 18).fill('#0f766e');
      doc.fillColor('#ffffff').fontSize(7).font('Helvetica-Bold');
      columns.forEach((c, i) => {
        doc.text(c.label, startX + i * colWidth + 2, y + 5, {
          width: colWidth - 4,
          ellipsis: true,
        });
      });
      y += 20;
      doc.font('Helvetica');
    };

    drawHeader();

    rows.forEach((r, idx) => {
      if (y > doc.page.height - 50) {
        doc.addPage();
        y = doc.page.margins.top;
        drawHeader();
      }
      if (idx % 2 === 1) {
        doc.rect(startX, y - 2, usableWidth, 14).fill('#f0fdfa');
      }
      doc.fillColor('#0f172a').fontSize(7);
      columns.forEach((c, i) => {
        doc.text(cell(r[c.key]), startX + i * colWidth + 2, y, {
          width: colWidth - 4,
          ellipsis: true,
          align: c.align === 'right' ? 'right' : 'left',
        });
      });
      y += 14;
    });

    if (rows.length === 0) {
      doc.fillColor('#64748b').fontSize(10).text('No rows matched the selected filters.', startX, y);
    }

    doc.end();
  });
}
