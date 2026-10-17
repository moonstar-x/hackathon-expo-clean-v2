import ExcelJS from 'exceljs';
import type { QuoteDocument } from './types.ts';
import { brand } from './brand.ts';
import { labels } from './labels.ts';
import { documentLogo } from './logo.ts';

export const numberFormats = ['#,##0.00', '0', 'dd/mm/yyyy', '@'] as const;
export async function renderXlsx(d: QuoteDocument, logoData: Buffer | null): Promise<Buffer> {
  const { accent, onAccent, ink, tint } = d.colors, logo = documentLogo(d, logoData);
  const book = new ExcelJS.Workbook();
  book.title = `Cotización ${d.number}`; book.creator = d.issuer.tradeName; book.lastModifiedBy = d.issuer.tradeName;
  book.created = new Date(d.metadata.issueInstant); book.modified = new Date(d.metadata.issueInstant);
  const main = book.addWorksheet('Cotización'), scope = book.addWorksheet('Alcance');
  main.columns = [6, 52, 10, 10, 22, 22].map(width => ({ width }));
  scope.columns = [24, 24, 16, 18, 20, 16, 26, 24].map(width => ({ width }));
  const color = (s: string) => s.slice(1);
  function merged(sheet: ExcelJS.Worksheet, values: string[], from = 1, to = 6, bold = false) {
    for (const value of values) { const row = sheet.addRow([]); sheet.mergeCells(row.number, from, row.number, to); row.getCell(from).value = value; row.getCell(from).font = { name: 'Arial', size: 10, bold, color: { argb: color(brand.navy) } }; row.height = Math.max(20, Math.ceil(value.length / ((to - from + 1) * 15)) * 15); }
  }
  function heading(sheet: ExcelJS.Worksheet, text: string, width = 6) {
    sheet.addRow([]); merged(sheet, [text], 1, width, true);
    const row = sheet.lastRow!; row.height = 26; row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color(accent) } }; row.getCell(1).font = { name: 'Arial', size: 12, bold: true, color: { argb: color(onAccent) } };
  }
  if (logo && d.logo) {
    // ext is in pixels and row heights in points.
    const scale = Math.min(208 / d.logo.width, 80 / d.logo.height), height = d.logo.height * scale;
    main.addImage(book.addImage({ buffer: logo as unknown as ExcelJS.Buffer, extension: d.logo.contentType === 'image/png' ? 'png' : 'jpeg' }), { tl: { col: 0, row: 0 }, ext: { width: d.logo.width * scale, height } });
    main.addRow([]).height = Math.max(44, Math.ceil(height * 0.75) + 4);
  } else {
    merged(main, [d.issuer.tradeName]); const cell = main.lastRow!.getCell(1);
    main.lastRow!.height = 44; cell.font = { name: 'Arial', size: 16, bold: true, color: { argb: color(ink) } }; cell.alignment = { vertical: 'middle', wrapText: false };
  }
  main.addRow([]).height = 14;
  merged(main, [d.title, d.numberText], 1, 6, true);
  for (const [label, date] of [[labels.issueDate, d.issueDate], [labels.validUntil, d.validUntil]]) {
    const row = main.addRow([]); main.mergeCells(row.number, 1, row.number, 4); row.getCell(1).value = label; main.mergeCells(row.number, 5, row.number, 6); row.getCell(5).value = new Date(`${date}T00:00:00Z`); row.getCell(5).numFmt = 'dd/mm/yyyy';
  }
  merged(main, d.issuer.lines);
  heading(main, labels.client); merged(main, d.client.lines);
  heading(main, labels.service); merged(main, d.service.lines);
  if (d.introText) { main.addRow([]); merged(main, [d.introText]); }
  main.addRow([]);
  const header = main.addRow([...labels.lineColumns]); header.height = 30;
  for (const l of d.lines) {
    const row = main.addRow([l.position, l.description, l.quantity, l.unit, l.unitPrice.value, l.amount.value]);
    row.height = Math.max(30, Math.ceil(l.description.length / 45) * 15); row.getCell(5).numFmt = row.getCell(6).numFmt = '#,##0.00'; row.getCell(1).numFmt = row.getCell(3).numFmt = '0';
    if (l.position % 2 === 0) row.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color(tint) } }; });
    merged(main, [l.detail], 2, 6); main.lastRow!.getCell(2).font = { name: 'Arial', size: 9, color: { argb: '475569' } };
  }
  main.addRow([]);
  for (const [label, money] of [[labels.subtotal, d.subtotal], [d.vatLabel, d.vat], [d.totalLabel, d.total]] as const) {
    const row = main.addRow([]); main.mergeCells(row.number, 1, row.number, 5); row.getCell(1).value = `${label} ${labels.currency}`; row.getCell(1).alignment = { horizontal: 'right' }; row.getCell(6).value = money.value; row.getCell(6).numFmt = '#,##0.00'; row.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color(tint) } }; cell.font = { name: 'Arial', size: 10, bold: true }; }); row.height = 24;
  }
  if (d.amountInWords) merged(main, [d.amountInWords]);
  if (d.contract) { merged(main, [`${d.contract.label} ${labels.currency}`], 1, 5); main.lastRow!.getCell(6).value = d.contract.subtotal.value; main.lastRow!.getCell(6).numFmt = '#,##0.00'; }
  heading(main, labels.scope); merged(main, [d.scope.productsText]);
  heading(main, labels.conditions);
  for (const c of d.conditions) { merged(main, [c.label], 1, 6, true); merged(main, c.text); }
  if (d.clientNotes) { heading(main, labels.notes); merged(main, d.clientNotes); }
  heading(main, labels.acceptance); main.addRow([]).height = 30;
  for (let i = 0; i < Math.max(d.acceptance.issuer.length, d.acceptance.client.length); i++) {
    const row = main.addRow([]); main.mergeCells(row.number, 1, row.number, 3); main.mergeCells(row.number, 4, row.number, 6); row.getCell(1).value = d.acceptance.issuer[i] ?? null; row.getCell(4).value = d.acceptance.client[i] ?? null; row.height = 25;
    if (i === 0) for (const col of [1, 4]) row.getCell(col).border = { top: { style: 'thin', color: { argb: color(brand.navy) } } };
  }
  scope.addRow(d.scope.columns).height = 32;
  for (const r of d.scope.rows) { const row = scope.addRow([r.zone, r.zoneType, r.risk, r.floorArea.value, r.schedule, r.daysPerMonth, r.frequency, r.terminalsPerMonth]); row.getCell(4).numFmt = '#,##0.00'; row.getCell(6).numFmt = '0'; row.height = 32; }
  scope.addRow([]); merged(scope, [d.scope.productsText], 1, 8);
  scope.views = [{ state: 'frozen', ySplit: 1 }]; scope.autoFilter = { from: { row: 1, column: 1 }, to: { row: d.scope.rows.length + 1, column: 8 } };
  for (const [sheet, titleRow, columns] of [[main, header.number, 6], [scope, 1, 8]] as const) {
    sheet.pageSetup = { paperSize: (d.paperSize === 'A4' ? 9 : 1) as ExcelJS.PaperSize, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0, printArea: `A1:${columns === 6 ? 'F' : 'H'}${sheet.rowCount}`, printTitlesRow: `${titleRow}:${titleRow}`, margins: { left: .71, right: .71, top: .71, bottom: .71, header: .3, footer: .3 } };
    sheet.headerFooter.oddFooter = `&C${d.footer.replace(/&/g, '&&')} · ${labels.page} &P ${labels.of} &N`;
    sheet.eachRow(row => row.eachCell(cell => {
      cell.font = { name: 'Arial', size: 10, color: { argb: color(brand.navy) }, ...cell.font };
      cell.alignment = { vertical: 'middle', wrapText: true, ...(typeof cell.value === 'number' ? { horizontal: 'right' as const } : {}), ...cell.alignment };
      if (!numberFormats.includes(cell.numFmt as typeof numberFormats[number])) cell.numFmt = typeof cell.value === 'number' ? '0' : '@';
    }));
    sheet.getRow(titleRow).eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color(accent) } }; cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: color(onAccent) } }; });
  }
  return Buffer.from(await book.xlsx.writeBuffer());
}
