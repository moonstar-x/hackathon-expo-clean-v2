import PdfPrinter from 'pdfmake';
import type { Column, Content, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces.js';
import type { QuoteDocument } from './types.ts';
import { brand } from './brand.ts';
import { labels } from './labels.ts';
import { documentLogo } from './logo.ts';

const assets = new URL('../../../assets/', import.meta.url);
const printer = new PdfPrinter({ Poppins: { normal: new URL('fonts/Poppins-Regular.ttf', assets).pathname, bold: new URL('fonts/Poppins-SemiBold.ttf', assets).pathname } });
export function renderPdf(d: QuoteDocument, logoData: Buffer | null): Promise<Buffer> {
  const { accent, onAccent, ink, tint } = d.colors, logo = documentLogo(d, logoData);
  const heading = (text: string): Content => ({ text, fontSize: 10, bold: true, color: ink, margin: [0, 14, 0, 6] });
  const headerCell = (text: string): TableCell => ({ text, color: onAccent, fillColor: accent, bold: true, margin: [0, 4, 0, 4] });
  // The column takes its width from the node, so the logo and the trade name in its place both keep 156.
  const mark: Column = logo && d.logo ? { image: `data:${d.logo.contentType};base64,${logo.toString('base64')}`, fit: [156, 64], width: 156, margin: [0, 0, 0, 18] } : { text: d.issuer.tradeName, width: 156, bold: true, fontSize: 16, color: ink, margin: [0, 0, 0, 18] };
  const totals: Content = { unbreakable: true, margin: [0, 10, 0, 0], table: { widths: ['*', 115, 85], body: [
    [{ text: '', border: [false, false, false, false] }, `${labels.subtotal} ${labels.currency}`, { text: d.subtotal.text, alignment: 'right' }],
    ['', `${d.vatLabel} ${labels.currency}`, { text: d.vat.text, alignment: 'right' }],
    ['', { text: `${d.totalLabel} ${labels.currency}`, bold: true }, { text: d.total.text, alignment: 'right', bold: true }],
  ] }, layout: { hLineWidth: () => 0, vLineWidth: () => 0, fillColor: (_i: number, _node: unknown, col: number) => col > 0 ? tint : null, paddingTop: () => 5, paddingBottom: () => 5 } };
  const content: Content[] = [
    { columns: [mark, { stack: [{ text: d.title, bold: true, fontSize: 20, color: ink }, { text: d.numberText, bold: true }, `${labels.issueDate}: ${d.issueDateText}`, `${labels.validUntil}: ${d.validUntilText}`], alignment: 'right' }], columnGap: 20 },
    { text: d.issuer.lines.join('\n'), margin: [0, 0, 0, 8] },
    { columns: [{ stack: [heading(labels.client), ...d.client.lines.map(text => ({ text }))] }, { stack: [heading(labels.service), ...d.service.lines.map(text => ({ text }))] }], columnGap: 20, margin: [0, 0, 0, 14] },
    ...(d.introText ? [{ text: d.introText, margin: [0, 0, 0, 12] } as Content] : []),
    { table: { headerRows: 1, dontBreakRows: true, widths: [16, '*', 24, 34, 74, 65], body: [labels.lineColumns.map(headerCell), ...d.lines.map((l): TableCell[] => [String(l.position), { stack: [{ text: l.description, bold: true }, { text: l.detail, fontSize: 7, color: '#475569', margin: [0, 3, 0, 0] }] }, String(l.quantity), l.unit, { text: l.unitPrice.text, alignment: 'right' }, { text: l.amount.text, alignment: 'right' }])] }, layout: { hLineWidth: () => 0, vLineWidth: () => 0, fillColor: (i: number) => i > 0 && i % 2 === 0 ? tint : null, paddingTop: () => 6, paddingBottom: () => 6 } },
    totals,
    ...(d.amountInWords ? [{ text: d.amountInWords, margin: [0, 8, 0, 0] } as Content] : []),
    ...(d.contract ? [{ text: `${d.contract.label} ${labels.currency}: ${d.contract.subtotal.text}`, margin: [0, 5, 0, 0] } as Content] : []),
    heading(labels.scope),
    { fontSize: 6.5, table: { headerRows: 1, dontBreakRows: true, widths: ['*', '*', 42, 43, 45, 25, 53, 42], body: [d.scope.columns.map(headerCell), ...d.scope.rows.map((r): TableCell[] => [r.zone, r.zoneType, r.risk, { text: r.floorArea.text, alignment: 'right' }, r.schedule, String(r.daysPerMonth), r.frequency, r.terminalsPerMonth])] }, layout: { hLineWidth: () => .25, vLineWidth: () => 0, hLineColor: () => tint, paddingTop: () => 5, paddingBottom: () => 5 } },
    { text: d.scope.productsText, margin: [0, 7, 0, 0], fontSize: 7.5 },
    heading(labels.conditions),
    ...d.conditions.map(c => ({ unbreakable: true, stack: [{ text: c.label, bold: true }, ...c.text.map(text => ({ text, margin: [0, 2, 0, 0] }))], margin: [0, 0, 0, 7] } as Content)),
    ...(d.clientNotes ? [heading(labels.notes), ...d.clientNotes.map(text => ({ text }))] : []),
    { unbreakable: true, stack: [heading(labels.acceptance), { columns: [d.acceptance.issuer, d.acceptance.client].map(lines => ({ stack: [{ text: '____________________________', margin: [0, 22, 0, 7] }, ...lines.map(text => ({ text }))] })), columnGap: 22 }] },
  ];
  const definition: TDocumentDefinitions = {
    pageSize: d.paperSize, pageMargins: [51, 51, 51, 51], defaultStyle: { font: 'Poppins', fontSize: 8, color: brand.navy, lineHeight: 1.15 }, content,
    footer: (n, m) => ({ text: `${d.footer} · ${labels.page} ${n} ${labels.of} ${m}`, fontSize: 7, color: brand.navy, alignment: 'center', margin: [51, 16, 51, 0] }),
    info: { title: `Cotización ${d.number}`, author: d.issuer.tradeName, creator: d.issuer.tradeName, subject: d.metadata.subject, creationDate: new Date(d.metadata.issueInstant), modDate: new Date(d.metadata.issueInstant) },
  };
  return new Promise((resolve, reject) => {
    const pdf = printer.createPdfKitDocument(definition);
    delete pdf.info.Producer;
    const chunks: Buffer[] = []; pdf.on('data', (chunk: Buffer) => chunks.push(chunk)); pdf.on('end', () => resolve(Buffer.concat(chunks))); pdf.on('error', reject); pdf.end();
  });
}
